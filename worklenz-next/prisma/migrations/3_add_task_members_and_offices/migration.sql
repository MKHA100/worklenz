-- TaskMember join table for multi-assignee support
CREATE TABLE IF NOT EXISTS "TaskMember" (
  "id"      UUID         NOT NULL DEFAULT gen_random_uuid(),
  "taskId"  UUID         NOT NULL,
  "userId"  UUID         NOT NULL,
  "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TaskMember_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "TaskMember"
  ADD CONSTRAINT "TaskMember_taskId_fkey"
  FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TaskMember"
  ADD CONSTRAINT "TaskMember_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS "TaskMember_taskId_userId_key"
  ON "TaskMember"("taskId", "userId");

-- Backfill existing single-assignee tasks into TaskMember
INSERT INTO "TaskMember" ("taskId", "userId")
SELECT "id", "assigneeId"
FROM "Task"
WHERE "assigneeId" IS NOT NULL
ON CONFLICT DO NOTHING;

-- Seed default offices
INSERT INTO "Office" ("id", "code", "name", "city", "country", "active", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), 'LKA', 'Sri Lanka Office',   'Colombo', 'Sri Lanka',   true, NOW(), NOW()),
  (gen_random_uuid(), 'AUS', 'Australia Office',    'Sydney',  'Australia',   true, NOW(), NOW()),
  (gen_random_uuid(), 'KSA', 'Saudi Arabia Office', 'Riyadh',  'Saudi Arabia', true, NOW(), NOW())
ON CONFLICT ("code") DO NOTHING;
