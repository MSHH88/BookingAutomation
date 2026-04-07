# ─────────────────────────────────────────────────────────────────────────────
# BookingAutomation — Backend production Dockerfile
# Multi-stage build: deps → builder → runner
#
# Build:
#   docker build -t bookingautomation-backend ./backend
#
# Run (with env file):
#   docker run -p 3000:3000 --env-file .env bookingautomation-backend
#
# Or use docker compose (see root docker-compose.yml):
#   docker compose --profile app up -d
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1: production dependencies ─────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

# Install only production dependencies in this layer for better cache reuse
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts

# ── Stage 2: builder ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Install ALL dependencies (includes devDependencies for tsc + ts-jest)
COPY package*.json ./
RUN npm ci

# Copy source code and configuration
COPY tsconfig.json ./
COPY prisma        ./prisma
COPY src           ./src

# Generate Prisma client before compiling (types must exist for tsc)
RUN npx prisma generate

# Compile TypeScript → dist/
RUN npm run build

# ── Stage 3: production runner ────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

# Security: run as a non-root user
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 --ingroup nodejs expressjs

# Copy production node_modules from the deps stage
COPY --from=deps    /app/node_modules          ./node_modules

# Copy compiled output from the builder stage
COPY --from=builder /app/dist                  ./dist

# Copy Prisma schema (needed by the client at runtime)
COPY --from=builder /app/prisma                ./prisma

# Copy the generated Prisma client (lives inside node_modules/.prisma)
COPY --from=builder /app/node_modules/.prisma  ./node_modules/.prisma

# Set runtime user + environment
USER expressjs
ENV NODE_ENV=production
EXPOSE 3000

# Health check using the /health endpoint (added in app.ts, exempt from rate-limiting)
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "dist/server.js"]
