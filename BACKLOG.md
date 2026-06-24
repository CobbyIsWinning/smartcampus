# Smart Campus Management System — Feature Backlog

The product scope is defined by the Agile backlog: **6 epics, 48 stories**. This
file is the canonical feature reference for the app and the implementation
backlog. Story IDs (e.g. `MNT-2`) are stable handles — use them in commits,
branches, and PRs.

Roles in the spec: **Student, Faculty, Administrator, Maintenance Staff,
Maintenance Supervisor, Event Organizer** (plus Project Analyst / QA Engineer for
discovery & UAT stories, which are process work, not app features).

> The current `Role` enum only has `STUDENT`, `ADMINISTRATOR`, `MAINTENANCE_STAFF`.
> `FACULTY`, `MAINTENANCE_SUPERVISOR`, and `EVENT_ORGANIZER` must be added before
> the epics that depend on them (see Phase 0).

## Status legend

- ✅ **Done** — implemented and matches acceptance criteria.
- 🟡 **Partial** — exists but missing acceptance criteria (gaps noted).
- ⬜ **Not started**.

Discovery (`*-1`) and QA/UAT (`*-8`) stories are process artifacts; they are
listed for completeness but are not coding tasks.

---

## Epic 1 — Student Management Portal

| ID | Story | Status | Notes / gaps |
|----|-------|--------|--------------|
| STU-1 | Workflow discovery | n/a | Process |
| STU-2 | Account registration | 🟡 | `registerAction` exists. Missing: university-email-domain check, `studentId` + academic details at signup, duplicate-`studentId` block. |
| STU-3 | Secure login + password reset | 🟡 | Login + sessions done. **Password reset flow missing entirely** (token model, request page, email link, reset page, one-time-use). |
| STU-4 | Profile management | 🟡 | `updateProfileAction` edits name/studentId/department/phone. Missing: address, emergency contact, profile photo upload. |
| STU-5 | Course enrollment | ⬜ | No `Course`/`Enrollment` models. |
| STU-6 | Attendance dashboard | ⬜ | No `Attendance` model; needs course-wise %, low-attendance alert, filters. |
| STU-7 | Academic records view | ⬜ | No grades/GPA model; read-only view + downloadable summary. |
| STU-8 | QA & UAT | n/a | Process |

## Epic 2 — Facility Booking System (nothing implemented)

| ID | Story | Status | Notes |
|----|-------|--------|-------|
| FAC-2 | Facility catalog | ⬜ | `Facility` model (category, capacity, location, equipment, active flag, photos). |
| FAC-3 | Search & filters | ⬜ | Filter by name/category/capacity/building/equipment/date. |
| FAC-4 | Availability calendar | ⬜ | Day/week/month view; available/booked/pending/blocked slots; no past slots. |
| FAC-5 | Booking request creation | ⬜ | `Booking` model; facility/date/slot/purpose/attendees/equipment; double-booking prevention; unique ID. |
| FAC-6 | Admin approval workflow | ⬜ | Approve/reject with comments; approval blocks slot, rejection releases it; notify requester. |
| FAC-7 | Cancellation & rescheduling | ⬜ | Cancel releases slot; reschedule re-checks availability; notifications. |

## Epic 3 — Asset Tracking System (nothing implemented)

| ID | Story | Status | Notes |
|----|-------|--------|-------|
| AST-2 | Asset registration | ⬜ | `Asset` model (name, category, serial, purchase date, location, condition, cost, owning dept); unique asset ID; duplicate-serial flag. |
| AST-3 | Categorization & location mapping | ⬜ | Categories + department/building/room/storage; filtering; location history. |
| AST-4 | Allocation to faculty/department | ⬜ | Assign w/ date + responsible person; status → Assigned; allocation history. |
| AST-5 | Return & transfer | ⬜ | Return → Available/Under Review; transfer requests w/ admin approval; history. |
| AST-6 | QR code generation & scanning | ⬜ | Unique QR per asset; downloadable/printable; scan opens record; scan-view is read-only for unauthorized; audit log of scans. |
| AST-7 | Status & history logs | ⬜ | Statuses (Available/Assigned/Under Maintenance/Lost/Retired/Disposed); timestamped immutable history (prev→new + user). |

## Epic 4 — Maintenance Request System (partially implemented)

| ID | Story | Status | Notes / gaps |
|----|-------|--------|--------------|
| MNT-2 | Ticket creation | 🟡 | `createTicketAction` does title/description/location/priority. Missing: issue **category**, building + **room number** as distinct fields, human-readable ticket ID. |
| MNT-3 | Image upload + location tagging | ⬜ | No image upload; no file-format/size validation; images visible to staff. |
| MNT-4 | Technician assignment | 🟡 | `updateTicketStatusAction` sets `assignedToId`. Missing: dedicated "unassigned queue" view, technician task list, assignment-specific notification (status-change notification exists). |
| MNT-5 | Priority & SLA management | ⬜ | Needs `MAINTENANCE_SUPERVISOR` role, SLA due-time calc from priority/category, overdue highlighting, breach recording. Spec priority is Low/Medium/High/**Critical**; schema enum uses LOW/MEDIUM/HIGH/**URGENT** — reconcile. |
| MNT-6 | Status tracking + user updates | 🟡 | Status update + requester notification done. Spec adds `WAITING` status; schema has OPEN/IN_PROGRESS/RESOLVED/CLOSED. "Closed cannot be edited unless reopened" not enforced. |
| MNT-7 | Resolution feedback + reopen | ⬜ | Rating + comment after resolved; reopen request visible to admin/supervisor; feedback stored for reporting. |

## Epic 5 — Campus Events Management (nothing implemented)

| ID | Story | Status | Notes |
|----|-------|--------|-------|
| EVT-2 | Event creation (faculty/admin) | ⬜ | `Event` model (title, desc, category, date/time, venue, capacity, organizer, eligibility); Draft until published. |
| EVT-3 | Publishing & category management | ⬜ | Publish/unpublish/categorize; published events visible to students; category filters. |
| EVT-4 | Student registration | ⬜ | `EventRegistration` model; eligibility + seats check; duplicate-registration block. |
| EVT-5 | Waitlist & capacity | ⬜ | Waitlist queue; auto-promote on cancellation; notifications. |
| EVT-6 | QR attendance check-in | ⬜ | QR per event; only registered students; duplicate-check-in block; timestamped; live count. |
| EVT-7 | Feedback & participation report | ⬜ | Post-event feedback (attendees only); registration/attendance/no-show/rating report; downloadable. |

## Epic 6 — Analytics & Notifications (partially implemented)

| ID | Story | Status | Notes / gaps |
|----|-------|--------|--------------|
| ANA-2 | System notification center | 🟡 | `Notification` model + dashboard list + `markNotificationsReadAction` exist. Missing: dedicated notification history view, per-notification read state in UI. |
| ANA-3 | Email + in-app notification rules | ⬜ | No email delivery; no configurable triggers; no delivery-status/failure log. |
| ANA-4 | Student analytics report | ⬜ | Depends on Epic 1 data. Registrations/profile-completion/enrollment/attendance-risk; filters; charts; access control. |
| ANA-5 | Facility utilization report | ⬜ | Depends on Epic 2. Utilization %, bookings by facility/category/period, peak hours, export. |
| ANA-6 | Maintenance KPI dashboard | ⬜ | Depends on Epic 4 + SLA. Ticket volume, avg resolution time, open/overdue, SLA breaches, technician workload, satisfaction. |
| ANA-7 | Asset + event analytics | ⬜ | Depends on Epics 3 & 5. Asset status mix, event registration/attendance/no-show; PDF/Excel export. |

---

# Implementation backlog (ordered)

Phases are ordered by dependency. Each task is a shippable unit; check off as
completed. Follow the existing architecture (see `CLAUDE.md`): Server Actions
with `requireUser`/`requireRole` guards, pure validators in `app/lib/validation.ts`
with colocated tests, query-param + `ActionToast` feedback, `revalidatePath` on
mutation.

## Phase 0 — Foundations (unblock everything else)

- [ ] **P0.1** Extend `Role` enum: add `FACULTY`, `MAINTENANCE_SUPERVISOR`, `EVENT_ORGANIZER`; update `parseRole`, `requireRole` call sites, and `/admin/users` role selector.
- [ ] **P0.2** Reconcile maintenance enums with spec: add `WAITING` to `TicketStatus`; decide `URGENT` vs `CRITICAL` naming for `TicketPriority` (pick one, migrate).
- [ ] **P0.3** Add file/image upload primitive (storage choice + `app/lib/upload.ts` with format + size validation). Reused by STU-4 photo, MNT-3 images.
- [ ] **P0.4** Add reusable QR generation/scan utilities (`app/lib/qr.ts`). Reused by AST-6 and EVT-6.
- [ ] **P0.5** Add email-sending primitive (`app/lib/email.ts`) behind an interface (no-op in dev). Reused by STU-3 reset and ANA-3.
- [ ] **P0.6** Generalize the `Notification` creation path into `app/lib/notifications.ts` so every module emits consistently.

## Phase 1 — Complete Epic 1 (Student Portal)

- [ ] **STU-2** Add university-email-domain allowlist to `validateRegisterInput`; collect + store `studentId` + academic fields at signup; block duplicate `studentId`.
- [ ] **STU-3** Password reset: `PasswordReset` model (token, userId, expires, usedAt); request page + action (emails link via P0.5); reset page + action; enforce single-use + expiry.
- [ ] **STU-4** Profile: add `address`, `emergencyContact` to `User`; profile photo upload (P0.3); surface fields on dashboard profile form.
- [ ] **STU-5** Course enrollment: `Course` + `Enrollment` models; eligible-courses view; enroll action with seat/prerequisite/duplicate checks.
- [ ] **STU-6** Attendance: `Attendance` model; course-wise % dashboard, low-attendance threshold alert, course/month filters.
- [ ] **STU-7** Academic records: grades/GPA model; read-only semester view; completed vs pending; downloadable/printable summary.

## Phase 2 — Epic 4 (Maintenance) gaps

- [ ] **MNT-2** Add `category`, `building`, `roomNumber`, human-readable ticket reference to `MaintenanceTicket` + form + validator.
- [ ] **MNT-3** Image attachments on tickets (P0.3); staff-visible gallery.
- [ ] **MNT-4** Dedicated unassigned queue + technician task-list views; assignment notification.
- [ ] **MNT-5** SLA: `slaDueAt` + `slaBreached` on ticket, computed from priority/category; supervisor queue with overdue highlight + critical-first ordering. (needs `MAINTENANCE_SUPERVISOR` from P0.1)
- [ ] **MNT-6** Add `WAITING` handling; lock editing of `CLOSED` tickets unless reopened.
- [ ] **MNT-7** `TicketFeedback` model (rating + comment); reopen request flow visible to admin/supervisor.

## Phase 3 — Epic 2 (Facility Booking)

- [ ] **FAC-2** `Facility` model + admin-managed catalog; hide inactive from regular users.
- [ ] **FAC-3** Search + filters page.
- [ ] **FAC-4** Availability calendar (day/week/month), reflect existing bookings, block past slots.
- [ ] **FAC-5** `Booking` model + request form; validation; double-booking prevention; booking history.
- [ ] **FAC-6** Admin approve/reject with comments; slot blocking/release; requester notification.
- [ ] **FAC-7** Cancel + reschedule (re-check availability); notifications.

## Phase 4 — Epic 3 (Asset Tracking)

- [ ] **AST-2** `Asset` model + registration; unique asset ID; duplicate-serial flag.
- [ ] **AST-3** Categories + location mapping; filtering; location history.
- [ ] **AST-4** Allocation to faculty/department; status transitions; allocation history.
- [ ] **AST-5** Return + transfer (with admin approval); history.
- [ ] **AST-6** QR generation/scan (P0.4); read-only scan view for unauthorized; scan audit log.
- [ ] **AST-7** `AssetHistory` model — immutable, timestamped, prev→new + user; status filter.

## Phase 5 — Epic 5 (Events)

- [ ] **EVT-2** `Event` model + creation (faculty/admin); Draft state.
- [ ] **EVT-3** Publish/unpublish/categorize; student listing + category filters.
- [ ] **EVT-4** `EventRegistration` model; eligibility/seat/duplicate checks.
- [ ] **EVT-5** Waitlist queue + auto-promotion + notifications.
- [ ] **EVT-6** QR check-in (P0.4); registered-only, no-duplicate, timestamped, live count.
- [ ] **EVT-7** `EventFeedback` model; attendee-only feedback; participation report + download.

## Phase 6 — Epic 6 (Analytics & Notifications)

- [ ] **ANA-2** Notification history view + per-notification read controls.
- [ ] **ANA-3** Configurable notification triggers + email delivery (P0.5); delivery-status + failure log.
- [ ] **ANA-4** Student analytics report (filters + charts + access control). *(needs Phase 1)*
- [ ] **ANA-5** Facility utilization report + export. *(needs Phase 3)*
- [ ] **ANA-6** Maintenance KPI dashboard. *(needs Phase 2, esp. MNT-5 SLA)*
- [ ] **ANA-7** Asset + event analytics + PDF/Excel export. *(needs Phases 4 & 5)*

---

**Per-story Definition of Done** (mirrors the spec's QA/UAT `*-8` stories): all
acceptance criteria met, a colocated `*.test.ts` for any new validator/pure
logic, role-based access enforced via session guards, and outcomes surfaced
through `ActionToast`.
