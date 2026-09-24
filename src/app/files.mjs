import { randomUUID } from 'node:crypto';
import { z } from 'zod';

// 10 MB decoded — generous enough for a KYC document photo/scan, small enough to keep in a
// Postgres BYTEA column without needing streaming.
const MAX_BYTES = 10 * 1024 * 1024;

const uploadSchema = z
  .object({
    filename: z.string().trim().min(1).max(255),
    mimeType: z.string().trim().min(1).max(120),
    base64Content: z.string().min(1),
  })
  .strict();

// FILE-01 fix: the declared mimeType is never trusted alone. Only a small allow-list of types
// with a verifiable byte signature (or, for text/plain, an absence of markup) are accepted;
// everything else — including text/html, SVG and any other markup/script-capable type — is
// rejected outright rather than merely relabeled, since this app has no sandboxed rendering
// pipeline to make inline HTML/SVG safe to serve from the same origin.
const SIGNATURE_CHECKS = {
  'image/png': (buf) => buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  'image/jpeg': (buf) => buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff,
  'image/gif': (buf) => buf.length >= 6 && (buf.subarray(0, 6).toString('ascii') === 'GIF87a' || buf.subarray(0, 6).toString('ascii') === 'GIF89a'),
  'image/webp': (buf) => buf.length >= 12 && buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP',
  'application/pdf': (buf) => buf.length >= 5 && buf.subarray(0, 5).toString('ascii') === '%PDF-',
  // No binary signature exists for plain text; instead reject content that looks like markup —
  // a real HTML/SVG/script payload cannot pass as text/plain by simply changing the declared type.
  'text/plain': (buf) => !/<\s*(script|html|svg|iframe|object|embed)\b/i.test(buf.subarray(0, 4096).toString('utf8')),
};

const fail = (message, status) => {
  throw Object.assign(new Error(message), { status });
};

export function mountFiles(app, store) {
  const { db, transaction, log } = store;

  async function fileFor(id, workspaceId) {
    const row = await db
      .prepare(
        'SELECT id, workspace_id, uploaded_by, filename, mime_type, size_bytes, created_at FROM uploaded_files WHERE id = ? AND workspace_id = ?',
      )
      .get(id, workspaceId);
    if (!row) fail('File not found.', 404);
    return row;
  }

  app.post('/api/files', async (req, res) => {
    const input = uploadSchema.parse(req.body);
    let buffer;
    try {
      buffer = Buffer.from(input.base64Content, 'base64');
    } catch {
      fail('base64Content is not valid base64.', 400);
    }
    if (buffer.length === 0) fail('The uploaded file is empty.', 400);
    if (buffer.length > MAX_BYTES) fail(`Files over ${MAX_BYTES / (1024 * 1024)}MB are not accepted.`, 413);
    const signatureCheck = SIGNATURE_CHECKS[input.mimeType];
    if (!signatureCheck)
      fail(`File type "${input.mimeType}" is not accepted. Allowed types: ${Object.keys(SIGNATURE_CHECKS).join(', ')}.`, 415);
    if (!signatureCheck(buffer))
      fail('The file content does not match its declared type.', 415);
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    await transaction(async () => {
      await db
        .prepare('INSERT INTO uploaded_files VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .run(id, req.workspace.id, req.user.id, input.filename, input.mimeType, buffer.length, buffer, createdAt);
      await log(req.workspace.id, req.user.name, 'File uploaded', id, input.filename);
    });
    res.status(201).json({
      id,
      filename: input.filename,
      mimeType: input.mimeType,
      sizeBytes: buffer.length,
      createdAt,
    });
  });

  app.get('/api/files/:id', async (req, res) => {
    const meta = await fileFor(req.params.id, req.workspace.id);
    const row = await db.prepare('SELECT content FROM uploaded_files WHERE id = ?').get(meta.id);
    // Always attachment, never inline: even an allow-listed type must not render on this origin.
    // nosniff blocks a browser from reinterpreting the byte content as something more dangerous
    // than the declared/verified type regardless.
    res.setHeader('Content-Type', meta.mime_type);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', `attachment; filename="${meta.filename.replace(/"/g, '')}"`);
    res.send(row.content);
  });

  app.delete('/api/files/:id', async (req, res) => {
    const meta = await fileFor(req.params.id, req.workspace.id);
    await transaction(async () => {
      await db.prepare('DELETE FROM uploaded_files WHERE id = ?').run(meta.id);
      await log(req.workspace.id, req.user.name, 'File deleted', meta.id, meta.filename);
    });
    res.status(204).end();
  });
}
