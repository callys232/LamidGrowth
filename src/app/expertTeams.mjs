import { randomUUID } from 'node:crypto';
import { z } from 'zod';

const createSchema = z.object({ name: z.string().trim().min(1).max(200), description: z.string().trim().max(2000).default('') }).strict();
const addMemberSchema = z
  .object({
    userId: z.string().uuid(),
    role: z.string().trim().max(120).default(''),
    accessScope: z.string().trim().max(500).default(''),
  })
  .strict();

const fail = (message, status) => {
  throw Object.assign(new Error(message), { status });
};

export function mountExpertTeams(app, store) {
  const { db, transaction, log } = store;

  async function teamFor(id) {
    const team = await db.prepare('SELECT * FROM expert_teams WHERE id = ?').get(id);
    if (!team) fail('Expert team not found.', 404);
    return team;
  }
  function requireLead(team, userId) {
    if (team.lead_user_id !== userId) fail('Only the team lead can manage membership.', 403);
  }
  async function membersOf(id) {
    return db.prepare('SELECT * FROM expert_team_members WHERE team_id = ? ORDER BY created_at').all(id);
  }

  app.post('/api/expert-teams', async (req, res) => {
    const input = createSchema.parse(req.body);
    if (!(await db.prepare('SELECT 1 FROM talent_profiles WHERE user_id = ?').get(req.user.id)))
      return res.status(400).json({ error: 'Create your expert profile before building a team.' });
    const id = randomUUID();
    const now = new Date().toISOString();
    await transaction(async () => {
      await db.prepare('INSERT INTO expert_teams VALUES (?, ?, ?, ?, ?)').run(id, input.name, req.user.id, input.description, now);
      await db.prepare('INSERT INTO expert_team_members VALUES (?, ?, ?, ?, ?, ?)').run(randomUUID(), id, req.user.id, 'lead', '', now);
      await log(req.workspace.id, req.user.name, 'Expert team created', id, input.name);
    });
    res.status(201).json({ ...(await teamFor(id)), members: await membersOf(id) });
  });

  app.get('/api/expert-teams/mine', async (req, res) => {
    const teams = await db
      .prepare(
        `SELECT t.* FROM expert_teams t
         JOIN expert_team_members m ON m.team_id = t.id
         WHERE m.user_id = ? ORDER BY t.created_at DESC`,
      )
      .all(req.user.id);
    res.json(await Promise.all(teams.map(async (team) => ({ ...team, members: await membersOf(team.id) }))));
  });

  app.get('/api/expert-teams/:id', async (req, res) => {
    const team = await teamFor(req.params.id);
    res.json({ ...team, members: await membersOf(team.id) });
  });

  app.post('/api/expert-teams/:id/members', async (req, res) => {
    const team = await teamFor(req.params.id);
    requireLead(team, req.user.id);
    const input = addMemberSchema.parse(req.body);
    if (!(await db.prepare('SELECT 1 FROM talent_profiles WHERE user_id = ?').get(input.userId)))
      return res.status(400).json({ error: 'That user does not have an expert profile.' });
    if (await db.prepare('SELECT 1 FROM expert_team_members WHERE team_id = ? AND user_id = ?').get(team.id, input.userId))
      return res.status(400).json({ error: 'That expert is already on the team.' });
    const id = randomUUID();
    await db.prepare('INSERT INTO expert_team_members VALUES (?, ?, ?, ?, ?, ?)').run(
      id,
      team.id,
      input.userId,
      input.role,
      input.accessScope,
      new Date().toISOString(),
    );
    res.status(201).json({ ...(await teamFor(team.id)), members: await membersOf(team.id) });
  });

  app.delete('/api/expert-teams/:id/members/:userId', async (req, res) => {
    const team = await teamFor(req.params.id);
    requireLead(team, req.user.id);
    if (req.params.userId === team.lead_user_id) return res.status(400).json({ error: 'The team lead cannot be removed.' });
    await db.prepare('DELETE FROM expert_team_members WHERE team_id = ? AND user_id = ?').run(team.id, req.params.userId);
    res.json({ ...(await teamFor(team.id)), members: await membersOf(team.id) });
  });
}
