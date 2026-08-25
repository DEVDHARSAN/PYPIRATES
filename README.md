# PYPIRATES — Full-Stack

Real full-stack build: **Express + PostgreSQL (Prisma) backend**, **React (Vite) frontend**.
No mock data layer — every request in the UI hits a real HTTP endpoint, backed by a real database,
with server-side RBAC (`server/auth.js`) and bcrypt-hashed passwords.

## Stack

- Backend: Node.js, Express, Prisma ORM, PostgreSQL, JWT (httpOnly cookie) auth, bcryptjs
- Frontend: React 18, Vite, Recharts, lucide-react — built to static files and served by Express
- One process, one port: Express serves both `/api/*` and the built frontend

## Run locally

You need a local (or remote) PostgreSQL database.

```bash
# 1. Install backend deps
npm install

# 2. Configure environment
cp .env.example .env
# edit .env and set DATABASE_URL to your Postgres connection string

# 3. Push the schema to your database
npx prisma generate
npx prisma db push

# 4. Seed demo data (admins, students, feedback)
npm run seed

# 5. In one terminal: run the frontend dev server (hot reload, proxies /api to :3000)
cd client && npm install && npm run dev

# 6. In another terminal: run the backend
npm run dev:server
```

Frontend dev server prints a local URL (usually http://localhost:5173) — open that.

## Production build (what Railway runs)

```bash
npm run build   # installs + builds client, generates Prisma client
npm start        # pushes schema to DB, then starts Express on $PORT
```

Express serves the built frontend from `client/dist` and the API from `/api/*` on the same port.

## Deploy to Railway

1. Push this repo to GitHub.
2. In Railway: **New Project → Deploy from GitHub repo**, pick this repo.
3. Add a **PostgreSQL** database to the same project (Railway → New → Database → PostgreSQL).
4. On the web service, set variables:
   - `DATABASE_URL` → reference the Postgres service's `DATABASE_URL` (Railway can wire this automatically when both are in the same project — under the web service's Variables tab, add `DATABASE_URL` and select "Add Reference" to the Postgres service)
   - `JWT_SECRET` → any long random string
   - `NODE_ENV` → `production`
5. Deploy. Railway auto-detects Node, runs `npm run build`, then `npm start`.
6. First boot auto-seeds the database (admins, students, demo feedback) if it's empty — see `server/seed.js`.

## Demo accounts

- Admin — `admin@pypirates.edu` / `Admin@123`
- Student — `aditi.sharma@pypirates.edu` / `demo123`

## API summary

| Method | Path | Access |
|---|---|---|
| POST | /api/auth/register | Public — always creates a STUDENT |
| POST | /api/auth/login | Public |
| POST | /api/auth/logout | Authenticated |
| GET | /api/me | Public (returns null if logged out) |
| PATCH | /api/me | Authenticated |
| POST | /api/feedback | STUDENT |
| GET | /api/my-feedback | STUDENT |
| DELETE | /api/feedback/:id | STUDENT (own, SUBMITTED only) or ADMIN |
| GET | /api/admin/feedback | ADMIN |
| PATCH | /api/admin/feedback/:id/status | ADMIN |
| GET | /api/admin/clusters | ADMIN |
| GET | /api/admin/clusters/:id | ADMIN |
| GET | /api/admin/analytics | ADMIN |
| GET | /api/admin/users | ADMIN |
| POST | /api/admin/simulate | ADMIN (demo: injects one realistic feedback item) |

Unauthenticated requests to protected routes return `401`; authenticated requests with the wrong role return `403` — enforced in `server/auth.js`, not in the UI.
"# PYPIRATES" 
