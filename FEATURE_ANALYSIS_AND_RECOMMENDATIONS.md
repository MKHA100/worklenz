# Prelim: Feature Analysis & ClickUp Comparison

**Generated:** 2026-04-27 | **System:** Next.js 16 + Prisma + Supabase PostgreSQL

---

## 1. CURRENT SUPPORTED FUNCTIONALITIES

### ✅ Core Features (Fully Implemented)

| Feature | Status | Details |
|---------|--------|---------|
| **Project Management** | ✅ Full | Create, read, update projects. Scoped by membership for non-admin roles. |
| **Task Management** | ✅ Full | CRUD tasks within projects. Fields: title, description, status, due dates, rates, efficiency, variance. |
| **Task Status Workflow** | ✅ Full | Status: `ASSIGNED` → `IN_PROGRESS` → `SUBMITTED` → review states (`PENDING`, `APPROVED`, `REJECTED`) → `REVISION_REQUIRED` → resubmit cycle. |
| **Task Assignment** | ✅ Full | Assign/reassign tasks to team members. Scoped to project members only. |
| **Role-Based Access Control** | ✅ Full | 5 roles: `owner`, `admin`, `managing_director`, `senior_qs`, `qs`. Different permissions per role. |
| **Project Templates** | ✅ Partial | Model exists. UI/creation flow not fully exposed. |
| **File Uploads & Management** | ✅ Full | S3/R2 storage. Task attachments + submission round attachments. Signed URLs for download. |
| **Task Submission System** | ✅ Full | Multi-round submission history. QS submits → reviewer responds. Per-round note + docs + outcome. |
| **Review Queue** | ✅ Full | Senior QS/reviewers see submitted tasks grouped by status. Filter by reviewer role. |
| **Reviewer Comments** | ✅ Full | Reviewer can add comments per submission round. Editable, clearable. |
| **Submission Timeline** | ✅ Full | Threaded history per task: QS note + docs → reviewer response (outcome + comment). All rounds visible. |
| **Task Query Logs** | ✅ Full | Q&A system on tasks. Raise question (drawing ref, description, impact) → responder replies. Resolved flag. |
| **Time Tracking** | ✅ Basic | `TaskTimeLog` model. Start/end/minutes tracked. Not fully integrated in UI. |
| **Productivity Metrics** | ✅ Full | Planned rate, actual rate, efficiency %, variance %, unit/norm (trade code). Calculated per task. |
| **Attendance Management** | ✅ Full | Daily check-in. Office-scoped. Status (present/leave/absent), reason, confirmed flag. |
| **Kanban Board** | ✅ Full | Drag-drop task cards by status. Visual grouping. Real-time updates via Supabase realtime. |
| **Schedule/Gantt View** | ✅ Stub | Page exists, minimal implementation. |
| **Reporting Dashboard** | ✅ Basic | Home dashboard: task counts, my tasks (10 recent), projects. Overview page exists. |
| **Project Members Management** | ✅ Full | Add/remove members to project. Only manager roles can modify. Scoped task assignment. |
| **Notifications** | ✅ Full | Cron-based: daily digest, task review notifications, revision reminders, recurring task triggers. Email via Resend. |
| **Real-time Updates** | ✅ Full | Supabase realtime channel broadcasting. Task changes sync live across sessions. |
| **Project Filtering** | ✅ Full | Filter by office. Non-admin see only member projects. |
| **User Profile & Authentication** | ✅ Full | Clerk SSO + OAuth. DB fallback for role. Webhook sync. |

### ⚠️ Partial/Stub Features

| Feature | Status | Details |
|---------|--------|---------|
| **Gantt View** | ⚠️ Stub | Page exists, minimal—no timeline rendering, no drag scheduling. |
| **Time Log UI** | ⚠️ Partial | Backend model complete; no UI integration in task views. |
| **Project Templates** | ⚠️ Partial | Models + creation. No template apply/clone workflow in UI. |
| **Search/Filter Across Tasks** | ⚠️ Missing | No global search. Filters limited to status, assignee within a project view. |
| **Recurring Tasks** | ⚠️ Cron Only | Cron job creates recurring tasks on schedule. No UI rule builder. |
| **Custom Fields** | ❌ Not Built | No extensible fields beyond schema. |
| **Integrations** | ❌ Not Built | No Slack, email sync, Zapier, webhook integrations. |

---

## 2. ROLE-BASED FEATURE MATRIX

### Role Hierarchy
```
Owner (top privilege) ≥ Admin ≥ Managing Director ≥ Senior QS ≥ QS (least)
```

### Access & Capability Matrix

| Feature | Owner | Admin | Mgr Dir | Sr QS | QS |
|---------|-------|-------|---------|-------|-----|
| **Project Management** | | | | | |
| Create project | ✅ | ✅ | ✅ | ❌ | ❌ |
| View all projects | ✅ | ✅ | ✅ | Only member | Only member |
| Edit project | ✅ | ✅ | ✅ | ❌ | ❌ |
| Delete project | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Members Management** | | | | | |
| Add project members | ✅ | ✅ | ✅ | ✅ | ❌ |
| Remove members | ✅ | ✅ | ✅ | ✅ | ❌ |
| View all team members | ✅ | ✅ | ✅ | ✅ | Assigned users only |
| **Task Management** | | | | | |
| Create task | ✅ | ✅ | ✅ | ✅ | ✅ |
| Edit task details | ✅ | ✅ | ✅ | ✅ | Limited (own) |
| Delete task | ✅ | ✅ | ✅ | ❌ | ❌ |
| Assign task | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Review & Submission** | | | | | |
| Submit task | ✅ | ✅ | ✅ | ✅ | ✅ |
| Review submissions | ✅ | ✅ | ✅ | ✅ | ❌ |
| Set review outcome | ✅ | ✅ | ✅ | ✅ | ❌ |
| Add reviewer comment | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Review Queue** | | | | | |
| View review queue | ✅ | ✅ | ✅ | ✅ Only member projects | ❌ |
| Filter by role | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Reporting** | | | | | |
| View dashboard | ✅ | ✅ | ✅ | ✅ | ✅ |
| View analytics | ✅ | ✅ | ✅ | Limited | ❌ |
| Export reports | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Attendance** | | | | | |
| Log own attendance | ✅ | ✅ | ✅ | ✅ | ✅ |
| View team attendance | ✅ | ✅ | ✅ | ✅ | ❌ |
| Confirm attendance | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Query Logs** | | | | | |
| Raise query | ✅ | ✅ | ✅ | ✅ | ✅ |
| Respond to query | ✅ | ✅ | ✅ | ✅ | ✅ |
| Mark resolved | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 3. ARCHITECTURE & DATA MODEL

### Current Stack
- **Frontend:** Next.js 16 (App Router), React 19, Turbopack
- **Backend:** Next.js API Routes
- **Database:** Supabase PostgreSQL + pgBouncer (port 6543)
- **ORM:** Prisma 6.7.0
- **Auth:** Clerk + custom role system
- **Storage:** Cloudflare R2 / AWS S3
- **Realtime:** Supabase realtime channels
- **Email:** Resend
- **UI:** Ant Design 6 + Tailwind CSS

### Key Data Models
```
UserProfile ──┬─→ Task (assignee/reviewer)
              ├─→ Attendance
              ├─→ Office
              ├─→ Role
              └─→ ProjectMember ──→ Project
                                    ├─→ Task ──┬─→ TaskSubmission ──→ TaskAttachment
                                    │           └─→ TaskQueryLog
                                    │           └─→ TaskTimeLog
                                    │           └─→ TaskProductivity
                                    └─→ ProjectTemplate
```

---

## 4. COMPARISON WITH CLICKUP

### ✅ Features Prelim HAS (vs ClickUp)
| ClickUp Feature | Prelim | Notes |
|-----------------|--------|-------|
| Task Management | ✅ | Status workflow, assignees, attachments, submissions. |
| Multi-view (List, Board, Timeline) | Partial | Kanban board full. Gantt stub. No grid/calendar. |
| Custom Fields | ❌ | Only fixed schema fields (rates, efficiency, norm). |
| Time Tracking | Partial | Logged but minimal UI. No integrations. |
| Team Collaboration | ✅ | Comments per submission, query logs, notifications. |
| Recurring Tasks | ✅ | Cron-based creation. No UI builder. |
| Role-Based Permissions | ✅ | 5-tier role hierarchy. Per-action control. |
| Real-time Updates | ✅ | Supabase realtime. |
| Email Notifications | ✅ | Cron-triggered digests + task events. |
| Project Templates | Partial | Models exist. No template apply UX. |
| Productivity Insights | ✅ | Efficiency %, variance %, labor rates tracked. |

### ❌ Features ClickUp HAS That Prelim Missing

| ClickUp Feature | Prelim Status | Why Missing | Effort |
|-----------------|---------------|------------|--------|
| **Custom Fields** | ❌ | Requires dynamic schema + form builder | High |
| **Advanced Filtering** | ⚠️ Limited | No multi-column filter UI, no saved views | Medium |
| **Time Estimates & Tracking UI** | Partial | Model only. No UI timer, time logs view. | Medium |
| **Gantt Chart** | Stub | Page exists. Needs date range rendering, drag scheduling. | High |
| **Workload View** | ❌ | No capacity planning, team availability heatmap. | High |
| **Calendar View** | ❌ | No date-based task view. | Medium |
| **Grid View** | ❌ | No spreadsheet-style column-based editing. | High |
| **Form View** | ❌ | No data collection forms. | High |
| **Dependencies** | ❌ | No task blocking, task-to-task relationships. | Medium |
| **Milestones** | ❌ | No grouping by milestone/phase. | Medium |
| **Sprint Planning** | ❌ | No sprint board, velocity tracking. | High |
| **Budget Tracking** | ❌ | No cost estimation, spend vs planned comparison. | High |
| **Resource Leveling** | ❌ | No conflict detection, capacity alerts. | High |
| **Integrations** | ❌ | No Slack, Jira, Salesforce, Stripe connectors. | Very High |
| **Webhooks** | ⚠️ Partial | Clerk only. No outgoing webhooks. | Medium |
| **API** | ❌ | No public REST/GraphQL API for 3rd parties. | High |
| **Shared Workspaces** | ❌ | No client-facing shared views/portals. | High |
| **Approval Workflows** | ❌ | Submission → review exists. No multi-step approval chains. | Medium |
| **AI Assistant** | ❌ | No AI task suggestions, summaries. | High |
| **Activity Timeline** | Partial | Per-submission only. No full audit trail view. | Medium |
| **Bulk Operations** | ❌ | No bulk edit, bulk assign. | Medium |
| **Keyboard Shortcuts** | ❌ | Not implemented. | Low |
| **Mobile App** | ❌ | Web-only. No iOS/Android native app. | Very High |

---

## 5. RECOMMENDED FEATURE ROADMAP

### 🔴 HIGH PRIORITY (Impact + Effort Sweet Spot)

#### Phase 1: Core Gaps (4–6 weeks)
1. **Gantt Chart Full Implementation**
   - Render tasks as bars with date ranges
   - Drag to reschedule
   - Dependency visualization (blocked by X)
   - Estimated effort: **1.5 weeks**

2. **Time Tracking UI Integration**
   - Embed timer widget in task detail
   - Time log history panel
   - Daily time summary
   - Estimated effort: **1 week**

3. **Advanced Task Filtering & Saved Views**
   - Multi-column filter UI (status, assignee, priority, date range)
   - Save filter combinations as "views"
   - Apply to all views (Kanban, list, Gantt)
   - Estimated effort: **1 week**

4. **Milestones & Phases**
   - Milestone model: group tasks by phase
   - Milestone detail page: progress bar, critical path
   - Kanban/Gantt view by milestone
   - Estimated effort: **1.5 weeks**

5. **Task Dependencies** (block/blocked-by)
   - Dependency model: task1 → blocks → task2
   - Gantt dependency lines
   - Prevent completion if blocked
   - Estimated effort: **1 week**

#### Phase 2: Intermediate Features (6–8 weeks)
6. **Calendar View**
   - Month/week view of tasks by due date
   - Drag-drop to reschedule
   - Color-code by assignee/status
   - Estimated effort: **1 week**

7. **Grid/Table View**
   - Spreadsheet-style column editor
   - Inline edit (status, assignee, dates)
   - Column visibility toggle
   - Estimated effort: **1.5 weeks**

8. **Budget & Cost Tracking**
   - Task budget field (planned cost)
   - Actual cost calculation (rate × time)
   - Project cost summary
   - Budget variance alerts
   - Estimated effort: **1 week**

9. **Workload & Capacity Dashboard**
   - Team member allocation heatmap
   - Over/under-allocated alerts
   - Capacity per person per project
   - Recommended effort: **1.5 weeks**

10. **Approval Workflows**
    - Multi-step approval chains (task → approver1 → approver2)
    - Conditional approvals based on amount/type
    - Approval history timeline
    - Estimated effort: **1.5 weeks**

### 🟡 MEDIUM PRIORITY (High Value, Longer Build)

11. **Template Apply & Cloning**
    - Clone project from template
    - Clone task from template
    - Template task dependencies preserved
    - Estimated effort: **1 week**

12. **Form View (Data Collection)**
    - Design forms to collect task info
    - Share form link with externals
    - Auto-create tasks from submissions
    - Estimated effort: **2 weeks**

13. **Custom Fields (Extensible Schema)**
    - UI to define custom fields (text, dropdown, date, checkbox)
    - Store in JSON column + searchable
    - Display in task detail, views
    - **Complex.** Estimated effort: **2–3 weeks**

14. **Bulk Operations**
    - Bulk edit status, assignee, dates
    - Bulk delete tasks
    - Bulk add to milestone
    - Estimated effort: **5 days**

15. **Public API (REST)**
    - Task CRUD endpoints
    - Project endpoints
    - Rate limiting, API key management
    - OpenAPI/Swagger docs
    - Estimated effort: **2 weeks**

16. **Webhook Outgoing Events**
    - Trigger on task create/update/submit
    - Task review completion
    - Attendance logged
    - Estimated effort: **1 week**

### 🟢 LOWER PRIORITY (Nice-to-Have)

17. **Slack Integration**
    - Send task notifications to Slack
    - Update task status via Slack command
    - Daily digest in Slack
    - Estimated effort: **2 weeks**

18. **AI Assistant** (ChatGPT plugin)
    - Auto-suggest task descriptions
    - Generate project summaries
    - Anomaly detection (budget overrun)
    - Estimated effort: **2–3 weeks**

19. **Mobile App (React Native / Flutter)**
    - Task list, Kanban on mobile
    - Check-in task submission
    - View notifications
    - **Very large.** Estimated effort: **6–8 weeks**

20. **Sprint Planning (Agile Mode)**
    - Sprint board view
    - Velocity tracking
    - Burndown chart
    - Estimated effort: **2 weeks**

---

## 6. QUICK WINS (1–3 Days Each)

These are high-value, low-effort improvements:

1. **Search Bar** – Global task search by title/description
2. **Keyboard Shortcuts** – Cmd+K open search, Escape close modals
3. **Task Duplicate** – Clone a task with same fields
4. **Bulk Status Update** – Multi-select tasks, change status at once
5. **Export to CSV** – Download task list, submissions, attendance records
6. **Dark Mode Toggle** – Client-side theme switcher
7. **Recent Items Sidebar** – Quick access to recent projects/tasks
8. **Quick Add Modal** – Cmd+N to create task without navigation
9. **Subtasks** – Break task into smaller checklist items
10. **Emoji Reactions** – React to comments (👍, ✅, ❓)

---

## 7. RECOMMENDED EXECUTION STRATEGY

### Quarter 1 (Weeks 1–4)
- **Priority:** Gantt, Time Tracking UI, Advanced Filters
- **Why:** Unlocks core PM workflows. Closes big gaps vs ClickUp.

### Quarter 2 (Weeks 5–8)
- **Priority:** Calendar, Grid View, Milestones, Dependencies
- **Why:** Multiple task views cover 80% of user access patterns.

### Quarter 3 (Weeks 9–12)
- **Priority:** Budget/Cost, Workload Dashboard, Approval Workflows
- **Why:** Drives financial insights & team capacity management.

### Post-MVP
- **Custom Fields, API, Mobile** – Higher complexity, larger investment.

---

## 8. TECHNICAL DEBT & REFACTORING NOTES

### Current Code Health
- ✅ **Strong:** Prisma schema well-modeled. API routes clean. Role RBAC cohesive.
- ⚠️ **Improve:** Some components large (900+ lines). Extract task-detail sub-components.
- ⚠️ **Standardize:** Filter logic scattered. Centralize to a FilterBuilder utility.
- ⚠️ **Add:** Error boundaries for realtime failures. Retry logic for failed submissions.

### Recommended Refactors (Before adding 10+ features)
1. Extract shared filter UI to `<AdvancedFilter />` component
2. Create `useTaskDetail()` hook to centralize task state logic
3. Add error boundary wrapper for realtime connections
4. Break down `project-view-client.tsx` (852 lines) into tab components
5. Standardize date handling (currently mixed Date/ISO strings)

---

## 9. SUCCESS METRICS

Track after each feature release:

| Metric | Target | How to Measure |
|--------|--------|-----------------|
| Task Completion Rate | ↑ 20% | Tasks marked complete per user per week |
| Time Tracking Adoption | ↑ 60% | % users logging time on assigned tasks |
| Review Cycle Time | ↓ 2 days | Average days from submission to review |
| User Engagement | ↑ 40% | DAU / MAU ratio |
| Churn Rate | ↓ 5% | Monthly user retention |

---

## APPENDIX: Tech Stack Recommendations for New Features

### For Time Tracking UI
- Consider [wavesurfer.js](https://wavesurfer.js.org/) for timeline UI
- Or custom Recharts timeline component

### For Gantt Chart
- **Option A:** Custom canvas-based (lightweight, fast) — **Recommended**
- **Option B:** [React-Gantt](https://react-gantt-chart.vercel.app/) — pre-built
- **Option C:** [Frappe Gantt](https://frappe.io/charts/docs/source/chart/gantt) — lightweight

### For Custom Fields
- Extend Prisma with JSON columns
- Build form builder like [react-final-form](https://final-form.org/) or [Formik](https://formik.org/)
- Store field metadata in a `CustomFieldDefinition` model

### For Integrations (Phase 3+)
- [Zapier Platform](https://zapier.com/) for connector marketplace
- [Make (formerly Integromat)](https://www.make.com/) alternative
- Or hand-build Slack/GitHub via webhooks + API

---

**End of Analysis**  
*For questions or roadmap clarifications, contact the product team.*
