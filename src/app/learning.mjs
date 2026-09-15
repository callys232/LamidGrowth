import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { DOMAINS, FUNCTIONS, INDUSTRIES } from './expertiseTaxonomy.mjs';

const pathSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(4000).default(''),
    domain: z.enum(DOMAINS).nullish(),
    function: z.enum(FUNCTIONS).nullish(),
    industry: z.enum(INDUSTRIES).nullish(),
    estimatedHours: z.number().positive().max(1000).nullish(),
    pointsCost: z.number().int().min(0).nullish(),
    language: z.string().trim().min(2).max(10).default('en'),
    coachUserId: z.string().uuid().nullish(),
  })
  .strict();
const moduleSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(4000).default(''),
    format: z.enum(['reading', 'video', 'exercise', 'assessment']).default('reading'),
    orderIndex: z.number().int().min(0).default(0),
    estimatedMinutes: z.number().int().positive().max(10000).nullish(),
    contentUrl: z.string().trim().max(2000).nullish(),
    quizSkill: z.string().trim().max(60).nullish(),
  })
  .strict();
const completeModuleSchema = z.object({ score: z.number().int().min(0).max(100).nullish() }).strict();
const assignSchema = z.object({ userId: z.string().uuid(), dueAt: z.string().datetime().nullish() }).strict();
const feedbackSchema = z.object({ rating: z.number().int().min(1).max(5), comment: z.string().trim().max(2000).default('') }).strict();
const complianceSchema = z
  .object({ pathId: z.string().uuid(), mandatory: z.boolean().default(true), dueDays: z.number().int().positive().max(3650).nullish() })
  .strict();

const fail = (message, status) => {
  throw Object.assign(new Error(message), { status });
};

export function mountLearning(app, store, { ecosystemAdminEmails = [] } = {}) {
  const { db, transaction, log } = store;
  const isAdmin = (req) => ecosystemAdminEmails.includes((req.user.email || '').toLowerCase());

  function pathFor(id) {
    const path = db.prepare('SELECT * FROM learning_paths WHERE id = ?').get(id);
    if (!path) fail('Learning path not found.', 404);
    return path;
  }
  function modulesFor(pathId) {
    return db.prepare('SELECT * FROM learning_modules WHERE path_id = ? ORDER BY order_index').all(pathId);
  }
  function pathDetail(id) {
    const path = pathFor(id);
    const modules = modulesFor(id);
    const prerequisites = db
      .prepare(
        `SELECT lp.id, lp.title FROM learning_prerequisites req
         JOIN learning_paths lp ON lp.id = req.requires_path_id WHERE req.path_id = ?`,
      )
      .all(id);
    const feedback = db
      .prepare('SELECT COUNT(*) AS count, AVG(rating) AS average FROM learning_feedback WHERE path_id = ?')
      .get(id);
    return { ...path, modules, prerequisites, feedback: { count: feedback.count, average: feedback.average } };
  }
  function completedPathIds(userId) {
    return new Set(
      db
        .prepare("SELECT path_id FROM learning_enrollments WHERE user_id = ? AND status = 'completed'")
        .all(userId)
        .map((r) => r.path_id),
    );
  }

  // Discovery/catalog — every path is visible platform-wide, same as the open job marketplace,
  // with optional taxonomy filters for goal-aware matching.
  app.get('/api/learning/paths', (req, res) => {
    const { domain, function: fn, industry } = req.query;
    const clauses = [];
    const params = [];
    if (domain) {
      clauses.push('domain = ?');
      params.push(domain);
    }
    if (fn) {
      clauses.push('"function" = ?');
      params.push(fn);
    }
    if (industry) {
      clauses.push('industry = ?');
      params.push(industry);
    }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const paths = db.prepare(`SELECT * FROM learning_paths ${where} ORDER BY created_at DESC`).all(...params);
    // Keep the same shape as the detail endpoint (modules/prerequisites/feedback) so the
    // frontend never has to special-case "list" vs "detail" responses.
    res.json(paths.map((path) => pathDetail(path.id)));
  });

  app.get('/api/learning/paths/:id', (req, res) => {
    res.json(pathDetail(req.params.id));
  });

  app.post('/api/learning/paths', (req, res) => {
    const input = pathSchema.parse(req.body);
    const id = randomUUID();
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO learning_paths
       (id, workspace_id, title, description, created_at, domain, function, industry, estimated_hours, points_cost, language, coach_user_id, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      req.workspace.id,
      input.title,
      input.description,
      now,
      input.domain ?? null,
      input.function ?? null,
      input.industry ?? null,
      input.estimatedHours ?? null,
      input.pointsCost ?? null,
      input.language,
      input.coachUserId ?? null,
      req.user.id,
    );
    log(req.workspace.id, req.user.name, 'Learning path created', id, input.title);
    res.status(201).json(pathDetail(id));
  });

  app.post('/api/learning/paths/:id/modules', (req, res) => {
    const path = pathFor(req.params.id);
    if (path.created_by !== req.user.id) return res.status(403).json({ error: 'Only the path author can add modules.' });
    const input = moduleSchema.parse(req.body);
    const id = randomUUID();
    db.prepare('INSERT INTO learning_modules VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
      id,
      path.id,
      input.title,
      input.description,
      input.format,
      input.orderIndex,
      input.estimatedMinutes ?? null,
      input.contentUrl ?? null,
      input.quizSkill ?? null,
      new Date().toISOString(),
    );
    res.status(201).json(pathDetail(path.id));
  });

  // Prerequisites — a path-level dependency: cannot enroll in path until requires_path_id is completed.
  app.post('/api/learning/paths/:id/prerequisites', (req, res) => {
    const path = pathFor(req.params.id);
    if (path.created_by !== req.user.id) return res.status(403).json({ error: 'Only the path author can set prerequisites.' });
    const requiresPathId = z.string().uuid().parse(req.body?.requiresPathId);
    if (requiresPathId === path.id) return res.status(400).json({ error: 'A path cannot require itself.' });
    pathFor(requiresPathId);
    const id = randomUUID();
    db.prepare('INSERT INTO learning_prerequisites VALUES (?, ?, ?)').run(id, path.id, requiresPathId);
    res.status(201).json(pathDetail(path.id));
  });

  function requirePrerequisitesMet(pathId, userId) {
    const required = db.prepare('SELECT requires_path_id FROM learning_prerequisites WHERE path_id = ?').all(pathId);
    if (!required.length) return;
    const completed = completedPathIds(userId);
    const unmet = required.filter((r) => !completed.has(r.requires_path_id));
    if (unmet.length) fail('Complete the required prerequisite path(s) before enrolling.', 400);
  }

  function enroll(pathId, userId, { assignedBy = null, dueAt = null } = {}) {
    const path = pathFor(pathId);
    if (db.prepare('SELECT 1 FROM learning_enrollments WHERE path_id = ? AND user_id = ?').get(pathId, userId))
      fail('Already enrolled in this path.', 400);
    requirePrerequisitesMet(pathId, userId);
    const id = randomUUID();
    const now = new Date().toISOString();
    transaction(() => {
      if (path.points_cost) {
        const charged = db
          .prepare('UPDATE users SET points_balance = points_balance - ? WHERE id = ? AND points_balance >= ?')
          .run(path.points_cost, userId, path.points_cost);
        if (charged.changes !== 1) fail('Not enough points to enroll in this path.', 402);
        db.prepare('INSERT INTO points_ledger VALUES (?, ?, ?, ?, ?, ?, ?)').run(
          randomUUID(),
          userId,
          null,
          -path.points_cost,
          'learning_enrollment',
          id,
          Date.now(),
        );
      }
      db.prepare(
        'INSERT INTO learning_enrollments (id, path_id, user_id, status, progress, created_at, assigned_by, due_at, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      ).run(id, pathId, userId, 'in_progress', 0, now, assignedBy, dueAt, null);
    });
    return id;
  }

  app.post('/api/learning/paths/:id/enroll', (req, res) => {
    const id = enroll(req.params.id, req.user.id);
    res.status(201).json(db.prepare('SELECT * FROM learning_enrollments WHERE id = ?').get(id));
  });

  // Assignment — a coach/path-author assigns the path to someone else, optionally with a due date
  // (the same shape a compliance requirement uses).
  app.post('/api/learning/paths/:id/assign', (req, res) => {
    const path = pathFor(req.params.id);
    if (path.created_by !== req.user.id && path.coach_user_id !== req.user.id)
      return res.status(403).json({ error: 'Only the path author or coach can assign it.' });
    const input = assignSchema.parse(req.body);
    const id = enroll(path.id, input.userId, { assignedBy: req.user.id, dueAt: input.dueAt ?? null });
    log(req.workspace.id, req.user.name, 'Learning path assigned', id, path.title);
    res.status(201).json(db.prepare('SELECT * FROM learning_enrollments WHERE id = ?').get(id));
  });

  app.get('/api/learning/enrollments/mine', (req, res) => {
    const rows = db
      .prepare(
        `SELECT e.*, p.title AS path_title FROM learning_enrollments e
         JOIN learning_paths p ON p.id = e.path_id WHERE e.user_id = ? ORDER BY e.created_at DESC`,
      )
      .all(req.user.id);
    res.json(rows);
  });

  function enrollmentFor(id, userId) {
    const enrollment = db.prepare('SELECT * FROM learning_enrollments WHERE id = ?').get(id);
    if (!enrollment) fail('Enrollment not found.', 404);
    if (enrollment.user_id !== userId) fail('This is not your enrollment.', 403);
    return enrollment;
  }

  // Assessment-format modules record an actual score (not just pass/fail); other formats complete
  // on acknowledgement. Completing every module marks the enrollment complete and stale-proofs the
  // status the same way scoping cases track "user_review".
  app.post('/api/learning/modules/:id/complete', (req, res) => {
    const module = db.prepare('SELECT * FROM learning_modules WHERE id = ?').get(req.params.id);
    if (!module) return res.status(404).json({ error: 'Module not found.' });
    const enrollment = db
      .prepare('SELECT * FROM learning_enrollments WHERE path_id = ? AND user_id = ?')
      .get(module.path_id, req.user.id);
    if (!enrollment) return res.status(400).json({ error: 'Enroll in this path before completing its modules.' });
    if (enrollment.status === 'completed') return res.status(400).json({ error: 'This path is already completed.' });
    const input = completeModuleSchema.parse(req.body ?? {});
    if (module.format === 'assessment' && input.score == null)
      return res.status(400).json({ error: 'An assessment module requires a score.' });
    if (db.prepare('SELECT 1 FROM learning_module_completions WHERE enrollment_id = ? AND module_id = ?').get(enrollment.id, module.id))
      return res.status(400).json({ error: 'This module is already completed.' });
    const totalModules = modulesFor(module.path_id).length;
    transaction(() => {
      db.prepare('INSERT INTO learning_module_completions VALUES (?, ?, ?, ?, ?)').run(
        randomUUID(),
        enrollment.id,
        module.id,
        input.score ?? null,
        new Date().toISOString(),
      );
      const completedCount = db
        .prepare('SELECT COUNT(*) AS count FROM learning_module_completions WHERE enrollment_id = ?')
        .get(enrollment.id).count;
      const progress = totalModules ? Math.round((completedCount / totalModules) * 100) : 100;
      const nowComplete = totalModules > 0 && completedCount >= totalModules;
      db.prepare('UPDATE learning_enrollments SET progress = ?, status = ?, completed_at = ? WHERE id = ?').run(
        progress,
        nowComplete ? 'completed' : 'in_progress',
        nowComplete ? new Date().toISOString() : null,
        enrollment.id,
      );
    });
    res.json(db.prepare('SELECT * FROM learning_enrollments WHERE id = ?').get(enrollment.id));
  });

  // Certificates are a generated artifact tied to a completed enrollment, and can optionally
  // strengthen an Expert Network credential rather than living only inside the learning module.
  app.post('/api/learning/enrollments/:id/certificate', (req, res) => {
    const enrollment = enrollmentFor(req.params.id, req.user.id);
    if (enrollment.status !== 'completed') return res.status(400).json({ error: 'Complete the path before issuing a certificate.' });
    if (db.prepare('SELECT * FROM learning_certificates WHERE enrollment_id = ?').get(enrollment.id))
      return res.status(400).json({ error: 'A certificate has already been issued for this enrollment.' });
    const path = pathFor(enrollment.path_id);
    const id = randomUUID();
    const now = new Date().toISOString();
    let credentialId = null;
    transaction(() => {
      const profile = db.prepare('SELECT id FROM talent_profiles WHERE user_id = ?').get(req.user.id);
      if (profile) {
        credentialId = randomUUID();
        db.prepare(
          `INSERT INTO expert_credentials
           (id, profile_id, type, title, issuer, issued_at, expires_at, evidence_url, verification_status, created_at)
           VALUES (?, ?, 'certification', ?, 'LAMID ONE Learning', ?, NULL, NULL, 'unverified', ?)`,
        ).run(credentialId, profile.id, path.title, now, now);
      }
      db.prepare('INSERT INTO learning_certificates VALUES (?, ?, ?, ?, ?)').run(id, enrollment.id, credentialId, now, null);
    });
    res.status(201).json(db.prepare('SELECT * FROM learning_certificates WHERE id = ?').get(id));
  });

  app.post('/api/learning/paths/:id/feedback', (req, res) => {
    const path = pathFor(req.params.id);
    const enrolled = db.prepare('SELECT 1 FROM learning_enrollments WHERE path_id = ? AND user_id = ?').get(path.id, req.user.id);
    if (!enrolled) return res.status(400).json({ error: 'Enroll in this path before leaving feedback.' });
    const input = feedbackSchema.parse(req.body);
    const existing = db.prepare('SELECT id FROM learning_feedback WHERE path_id = ? AND user_id = ?').get(path.id, req.user.id);
    if (existing)
      db.prepare('UPDATE learning_feedback SET rating = ?, comment = ? WHERE id = ?').run(input.rating, input.comment, existing.id);
    else
      db.prepare('INSERT INTO learning_feedback VALUES (?, ?, ?, ?, ?, ?)').run(
        randomUUID(),
        path.id,
        req.user.id,
        input.rating,
        input.comment,
        new Date().toISOString(),
      );
    res.status(201).json(pathDetail(path.id).feedback);
  });

  // Compliance — a workspace can require a path be completed, with an audit-visible record
  // distinct from voluntary capability-building enrollment.
  app.post('/api/admin/learning/compliance', (req, res) => {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Only an ecosystem administrator can set compliance requirements.' });
    const input = complianceSchema.parse(req.body);
    pathFor(input.pathId);
    const id = randomUUID();
    db.prepare('INSERT INTO compliance_requirements VALUES (?, ?, ?, ?, ?, ?)').run(
      id,
      req.workspace.id,
      input.pathId,
      input.mandatory ? 1 : 0,
      input.dueDays ?? null,
      new Date().toISOString(),
    );
    log(req.workspace.id, req.user.name, 'Compliance requirement set', id, input.pathId);
    res.status(201).json(db.prepare('SELECT * FROM compliance_requirements WHERE id = ?').get(id));
  });

  app.get('/api/learning/compliance/mine', (req, res) => {
    const rows = db
      .prepare(
        `SELECT c.*, p.title AS path_title,
                e.status AS enrollment_status, e.due_at
         FROM compliance_requirements c
         JOIN learning_paths p ON p.id = c.path_id
         LEFT JOIN learning_enrollments e ON e.path_id = c.path_id AND e.user_id = ?
         WHERE c.workspace_id = ?`,
      )
      .all(req.user.id, req.workspace.id);
    res.json(rows);
  });

  // Attention — reuses the app-wide Needs You / Stalled attention model instead of inventing a
  // second notification concept: due-soon enrollments need you, zero-progress ones are stalled.
  app.get('/api/learning/enrollments/attention', (req, res) => {
    const enrollments = db
      .prepare(
        `SELECT e.*, p.title AS path_title FROM learning_enrollments e
         JOIN learning_paths p ON p.id = e.path_id
         WHERE e.user_id = ? AND e.status = 'in_progress' ORDER BY e.due_at IS NULL, e.due_at`,
      )
      .all(req.user.id);
    const now = Date.now();
    const soon = now + 7 * 24 * 60 * 60 * 1000;
    res.json({
      needsYou: enrollments.filter((e) => e.due_at && new Date(e.due_at).getTime() <= soon),
      stalled: enrollments.filter((e) => e.progress === 0 && (!e.due_at || new Date(e.due_at).getTime() > soon)),
    });
  });

  // Admin/manager reporting — completion rate and stalled enrollments per path, feeding the
  // organizational "Capability Patterns" surface.
  app.get('/api/admin/learning/report', (req, res) => {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Only an ecosystem administrator can view learning reports.' });
    const rows = db
      .prepare(
        `SELECT p.id, p.title,
                COUNT(e.id) AS enrolled,
                SUM(CASE WHEN e.status = 'completed' THEN 1 ELSE 0 END) AS completed,
                SUM(CASE WHEN e.status = 'in_progress' AND e.progress = 0 THEN 1 ELSE 0 END) AS stalled
         FROM learning_paths p LEFT JOIN learning_enrollments e ON e.path_id = p.id
         GROUP BY p.id ORDER BY p.title`,
      )
      .all();
    res.json(rows);
  });
}
