# ExpenseFlow REST API

Base URL: `http://localhost:5000/api`. All endpoints except `/auth/*` (public) and `/health` need `Authorization: Bearer <token>`.

Response envelope: `{ "success": true, "message": "...", "data": ..., "meta": { ...pagination } }`.
Errors: `{ "success": false, "message": "Invalid email or password.", "details": [...] }`.

| Status | Meaning |
|---|---|
| 400 | Validation failed / bad input |
| 401 | Missing, invalid or expired token; wrong credentials |
| 404 | Resource not found (or belongs to another user) |
| 409 | Duplicate (email, budget) |
| 413 | File exceeds size limit |
| 415 | Unsupported file type |
| 429 | Rate limit hit |

## Authentication
| Method | Path | Body | Notes |
|---|---|---|---|
| POST | /auth/register | name, email, password | Returns user + token |
| POST | /auth/login | email, password, remember? | `remember` = 30-day token, otherwise 1 day |
| POST | /auth/logout | – | Stateless acknowledgement; client discards token |
| POST | /auth/forgot-password | email | Same response whether or not the email exists. In development the reset link is also returned as `data.devResetUrl` |
| POST | /auth/reset-password | token, password | Token valid 30 min, single use, signs out all sessions |
| GET | /auth/me | – | Current user |
| PUT | /auth/change-password | currentPassword, newPassword | Returns a fresh token |

## Users
| Method | Path | Notes |
|---|---|---|
| PUT | /users/profile | name, email, currency, timezone, dateFormat |
| POST | /users/profile-image | multipart `file` (JPG/PNG/WebP, 2 MB) |
| GET | /users/profile-image | Streams the caller's own image |
| DELETE | /users/profile-image | |
| POST | /users/logout-all | Invalidates every issued token |

## Expenses `/expenses` and Income `/income`
`GET /` supports: `search, category, paymentMethod, minAmount, maxAmount, from, to, tags (comma list, expenses only), sort (newest|oldest|highest|lowest), page, limit (max 100)`.

Expense body: `amount, category, description, date, paymentMethod, notes?, tags?[], receipt?` (receipt is the object returned by `/files/upload`, or `null` to remove).
Income body: `amount, source, description, date, paymentMethod, notes?`.

`GET/PUT/DELETE /:id` operate only on the caller's records (404 otherwise).

## Transactions
`GET /transactions` returns expenses and income merged, with the same filters plus `type=expense|income`.

## Budgets
| Method | Path | Notes |
|---|---|---|
| GET | /budgets?month=YYYY-MM | Items with `spent`, `remaining`, `percent`, `status` (ok / warning ≥80% / exceeded ≥100%), plus totals |
| POST | /budgets | `{ month, category: "Overall"|<category>, amount }` |
| PUT | /budgets/:id | same body |
| DELETE | /budgets/:id | |

## Recurring `/recurring`
GET, POST, PUT /:id, DELETE /:id. Body: `type (expense|income), amount, category, description, frequency (Daily|Weekly|Monthly|Yearly), paymentMethod, startDate, endDate?, isActive?`. Due items are turned into real transactions by a daily cron job and whenever the list is fetched.

## Analytics
Common query: `range=thisMonth|lastMonth|last3|last6|thisYear|custom` (+ `from`, `to` for custom).
- `GET /analytics/summary` – balance, period totals, current-month totals, budget status, recent transactions
- `GET /analytics/categories` – `{ expense[], income[], paymentMethods[] }`
- `GET /analytics/monthly` – time series (`granularity=day|month|auto`) and spending `trend` (increasing / decreasing / stable)
- `GET /analytics/insights` – plain-language insights computed from real data

## Notifications
`GET /notifications?unread=true`, `PATCH /notifications/:id/read`, `PATCH /notifications/read-all`, `DELETE /notifications/:id`.

## Files
| Method | Path | Notes |
|---|---|---|
| POST | /files/upload | multipart `file` (PDF/JPG/PNG/WebP, 5 MB) → receipt metadata |
| POST | /files/extract-pdf | Same upload, then returns `{ file, extracted }` (merchant, amount, date, category, paymentMethod, confidence) |
| GET | /files/receipts/:filename | Authenticated stream; `?download=1` forces download |
| DELETE | /files/receipts/:filename | |
| POST | /files/import-csv | multipart `file`, `confirm=false` → preview; `confirm=true` → insert |
| GET | /files/export-csv | Same filters as `/transactions` → `expenses.csv` |
| GET | /files/report-pdf?type=&from=&to= | type: monthly, yearly, income, expense, budget, complete |
