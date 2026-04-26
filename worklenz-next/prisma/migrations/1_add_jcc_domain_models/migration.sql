-- Add JCC domain fields to Task
ALTER TABLE "Task" ADD COLUMN "unit" VARCHAR(50);
ALTER TABLE "Task" ADD COLUMN "tradeCode" VARCHAR(50);

-- Role table for dynamic role creation
CREATE TABLE "Role" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" VARCHAR(100) NOT NULL,
  "description" TEXT,
  "isSystemRole" BOOLEAN DEFAULT FALSE,
  "createdById" UUID REFERENCES "UserProfile"(id) ON DELETE SET NULL,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("name")
);

-- Permission table
CREATE TABLE "Permission" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" VARCHAR(100) NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("name")
);

-- Role-Permission junction table
CREATE TABLE "RolePermission" (
  "roleId" UUID NOT NULL REFERENCES "Role"(id) ON DELETE CASCADE,
  "permissionId" UUID NOT NULL REFERENCES "Permission"(id) ON DELETE CASCADE,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY("roleId", "permissionId")
);

-- ProjectTemplate table for construction template support
CREATE TABLE "ProjectTemplate" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" VARCHAR(100) NOT NULL,
  "code" VARCHAR(10) NOT NULL,
  "description" TEXT,
  "category" VARCHAR(50),
  "isSystem" BOOLEAN DEFAULT FALSE,
  "createdById" UUID REFERENCES "UserProfile"(id) ON DELETE SET NULL,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("code")
);

-- Productivity metrics model (denormalized from Task for efficient querying)
CREATE TABLE "TaskProductivity" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "taskId" UUID NOT NULL UNIQUE REFERENCES "Task"(id) ON DELETE CASCADE,
  "plannedRate" FLOAT,
  "actualRate" FLOAT,
  "efficiency" FLOAT,
  "variance" FLOAT,
  "unitOfMeasure" VARCHAR(50),
  "calculatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Update UserProfile to reference Role
ALTER TABLE "UserProfile" ADD COLUMN "roleId" UUID REFERENCES "Role"(id) ON DELETE SET NULL;

-- Create indexes for common queries
CREATE INDEX "idx_task_unit" ON "Task"("unit");
CREATE INDEX "idx_task_tradeCode" ON "Task"("tradeCode");
CREATE INDEX "idx_role_isSystem" ON "Role"("isSystemRole");
CREATE INDEX "idx_projectTemplate_isSystem" ON "ProjectTemplate"("isSystem");
CREATE INDEX "idx_taskProductivity_taskId" ON "TaskProductivity"("taskId");
