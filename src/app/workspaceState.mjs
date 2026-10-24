import { permissionsFor } from './policy.mjs';

export function mountWorkspaceState(app, { db, records, ecosystemAdminEmails }) {
  app.get('/api/state', async (req, res) => {
    const workspaces = await db
      .prepare(
        "SELECT workspaces.id, workspaces.name, workspaces.context, workspaces.tier, workspaces.member_limit, workspace_members.role, workspace_members.status FROM workspace_members JOIN workspaces ON workspaces.id = workspace_members.workspace_id WHERE workspace_members.user_id = ? AND workspace_members.status = 'active' ORDER BY workspace_members.role = 'owner' DESC, workspaces.name",
      )
      .all(req.user.id);
    const [objectives, actions, reviews, audit] = await Promise.all([
      records(req.workspace.id, 'objective'),
      records(req.workspace.id, 'action'),
      records(req.workspace.id, 'review'),
      db
        .prepare(
          'SELECT id, actor, action, object_id AS "objectId", detail, created_at AS "createdAt" FROM audit WHERE workspace_id = ? ORDER BY created_at DESC, seq DESC LIMIT 200',
        )
        .all(req.workspace.id),
    ]);

    res.json({
      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        demo: Boolean(req.user.demo),
        ecosystemAdmin: ecosystemAdminEmails.includes(req.user.email),
      },
      workspace: req.workspace,
      permissions: permissionsFor(req.workspace.role),
      workspaces,
      objectives,
      actions,
      reviews,
      audit,
    });
  });
}
