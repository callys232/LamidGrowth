import { randomUUID } from 'node:crypto';
import { z } from 'zod';

const reviewSchema = z
  .object({ rating: z.number().int().min(1).max(5), comment: z.string().trim().max(2000).default('') })
  .strict();

const fail = (message, status) => {
  throw Object.assign(new Error(message), { status });
};

export function mountReputation(app, store) {
  const { db, transaction, log } = store;

  // A review may only be left by one of the two actual parties on a completed milestone, about
  // the other party — this is what keeps reputation "evidence-backed" rather than an open rating
  // free-for-all: submitting one requires proof of a real, approved engagement.
  function partiesFor(milestoneId) {
    const row = db
      .prepare(
        `SELECT milestones.id AS milestone_id, milestones.status AS milestone_status,
                projects.id AS project_id, projects.freelancer_user_id AS freelancer_user_id,
                job_posts.client_user_id AS client_user_id
         FROM milestones
         JOIN projects ON projects.id = milestones.project_id
         JOIN job_posts ON job_posts.id = projects.job_id
         WHERE milestones.id = ?`,
      )
      .get(milestoneId);
    if (!row) fail('Milestone not found.', 404);
    return row;
  }

  app.post('/api/milestones/:id/review', (req, res) => {
    const row = partiesFor(req.params.id);
    if (row.milestone_status !== 'approved')
      return res.status(400).json({ error: 'Only an approved milestone can be reviewed.' });
    const isClient = row.client_user_id === req.user.id;
    const isFreelancer = row.freelancer_user_id === req.user.id;
    if (!isClient && !isFreelancer)
      return res.status(403).json({ error: 'You are not a party to this milestone.' });
    const revieweeUserId = isClient ? row.freelancer_user_id : row.client_user_id;
    if (!revieweeUserId)
      return res.status(400).json({ error: 'The other party on this milestone could not be determined.' });
    const existing = db
      .prepare('SELECT id FROM reviews WHERE milestone_id = ? AND reviewer_user_id = ?')
      .get(row.milestone_id, req.user.id);
    if (existing) return res.status(409).json({ error: 'You have already reviewed this milestone.' });
    const input = reviewSchema.parse(req.body);
    const id = randomUUID();
    const now = new Date().toISOString();
    transaction(() => {
      db.prepare(
        'INSERT INTO reviews (id, project_id, milestone_id, reviewer_user_id, reviewee_user_id, rating, comment, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      ).run(id, row.project_id, row.milestone_id, req.user.id, revieweeUserId, input.rating, input.comment, now);
      log(req.workspace.id, req.user.name, 'Review submitted', id, `${input.rating}/5`);
    });
    res.status(201).json(db.prepare('SELECT * FROM reviews WHERE id = ?').get(id));
  });

  app.get('/api/talent/:userId/reputation', (req, res) => {
    const stats = db
      .prepare('SELECT COUNT(*) AS count, COALESCE(AVG(rating), 0) AS average FROM reviews WHERE reviewee_user_id = ?')
      .get(req.params.userId);
    const completedMilestones = db
      .prepare(
        "SELECT COUNT(*) AS count FROM milestones JOIN projects ON projects.id = milestones.project_id WHERE projects.freelancer_user_id = ? AND milestones.status IN ('approved', 'paid')",
      )
      .get(req.params.userId).count;
    res.json({
      userId: req.params.userId,
      reviewCount: stats.count,
      averageRating: stats.count > 0 ? Math.round(stats.average * 10) / 10 : null,
      completedMilestones,
    });
  });
}
