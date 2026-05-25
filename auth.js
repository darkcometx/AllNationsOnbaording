/* ====================================================
   ALL NATIONS CHURCH — NOTION ONBOARDING
   auth.js — Shared authentication & data layer
   ==================================================== */

// ── EmailJS Configuration ────────────────────────────
// SETUP REQUIRED: Replace these with your EmailJS credentials.
// 1. Go to https://www.emailjs.com and create a free account
// 2. Create an Email Service (connect your Gmail)
// 3. Create an Email Template — use these variables in the template:
//    {{to_name}}, {{to_email}}, {{setup_link}}, {{from_name}}
// 4. Copy your Service ID, Template ID, and Public Key below
const EMAILJS_SERVICE_ID  = 'service_jdd55tl';
const EMAILJS_TEMPLATE_ID = 'template_vvg59vh';
const EMAILJS_PUBLIC_KEY  = 'IWY7487T1w6K6inxW';

// ── Users Registry ───────────────────────────────────
// All accounts. username = first.last (lowercase)
// email: to be set by admin in admin dashboard
const USERS_REGISTRY = [
  { username: 'admin',          displayName: 'Admin',          email: '',                     role: 'admin' },
  { username: 'alisha.bains',   displayName: 'Alisha Bains',   email: '',                     role: 'user'  },
  { username: 'ifeanyi.dim',    displayName: 'Ifeanyi Dim',    email: '',                     role: 'user'  },
  { username: 'endo.moyo',      displayName: 'Endo Moyo',      email: 'endo.moyo@gmail.com',  role: 'user'  },
  { username: 'nams.moyo',      displayName: 'Nams Moyo',      email: '',                     role: 'user'  },
  { username: 'andrew.mumo',    displayName: 'Andrew Mumo',    email: '',                     role: 'user'  },
  { username: 'sarah.pavey',    displayName: 'Sarah Pavey',    email: '',                     role: 'user'  },
  { username: 'josh.raybould',  displayName: 'Josh Raybould',  email: '',                     role: 'user'  },
  { username: 'susie.raybould', displayName: 'Susie Raybould', email: '',                     role: 'user'  },
  { username: 'jagdish.singh',  displayName: 'Jagdish Singh',  email: '',                     role: 'user'  },
  { username: 'esther.uppal',   displayName: 'Esther Uppal',   email: '',                     role: 'user'  },
  { username: 'steve.uppal',    displayName: 'Steve Uppal',    email: '',                     role: 'user'  },
  { username: 'hannah.worrall', displayName: 'Hannah Worrall', email: '',                     role: 'user'  },
  { username: 'cassy.zou',      displayName: 'Cassy Zou',      email: '',                     role: 'user'  },
];

// ── Notion Academy Checklist ─────────────────────────
const CHECKLIST = {
  essentials: {
    label: 'Essentials Path',
    badge: 'Beginner',
    color: '#2D9CDB',
    url: 'https://academy.notion.com/page/essentials-catalogue',
    items: [
      { id: 'building_basics',        label: 'Building basics',       desc: 'Navigate, create with blocks, build custom databases, and manage knowledge with Wikis.',  mins: 20, url: 'https://academy.notion.com/building-basics' },
      { id: 'sharing_collaboration',  label: 'Sharing & collaboration', desc: 'Share, collaborate, and brainstorm with your team members — in person and remotely.',   mins: 15, url: 'https://academy.notion.com/collaborating-in-notion' },
      { id: 'essentials_quiz',        label: 'Essentials Badge Quiz',  desc: 'Take the quiz and earn your Essentials badge.',                                           mins: null, url: 'https://academy.notion.com/notion-essentials-quiz', isBadge: true },
    ]
  },
  workflows: {
    label: 'Workflows Path',
    badge: 'Intermediate',
    color: '#27AE60',
    url: 'https://academy.notion.com/page/workflows-catalogue',
    items: [
      { id: 'connecting_knowledge',   label: 'Connecting knowledge in Notion', desc: 'Build systems that are consistent, connected, and reliable.', mins: 20, url: 'https://academy.notion.com/connecting-knowledge-in-notion' },
      { id: 'issue_tracker',          label: 'An issue tracker for any team',  desc: 'Build an intake system using forms, charts, and automations.', mins: 15, url: 'https://academy.notion.com/an-issue-tracker-for-any-team' },
      { id: 'project_management',     label: 'Project management',             desc: 'Set up projects & task databases with just the right structure.', mins: 15, url: 'https://academy.notion.com/projects-tasks' },
      { id: 'workflows_quiz',         label: 'Workflows Badge Quiz',           desc: 'Take the quiz and earn your Workflows badge.', mins: null, url: 'https://academy.notion.com/notion-workflows-quiz', isBadge: true },
    ]
  },
  advanced: {
    label: 'Advanced Path',
    badge: 'Advanced',
    color: '#9B51E0',
    url: 'https://academy.notion.com/page/advanced-catalogue',
    items: [
      { id: 'workspace_design',       label: 'Workspace design',               desc: 'Best practices for designing your workspace — blocks, layouts, and structure.', mins: 10, url: 'https://academy.notion.com/desigining-your-workspace' },
      { id: 'database_organisation',  label: 'Database organisation strategies', desc: 'Choose the right structure, model data effectively, and connect across teams.', mins: 20, url: 'https://academy.notion.com/database-organization-strategies' },
      { id: 'formulas',               label: 'Formulas',                       desc: 'Automate everyday workflows and create dynamic databases with Notion AI.', mins: 20, url: 'https://academy.notion.com/formulas-course' },
      { id: 'webhook_integrations',   label: 'Webhook actions & integrations', desc: 'Extend your databases and automate work across all the tools you use.', mins: 20, url: 'https://academy.notion.com/webhook-actions-integrations' },
      { id: 'advanced_quiz',          label: 'Advanced Badge Quiz',            desc: 'Take the quiz and earn your Advanced badge.', mins: null, url: 'https://academy.notion.com/notion-advanced-quiz', isBadge: true },
    ]
  }
};

// ── Storage Keys ─────────────────────────────────────
const STORAGE_KEYS = {
  accounts:    'an_notion_accounts',    // { username: { passwordHash, registered, inviteToken, inviteSent } }
  emails:      'an_notion_emails',      // { username: email }   (admin editable)
  progress:    'an_notion_progress_',   // + username
  session:     'an_notion_session',     // { username, role, displayName }
};

// ── Crypto helpers ───────────────────────────────────
async function hashPassword(password) {
  const encoded = new TextEncoder().encode(password);
  const buffer  = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateToken() {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ── Account management ───────────────────────────────

// Returns the accounts object from localStorage
function getAccounts() {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.accounts) || '{}');
}

function saveAccounts(accounts) {
  localStorage.setItem(STORAGE_KEYS.accounts, JSON.stringify(accounts));
}

// Returns stored email overrides (admin can update these)
function getEmails() {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.emails) || '{}');
}

function saveEmails(emails) {
  localStorage.setItem(STORAGE_KEYS.emails, JSON.stringify(emails));
}

// Returns the full user info, merging registry + localStorage data
function getUserInfo(username) {
  const base     = USERS_REGISTRY.find(u => u.username === username);
  if (!base) return null;
  const accounts = getAccounts();
  const emails   = getEmails();
  return {
    ...base,
    email:      emails[username] || base.email || '',
    account:    accounts[username] || { registered: false, inviteSent: false },
  };
}

// Seeds the admin account on first load (password: a11nations)
async function seedAdmin() {
  const accounts = getAccounts();
  if (!accounts['admin']) {
    const hash = await hashPassword('a11nations');
    accounts['admin'] = { passwordHash: hash, registered: true, inviteSent: false };
    saveAccounts(accounts);
  }
}

// ── Authentication ───────────────────────────────────

async function attemptLogin(username, password) {
  const accounts = getAccounts();
  const account  = accounts[username];
  if (!account || !account.registered) return { ok: false, reason: 'not_registered' };
  const hash = await hashPassword(password);
  if (hash !== account.passwordHash) return { ok: false, reason: 'wrong_password' };
  // Store session
  const user = getUserInfo(username);
  localStorage.setItem(STORAGE_KEYS.session, JSON.stringify({
    username:    username,
    role:        user.role,
    displayName: user.displayName,
  }));
  return { ok: true, user };
}

function getSession() {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.session) || 'null');
}

function logout() {
  localStorage.removeItem(STORAGE_KEYS.session);
}

// ── Password setup via invite token ──────────────────

function getInviteToken(username) {
  const accounts = getAccounts();
  return accounts[username]?.inviteToken || null;
}

function generateInviteToken(username) {
  const accounts = getAccounts();
  if (!accounts[username]) accounts[username] = { registered: false, inviteSent: false };
  const token = generateToken();
  accounts[username].inviteToken = token;
  accounts[username].inviteSent  = true;
  saveAccounts(accounts);
  return token;
}

async function activateAccount(username, token, newPassword) {
  const accounts = getAccounts();
  const account  = accounts[username];
  if (!account || account.inviteToken !== token) return { ok: false, reason: 'invalid_token' };
  const hash = await hashPassword(newPassword);
  accounts[username] = {
    ...account,
    passwordHash: hash,
    registered:   true,
    inviteToken:  null, // consume the token
  };
  saveAccounts(accounts);
  return { ok: true };
}

// ── Progress tracking ────────────────────────────────

function getProgress(username) {
  const raw = localStorage.getItem(STORAGE_KEYS.progress + username);
  if (raw) return JSON.parse(raw);
  // Build fresh empty progress
  const progress = {};
  for (const [pathKey, path] of Object.entries(CHECKLIST)) {
    progress[pathKey] = {};
    for (const item of path.items) {
      progress[pathKey][item.id] = false;
    }
  }
  return progress;
}

function saveProgress(username, progress) {
  localStorage.setItem(STORAGE_KEYS.progress + username, JSON.stringify(progress));
}

function getProgressSummary(username) {
  const progress = getProgress(username);
  let total = 0, done = 0;
  for (const [pathKey, items] of Object.entries(progress)) {
    for (const [itemId, checked] of Object.entries(items)) {
      total++;
      if (checked) done++;
    }
  }
  return { total, done, pct: total ? Math.round((done / total) * 100) : 0 };
}

// ── EmailJS invite sending ───────────────────────────

async function sendInviteEmail(username, toEmail, toName, setupLink) {
  if (EMAILJS_PUBLIC_KEY === 'YOUR_PUBLIC_KEY') {
    return { ok: false, reason: 'emailjs_not_configured' };
  }
  try {
    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id:  EMAILJS_SERVICE_ID,
        template_id: EMAILJS_TEMPLATE_ID,
        user_id:     EMAILJS_PUBLIC_KEY,
        template_params: {
          to_name:    toName,
          to_email:   toEmail,
          setup_link: setupLink,
          from_name:  'All Nations Church',
        },
      }),
    });
    if (!response.ok) {
      const text = await response.text();
      console.error('EmailJS API error', response.status, text);
      return { ok: false, reason: text || `status_${response.status}` };
    }
    return { ok: true };
  } catch (err) {
    console.error('EmailJS fetch error', err);
    return { ok: false, reason: err.message || 'send_failed' };
  }
}

// Run admin seed on every page load
seedAdmin();
