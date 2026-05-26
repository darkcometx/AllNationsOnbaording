/* ====================================================
   ALL NATIONS CHURCH — NOTION ONBOARDING
   auth.js — Course content + API wrapper

   Paste your Clerk publishable key below (one place).
   All auth (login, signup, sessions, passwords) is
   handled by Clerk — nothing sensitive lives here.

   localStorage is used only for non-sensitive UI state:
   the progress cache, keyed by Clerk user ID.
   ==================================================== */

// ── Clerk publishable key ─────────────────────────────
// Get from: https://dashboard.clerk.com → API Keys
// This key is public-facing — it's safe to be in frontend code.
const CLERK_PUBLISHABLE_KEY = 'pk_live_Y2xlcmsubm90aW9ub25ib2FyZGluZy5jYyQ';

// ── Help contact ──────────────────────────────────────
const HELP_EMAIL = 'endo.moyo@gmail.com';

// ── Notion Academy Checklist ─────────────────────────
// Course content only — no user data lives here.
const CHECKLIST = {
  essentials: {
    label: 'Essentials Path',
    badge: 'Beginner',
    color: '#2D9CDB',
    url: 'https://academy.notion.com/page/essentials-catalogue',
    items: [
      { id: 'building_basics',       label: 'Building basics',           desc: 'Navigate, create with blocks, build custom databases, and manage knowledge with Wikis.',  mins: 20,   url: 'https://academy.notion.com/building-basics' },
      { id: 'sharing_collaboration', label: 'Sharing & collaboration',   desc: 'Share, collaborate, and brainstorm with your team members — in person and remotely.',    mins: 15,   url: 'https://academy.notion.com/collaborating-in-notion' },
      { id: 'essentials_quiz',       label: 'Essentials Badge Quiz',     desc: 'Take the quiz and earn your Essentials badge.',                                           mins: null, url: 'https://academy.notion.com/notion-essentials-quiz', isBadge: true },
    ]
  },
  workflows: {
    label: 'Workflows Path',
    badge: 'Intermediate',
    color: '#27AE60',
    url: 'https://academy.notion.com/page/workflows-catalogue',
    items: [
      { id: 'connecting_knowledge', label: 'Connecting knowledge in Notion', desc: 'Build systems that are consistent, connected, and reliable.',                        mins: 20,   url: 'https://academy.notion.com/connecting-knowledge-in-notion' },
      { id: 'issue_tracker',        label: 'An issue tracker for any team',  desc: 'Build an intake system using forms, charts, and automations.',                       mins: 15,   url: 'https://academy.notion.com/an-issue-tracker-for-any-team' },
      { id: 'project_management',   label: 'Project management',             desc: 'Set up projects & task databases with just the right structure.',                    mins: 15,   url: 'https://academy.notion.com/projects-tasks' },
      { id: 'workflows_quiz',       label: 'Workflows Badge Quiz',           desc: 'Take the quiz and earn your Workflows badge.',                                       mins: null, url: 'https://academy.notion.com/notion-workflows-quiz', isBadge: true },
    ]
  },
  advanced: {
    label: 'Advanced Path',
    badge: 'Advanced',
    color: '#9B51E0',
    url: 'https://academy.notion.com/page/advanced-catalogue',
    items: [
      { id: 'workspace_design',      label: 'Workspace design',                desc: 'Best practices for designing your workspace — blocks, layouts, and structure.',    mins: 10,   url: 'https://academy.notion.com/desigining-your-workspace' },
      { id: 'database_organisation', label: 'Database organisation strategies', desc: 'Choose the right structure, model data effectively, and connect across teams.',   mins: 20,   url: 'https://academy.notion.com/database-organization-strategies' },
      { id: 'formulas',              label: 'Formulas',                        desc: 'Automate everyday workflows and create dynamic databases with Notion AI.',          mins: 20,   url: 'https://academy.notion.com/formulas-course' },
      { id: 'webhook_integrations',  label: 'Webhook actions & integrations',  desc: 'Extend your databases and automate work across all the tools you use.',            mins: 20,   url: 'https://academy.notion.com/webhook-actions-integrations' },
      { id: 'advanced_quiz',         label: 'Advanced Badge Quiz',             desc: 'Take the quiz and earn your Advanced badge.',                                      mins: null, url: 'https://academy.notion.com/notion-advanced-quiz', isBadge: true },
    ]
  }
};

// ── Progress cache ────────────────────────────────────
// Keyed by Clerk user ID — no credentials or identity here,
// just a JSON snapshot of checklist state for fast reloads.
const _PROGRESS_CACHE = 'an_progress_v3_';

function _buildEmptyProgress() {
  const p = {};
  for (const [key, path] of Object.entries(CHECKLIST)) {
    p[key] = {};
    for (const item of path.items) p[key][item.id] = false;
  }
  return p;
}

// ── API auth header ───────────────────────────────────
// Pages initialise Clerk and store the instance as window.clerk.
// This function reads the short-lived JWT from that session.
async function _getAuthHeaders() {
  const token = await window.clerk?.session?.getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
}

// ── Progress ──────────────────────────────────────────
async function getProgress(userId) {
  try {
    const res = await fetch('/api/progress', { headers: await _getAuthHeaders() });
    if (res.ok) {
      const data = await res.json();
      const progress = data.progress || _buildEmptyProgress();
      localStorage.setItem(_PROGRESS_CACHE + userId, JSON.stringify(progress));
      return progress;
    }
  } catch {}
  // Fallback to local cache for offline / fast reloads
  try {
    const cached = localStorage.getItem(_PROGRESS_CACHE + userId);
    if (cached) return JSON.parse(cached);
  } catch {}
  return _buildEmptyProgress();
}

async function saveProgress(userId, progress) {
  localStorage.setItem(_PROGRESS_CACHE + userId, JSON.stringify(progress));
  try {
    await fetch('/api/progress', {
      method: 'POST',
      headers: await _getAuthHeaders(),
      body: JSON.stringify({ progress }),
    });
  } catch {}
}

function getProgressSummary(progress) {
  let total = 0, done = 0;
  for (const items of Object.values(progress))
    for (const v of Object.values(items)) { total++; if (v) done++; }
  return { total, done, pct: total ? Math.round((done / total) * 100) : 0 };
}

// ── Admin ─────────────────────────────────────────────
async function getAdminUsers() {
  try {
    const res = await fetch('/api/admin/users', { headers: await _getAuthHeaders() });
    if (!res.ok) return [];
    const data = await res.json();
    return data.users || [];
  } catch { return []; }
}
