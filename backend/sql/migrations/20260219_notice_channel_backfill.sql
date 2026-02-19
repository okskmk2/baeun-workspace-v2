BEGIN;

ALTER TABLE channel
  ADD COLUMN IF NOT EXISTS workspace_id integer;

ALTER TABLE channel
  ADD COLUMN IF NOT EXISTS scope varchar(20);

ALTER TABLE channel
  ALTER COLUMN scope SET DEFAULT 'PROJECT';

UPDATE channel
SET scope = CASE
  WHEN UPPER(type) = 'NOTICE' AND workspace_id IS NOT NULL THEN 'WORKSPACE'
  ELSE 'PROJECT'
END
WHERE scope IS NULL OR scope = '';

ALTER TABLE channel
  DROP CONSTRAINT IF EXISTS check_channel_type;

ALTER TABLE channel
  ADD CONSTRAINT check_channel_type
  CHECK (type IN ('GENERAL', 'ISSUE', 'DM', 'AGENT', 'NOTICE'));

ALTER TABLE channel
  DROP CONSTRAINT IF EXISTS check_channel_scope;

ALTER TABLE channel
  ADD CONSTRAINT check_channel_scope
  CHECK (scope IN ('PROJECT', 'WORKSPACE'));

ALTER TABLE channel
  ALTER COLUMN scope SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'channel_workspace_id_fkey'
  ) THEN
    ALTER TABLE channel
      ADD CONSTRAINT channel_workspace_id_fkey
      FOREIGN KEY (workspace_id) REFERENCES workspace(id) ON DELETE CASCADE;
  END IF;
END $$;

INSERT INTO channel (name, project_id, type, scope, status)
SELECT '프로젝트 공지채널', p.id, 'NOTICE', 'PROJECT', 'ACTIVE'
FROM project p
WHERE NOT EXISTS (
  SELECT 1
  FROM channel c
  WHERE c.type = 'NOTICE'
    AND c.scope = 'PROJECT'
    AND c.project_id = p.id
);

INSERT INTO channel (name, workspace_id, type, scope, status)
SELECT '워크스페이스 공지채널', w.id, 'NOTICE', 'WORKSPACE', 'ACTIVE'
FROM workspace w
WHERE NOT EXISTS (
  SELECT 1
  FROM channel c
  WHERE c.type = 'NOTICE'
    AND c.scope = 'WORKSPACE'
    AND c.workspace_id = w.id
);

CREATE TEMP TABLE tmp_notice_dupes (
  duplicate_id integer PRIMARY KEY,
  keep_id integer NOT NULL
) ON COMMIT DROP;

WITH ranked AS (
  SELECT
    id,
    project_id,
    MIN(id) OVER (PARTITION BY project_id) AS keep_id,
    ROW_NUMBER() OVER (PARTITION BY project_id ORDER BY id) AS rn
  FROM channel
  WHERE type = 'NOTICE'
    AND scope = 'PROJECT'
    AND project_id IS NOT NULL
)
INSERT INTO tmp_notice_dupes (duplicate_id, keep_id)
SELECT id, keep_id
FROM ranked
WHERE rn > 1;

WITH ranked AS (
  SELECT
    id,
    workspace_id,
    MIN(id) OVER (PARTITION BY workspace_id) AS keep_id,
    ROW_NUMBER() OVER (PARTITION BY workspace_id ORDER BY id) AS rn
  FROM channel
  WHERE type = 'NOTICE'
    AND scope = 'WORKSPACE'
    AND workspace_id IS NOT NULL
)
INSERT INTO tmp_notice_dupes (duplicate_id, keep_id)
SELECT id, keep_id
FROM ranked
WHERE rn > 1
ON CONFLICT (duplicate_id) DO NOTHING;

UPDATE channel_member cm
SET channel_id = d.keep_id
FROM tmp_notice_dupes d
WHERE cm.channel_id = d.duplicate_id
  AND NOT EXISTS (
    SELECT 1
    FROM channel_member cm2
    WHERE cm2.channel_id = d.keep_id
      AND cm2.member_id = cm.member_id
  );

DELETE FROM channel_member cm
USING tmp_notice_dupes d
WHERE cm.channel_id = d.duplicate_id;

UPDATE message m
SET channel_id = d.keep_id
FROM tmp_notice_dupes d
WHERE m.channel_id = d.duplicate_id;

DELETE FROM channel c
USING tmp_notice_dupes d
WHERE c.id = d.duplicate_id;

CREATE UNIQUE INDEX IF NOT EXISTS uq_channel_project_notice
  ON channel (project_id)
  WHERE type = 'NOTICE' AND scope = 'PROJECT';

CREATE UNIQUE INDEX IF NOT EXISTS uq_channel_workspace_notice
  ON channel (workspace_id)
  WHERE type = 'NOTICE' AND scope = 'WORKSPACE';

CREATE INDEX IF NOT EXISTS idx_channel_scope
  ON channel (scope);

CREATE INDEX IF NOT EXISTS idx_channel_workspace_id
  ON channel (workspace_id);

COMMIT;
