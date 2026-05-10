# TOG Backend

Node.js + Express + Prisma API for The Ocean Games (admin panel, public site, casinos, casino articles, settings, and auth).

---

## Prerequisites

- **Node.js** 18+ (LTS recommended)
- **PostgreSQL** 14+
- **npm** (or yarn / pnpm)

---

## Quick setup (for collaborators)

### 1. Clone and install

```bash
git clone <repository-url>
cd tog_backend
npm install
```

### 2. Environment variables

Copy the example env file and edit with your values:

```bash
cp .env.example .env
```

Edit `.env` and set at least:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string, e.g. `postgresql://USER:PASSWORD@localhost:5432/DBNAME?schema=public` |
| `ACCESS_TOKEN_SECRET` | Secret for JWT access tokens (min 32 characters) |
| `REFRESH_TOKEN_SECRET` | Secret for refresh token hashing (min 32 characters) |
| `CORS_ORIGIN` | Allowed frontend origins, comma-separated (e.g. `http://localhost:5173,http://localhost:3001`) |

Optional:

- `PORT` — default `3000`
- `ACCESS_TOKEN_TTL` — default `15m`
- `REFRESH_TOKEN_TTL_DAYS` — default `30`
- `BASE_URL` — public base URL for upload links (e.g. `https://api.yoursite.com`)

### 3. Database

**Option A – Local PostgreSQL**

Create a database, then set `DATABASE_URL` in `.env`.

**Option B – Docker**

```bash
docker compose up -d
```

Then set `DATABASE_URL` in `.env` to match the service (user, password, db name from `docker-compose.yml` or your own).

**Run migrations**

```bash
npx prisma migrate deploy
npx prisma generate
```

### 4. Create super admin (local and production)

The first admin created via the script is a **super_admin** with `isSystem: true` (cannot be deleted/revoked via API).

```bash
# Set in .env: ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME (optional)
# Example for your super admin:
#   ADMIN_EMAIL=aman.tiwari@triplew.in
#   ADMIN_PASSWORD=<your-secure-password>
node src/scripts/createAdmin.js
```

Run this **once** after migrations (locally and on each production deploy if the DB is fresh). If that email already exists, the script skips creation. Keep `ADMIN_PASSWORD` only in `.env`; never commit it.

### 5. Run the server

**Development (with auto-reload):**

```bash
npm run dev
```

**Production:**

```bash
npm start
```

API base: **http://localhost:3000** (or your `PORT`).

- Health: `GET /health`
- API prefix: `/api/v1` (admin: `/api/v1/admin`, public: `/api/v1/public`)

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with nodemon |
| `npm start` | Start production server |
| `npx prisma migrate deploy` | Apply pending migrations |
| `npx prisma generate` | Regenerate Prisma client |
| `node src/scripts/createAdmin.js` | Create an admin user (uses `.env` admin vars) |
| `node src/scripts/lockSuperAdmin.js` | Lock super admin (see script) |
| `npm run test:api` | Run API test script (if present) |

---

## API documentation

- **Single reference:** [docs/API.md](docs/API.md) — all routes, request/response, auth, roles, errors. Use this for the admin panel and any client.

---

## Project structure

```
tog_backend/
├── prisma/
│   ├── schema.prisma      # Data models
│   └── migrations/        # SQL migrations
├── src/
│   ├── server.js          # App entry
│   ├── routes/            # API routes (admin, public)
│   ├── middlewares/       # Auth, error handling
│   ├── utils/             # Helpers, tokens, http
│   ├── lib/               # Prisma client
│   └── scripts/           # createAdmin, lockSuperAdmin, etc.
├── docs/
│   └── API.md             # API documentation
├── .env.example           # Example environment variables
├── docker-compose.yml     # Optional PostgreSQL for local dev
└── package.json
```

---

## Troubleshooting

- **401 on admin routes** — Use a valid `Authorization: Bearer <accessToken>` from login or refresh.
- **Prisma errors about unknown fields** — Run `npx prisma generate` after pulling schema/migration changes.
- **DB connection errors** — Check `DATABASE_URL`, that PostgreSQL is running, and that the database exists.
- **CORS errors** — Add your frontend origin to `CORS_ORIGIN` in `.env`.
