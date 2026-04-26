-- Add submission fields to Task
ALTER TABLE "Task"
  ADD COLUMN IF NOT EXISTS "reviewerId"     UUID,
  ADD COLUMN IF NOT EXISTS "submissionNote" TEXT;

ALTER TABLE "Task"
  ADD CONSTRAINT "Task_reviewerId_fkey"
  FOREIGN KEY ("reviewerId") REFERENCES "UserProfile"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- TaskAttachment table
CREATE TABLE IF NOT EXISTS "TaskAttachment" (
  "id"           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "taskId"       UUID        NOT NULL,
  "fileKey"      TEXT        NOT NULL,
  "fileName"     TEXT        NOT NULL,
  "mimeType"     TEXT,
  "fileSize"     INTEGER,
  "uploadedById" UUID,
  "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "TaskAttachment_taskId_fkey"
    FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "TaskAttachment_taskId_idx" ON "TaskAttachment"("taskId");
