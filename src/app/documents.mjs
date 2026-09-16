import { randomUUID, createHash } from 'node:crypto';
import { z } from 'zod';
import { renderAgentRunPdf } from './pdf.mjs';

const signatureSchema = z.object({ signerName: z.string().trim().min(1).max(200) }).strict();

const fail = (message, status) => {
  throw Object.assign(new Error(message), { status });
};

function documentHash(run) {
  return createHash('sha256').update(run.output || '').digest('hex');
}

export function mountDocuments(app, store) {
  const { db, transaction, log } = store;

  async function runFor(id, workspaceId) {
    const run = await db
      .prepare('SELECT * FROM agent_runs WHERE id = ? AND workspace_id = ?')
      .get(id, workspaceId);
    if (!run) fail('Document not found.', 404);
    if (run.status !== 'completed') fail('This document is not ready yet.', 409);
    return run;
  }
  async function signaturesFor(run) {
    const currentHash = documentHash(run);
    return (await db
      .prepare('SELECT * FROM document_signatures WHERE agent_run_id = ? ORDER BY created_at')
      .all(run.id))
      .map((signature) => ({ ...signature, valid: signature.document_hash === currentHash }));
  }

  app.get('/api/agent-runs/:id/pdf', async (req, res, next) => {
    try {
      const run = await runFor(req.params.id, req.workspace.id);
      const doc = renderAgentRunPdf(run, req.workspace, await signaturesFor(run));
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${run.agent_id}-${run.id.slice(0, 8)}.pdf"`);
      doc.pipe(res);
      doc.end();
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/agent-runs/:id/signatures', async (req, res, next) => {
    try {
      const run = await runFor(req.params.id, req.workspace.id);
      res.json(await signaturesFor(run));
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/agent-runs/:id/signatures', async (req, res, next) => {
    try {
      const run = await runFor(req.params.id, req.workspace.id);
      const input = signatureSchema.parse(req.body);
      const id = randomUUID();
      const now = new Date().toISOString();
      await transaction(async () => {
        await db.prepare('INSERT INTO document_signatures VALUES (?, ?, ?, ?, ?, ?, ?)').run(
          id,
          run.id,
          req.user.id,
          input.signerName,
          documentHash(run),
          now,
          now,
        );
        await log(req.workspace.id, req.user.name, 'Document signed (in-app attestation)', run.id, input.signerName);
      });
      const record = await db.prepare('SELECT * FROM document_signatures WHERE id = ?').get(id);
      res.status(201).json({
        ...record,
        note: 'This is an in-app attestation bound to the current document content, not a qualified electronic signature.',
      });
    } catch (error) {
      next(error);
    }
  });
}
