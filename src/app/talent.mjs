import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { wordSet, scoreBid } from './text.mjs';
import { DOMAINS, FUNCTIONS, INDUSTRIES } from './expertiseTaxonomy.mjs';

const profileSchema = z
  .object({
    headline: z.string().trim().min(1).max(200),
    skills: z.array(z.string().trim().min(1).max(60)).min(1).max(30),
    experienceYears: z.number().int().min(0).max(60).optional(),
    availability: z.string().trim().max(60).optional(),
    hourlyRate: z.number().int().positive().max(1000000).optional(),
    currency: z.string().regex(/^[A-Z]{3}$/).optional(),
    location: z.string().trim().max(120).optional(),
    languages: z.array(z.string().trim().min(1).max(60)).max(20).default([]),
    portfolioUrl: z.string().trim().max(2000).optional(),
    domains: z.array(z.enum(DOMAINS)).max(10).default([]),
    functions: z.array(z.enum(FUNCTIONS)).max(15).default([]),
    industries: z.array(z.enum(INDUSTRIES)).max(10).default([]),
  })
  .strict();
const vettingDecisionSchema = z.object({ decision: z.enum(['verified', 'rejected']) }).strict();
const credentialSchema = z
  .object({
    type: z.enum(['license', 'certification', 'degree', 'publication', 'prior-role']),
    title: z.string().trim().min(1).max(200),
    issuer: z.string().trim().min(1).max(200),
    issuedAt: z.string().trim().max(40).optional(),
    expiresAt: z.string().trim().max(40).optional(),
    evidenceUrl: z.string().trim().max(2000).optional(),
  })
  .strict();
const credentialDecisionSchema = z.object({ decision: z.enum(['verified', 'rejected']) }).strict();
const assessmentSchema = z
  .object({ skill: z.string().trim().min(1).max(60), answers: z.array(z.number().int().min(0).max(10)).min(1).max(20) })
  .strict();

const PASS_THRESHOLD = 0.8;

// Deterministic multiple-choice quiz bank — a skills assessment is graded purely against
// this bank, never by an AI, so a score can never be hallucinated. Modeled on LinkedIn's
// Skill Assessment mechanic (quiz + pass threshold), not a coded test (that needs a sandbox
// execution environment, which is explicitly out of scope for this pass).
const QUIZ_BANK = {
  javascript: [
    { question: 'What does `typeof null` return in JavaScript?', options: ['null', 'undefined', 'object', 'number'], correctIndex: 2 },
    { question: 'Which method adds an item to the end of an array?', options: ['push', 'shift', 'unshift', 'pop'], correctIndex: 0 },
    { question: 'What keyword declares a block-scoped variable?', options: ['var', 'let', 'function', 'global'], correctIndex: 1 },
    { question: 'What does `===` check that `==` does not?', options: ['Nothing', 'Type', 'Scope', 'Hoisting'], correctIndex: 1 },
    { question: 'Which is NOT a JavaScript primitive type?', options: ['string', 'boolean', 'array', 'number'], correctIndex: 2 },
  ],
  'project-management': [
    { question: 'What is the critical path in a project schedule?', options: ['The cheapest tasks', 'The longest sequence of dependent tasks', 'The riskiest task', 'The final milestone'], correctIndex: 1 },
    { question: 'A "scope creep" refers to:', options: ['Team turnover', 'Uncontrolled growth in project scope', 'A budget surplus', 'A schedule buffer'], correctIndex: 1 },
    { question: 'What does a RACI matrix clarify?', options: ['Risk levels', 'Roles and responsibilities', 'Budget allocation', 'Timeline slack'], correctIndex: 1 },
    { question: 'A Gantt chart primarily visualizes:', options: ['Team morale', 'Task schedules over time', 'Budget variance', 'Stakeholder sentiment'], correctIndex: 1 },
    { question: 'What is a "milestone" in project management?', options: ['A billable task', 'A significant checkpoint with no duration', 'A team meeting', 'A budget line item'], correctIndex: 1 },
  ],
};

const fail = (message, status) => {
  throw Object.assign(new Error(message), { status });
};

export function mountTalent(app, store, { ecosystemAdminEmails }) {
  const { db, transaction, log } = store;
  const isAdmin = (req) => ecosystemAdminEmails.includes((req.user.email || '').toLowerCase());

  function profileFor(userId) {
    const row = db.prepare('SELECT * FROM talent_profiles WHERE user_id = ?').get(userId);
    return row
      ? {
          ...row,
          skills: JSON.parse(row.skills),
          languages: JSON.parse(row.languages),
          domains: JSON.parse(row.domains),
          functions: JSON.parse(row.functions),
          industries: JSON.parse(row.industries),
        }
      : null;
  }

  function credentialsFor(profileId) {
    return db.prepare('SELECT * FROM expert_credentials WHERE profile_id = ? ORDER BY created_at DESC').all(profileId);
  }

  app.post('/api/talent/profile', (req, res) => {
    const input = profileSchema.parse(req.body);
    const existing = db.prepare('SELECT id FROM talent_profiles WHERE user_id = ?').get(req.user.id);
    const now = new Date().toISOString();
    transaction(() => {
      if (existing) {
        db.prepare(
          `UPDATE talent_profiles SET headline = ?, skills = ?, experience_years = ?, availability = ?,
           hourly_rate = ?, currency = ?, location = ?, languages = ?, portfolio_url = ?,
           domains = ?, functions = ?, industries = ?, updated_at = ?
           WHERE user_id = ?`,
        ).run(
          input.headline,
          JSON.stringify(input.skills),
          input.experienceYears ?? null,
          input.availability ?? null,
          input.hourlyRate ?? null,
          input.currency ?? null,
          input.location ?? null,
          JSON.stringify(input.languages),
          input.portfolioUrl ?? null,
          JSON.stringify(input.domains),
          JSON.stringify(input.functions),
          JSON.stringify(input.industries),
          now,
          req.user.id,
        );
      } else {
        db.prepare(
          `INSERT INTO talent_profiles
           (id, user_id, headline, skills, experience_years, availability, hourly_rate, currency, created_at, updated_at, location, languages, portfolio_url, vetting_status, domains, functions, industries)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'unverified', ?, ?, ?)`,
        ).run(
          randomUUID(),
          req.user.id,
          input.headline,
          JSON.stringify(input.skills),
          input.experienceYears ?? null,
          input.availability ?? null,
          input.hourlyRate ?? null,
          input.currency ?? null,
          now,
          now,
          input.location ?? null,
          JSON.stringify(input.languages),
          input.portfolioUrl ?? null,
          JSON.stringify(input.domains),
          JSON.stringify(input.functions),
          JSON.stringify(input.industries),
        );
      }
      log(req.workspace.id, req.user.name, 'Talent profile saved', req.user.id, input.headline);
    });
    res.json(profileFor(req.user.id));
  });

  app.get('/api/talent/profile/mine', (req, res) => {
    res.json(profileFor(req.user.id));
  });

  app.post('/api/talent/profile/vetting', (req, res) => {
    const profile = db.prepare('SELECT id FROM talent_profiles WHERE user_id = ?').get(req.user.id);
    if (!profile) return res.status(400).json({ error: 'Create your talent profile before requesting vetting.' });
    db.prepare("UPDATE talent_profiles SET vetting_status = 'pending' WHERE user_id = ?").run(req.user.id);
    res.json(profileFor(req.user.id));
  });

  app.get('/api/admin/talent/vetting', (req, res) => {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Only an ecosystem administrator can review vetting requests.' });
    res.json(
      db
        .prepare(
          `SELECT talent_profiles.*, users.name, users.email FROM talent_profiles
           JOIN users ON users.id = talent_profiles.user_id WHERE vetting_status = 'pending'`,
        )
        .all()
        .map((row) => ({ ...row, skills: JSON.parse(row.skills), languages: JSON.parse(row.languages) })),
    );
  });

  app.patch('/api/admin/talent/vetting/:userId', (req, res) => {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Only an ecosystem administrator can decide vetting requests.' });
    const input = vettingDecisionSchema.parse(req.body);
    const profile = db.prepare('SELECT * FROM talent_profiles WHERE user_id = ?').get(req.params.userId);
    if (!profile) return res.status(404).json({ error: 'Talent profile not found.' });
    db.prepare(
      'UPDATE talent_profiles SET vetting_status = ?, vetted_at = ?, vetted_by = ? WHERE user_id = ?',
    ).run(input.decision, new Date().toISOString(), req.user.id, req.params.userId);
    res.json(profileFor(req.params.userId));
  });

  app.post('/api/talent/credentials', (req, res) => {
    const input = credentialSchema.parse(req.body);
    const profile = db.prepare('SELECT id FROM talent_profiles WHERE user_id = ?').get(req.user.id);
    if (!profile) return res.status(400).json({ error: 'Create your talent profile before adding a credential.' });
    const id = randomUUID();
    const now = new Date().toISOString();
    transaction(() => {
      db.prepare(
        `INSERT INTO expert_credentials
         (id, profile_id, type, title, issuer, issued_at, expires_at, evidence_url, verification_status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
      ).run(
        id,
        profile.id,
        input.type,
        input.title,
        input.issuer,
        input.issuedAt ?? null,
        input.expiresAt ?? null,
        input.evidenceUrl ?? null,
        now,
      );
      log(req.workspace.id, req.user.name, 'Credential submitted', id, input.title);
    });
    res.status(201).json(credentialsFor(profile.id));
  });

  app.get('/api/talent/credentials/mine', (req, res) => {
    const profile = db.prepare('SELECT id FROM talent_profiles WHERE user_id = ?').get(req.user.id);
    res.json(profile ? credentialsFor(profile.id) : []);
  });

  app.get('/api/admin/talent/credentials', (req, res) => {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Only an ecosystem administrator can review credentials.' });
    res.json(
      db
        .prepare(
          `SELECT expert_credentials.*, users.name, users.email FROM expert_credentials
           JOIN talent_profiles ON talent_profiles.id = expert_credentials.profile_id
           JOIN users ON users.id = talent_profiles.user_id
           WHERE expert_credentials.verification_status = 'pending'`,
        )
        .all(),
    );
  });

  app.patch('/api/admin/talent/credentials/:id', (req, res) => {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Only an ecosystem administrator can decide credentials.' });
    const input = credentialDecisionSchema.parse(req.body);
    const credential = db.prepare('SELECT * FROM expert_credentials WHERE id = ?').get(req.params.id);
    if (!credential) return res.status(404).json({ error: 'Credential not found.' });
    db.prepare(
      'UPDATE expert_credentials SET verification_status = ?, verified_at = ?, verified_by = ? WHERE id = ?',
    ).run(input.decision, new Date().toISOString(), req.user.id, req.params.id);
    res.json(db.prepare('SELECT * FROM expert_credentials WHERE id = ?').get(req.params.id));
  });

  app.get('/api/talent/experts', (req, res) => {
    const skillQuery = String(req.query.skill || '').trim();
    const maxRate = req.query.maxRate ? Number(req.query.maxRate) : null;
    const domainFilter = req.query.domain ? String(req.query.domain) : null;
    const functionFilter = req.query.function ? String(req.query.function) : null;
    const industryFilter = req.query.industry ? String(req.query.industry) : null;
    const queryWords = wordSet(skillQuery);
    const rows = db.prepare('SELECT * FROM talent_profiles').all();
    const verifiedCredentialCounts = new Map(
      db
        .prepare(
          "SELECT profile_id, COUNT(*) AS count FROM expert_credentials WHERE verification_status = 'verified' GROUP BY profile_id",
        )
        .all()
        .map((row) => [row.profile_id, row.count]),
    );
    const results = rows
      .filter((row) => !domainFilter || JSON.parse(row.domains).includes(domainFilter))
      .filter((row) => !functionFilter || JSON.parse(row.functions).includes(functionFilter))
      .filter((row) => !industryFilter || JSON.parse(row.industries).includes(industryFilter))
      .map((row) => {
        const skills = JSON.parse(row.skills);
        const profileWords = wordSet(`${row.headline} ${skills.join(' ')}`);
        const overlap = [...queryWords].filter((word) => profileWords.has(word)).length;
        const skillScore = queryWords.size === 0 ? 50 : Math.round((overlap / queryWords.size) * 70);
        const rateFit = maxRate == null || !row.hourly_rate ? 15 : row.hourly_rate <= maxRate ? 15 : 0;
        const vettingBonus = row.vetting_status === 'verified' ? 15 : 0;
        const credentialBonus = Math.min(10, (verifiedCredentialCounts.get(row.id) || 0) * 2);
        return {
          userId: row.user_id,
          headline: row.headline,
          skills,
          domains: JSON.parse(row.domains),
          functions: JSON.parse(row.functions),
          industries: JSON.parse(row.industries),
          hourlyRate: row.hourly_rate,
          currency: row.currency,
          location: row.location,
          vettingStatus: row.vetting_status,
          score: skillScore + rateFit + vettingBonus + credentialBonus,
          breakdown: { skillScore, rateFit, vettingBonus, credentialBonus },
        };
      })
      .filter((result) => queryWords.size === 0 || result.breakdown.skillScore > 0)
      .sort((a, b) => b.score - a.score);
    res.json(results);
  });

  app.get('/api/talent/quiz/:skill', (req, res) => {
    const bank = QUIZ_BANK[req.params.skill];
    if (!bank) return res.status(404).json({ error: `No assessment is available for "${req.params.skill}" yet.` });
    res.json(bank.map(({ question, options }) => ({ question, options })));
  });

  app.post('/api/talent/assessments', (req, res) => {
    const input = assessmentSchema.parse(req.body);
    const bank = QUIZ_BANK[input.skill];
    if (!bank) return res.status(404).json({ error: `No assessment is available for "${input.skill}" yet.` });
    if (input.answers.length !== bank.length)
      return res.status(400).json({ error: `This assessment has ${bank.length} questions.` });
    const correct = bank.filter((q, i) => q.correctIndex === input.answers[i]).length;
    const score = Math.round((correct / bank.length) * 100);
    const profile = db.prepare('SELECT id FROM talent_profiles WHERE user_id = ?').get(req.user.id);
    if (!profile) return res.status(400).json({ error: 'Create your talent profile before taking an assessment.' });
    const id = randomUUID();
    transaction(() => {
      db.prepare('INSERT INTO talent_assessments VALUES (?, ?, ?, ?, ?, ?)').run(
        id,
        profile.id,
        input.skill,
        score,
        'quiz',
        new Date().toISOString(),
      );
      log(req.workspace.id, req.user.name, 'Skills assessment completed', id, `${input.skill}: ${score}%`);
    });
    res.status(201).json({
      id,
      skill: input.skill,
      score,
      passed: score / 100 >= PASS_THRESHOLD,
      threshold: PASS_THRESHOLD * 100,
    });
  });

  // Freelancer-portfolio comparison for a specific project: ranks EVERY talent profile
  // (not just people who already bid) against the job's own requirements, so a client can
  // see who best matches the project before anyone has even applied.
  app.get('/api/jobs/:id/candidate-matches', (req, res) => {
    const job = db.prepare('SELECT * FROM job_posts WHERE id = ?').get(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found.' });
    if (job.client_user_id !== req.user.id)
      return res.status(403).json({ error: 'Only the job owner can compare candidates for this project.' });
    const jobWords = wordSet(`${job.title} ${job.category} ${job.description} ${job.deliverables}`);
    const rows = db.prepare('SELECT * FROM talent_profiles').all();
    const results = rows
      .map((row) => {
        const skills = JSON.parse(row.skills);
        const profileWords = wordSet(`${row.headline} ${skills.join(' ')}`);
        const overlap = [...profileWords].filter((word) => jobWords.has(word)).length;
        const skillFit = profileWords.size === 0 ? 0 : Math.round((overlap / profileWords.size) * 70);
        const rateFit = !row.hourly_rate ? 15 : row.hourly_rate * 100 <= job.budget_max ? 15 : 0;
        const vettingBonus = row.vetting_status === 'verified' ? 15 : 0;
        return {
          userId: row.user_id,
          headline: row.headline,
          skills,
          hourlyRate: row.hourly_rate,
          currency: row.currency,
          vettingStatus: row.vetting_status,
          score: skillFit + rateFit + vettingBonus,
          breakdown: { skillFit, rateFit, vettingBonus },
        };
      })
      .filter((result) => result.breakdown.skillFit > 0)
      .sort((a, b) => b.score - a.score);
    res.json(results);
  });

  // The inverse: for the current freelancer, rank every open job by fit to their own
  // profile, so they can prioritize which projects to bid on rather than browsing blind.
  app.get('/api/talent/job-matches', (req, res) => {
    const profile = profileFor(req.user.id);
    if (!profile) return res.status(400).json({ error: 'Create your talent profile to get job matches.' });
    const profileWords = wordSet(`${profile.headline} ${profile.skills.join(' ')}`);
    const jobs = db.prepare("SELECT * FROM job_posts WHERE status = 'open'").all();
    const results = jobs
      .map((job) => {
        const jobWords = wordSet(`${job.title} ${job.category} ${job.description} ${job.deliverables}`);
        const overlap = [...profileWords].filter((word) => jobWords.has(word)).length;
        const skillFit = jobWords.size === 0 ? 0 : Math.round((overlap / jobWords.size) * 70);
        const rateFit =
          !profile.hourly_rate || profile.hourly_rate * 100 <= job.budget_max ? 15 : 0;
        const budgetFit = job.budget_max >= (profile.hourly_rate || 0) * 100 ? 15 : 0;
        return {
          jobId: job.id,
          title: job.title,
          category: job.category,
          budgetMin: job.budget_min,
          budgetMax: job.budget_max,
          currency: job.currency,
          score: skillFit + rateFit + budgetFit,
          breakdown: { skillFit, rateFit, budgetFit },
        };
      })
      .filter((result) => result.breakdown.skillFit > 0)
      .sort((a, b) => b.score - a.score);
    res.json(results);
  });

  app.get('/api/jobs/:id/screening', (req, res, next) => {
    try {
      const job = db.prepare('SELECT * FROM job_posts WHERE id = ?').get(req.params.id);
      if (!job) return res.status(404).json({ error: 'Job not found.' });
      if (job.client_user_id !== req.user.id)
        return res.status(403).json({ error: 'Only the job owner can view candidate screening.' });
      const bids = db.prepare('SELECT * FROM bids WHERE job_id = ?').all(job.id);
      const results = bids.map((bid) => {
        const bidScore = scoreBid(job, bid);
        const profile = profileFor(bid.freelancer_user_id);
        const assessments = profile
          ? db.prepare('SELECT score FROM talent_assessments WHERE profile_id = ?').all(profile.id)
          : [];
        const assessmentAvg =
          assessments.length === 0
            ? 0
            : Math.round(assessments.reduce((sum, a) => sum + a.score, 0) / assessments.length);
        const vettingBonus = profile?.vetting_status === 'verified' ? 10 : 0;
        const completedMilestones = db
          .prepare(
            "SELECT COUNT(*) AS count FROM milestones JOIN projects ON projects.id = milestones.project_id WHERE projects.freelancer_user_id = ? AND milestones.status IN ('approved', 'paid')",
          )
          .get(bid.freelancer_user_id).count;
        const trackRecordBonus = Math.min(20, completedMilestones * 5);
        const blendedTotal = Math.round(
          bidScore.total * 0.5 + assessmentAvg * 0.2 + vettingBonus + trackRecordBonus,
        );
        return {
          bidId: bid.id,
          freelancerUserId: bid.freelancer_user_id,
          bidScore,
          assessmentAvg,
          vettingStatus: profile?.vetting_status || 'unverified',
          completedMilestones,
          blendedTotal,
        };
      });
      results.sort((a, b) => b.blendedTotal - a.blendedTotal);
      res.json(results);
    } catch (error) {
      next(error);
    }
  });
}
