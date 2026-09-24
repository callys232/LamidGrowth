import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { wordSet, scoreBid } from './text.mjs';
import { DOMAINS, FUNCTIONS, INDUSTRIES, SENIORITY, ENGAGEMENT_MODELS } from './expertiseTaxonomy.mjs';

const profileSchema = z
  .object({
    headline: z.string().trim().min(1).max(200),
    skills: z.array(z.string().trim().min(1).max(60)).min(1).max(30),
    experienceYears: z.number().int().min(0).max(60).optional(),
    availability: z.string().trim().max(60).optional(),
    hourlyRate: z.number().int().positive().max(1000000).optional(),
    currency: z
      .string()
      .regex(/^[A-Z]{3}$/)
      .optional(),
    location: z.string().trim().max(120).optional(),
    languages: z.array(z.string().trim().min(1).max(60)).max(20).default([]),
    portfolioUrl: z.string().trim().max(2000).optional(),
    domains: z.array(z.enum(DOMAINS)).max(10).default([]),
    functions: z.array(z.enum(FUNCTIONS)).max(15).default([]),
    industries: z.array(z.enum(INDUSTRIES)).max(10).default([]),
    jurisdiction: z.string().trim().max(120).optional(),
    seniority: z.enum(SENIORITY).optional(),
    engagementModels: z.array(z.enum(ENGAGEMENT_MODELS)).max(ENGAGEMENT_MODELS.length).default([]),
  })
  .strict();
const vettingDecisionSchema = z.object({ decision: z.enum(['verified', 'rejected']) }).strict();
const conflictDisclosureSchema = z
  .object({ description: z.string().trim().min(1).max(2000) })
  .strict();
const conflictDecisionSchema = z.object({ decision: z.enum(['cleared', 'restricted']) }).strict();
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
  .object({
    skill: z.string().trim().min(1).max(60),
    answers: z.array(z.number().int().min(0).max(10)).min(1).max(20),
  })
  .strict();

const PASS_THRESHOLD = 0.8;

// Deterministic multiple-choice quiz bank — a skills assessment is graded purely against
// this bank, never by an AI, so a score can never be hallucinated. Modeled on LinkedIn's
// Skill Assessment mechanic (quiz + pass threshold), not a coded test (that needs a sandbox
// execution environment, which is explicitly out of scope for this pass).
const QUIZ_BANK = {
  javascript: [
    {
      question: 'What does `typeof null` return in JavaScript?',
      options: ['null', 'undefined', 'object', 'number'],
      correctIndex: 2,
    },
    {
      question: 'Which method adds an item to the end of an array?',
      options: ['push', 'shift', 'unshift', 'pop'],
      correctIndex: 0,
    },
    {
      question: 'What keyword declares a block-scoped variable?',
      options: ['var', 'let', 'function', 'global'],
      correctIndex: 1,
    },
    {
      question: 'What does `===` check that `==` does not?',
      options: ['Nothing', 'Type', 'Scope', 'Hoisting'],
      correctIndex: 1,
    },
    {
      question: 'Which is NOT a JavaScript primitive type?',
      options: ['string', 'boolean', 'array', 'number'],
      correctIndex: 2,
    },
  ],
  'project-management': [
    {
      question: 'What is the critical path in a project schedule?',
      options: [
        'The cheapest tasks',
        'The longest sequence of dependent tasks',
        'The riskiest task',
        'The final milestone',
      ],
      correctIndex: 1,
    },
    {
      question: 'A "scope creep" refers to:',
      options: [
        'Team turnover',
        'Uncontrolled growth in project scope',
        'A budget surplus',
        'A schedule buffer',
      ],
      correctIndex: 1,
    },
    {
      question: 'What does a RACI matrix clarify?',
      options: ['Risk levels', 'Roles and responsibilities', 'Budget allocation', 'Timeline slack'],
      correctIndex: 1,
    },
    {
      question: 'A Gantt chart primarily visualizes:',
      options: [
        'Team morale',
        'Task schedules over time',
        'Budget variance',
        'Stakeholder sentiment',
      ],
      correctIndex: 1,
    },
    {
      question: 'What is a "milestone" in project management?',
      options: [
        'A billable task',
        'A significant checkpoint with no duration',
        'A team meeting',
        'A budget line item',
      ],
      correctIndex: 1,
    },
  ],
};

const fail = (message, status) => {
  throw Object.assign(new Error(message), { status });
};

export function mountTalent(app, store, { ecosystemAdminEmails }) {
  const { db, transaction, log } = store;
  const isAdmin = (req) => ecosystemAdminEmails.includes((req.user.email || '').toLowerCase());

  async function profileFor(userId) {
    const row = await db.prepare('SELECT * FROM talent_profiles WHERE user_id = ?').get(userId);
    return row
      ? {
          ...row,
          skills: JSON.parse(row.skills),
          languages: JSON.parse(row.languages),
          domains: JSON.parse(row.domains),
          functions: JSON.parse(row.functions),
          industries: JSON.parse(row.industries),
          engagementModels: JSON.parse(row.engagement_models),
        }
      : null;
  }

  async function credentialsFor(profileId) {
    return db
      .prepare('SELECT * FROM expert_credentials WHERE profile_id = ? ORDER BY created_at DESC')
      .all(profileId);
  }

  app.post('/api/talent/profile', async (req, res) => {
    const input = profileSchema.parse(req.body);
    const existing = await db
      .prepare('SELECT id FROM talent_profiles WHERE user_id = ?')
      .get(req.user.id);
    const now = new Date().toISOString();
    await transaction(async () => {
      if (existing) {
        await db
          .prepare(
            `UPDATE talent_profiles SET headline = ?, skills = ?, experience_years = ?, availability = ?,
           hourly_rate = ?, currency = ?, location = ?, languages = ?, portfolio_url = ?,
           domains = ?, functions = ?, industries = ?, jurisdiction = ?, seniority = ?, engagement_models = ?, updated_at = ?
           WHERE user_id = ?`,
          )
          .run(
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
            input.jurisdiction ?? null,
            input.seniority ?? null,
            JSON.stringify(input.engagementModels),
            now,
            req.user.id,
          );
      } else {
        await db
          .prepare(
            `INSERT INTO talent_profiles
           (id, user_id, headline, skills, experience_years, availability, hourly_rate, currency, created_at, updated_at, location, languages, portfolio_url, vetting_status, domains, functions, industries, jurisdiction, seniority, engagement_models)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'unverified', ?, ?, ?, ?, ?, ?)`,
          )
          .run(
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
            input.jurisdiction ?? null,
            input.seniority ?? null,
            JSON.stringify(input.engagementModels),
          );
      }
      await log(
        req.workspace.id,
        req.user.name,
        'Talent profile saved',
        req.user.id,
        input.headline,
      );
    });
    res.json(await profileFor(req.user.id));
  });

  app.get('/api/talent/profile/mine', async (req, res) => {
    res.json(await profileFor(req.user.id));
  });

  // Asynchronous Expert Availability (21.5 / EX-04): declared once, used to compute a real SLA the
  // moment this expert claims a review-queue entry (see scoping.mjs's claim route).
  app.patch('/api/talent/profile/review-availability', async (req, res) => {
    const profile = await profileFor(req.user.id);
    if (!profile) return res.status(404).json({ error: 'Create a talent profile before setting review availability.' });
    const input = z
      .object({
        timezone: z.string().trim().max(60).optional(),
        asyncReviewEligible: z.boolean().optional(),
        urgentReviewEligible: z.boolean().optional(),
        expectedResponseHours: z.number().int().positive().max(720).nullable().optional(),
      })
      .strict()
      .parse(req.body);
    await db
      .prepare(
        'UPDATE talent_profiles SET timezone = ?, async_review_eligible = ?, urgent_review_eligible = ?, expected_response_hours = ? WHERE user_id = ?',
      )
      .run(
        input.timezone ?? profile.timezone ?? null,
        input.asyncReviewEligible === undefined ? profile.async_review_eligible : (input.asyncReviewEligible ? 1 : 0),
        input.urgentReviewEligible === undefined ? profile.urgent_review_eligible : (input.urgentReviewEligible ? 1 : 0),
        input.expectedResponseHours === undefined ? profile.expected_response_hours : input.expectedResponseHours,
        req.user.id,
      );
    res.json(await profileFor(req.user.id));
  });

  app.post('/api/talent/profile/vetting', async (req, res) => {
    const profile = await db
      .prepare('SELECT id FROM talent_profiles WHERE user_id = ?')
      .get(req.user.id);
    if (!profile)
      return res
        .status(400)
        .json({ error: 'Create your talent profile before requesting vetting.' });
    await db
      .prepare("UPDATE talent_profiles SET vetting_status = 'pending' WHERE user_id = ?")
      .run(req.user.id);
    res.json(await profileFor(req.user.id));
  });

  app.get('/api/admin/talent/vetting', async (req, res) => {
    if (!isAdmin(req))
      return res
        .status(403)
        .json({ error: 'Only an ecosystem administrator can review vetting requests.' });
    const rows = await db
      .prepare(
        `SELECT talent_profiles.*, users.name, users.email FROM talent_profiles
         JOIN users ON users.id = talent_profiles.user_id WHERE vetting_status = 'pending'`,
      )
      .all();
    res.json(
      rows.map((row) => ({
        ...row,
        skills: JSON.parse(row.skills),
        languages: JSON.parse(row.languages),
      })),
    );
  });

  app.patch('/api/admin/talent/vetting/:userId', async (req, res) => {
    if (!isAdmin(req))
      return res
        .status(403)
        .json({ error: 'Only an ecosystem administrator can decide vetting requests.' });
    const input = vettingDecisionSchema.parse(req.body);
    const profile = await db
      .prepare('SELECT * FROM talent_profiles WHERE user_id = ?')
      .get(req.params.userId);
    if (!profile) return res.status(404).json({ error: 'Talent profile not found.' });
    await db
      .prepare(
        'UPDATE talent_profiles SET vetting_status = ?, vetted_at = ?, vetted_by = ? WHERE user_id = ?',
      )
      .run(input.decision, new Date().toISOString(), req.user.id, req.params.userId);
    res.json(await profileFor(req.params.userId));
  });

  app.post('/api/talent/credentials', async (req, res) => {
    const input = credentialSchema.parse(req.body);
    const profile = await db
      .prepare('SELECT id FROM talent_profiles WHERE user_id = ?')
      .get(req.user.id);
    if (!profile)
      return res
        .status(400)
        .json({ error: 'Create your talent profile before adding a credential.' });
    const id = randomUUID();
    const now = new Date().toISOString();
    await transaction(async () => {
      await db
        .prepare(
          `INSERT INTO expert_credentials
         (id, profile_id, type, title, issuer, issued_at, expires_at, evidence_url, verification_status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
        )
        .run(
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
      await log(req.workspace.id, req.user.name, 'Credential submitted', id, input.title);
    });
    res.status(201).json(await credentialsFor(profile.id));
  });

  app.get('/api/talent/credentials/mine', async (req, res) => {
    const profile = await db
      .prepare('SELECT id FROM talent_profiles WHERE user_id = ?')
      .get(req.user.id);
    res.json(profile ? await credentialsFor(profile.id) : []);
  });

  app.get('/api/admin/talent/credentials', async (req, res) => {
    if (!isAdmin(req))
      return res
        .status(403)
        .json({ error: 'Only an ecosystem administrator can review credentials.' });
    res.json(
      await db
        .prepare(
          `SELECT expert_credentials.*, users.name, users.email FROM expert_credentials
           JOIN talent_profiles ON talent_profiles.id = expert_credentials.profile_id
           JOIN users ON users.id = talent_profiles.user_id
           WHERE expert_credentials.verification_status = 'pending'`,
        )
        .all(),
    );
  });

  app.patch('/api/admin/talent/credentials/:id', async (req, res) => {
    if (!isAdmin(req))
      return res
        .status(403)
        .json({ error: 'Only an ecosystem administrator can decide credentials.' });
    const input = credentialDecisionSchema.parse(req.body);
    const credential = await db
      .prepare('SELECT * FROM expert_credentials WHERE id = ?')
      .get(req.params.id);
    if (!credential) return res.status(404).json({ error: 'Credential not found.' });
    await db
      .prepare(
        'UPDATE expert_credentials SET verification_status = ?, verified_at = ?, verified_by = ? WHERE id = ?',
      )
      .run(input.decision, new Date().toISOString(), req.user.id, req.params.id);
    res.json(await db.prepare('SELECT * FROM expert_credentials WHERE id = ?').get(req.params.id));
  });

  app.post('/api/talent/conflicts', async (req, res) => {
    const input = conflictDisclosureSchema.parse(req.body);
    const profile = await db
      .prepare('SELECT id FROM talent_profiles WHERE user_id = ?')
      .get(req.user.id);
    if (!profile)
      return res
        .status(400)
        .json({ error: 'Create your talent profile before disclosing a conflict.' });
    const id = randomUUID();
    const now = new Date().toISOString();
    await transaction(async () => {
      await db
        .prepare(
          "INSERT INTO conflict_disclosures (id, profile_id, description, status, created_at) VALUES (?, ?, ?, 'disclosed', ?)",
        )
        .run(id, profile.id, input.description, now);
      await log(
        req.workspace.id,
        req.user.name,
        'Conflict of interest disclosed',
        id,
        input.description,
      );
    });
    res
      .status(201)
      .json(await db.prepare('SELECT * FROM conflict_disclosures WHERE id = ?').get(id));
  });

  app.get('/api/talent/conflicts/mine', async (req, res) => {
    const profile = await db
      .prepare('SELECT id FROM talent_profiles WHERE user_id = ?')
      .get(req.user.id);
    res.json(
      profile
        ? await db
            .prepare(
              'SELECT * FROM conflict_disclosures WHERE profile_id = ? ORDER BY created_at DESC',
            )
            .all(profile.id)
        : [],
    );
  });

  app.get('/api/admin/talent/conflicts', async (req, res) => {
    if (!isAdmin(req))
      return res
        .status(403)
        .json({ error: 'Only an ecosystem administrator can review conflict disclosures.' });
    res.json(
      await db
        .prepare(
          `SELECT conflict_disclosures.*, users.name, users.email FROM conflict_disclosures
           JOIN talent_profiles ON talent_profiles.id = conflict_disclosures.profile_id
           JOIN users ON users.id = talent_profiles.user_id
           WHERE conflict_disclosures.status = 'disclosed'`,
        )
        .all(),
    );
  });

  app.patch('/api/admin/talent/conflicts/:id', async (req, res) => {
    if (!isAdmin(req))
      return res
        .status(403)
        .json({ error: 'Only an ecosystem administrator can decide conflict disclosures.' });
    const input = conflictDecisionSchema.parse(req.body);
    const disclosure = await db
      .prepare('SELECT * FROM conflict_disclosures WHERE id = ?')
      .get(req.params.id);
    if (!disclosure) return res.status(404).json({ error: 'Conflict disclosure not found.' });
    await db
      .prepare(
        'UPDATE conflict_disclosures SET status = ?, reviewed_at = ?, reviewed_by = ? WHERE id = ?',
      )
      .run(input.decision, new Date().toISOString(), req.user.id, req.params.id);
    res.json(
      await db.prepare('SELECT * FROM conflict_disclosures WHERE id = ?').get(req.params.id),
    );
  });

  app.get('/api/talent/experts', async (req, res) => {
    const skillQuery = String(req.query.skill || '').trim();
    const maxRate = req.query.maxRate ? Number(req.query.maxRate) : null;
    const domainFilter = req.query.domain ? String(req.query.domain) : null;
    const functionFilter = req.query.function ? String(req.query.function) : null;
    const industryFilter = req.query.industry ? String(req.query.industry) : null;
    const queryWords = wordSet(skillQuery);
    const rows = await db.prepare('SELECT * FROM talent_profiles').all();
    const credentialRows = await db
      .prepare(
        "SELECT profile_id, COUNT(*) AS count FROM expert_credentials WHERE verification_status = 'verified' GROUP BY profile_id",
      )
      .all();
    const verifiedCredentialCounts = new Map(
      credentialRows.map((row) => [row.profile_id, row.count]),
    );
    // A restricted conflict disclosure removes an expert from matching outright — this is the
    // enforcement point for the governance gap, not just a badge shown on their profile.
    const restrictedRows = await db
      .prepare("SELECT DISTINCT profile_id FROM conflict_disclosures WHERE status = 'restricted'")
      .all();
    const restrictedProfileIds = new Set(restrictedRows.map((r) => r.profile_id));
    const reputationRows = await db
      .prepare(
        'SELECT reviewee_user_id, COALESCE(AVG(rating), 0) AS average FROM reviews GROUP BY reviewee_user_id',
      )
      .all();
    const reputationByUserId = new Map(
      reputationRows.map((row) => [row.reviewee_user_id, row.average]),
    );
    const results = rows
      .filter((row) => !restrictedProfileIds.has(row.id))
      .filter((row) => !domainFilter || JSON.parse(row.domains).includes(domainFilter))
      .filter((row) => !functionFilter || JSON.parse(row.functions).includes(functionFilter))
      .filter((row) => !industryFilter || JSON.parse(row.industries).includes(industryFilter))
      .map((row) => {
        const skills = JSON.parse(row.skills);
        const profileWords = wordSet(`${row.headline} ${skills.join(' ')}`);
        const overlap = [...queryWords].filter((word) => profileWords.has(word)).length;
        const skillScore =
          queryWords.size === 0 ? 50 : Math.round((overlap / queryWords.size) * 70);
        const rateFit =
          maxRate == null || !row.hourly_rate ? 15 : row.hourly_rate <= maxRate ? 15 : 0;
        const vettingBonus = row.vetting_status === 'verified' ? 15 : 0;
        const credentialBonus = Math.min(10, (verifiedCredentialCounts.get(row.id) || 0) * 2);
        const reputationBonus = Math.round((reputationByUserId.get(row.user_id) || 0) * 2);
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
          jurisdiction: row.jurisdiction,
          vettingStatus: row.vetting_status,
          score: skillScore + rateFit + vettingBonus + credentialBonus + reputationBonus,
          breakdown: { skillScore, rateFit, vettingBonus, credentialBonus, reputationBonus },
        };
      })
      .filter((result) => queryWords.size === 0 || result.breakdown.skillScore > 0)
      .sort((a, b) => b.score - a.score);
    res.json(results);
  });

  app.get('/api/talent/quiz/:skill', (req, res) => {
    const bank = QUIZ_BANK[req.params.skill];
    if (!bank)
      return res
        .status(404)
        .json({ error: `No assessment is available for "${req.params.skill}" yet.` });
    res.json(bank.map(({ question, options }) => ({ question, options })));
  });

  app.post('/api/talent/assessments', async (req, res) => {
    const input = assessmentSchema.parse(req.body);
    const bank = QUIZ_BANK[input.skill];
    if (!bank)
      return res
        .status(404)
        .json({ error: `No assessment is available for "${input.skill}" yet.` });
    if (input.answers.length !== bank.length)
      return res.status(400).json({ error: `This assessment has ${bank.length} questions.` });
    const correct = bank.filter((q, i) => q.correctIndex === input.answers[i]).length;
    const score = Math.round((correct / bank.length) * 100);
    const profile = await db
      .prepare('SELECT id FROM talent_profiles WHERE user_id = ?')
      .get(req.user.id);
    if (!profile)
      return res
        .status(400)
        .json({ error: 'Create your talent profile before taking an assessment.' });
    const id = randomUUID();
    await transaction(async () => {
      await db
        .prepare('INSERT INTO talent_assessments VALUES (?, ?, ?, ?, ?, ?)')
        .run(id, profile.id, input.skill, score, 'quiz', new Date().toISOString());
      await log(
        req.workspace.id,
        req.user.name,
        'Skills assessment completed',
        id,
        `${input.skill}: ${score}%`,
      );
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
  app.get('/api/jobs/:id/candidate-matches', async (req, res) => {
    const job = await db.prepare('SELECT * FROM job_posts WHERE id = ?').get(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found.' });
    if (job.client_user_id !== req.user.id)
      return res
        .status(403)
        .json({ error: 'Only the job owner can compare candidates for this project.' });
    const jobWords = wordSet(`${job.title} ${job.category} ${job.description} ${job.deliverables}`);
    const rows = await db.prepare('SELECT * FROM talent_profiles').all();
    const results = rows
      .map((row) => {
        const skills = JSON.parse(row.skills);
        const profileWords = wordSet(`${row.headline} ${skills.join(' ')}`);
        const overlap = [...profileWords].filter((word) => jobWords.has(word)).length;
        const skillFit =
          profileWords.size === 0 ? 0 : Math.round((overlap / profileWords.size) * 70);
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
  app.get('/api/talent/job-matches', async (req, res) => {
    const profile = await profileFor(req.user.id);
    if (!profile)
      return res.status(400).json({ error: 'Create your talent profile to get job matches.' });
    const profileWords = wordSet(`${profile.headline} ${profile.skills.join(' ')}`);
    const jobs = await db.prepare("SELECT * FROM job_posts WHERE status = 'open'").all();
    const results = jobs
      .map((job) => {
        const jobWords = wordSet(
          `${job.title} ${job.category} ${job.description} ${job.deliverables}`,
        );
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

  app.get('/api/jobs/:id/screening', async (req, res, next) => {
    try {
      const job = await db.prepare('SELECT * FROM job_posts WHERE id = ?').get(req.params.id);
      if (!job) return res.status(404).json({ error: 'Job not found.' });
      if (job.client_user_id !== req.user.id)
        return res.status(403).json({ error: 'Only the job owner can view candidate screening.' });
      const bids = await db.prepare('SELECT * FROM bids WHERE job_id = ?').all(job.id);
      const results = await Promise.all(
        bids.map(async (bid) => {
          const bidScore = scoreBid(job, bid);
          const profile = await profileFor(bid.freelancer_user_id);
          const assessments = profile
            ? await db
                .prepare('SELECT score FROM talent_assessments WHERE profile_id = ?')
                .all(profile.id)
            : [];
          const assessmentAvg =
            assessments.length === 0
              ? 0
              : Math.round(assessments.reduce((sum, a) => sum + a.score, 0) / assessments.length);
          const vettingBonus = profile?.vetting_status === 'verified' ? 10 : 0;
          const completedMilestonesRow = await db
            .prepare(
              "SELECT COUNT(*) AS count FROM milestones JOIN projects ON projects.id = milestones.project_id WHERE projects.freelancer_user_id = ? AND milestones.status IN ('approved', 'paid')",
            )
            .get(bid.freelancer_user_id);
          const completedMilestones = completedMilestonesRow.count;
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
        }),
      );
      results.sort((a, b) => b.blendedTotal - a.blendedTotal);
      res.json(results);
    } catch (error) {
      next(error);
    }
  });
}
