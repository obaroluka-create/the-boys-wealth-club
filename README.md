# Backend integration

This frontend talks to data only through `/src/services`. Mock implementations live behind that boundary until `NEXT_PUBLIC_API_URL` is set.

## Replace mocks with APIs

1. Keep the function signatures in `src/services/*.service.ts`.
2. Set `NEXT_PUBLIC_API_URL` (see `.env.example`). `callService` will send `Authorization: Bearer <token>` and JSON bodies.
3. Leave UI components unchanged — they never import `/src/data/mock`.
4. Login stores only an access token. `GET /auth/session` must return the current `Session`.
5. `src/utils/unitAccounting.ts` and `src/utils/investmentCalculations.ts` are frontend reference implementations of the formulas. The server must own these calculations.

Suggested mapping:

| Service | Likely endpoints |
|---|---|
| `auth.service.ts` | `POST /auth/login`, `POST /auth/logout`, `GET /auth/session`, `POST /auth/password-reset` |
| `users.service.ts` | `GET/POST /users`, `GET/PATCH /users/:id`, `PATCH /users/:id/status` |
| `investments.service.ts` | `GET /users/:id/portfolio`, `GET /users/:id/performance`, `GET/POST /users/:id/deposits`, `POST /users/:id/dividends`, `GET/PATCH /book`, `GET /book/valuations` |
| `dividends.service.ts` | `GET /dividends` |
| `leaderboard.service.ts` | `GET /leaderboard` |
| `transactions.service.ts` | `GET /users/:id/transactions` |
| `analytics.service.ts` | `GET /admin/analytics` |

`POST /auth/login` should return `{ session, token }`.

## Accounting model: units in a collective book

Every investor holds units in one shared book, the way a mutual fund works.

- The book has a unit price (₦1,000 at launch).
- A deposit buys units at the unit price in effect when it is recorded. Store `units` and `unitPrice` on each deposit; they never change afterwards.
- `PATCH /book` takes `{ profitPercent, lossPercent }` for one period. It records a valuation and moves the unit price by `profitPercent − lossPercent`. Nobody's units change.
- Balance = units held × current unit price.
- `totalProfit` is the sum of gains from price rises while units were held; `totalLoss` is the matching sum of falls. `totalProfit − totalLoss` always equals `currentBalance − totalDeposit`.
- Performance history (`GET /users/:id/performance`) comes from replaying deposits against the valuation history (`GET /book/valuations`).

Because units are bought at the current price, new money only shares in performance recorded after it arrives. Per-investor profit/loss or balance edits are not part of the product model.

Demo credentials (frontend mock only):

- Investor: `luka.obaro@meridian.private` / `Meridian2026!`
- Admin: `anthony.gozie@meridian.private` / `Meridian2026!`
