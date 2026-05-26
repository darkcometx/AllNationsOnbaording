/* ====================================================
   ALL NATIONS CHURCH — NOTION ONBOARDING
   worker.js — Cloudflare Worker

   Auth:     Clerk (JWT verification via Web Crypto — no npm needed)
   Storage:  Cloudflare D1  (progress only)
   Identity: Clerk dashboard (users, passwords, invites, sessions)

   Required secrets (set with `npx wrangler secret put <NAME>`):
     CLERK_SECRET_KEY  — from Clerk dashboard → API Keys
     ADMIN_USER_ID     — your Clerk user ID (find it in Clerk dashboard → Users)

   Optional secrets:
     CLERK_ISSUER      — your Clerk Frontend API URL (e.g. https://xxx.clerk.accounts.dev)
                         if set, tokens from other Clerk apps are rejected
   ==================================================== */

// ── Progress item IDs (must match CHECKLIST in auth.js) ──
const PROGRESS_PATHS = {
  essentials: ['building_basics', 'sharing_collaboration', 'essentials_quiz'],
  workflows:  ['connecting_knowledge', 'issue_tracker', 'project_management', 'workflows_quiz'],
  advanced:   ['workspace_design', 'database_organisation', 'formulas', 'webhook_integrations', 'advanced_quiz'],
};

// ── CORS ──────────────────────────────────────────────
const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

// ── JWT verification (Web Crypto — zero dependencies) ─
// Clerk tokens are RS256 JWTs. We fetch the signing keys
// from Clerk's JWKS endpoint and verify with crypto.subtle.
// Keys are cached per isolate to avoid a network call on
// every request.

let _jwksCache = null;
let _jwksCacheAt = 0;

function _b64urlDecode(s) {
  const padded = s.replace(/-/g, '+').replace(/_/g, '/').padEnd(
    s.length + (4 - (s.length % 4)) % 4, '='
  );
  return Uint8Array.from(atob(padded), c => c.charCodeAt(0));
}

async function _getJwks(issuer) {
  if (_jwksCache && Date.now() - _jwksCacheAt < 3_600_000) return _jwksCache;
  const res = await fetch(`${issuer}/.well-known/jwks.json`);
  if (!res.ok) throw new Error(`JWKS fetch failed: ${res.status}`);
  _jwksCache = await res.json();
  _jwksCacheAt = Date.now();
  return _jwksCache;
}

async function verifyClerkToken(token, expectedIssuer) {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Malformed JWT');

  const header  = JSON.parse(new TextDecoder().decode(_b64urlDecode(parts[0])));
  const payload = JSON.parse(new TextDecoder().decode(_b64urlDecode(parts[1])));

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now)        throw new Error('Token expired');
  if (payload.nbf && payload.nbf > now + 5)    throw new Error('Token not yet valid');
  if (!payload.iss)                             throw new Error('Missing issuer');
  if (expectedIssuer && payload.iss !== expectedIssuer)
    throw new Error('Issuer mismatch');

  const jwks = await _getJwks(payload.iss);
  const jwk  = jwks.keys?.find(k => k.kid === header.kid);
  if (!jwk) throw new Error('Signing key not found');

  const key = await crypto.subtle.importKey(
    'jwk', jwk,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false, ['verify']
  );

  const signingInput = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
  const signature    = _b64urlDecode(parts[2]);
  const valid        = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, signature, signingInput);
  if (!valid) throw new Error('Signature invalid');

  return payload;
}

// ── Auth helpers ──────────────────────────────────────

async function getAuthUserId(request, env) {
  const auth = (request.headers.get('Authorization') || '').trim();
  if (!auth.startsWith('Bearer ')) return null;
  try {
    const payload = await verifyClerkToken(auth.slice(7), env.CLERK_ISSUER || null);
    return payload.sub || null;
  } catch {
    return null;
  }
}

// Returns [userId, null] on success, [null, Response] on failure.
async function requireAuth(request, env) {
  const userId = await getAuthUserId(request, env);
  if (!userId) return [null, json({ ok: false, error: 'Unauthorized' }, 401)];
  return [userId, null];
}

function isAdmin(userId, env) {
  return !!(env.ADMIN_USER_ID && userId === env.ADMIN_USER_ID);
}

// ── Progress helper ───────────────────────────────────

function buildEmptyProgress() {
  const p = {};
  for (const [path, ids] of Object.entries(PROGRESS_PATHS)) {
    p[path] = {};
    for (const id of ids) p[path][id] = false;
  }
  return p;
}

// ─────────────────────────────────────────────────────
// Route handlers
// ─────────────────────────────────────────────────────

// GET /api/progress
async function handleGetProgress(request, env) {
  const [userId, errResp] = await requireAuth(request, env);
  if (errResp) return errResp;

  const { results } = await env.DB.prepare(
    'SELECT path, item_id, completed FROM user_progress WHERE user_id = ?'
  ).bind(userId).all();

  const progress = buildEmptyProgress();
  for (const row of results) {
    if (progress[row.path]?.[row.item_id] !== undefined) {
      progress[row.path][row.item_id] = row.completed === 1;
    }
  }

  return json({ ok: true, progress });
}

// POST /api/progress  { progress: { essentials: { building_basics: true, ... }, ... } }
async function handleSaveProgress(request, env) {
  const [userId, errResp] = await requireAuth(request, env);
  if (errResp) return errResp;

  let body;
  try { body = await request.json(); } catch { return json({ ok: false, error: 'Invalid JSON' }, 400); }

  const { progress } = body;
  if (!progress || typeof progress !== 'object') return json({ ok: false, error: 'Missing progress' }, 400);

  const stmts = [];
  for (const [path, items] of Object.entries(progress)) {
    if (!PROGRESS_PATHS[path]) continue;
    for (const [itemId, completed] of Object.entries(items)) {
      if (!PROGRESS_PATHS[path].includes(itemId)) continue;
      stmts.push(
        env.DB.prepare(
          `INSERT INTO user_progress (user_id, path, item_id, completed, updated_at)
           VALUES (?, ?, ?, ?, datetime('now'))
           ON CONFLICT(user_id, path, item_id)
           DO UPDATE SET completed = excluded.completed,
                         updated_at = excluded.updated_at`
        ).bind(userId, path, itemId, completed ? 1 : 0)
      );
    }
  }

  if (stmts.length > 0) await env.DB.batch(stmts);
  return json({ ok: true });
}

// GET /api/admin/users
// Returns progress summary for every user who has any D1 data.
// The authenticated user must match ADMIN_USER_ID.
async function handleAdminUsers(request, env) {
  const [userId, errResp] = await requireAuth(request, env);
  if (errResp) return errResp;
  if (!isAdmin(userId, env)) return json({ ok: false, error: 'Forbidden' }, 403);

  const { results } = await env.DB.prepare(
    `SELECT user_id,
            SUM(completed) AS done,
            COUNT(*)       AS total
     FROM user_progress
     GROUP BY user_id`
  ).all();

  const users = results.map(row => ({
    userId: row.user_id,
    done:   row.done,
    total:  row.total,
    pct:    row.total ? Math.round((row.done / row.total) * 100) : 0,
  }));

  return json({ ok: true, users });
}

// ── Main export ───────────────────────────────────────
export default {
  async fetch(request, env) {
    const url    = new URL(request.url);
    const method = request.method;

    if (method === 'OPTIONS') return new Response(null, { headers: CORS });

    if (url.pathname.startsWith('/api/')) {
      if (!env.DB) return json({ ok: false, error: 'D1 binding DB is not configured.' }, 500);

      const p = url.pathname;
      if (p === '/api/progress'    && method === 'GET')  return handleGetProgress(request, env);
      if (p === '/api/progress'    && method === 'POST') return handleSaveProgress(request, env);
      if (p === '/api/admin/users' && method === 'GET')  return handleAdminUsers(request, env);

      return json({ ok: false, error: 'Not found' }, 404);
    }

    return env.ASSETS.fetch(request);
  },
};
