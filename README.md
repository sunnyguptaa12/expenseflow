# ExpenseFlow – Smart Personal Expense Tracker

A full-stack MERN personal-finance application: track income and expenses, set budgets, automate recurring payments, import/export CSV, scan PDF receipts, and generate PDF reports, with a responsive dark-mode-ready UI.

**Stack:** React 18 · Vite · Tailwind CSS · React Router · Axios · Recharts · React Hook Form · Lucide · Node.js · Express · MongoDB/Mongoose · JWT · bcrypt · Multer · PDFKit · pdf-parse · csv-parse

## Features
- **Auth:** register, login (remember me), logout, forgot/reset password (hashed, expiring token), change password, logout from all devices, profile + photo
- **Dashboard:** balance, income, expenses, savings, month figures, budget status, five Recharts charts, recent transactions, insights, date filters (this/last month, 3/6 months, year, custom)
- **Transactions / Income / Expenses:** CRUD, search, multi-filter (date, category, amount, payment method, tags, type), sorting, pagination, detail view, receipts
- **Budgets:** overall and per-category monthly budgets with progress, 80% warning and exceeded alert
- **Recurring payments:** daily/weekly/monthly/yearly; due items become real transactions via a cron job (with catch-up for missed runs)
- **CSV import:** header + row validation, preview, confirm, per-row failure reasons. **CSV export:** all / filtered / month / year, formula-injection safe
- **PDF reports:** monthly, yearly, income, expense, budget, complete, with charts, category breakdown and budget summary
- **Receipt extraction:** upload a PDF, auto-detect merchant/amount/date/category/payment method, edit, confirm, save
- **Receipt management:** attach, preview, download, replace, delete; files are stored privately per user
- **Analytics + insights + notifications** (budget 80%/exceeded, recurring due/processed, monthly report, unusual and large spending), light/dark/system theme, mobile drawer navigation

## Project structure
```
expenseflow/
├── backend/
│   ├── scripts/seed.js
│   ├── uploads/                (private files, git-ignored, never served statically)
│   └── src/
│       ├── config/       env + database
│       ├── controllers/  auth, user, transaction (expense+income), budget, recurring, analytics, notification, file
│       ├── jobs/         node-cron scheduler
│       ├── middleware/   auth, validate, sanitize, rateLimit, upload, error
│       ├── models/       User, Expense, Income, Budget, RecurringTransaction, Notification
│       ├── routes/
│       ├── services/     transaction filters, analytics, budgets, notifications, recurring, csv, receipt parser, pdf, email
│       └── utils/        constants, schemas (zod), helpers, ApiError
├── frontend/src/
│   ├── components/ context/ hooks/ layouts/ pages/ routes/ services/ utils/
├── docs/        API.md, sample-requests.http
└── samples/     sample-transactions.csv
```

## Setup
Prerequisites: Node.js 18+ and MongoDB (local, or a free MongoDB Atlas cluster).

```bash
# 1. Backend
cd backend
cp .env.example .env        # set MONGODB_URI and a long random JWT_SECRET
npm install
npm run seed                # optional: demo data (demo@expenseflow.dev / Demo@1234)
npm run dev                 # http://localhost:5000

# 2. Frontend (new terminal)
cd frontend
npm install
npm run dev                 # http://localhost:5173  (Vite proxies /api to :5000)
```
Generate a secret: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.

`npm run seed:destroy` removes the demo user and all of its data. The seed script refuses to run when `NODE_ENV=production`.

### Environment variables
| Backend | Purpose |
|---|---|
| `MONGODB_URI`, `JWT_SECRET` | Required |
| `PORT`, `NODE_ENV` | Defaults 5000 / development |
| `CLIENT_URL` | Allowed CORS origin(s), comma separated; also used in reset links |
| `UPLOAD_DIR`, `MAX_FILE_SIZE_MB` | File storage and receipt size limit |
| `LARGE_TRANSACTION_THRESHOLD` | Amount that triggers a "large transaction" alert |
| `SMTP_*`, `MAIL_FROM` | Optional. Without SMTP the reset link is logged to the server console |

| Frontend | Purpose |
|---|---|
| `VITE_API_URL` | Full API URL in production, e.g. `https://api.example.com/api` |

### Try the CSV import
Use **Transactions → Import CSV** with `samples/sample-transactions.csv`. It contains 3 deliberately bad rows, so you will see 14 total, 11 valid, 3 failed with reasons. Or with curl:
```bash
curl -H "Authorization: Bearer $TOKEN" -F file=@samples/sample-transactions.csv -F confirm=false http://localhost:5000/api/files/import-csv
```

## Security notes
- Passwords hashed with bcrypt (cost 12; `bcryptjs`, a pure-JS bcrypt implementation that avoids native build problems). Reset tokens are stored hashed.
- JWTs carry a `tokenVersion`; password change/reset and "logout all devices" invalidate older tokens.
- Every query includes `userId` from the verified token; other users' IDs return 404.
- Helmet headers, CORS allow-list, global + stricter auth rate limits, Zod validation, NoSQL operator stripping, 1 MB JSON limit.
- Uploads: MIME allow-list, size limit, magic-byte check, random server-generated filenames, stored in per-user folders and served only through an authenticated endpoint.
- Dates are treated as UTC calendar days so entries never shift day with server timezone.

## Deployment
**Database:** create a MongoDB Atlas cluster, allow your server's IP, and use its connection string as `MONGODB_URI`.

**Backend (Render / Railway / any Node host):**
1. Root directory `backend`, build `npm install`, start `npm start`.
2. Set `NODE_ENV=production`, `MONGODB_URI`, `JWT_SECRET` (32+ chars), `CLIENT_URL=https://your-frontend-domain`.
3. **Attach a persistent disk** and point `UPLOAD_DIR` at it (e.g. `/var/data/uploads`); otherwise uploaded receipts disappear on redeploy. For multi-instance scale, replace the disk storage in `middleware/upload.js` with S3-compatible storage.
4. Run a single instance, or move the cron jobs to a dedicated worker, so scheduled jobs don't fire twice (duplicate alerts are already de-duplicated by key).

**Frontend (Vercel / Netlify):** root `frontend`, build `npm run build`, output `dist`, env `VITE_API_URL=https://your-api-domain/api`. SPA rewrites are included (`vercel.json`, `public/_redirects`).

## Known limitations
- Receipt extraction reads **text-based PDFs** only. Scanned PDFs and photos are attached but must be filled in manually (OCR would be the next step, e.g. Tesseract).
- PDF reports show `Rs.` for INR because PDFKit's built-in fonts lack the ₹ glyph; embed a TTF such as Noto Sans to render ₹.
- No automated test suite is included yet.
