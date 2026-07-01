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

## Push to GitHub

```bash
cd /Users/fas/Desktop/flowops
gh repo create flowops --private --source=. --remote=origin
git add -A
git commit -m "FlowOps V1"
git push -u origin main
```

## Troubleshooting

| Symptom                              | Cause / fix                                                        |
| ------------------------------------ | ----------------------------------------------------------------- |
| Login works but you're logged out on refresh | `CLIENT_URL` on Render doesn't exactly match the Vercel origin, so the cookie is blocked. |
| CORS error in console                | Same — `CLIENT_URL` must be the exact `https://…` origin, no trailing slash. |
| API 502 for ~30s then works          | Render free tier cold-start after idle. Expected.                 |
| `MongooseServerSelectionError`       | Atlas Network Access is missing `0.0.0.0/0`, or bad `MONGODB_URI`. |
