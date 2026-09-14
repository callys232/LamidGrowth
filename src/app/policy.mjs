export const rolePermissions = Object.freeze({
  owner: [
    'workspace:read',
    'work:write',
    'review:decide',
    'workspace:manage',
    'members:manage',
    'workspace:export',
    'billing:manage',
  ],
  member: ['workspace:read', 'work:write'],
  // A concierge is a platform-approved PM assigned to run day-to-day work on a
  // client's behalf. Deliberately excludes members:manage and workspace:export —
  // those stay with the account holder, not the assigned service provider.
  concierge: ['workspace:read', 'work:write', 'review:decide', 'workspace:manage'],
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
