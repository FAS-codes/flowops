/**
 * Seeds a demo organization with members, leads, projects and tasks so the UI
 * has something realistic to render on first run.
 *
 *   npm run seed
 *
 * Login afterwards with  owner@acme.test / Password123
 */
import { connectDb, disconnectDb } from '../config/db';
import { Activity } from '../models/Activity';
import { Lead } from '../models/Lead';
import { Organization, DEFAULT_PIPELINE_STAGES } from '../models/Organization';
import { OrganizationMember } from '../models/OrganizationMember';
import { Project } from '../models/Project';
import { Task } from '../models/Task';
import { User, hashPassword } from '../models/User';

async function seed() {
  await connectDb();
  console.log('[seed] clearing existing data…');
  await Promise.all([
    User.deleteMany({}),
    Organization.deleteMany({}),
    OrganizationMember.deleteMany({}),
    Lead.deleteMany({}),
    Project.deleteMany({}),
    Task.deleteMany({}),
    Activity.deleteMany({}),
  ]);

  const passwordHash = await hashPassword('Password123');
  const [owner, manager, employee] = await User.create([
    { name: 'Ava Owner', email: 'owner@acme.test', passwordHash },
    { name: 'Marco Manager', email: 'manager@acme.test', passwordHash },
    { name: 'Ella Employee', email: 'employee@acme.test', passwordHash },
  ]);

  const org = await Organization.create({
    name: 'Acme Inc.',
    slug: 'acme',
    createdBy: owner._id,
    pipelineStages: DEFAULT_PIPELINE_STAGES,
  });
  owner.defaultOrganization = org._id;
  await owner.save();
  manager.defaultOrganization = org._id;
  await manager.save();
  employee.defaultOrganization = org._id;
  await employee.save();

  await OrganizationMember.create([
    { organization: org._id, user: owner._id, role: 'owner' },
    { organization: org._id, user: manager._id, role: 'manager' },
    { organization: org._id, user: employee._id, role: 'employee' },
  ]);

  const stageSamples: Array<[string, string, number]> = [
    ['Northwind Traders', 'New lead', 12000],
    ['Globex Corp', 'Contacted', 45000],
    ['Initech', 'Qualified', 30000],
    ['Umbrella Co', 'Proposal sent', 88000],
    ['Stark Industries', 'Negotiation', 150000],
    ['Wayne Enterprises', 'Won', 220000],
    ['Hooli', 'Lost', 18000],
  ];
  await Lead.create(
    stageSamples.map(([company, stage, value], i) => ({
      organization: org._id,
      title: `${company} — annual contract`,
      contactName: 'Jane Doe',
      contactEmail: 'jane@example.com',
      company,
      dealValue: value,
      stage,
      order: i,
      assignedTo: i % 2 === 0 ? manager._id : employee._id,
      createdBy: owner._id,
    }))
  );

  const project = await Project.create({
    organization: org._id,
    name: 'Website Redesign',
    description: 'Rebuild the marketing site and CRM onboarding flow.',
    status: 'active',
    members: [owner._id, manager._id, employee._id],
    dueDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
    createdBy: owner._id,
  });

  const taskSamples: Array<[string, string, string]> = [
    ['Audit current information architecture', 'done', 'medium'],
    ['Design new dashboard layout', 'in_progress', 'high'],
    ['Implement Kanban drag-and-drop', 'in_progress', 'high'],
    ['Write onboarding copy', 'todo', 'low'],
    ['QA cross-browser pass', 'review', 'urgent'],
  ];
  await Task.create(
    taskSamples.map(([title, status, priority], i) => ({
      organization: org._id,
      project: project._id,
      title,
      status,
      priority,
      order: i,
      assignedTo: [owner._id, manager._id, employee._id][i % 3],
      dueDate: new Date(Date.now() + (i - 1) * 24 * 60 * 60 * 1000),
      createdBy: owner._id,
    }))
  );

  await Activity.create([
    {
      organization: org._id,
      actor: owner._id,
      action: 'org.created',
      entityType: 'Organization',
      entityId: org._id,
      summary: 'Created the Acme Inc. workspace',
    },
    {
      organization: org._id,
      actor: manager._id,
      action: 'lead.stage_changed',
      entityType: 'Lead',
      summary: 'Moved "Wayne Enterprises" to Won',
    },
  ]);

  console.log('[seed] done. Login with owner@acme.test / Password123');
  await disconnectDb();
}

seed().catch((err) => {
  console.error('[seed] failed', err);
  process.exit(1);
});
