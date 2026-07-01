# FlowOps — Multi-Tenant CRM & Workflow Platform

A production-shaped SaaS where multiple companies run isolated workspaces to manage
their sales pipeline, projects, tasks and team — with real multi-tenancy, JWT
access/refresh auth, and role-based access control enforced on the server.

> **Stack:** React + TypeScript + Tailwind + React Query + @dnd-kit · Node + Express +
> TypeScript + MongoDB/Mongoose · Zod validation · JWT with refresh-token rotation.

---

## Why this project is architecturally interesting

- **Multi-tenancy** — every business record carries an `organization` id. The
  `requireTenant` middleware ([backend/src/middleware/tenant.ts](backend/src/middleware/tenant.ts))
  never trusts the client's org header: it loads an `OrganizationMember` row proving
  the user belongs to that org and derives the role from it. No membership → 404.
- **RBAC** — a permission matrix ([backend/src/utils/rbac.ts](backend/src/utils/rbac.ts))
  maps roles (owner/admin/manager/employee/viewer) to permissions, enforced by
  `requirePermission` on every mutating route. The frontend mirror only hides UI.
- **Auth** — short-lived access tokens (in-memory on the client) + httpOnly refresh
  cookie with **rotation and reuse detection**
  ([backend/src/controllers/auth.controller.ts](backend/src/controllers/auth.controller.ts)).
- **Indexes** — every hot query path is backed by a compound index (see each model).

## Project layout

```
backend/    Express + Mongoose API (auth, orgs, CRM, projects, tasks, dashboard)
frontend/   Vite + React SPA (auth, dashboard, Kanban CRM, project/task boards, team)
```

## Running locally

You need **Node 18+** and **MongoDB** running on `mongodb://127.0.0.1:27017`.

### 1. Backend

```bash
cd backend
cp .env.example .env      # adjust secrets for production
npm install
npm run seed              # loads a demo org + users + sample data
npm run dev               # http://localhost:4000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev               # http://localhost:5173 (proxies /api to :4000)
```

### Demo login

| Role     | Email               | Password      |
| -------- | ------------------- | ------------- |
| Owner    | owner@acme.test     | `Password123` |
| Manager  | manager@acme.test   | `Password123` |
| Employee | employee@acme.test  | `Password123` |

## What's built (V1)

- ✅ Register (bootstraps user + org + owner membership), login, refresh, logout
- ✅ Multi-org membership with an org switcher and per-org roles
- ✅ CRM pipeline — Kanban board with drag-and-drop across stages
- ✅ Projects with progress tracking + task board (drag across statuses)
- ✅ Team management — invitations, role changes, member removal
- ✅ Business dashboard — pipeline value, conversion, workload, activity feed
- ✅ Production hygiene — Helmet, CORS, rate limiting, Zod validation, central errors

## Roadmap (from the original spec)

- **V2:** real-time (Socket.IO), Google OAuth, email invitations, file uploads, audit log UI
- **V3:** workflow automation builder, BullMQ/Redis jobs, subscriptions, tests, Docker, CI/CD
