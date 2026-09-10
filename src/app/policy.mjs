export const rolePermissions = Object.freeze({
  owner: [
    'workspace:read',
    'work:write',
    'review:decide',
    'workspace:manage',
    'members:manage',
    'workspace:export',
  ],
  member: ['workspace:read', 'work:write'],
});

export function permissionsFor(role) {
  return rolePermissions[role] || [];
}

export function requirePermission(permission) {
  return (req, res, next) => {
    if (!permissionsFor(req.workspace.role).includes(permission))
      return res.status(403).json({ error: 'Your workspace role does not allow this action.' });
    next();
  };
}
