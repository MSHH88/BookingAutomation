# Step 1.21 — Docker Compose (Local Dev Environment) — Setup Guide

**What this step adds:**

A production-grade local development environment that starts PostgreSQL 16 and
Redis 7 with a single command.  Every major booking platform runs exactly this
infrastructure under the hood — Fresha, Booksy, Mindbody, Acuity, and Square
Appointments all use PostgreSQL as their primary store and Redis as their async
job / caching layer.

The module provides:

1. **`docker-compose.yml`** (enhanced, repo root) — core services always on;
   dev-tool services behind `--profile tools`; fully-containerised backend
   behind `--profile app`.  Named volumes + internal bridge network.
2. **`docker/redis/redis.conf`** — Redis 7 tuned for BullMQ: RDB + AOF
   persistence so queued jobs survive container restarts; `noeviction` policy
   so Redis never silently drops job data under memory pressure.
3. **`backend/Dockerfile`** — production-grade multi-stage build (deps →
   builder → runner).  Non-root user, minimal runtime image, HEALTHCHECK via
   the `/health` endpoint, Prisma client generated at build time.
4. **`backend/.dockerignore`** — excludes `node_modules`, `dist`, all `.env`
   files (except `.env.example`), test files, and editor artefacts from the
   build context.
5. **`backend/.env.example`** — updated with `EMAIL_REMINDERS_ENABLED`,
   `REMINDER_HOURS_BEFORE`, `REVIEW_REQUEST_ENABLED`, and the full supported
   `BUSINESS_TYPE` value list.

---

## New / modified files — ALL 5 MUST BE DOWNLOADED

| # | File | Type | Notes |
|---|------|------|-------|
| 1 | `docker-compose.yml` | MODIFIED | Enhanced: profiles, networking, redis.conf mount, healthchecks |
| 2 | `docker/redis/redis.conf` | NEW | BullMQ-optimised Redis config (AOF + noeviction) |
| 3 | `backend/Dockerfile` | NEW | Production multi-stage build |
| 4 | `backend/.dockerignore` | NEW | Excludes secrets + dev artefacts from build context |
| 5 | `backend/.env.example` | MODIFIED | Added REMINDER_HOURS_BEFORE, EMAIL_REMINDERS_ENABLED, REVIEW_REQUEST_ENABLED, full BUSINESS_TYPE list |

> **Missing file 2 causes `docker compose up` to fail** — the redis service
> mounts `./docker/redis/redis.conf` and will not start without it.
> All 5 files must be downloaded.

---

## STEP 0 — Install Docker Desktop (prerequisite — do this ONCE)

> **Skip this step if `docker --version` already prints a version number.**

Docker Desktop is the application that provides the `docker` and `docker compose`
commands on macOS.  Without it, every `docker` command will fail with
`zsh: command not found: docker`.

1. Go to **https://www.docker.com/products/docker-desktop/** and click
   **"Download for Mac"**.
   - Choose **"Apple Silicon"** (M1 / M2 / M3 / M4 chip) or **"Intel Chip"**
     depending on your Mac.  If you're unsure: Apple menu → About This Mac →
     look for "Apple M" (Silicon) or "Intel" in the chip/processor line.

2. Open the downloaded `.dmg`, drag **Docker** to your **Applications** folder,
   then launch Docker from Applications.

3. Docker Desktop will show a whale icon in your menu bar.  Wait until the icon
   stops animating and shows **"Docker Desktop is running"** in the menu.

4. Verify in Terminal:

   ```bash
   docker --version && docker compose version
   ```

   Expected output (versions may differ):
   ```
   Docker version 27.x.x, build xxxxxxx
   Docker Compose version v2.x.x
   ```

   If this works, Docker is installed.  Continue to STEP 1.

> **Note:** Docker Desktop must be **running** (whale icon in menu bar) every
> time you run `docker compose` commands.  If you restart your Mac and get
> `command not found`, simply open Docker Desktop from Applications first.

---

## STEP 1 — Delete old files (clean slate)

```bash
rm -f ~/Desktop/Automation/docker-compose.yml && \
rm -f ~/Desktop/Automation/backend/Dockerfile && \
rm -f ~/Desktop/Automation/backend/.dockerignore && \
rm -f ~/Desktop/Automation/backend/.env.example
```

---

## STEP 2 — Create the docker/redis folder

```bash
mkdir -p ~/Desktop/Automation/docker/redis
```

---

## STEP 3 — Download all 5 files (one copy-paste block)

```bash
curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/docker-compose.yml" -o ~/Desktop/Automation/docker-compose.yml && \
curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/docker/redis/redis.conf" -o ~/Desktop/Automation/docker/redis/redis.conf && \
curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/Dockerfile" -o ~/Desktop/Automation/backend/Dockerfile && \
curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/.dockerignore" -o ~/Desktop/Automation/backend/.dockerignore && \
curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/.env.example" -o ~/Desktop/Automation/backend/.env.example
```

---

## STEP 4 — Verify all 5 files were downloaded (bytes > 0)

```bash
wc -c \
  ~/Desktop/Automation/docker-compose.yml \
  ~/Desktop/Automation/docker/redis/redis.conf \
  ~/Desktop/Automation/backend/Dockerfile \
  ~/Desktop/Automation/backend/.dockerignore \
  ~/Desktop/Automation/backend/.env.example
```

All 5 files must show a byte count > 0.  If any shows 0 bytes or is missing,
re-run STEP 3.

---

## STEP 5 — Start the local dev infrastructure

```bash
cd ~/Desktop/Automation && docker compose up -d
```

Expected: Docker pulls `postgres:16-alpine` and `redis:7-alpine` (first run
only), creates the containers, and exits with both services **healthy**.

Check health status:

```bash
docker compose ps
```

Both `bookingautomation_postgres` and `bookingautomation_redis` must show
`(healthy)` in the Status column before continuing.

---

## STEP 5b — Apply database migrations (first time only)

> **Skip this step** if your `backend/.env` already points to your Neon cloud
> database — you ran migrations there in earlier steps.
>
> **Run this step** if you want to use the local Docker PostgreSQL for development.

Set the local database URL in `backend/.env`:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/automation_dev
```

Then apply all Prisma migrations to the Docker PostgreSQL:

```bash
cd ~/Desktop/Automation/backend && npm run db:migrate
```

Expected output ends with something like:
```
✔ Generated Prisma Client
```
and a list of applied migrations.  This only needs to run once per fresh
volume (or after `docker compose down -v`).

---

## STEP 6 — Run the API with hot-reload

```bash
cd ~/Desktop/Automation/backend && npm run dev
```

Expected: the API starts on `http://localhost:3000`.  Open a browser and visit
`http://localhost:3000/health` — you should see:

```json
{ "success": true, "data": { "status": "ok", ... } }
```

---

## STEP 7 — Run the full test suite

```bash
cd ~/Desktop/Automation/backend && npm test
```

Expected output:

```
Test Suites: 18 passed, 18 total
Tests:       579 passed, 579 total
```

> Note: the test suite runs with mocked Redis (no real Docker connection
> needed).  The test count does not change in Step 1.21 — this step adds
> infrastructure files only, not application code.

---

## Optional: run dev tools (Adminer + Mailpit)

```bash
cd ~/Desktop/Automation && docker compose --profile tools up -d
```

| Tool | URL | Purpose |
|------|-----|---------|
| Adminer | http://localhost:8080 | PostgreSQL GUI (System: PostgreSQL, Server: postgres, User: postgres, Password: postgres) |
| Mailpit | http://localhost:8025 | Web inbox for all outbound dev emails (multi-arch, ARM64 compatible) |

---

## Optional: run the full stack inside Docker

```bash
# 1. Ensure backend/.env exists (copy the example and fill in JWT secrets at minimum)
cp ~/Desktop/Automation/backend/.env.example ~/Desktop/Automation/backend/.env

# 2. Build + start everything
cd ~/Desktop/Automation && docker compose --profile app up -d --build
```

---

## STEP 8 — Stop the infrastructure

```bash
cd ~/Desktop/Automation && docker compose down
```

To also wipe all data volumes (**DESTRUCTIVE — deletes all local DB data**):

```bash
cd ~/Desktop/Automation && docker compose down -v
```

---

## Architecture notes

- **PostgreSQL 16** — matches the version used in Neon (production) and
  Supabase so migration behaviour is identical locally and in CI.
- **Redis 7** — matches the version required by BullMQ 5.x.  The custom
  `redis.conf` enables AOF persistence so delayed appointment-reminder and
  review-request jobs survive a `docker compose restart` without being lost.
- **`noeviction` policy** — the only correct `maxmemory-policy` for BullMQ.
  Any LRU/LFU policy risks silently evicting job data; `noeviction` forces
  Redis to return an explicit error instead, which BullMQ then surfaces so the
  issue is visible rather than hidden.
- **Named volumes** — `postgres_data` and `redis_data` survive `docker compose
  down` (data is preserved) but are removed by `docker compose down -v`
  (clean-slate reset).
- **Internal bridge network** — all services share the `bookingautomation`
  network.  The `backend` service uses `postgres:5432` / `redis:6379` as
  hostnames (Docker DNS resolution); your local `npm run dev` uses
  `localhost:5432` / `localhost:6379` (port-forwarded by Docker).
- **Profiles** — `tools` (Adminer + Mailpit) and `app` (Node.js backend) are
  opt-in so `docker compose up -d` is always fast and lightweight.
- **Multi-stage Dockerfile** — the `deps` stage caches production
  `node_modules` independently of source changes; the `builder` stage compiles
  TypeScript and runs `prisma generate`; the `runner` stage copies only the
  compiled `dist/`, production `node_modules`, and Prisma client — keeping the
  final image minimal.
- **Non-root container user** — the `runner` stage drops privileges to a
  dedicated `expressjs` user (UID 1001) following Docker security best
  practices used by Vercel, Railway, and Render.

---

## Environment variables — local dev defaults

When using `docker compose up -d` and running the API with `npm run dev`, add
these to `backend/.env`:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/automation_dev
REDIS_URL=redis://localhost:6379
```

See `backend/.env.example` for the full variable reference.
