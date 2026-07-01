/**
 * Workspace roles and the permission matrix. Permissions are checked on the
 * backend (see middleware/rbac.ts) — the frontend only hides UI as a courtesy.
 *
 * Roles are ordered by power; a higher-ranked role inherits nothing implicitly,
 * every capability is listed explicitly so the matrix is auditable.
 */
export const ROLES = ['owner', 'admin', 'manager', 'employee', 'viewer'] as const;
export type Role = (typeof ROLES)[number];

export type Permission =
  // organization
  | 'org:update'
  | 'org:delete'
  | 'member:invite'
  | 'member:remove'
  | 'member:role:update'
  // leads / CRM
  | 'lead:create'
  | 'lead:read'
  | 'lead:update'
  | 'lead:delete'
  // projects
  | 'project:create'
  | 'project:read'
  | 'project:update'
  | 'project:delete'
  // tasks
  | 'task:create'
  | 'task:read'
  | 'task:update'
  | 'task:delete'
  // dashboard / audit
  | 'dashboard:read'
  | 'audit:read';

const ALL_READ: Permission[] = [
  'lead:read',
  'project:read',
  'task:read',
  'dashboard:read',
];

const CONTRIBUTOR: Permission[] = [
  ...ALL_READ,
  'lead:create',
  'lead:update',
  'project:create',
  'project:update',
  'task:create',
  'task:update',
];

const MANAGER: Permission[] = [
  ...CONTRIBUTOR,
  'lead:delete',
  'project:delete',
  'task:delete',
  'member:invite',
  'audit:read',
];

const ADMIN: Permission[] = [
  ...MANAGER,
  'org:update',
  'member:remove',
  'member:role:update',
];

const OWNER: Permission[] = [...ADMIN, 'org:delete'];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  viewer: ALL_READ,
  employee: CONTRIBUTOR,
  manager: MANAGER,
  admin: ADMIN,
  owner: OWNER,
};

export function roleHasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
