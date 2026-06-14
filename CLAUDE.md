# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this app is

Logbook is a React Native (Expo) employee time-tracking app. Employees clock in/out, log hourly updates, and manage tasks with time estimates. Admins can see all employee data and assign tasks. Backend is Supabase (Postgres + Auth + Edge Functions).

## Commands

```bash
# Start dev server (opens QR code for Expo Go)
npm start

# Platform-specific
npm run android
npm run ios
npm run web

# Tests (watch mode)
npm test

# Run a single test file
npx jest path/to/file.test.ts

# Supabase local dev
supabase start          # start local Postgres + Auth
supabase db reset       # wipe and reapply all migrations from scratch
supabase db push        # apply pending migrations to remote

# Type generation from local DB
supabase gen types typescript --local > types/supabase.ts

# EAS builds (APK for all profiles)
eas build --profile development --platform android
eas build --profile preview --platform android
```

## Environment variables

Copy `.env.example` to `.env`. Two required vars (prefixed `EXPO_PUBLIC_` so they're bundled into the client):

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

For Supabase Edge Functions, set `OPENAI_API_KEY` in `supabase/.env.local` (see `supabase/.env.local.example`).

## Architecture

### Routing (`src/app/`)

Expo Router file-based routing. Two protected route groups:

- `(auth)/` — shown when there is no session (login screen)
- `(tabs)/` — shown when authenticated; contains Today (`index`), Tasks, Admin, Account tabs

The root `_layout.tsx` wraps everything in `<SessionProvider>` and uses `Stack.Protected` guards to redirect between auth/tabs based on session state. The `isAdmin` flag in SessionProvider controls whether the Admin tab is visible.

### Auth & Session (`context/SessionProvider.tsx`)

Single context that holds: the Supabase `Session`, the user's `Profile` row (including `role`), and a derived `isAdmin` boolean. It blocks the splash screen until both the auth session and profile fetch have resolved, so no screen ever renders with an unknown role. Import `useSession()` everywhere role or user-id is needed.

### Supabase client (`lib/supabase.ts`)

Singleton Supabase client. Uses `AsyncStorage` for session persistence on native; falls back to supabase-js defaults on web (which handles SSR/browser itself).

### Data hooks (`src/hooks/`)

All data fetching lives in custom hooks. Each hook uses `useFocusEffect` to fetch on screen focus and sets a polling interval (30s for sessions/tasks, 10s for task timers). Hooks return state + mutation functions that call Supabase directly and then call `refresh()`.

Key hooks:
- `useWorkSession` — clock-in/out, pause/resume, today's sessions and breaks. Clock-out and break-end timestamps come from server-side RPCs (`clock_out`, `end_break`) — the client never writes timestamps.
- `useTasks` — task CRUD for today's and upcoming tasks. Detects overtime when completing a timed task and signals the caller to show the overtime reason modal instead of immediately marking done.
- `useTaskTimer` — per-task time entries (multiple timers can run simultaneously). Stop uses the `stop_task_timer` RPC.
- `useHourlyUpdates` — one text entry per clock-hour per day.
- `useEmployees` — admin-only: fetch all employee profiles.
- `useUserStatus` — emoji+label status picker.

### Styling

NativeWind (Tailwind for React Native). Use `className` props everywhere. The `src/utils/cn.ts` helper merges class names (`clsx` + `tailwind-merge`). Global CSS is imported in `src/app/_layout.tsx`.

### Database schema

RLS is the data boundary. Two SQL helper functions control visibility:
- `is_admin()` — returns true if the caller's profile has `role = 'admin'`
- `can_view_user(target)` — true if `target = auth.uid()` OR (caller is admin AND target is an employee). Admin rows are invisible to other admins.

Work sessions support multiple clock-in/out cycles per day (the unique constraint on `user_id, work_date` was dropped in migration `20260612000001`). `workSession` in `useWorkSession` always refers to the most recent session.

Tasks have `planned_for` (YYYY-MM-DD local date), optional `estimated_minutes`, and `overtime_reason`. The `completed_at` column is set/cleared by a DB trigger on status change, never by the client.

Migrations live in `supabase/migrations/` in chronological order and are the authoritative schema source.

### Edge Functions (`supabase/functions/`)

- `admin-create-user` — creates a Supabase auth user (admin-only action not possible from the anon key)
- `openai` — proxies OpenAI requests server-side

### Path aliases

`tsconfig.json` sets `@/*` → repo root. Components use `@/src/...`, `@/context/...`, `@/lib/...`.
