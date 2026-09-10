# Backend integration

This frontend talks to data only through `/src/services`. Mock implementations live behind that boundary until `NEXT_PUBLIC_API_URL` is set.

## Replace mocks with APIs

1. Keep the function signatures in `src/services/*.service.ts`.
2. Set `NEXT_PUBLIC_API_URL` (see `.env.example`). `callService` will send `Authorization: Bearer <token>` and JSON bodies.
3. Leave UI components unchanged — they never import `/src/data/mock`.
4. Login stores only an access token. `GET /auth/session` must return the current `Session`.
5. `src/utils/investmentCalculations.ts` is a frontend demonstration of the formulas. Recalculate or validate these on the server.

Suggested mapping:

| Service | Likely endpoints |
|---|---|
| `auth.service.ts` | `POST /auth/login`, `POST /auth/logout`, `GET /auth/session`, `POST /auth/password-reset` |
| `users.service.ts` | `GET/POST /users`, `GET/PATCH /users/:id`, `PATCH /users/:id/status` |
| `investments.service.ts` | `GET /users/:id/portfolio`, `GET /users/:id/performance`, `GET/POST /users/:id/deposits`, `POST /users/:id/dividends`, `GET/PATCH /book` |
| `dividends.service.ts` | `GET /dividends` |
| `leaderboard.service.ts` | `GET /leaderboard` |
| `transactions.service.ts` | `GET /users/:id/transactions` |
| `analytics.service.ts` | `GET /admin/analytics` |

`POST /auth/login` should return `{ session, token }`.

The shared book (`GET/PATCH /book`) is the source of performance percentages. Per-investor profit/loss edits are not part of the product model.

Demo credentials (frontend mock only):

- Investor: `luka.obaro@meridian.private` / `Meridian2026!`
- Admin: `anthony.gozie@meridian.private` / `Meridian2026!`
