# BookingAutomation — Operational Testing Guide

> **Everything below is written for a Mac.** All commands run in Terminal B unless stated otherwise.  
> Copy and paste each block exactly. Wait for the response before running the next command.

---

## Quick Setup Reference

### Two terminals — always open at the same time

| Window | Purpose | Port |
|--------|---------|------|
| **Terminal A** | Runs the API server — keep it running | `3000` |
| **Terminal B** | Where you type curl commands | — |

### Terminal A — Start the server
```bash
cd ~/Desktop/Automation/backend && npm run dev
```
You will see:
```
[info] Server started {"port":3000,"env":"development","pid":...}
```

### Terminal B — Get your admin token (run this first, and again after 15 min)
```bash
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"Curia.1312"}' | jq -r '.data.accessToken')

echo $TOKEN
```

You will see the raw JWT printed. Every command from this point uses `$TOKEN` — that variable holds the full token string automatically. No need to copy-paste the long `eyJ...` string yourself.

> ⚠️ **Token expires after 15 minutes.** If you get `{"code":"INVALID_TOKEN"}`, re-run the `TOKEN=...` command above.

---

## Part 1 — Foundation Checks (Steps 1.3–1.7)

### 1.1 — Health check
```bash
curl -s http://localhost:3000/health | jq .
```
Expected: `{"success":true,"data":{"status":"ok",...}}`

---

### 1.2 — Verify your admin identity
```bash
curl -s http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer $TOKEN" | jq .
```
Expected: `"name":"GOD","role":"ADMIN"`

---

### 1.3 — Submit a lead (public — no token needed)

> ⚠️ The `placement` field is **required** for `tattoo_studio` deployments. Omitting it gives `VALIDATION_ERROR: body.placement Required`.

```bash
curl -s -X POST http://localhost:3000/api/leads \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Smith",
    "email": "jane@example.com",
    "phone": "+441234567890",
    "description": "Interested in a full sleeve tattoo",
    "placement": {"area": "left_arm"},
    "source": "instagram"
  }' | jq .
```

Expected: `"success":true`, `"name":"Jane Smith"`, `"status":"NEW"`

> 📌 **Save the `"id"` value** from the response — you will need it as `LEAD_ID` in Part 2:
> ```bash
> LEAD_ID="paste-the-lead-id-here"
> ```

---

### 1.4 — List all leads (admin)
```bash
curl -s http://localhost:3000/api/leads \
  -H "Authorization: Bearer $TOKEN" | jq .
```
Expected: paginated list containing Jane Smith (and any previous seed data).

---

### 1.5 — Create a tattoo style
```bash
curl -s -X POST http://localhost:3000/api/styles \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Traditional","description":"Classic bold lines and colours"}' | jq .
```
Expected: `"success":true`, `"name":"Traditional"`, `"isActive":true`

---

### 1.6 — Create an artist

> ⚠️ Creating an artist also creates a **User account** for them (so they can log in). `email`, `password`, and `slug` are all required.

```bash
curl -s -X POST http://localhost:3000/api/artists \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Alex Ink",
    "email": "alex@yourstudio.com",
    "password": "Artist123!",
    "slug": "alex-ink",
    "bio": "Specialist in traditional and neo-trad"
  }' | jq .
```

Expected: `"success":true`, `"slug":"alex-ink"`, with a nested `"user"` object.

> 📌 **Save the artist `"id"` value** — you will need it as `ARTIST_ID` in Part 2:
> ```bash
> ARTIST_ID="paste-the-artist-id-here"
> ```

---

## Part 2 — Step 1.8: Quote Management API

All quote endpoints require authentication and are gated by `QUOTE_SYSTEM_ENABLED`  
(automatically **ON** for `tattoo_studio` deployments).

**Before you start — set your variables** from the responses you saved in Part 1:
```bash
LEAD_ID="paste-the-lead-id-here"
ARTIST_ID="paste-the-artist-id-here"
```

Quote lifecycle:
```
DRAFT → SENT → ACCEPTED  (creates Booking, moves Lead → BOOKED)
             → REJECTED
             → EXPIRED   (if validUntil passes without acceptance)
```

---

### 2.1 — Create a DRAFT quote (ADMIN)

ADMIN must supply `artistId` in the body. Price is in GBP.

```bash
curl -s -X POST http://localhost:3000/api/quotes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"leadId\":   \"$LEAD_ID\",
    \"artistId\": \"$ARTIST_ID\",
    \"price\":    350.00,
    \"hours\":    4,
    \"notes\":    \"Full sleeve — traditional Japanese style, all-day session\"
  }" | jq .
```

**What each field means:**

| Field | Required? | What it is | Example |
|-------|-----------|-----------|---------|
| `leadId` | ✅ Yes | The lead this quote is for | ID from step 1.3 |
| `artistId` | ✅ Yes (ADMIN only) | Which artist is quoting | ID from step 1.6 |
| `price` | ✅ Yes | Price in GBP (up to 2 decimal places) | `350.00` |
| `hours` | No | Estimated session duration in hours | `4` (= 4 h), `4.5` (= 4 h 30 m) |
| `notes` | No | Internal staff-only notes | Any text |
| `validUntil` | No | Expiry date-time ISO 8601 — defaults to 7 days | `"2026-04-11T23:59:59Z"` |

**Expected response:**
```json
{
  "success": true,
  "data": {
    "id": "cmnkr...",
    "leadId": "...",
    "artistId": "...",
    "price": "350",
    "hours": 4,
    "notes": "Full sleeve — traditional Japanese style, all-day session",
    "validUntil": "2026-04-11T...",
    "status": "DRAFT",
    "sentAt": null,
    "respondedAt": null,
    "lead":    { "id": "...", "name": "Jane Smith", "email": "jane@example.com", "status": "NEW" },
    "artist":  { "id": "...", "slug": "alex-ink", "user": { "name": "Alex Ink" } },
    "booking": null
  },
  "meta": null,
  "error": null
}
```

> 📌 **Save the quote `"id"` value:**
> ```bash
> QUOTE_ID="paste-the-quote-id-here"
> ```

---

### 2.2 — List all quotes

```bash
curl -s http://localhost:3000/api/quotes \
  -H "Authorization: Bearer $TOKEN" | jq .
```

**Expected response** (paginated list):
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "price": "350",
      "hours": 4,
      "status": "DRAFT",
      "lead":   { "name": "Jane Smith", "email": "jane@example.com" },
      "artist": { "slug": "alex-ink", "user": { "name": "Alex Ink" } }
    }
  ],
  "meta": { "total": 1, "page": 1, "limit": 20, "totalPages": 1 },
  "error": null
}
```

**Optional filters** (append to the URL):

| Filter | Example URL | What it does |
|--------|-------------|-------------|
| `?status=DRAFT` | `/api/quotes?status=DRAFT` | Only DRAFT quotes |
| `?status=SENT` | `/api/quotes?status=SENT` | Only SENT quotes |
| `?leadId=...` | `/api/quotes?leadId=$LEAD_ID` | All quotes for one lead |
| `?artistId=...` | `/api/quotes?artistId=$ARTIST_ID` | All quotes by one artist |

---

### 2.3 — Get a single quote (full detail)

```bash
curl -s http://localhost:3000/api/quotes/$QUOTE_ID \
  -H "Authorization: Bearer $TOKEN" | jq .
```

Expected: Same full-detail shape as 2.1, including nested `lead`, `artist`, and `booking`.

---

### 2.4 — Edit a DRAFT quote

Only **DRAFT** quotes can be edited. Provide any combination of `price`, `hours`, `notes`, `validUntil`.

```bash
curl -s -X PATCH http://localhost:3000/api/quotes/$QUOTE_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "price": 400.00,
    "notes": "Revised after consultation — 2 sessions included"
  }' | jq .
```

**Expected response:** Same quote shape with `"price":"400"` and updated `notes`.

> ⚠️ Trying to edit a SENT or ACCEPTED quote returns:
> ```json
> {"error":{"code":"CONFLICT","message":"Only DRAFT quotes can be edited..."}}
> ```

---

### 2.5 — Send the quote to the customer

Transitions: `DRAFT → SENT`  
Side-effects: moves lead status → `QUOTED`, queues email (stub log in Terminal A).

```bash
curl -s -X PATCH http://localhost:3000/api/quotes/$QUOTE_ID/send \
  -H "Authorization: Bearer $TOKEN" | jq .
```

**Expected response:**
```json
{
  "success": true,
  "data": {
    "id": "...",
    "status": "SENT",
    "sentAt": "2026-04-04T20:...",
    "lead":   { "status": "QUOTED", ... },
    "booking": null
  }
}
```

**In Terminal A you will see:**
```
[info] Email job queued (stub) {"job":"quote-sent","quoteId":"...","leadId":"..."}
```

> Verify the lead updated to QUOTED:
> ```bash
> curl -s http://localhost:3000/api/leads/$LEAD_ID \
>   -H "Authorization: Bearer $TOKEN" | jq .data.status
> ```
> Expected output: `"QUOTED"`

---

### 2.6 — Accept the quote (creates a Booking)

Transitions: `SENT → ACCEPTED`  
Side-effects (atomic transaction):
1. Quote status set to ACCEPTED
2. Booking record created with status PENDING
3. Lead status moved to BOOKED

You must provide `startAt` and `endAt` to schedule the appointment at the time of acceptance.

```bash
curl -s -X PATCH http://localhost:3000/api/quotes/$QUOTE_ID/accept \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "startAt": "2026-04-15T10:00:00Z",
    "endAt":   "2026-04-15T14:00:00Z",
    "notes":   "Customer confirmed — parking available at the back"
  }' | jq .
```

**What each field means:**

| Field | Required? | What it is | Example |
|-------|-----------|-----------|---------|
| `startAt` | ✅ Yes | Appointment start (ISO 8601 UTC) | `"2026-04-15T10:00:00Z"` |
| `endAt` | ✅ Yes | Appointment end — must be after startAt | `"2026-04-15T14:00:00Z"` |
| `notes` | No | Notes to attach to the Booking | Any text |

**Expected response:**
```json
{
  "success": true,
  "data": {
    "id": "...",
    "status": "ACCEPTED",
    "respondedAt": "2026-04-04T20:...",
    "lead":    { "status": "BOOKED", ... },
    "booking": {
      "id":      "...",
      "status":  "PENDING",
      "startAt": "2026-04-15T10:00:00.000Z",
      "endAt":   "2026-04-15T14:00:00.000Z"
    }
  }
}
```

**In Terminal A you will see:**
```
[info] Email job queued (stub) {"job":"quote-accepted","quoteId":"...","leadId":"..."}
```

> ⚠️ If the quote has expired (`validUntil` is in the past):
> ```json
> {"error":{"code":"QUOTE_EXPIRED","message":"This quote has expired and can no longer be accepted."}}
> ```
> Issue a new quote with a future `validUntil` date.

---

### 2.7 — Reject a quote (alternative to accept)

To test the rejection flow: create a second quote, send it (steps 2.1 → 2.5), then reject it.

```bash
curl -s -X PATCH http://localhost:3000/api/quotes/$QUOTE_ID/reject \
  -H "Authorization: Bearer $TOKEN" | jq .
```

**Expected response:**
```json
{
  "success": true,
  "data": {
    "id": "...",
    "status": "REJECTED",
    "respondedAt": "2026-04-04T20:...",
    "lead":    { "status": "QUOTED", ... },
    "booking": null
  }
}
```

> Lead status stays `QUOTED` — the studio can issue a revised quote or follow up directly.

**In Terminal A you will see:**
```
[info] Email job queued (stub) {"job":"quote-rejected","quoteId":"...","leadId":"..."}
```

---

## Part 3 — Common Errors and Fixes

| Error you see | What it means | How to fix |
|---|---|---|
| **No output (silence)** | Server is not running | Go to Terminal A and run `npm run dev` |
| `"code":"INVALID_TOKEN"` | Token expired (15 min limit) | Re-run the `TOKEN=...` command |
| `"code":"FORBIDDEN"` | Role is not high enough | Ensure account is `ADMIN` in Prisma Studio |
| `"code":"CONFLICT"` on edit/send | Quote is not DRAFT | Check the quote status — only DRAFT quotes can be edited/sent |
| `"code":"CONFLICT"` on accept/reject | Quote is not SENT | Quote must be SENT before it can be accepted or rejected |
| `"code":"QUOTE_EXPIRED"` | `validUntil` is in the past | Create a new quote with a future `validUntil` |
| `"code":"NOT_FOUND"` | ID does not exist in the database | Verify the ID from a previous response |
| `VALIDATION_ERROR: body.placement Required` | Lead submitted without placement | Add `"placement":{"area":"left_arm"}` to the lead body |
| `VALIDATION_ERROR: body.email/password/slug Required` | Artist created without user fields | Add `"email"`, `"password"`, `"slug"` to the artist body |
| `$TOKEN` is empty | Login failed or jq not installed | Run `brew install jq`, retry the `TOKEN=...` command |

---

## Part 4 — Roles Explained

| Role | Who it is | What they can do with Quotes |
|---|---|---|
| `CUSTOMER` | Regular client | No access to quote endpoints |
| `ARTIST` | Studio artist / staff | Create quotes, read own quotes, edit DRAFT, send |
| `ADMIN` | Studio owner / manager | Everything — create for any artist, accept, reject |

---

## Part 5 — Quick Reference Cheatsheet

```bash
# ── TERMINAL A — keep this running always ─────────────────────────────────────
cd ~/Desktop/Automation/backend && npm run dev

# ── TERMINAL B — run these commands ──────────────────────────────────────────

# Get admin token (do this every 15 min or in a new terminal):
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"Curia.1312"}' | jq -r '.data.accessToken')
echo "Token: ${TOKEN:0:40}..."

# Health check:
curl -s http://localhost:3000/health | jq .data.status

# Who am I?
curl -s http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer $TOKEN" | jq .data

# Submit a lead (public — tattoo studio requires placement):
curl -s -X POST http://localhost:3000/api/leads \
  -H "Content-Type: application/json" \
  -d '{"name":"Jane Smith","email":"jane@example.com","phone":"+441234567890","description":"Full sleeve","placement":{"area":"left_arm"},"source":"instagram"}' | jq .

# List all leads:
curl -s http://localhost:3000/api/leads \
  -H "Authorization: Bearer $TOKEN" | jq .

# Export leads as CSV:
curl -s http://localhost:3000/api/leads/export \
  -H "Authorization: Bearer $TOKEN"

# Create an artist:
curl -s -X POST http://localhost:3000/api/artists \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Alex Ink","email":"alex@yourstudio.com","password":"Artist123!","slug":"alex-ink","bio":"Traditional specialist"}' | jq .

# Create a tattoo style:
curl -s -X POST http://localhost:3000/api/styles \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Traditional","description":"Classic bold lines"}' | jq .

# ── QUOTE MANAGEMENT (Step 1.8) ───────────────────────────────────────────────

# Create DRAFT quote (ADMIN must supply artistId):
curl -s -X POST http://localhost:3000/api/quotes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"leadId\":\"$LEAD_ID\",\"artistId\":\"$ARTIST_ID\",\"price\":350.00,\"hours\":4,\"notes\":\"Consultation agreed\"}" | jq .

# List all quotes:
curl -s http://localhost:3000/api/quotes \
  -H "Authorization: Bearer $TOKEN" | jq .

# Get quote detail:
curl -s http://localhost:3000/api/quotes/$QUOTE_ID \
  -H "Authorization: Bearer $TOKEN" | jq .

# Edit a DRAFT quote:
curl -s -X PATCH http://localhost:3000/api/quotes/$QUOTE_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"price":400.00,"notes":"Revised after consultation"}' | jq .

# Send quote (DRAFT → SENT, lead → QUOTED):
curl -s -X PATCH http://localhost:3000/api/quotes/$QUOTE_ID/send \
  -H "Authorization: Bearer $TOKEN" | jq .

# Accept quote (SENT → ACCEPTED, creates Booking, lead → BOOKED):
curl -s -X PATCH http://localhost:3000/api/quotes/$QUOTE_ID/accept \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"startAt":"2026-04-15T10:00:00Z","endAt":"2026-04-15T14:00:00Z"}' | jq .

# Reject quote (SENT → REJECTED):
curl -s -X PATCH http://localhost:3000/api/quotes/$QUOTE_ID/reject \
  -H "Authorization: Bearer $TOKEN" | jq .
```
