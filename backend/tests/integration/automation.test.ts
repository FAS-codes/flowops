import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app';
import { asUser, registerUser, waitFor } from '../helpers/api';
import { clearTestDb, closeTestDb, connectTestDb } from '../helpers/db';

const app = createApp();

beforeAll(connectTestDb);
afterEach(clearTestDb);
afterAll(closeTestDb);

describe('workflow automation engine (end to end)', () => {
  it('creates a task when a deal is won', async () => {
    const owner = await registerUser(app, { email: 'sales@test.dev' });
    const req = asUser(app, owner);

    // A project to receive the auto-created task.
    const project = await req('post', '/api/projects').send({ name: 'Onboarding' });
    expect(project.status).toBe(201);

    // Rule: when a deal is won, create a "Kickoff {{company}}" task.
    const automation = await req('post', '/api/automations').send({
      name: 'Kickoff won deals',
      trigger: { event: 'deal.won' },
      conditions: [],
      actions: [
        {
          type: 'create_task',
          projectId: project.body._id,
          title: 'Kickoff {{company}}',
          priority: 'high',
        },
      ],
    });
    expect(automation.status).toBe(201);

    // Create a lead and move it to "Won".
    const lead = await req('post', '/api/leads').send({
      title: 'Acme deal',
      company: 'Acme',
      stage: 'Negotiation',
      dealValue: 5000,
    });
    expect(lead.status).toBe(201);

    const moved = await req('patch', `/api/leads/${lead.body._id}/move`).send({
      stage: 'Won',
      order: 0,
    });
    expect(moved.status).toBe(200);

    // The automation runs asynchronously — poll for the resulting task.
    const tasks = await waitFor(async () => {
      const res = await req('get', '/api/tasks').query({ project: project.body._id });
      return res.body.length > 0 ? res.body : null;
    });

    expect(tasks).toBeTruthy();
    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toBe('Kickoff Acme');
    expect(tasks[0].priority).toBe('high');
  });

  it('respects conditions — a rule with an unmet condition does not fire', async () => {
    const owner = await registerUser(app, { email: 'sales2@test.dev' });
    const req = asUser(app, owner);
    const project = await req('post', '/api/projects').send({ name: 'Big deals' });

    // Only fire for deals worth 10k+.
    await req('post', '/api/automations').send({
      name: 'Big wins only',
      trigger: { event: 'deal.won' },
      conditions: [{ field: 'dealValue', operator: 'gte', value: '10000' }],
      actions: [{ type: 'create_task', projectId: project.body._id, title: 'Big kickoff' }],
    });

    // A small deal that should NOT trigger the rule.
    const lead = await req('post', '/api/leads').send({
      title: 'Small deal',
      stage: 'Negotiation',
      dealValue: 500,
    });
    await req('patch', `/api/leads/${lead.body._id}/move`).send({ stage: 'Won', order: 0 });

    // Give any async work a moment, then assert no task was created.
    await new Promise((r) => setTimeout(r, 300));
    const tasks = await req('get', '/api/tasks').query({ project: project.body._id });
    expect(tasks.body).toHaveLength(0);
  });
});
