import request from 'supertest';
import type { Express } from 'express';

export interface AuthedUser {
  token: string;
  orgId: string;
  userId: string;
  email: string;
}

let counter = 0;

/** Registers a fresh user (which bootstraps their own org) and returns creds. */
export async function registerUser(
  app: Express,
  overrides: Partial<{ name: string; email: string; password: string; organizationName: string }> = {}
): Promise<AuthedUser> {
  counter += 1;
  const email = overrides.email ?? `user${counter}@test.dev`;
  const password = overrides.password ?? 'Password123';
  const res = await request(app).post('/api/auth/register').send({
    name: overrides.name ?? `User ${counter}`,
    email,
    password,
    organizationName: overrides.organizationName ?? `Org ${counter}`,
  });
  if (res.status !== 201) {
    throw new Error(`register failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return {
    token: res.body.accessToken,
    orgId: res.body.organization.id,
    userId: res.body.user.id,
    email,
  };
}

/** Authorized request builder: attaches the bearer token and org header. */
export function asUser(app: Express, user: AuthedUser, orgId = user.orgId) {
  return (method: 'get' | 'post' | 'patch' | 'delete', path: string) =>
    request(app)[method](path)
      .set('Authorization', `Bearer ${user.token}`)
      .set('X-Organization-Id', orgId);
}

/** Poll until `fn` returns truthy or the timeout elapses (for async side effects). */
export async function waitFor<T>(fn: () => Promise<T>, timeoutMs = 3000): Promise<T> {
  const start = Date.now();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const result = await fn();
    if (result) return result;
    if (Date.now() - start > timeoutMs) return result;
    await new Promise((r) => setTimeout(r, 50));
  }
}
