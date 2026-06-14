# Logbook Domain Context

## Bounded context

Logbook is a multi-org time-tracking and coordination platform. Teams clock in/out, log hourly updates, manage tasks, and get admin approval on their work. Multiple independent organizations share a single Logbook deployment.

---

## Core terms

### Platform User
A person who signs up with a personal email address. They can create and own multiple Organizations. When they log in, they see an Org Picker listing their organizations before entering one. `profiles.org_id IS NULL` for Platform Users.

### Org Member
A person created by an Owner inside an Organization. Their email is always `username@orgslug.logbook` — it encodes which org they belong to. They belong to exactly one org and land directly inside it on login (no Org Picker). `profiles.org_id` is set to their org's id.

### Owner
A Platform User in the context of an Organization they created. Has full visibility and super_admin powers within that org. The only identity tier that can create new Organizations.

### Organization
A named workspace for a team. Identified by a unique **Org Slug**. Has exactly one Owner. Contains Org Members with roles (employee, admin, super_admin). Data is strictly scoped — members of one org cannot see another org's data.

### Org Slug
The lowercased alphanumeric identifier derived from the org's display name (e.g. "Malhar Comps'26" → `malharcomps26`). Forms the email domain for all Org Members (`@orgslug.logbook`). **Immutable once the org is created** — changing it would orphan all existing member credentials.

### Role (within an org)
Org Members have one of three roles: `employee`, `admin`, `super_admin`. The Owner has super_admin-equivalent access but is a Platform User, not an Org Member.

- **employee** — clocks in/out, logs updates, creates own tasks, sees own data only
- **admin** — everything employee has + team dashboard, task assignment, task/day-wrap approval for assigned employees
- **super_admin** — everything admin has + sees all org members, can manage roles and departments

### Work Session
One clock-in/clock-out cycle on a work date. An employee may have multiple sessions per day (multi-session support). Always scoped to one user in one org.

### Day Wrap
An employee's end-of-day sign-off. Validates all today's tasks are approved, auto-clocks-out, and creates a pending approval record for the admin.

### Task Approval Flow
Tasks move from `todo` → `in_progress` → `pending_approval` → `approved` (or `needs_changes`). Only the employee's assigned admin, an additional approver, or a super_admin can approve.

---

## Identity model

```
Platform User (personal email, org_id IS NULL)
  └── Owner of Organization A
  └── Owner of Organization B

Org Member (username@orgslug.logbook, org_id set)
  └── role: employee | admin | super_admin (within one org)
```

Org creation is the exclusive privilege of Platform Users.
