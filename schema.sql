-- All Nations Church — Notion Onboarding
-- User progress for the Notion Academy checklist.
--
-- user_id  : Clerk user ID (format: user_xxxxxxxxxxxxxxxxxxxxxxxxxxxx)
-- path     : 'essentials' | 'workflows' | 'advanced'
-- item_id  : specific item within the path, e.g. 'building_basics'
-- completed: 0 = not done, 1 = done
-- updated_at: ISO-8601 UTC timestamp of the last change

CREATE TABLE IF NOT EXISTS user_progress (
  user_id    TEXT    NOT NULL,
  path       TEXT    NOT NULL,
  item_id    TEXT    NOT NULL,
  completed  INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT    NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, path, item_id)
);

CREATE INDEX IF NOT EXISTS idx_progress_user ON user_progress (user_id);
