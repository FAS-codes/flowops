import { Role } from './types';

/**
 * Mirror of the backend permission matrix, used only to hide/disable UI. The
 * backend remains the real enforcement boundary — never trust this alone.
 */
export type Permission =
  | 'member:invite'
  | 'member:manage'
  | 'lead:create'
  | 'lead:delete'
  | 'project:create'
  | 'project:delete'
  | 'task:create'
  | 'task:delete'
  | 'audit:read'
  | 'automation:read'
  | 'automation:manage';

const MATRIX: Record<Role, Permission[]> = {
  viewer: [],
  employee: ['lead:create', 'project:create', 'task:create'],
  manager: [
    'lead:create',
    'lead:delete',
    'project:create',
    'project:delete',
    'task:create',
    'task:delete',
    'member:invite',
    'audit:read',
    'automation:read',
  ],
  admin: [
    'lead:create',
    'lead:delete',
    'project:create',
    'project:delete',
    'task:create',
    'task:delete',
    'member:invite',
    'member:manage',
    'audit:read',
    'automation:read',
    'automation:manage',
  ],
  owner: [
    'lead:create',
    'lead:delete',
    'project:create',
    'project:delete',
    'task:create',
    'task:delete',
    'member:invite',
    'member:manage',
    'audit:read',
    'automation:read',
    'automation:manage',
  ],
};

export function can(role: Role | undefined, permission: Permission): boolean {
  if (!role) return false;
  return MATRIX[role].includes(permission);
}
