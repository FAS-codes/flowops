# Deploying FlowOps

Architecture in production:

```
Browser ──▶ Vercel (React SPA)  ──HTTPS──▶  Render (Express API)  ──▶  MongoDB Atlas
```

The three platforms all have free tiers. You'll do this once; afterwards every
`git push` auto-deploys both halves.

> You need to run these steps yourself — they create resources under **your**
> accounts (billing, secrets, DNS). Everything in the repo is already configured
> for them.

---

## 1. Database — MongoDB Atlas

1. Create a free account at <https://www.mongodb.com/atlas> and create an **M0
   (free) cluster**.
2. **Database Access** → add a database user (username + password).
3. **Network Access** → add IP `0.0.0.0/0` (allow from anywhere — Render's IPs are
   dynamic on the free tier).
4. **Connect → Drivers** → copy the connection string. It looks like:
   ```
   mongodb+srv://USER:PASSWORD@cluster0.xxxx.mongodb.net/flowops?retryWrites=true&w=majority
   ```
   Add `/flowops` before the `?` so data lands in the `flowops` database.

## 2. Backend — Render

1. Push this repo to GitHub (see bottom of this file).
2. Go to <https://render.com> → **New → Blueprint** → pick your repo. Render reads
   [`render.yaml`](render.yaml) and creates the `flowops-api` service.
3. When prompted, fill the secrets marked `sync: false`:
   - `MONGODB_URI` → the Atlas string from step 1.
   - `CLIENT_URL` → leave a placeholder for now (e.g. `https://example.com`); you'll
     update it after Vercel gives you a URL. Multiple origins can be
     comma-separated.
   - `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` → Render auto-generates these.
4. Deploy. When it's live, note the URL, e.g. `https://flowops-api.onrender.com`.
   Verify: opening `https://flowops-api.onrender.com/api/health` returns
   `{"status":"ok"}`.
5. **Seed the demo data (optional):** in Render → the service → **Shell**, run
   `npm run seed`.

## 3. Frontend — Vercel

1. Go to <https://vercel.com> → **Add New → Project** → import the repo.
2. Set **Root Directory** to `frontend`. Vercel detects Vite and uses
   [`vercel.json`](frontend/vercel.json).
3. Add an **Environment Variable**:
   - `VITE_API_URL` = `https://flowops-api.onrender.com/api` (your Render URL + `/api`)
4. Deploy. Vercel gives you a URL like `https://flowops.vercel.app`.

## 4. Close the loop (CORS + cookies)

1. Back in **Render** → `flowops-api` → Environment → set
   `CLIENT_URL` = `https://flowops.vercel.app` (your Vercel URL). Save → it
   redeploys.
2. Done. The cross-site refresh cookie already switches to `SameSite=None; Secure`
   automatically in production (`NODE_ENV=production`).

## Optional — enable Google sign-in & email later

The app is fully functional without these; enable them any time by adding env
vars on Render (no code changes, just a redeploy):

- **Google OAuth:** create an OAuth client at
  <https://console.cloud.google.com/apis/credentials>, then on Render set
  `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and
  `GOOGLE_CALLBACK_URL=https://flowops-api.onrender.com/api/auth/google/callback`
  (add that same URL as an Authorized redirect URI in Google). The "Continue with
  Google" button appears automatically once configured.
- **Email:** set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`
  (Resend, Mailgun, SendGrid, or a Gmail app password). Until then, invitation
  links still work — they're shown in the UI and logged server-side.

> **Heads-up about uploaded files:** Render's free tier has an *ephemeral* disk,
> so files uploaded via the Attachments panel are wiped on each redeploy/restart.
> That's fine for a demo. For permanent storage, swap the storage backend in
> `backend/src/controllers/file.controller.ts` for S3 or Cloudinary (the code is
> structured for it).

## GitHub

The repo already lives at <https://github.com/FAS-codes/flowops> (private).
Render/Vercel import straight from it; future changes deploy on `git push`:

```bash
cd /Users/fas/Desktop/flowops
git add -A && git commit -m "your change" && git push
```

> Render and Vercel need access to the repo. Since it's **private**, you'll grant
> each platform access to `FAS-codes/flowops` during import (or make the repo
> public first — good for showing recruiters anyway).

## Troubleshooting

| Symptom                              | Cause / fix                                                        |
| ------------------------------------ | ----------------------------------------------------------------- |
| Login works but you're logged out on refresh | `CLIENT_URL` on Render doesn't exactly match the Vercel origin, so the cookie is blocked. |
| CORS error in console                | Same — `CLIENT_URL` must be the exact `https://…` origin, no trailing slash. |
| API 502 for ~30s then works          | Render free tier cold-start after idle. Expected.                 |
| `MongooseServerSelectionError`       | Atlas Network Access is missing `0.0.0.0/0`, or bad `MONGODB_URI`. |
