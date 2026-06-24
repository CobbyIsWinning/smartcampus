# Smart Campus

A campus operations platform built with the Next.js App Router. It covers
student support, maintenance ticketing, facility booking, asset tracking,
events, and role-based notifications, with an admin console for oversight and
role management.

The full feature set, story IDs, and the ordered implementation backlog live in
[`BACKLOG.md`](./BACKLOG.md) — treat it as the source of truth for what to build.

## Tech stack

- **Next.js 16** (App Router, Server Actions, Turbopack) and **React 19**
- **PostgreSQL** on [Neon](https://neon.tech), accessed via **Prisma 7** using the
  Neon serverless adapter over WebSockets (`@prisma/adapter-neon` + `ws`)
- **Hand-rolled auth** — a session token stored in an httpOnly cookie and on the
  `User` row (no NextAuth/Auth.js); passwords are scrypt salted hashes
- **Tailwind CSS v4** + **shadcn/ui** (radix) components, with `next-themes` dark mode
- **Vitest** for unit tests

## Prerequisites

- Node.js 20+
- A Neon Postgres database (the app uses the Neon serverless driver, so a Neon
  `…neon.tech` endpoint is required — not a plain local Postgres)

## Getting started

1. **Install dependencies** (also generates the Prisma client via `postinstall`):

   ```bash
   npm install
   ```

2. **Configure environment.** Copy `.env.example` to `.env` and fill in your Neon
   connection string:

   ```bash
   cp .env.example .env
   ```

   | Variable | Required | Purpose |
   | --- | --- | --- |
   | `DATABASE_URL` | ✅ | Neon connection string the app uses at runtime. Use the **pooled** (`-pooler`) endpoint. |
   | `DIRECT_URL` | Recommended | Unpooled Neon endpoint (same string **without** `-pooler`) used by the Prisma CLI for migrations. Neon's pooled endpoint is unreliable for migrations. Falls back to `DATABASE_URL` if unset. |
   | `UNIVERSITY_EMAIL_DOMAINS` | Optional | Comma-separated allowlist to restrict registration email domains. |
   | `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` | Optional | Used only by `npm run bootstrap:admin`. |

3. **Apply migrations** to your database:

   ```bash
   npx prisma migrate deploy
   ```

4. **Run the dev server:**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Database & migrations

Prisma is configured via [`prisma.config.ts`](./prisma.config.ts) (Prisma 7), not
`schema.prisma`. The CLI runs migrations over a **direct TCP connection** and
prefers `DIRECT_URL` when set.

```bash
npx prisma generate                    # regenerate the client (auto-run on install/build)
npx prisma migrate dev --name <name>   # create + apply a migration in dev
npx prisma migrate deploy              # apply pending migrations (prod / CI)
npx prisma migrate status              # show applied vs pending migrations
```

## Admin users

New registrations are always created as `STUDENT`. To promote/create an admin,
set the credentials in your environment and run the bootstrap script:

```bash
npm run bootstrap:admin                         # promote the default admin email
ADMIN_PASSWORD="change-me" npm run bootstrap:admin   # also set/reset the password
ADMIN_EMAIL="you@campus.edu" ADMIN_PASSWORD="change-me" ADMIN_NAME="You" \
  npm run bootstrap:admin                       # create a specific admin
```

If the account already exists it is updated to `ADMINISTRATOR` (password unchanged
unless `ADMIN_PASSWORD` is given). If it doesn't exist, `ADMIN_PASSWORD` is
required (min 8 chars). Administrators then manage roles in-app at `/admin/users`;
an admin cannot demote themselves.

## Scripts

```bash
npm run dev              # start the dev server
npm run build            # production build (prisma generate, then next build)
npm run start            # serve the production build
npm run lint             # eslint (flat config)
npm test                 # vitest run (single pass)
npm run test:watch       # vitest in watch mode
npm run bootstrap:admin  # promote/create the admin user
```

## Testing

Validation logic is pure and colocated with `*.test.ts` files (vitest, node
environment). Tests import via the `@/` alias.

```bash
npm test                                          # run all tests once
npx vitest run app/actions/auth.actions.test.ts   # run a single file
```

## Deploy on Vercel

The app deploys to [Vercel](https://vercel.com). Migrations run automatically on
deploy via the `vercel-build` script, which Vercel runs instead of `build` when
present:

```jsonc
"vercel-build": "prisma generate && prisma migrate deploy && next build"
```

Set these environment variables in **Vercel → Settings → Environment Variables**:

- `DATABASE_URL` — pooled Neon string (the `-pooler` endpoint), for the running app.
- `DIRECT_URL` — same string **without** `-pooler`, used for migrations. Optional
  but recommended; without it migrations fall back to the pooled URL, which can fail.

> A failing migration will fail the build and block the deploy — usually the
> desired behavior, but be aware a bad migration stops a release.
