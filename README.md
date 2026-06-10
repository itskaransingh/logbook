# 📒 Logbook

An internal employee work-tracking app for small teams, built with Expo (React Native + Web) and Supabase. Employees clock in, track focus time, log what they did each hour, and work from a prioritized task list that carries over day to day. Cofounders (admins) get a live team dashboard — while their own activity stays private.

## How it works

### 👤 Employees

- **Sign in** with credentials provided by an admin (no public signup)
- **Clock in / pause / resume / clock out** — worked time and break time are tracked with server-side timestamps (the client clock is never trusted)
- **Focus timer** — Pomodoro-style countdown (25/50/5 min), optionally tied to a task
- **Hourly updates** — log a short note for each hour of the day, as you go or at day's end; editable same-day only, with an "edited" flag
- **Tasks** — create your own tasks with priorities; unfinished tasks automatically carry over to tomorrow ("Carried over" badge); tasks assigned by an admin show an "Assigned" badge

### 🛡️ Admins (cofounders)

- Everything employees have, **plus a Team tab**:
  - Live status for every employee (Working / On break / Done / Not started)
  - Hours worked today and this week
  - Per-day drill-down: session summary, hourly update timeline, task list
  - Assign tasks to any employee
  - Create employee accounts (email + temporary password)
- **Admin data is invisible to everyone else** — employees see only their own data, and admins can't see other admins. Enforced with Postgres Row Level Security, not just UI.

## Tech stack

- **Expo SDK 54** + React Native 0.81 + Expo Router v6 (web, iOS, Android from one codebase)
- **NativeWind v4** (Tailwind CSS)
- **Supabase** — Postgres, Auth, RLS, Edge Functions
- **TypeScript** throughout

## Local development

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Start Supabase** (requires Docker)

   ```bash
   npx supabase start
   npx supabase db reset   # applies migrations + seeds the dev admin
   ```

3. **Configure env** — copy `.env.example` to `.env` and fill in the URL and anon key from `npx supabase status`.

4. **Serve the edge function** (needed for creating employee accounts)

   ```bash
   npx supabase functions serve admin-create-user
   ```

5. **Run the app**

   ```bash
   npm run web      # or: npm run ios / npm run android
   ```

6. **Sign in** as the seeded local admin: `admin@logbook.dev` / `password123`. Create employee accounts from the Team tab.

## Production setup

1. Push migrations to your hosted project: `npx supabase db push`
2. Deploy the edge function: `npx supabase functions deploy admin-create-user`
3. Disable signups in the dashboard (Authentication → Sign In / Up), matching `config.toml`
4. Create the first admin in the dashboard (Authentication → Users → Add user), then promote it:
   ```sql
   update public.profiles set role = 'admin' where id = '<user-id>';
   ```

## Project structure

```
src/
├── app/
│   ├── (auth)/index.tsx          # Sign in (no signup)
│   ├── (tabs)/
│   │   ├── index.tsx             # Today: clock, focus timer, hourly updates
│   │   ├── tasks.tsx             # Task list with carry-over
│   │   ├── account.tsx           # Profile + sign out
│   │   └── admin/                # Admin-only (hidden tab + redirect + RLS)
│   │       ├── index.tsx         # Team dashboard
│   │       ├── [id].tsx          # Employee day drill-down
│   │       └── new-user.tsx      # Create employee account
│   ├── components/logbook/       # ClockCard, FocusTimer, HourlyTimeline, ...
│   ├── hooks/                    # useWorkSession, useTasks, useHourlyUpdates, useEmployees
│   ├── lib/                      # date/time helpers
│   └── types/logbook.ts          # Row types
context/SessionProvider.tsx        # Session + profile/role context
supabase/
├── migrations/                    # Schema, RLS, RPCs
├── functions/admin-create-user/   # Admin-only account creation
├── functions/openai/              # Kept for future AI digests
└── seed.sql                       # Local dev admin
```

## Data model

| Table            | Purpose                                                               |
| ---------------- | --------------------------------------------------------------------- |
| `profiles`       | User info + `role` (`admin` / `employee`)                              |
| `work_sessions`  | One per user per day: clock-in/out, status                             |
| `session_breaks` | Pause/resume intervals within a session                                |
| `hourly_updates` | One note per (user, day, hour), same-day editable                      |
| `tasks`          | Assignee, creator, priority, status; carry-over computed at read time  |

`session_summaries` is a view that computes total/break seconds per session. The RPCs `clock_out` and `end_break` close timestamps server-side.

## Roadmap ideas

- AI daily digests of hourly updates for admins (the `openai` edge function is kept for this)
- Push/email reminders to log updates or clock out
- CSV export of weekly hours
- Live dashboard via Supabase Realtime
