# Scripts

## Database (Docker)

Start PostgreSQL (required before running the backend or Prisma Studio):

```bash
docker compose up -d
```

Stop:

```bash
docker compose down
```

Your `DATABASE_URL` in `.env` should match the compose service, e.g.:

```
DATABASE_URL="postgresql://tiwarigaman:123456@localhost:5432/tog_db?schema=public"
```

## API tests

See project root for `npm run test:api` or run `./scripts/test-api.sh` with optional `ADMIN_EMAIL` and `ADMIN_PASSWORD`.
