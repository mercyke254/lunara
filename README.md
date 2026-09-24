# Lunara

**Understand your cycle. Understand yourself.**

Lunara is a full-stack menstrual and women's wellness tracking application: period
and cycle tracking, daily symptom and mood logging, wellness trends, fertility
estimates, pregnancy mode, an education hub, reminders, and a privacy centre with
real data export and deletion.

It is built with Next.js (App Router), TypeScript, Tailwind CSS v4, shadcn/ui-style
components, Recharts, Prisma 7, and Neon PostgreSQL.

> **Lunara is an original application.** It is inspired by the general *functionality*
> of women's wellness trackers, but shares no branding, logo, copy, illustration,
> or visual design with any existing product. The mark, palette, wording, and
> information architecture are original.

---

## Table of contents

- [What Lunara does](#what-lunara-does)
- [Medical safety and scope](#medical-safety-and-scope)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Database](#database)
- [Scripts](#scripts)
- [Architecture](#architecture)
- [Security model](#security-model)
- [Privacy and data retention](#privacy-and-data-retention)
- [The cycle calculation engine](#the-cycle-calculation-engine)
- [PWA behaviour](#pwa-behaviour)
- [Deployment](#deployment)
- [Verification](#verification)
- [Known limitations](#known-limitations)
- [Project structure](#project-structure)

---

## What Lunara does

| Area | What it does |
| --- | --- |
| **Cycle tracking** | Record period start/end, edit and delete past entries, recompute cycle lengths from history. |
| **Dashboard** | Cycle day, current phase, estimated next period, days remaining, estimated fertile window and ovulation, recent symptoms and mood. |
| **Calendar** | A full month grid showing recorded periods, predicted periods, estimated fertile windows, estimated ovulation, and today — plus a per-entry editor. |
| **Daily logging** | 11 symptoms with optional 1–5 intensity, 8 moods, body metrics (weight, basal temperature, sleep, energy), lifestyle (water, movement, exercise intensity, sleep quality, stress), free-text notes, and private-by-default sexual-health tracking. |
| **Insights** | Average/shortest/longest cycle, period duration, variability, trend direction, symptom frequency, mood distribution, symptoms grouped by cycle phase, and wellness trends — each with a plain-language explanation. |
| **Fertility** | Estimated fertile window, ovulation date, and phase, with an uncertainty band; supports recording your *own* observations (e.g. a positive ovulation test) separately from predictions. |
| **Pregnancy mode** | Estimated due date, week-by-week progress, trimester, a milestone timeline, appointment reminders, and weekly general information. |
| **Wellness** | Sleep, hydration, movement, energy, and stress, charted over time with a one-tap water log. |
| **Reminders** | Six reminder types, each individually switchable, with an in-app notification inbox. |
| **Education hub** | 11 categories and a seeded library of original articles, with related-article navigation. |
| **Search** | One search across articles, symptoms, moods, cycle concepts, and your own notes. |
| **Privacy centre** | JSON export, active session management, privacy preferences, password change, security-question change, and account deletion. |
| **Admin** | Anonymous aggregate statistics plus full article and category management. |
| **PWA** | Installable, with a manifest, maskable icons, and an offline shell. |

---

## Medical safety and scope

This is a tracking and wellness application. It is built to be explicit about what
it does *not* know, and the constraint is enforced in code rather than only in
copy:

- **Estimates are always labelled as estimates.** Every predicted date is
  accompanied by an uncertainty band derived from the user's own cycle variation,
  and a low-confidence prediction says so.
- **Fertility predictions carry a contraception warning** wherever they appear.
  Calendar-based estimates are not a contraceptive method, and Lunara says so at
  the top of the fertility screen rather than in a footnote.
- **Irregular cycles widen the error band** instead of producing a falsely
  confident single date, and the app states that it has done so.
- **No diagnosis, no causation.** The insight text describes what the numbers
  show and never explains why, never uses diagnostic framing ("normal",
  "abnormal", "a sign of"), and never suggests a cause or treatment.
- **Observed and computed data are stored separately.** A user-recorded ovulation
  marker is never overwritten by a recalculation, and predictions are never
  presented as observations.
- **Escalation copy** for potentially serious symptoms directs users to a
  healthcare professional, with a specific urgent-care list.

All disclaimer text lives in `lib/constants.ts` so the required wording is
identical everywhere it appears.

---

## Tech stack

| Layer | Choice | Notes |
| --- | --- | --- |
| Framework | **Next.js 16** (App Router, Turbopack) | `proxy.ts` for the request boundary (Next 16 renamed `middleware.ts`). |
| Language | **TypeScript** 5.9, `strict` | |
| UI | **React 19**, **Tailwind CSS v4** (CSS-first config) | No `tailwind.config.ts` — tokens live in `app/globals.css` under `@theme inline`. |
| Components | **shadcn/ui** convention, hand-written | Radix primitives + `cva` + `tailwind-merge`, in React 19 idiom (`ref` as a prop). |
| Icons | **lucide-react** | |
| Charts | **Recharts** 3 | Client components fed by server-aggregated data. |
| Backend | **Server Actions** + **Route Handlers** | |
| Validation | **Zod** 4 | Every action and handler validates before touching the database. |
| ORM | **Prisma** 7.10 | Rust-free client, driver adapter, `prisma.config.ts`. |
| Database | **Neon PostgreSQL** | The only supported database. |
| Hashing | **bcryptjs** cost 12 | Argon2id is also allowed by the brief; bcrypt was chosen because it needs no native toolchain, so builds and cold starts stay portable. |
| Dark mode | **next-themes** | Class-based, token-driven. |
| Toasts | **sonner** | |
| Fonts | **Inter** + **Fraunces** via `next/font` | Self-hosted at build time; no runtime request to Google. |

### Why these specific versions

Prisma's `latest` npm tag currently points at an **8.0.0 release candidate**, while
`@prisma/client` latest is `7.10.0`. Installing `latest` for both would pair an RC
CLI with a stable client, so the project pins `prisma` and `@prisma/client` to
`7.10.0` explicitly. Prisma 7 also requires a generator `output`, a
`prisma.config.ts`, `"type": "module"`, and a driver adapter — all of which are
configured here.

---

## Getting started

### Prerequisites

- **Node.js 20.19+** (22.x recommended) — required by Prisma 7 and Next 16
- A **Neon PostgreSQL** database ([neon.tech](https://neon.tech)) — the free tier is sufficient

### 1. Install dependencies

```bash
npm install
```

### 2. Configure the environment

```bash
cp .env.example .env
```

Then fill in two required values:

- **`DATABASE_URL`** — the **pooled** Neon connection string (its host contains
  `-pooler`). It must end with `?sslmode=require`.
- **`AUTH_SECRET`** — at least 32 characters of high-entropy randomness:

```bash
openssl rand -base64 48
```

> `AUTH_SECRET` underpins session integrity and the keyed hashing of IP addresses.
> Changing it invalidates every existing session, so set it once per environment
> and keep it stable.

### 3. Create the schema

```bash
npm run db:push        # fastest path for a fresh database
# or, for a versioned history:
npm run db:migrate
```

### 4. Seed reference data and the demo account

```bash
npm run db:seed
```

This seeds the security-question catalogue, 11 article categories, a library of
original articles, a demo tracking account with ~45 days of sample data, and an
administrator account. It refuses to run when `NODE_ENV=production` unless you set
`ALLOW_SEED=1`.

### 5. Run it

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Demo credentials

Created by the seed script, for local development only:

| Role | Email | Password |
| --- | --- | --- |
| User | `demo@lunara.demo` | `Lunara!Demo2026` |
| Admin | `admin@lunara.app` | `Lunara!Admin2026` |

Override these with `SEED_USER_PASSWORD` / `SEED_ADMIN_PASSWORD`. **Never use them
in a deployed environment.**

---

## Environment variables

See [`.env.example`](.env.example) for the annotated version.

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | **Yes** | Neon PostgreSQL connection string (pooled endpoint). |
| `AUTH_SECRET` | **Yes** | Minimum 32 chars. Session integrity and IP pseudonymisation. |
| `NEXT_PUBLIC_APP_URL` | No | Public origin, used for absolute links. Defaults to `http://localhost:3000`. |
| `DIRECT_DATABASE_URL` | No | Unpooled endpoint, if you prefer migrations over a direct connection. |
| `SHADOW_DATABASE_URL` | No | Shadow database for `prisma migrate dev`. |
| `ADMIN_EMAIL` | No | Email promoted to `ADMIN` by the seed script. |
| `SEED_USER_PASSWORD` / `SEED_ADMIN_PASSWORD` | No | Seed account passwords. |
| `RECOVERY_EMAIL_DRIVER` | No | `resend` \| `sendgrid` \| `smtp` \| `disabled` (default). |
| `RESEND_API_KEY`, `SENDGRID_API_KEY`, `RECOVERY_EMAIL_FROM`, `SMTP_*` | No | Credentials for the chosen recovery-email provider. |
| `ALLOW_SEED` | No | Set to `1` to permit seeding a production database. |

**Only two variables are required to run Lunara.** Everything else has a working
default, which is what makes the security-question recovery flow sufficient on its
own.

---

## Database

Neon PostgreSQL is the only supported database. The schema lives in
[`prisma/schema.prisma`](prisma/schema.prisma).

### Model groups

- **Identity and auth** — `User`, `Profile`, `SecurityQuestion`, `UserSecurityAnswer`,
  `Session`, `PasswordRecoverySession`, `AuditEvent`, `RateLimitBucket`
- **Cycle tracking** — `Cycle`, `Period`, `FertilityRecord`
- **Daily logging** — `DailyLog`, `Symptom`, `Mood`, `WellnessLog`, `IntimateLog`
- **Pregnancy** — `Pregnancy`
- **Reminders** — `Reminder`, `Notification`
- **Education** — `Article`, `ArticleCategory`

### Design decisions worth knowing

- **Calendar days are stored as `@db.Date`.** All day-granularity columns avoid
  timestamp timezone drift. The application represents them as `Date` pinned to
  UTC midnight, and `lib/dates.ts` uses `getUTC*` accessors exclusively. This is
  the single most common source of off-by-one-day bugs in cycle trackers, so it is
  settled by convention in one module.
- **Replace-in-place logging.** Saving a daily log upserts the `DailyLog` and then
  replaces its `Symptom`/`Mood` children. The submitted set is a complete snapshot,
  so replacing is idempotent and cannot leave orphaned rows.
- **`Reminder` has a real `@@unique([userId, type])`.** One row per type per user,
  so saving is an upsert that can never accumulate duplicates.
- **`Cycle` is derived from `Period`.** Whenever periods change, the cycle rows are
  rebuilt from the period anchors, so a derived `cycleLength` can never drift from
  the dates it describes.
- **Indexes** are defined on every foreign key and on the access patterns the
  application actually uses (`[userId, date]`, `[published, publishedAt]`, and so on).

### Neon connection notes

Use the **pooled** endpoint for the application. `lib/db/prisma.ts` configures a
small pool (`max: 10`) and restores Prisma 6's 5-second connect timeout, because
the underlying `pg` driver defaults to waiting forever — without it, a cold Neon
compute would surface as a hanging request rather than an error.

---

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the dev server. |
| `npm run build` | `prisma generate && next build`. |
| `npm run start` | Serve the production build. |
| `npm run typecheck` | `tsc --noEmit`. |
| `npm run db:generate` | Regenerate the Prisma client. |
| `npm run db:push` | Push the schema without a migration. |
| `npm run db:migrate` | Create and apply a development migration. |
| `npm run db:deploy` | Apply pending migrations (production). |
| `npm run db:seed` | Seed reference data, articles, and demo accounts. |
| `npm run db:studio` | Open Prisma Studio. |
| `npm run verify:calc` | Run the cycle-engine assertion suite. |

---

## Architecture

### Server-first by default

Lunara leans on React Server Components. Pages query the database directly, and
Client Components exist only where interactivity is genuinely required (forms,
the calendar grid, charts, theme and menu controls). Charts in particular receive
plain serialisable arrays, so all aggregation happens on the server.

### Server Actions for all mutations

Every write is a Server Action in `lib/actions/`, following three rules:

1. The acting user is derived from the session (`getSessionUser()`), never from the
   request body. No action accepts a `userId`.
2. Input is parsed with Zod before any database access.
3. Expected failures return a serialisable `ActionState`; unexpected throws are
   converted to a generic message by `withErrorHandling`, which re-throws Next's
   internal redirect/notFound signals rather than swallowing them.

### Query scoping

`lib/queries/` is the only module that reads user-owned data at scale, and every
function takes `userId` as its first argument and puts it in the `where` clause.
There is exactly one file to audit for the "every user-owned query is scoped by
the authenticated user" requirement.

### Pure calculation engines

`lib/calculations/` has no database access, no React, and no locale formatting:

- `cycle.ts` — forward-looking cycle prediction
- `phase-lookup.ts` — backward-looking phase attribution for past dates
- `pregnancy.ts` — gestational dating
- `insights.ts` — plain-language explanations of the numbers

Because these are pure, they are directly testable (see
[Verification](#verification)) and the calendar can reuse the exact same engine on
the client without a round trip.

---

## Security model

### Passwords

bcrypt at cost 12. The brief allows Argon2id or bcrypt; bcrypt was chosen because it
requires no native toolchain. The policy is a minimum of 8 characters with at least
one uppercase, one lowercase, and one number, enforced in two places that cannot
disagree — the Zod schema and `checkPasswordPolicy`.

Because bcrypt only consumes the first **72 bytes** of input, anything longer is
**rejected** rather than silently truncated. Silent truncation would mean two
different long passphrases authenticating the same account.

### Security-question answers

- Normalised **before** hashing: trimmed, lower-cased, internal whitespace collapsed
  (plus NFKC so visually identical Unicode normalises identically).
- Hashed with bcrypt cost 12. Only the hash is stored.
- Never returned by an API, never placed in a URL, never logged.
- Verification attempts **all** submitted answers rather than short-circuiting, so
  response timing cannot reveal how many were correct.

### Sessions

Stateful, not JWT. A signed cookie cannot be revoked server-side, and "invalidate
existing sessions after a password reset" is an explicit requirement.

A session must satisfy three independent checks: `expiresAt`, `revokedAt`, and the
user-level `sessionsInvalidBefore` / `passwordChangedAt` floors. Only the SHA-256
digest of a 256-bit random token is stored, so a database leak yields nothing
replayable.

### Authentication hardening

- **Account enumeration is prevented in recovery.** The start step returns an
  identical payload and message whether or not the account exists; for an unknown
  address it returns a *decoy* question set and sets a cookie matching no database
  row, so verification fails exactly as a wrong answer would. Every failure message
  is identical.
- **Timing equalisation.** An unknown email still burns a comparable bcrypt
  comparison, so "no such account" is not measurably faster than "wrong password".
- **Rate limiting is persistent** (`RateLimitBucket`), not in-memory — in a
  serverless deployment a per-instance `Map` would multiply the effective limit by
  the instance count. Limits are applied by IP *and* by account, and it fails
  closed.
- **Lockout** after 8 failed sign-ins for 15 minutes.
- **Recovery sessions** live 20 minutes, allow 5 attempts, and have their token
  **rotated** on successful verification so a pre-verification token cannot be used
  to set a password.
- **CSRF** is mitigated by `SameSite=Lax` cookies plus Next's Origin checks on
  Server Actions.

### Data-layer security

- All SQL goes through Prisma, which parameterises queries.
- Every user-owned query is scoped by the authenticated id (`lib/queries/`).
- Ownership failures return "not found" rather than a distinguishable error, so
  endpoints cannot be used as an existence oracle for other users' rows.
- Routes return only explicitly selected fields; no credential or hash is ever
  selected into a response.

### Headers

CSP, `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`,
`Permissions-Policy`, HSTS, and `Cache-Control: no-store` on `/api/*` — set in
`next.config.ts`.

> **Hardening note.** The CSP allows `'unsafe-inline'` for scripts, which Next's
> App Router requires for its inline bootstrap/flight payload. Moving to a
> nonce-based CSP is the next hardening step; it requires wiring a per-request nonce
> through `proxy.ts` and the root layout.

### Audit trail

`AuditEvent` records *that* a sensitive action happened — login, failed login,
logout, sign-out-all, password change, recovery requested/completed, verification
failed, recovery locked, security questions changed, data exported, account deleted.

Credentials are structurally excluded: `metadata` is passed through
`scrubMetadata()`, which drops any key matching a credential pattern, so a
mis-typed field cannot become a persisted secret.

---

## Privacy and data retention

### Data minimisation

- No IP address is ever stored in readable form — only a keyed HMAC digest, and only
  for counting attempts.
- Onboarding asks for what changes what the app shows, and marks optional fields as
  optional. Date of birth and age range can both be skipped.
- Pregnancy mode stores only two dates (the LMP anchor and the due date) — no
  medical history, no test results.
- Sexual-health logs are private by default, excluded from aggregates, and never
  surfaced anywhere in the admin area.

### Export

`GET /api/export` streams a JSON file containing the profile, cycles, periods,
daily logs with symptoms and moods, wellness records, private logs, fertility
records, pregnancies, reminders, notifications, and audit events.

**Never included:** password hashes, security-answer hashes, session token hashes,
recovery token hashes, rate-limit keys, or any server secret. This is enforced
**structurally** — every query in `lib/export/build-export.ts` uses an explicit
`select`, so a newly added secret column cannot silently start appearing in exports.

### Deletion

Account deletion removes every health record, revokes all sessions, and then
**anonymises** the `User` row rather than deleting it: the email is replaced with a
non-routable placeholder and the password hash is overwritten with random data, so
the account can never authenticate again. The tombstone exists because `AuditEvent`
references `User` with `onDelete: SetNull`, and because it prevents the address from
being silently reused in a way that could be inferred from a later registration.

There is also a separate "clear tracking data" operation that removes all health
records while keeping the account — a middle path between export and deletion.

### Admin boundary

Administrators can manage articles and categories and see **anonymous counts only**
(accounts, activity volume, content status). No health data is selectable from any
admin screen. Aggregate symptom or mood statistics are deliberately omitted even
though they would be anonymous on paper: at small user counts an "aggregate" can
describe an individual.

---

## The cycle calculation engine

`lib/calculations/cycle.ts` is pure and fully unit-testable.

**Observed statistics** come from the user's own logs. Cycle lengths are derived
from consecutive period start dates (with gaps outside 15–90 days discarded as
data-entry errors), and regularity is classified from their standard deviation:
`≤2` regular, `≤4` somewhat irregular, `>4` irregular.

**Predictions** anchor to the most recent period start and step forward by the
average cycle length. If that anchor has been overtaken by today, the prediction
rolls forward and the number of whole cycles skipped is reported — so stale data
produces a sensible upcoming date *and* an honest indication that it is stale.

**Ovulation** is derived by counting **back** 14 days from the predicted next
period, rather than forward from the last one. The luteal phase is the more stable
part of the cycle, so this is the more robust direction.

**Uncertainty is first-class.** Every prediction carries `uncertaintyDays` and a
`confidence` level. The wider the observed variation, the wider the band and the
lower the confidence — and with no history the app says it is guessing from the
sign-up details. Irregular cycles therefore produce a visible range rather than
false precision.

---

## PWA behaviour

Lunara ships a manifest, maskable icons, an offline fallback page, and a service
worker. Three deliberate constraints:

1. **Personal health data is never cached.** The service worker caches only
   content-hashed build assets and icons. It never caches `/api/*`, and it never
   caches HTML navigation responses — so no authenticated page is written to disk.
2. **The app is installable, but not usable offline for your data.** The shell and
   the offline page load without a network; your logs do not. That is a deliberate
   trade of convenience for safety, and the offline page says so.
3. **Registration is production-only.** A service worker during development fights
   with hot reload and produces stale-asset confusion that looks like an app bug.

---

## Deployment

Lunara deploys to any Node.js host (Vercel, Railway, Fly.io, a container).

1. Provision Neon and copy the **pooled** connection string.
2. Set `DATABASE_URL`, `AUTH_SECRET`, and `NEXT_PUBLIC_APP_URL`.
3. Apply the schema: `npm run db:deploy` (or `db:push` for a fresh database).
4. Seed reference data. Production seeding is blocked unless `ALLOW_SEED=1`, which
   is intentional — create the security-question catalogue and categories, then
   remove or rotate the demo accounts.
5. Build and start: `npm run build && npm run start`.

The application uses the Node.js runtime (bcrypt and the `pg` driver both require
it), so no edge-runtime configuration is needed. `proxy.ts` runs at the network
boundary and deliberately does **no** database access.

---

## Verification

### What has been checked

```bash
npm run typecheck      # tsc --noEmit, strict — clean
npm run build          # prisma generate && next build — succeeds, 31 routes
npm run verify:calc    # 11 assertions on the cycle engine — all pass
```

The engine suite (`scripts/verify-calculations.ts`) pins the behaviour the UI
depends on: regular-cycle prediction, irregularity widening the error band,
fallback when there is no history, stale-data roll-forward, open-ended period
handling, outlier rejection, trend-slope detection, phase-window coverage without
gaps or overlaps, calendar projection, and the presence of an estimate notice on
every prediction.

### What has NOT been verified

**No migration or seed has been executed against a live database.** This build
environment has no Neon instance, so `prisma db push`, `prisma migrate`, and
`npm run db:seed` have been written and type-checked but not run. The Prisma client
generates successfully and the schema validates, but the first `db push` against a
real Neon database is the remaining step.

---

## Known limitations

Stated plainly rather than buried:

1. **No background scheduler.** Reminders and notifications are stored, generated
   on demand, and shown in an in-app inbox. Push or email delivery needs an
   external worker (a cron job, a queue consumer, or a platform scheduler), which
   this deployment does not include. Nothing in the UI claims a notification was
   delivered.
2. **Email-based password reset is not enabled.** `PasswordRecoveryService` is a
   complete abstraction with Resend and SendGrid adapters implemented via `fetch`,
   plus an SMTP placeholder. It is disabled by default because the brief requires
   security-question recovery to work without an email provider. Enable it by
   setting `RECOVERY_EMAIL_DRIVER` and its credentials.
3. **SMTP is a stub.** A raw SMTP client needs a socket library (e.g. `nodemailer`);
   rather than hand-roll one, `SmtpRecoveryService` reports "not configured" until
   such a dependency is added.
4. **CSP allows inline scripts.** See the hardening note in
   [Security model](#security-model).
5. **PWA icons are SVG.** These work in Chrome, Edge, and Firefox. Some older iOS
   versions prefer PNG; generate PNG fallbacks before shipping to a broad mobile
   audience.
6. **No automated end-to-end tests.** Verification is the type-checker, the
   production build, and the unit assertions on the calculation engine.
7. **Notification generation is pull-based.** Opening the reminders screen
   materialises due notifications. Without a scheduler this is the only trigger.

---

## Project structure

```
lunara/
├── app/
│   ├── (auth)/                     # Unauthenticated account screens
│   │   ├── login/  register/  forgot-password/
│   │   └── recover-account/  reset-password/
│   ├── (app)/                      # Authenticated app shell
│   │   ├── dashboard/  calendar/  log/  insights/  wellness/
│   │   ├── fertility/  pregnancy/  reminders/  search/
│   │   └── profile/  settings/  privacy/
│   ├── admin/                      # Admin area (its own layout + guard)
│   │   ├── articles/[id]/  articles/new/  categories/
│   ├── api/                        # export/  health/
│   ├── education/[slug]/           # Public education hub
│   ├── onboarding/                 # Wizard (own layout, no nav chrome)
│   ├── offline/                    # Precached service-worker fallback
│   ├── layout.tsx  page.tsx  error.tsx  not-found.tsx  manifest.ts
│   └── globals.css                 # Tailwind v4 tokens + brand design system
├── components/
│   ├── ui/                         # shadcn-style primitives
│   ├── auth/  forms/  admin/  privacy/  education/  pwa/
│   ├── calendar/  charts/  dashboard/  marketing/  navigation/
│   ├── brand/                      # Original logo, theme controls
│   └── shared/                     # PageHeader, EstimateNote, disclaimers, …
├── lib/
│   ├── actions/                    # Every Server Action, by domain
│   ├── auth/                       # password, session, current-user, recovery/
│   ├── calculations/               # cycle, phase-lookup, pregnancy, insights
│   ├── db/                         # Prisma client (lazy proxy + pg adapter)
│   ├── export/                     # Data export builder
│   ├── queries/                    # Scoped read models + search
│   ├── security/                   # normalize, tokens, ip, rate-limit, audit
│   ├── validation/                 # Zod schemas + inferred types
│   ├── constants.ts  dates.ts  utils.ts
│   └── generated/prisma/           # Generated client (gitignored)
├── prisma/
│   ├── schema.prisma  seed.ts
├── public/
│   ├── icons/  sw.js
├── scripts/
│   └── verify-calculations.ts      # Engine assertion suite
├── proxy.ts                        # Next 16 request boundary
├── prisma.config.ts                # Prisma 7 CLI configuration
├── next.config.ts                  # Security headers, CSP
└── .env.example
```

> **Note on route groups.** The `(app)` and `(auth)` folders are Next.js route
> groups: they group routes under a shared layout **without** affecting the URL.
> Every path is exactly as it reads — `/dashboard`, `/calendar`, `/privacy` — and
> the grouping exists so the authenticated shell and the unauthenticated card
> layout each live in one place.

---

## License and originality

Lunara is an original application. The name, tagline, logo mark, colour system,
component design, copy, article content, and information architecture were all
created for this project. It does not reproduce the branding, logo, UI, text,
illustrations, proprietary content, or visual design of any existing product.

The interface is deliberately restrained rather than conventionally "pink": a soft
lavender primary, soft-blue and muted-rose accents, airy light surfaces, rounded
cards, and a full dark theme.
