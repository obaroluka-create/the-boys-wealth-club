# The Boys Wealth Club

A private investment platform for a members' club. Investors hold units in one shared
("collective") book; administrators issue accounts, record deposits and dividends, and record
the book's performance.

- **Frontend:** Next.js 16 (App Router), React 19, Tailwind CSS 4, shadcn/Radix UI, Recharts.
- **Backend:** Next.js route handlers under `/api`, PostgreSQL via Drizzle ORM, Zod validation,
  Argon2 password hashing, httpOnly cookie sessions.

## Running locally

```bash
npm install
```

The app runs in one of two modes, chosen by `NEXT_PUBLIC_API_URL` (see `.env.example`):

| Mode | Setting | Data |
|---|---|---|
| Real backend | `NEXT_PUBLIC_API_URL=/api` in `.env.local` | Database via the API routes |
| Mock (no backend) | `NEXT_PUBLIC_API_URL` unset | In-browser demo data (`src/data/mock`) |

### With the real backend

Without `DATABASE_URL`, development uses an embedded PostgreSQL (PGlite) stored in
`.data/pglite`. It needs no installation and is migrated automatically.

```bash
echo "NEXT_PUBLIC_API_URL=/api" > .env.local
npm run db:seed-demo      # optional: load the demo investors and price history
npm run dev
```

Stop the dev server before running `db:*` scripts against PGlite; only one process can open it.
Delete `.data/` to start over with an empty database.

To use a real PostgreSQL server instead, add `DATABASE_URL=postgres://…` to `.env.local` and run
`npm run db:migrate`.

### Demo accounts

After `npm run db:seed-demo` (or in mock mode), every demo account uses the password `Meridian2026!`:

- Investor: `luka.obaro@meridian.private`
- Admin: `anthony.gozie@meridian.private`

In mock mode the sign-in page also offers one-click demo shortcuts. They are hidden when the real
API is in use.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Next.js development, production build, production server |
| `npm run lint` | ESLint |
| `npm test` | Backend tests (Vitest, in-memory PGlite) |
| `npm run db:generate` | Generate a SQL migration after changing `src/server/db/schema.ts` |
| `npm run db:migrate` | Apply migrations (`DATABASE_URL`, or local PGlite) |
| `npm run db:create-admin` | Create an administrator: `ADMIN_EMAIL=… ADMIN_NAME="…" npm run db:create-admin` prints a one-time password |
| `npm run db:seed-demo` | Load demo data into an empty development database (refuses in production) |

## Architecture

```
Browser (React pages)
   │  src/services/* ── fetch /api/… (httpOnly session cookie)
   ▼
Next.js app
 ├─ src/proxy.ts           sends visitors without a session cookie to /login
 ├─ src/app/api/**/route.ts thin HTTP layer: validate input, check role, call the domain
 ├─ src/server/http.ts      error handling, same-origin check, auth helpers
 ├─ src/server/domain/*     auth, users, ledger (book, deposits, dividends, reports), audit
 ├─ src/server/money.ts     exact integer money and unit maths
 └─ src/server/db/*         Drizzle schema and connection; migrations in /drizzle
   ▼
PostgreSQL
```

UI components only import from `src/services`, never from the mock data or the server.

### API

All routes live under `/api` and return JSON. Errors are `{ "message": "…" }` with a matching
HTTP status. Investors can only reach their own `/users/:id/*` records; everything that changes
money or accounts is admin-only.

| Endpoint | Who |
|---|---|
| `POST /auth/login` → `{ session }` and sets the session cookie | anyone |
| `POST /auth/logout`, `GET /auth/session` (→ `Session` or `null`) | anyone |
| `POST /auth/password` (change own password) | signed in |
| `POST /auth/password-reset` (request; admins follow up) | anyone |
| `GET /users` (paginated, filter, sort), `POST /users` → `{ user, temporaryPassword }` | admin |
| `GET /users/:id`, `PATCH /users/:id` (investors: own photo only) | self or admin |
| `PATCH /users/:id/status`, `POST /users/:id/password` → `{ temporaryPassword }` | admin |
| `GET /users/:id/portfolio`, `/performance?range=`, `/deposits`, `/dividends`, `/transactions` | self or admin |
| `POST /users/:id/deposits`, `POST /users/:id/dividends` | admin |
| `GET /book` | signed in |
| `PATCH /book` `{ profitPercent, lossPercent }`, `GET /book/valuations` | admin |
| `GET /leaderboard` (UUIDs and balances only) | signed in |
| `GET /portfolios`, `GET /dividends`, `GET /transactions`, `GET /admin/analytics` | admin |

## Accounting model: units in a collective book

Every investor holds units in one shared book, the way a mutual fund works.

- The book has a unit price (₦1,000 at launch).
- A deposit buys units at the unit price in effect when it is recorded. `units` and `unitPrice`
  are stored on each deposit and never change afterwards.
- `PATCH /book` takes `{ profitPercent, lossPercent }` for one period. It records a valuation and
  moves the unit price by `profitPercent − lossPercent`. Nobody's units change.
- Balance = units held × current unit price.
- `totalProfit` is the sum of gains from price rises while units were held; `totalLoss` is the
  matching sum of falls. `totalProfit − totalLoss` always equals `currentBalance − totalDeposit`.
- Performance history comes from replaying deposits against the valuation history.
- Dividends are recorded separately and never change the balance.

Because units are bought at the current price, new money only shares in performance recorded
after it arrives. Per-investor profit/loss or balance edits are not part of the product model.

The server (`src/server/money.ts`) stores money as integers: kobo for amounts, micro-units for
units, ten-thousandths of a naira for prices. Ledger rows are append-only and balances are always
derived from them. `src/utils/unitAccounting.ts` mirrors the rules with floats for the mock.

## Security

- Accounts are issued by administrators only, with a one-time password the user must replace at
  first sign-in. Admins can issue a new one-time password at any time (this signs the user out).
- Passwords are hashed with Argon2 and must be at least 10 characters with letters and numbers.
- Sessions are random tokens in an httpOnly, SameSite=Lax cookie (Secure in production); only a
  SHA-256 hash is stored. "Remember me" lasts 30 days, otherwise 12 hours.
- Five failed sign-ins lock an account for 15 minutes. Unknown accounts and wrong passwords get
  the same response.
- Every API route checks the session and role against the database. Cross-site writes are
  rejected by an Origin check, and request bodies must be JSON.
- Disabling a user or changing their password signs them out everywhere.
- Every admin action and ledger change is written to the audit log (shown as activity history).

## Deploying

1. Provision PostgreSQL and set `DATABASE_URL`. PGlite is refused in production.
2. Set `NEXT_PUBLIC_API_URL=/api` at build time.
3. Run `npm run db:migrate`, then `npm run db:create-admin` for the first administrator.
4. `npm run build && npm start` (or deploy to a Node host such as Vercel). Serve over HTTPS.

Still to do before handling real money: off-site database backups, IP-based rate limiting on
sign-in and password-reset requests, moving profile photos from the database to object storage,
and optionally two-factor sign-in for administrators.
