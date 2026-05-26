# All Nations Church — Notion Onboarding

A slide-deck onboarding experience for the All Nations Church Notion rollout. Staff sign in, work through the Notion Academy checklist, and track their progress. Deployed on Cloudflare Workers.

---

## Prerequisites

- [Cloudflare account](https://cloudflare.com) with Workers & D1 access
- [Clerk account](https://clerk.com) with a project set up
- Node.js installed (for running `npx wrangler`)

---

## Environment variables

| Variable | Where it lives | How to set it |
|---|---|---|
| `CLERK_PUBLISHABLE_KEY` | `auth.js` line 16 | Paste directly — it's public-facing |
| `CLERK_SECRET_KEY` | Cloudflare secret | `npx wrangler secret put CLERK_SECRET_KEY` |
| `ADMIN_USER_ID` | Cloudflare secret | `npx wrangler secret put ADMIN_USER_ID` |
| `CLERK_ISSUER` | Cloudflare secret (optional) | `npx wrangler secret put CLERK_ISSUER` — hardens JWT verification to your Clerk app only |

Get `CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` from your Clerk dashboard → API Keys.  
Get `ADMIN_USER_ID` from Clerk dashboard → Users → click your account — it starts with `user_`.

---

## First-time setup

**1. Create the D1 database**
```
npx wrangler d1 create allnations-onboarding
```
Paste the `database_id` from the output into `wrangler.jsonc`.

**2. Apply the schema**
```
npx wrangler d1 execute allnations-onboarding --file=schema.sql --remote
```

**3. Set secrets in Cloudflare**
```
npx wrangler secret put CLERK_SECRET_KEY
npx wrangler secret put ADMIN_USER_ID
```

**4. Paste the publishable key**  
Open `auth.js` and replace the `CLERK_PUBLISHABLE_KEY` value on line 16.

**5. Set your admin role in Clerk**  
Clerk dashboard → Users → your account → Metadata → Public metadata:
```json
{ "role": "admin" }
```

---

## Running locally

Create a `.dev.vars` file in the project root (this is gitignored):
```
CLERK_SECRET_KEY=sk_test_your_key_here
ADMIN_USER_ID=user_your_id_here
```

Apply the schema to the local D1 database:
```
npx wrangler d1 execute allnations-onboarding --file=schema.sql --local
```

Start the dev server:
```
npx wrangler dev
```

The site runs at `http://localhost:8787`.

---

## Deploying

```
npx wrangler deploy
```

Cloudflare is also connected to the GitHub repo (`darkcometx/AllNationsOnboarding`) and deploys automatically on push to `main`.

---

## Project structure

```
├── index.html          Slide deck (no auth — standalone)
├── login.html          Sign-in page (Clerk SignIn component)
├── dashboard.html      User checklist + progress tracker
├── admin.html          Admin progress overview
├── auth.js             CHECKLIST content + API wrappers (no sensitive data)
├── worker.js           Cloudflare Worker — JWT verification + D1 API routes
├── schema.sql          D1 table definition (run once at setup)
├── wrangler.jsonc      Cloudflare Workers config
├── styles.css          Slide deck styles
├── script.js           Slide deck navigation
└── .env.example        Required env var reference (no real values)
```

### API routes (worker.js)

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/progress` | User session | Fetch the signed-in user's progress |
| `POST` | `/api/progress` | User session | Save the signed-in user's progress |
| `GET` | `/api/admin/users` | Admin only | Progress summary for all users in D1 |

Everything else is served as a static asset.
