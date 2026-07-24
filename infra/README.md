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
| Web PWA  | 3090 |
| Admin    | 3091 |
| API      | 3092 |
| Worker   | —    |
| Postgres | 5432 |
| Redis    | 6379 |
