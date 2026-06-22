ALTER TABLE member
  ADD COLUMN IF NOT EXISTS approval_status varchar(20) NOT NULL DEFAULT 'PENDING';

ALTER TABLE member
  DROP CONSTRAINT IF EXISTS member_approval_status_check;

ALTER TABLE member
  ADD CONSTRAINT member_approval_status_check
  CHECK (approval_status IN ('PENDING', 'APPROVED', 'REJECTED'));

CREATE INDEX IF NOT EXISTS idx_member_approval_status_created_at
  ON member (approval_status, created_at DESC);
