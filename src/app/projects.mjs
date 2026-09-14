import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { requireApprovedModel } from './models.mjs';
import { wordSet } from './text.mjs';

const title = z.string().trim().min(1).max(500);
const longText = z.string().trim().max(10000).default('');
const currency = z.string().regex(/^[A-Z]{3}$/);

const projectSchema = z
  .object({ jobId: z.string().uuid(), title, freelancerUserId: z.string().uuid() })
  .strict();
const milestoneSchema = z
  .object({
    title,
    description: longText,
    amount: z.number().int().positive().max(100000000),
    currency,
    dueDate: z.string().optional(),
  })
  .strict();
const deliverableSchema = z
  .object({
    title,
    description: longText,
    criteria: z.array(z.string().trim().min(1).max(1000)).min(1).max(20),
  })
  .strict();
const submissionSchema = z
  .object({
    notes: longText,
    assets: z
      .array(z.object({ url: z.string().trim().min(1).max(2000), kind: z.string().trim().min(1).max(100) }).strict())
      .max(20)
      .default([]),
  })
  .strict();
const decisionSchema = z
  .object({
    decision: z.enum(['approve', 'request_revision', 'dispute']),
    reason: longText,
  })
  .strict();

const fail = (message, status) => {
  throw Object.assign(new Error(message), { status });
};

export function mountProjects(app, store, deps) {
  const { db, transaction, log } = store;

  function projectFor(id) {
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
    if (!project) fail('Project not found.', 404);
    return project;
  }
  function requireParty(project, userId) {
    const job = db.prepare('SELECT * FROM job_posts WHERE id = ?').get(project.job_id);
    const isClient = job && job.client_user_id === userId;
    const isFreelancer = project.freelancer_user_id === userId;
    if (!isClient && !isFreelancer)
      fail('You are not a party to this project.', 403);
    return { job, isClient, isFreelancer };
  }
  function milestoneFor(id) {
    const milestone = db.prepare('SELECT * FROM milestones WHERE id = ?').get(id);
    if (!milestone) fail('Milestone not found.', 404);
    return milestone;
  }

  app.get('/api/projects', (req, res) => {
    res.json(
      db
        .prepare(
          `SELECT projects.* FROM projects JOIN job_posts ON job_posts.id = projects.job_id
           WHERE projects.workspace_id = ? AND (job_posts.client_user_id = ? OR projects.freelancer_user_id = ?)
           ORDER BY projects.created_at DESC`,
        )
        .all(req.workspace.id, req.user.id, req.user.id),
    );
  });

  app.get('/api/projects/:id', (req, res) => {
    const project = projectFor(req.params.id);
    requireParty(project, req.user.id);
    const milestones = db
      .prepare('SELECT * FROM milestones WHERE project_id = ? ORDER BY created_at')
      .all(project.id)
      .map((milestone) => ({
        ...milestone,
        deliverables: db
          .prepare('SELECT * FROM deliverables WHERE milestone_id = ? ORDER BY created_at')
          .all(milestone.id)
          .map((deliverable) => ({
            ...deliverable,
            criteria: db
              .prepare('SELECT * FROM acceptance_criteria WHERE deliverable_id = ? ORDER BY created_at')
              .all(deliverable.id),
          })),
        submissions: db
          .prepare('SELECT * FROM submissions WHERE milestone_id = ? ORDER BY created_at DESC')
          .all(milestone.id),
      }));
    res.json({ ...project, milestones });
  });

  app.post('/api/projects', (req, res) => {
    const input = projectSchema.parse(req.body);
    const job = db.prepare('SELECT * FROM job_posts WHERE id = ?').get(input.jobId);
    if (!job) return res.status(404).json({ error: 'Job post not found.' });
    if (job.client_user_id !== req.user.id)
      return res.status(403).json({ error: 'Only the job owner can create a project for it.' });
    const bid = db
      .prepare('SELECT 1 FROM bids WHERE job_id = ? AND freelancer_user_id = ?')
      .get(job.id, input.freelancerUserId);
    const acceptedInvitation = db
      .prepare(
        "SELECT 1 FROM job_invitations WHERE job_id = ? AND freelancer_user_id = ? AND status = 'accepted'",
      )
      .get(job.id, input.freelancerUserId);
    if (!bid && !acceptedInvitation)
      return res
        .status(400)
        .json({ error: 'That user has no bid or accepted invitation on this job and cannot be assigned as the freelancer.' });
    const id = randomUUID();
    transaction(() => {
      db.prepare('INSERT INTO projects VALUES (?, ?, ?, ?, ?, ?, ?)').run(
        id,
        job.workspace_id,
        job.id,
        input.title,
        'active',
        new Date().toISOString(),
        input.freelancerUserId,
      );
      log(job.workspace_id, req.user.name, 'Project created', id, input.title);
    });
    res.status(201).json(projectFor(id));
  });

  app.post('/api/projects/:id/milestones', (req, res) => {
    const project = projectFor(req.params.id);
    const { isClient } = requireParty(project, req.user.id);
    if (!isClient) return res.status(403).json({ error: 'Only the project owner can add milestones.' });
    const input = milestoneSchema.parse(req.body);
    const id = randomUUID();
    transaction(() => {
      db.prepare('INSERT INTO milestones VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
        id,
        project.id,
        input.title,
        input.description,
        input.amount,
        input.currency,
        input.dueDate || null,
        'planned',
        new Date().toISOString(),
      );
      log(project.workspace_id, req.user.name, 'Milestone created', id, input.title);
    });
    res.status(201).json(milestoneFor(id));
  });

  app.post('/api/milestones/:id/deliverables', (req, res) => {
    const milestone = milestoneFor(req.params.id);
    const project = projectFor(milestone.project_id);
    const { isClient } = requireParty(project, req.user.id);
    if (!isClient) return res.status(403).json({ error: 'Only the project owner can define deliverables.' });
    const input = deliverableSchema.parse(req.body);
    const deliverableId = randomUUID();
    transaction(() => {
      db.prepare('INSERT INTO deliverables VALUES (?, ?, ?, ?, ?, ?)').run(
        deliverableId,
        milestone.id,
        input.title,
        input.description,
        'pending',
        new Date().toISOString(),
      );
      for (const criterion of input.criteria) {
        db.prepare('INSERT INTO acceptance_criteria VALUES (?, ?, ?, ?, ?)').run(
          randomUUID(),
          deliverableId,
          criterion,
          'pending',
          new Date().toISOString(),
        );
      }
      log(project.workspace_id, req.user.name, 'Deliverable defined', deliverableId, input.title);
    });
    res.status(201).json({
      ...db.prepare('SELECT * FROM deliverables WHERE id = ?').get(deliverableId),
      criteria: db.prepare('SELECT * FROM acceptance_criteria WHERE deliverable_id = ?').all(deliverableId),
    });
  });

  app.post('/api/milestones/:id/submissions', (req, res) => {
    const milestone = milestoneFor(req.params.id);
    const project = projectFor(milestone.project_id);
    const { isFreelancer } = requireParty(project, req.user.id);
    if (!isFreelancer)
      return res.status(403).json({ error: 'Only the assigned freelancer can submit this milestone.' });
    const input = submissionSchema.parse(req.body);
    const submissionId = randomUUID();
    transaction(() => {
      db.prepare('INSERT INTO submissions VALUES (?, ?, ?, ?, ?)').run(
        submissionId,
        milestone.id,
        req.user.id,
        input.notes,
        new Date().toISOString(),
      );
      for (const asset of input.assets) {
        db.prepare('INSERT INTO submission_assets VALUES (?, ?, ?, ?, ?)').run(
          randomUUID(),
          submissionId,
          asset.url,
          asset.kind,
          new Date().toISOString(),
        );
      }
      db.prepare('UPDATE milestones SET status = ? WHERE id = ?').run('submitted', milestone.id);
      log(project.workspace_id, req.user.name, 'Milestone submitted', submissionId, milestone.title);
    });
    res.status(201).json(db.prepare('SELECT * FROM submissions WHERE id = ?').get(submissionId));
  });

  app.post('/api/submissions/:id/verify', async (req, res, next) => {
    try {
      const submission = db.prepare('SELECT * FROM submissions WHERE id = ?').get(req.params.id);
      if (!submission) return res.status(404).json({ error: 'Submission not found.' });
      const milestone = milestoneFor(submission.milestone_id);
      const project = projectFor(milestone.project_id);
      requireParty(project, req.user.id);

      const deliverables = db
        .prepare('SELECT * FROM deliverables WHERE milestone_id = ?')
        .all(milestone.id);
      const criteria = deliverables.flatMap((deliverable) =>
        db.prepare('SELECT * FROM acceptance_criteria WHERE deliverable_id = ?').all(deliverable.id),
      );
      const assets = db
        .prepare('SELECT * FROM submission_assets WHERE submission_id = ?')
        .all(submission.id);
      const submissionWords = wordSet(
        `${submission.notes} ${assets.map((asset) => `${asset.url} ${asset.kind}`).join(' ')}`,
      );

      const results = [];
      let deterministicCount = 0;
      let aiCalls = 0;
      for (const criterion of criteria) {
        const criterionWords = wordSet(criterion.criterion);
        const overlap = [...criterionWords].filter((word) => submissionWords.has(word)).length;
        const deterministicSatisfied =
          criterionWords.size > 0 && overlap / criterionWords.size >= 0.4;
        if (deterministicSatisfied || !deps.aiProvider) {
          deterministicCount++;
          results.push({
            criterionId: criterion.id,
            result: deterministicSatisfied ? 'satisfied' : 'not_satisfied',
            rationale: deterministicSatisfied
              ? 'The submission text references this criterion.'
              : 'The submission text does not clearly reference this criterion. No automated assessment was performed beyond keyword matching.',
          });
          continue;
        }
        aiCalls++;
        const model = requireApprovedModel(store, 'companion.deliverable-verification');
        const review = await deps.aiProvider.review(
          {
            question: `Does the submission satisfy this acceptance criterion? Criterion: "${criterion.criterion}". If the submission does not contain enough information to answer, say so plainly rather than guessing.`,
            sources: [{ id: submission.id, version: 1, kind: 'submission', data: { notes: submission.notes, assets } }],
          },
          {},
        );
        results.push({
          criterionId: criterion.id,
          result: /satisf|pass|meet/i.test(review.review.summary) ? 'satisfied' : 'not_satisfied',
          rationale: review.review.summary,
          modelRegistryId: model.id,
        });
      }

      const verificationId = randomUUID();
      transaction(() => {
        db.prepare('INSERT INTO verification_cases VALUES (?, ?, ?, ?, ?, ?)').run(
          verificationId,
          submission.id,
          'completed',
          aiCalls > 0 ? 'deterministic+ai' : 'deterministic',
          criteria.length > 0 ? deterministicCount / criteria.length : 1,
          new Date().toISOString(),
        );
        for (const result of results) {
          db.prepare('INSERT INTO criterion_results VALUES (?, ?, ?, ?, ?, ?)').run(
            randomUUID(),
            verificationId,
            result.criterionId,
            result.result,
            result.rationale,
            new Date().toISOString(),
          );
          db.prepare('UPDATE acceptance_criteria SET status = ? WHERE id = ?').run(
            result.result,
            result.criterionId,
          );
        }
        db.prepare('UPDATE milestones SET status = ? WHERE id = ?').run('in_review', milestone.id);
        log(project.workspace_id, req.user.name, 'Deliverable verification completed', verificationId, milestone.title);
      });
      res.status(201).json({
        ...db.prepare('SELECT * FROM verification_cases WHERE id = ?').get(verificationId),
        results,
      });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/verification-cases/:id/decisions', (req, res) => {
    const verificationCase = db.prepare('SELECT * FROM verification_cases WHERE id = ?').get(req.params.id);
    if (!verificationCase) return res.status(404).json({ error: 'Verification case not found.' });
    const submission = db.prepare('SELECT * FROM submissions WHERE id = ?').get(verificationCase.submission_id);
    const milestone = milestoneFor(submission.milestone_id);
    const project = projectFor(milestone.project_id);
    const { isClient } = requireParty(project, req.user.id);
    if (!isClient)
      return res.status(403).json({ error: 'Only the project owner can approve, request revision, or dispute a milestone.' });
    const input = decisionSchema.parse(req.body);
    const id = randomUUID();
    const nextStatus =
      input.decision === 'approve'
        ? 'approved'
        : input.decision === 'dispute'
          ? 'disputed'
          : 'submitted';
    transaction(() => {
      db.prepare('INSERT INTO approvals VALUES (?, ?, ?, ?, ?, ?, ?)').run(
        id,
        'milestone',
        milestone.id,
        req.user.id,
        input.decision,
        input.reason,
        new Date().toISOString(),
      );
      if (input.decision === 'dispute')
        db.prepare('INSERT INTO disputes VALUES (?, ?, ?, ?, ?, ?, ?)').run(
          randomUUID(),
          'milestone',
          milestone.id,
          req.user.id,
          input.reason,
          'open',
          new Date().toISOString(),
        );
      db.prepare('UPDATE milestones SET status = ? WHERE id = ?').run(nextStatus, milestone.id);
      log(project.workspace_id, req.user.name, `Milestone ${input.decision}`, milestone.id, input.reason);
    });
    res.status(201).json(milestoneFor(milestone.id));
  });
}
