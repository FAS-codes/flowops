import { describe, expect, it } from 'vitest';
import { ROLE_PERMISSIONS, roleHasPermission } from '../../src/utils/rbac';

describe('RBAC permission matrix', () => {
  it('grants the owner every permission an admin has', () => {
    for (const perm of ROLE_PERMISSIONS.admin) {
      expect(roleHasPermission('owner', perm)).toBe(true);
    }
  });

  it('lets managers delete leads but not admins-only actions', () => {
    expect(roleHasPermission('manager', 'lead:delete')).toBe(true);
    expect(roleHasPermission('manager', 'member:role:update')).toBe(false);
    expect(roleHasPermission('manager', 'automation:manage')).toBe(false);
  });

  it('restricts employees to contributor actions', () => {
    expect(roleHasPermission('employee', 'lead:create')).toBe(true);
    expect(roleHasPermission('employee', 'lead:delete')).toBe(false);
    expect(roleHasPermission('employee', 'member:invite')).toBe(false);
  });

  it('makes viewers strictly read-only', () => {
    expect(roleHasPermission('viewer', 'lead:read')).toBe(true);
    expect(roleHasPermission('viewer', 'lead:create')).toBe(false);
    expect(roleHasPermission('viewer', 'task:create')).toBe(false);
  });

  it('only owners can delete the organization', () => {
    expect(roleHasPermission('owner', 'org:delete')).toBe(true);
    expect(roleHasPermission('admin', 'org:delete')).toBe(false);
  });
});
