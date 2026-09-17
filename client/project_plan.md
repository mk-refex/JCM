# Refex — Job Clarity Management System

## 1. Project Description
An enterprise HR application that assesses how clearly employees understand their role, and measures the
perception gap between an Employee (Self) and their Reporting Manager (Manager). It drives a controlled,
auditable workflow from self-assessment through independent manager assessment, alignment, and final HOD
sign-off, with HRBP/HR visibility and Admin analytics across all Business Units.

Target users: Employees, Reporting Managers, HODs, HRBPs, HR Admins.
Core value: a single, consistent, evidence-based measure of role clarity across the organisation.

**Source of truth:** the attached Excel template (dimensions, definitions, rating scale, RAG rule) is
hard-coded — nothing is invented.

## 2. Page Structure
- `/login` — Demo sign-in (account picker for every role)
- `/app` — Authenticated shell (sidebar + topbar + role-aware navigation)
  - `/app/dashboard` — Role-aware dashboard (Employee / Manager / HOD / HRBP / Admin)
  - `/app/assessments` — Assessment list (role-filtered)
  - `/app/assessments/:id` — Assessment detail (workflow screens, phase-dependent)
  - `/app/team` — Manager: assigned assessments
  - `/app/signoffs` — HOD: pending final sign-offs
  - `/app/cases` — HRBP: cases, not-aligned cases, alignment conversations
  - `/app/analytics` — HR Admin: analytics, trends, RAG distribution, filters
  - `/app/admin` — HR Admin: master data (users, employees, org, SLA, templates)
- `*` — Not found

## 3. Core Features
- [x] RBAC across Employee / Reporting Manager / HOD / HRBP / HR Admin
- [x] Demo session + role switching (swap to real auth later)
- [ ] Initial Role Clarity Check (Yes / Partially / No)
- [ ] Employee Self Assessment — Sections A–D, 20-row responsibility table, 100% time validation
- [ ] Manager Independent Assessment — blind to employee responses until submit
- [ ] Automatic GAP + RAG calculation (source-of-truth rules)
- [ ] Employee Alignment decision (Aligned / Not Aligned)
- [ ] Role Alignment Conversation (Employee + Manager + HOD + HRBP)
- [ ] HOD Final Sign-off (terminal — no loop back)
- [ ] Closure notification + read-only completed record
- [ ] Working-day SLA tracking, reminders, notification service
- [ ] Audit trail (immutable)
- [ ] Dashboards: Employee, Manager, HOD, HRBP, Admin analytics
- [ ] Admin master data management

## 4. Data Model Design
Demo/database-compatible entities (mirrored later by real tables):
- **User** — id, name, email, role, employeeId, avatarSeed
- **Employee** — id, empId, name, businessUnit, function, department, designation, grade, location, dateOfJoining, company, managerId, hodId, hrbpId
- **Assessment** — id, employeeId, managerId, hodId, hrbpId, status, initialClarityResponse, responsibilities[], employeeRatings[], employeeComments, managerRatings[], managerComments, roleExpectations, employeeOverallAverage, managerOverallAverage, overallGap, ragStatus, alignmentStatus, alignmentConversation, hodComments, hrbpComments, hodSignoff, hodSignoffAt, createdAt, updatedAt, completedAt
- **Responsibility** — key job responsibility + approx % of time (max 20 rows, must total 100%)
- **EmployeeRating / ManagerRating** — 7 dimensions, 1–5
- **AlignmentConversation** — date, status (Scheduled/In Progress/Completed), HOD comments, HRBP comments
- **Notification**, **Reminder**, **AuditLog**, **SlaRecord**

## 5. Backend / Third-party Integration Plan
- Database: **Not connected now** — a realistic in-app demo data layer stands in. The service layer already
  enforces RBAC, the workflow state machine, blind-manager isolation, and audit logging, so screens do NOT
  need rewriting when a real backend is connected.
- Auth: demo account picker for now; replace with Readdy Backend / SaaS Supabase auth later.
- Shopify / Stripe: not required.
- Email (Resend): optional, phase 7 — in-app notifications first.

## 6. Development Phase Plan

### Phase 1: Foundation & Shell  ✅ COMPLETE
- Goal: design system, app shell, RBAC session, demo data + service layer, state machine, RAG/GAP/SLA engines.
- Deliverable: sign in as any role, see a role-appropriate dashboard, navigation, and seeded data.
- Done: palette tokens + fonts, domain model, 7 dimensions/rating scale/RAG constants from the workbook,
  GAP + RAG + working-day SLA engines, workflow state machine with valid transitions,
  demo data (19 employees across 11 BUs, 12 users, 10 assessments, audit/notifications/reminders),
  RBAC + manager blind-isolation service, login with role account picker, app shell with sidebar/topbar,
  role dashboards for Employee/Manager/HOD/HRBP/Admin, assessment explorer with search + filters,
  full case-file detail page (gap comparison, comments, audit timeline), analytics dashboard with charts,
  admin master data console.

### Phase 2: Employee Flow  ← NEXT
- Goal: Initial clarity check + full Self Assessment (Sections A–D) + review + submit.
- Deliverable: Employee can start, save draft, validate, and submit an assessment.

### Phase 3: Manager Flow
- Goal: independent blind assessment, comments/expectations, submit, then reveal comparison.
- Deliverable: Manager cannot see employee answers in the API layer until after submission.

### Phase 4: Alignment Flow
- Goal: employee alignment decision + Role Alignment Conversation screen.
- Deliverable: Aligned → HOD pending; Not Aligned → conversation → HOD pending.

### Phase 5: HOD Sign-off & Closure
- Goal: final sign-off screen, closure notification, read-only completed summary.
- Deliverable: terminal COMPLETED state with full summary page.

### Phase 6: HRBP & Admin Analytics
- Goal: HRBP case console + HR Admin analytics dashboards, charts and filters.
- Deliverable: RAG distribution, BU/function trends, dimension gaps, SLA adherence, ageing.

### Phase 7: SLA, Reminders, Notifications, Audit & Master Data
- Goal: working-day SLA engine, reminders with "Send Now", notification service, audit trail, admin CRUD.
- Deliverable: monitoring + admin configuration surfaces.