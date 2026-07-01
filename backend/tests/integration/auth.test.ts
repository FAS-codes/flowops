import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app';
import { clearTestDb, closeTestDb, connectTestDb } from '../helpers/db';

const app = createApp();

beforeAll(connectTestDb);
afterEach(clearTestDb);
afterAll(closeTestDb);

describe('auth flow', () => {
  const creds = {
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    password: 'Password123',
    organizationName: 'Analytical Engines',
  };

  it('registers a user, bootstraps their org, and returns an access token', async () => {
    const res = await request(app).post('/api/auth/register').send(creds);
    expect(res.status).toBe(201);
    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.organization.name).toBe('Analytical Engines');
    // Refresh token is set as an httpOnly cookie.
    expect(res.headers['set-cookie']?.[0]).toMatch(/flowops_refresh/);
  });

  it('rejects duplicate email registration', async () => {
    await request(app).post('/api/auth/register').send(creds);
    const res = await request(app).post('/api/auth/register').send(creds);
    expect(res.status).toBe(409);
  });

  it('logs in with correct credentials and rejects wrong ones', async () => {
    await request(app).post('/api/auth/register').send(creds);

    const ok = await request(app)
      .post('/api/auth/login')
      .send({ email: creds.email, password: creds.password });
    expect(ok.status).toBe(200);
    expect(ok.body.accessToken).toBeTruthy();

    const bad = await request(app)
      .post('/api/auth/login')
      .send({ email: creds.email, password: 'wrong' });
    expect(bad.status).toBe(401);
  });

  it('returns the current user and their org membership from /me', async () => {
    const reg = await request(app).post('/api/auth/register').send(creds);
    const me = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${reg.body.accessToken}`);
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe(creds.email);
    expect(me.body.organizations).toHaveLength(1);
    expect(me.body.organizations[0].role).toBe('owner');
  });

  it('blocks access without a token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});
