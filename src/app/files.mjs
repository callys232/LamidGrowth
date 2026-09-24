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
    res.setHeader('Content-Type', meta.mime_type);
    res.setHeader('Content-Disposition', `inline; filename="${meta.filename.replace(/"/g, '')}"`);
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
