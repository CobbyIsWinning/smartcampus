# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

> The line above is intentional: this project pins a pre-release Next.js (`16.2.9`)
> and React 19 with breaking changes from common knowledge. Read the relevant guide
> in `node_modules/next/dist/docs/` before writing framework code.

## Commands

```bash
npm run dev              # start dev server (http://localhost:3000)
npm run build            # runs `prisma generate` (prebuild) then `next build`
npm run start            # serve the production build
npm run lint             # eslint (flat config, eslint.config.mjs)
npm test                 # vitest run (single pass)
npm run test:watch       # vitest in watch mode
npx vitest run app/actions/auth.actions.test.ts   # run a single test file
npm run bootstrap:admin  # promote/create the admin user (see below)
```

Prisma (Prisma 7, config in `prisma.config.ts`, not `schema.prisma`):

```bash
npx prisma generate                         # regenerate client (also auto-run on install/build)
npx prisma migrate dev --name <name>        # create + apply a migration in dev
npx prisma migrate deploy                   # apply migrations in prod
```

`DATABASE_URL` (a Neon Postgres connection string) must be set in `.env` for the
app, tests that hit the DB, migrations, and the admin script. `prisma.config.ts`
and `app/lib/prisma.ts` fall back to a localhost placeholder if it is unset.

## Product scope

The full feature set, story IDs, and the ordered implementation backlog live in
**`BACKLOG.md`** — treat it as the source of truth for what to build. The app is
an early slice: only auth, profiles, maintenance ticketing, notifications, and
admin role management exist today; the spec covers 6 epics (Student Portal,
Facility Booking, Asset Tracking, Maintenance, Events, Analytics & Notifications).
Reference story IDs (e.g. `MNT-2`, `FAC-5`) in commits, branches, and PRs.

## Architecture

A Next.js App Router app for campus maintenance ticketing. Three roles
(`STUDENT`, `ADMINISTRATOR`, `MAINTENANCE_STAFF`) defined as a Prisma enum — the
spec needs three more (`FACULTY`, `MAINTENANCE_SUPERVISOR`, `EVENT_ORGANIZER`);
see Phase 0 in `BACKLOG.md`.

**Data layer.** Postgres via Prisma using the **Neon serverless adapter over a
WebSocket** (`@prisma/adapter-neon` + `ws`, configured in `app/lib/prisma.ts`).
Three models: `User`, `MaintenanceTicket` (requester + optional assignee), and
`Notification`. The Prisma client is a global singleton in dev to avoid
connection churn.

**Auth is hand-rolled — there is no NextAuth/Auth.js.** A session is a random
token stored in two places: the `User.sessionToken`/`sessionExpires` columns and
an httpOnly cookie named `smartcampus_session` (7-day expiry). All of this lives
in `app/lib/session.ts`:
- `getCurrentUser()` — resolves the cookie to a user or `null`.
- `requireUser()` — redirects to `/login` if unauthenticated.
- `requireRole([...])` — redirects to `/dashboard` if the role doesn't match.

Use these guards at the top of every protected Server Component / Server Action.
Passwords are scrypt salted hashes (`salt:hash`) in `app/lib/password.ts` — the
same scheme is reimplemented in `scripts/bootstrap-admin.mjs`, so keep them in
sync.

**Mutations are Server Actions**, grouped by domain in `app/actions/*.actions.ts`
(`"use server"`). The consistent pattern:
1. Guard with `requireUser` / `requireRole`.
2. Pull fields from `FormData` via the local `getString` helper; coerce enums
   with local `parse*` helpers (never trust raw client values).
3. Validate with a pure function from `app/lib/validation.ts` (returns
   `{ ok: true } | { ok: false, error }`).
4. On failure, `redirect` back with an `?error=<code>` query param.
5. On success, `revalidatePath(...)` the affected routes and `redirect` with a
   success query param (e.g. `?ticket=created`).

**User feedback uses query params, not return values.** Actions communicate
outcomes by redirecting with query params; the client `ActionToast`
(`app/components/action-toast.tsx`) reads them via `useSearchParams` and fires a
`sonner` toast, then clears the param. Wire new outcomes through this component.

**Validation logic is pure and unit-tested.** `app/lib/validation.ts` and the
action files have colocated `*.test.ts` (vitest, node environment). Tests import
via the `@/` alias (`@` → repo root, set in both `tsconfig.json` and
`vitest.config.ts`).

**UI.** shadcn/ui components in `components/ui/` (radix-sera style, configured in
`components.json`), app-specific components in `app/components/`, Tailwind v4
(config-less, via `@tailwindcss/postcss`; theme tokens in `app/globals.css`).
`next-themes` provides dark mode. Note the two utils locations: `lib/utils.ts`
(the shadcn `cn` helper) vs `app/lib/*` (domain logic).

## Admin bootstrap

New registrations are always `STUDENT` (the role param is parsed but
`registerAction` hardcodes `STUDENT`). Promote a user to admin out-of-band:

```bash
npm run bootstrap:admin                              # promote default admin email
ADMIN_PASSWORD="..." npm run bootstrap:admin         # also set/reset the password
```

Admins then manage roles in-app at `/admin/users`; an admin cannot demote
themselves (guarded in `updateUserRoleAction`).
