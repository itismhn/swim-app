# Swim academy platform (آکادمی شنا)

A runnable web app for a swim academy that trains teenage and competitive swimmers. It is in Persian, fully right-to-left, mobile-first, shows Jalali dates and uses the Asia/Tehran time zone. All data is stored in PostgreSQL.

> **All demo data is synthetic.** Every seeded person is fictional, flagged `isSample`, and labelled «(نمونه)» in the UI.

Design docs: [sitemap](docs/sitemap.md) · [user journeys](docs/user-journeys.md) · [permissions matrix](docs/permissions.md) · [data model](docs/data-model.md)

## Stack
- **Next.js 15** (App Router, Server Components, Server Actions) + **TypeScript** + **Tailwind CSS v4**
- **PostgreSQL 16** + **Prisma 6** ORM
- **zod** validation on every server action, **recharts** for charts, **Vazirmatn** font bundled locally (no CDN)
- **Vitest** for unit and integration tests
- Custom session auth:
  - bcrypt password hashing (cost 12)
  - a random 256-bit token held in an httpOnly, SameSite=Lax cookie (Secure in production); the database stores only its SHA-256 hash
  - server-side expiry
  - a login throttle
  - forced re-login when a user's role or password changes or the account is deactivated

## Install and run
Requires Node 20+ and a running PostgreSQL server.

```bash
npm install
```

```bash
cp .env.example .env
```

Edit `.env`: set your Postgres user in `DATABASE_URL` and `DATABASE_URL_TEST`, and set `SEED_DEMO_PASSWORD`. Then create the two databases:

```bash
createdb swim_dev
```

```bash
createdb swim_test
```

Apply the migrations and load the sample data:

```bash
npm run db:migrate
```

```bash
npm run db:seed
```

Start the dev server:

```bash
npm run dev
```

Open http://localhost:3000. Every demo account uses the password you set in `SEED_DEMO_PASSWORD`:

| Role | Email |
|---|---|
| Academy admin | `admin@example.com` |
| Head coach | `head@example.com` |
| Group coach (competition team) | `coach1@example.com` |
| Group coach (two other groups) | `coach2@example.com` |
| Nutrition professional | `nutrition@example.com` |
| Athlete | `athlete1@example.com` … `athlete12@example.com` |
| Guardian (verified) | `parent1@example.com` … `parent5@example.com` |
| Guardian (link still **pending**) | `parent6@example.com` |

Other database commands:
- `npm run db:reset` drops, re-migrates and re-seeds the dev database.
- `npm run db:deploy` applies migrations in production.
- Re-running `npm run db:seed` wipes the dev database and reloads the sample data.

Production build:

```bash
npm run build && npm start
```

## Tests
```bash
npm run test:db:prepare
```

```bash
npm test
```

`npm run test:db:prepare` applies the migrations to `swim_test` and only needs to run once. `npm test` runs the unit and integration tests. The integration tests refuse to run unless the database URL contains `swim_test`, and they wipe that database on every run.

| File | Covers |
|---|---|
| `tests/unit/volume.test.ts` | Workout volume, including **20 m + 5 m = a 25 m rep** in a 25 m pool, rounds × reps, the warning when a rep doesn't end at a wall, and planned vs. actual |
| `tests/unit/attendance.test.ts` | Attendance rate **excluding cancelled sessions**, the excused-absence option, and sessions with no record |
| `tests/unit/performance.test.ts` | PBs **only among comparable results** (25 m vs 50 m pools, other strokes and distances), the official-only option, new-PB detection, and time parsing and formatting |
| `tests/unit/jalali.test.ts` | Jalali↔Gregorian conversion round-trip, invalid dates, and the Tehran offset |
| `tests/integration/authz.test.ts` | Against the real DB: **athlete X cannot load athlete Y's profile or results**; coach A cannot see, edit, take attendance for or assign plans to group B; a guardian whose link is pending is denied; nutritionists see only requests assigned to them; athletes never see draft plans |

Current result: 28 tests passing. `next build` and `tsc --noEmit` both run clean.

## Project structure
```
prisma/schema.prisma          data model (~40 models)
prisma/migrations/            SQL migrations
prisma/seed.ts                synthetic sample data
src/server/authz.ts           ★ authorization policy (all athlete-scoped queries go through it)
src/server/auth.ts            sessions, login throttle, requireViewer()
src/server/action-guard.ts    server-action wrapper: session + role + zod/authz error handling
src/server/audit.ts           audit trail
src/server/notify.ts          in-app notifications
src/server/notify-external.ts SMS / email stubs (NOT configured)
src/lib/domain/               pure, tested logic: volume, attendance, performance, jalali, labels
src/lib/workout-schema.ts     shared zod schema for the workout builder
src/app/(public)/             public website + registration form
src/app/login/                login / logout
src/app/app/                  authenticated app (dashboards, athletes, groups, calendar, attendance,
                              workouts, dryland, performance, nutrition, messages, notifications, admin)
src/components/               ActionForm, UI primitives, PerformanceChart
tests/                        unit + integration tests
docs/                         sitemap, journeys, permissions, data model
```

## Implemented features
- **Public site:** home, about, coaches and groups, programs, FAQ, contact. The registration/consultation form is validated, has a honeypot field, records consent, and saves to the DB. The admin can edit all public content. No private data is shown.
- **Six roles with server-side authorization.** Records outside a user's scope return the same 404 as missing ones, so editing the ID in a URL reveals nothing.
- **Audit trail** of changes to:
  - athlete profiles and medical data
  - attendance edits
  - guardian verification
  - users and roles, and settings
  - results and targets
  - publishing plans
  - sessions, seasons, inquiries and public content
- **Athletes:**
  - create, edit, search, and filter by group, stroke and membership status
  - specialty and secondary strokes, goals, emergency contact
  - coach notes visible to staff only or shared with the family
  - medical and restriction data in a separate table with restricted access; the first record requires guardian consent, and the values are never copied into the audit log
- **Groups and calendar:**
  - groups, coach assignment, locations, weekly slots
  - session generation from the weekly slots
  - one-off sessions, cancellation and rescheduling, each notifying athletes and guardians
- **Attendance:**
  - a one-tap mobile sheet with five statuses, a "rest present" button and a note per athlete
  - the recorder and time are stored, with full edit history
  - weekly and monthly reports; cancelled sessions are excluded
- **In-water plans:**
  - six section types; each set has rounds × reps × combined segments, stroke, intensity, rest, send-off, equipment (five built-in plus custom), technical focus and coach notes
  - live volume totals while editing, recomputed on the server when saved
  - drafts, publishing to a group or one athlete, and revision history with snapshots
  - athletes log actual metres, RPE and feedback; coaches reply
- **Dryland:**
  - an exercise library with muscle group, description, safety notes and an optional https media link
  - plans for a group or one athlete, with sets, reps, duration, rest and notes
  - athletes log completion and difficulty, and can flag pain, which notifies coaches and guardians
  - the app offers no diagnosis or treatment
- **Nutrition:**
  - general education articles, clearly separated from individual professional replies
  - requests are assigned by the admin; nutritionists see only their assigned requests
  - allergy details need guardian consent (minors cannot enter them)
  - no calorie tracking, restrictive diets or weight-loss goals
- **Performance:**
  - each result stores stroke, distance, course, time to hundredths, date, venue, type (official or practice), recorder, splits, notes and a baseline flag
  - PBs are computed only among comparable results, and a new PB sends a notification
  - season targets
  - a chart with a reversed axis labelled "lower is better", stars for official races and circles for practice tests, and baseline and target lines
- **Messaging:**
  - threads with read/unread state
  - guardians are added automatically to threads with minors (the admin can turn this off)
  - in-app notifications for published plans, schedule changes, new records, replies, messages and pain flags
- **Dashboards:**
  - admin: active athletes, groups and coaches, upcoming sessions, attendance rate, registration and consultation requests, pending guardian links, report links
  - coach: today's sessions with quick attendance, upcoming sessions, drafts, unanswered messages, pain flags, group performance trends
  - athlete and guardian: next session, published plans, attendance, recent records, chart, notifications, messages
  - nutritionist: assigned requests
- **Seasons:** goals, editable milestones (weeks 8 and 16 are seeded), target competitions, and an active season.
- **Configurable settings:** pool length, sessions per week, session length, guardian oversight, and whether excused absences count.
- **UX:**
  - RTL Persian throughout, Persian digits, Jalali dates input and displayed in the Tehran time zone
  - responsive layout with a bottom tab bar on phones and 44 px+ tap targets
  - loading skeletons, error boundary, empty states, inline field errors
- **Security headers:** X-Frame-Options DENY, nosniff, Referrer-Policy and Permissions-Policy; the `x-powered-by` header is disabled.

## External services and configuration
| Service | Status |
|---|---|
| PostgreSQL | **Required.** Set `DATABASE_URL` and `DATABASE_URL_TEST`. |
| SMS (`SMS_PROVIDER_API_KEY`, `SMS_SENDER_NUMBER`) | **Not configured.** No provider is integrated; the stubs in `src/server/notify-external.ts` send nothing. |
| Email / SMTP (`SMTP_*`) | **Not configured.** Same as SMS. |

Notifications are **in-app only**. The settings and notification pages say so.

## Known limitations
- **External delivery:** there is no SMS, email or push delivery yet.
- **Login throttling is in memory,** so it works for a single server instance only. Use Redis or similar when running several instances.
- **Messages and notifications update on navigation or refresh;** there is no real-time push (WebSocket/SSE).
- **Exercise media are links only;** there is no file upload or storage.
- **Accounts are created by staff.** There is no self-service sign-up or password-reset email; admins reset passwords. The public form only creates an inquiry.
- **Timetables can't be imported or exported;** sessions come from the weekly slots or are added by hand. Rescheduling one session doesn't change the weekly pattern.
- **The dryland plan form is fixed** at six exercise rows per plan, and dryland plans can't be edited after creation (create a new one instead).
- **The Tehran offset is hard-coded** as a fixed UTC+03:30, since Iran abolished DST in 2022. Display formatting uses `Intl` with `Asia/Tehran`.
- **No automated accessibility audit has been run.** The markup does use labels, roles and focus outlines.
- **Not production-hardened:** no CSP header, no rate limiting beyond login, and no backups or monitoring. Review these before going live.
