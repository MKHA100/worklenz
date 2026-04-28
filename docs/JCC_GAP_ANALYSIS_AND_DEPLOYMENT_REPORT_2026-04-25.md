# JCC Gap Analysis and Deployment Report

Date: 2026-04-25  
Repo: `/Users/mihisarakaveesha/Desktop/dev/JCC Project/worklenz`  
Client source: `/Users/mihisarakaveesha/Desktop/21e0af84-b481-46d3-9951-4c540d52f301_JCC_Dev.pdf`

## Scope Completed

1. Parsed client requirements from the PDF.
2. Cross-checked requirements against current frontend, backend, DB schema, and infra config.
3. Confirmed GitHub repo setup under your username and local remote usage.
4. Produced exact requirement-vs-current difference list.
5. Produced prioritized remaining tasks.
6. Produced Supabase + Vercel + Redis deployment analysis.

## GitHub Repo Setup Status

Completed.

- `origin`: `https://github.com/MKHA100/worklenz.git`
- `upstream`: `https://github.com/Worklenz/worklenz.git`

## Client Requirement Summary (from PDF)

1. Roles: Managing Director, Senior QS, Quantity Surveyor.
2. Core modules: Task Management, Attendance Tracking, Rate Benchmarking.
3. Status workflow includes: ASSIGNED, IN PROGRESS, QUERY RAISED, EXTENSION REQUESTED, SUBMITTED, APPROVED, REVISION REQUIRED, REJECTED, ON HOLD.
4. Attendance statuses: Present, Absent, Half-day, On Leave (with task risk and notification behavior).
5. Mandatory time log on submission.
6. Task ID format: `TASK-OfficeCode-ProjectCode-Trade-YYYYMMDD-Seq`.
7. Dashboards by role: MD (multi-location read-only), Senior QS (office operations), QS (personal productivity and deadlines).
8. Notification/escalation rules for assignment, query flow, deadlines, revision returns, approvals, and extension decisions.

## Requirement Gap Matrix

Legend: `Implemented`, `Partial`, `Missing`

| Area                      | Required                                            | Current State                                                                                                                                                                                            | Status      |
| ------------------------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| Role model                | MD / Senior QS / QS with explicit permissions       | Generic Owner/Admin/Member model (`worklenz-backend/database/sql/1_tables.sql:1033`, `worklenz-frontend/src/services/auth/auth.service.ts:14`)                                                           | Partial     |
| Multi-office/location     | Office entity and office-scoped dashboards          | No office entity in schema search                                                                                                                                                                        | Missing     |
| Board/Kanban              | Shared task board and drag-drop flow                | Board exists (`worklenz-frontend/src/lib/project/project-view-constants.ts:65`)                                                                                                                          | Implemented |
| Status taxonomy           | Domain statuses and transitions                     | Default categories are To do/Doing/Done (`worklenz-backend/database/sql/2_dml.sql:22`)                                                                                                                   | Partial     |
| Review queue              | Senior QS review inbox with approve/reject comments | No dedicated review route/tab in current routing/nav (`worklenz-frontend/src/features/navbar/navRoutes.ts:8`, `worklenz-frontend/src/app/routes/main-routes.tsx:51`)                                     | Missing     |
| Attendance module         | Daily check-in and attendance actions               | No attendance table/module found in schema/src search                                                                                                                                                    | Missing     |
| Timer/time logs           | Task timer and time tracking                        | Implemented (`worklenz-backend/database/sql/1_tables.sql:1339`, `worklenz-backend/database/sql/1_tables.sql:1375`, `worklenz-backend/src/socket.io/commands/on-task-timer-start.ts:8`)                   | Implemented |
| Mandatory time on submit  | Submission requires time log                        | No submission gate found; status validator only checks params (`worklenz-backend/src/middlewares/validators/kanban-status-update-validator.ts:8`)                                                        | Missing     |
| Query log                 | Dedicated query log lifecycle                       | No first-class query-log entity found                                                                                                                                                                    | Missing     |
| Productivity benchmarking | Planned vs actual rate, efficiency, variance        | No dedicated planned/actual productivity model; generic time reports exist (`worklenz-frontend/src/lib/reporting/reporting-constants.ts:64`)                                                             | Partial     |
| Task ID format            | JCC key format                                      | Current key is `projectKey-taskNo` (`worklenz-backend/database/sql/4_functions.sql:3291`)                                                                                                                | Missing     |
| File review flow          | Submitted files reviewed by Senior QS               | Attachments exist (`worklenz-backend/database/sql/1_tables.sql:1150`, `worklenz-frontend/src/components/task-drawer/shared/info-tab/attachments/attachments-preview.tsx:20`) but no review decision flow | Partial     |
| Dashboards by role        | MD/SQS/QS specific dashboards                       | Generic reporting/home modules; admin-gated reporting (`worklenz-frontend/src/features/navbar/navRoutes.ts:27`, `worklenz-frontend/src/lib/reporting/reporting-constants.ts:20`)                         | Partial     |
| Notifications/escalation  | Client-specific event matrix                        | Generic notification/digest infra exists (`worklenz-backend/src/cron_jobs/notifications-job.ts:36`, `worklenz-backend/src/cron_jobs/daily-digest-job.ts:19`)                                             | Partial     |
| Audit trail               | Append-only action history                          | Task activity logs table exists (`worklenz-backend/database/sql/1_tables.sql:1118`)                                                                                                                      | Partial     |

## Exact Difference List (Current Program vs Client Requirement)

1. Domain roles (MD/Senior QS/QS) are not modeled explicitly; current system uses Owner/Admin/Member.
2. Office/location entity and multi-location logic are missing.
3. Attendance module (data + APIs + UI) is missing.
4. Attendance-driven task risk and reassignment behavior is missing.
5. Required domain status lifecycle is not implemented as a controlled workflow.
6. Senior QS review queue and approve/reject/revision process is missing.
7. Mandatory time log at submission is not enforced.
8. Planned productivity rate at task creation is missing.
9. Actual rate/efficiency/variance metrics are missing as first-class computed entities.
10. Task ID generation does not match the JCC format.
11. Query log entity and response/resolution lifecycle is missing.
12. MD read-only multi-location dashboard is missing.
13. Senior QS operations dashboard (queries, workload, revision rate, bottlenecks) is missing.
14. QS personal productivity dashboard as specified is missing.
15. Notification rules are not yet aligned to client escalation triggers.

## Construction Template Discovery

Research of the official Worklenz repository found that a **construction project template already exists** and is fully implemented:

- **Template ID**: `4e96f0e6-53e9-4ed2-87b0-7310fdc2807a` (in `pt_project_templates` table)
- **Template Key**: `CON`
- **Built-in Tasks**: ~10 construction-specific tasks (Project Planning, Structural Framing, Foundation Work, Electrical/Plumbing, Insulation/HVAC, Site Preparation, Exterior Work, Finishing Work, Quality Assurance, Utilities Integration)
- **Phases**: Design, Procurement, Construction, Post Construction, Contracts
- **Statuses**: To Do, Doing, Done
- **Code Location**: `worklenz-backend/src/controllers/project-templates/project-templates.ts`
- **API Endpoints**:
  - `GET /api/pt/templates` - List all available templates
  - `GET /api/pt/{id}` - Get template by ID
  - `POST /api/pt/import { template_id }` - Create project from template

**Key Finding**: The template infrastructure uses a **template registry pattern** with 15+ industry templates already defined. Worklenz provides full end-to-end support for template-based project creation, with database procedures (`insert_project_from_template`) that automatically create phases, statuses, and tasks.

**Recommendation**: When creating the JCC project, use `POST /api/pt/import` with the construction template ID to establish the baseline workflow. For JCC-specific extensions, create a custom `jcc-construction` template variant in `project-templates.ts` with added fields and customized task list.

## Remaining Tasks to Complete (Prioritized)

### Phase 1: Domain and schema foundation

#### 1.1 Dynamic Role Creation System (New Recommendation)

Instead of hardcoding roles, implement a **Role Factory Pattern** allowing the Managing Director (Owner level) to create and manage roles with granular permissions:

**Current limitation**: Roles table uses hardcoded boolean flags (`default_role`, `admin_role`, `owner`), limiting team to only 3 role types.

**Proposed approach**:

1. **Extend roles table schema**:
   - Add `is_system_role BOOLEAN DEFAULT FALSE` (false = custom, true = built-in Owner/Admin/Member)
   - Add `created_by UUID REFERENCES users(id)` (tracks which Owner created the role)
   - Remove boolean flag limitation

2. **Role types for JCC**:
   - System roles: Owner, Admin (fixed)
   - Custom roles creatable by Owner:
     - `MANAGING_DIRECTOR` (full permissions, can create/edit roles)
     - `SENIOR_QS` (review, approve, reporting permissions)
     - `QS` (task execution, time tracking permissions)
     - Any other domain-specific roles as needed

3. **API endpoints** (Owner-only access):
   - `POST /api/roles` - Create custom role with permission set
   - `PUT /api/roles/{id}` - Edit role permissions
   - `DELETE /api/roles/{id}` - Delete custom roles (not system roles)
   - `GET /api/permissions` - List all available permissions

4. **Reference implementation**: [access-controls-controller.ts](worklenz-backend/src/controllers/access-controls-controller.ts) already supports role querying; extend with creation/edit/delete endpoints.

#### 1.2 Core Domain Models

1. Add office/location model and user/project linkage.
2. Add attendance model: date, check-in time, status, reason.
3. Extend task model with domain fields: planned rate, unit, trade code, revision count.
4. Add query log model (raised by, response, resolved).
5. Add productivity model (planned, actual, efficiency, variance).
6. Implement JCC task key formatter.

### Phase 2: Workflow engine

1. **Leverage construction template base**: Import the construction template to establish default phases and statuses; then customize for JCC domain statuses (ASSIGNED, IN PROGRESS, QUERY RAISED, EXTENSION_REQUESTED, SUBMITTED, APPROVED, REVISION_REQUIRED, REJECTED, ON_HOLD).
2. Implement canonical JCC status set and allowed transitions with permission checks per role.
3. Enforce submission preconditions (mandatory time log) via middleware validator (extend existing `kanban-status-update-validator.ts`).
4. Add extension request flow and decision actions.
5. Add review decision endpoints (approve/revision required/reject/on hold) with Senior QS role authorization.

### Phase 3: UI implementation

1. **Start with template-generated board**: Import construction template creates default Kanban board; extend with JCC status actions and role-aware UI transitions.
2. Attendance tab for Senior QS + MD scope.
3. Review queue tab for Senior QS (dedicated route + review inbox).
4. Role-specific dashboards:
   - MD: Multi-location read-only dashboard showing all offices
   - Senior QS: Operations dashboard (queries, workload, revision rate, bottlenecks)
   - QS: Personal productivity dashboard (tasks, deadlines, efficiency vs plan)
5. Query log panel inside task details.
6. Domain-specific status UI and actions (role-driven button visibility).

**Code references for dashboard architecture**: [reporting-constants.ts](worklenz-frontend/src/lib/reporting/reporting-constants.ts) shows existing dashboard templates; use similar pattern for JCC dashboards.

### Phase 4: Notifications and escalation

1. Encode client notification rules as explicit triggers (assignment, query flow, deadline approaching, revision return, approval, extension decision).
2. Add in-app + email templates for each domain event (reuse existing templates in [worklenz-backend/worklenz-email-templates/](worklenz-backend/worklenz-email-templates/)).
3. Add escalation scheduling (3-day reminder, overdue escalation) in cron jobs (extend [notifications-job.ts](worklenz-backend/src/cron_jobs/notifications-job.ts) and [daily-digest-job.ts](worklenz-backend/src/cron_jobs/daily-digest-job.ts)).

### Phase 5: QA and rollout

1. Data migrations and backfill strategy (extend database migrations in [worklenz-backend/database/migrations/](worklenz-backend/database/migrations/)).
2. Workflow and RBAC test coverage with custom role permissions.
3. End-to-end UAT on real JCC scenarios using template-based project.

## Implementation Strategy: Phase 1 Kickoff (Weeks 1-2)

An

### Immediate actions (~3-4 hours):

1. **Enable construction template** in local environment:
   - Backend boots and populates templates table
   - Test: `GET /api/pt/templates` should return construction template
   - Create test project using: `POST /api/pt/import { template_id: "4e96f0e6-53e9-4ed2-87b0-7310fdc2807a" }`

2. **Extend roles table for dynamic role support** (~2 hours):

   ```sql
   ALTER TABLE roles ADD COLUMN is_system_role BOOLEAN DEFAULT TRUE;
   ALTER TABLE roles ADD COLUMN created_by UUID REFERENCES users(id);
   UPDATE roles SET is_system_role = TRUE WHERE name IN ('Owner', 'Admin', 'Member');
   ```

3. **Add create/edit/delete role endpoints** in [access-controls-controller.ts](worklenz-backend/src/controllers/access-controls-controller.ts) (~1.5 hours):
   - POST endpoint with Owner validation
   - PUT endpoint with role ownership check
   - DELETE endpoint (prevent deletion of system roles)

### Short-term (~1-2 weeks):

1. Implement office/location model and link to projects/users.
2. Extend task schema with JCC domain fields (planned_rate, unit, trade_code, revision_count).
3. Create attendance module (table + basic APIs).
4. Implement custom JCC project template variant reusing construction template base.

## Code References for Implementation

| Component                      | Location                                                                                                           | Purpose                                                   |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------- |
| **Template system**            | [worklenz-backend/src/controllers/project-templates/](worklenz-backend/src/controllers/project-templates/)         | Template registry & import logic                          |
| **Construction template data** | [project-templates.ts](worklenz-backend/src/controllers/project-templates/project-templates.ts)                    | 15+ templates including CON                               |
| **Role system**                | [access-controls-controller.ts](worklenz-backend/src/controllers/access-controls-controller.ts)                    | Current role management (extend for CRUD)                 |
| **Role schema**                | [1_tables.sql](worklenz-backend/database/sql/1_tables.sql#L1033)                                                   | Roles table (enhance with is_system_role, created_by)     |
| **Status workflow**            | [kanban-status-update-validator.ts](worklenz-backend/src/middlewares/validators/kanban-status-update-validator.ts) | Extend for status transition validation                   |
| **Dashboard templates**        | [reporting-constants.ts](worklenz-frontend/src/lib/reporting/reporting-constants.ts)                               | Dashboard UI structure pattern                            |
| **Permission model**           | [1_tables.sql](worklenz-backend/database/sql/1_tables.sql#L1015)                                                   | Permissions table (already in place for role_permissions) |

## Deployment Analysis: Supabase + Vercel + Redis

## Current repo constraints

1. Backend is a long-running Express + Socket.IO server (`worklenz-backend/src/bin/www.ts:31`).
2. Cron jobs are process-driven (`worklenz-backend/src/cron_jobs/*.ts`).
3. Redis infra exists in Docker/env (`docker-compose.yaml:81`, `.env.example:83`) but runtime init is currently commented (`worklenz-backend/src/bin/www.ts:99`).

## Feasibility

### Supabase (Postgres)

Feasible and recommended.

- Supabase supports direct and pooled connection modes.
- For serverless/short-lived connections, Supabase recommends transaction pooler mode (`supabase.com/docs/guides/database/connecting-to-postgres`, lines 175 and 221-223).

### Vercel hosting

Feasible, but architecture choice matters.

- Vercel supports Express in serverless mode (`vercel.com/kb/guide/using-express-with-vercel`).
- Same guide warns websocket-style subscriptions are not a good fit for serverless functions and recommends realtime providers (`vercel.com/kb/guide/using-express-with-vercel`, line 117).
- Since current backend is Socket.IO-heavy, direct lift-and-shift to Vercel backend is high risk.

### Redis on Vercel

Feasible and recommended.

- Vercel directs Redis usage through Marketplace integrations (`vercel.com/docs/redis`, lines 1475-1477).
- Upstash client is HTTP/connectionless and designed for serverless (`upstash.com/docs/redis/howto/connectwithupstashredis`, lines 69-76).

## Recommended deployment architecture

Recommended for lowest risk:

1. Frontend on Vercel.
2. Backend on persistent Node host (Fly/Render/Railway/ECS) to preserve Socket.IO and existing cron pattern.
3. Database on Supabase Postgres.
4. Redis on Upstash (or another managed Redis close to backend region).
5. Storage: keep S3-compatible design or move to Supabase Storage (supports S3-compatible endpoint per docs).

Alternative (higher refactor): full backend on Vercel by replacing Socket.IO with managed realtime provider and converting all scheduled/background jobs to serverless-safe patterns.

## Redis implementation recommendation for this codebase

1. Activate Redis in runtime (uncomment/init with safe env handling).
2. Implement cache targets first:
   - task board/list aggregates
   - dashboard rollups
   - expensive report queries
3. Implement invalidation hooks on task/status updates and review actions.
4. If backend is on Vercel Functions, prefer Upstash REST client over long-lived TCP assumptions.

## Deployment migration steps

1. Provision Supabase project and migrate schema/data.
2. Move secrets/env into target platforms.
3. Decide realtime architecture (persistent backend vs provider-based refactor).
4. Implement active Redis cache layer.
5. Migrate cron scheduling:
   - persistent backend: keep existing cron process
   - Vercel: use Vercel Cron and secure with `CRON_SECRET` (`vercel.com/docs/cron-jobs/manage-cron-jobs`, lines 1678-1680)
6. Run performance + correctness testing before production cutover.

## External References Used (Deployment Research)

1. https://vercel.com/kb/guide/using-express-with-vercel
2. https://vercel.com/docs/redis
3. https://supabase.com/docs/guides/database/connecting-to-postgres
4. https://vercel.com/docs/cron-jobs
5. https://vercel.com/docs/cron-jobs/manage-cron-jobs
6. https://upstash.com/docs/redis/howto/connectwithupstashredis
7. https://upstash.com/docs/redis/howto/vercelintegration
8. https://supabase.com/docs/guides/storage/management/download-objects

## Template System Research References

Official Worklenz repository research confirmed:

1. **Template Architecture**: Template registry pattern located in `worklenz-backend/src/controllers/project-templates/`
   - 15+ industry-specific templates (Construction, Bug Tracking, Design & Creative, HR, IT, Legal, Manufacturing, Marketing, Nonprofit, Personal, Sales & CRM, Services & Consulting, Software Development, Finance, Education)
   - Construction template includes 10+ predefined construction-specific tasks and phases
   - Database-backed template storage in `pt_project_templates` table

2. **End-to-End Template Flow**:
   - Frontend template selector → `POST /api/pt/import`
   - Backend controller routes to `insert_project_from_template()` stored procedure
   - Creates: phases, statuses, tasks, labels in batch
   - Project dashboard auto-renders with template structure

3. **Customization Support**:
   - Built-in templates (static, read-only)
   - Custom templates (team-scoped, created from existing projects)
   - Template extension pattern reusable for JCC domain customization

**Key Takeaway for JCC**: Foundation template structure already exists; focus is on extending with domain-specific (1) custom roles, (2) attendance tracking, (3) status workflow, and (4) role-specific dashboards.
