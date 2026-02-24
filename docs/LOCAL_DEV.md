# Local Development Commands

Quick reference for starting the database, app, and Prisma Studio.

## Prerequisites

- Node.js 20+
- PostgreSQL (Homebrew or Docker)
- `influencebay` database created (`createdb influencebay`)

---

## Database

### Option A: Homebrew PostgreSQL (recommended, no Docker needed)

```bash
# Start PostgreSQL (if not already running)
brew services start postgresql@14

# Create database (first time only)
createdb influencebay

# Stop PostgreSQL
brew services stop postgresql@14
```

### Option B: Docker PostgreSQL (requires Docker Desktop running)

```bash
# Start Docker Desktop first, then:
npm run db:up
# or: docker compose up -d

# Stop database
npm run db:down
# or: docker compose down
```

> **Note:** If you see "Cannot connect to the Docker daemon", start Docker Desktop and try again.

### Run migrations

```bash
npm run db:migrate
# or: npx prisma migrate deploy
```

---

## Application

```bash
# Start Next.js dev server
npm run dev
```

App runs at **http://localhost:3000**

---

## Prisma Studio

```bash
# Open Prisma Studio (browse/edit database)
npm run studio
# or: npx prisma studio

# Optional: use a fixed port
npx prisma studio --port 5555
```

Studio runs at **http://localhost:5555** (or the port shown in the terminal)

---

## Full startup sequence

```bash
# 1. Start database (Homebrew is usually already running)
createdb influencebay 2>/dev/null || true
npm run db:migrate

# 2. Start app
npm run dev

# 3. In another terminal: open Prisma Studio
npm run studio
```

---

## Environment

Ensure `.env` has:

```
DIRECT_DATABASE_URL="postgres://xinyucao@localhost:5432/influencebay?sslmode=disable"
```

- **Homebrew**: `postgres://YOUR_USERNAME@localhost:5432/influencebay?sslmode=disable`
- **Docker**: `postgres://postgres:postgres@localhost:5432/influencebay?sslmode=disable`
