-- Create Office table first (no dependencies)
CREATE TABLE "Office" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "code" VARCHAR(50) UNIQUE NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "city" VARCHAR(100),
  "country" VARCHAR(100),
  "managingUserId" UUID,
  "active" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create UserProfile table (depends on Office)
CREATE TABLE "UserProfile" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "clerkId" VARCHAR(255) UNIQUE NOT NULL,
  "email" VARCHAR(255) UNIQUE NOT NULL,
  "fullName" VARCHAR(255),
  "role" VARCHAR(50) DEFAULT 'qs',
  "officeId" UUID REFERENCES "Office"(id) ON DELETE SET NULL,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Project table (depends on Office)
CREATE TABLE "Project" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" VARCHAR(255) NOT NULL,
  "code" VARCHAR(50) UNIQUE NOT NULL,
  "officeId" UUID REFERENCES "Office"(id) ON DELETE SET NULL,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Task table (depends on Project, UserProfile)
CREATE TABLE "Task" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "projectId" UUID NOT NULL REFERENCES "Project"(id) ON DELETE CASCADE,
  "title" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "status" VARCHAR(50) DEFAULT 'ASSIGNED',
  "plannedRate" FLOAT,
  "actualRate" FLOAT,
  "efficiency" FLOAT,
  "variance" FLOAT,
  "assigneeId" UUID REFERENCES "UserProfile"(id) ON DELETE SET NULL,
  "reviewComment" TEXT,
  "reviewOutcome" VARCHAR(50),
  "submittedAt" TIMESTAMP,
  "reviewedAt" TIMESTAMP,
  "revisionCount" INTEGER DEFAULT 0,
  "timeSpentMinute" INTEGER DEFAULT 0,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create TaskTimeLog table (depends on Task)
CREATE TABLE "TaskTimeLog" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "taskId" UUID NOT NULL REFERENCES "Task"(id) ON DELETE CASCADE,
  "startedAt" TIMESTAMP NOT NULL,
  "endedAt" TIMESTAMP,
  "minutes" INTEGER DEFAULT 0,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Attendance table (depends on UserProfile, Office)
CREATE TABLE "Attendance" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES "UserProfile"(id) ON DELETE CASCADE,
  "officeId" UUID REFERENCES "Office"(id) ON DELETE SET NULL,
  "workDate" DATE NOT NULL,
  "checkInTime" TIMESTAMP NOT NULL,
  "status" VARCHAR(50) NOT NULL,
  "reason" TEXT,
  "confirmed" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("userId", "workDate")
);

-- Create TaskQueryLog table (depends on Task, UserProfile)
CREATE TABLE "TaskQueryLog" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "taskId" UUID NOT NULL REFERENCES "Task"(id) ON DELETE CASCADE,
  "drawingRef" VARCHAR(255),
  "description" TEXT NOT NULL,
  "impact" VARCHAR(255),
  "raisedById" UUID REFERENCES "UserProfile"(id) ON DELETE SET NULL,
  "response" TEXT,
  "respondedById" UUID REFERENCES "UserProfile"(id) ON DELETE SET NULL,
  "respondedAt" TIMESTAMP,
  "resolved" BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX "idx_task_projectId" ON "Task"("projectId");
CREATE INDEX "idx_task_assigneeId" ON "Task"("assigneeId");
CREATE INDEX "idx_task_status" ON "Task"("status");
CREATE INDEX "idx_attendance_userId" ON "Attendance"("userId");
CREATE INDEX "idx_attendance_workDate" ON "Attendance"("workDate");
CREATE INDEX "idx_taskTimelog_taskId" ON "TaskTimeLog"("taskId");
CREATE INDEX "idx_taskQueryLog_taskId" ON "TaskQueryLog"("taskId");
