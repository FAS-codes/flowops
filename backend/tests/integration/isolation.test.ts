import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app';
import { OrganizationMember } from '../../src/models/OrganizationMember';
import { asUser, registerUser } from '../helpers/api';
import { clearTestDb, closeTestDb, connectTestDb } from '../helpers/db';

const app = createApp();

beforeAll(connectTestDb);
afterEach(clearTestDb);
afterAll(closeTestDb);

describe('multi-tenant isolation', () => {
  it("prevents a user from reading another organization's data", async () => {
    const alice = await registerUser(app, { email: 'alice@test.dev' });
    const bob = await registerUser(app, { email: 'bob@test.dev' });

    // Alice creates a lead in her org.
    const created = await asUser(app, alice)('post', '/api/leads').send({
      title: 'Alice secret deal',
      dealValue: 1000,
    });
    expect(created.status).toBe(201);

    // Alice can see it in her own org.
    const mine = await asUser(app, alice)('get', '/api/leads');
    expect(mine.body.items).toHaveLength(1);

    // Bob, using Alice's org id, is treated as a non-member → 404.
    const cross = await asUser(app, bob, alice.orgId)('get', '/api/leads');
    expect(cross.status).toBe(404);

    // Bob's own org is empty — no leakage.
    const bobs = await asUser(app, bob)('get', '/api/leads');
    expect(bobs.status).toBe(200);
    expect(bobs.body.items).toHaveLength(0);
  });

  it('rejects requests missing the organization header', async () => {
    const alice = await registerUser(app, { email: 'alice2@test.dev' });
    const res = await request(app)
      .get('/api/leads')
      .set('Authorization', `Bearer ${alice.token}`);
    expect(res.status).toBe(400);
  });
});

describe('RBAC enforcement on the backend', () => {
  it('forbids a viewer from creating a lead', async () => {
    const owner = await registerUser(app, { email: 'owner@test.dev' });
    const viewer = await registerUser(app, { email: 'viewer@test.dev' });

    // Add the viewer to the owner's org with the viewer role.
    await OrganizationMember.create({
      organization: owner.orgId,
      user: viewer.userId,
      role: 'viewer',
    });

    // Viewer can read...
    const read = await asUser(app, viewer, owner.orgId)('get', '/api/leads');
    expect(read.status).toBe(200);

    // ...but cannot create.
    const write = await asUser(app, viewer, owner.orgId)('post', '/api/leads').send({
      title: 'should be blocked',
    });
    expect(write.status).toBe(403);
  });
});
