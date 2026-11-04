import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { recordSecurityAlert } from './securityAlerts.mjs';

// 10 MB decoded — generous enough for a KYC document photo/scan, small enough to keep in a
// Postgres BYTEA column without needing streaming.
const MAX_BYTES = 10 * 1024 * 1024;

const DANGEROUS_EXTENSIONS = new Set([
  'exe', 'dll', 'bat', 'cmd', 'sh', 'bash', 'bin', 'com', 'msi', 'scr',
  'php', 'phtml', 'py', 'pl', 'jsp', 'asp', 'aspx', 'cgi', 'js', 'vbs', 'wsf'
]);

/**
 * Validates that the filename has no path traversal, null bytes, or dangerous double extensions.
 */
function sanitizeAndValidateFilename(filename) {
  if (filename.includes('\0') || filename.includes('/') || filename.includes('\\') || filename.includes('..')) {
    throw Object.assign(new Error('Invalid filename characters.'), { status: 400 });
  }

  // Check double extensions: e.g., "report.pdf.exe" or "invoice.exe.pdf"
  const parts = filename.toLowerCase().split('.');
  if (parts.length > 2) {
    for (let i = 1; i < parts.length - 1; i++) {
      if (DANGEROUS_EXTENSIONS.has(parts[i])) {
        throw Object.assign(new Error('Executable or script extensions within filename are strictly forbidden.'), { status: 400 });
      }
    }
  }

  const finalExt = parts[parts.length - 1];
  if (DANGEROUS_EXTENSIONS.has(finalExt)) {
    throw Object.assign(new Error('Executable file uploads are strictly forbidden.'), { status: 400 });
  }

  return filename.replace(/["\r\n\t]/g, '');
}

/**
 * Heuristic inspection for disguised executables, polyglots, and embedded shells.
 */
function inspectBufferForMaliciousPayloads(buffer, mimeType) {
  // Disallow Windows PE / DOS headers (MZ) or Unix ELF binaries disguised as media
  if (buffer.length >= 2 && buffer[0] === 0x4d && buffer[1] === 0x5a) {
    throw Object.assign(new Error('Executable binary header detected in file payload.'), { status: 415 });
  }
  if (buffer.length >= 4 && buffer[0] === 0x7f && buffer[1] === 0x45 && buffer[2] === 0x4c && buffer[3] === 0x46) {
    throw Object.assign(new Error('Executable ELF binary detected in file payload.'), { status: 415 });
  }

  // Inspect first 8KB of any file for obvious shell/script preambles
  const sample = buffer.subarray(0, Math.min(buffer.length, 8192)).toString('latin1');
  if (/<\?php|#!(\/usr)?\/bin\/(bash|sh|perl|python|env)|\bWScript\.Shell\b/i.test(sample)) {
    throw Object.assign(new Error('Embedded script or shell payload detected.'), { status: 415 });
  }

  return true;
}

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

export function mountFiles(app, store, { virusScanner = null } = {}) {
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
    const sanitizedFilename = sanitizeAndValidateFilename(input.filename);
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

    // Deep heuristic check against disguised executables and shell scripts
    try {
      inspectBufferForMaliciousPayloads(buffer, input.mimeType);
    } catch (scanErr) {
      await recordSecurityAlert(store, {
        userId: req.user?.id,
        workspaceId: req.workspace?.id,
        alertType: 'malicious_file_blocked',
        severity: 'warning',
        details: `Blocked file "${input.filename}" (${input.mimeType}): ${scanErr.message}`,
        ipAddress: req.ip,
      });
      throw scanErr;
    }

    // Optional external antivirus scanner invocation (e.g. ClamAV daemon)
    if (typeof virusScanner === 'function') {
      const scanResult = await virusScanner(buffer, { filename: sanitizedFilename, mimeType: input.mimeType });
      if (scanResult && scanResult.infected) {
        await recordSecurityAlert(store, {
          userId: req.user?.id,
          workspaceId: req.workspace?.id,
          alertType: 'malware_detected',
          severity: 'critical',
          details: `Antivirus scanner detected malware "${scanResult.virusName || 'malware'}" in file "${sanitizedFilename}"`,
          ipAddress: req.ip,
        });
        fail('The file failed antivirus inspection and has been quarantined.', 422);
      }
    }

    const id = randomUUID();
    const createdAt = new Date().toISOString();
    await transaction(async () => {
      await db
        .prepare('INSERT INTO uploaded_files VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .run(id, req.workspace.id, req.user.id, sanitizedFilename, input.mimeType, buffer.length, buffer, createdAt);
      await log(req.workspace.id, req.user.name, 'File uploaded', id, sanitizedFilename);
    });
    res.status(201).json({
      id,
      filename: sanitizedFilename,
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
