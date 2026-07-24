# ItChats Infrastructure

## Local Development

```bash
# Start databases
docker compose -f infra/docker/docker-compose.yml up -d

# Install dependencies
pnpm install

# Run database migrations
pnpm db:migrate

# Start all apps in dev mode
pnpm dev
```

## Services

| Service  | Port |
|----------|------|
| Web PWA  | 3000 |
| Admin    | 3001 |
| API      | 3002 |
| Worker   | —    |
| Postgres | 5432 |
| Redis    | 6379 |
