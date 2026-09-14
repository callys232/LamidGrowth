import { randomUUID } from 'node:crypto';
import { z } from 'zod';

const inviteSchema = z
  .object({ freelancerUserId: z.string().uuid(), message: z.string().trim().max(2000).default('') })
  .strict();
const respondSchema = z.object({ decision: z.enum(['accept', 'reject']) }).strict();

export function mountInvitations(app, store) {
  const { db, transaction, log } = store;

  app.post('/api/jobs/:id/invitations', (req, res) => {
    const input = inviteSchema.parse(req.body);
    const job = db.prepare('SELECT * FROM job_posts WHERE id = ?').get(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job post not found.' });
    if (job.client_user_id !== req.user.id)
      return res.status(403).json({ error: 'Only the job owner can invite a freelancer to this project.' });
    if (input.freelancerUserId === req.user.id)
      return res.status(400).json({ error: 'You cannot invite yourself.' });
    const existing = db
      .prepare(
        "SELECT 1 FROM job_invitations WHERE job_id = ? AND freelancer_user_id = ? AND status IN ('pending', 'accepted')",
      )
      .get(job.id, input.freelancerUserId);
    if (existing)
      return res.status(409).json({ error: 'This freelancer already has a pending or accepted invitation for this job.' });
    const id = randomUUID();
    transaction(() => {
      db.prepare('INSERT INTO job_invitations VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
        id,
        job.id,
        job.workspace_id,
        input.freelancerUserId,
        req.user.id,
        input.message,
        'pending',
        new Date().toISOString(),
        null,
      );
      log(job.workspace_id, req.user.name, 'Freelancer invited to project', id, job.title);
    });
    res.status(201).json(db.prepare('SELECT * FROM job_invitations WHERE id = ?').get(id));
  });

  app.get('/api/jobs/:id/invitations', (req, res) => {
    const job = db.prepare('SELECT * FROM job_posts WHERE id = ?').get(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job post not found.' });
    if (job.client_user_id !== req.user.id)
      return res.status(403).json({ error: 'Only the job owner can view invitations for this job.' });
    res.json(
      db
        .prepare('SELECT * FROM job_invitations WHERE job_id = ? ORDER BY created_at DESC')
        .all(job.id),
    );
  });

  app.get('/api/talent/invitations/mine', (req, res) => {
    res.json(
      db
        .prepare(
          `SELECT job_invitations.*, job_posts.title AS jobTitle FROM job_invitations
           JOIN job_posts ON job_posts.id = job_invitations.job_id
           WHERE job_invitations.freelancer_user_id = ? ORDER BY job_invitations.created_at DESC`,
        )
        .all(req.user.id),
    );
  });

  app.post('/api/invitations/:id/respond', (req, res) => {
    const input = respondSchema.parse(req.body);
    const invitation = db.prepare('SELECT * FROM job_invitations WHERE id = ?').get(req.params.id);
    if (!invitation) return res.status(404).json({ error: 'Invitation not found.' });
    if (invitation.freelancer_user_id !== req.user.id)
      return res.status(403).json({ error: 'Only the invited freelancer can respond to this invitation.' });
    if (invitation.status !== 'pending')
      return res.status(409).json({ error: 'This invitation has already been decided.' });
    const status = input.decision === 'accept' ? 'accepted' : 'rejected';
    transaction(() => {
      db.prepare('UPDATE job_invitations SET status = ?, decided_at = ? WHERE id = ?').run(
        status,
        new Date().toISOString(),
        invitation.id,
      );
      log(invitation.workspace_id, req.user.name, `Invitation ${status}`, invitation.id, invitation.job_id);
    });
    res.json(db.prepare('SELECT * FROM job_invitations WHERE id = ?').get(invitation.id));
  });
}
