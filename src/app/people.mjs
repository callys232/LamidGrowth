/** /os/people — real capability data this app actually has: the workspace roster, each member's
 * talent profile (skills/experience/vetting) where they have one, their real assessment scores and
 * credentials, any expert teams assigned to this workspace's projects, and recent Capability
 * Mapper AI reviews (clearly attributed as AI commentary, not quantified gap metrics — no
 * structured "capability gap score" is persisted anywhere in this app, so this doesn't invent one).
 */
export function mountPeople(app, store) {
  const { db } = store;

  app.get('/api/people/overview', async (req, res) => {
    const workspaceId = req.workspace.id;

    const members = await db
      .prepare(
        `SELECT wm.user_id, wm.role, wm.status, u.name, u.email,
                tp.id AS profile_id, tp.headline, tp.skills, tp.experience_years, tp.availability,
                tp.vetting_status, tp.domains, tp.functions, tp.industries
         FROM workspace_members wm
         JOIN users u ON u.id = wm.user_id
         LEFT JOIN talent_profiles tp ON tp.user_id = wm.user_id
         WHERE wm.workspace_id = ? AND wm.status = 'active'
         ORDER BY (wm.role = 'owner') DESC, u.name`,
      )
      .all(workspaceId);

    const profileIds = members.map((m) => m.profile_id).filter(Boolean);
    const assessmentsByProfile = {};
    const credentialsByProfile = {};
    if (profileIds.length > 0) {
      const placeholders = profileIds.map(() => '?').join(',');
      const assessments = await db
        .prepare(`SELECT * FROM talent_assessments WHERE profile_id IN (${placeholders}) ORDER BY created_at DESC`)
        .all(...profileIds);
      for (const a of assessments) (assessmentsByProfile[a.profile_id] ??= []).push(a);
      const credentials = await db
        .prepare(`SELECT * FROM expert_credentials WHERE profile_id IN (${placeholders}) ORDER BY created_at DESC`)
        .all(...profileIds);
      for (const c of credentials) (credentialsByProfile[c.profile_id] ??= []).push(c);
    }

    const roster = members.map((m) => ({
      userId: m.user_id,
      name: m.name,
      email: m.email,
      role: m.role,
      talent: m.profile_id
        ? {
            headline: m.headline,
            skills: JSON.parse(m.skills || '[]'),
            experienceYears: m.experience_years,
            availability: m.availability,
            vettingStatus: m.vetting_status,
            domains: JSON.parse(m.domains || '[]'),
            functions: JSON.parse(m.functions || '[]'),
            industries: JSON.parse(m.industries || '[]'),
            assessments: (assessmentsByProfile[m.profile_id] || []).map((a) => ({
              skill: a.skill,
              score: a.score,
              method: a.method,
              createdAt: a.created_at,
            })),
            credentials: (credentialsByProfile[m.profile_id] || []).map((c) => ({
              type: c.type,
              title: c.title,
              issuer: c.issuer,
              verificationStatus: c.verification_status,
              issuedAt: c.issued_at,
              expiresAt: c.expires_at,
            })),
          }
        : null,
    }));

    const teamRows = await db
      .prepare(
        `SELECT DISTINCT et.id, et.name, et.description, et.lead_user_id, lu.name AS lead_name
         FROM projects p
         JOIN expert_teams et ON et.id = p.assigned_team_id
         JOIN users lu ON lu.id = et.lead_user_id
         WHERE p.workspace_id = ? AND p.assigned_team_id IS NOT NULL`,
      )
      .all(workspaceId);
    const teams = [];
    for (const t of teamRows) {
      const teamMembers = await db
        .prepare(
          `SELECT etm.user_id, etm.role, u.name FROM expert_team_members etm
           JOIN users u ON u.id = etm.user_id WHERE etm.team_id = ?`,
        )
        .all(t.id);
      teams.push({
        id: t.id,
        name: t.name,
        description: t.description,
        leadName: t.lead_name,
        members: teamMembers.map((tm) => ({ userId: tm.user_id, name: tm.name, role: tm.role })),
      });
    }

    const capabilityRuns = await db
      .prepare(
        `SELECT id, input, output, created_at FROM agent_runs
         WHERE workspace_id = ? AND agent_id = 'capability-mapper' AND status = 'completed'
         ORDER BY created_at DESC LIMIT 10`,
      )
      .all(workspaceId);
    const recentCapabilityReviews = capabilityRuns.map((r) => {
      let question = '';
      let response = '';
      try {
        question = JSON.parse(r.input).message || '';
      } catch {
        // leave blank if input isn't parseable JSON
      }
      try {
        response = JSON.parse(r.output || '{}').response || '';
      } catch {
        // leave blank if output isn't parseable JSON
      }
      return { id: r.id, question, response, createdAt: r.created_at };
    });

    res.json({ roster, teams, recentCapabilityReviews });
  });
}
