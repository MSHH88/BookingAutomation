# BookingAutomation — Complete Operational Guide

> **Everything below is written for a Mac.** All commands run in Terminal B unless stated otherwise.  
> Copy and paste each block exactly. Wait for the response before running the next command.

---

## Prerequisites — Install These First

Before anything else, make sure you have the following installed on your Mac.

### 1. Node.js (v18 or higher)
Check if you have it:
```bash
node --version
```
If you see `v18.x.x` or higher, you're good. If not, go to **https://nodejs.org** and download the LTS version.

### 2. jq (JSON formatter — makes API responses readable)
Install with Homebrew:
```bash
brew install jq
```
Check it works:
```bash
echo '{"hello":"world"}' | jq .
```
You should see the JSON formatted and coloured. If `brew` is not found, install it from **https://brew.sh**.

---

## Part 1 — Two Terminals, Always

You always need **two separate terminal windows open at the same time**:

| Window | Purpose | Port |
|--------|---------|------|
| **Terminal A** | Runs the API server — keep it open always | `3000` |
| **Terminal B** | Where you type curl commands | — |

> **Key rule:** If Terminal A is not running, every curl command will return nothing (silence). The `-s` flag in curl hides connection errors.

---

## Part 2 — Start the Server

### Terminal A — Start the server

```bash
cd ~/Desktop/Automation/backend && npm run dev
```

**You will see this in Terminal A:**
```
[info] Server started {"port":3000,"env":"development","pid":46959}
```

> Leave this running. Do not close it. If it crashes, just re-run the same command.

---

### Terminal B — Confirm the server is alive

Open a **new** terminal window and run:

```bash
curl -s http://localhost:3000/health | jq .
```

**You will see:**
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "timestamp": "2026-04-04T19:28:52.068Z",
    "env": "development"
  },
  "meta": null,
  "error": null
}
```

> If you get nothing — Terminal A's server is not running. Go start it.

---

## Part 3 — Create Your Admin Account

### Step 3.1 — Register a new user

In **Terminal B**, run the command below. **Replace the values** with your own email, password, and name before running.

```bash
curl -s -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "Curia.1312",
    "name": "GOD"
  }' | jq .
```

**What to put where:**

| Field | What it is | Example | Rule |
|-------|-----------|---------|------|
| `email` | Your admin email address | `admin@test.com` | Must be a valid email format |
| `password` | Your chosen password | `Curia.1312` | Minimum 8 characters — **remember this** |
| `name` | Your display name | `GOD` | Any name you want |

**You will see:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjbW5...",
    "user": {
      "id": "cmnkq249r0000j5ith5zux385",
      "email": "admin@test.com",
      "name": "GOD",
      "role": "CUSTOMER",
      "phone": null,
      "isActive": true,
      "createdAt": "2026-04-04T19:24:56.224Z",
      "updatedAt": "2026-04-04T19:24:56.224Z"
    }
  }
}
```

> Notice `"role": "CUSTOMER"` — all new accounts start as customers. You will promote it to ADMIN in the next step.  
> **Write down your `id`** (e.g. `cmnkq249r0000j5ith5zux385`) — you may need it later.

---

### Step 3.2 — Promote your account to ADMIN in Prisma Studio

You cannot promote your own account via the API — by design, only admins can do that. So you do it directly in the database using Prisma Studio.

**Open a third terminal window** (keep Terminal A and B open!) and run:

```bash
cd ~/Desktop/Automation/backend && npx prisma studio
```

You will see:
```
Prisma Studio is up on http://localhost:5555
```

Now:
1. Open **http://localhost:5555** in your browser
2. Click **User** in the left sidebar (the list of tables)
3. Find your user row — look for the `email` column matching what you used in step 3.1 (e.g. `admin@test.com`)
4. Click anywhere on that row to open it
5. Find the `role` column — it currently says **`CUSTOMER`**
6. Click the dropdown and change it to **`ADMIN`**
7. Click the **"Save 1 change"** green button at the top right
8. You will see a success message

> ⚠️ **WARNING: Never touch the `passwordHash` field.** It looks like `$2b$12$abc123...xyz`. Changing or deleting it will break your login permanently. Only change the `role` field.

9. You can now close the Prisma Studio browser tab and stop Prisma Studio by pressing **Ctrl+C** in that terminal.

---

### Step 3.3 — Log in to get your token

Back in **Terminal B**, log in with your email and password:

```bash
curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "Curia.1312"
  }' | jq .
```

> Replace `admin@test.com` and `Curia.1312` with your actual email and password from step 3.1.

**You will see:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjbW5rcTI0OXIwMDAwajVpdGg1enV4Mzg1Iiwicm9sZSI6IkFETUlOIiwiZW1haWwiOiJhZG1pbkB0ZXN0LmNvbSIsImlhdCI6MTc3NTMzMDk2OCwiZXhwIjoxNzc1MzMxODY4fQ.lbmQZQ7axTawDOBf2eMTO_gZ4dZDBA3_WIpgK2xzop8",
    "user": {
      "id": "cmnkq249r0000j5ith5zux385",
      "email": "admin@test.com",
      "name": "GOD",
      "role": "ADMIN",
      "isActive": true,
      "createdAt": "2026-04-04T19:24:56.224Z",
      "updatedAt": "2026-04-04T19:26:50.815Z"
    }
  },
  "meta": null,
  "error": null
}
```

> ✅ Notice `"role": "ADMIN"` — the promotion worked correctly.

**What is the `accessToken`?**

The `accessToken` is a long string that starts with `eyJ...` — it is a **JWT (JSON Web Token)**. You must include this in every request that requires authentication. It looks like this:

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjbW5rcTI0OXIwMDAwajVpdGg1...
```

**⚠️ It expires after 15 minutes.** After that, if you try to use it, you will get:
```json
{"error": {"code": "INVALID_TOKEN", "message": "Token expired"}}
```
Just log in again to get a new one.

---

## Part 4 — Save Your Token as a Variable (`$TOKEN`)

Instead of copying and pasting the long `accessToken` string into every command, save it as a shell variable called `$TOKEN`. This is much easier.

In **Terminal B**, run:

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"Curia.1312"}' | jq -r '.data.accessToken')

echo $TOKEN
```

> Replace `admin@test.com` and `Curia.1312` with your email and password.

The command does two things at once:
1. Logs you in and gets the token
2. Saves the token to a variable called `TOKEN`

You will then see the raw token printed — something like:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjbW5rcT...
```

Now you can use `$TOKEN` anywhere instead of that long string:

```bash
# Without $TOKEN (painful):
curl -s http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjbW5rcTI0OXIwMDAwajVpdGg1enV4Mzg1Iiwicm9sZSI6IkFETUlOIiwiZW1haWwiOiJhZG1pbkB0ZXN0LmNvbSIsImlhdCI6MTc3NTMzMDk2OCwiZXhwIjoxNzc1MzMxODY4fQ.lbmQZQ7axTawDOBf2eMTO_gZ4dZDBA3_WIpgK2xzop8"

# With $TOKEN (clean):
curl -s http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer $TOKEN" | jq .
```

Both are identical — `$TOKEN` is just a shortcut that holds the full token value.

> **Important:** `$TOKEN` is saved only in this terminal session. If you:
> - Open a **new terminal window**, you need to re-run the `TOKEN=...` command
> - Wait **more than 15 minutes**, you need to re-run the `TOKEN=...` command (the token expires)

**Verify it works — check your own profile:**

```bash
curl -s http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer $TOKEN" | jq .
```

**You will see:**
```json
{
  "success": true,
  "data": {
    "id": "cmnkq249r0000j5ith5zux385",
    "email": "admin@test.com",
    "name": "GOD",
    "role": "ADMIN",
    "phone": null,
    "isActive": true,
    "createdAt": "2026-04-04T19:24:56.224Z",
    "updatedAt": "2026-04-04T19:26:50.815Z"
  },
  "meta": null,
  "error": null
}
```

---

## Part 5 — Test All API Endpoints

All commands below use `$TOKEN`. Make sure you have run the `TOKEN=...` command from Part 4 first.

---

### 5.1 — Public: Health check

No token needed.

```bash
curl -s http://localhost:3000/health | jq .
```

**Expected response:**
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "timestamp": "2026-04-04T19:31:57.578Z",
    "env": "development"
  },
  "meta": null,
  "error": null
}
```

---

### 5.2 — Public: List artists

No token needed.

```bash
curl -s http://localhost:3000/api/artists | jq .
```

**Expected response** (empty if no artists have been created yet):
```json
{
  "success": true,
  "data": [],
  "meta": {
    "total": 0,
    "page": 1,
    "limit": 20,
    "totalPages": 0
  },
  "error": null
}
```

---

### 5.3 — Public: List styles

No token needed.

```bash
curl -s http://localhost:3000/api/styles | jq .
```

**Expected response** (empty if no styles have been created yet):
```json
{
  "success": true,
  "data": [],
  "meta": {
    "total": 0,
    "page": 1,
    "limit": 20,
    "totalPages": 0
  },
  "error": null
}
```

---

### 5.4 — Public: Submit a lead (contact form enquiry)

No token needed. This simulates what a customer fills in on your website.

> ⚠️ **Important for tattoo studios:** The `placement` field is **required** because your `BUSINESS_TYPE` is set to `tattoo_studio`. This represents where on the body the customer wants the tattoo. You must include it or you will get a `VALIDATION_ERROR`.

```bash
curl -s -X POST http://localhost:3000/api/leads \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Smith",
    "email": "jane@example.com",
    "phone": "+441234567890",
    "description": "Interested in a full sleeve tattoo",
    "placement": { "area": "left_arm" },
    "source": "instagram"
  }' | jq .
```

**What each field means:**

| Field | Required? | What it is | Example value |
|-------|-----------|-----------|---------------|
| `name` | ✅ Yes | Customer's full name | `"Jane Smith"` |
| `email` | ✅ Yes | Customer's email | `"jane@example.com"` |
| `phone` | ✅ Yes | Customer's phone (E.164 format, min 7 digits) | `"+441234567890"` |
| `description` | ✅ Yes | What they want | `"Interested in a full sleeve tattoo"` |
| `placement` | ✅ Yes (tattoo studios only) | Body area from the tattoo map widget | `{"area": "left_arm"}` |
| `source` | No | Where they heard about you | `"instagram"`, `"google"`, `"referral"` |

> The `placement` value is a JSON object. For simple testing, `{"area": "left_arm"}` works. Other examples: `{"area": "back"}`, `{"area": "right_leg"}`.

**Expected response:**
```json
{
  "success": true,
  "data": {
    "id": "cmnkr1abc0001ahqv519xyz12",
    "name": "Jane Smith",
    "email": "jane@example.com",
    "phone": "+441234567890",
    "status": "NEW",
    "score": 0,
    "source": "instagram",
    "createdAt": "2026-04-04T19:35:00.000Z"
  },
  "meta": null,
  "error": null
}
```

> **Why did my previous attempt fail?** If you previously ran this without `placement`, you got:
> ```json
> {"error": {"code": "VALIDATION_ERROR", "details": [{"field": "body.placement", "message": "Required"}]}}
> ```
> That is because `tattoo_studio` mode requires the body placement. Adding `"placement": {"area":"left_arm"}` fixes it.

---

### 5.5 — Admin: List all leads

Requires ADMIN token.

```bash
curl -s http://localhost:3000/api/leads \
  -H "Authorization: Bearer $TOKEN" | jq .
```

**Expected response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "cmnkr1abc0001ahqv519xyz12",
      "name": "Jane Smith",
      "email": "jane@example.com",
      "phone": "+441234567890",
      "country": null,
      "status": "NEW",
      "score": 0,
      "businessType": "tattoo_studio",
      "source": "instagram",
      "utmSource": null,
      "artistId": null,
      "serviceId": null,
      "createdAt": "2026-04-04T19:35:00.000Z",
      "artist": null,
      "service": null
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  },
  "error": null
}
```

> **You might also see a lead called "Test Customer"** — that is existing data already in your database from a previous test or seed run. It is normal and does not mean anything is wrong. The `Jane Smith` entry will appear once step 5.4 is run correctly (with the `placement` field).

---

### 5.6 — Admin: Export leads as CSV

Requires ADMIN token.

```bash
curl -s http://localhost:3000/api/leads/export \
  -H "Authorization: Bearer $TOKEN"
```

**Expected response** (raw CSV text, not JSON):
```
id,name,email,phone,country,status,score,businessType,description,...
cmnkr1abc0001ahqv519xyz12,Jane Smith,jane@example.com,+441234567890,,NEW,0,tattoo_studio,...
```

To save it to a file instead of printing it:
```bash
curl -s http://localhost:3000/api/leads/export \
  -H "Authorization: Bearer $TOKEN" \
  -o leads.csv && echo "Saved to leads.csv"
```

---

### 5.7 — Admin: Create a tattoo style

Requires ADMIN token.

```bash
curl -s -X POST http://localhost:3000/api/styles \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Traditional",
    "description": "Classic bold lines and colours"
  }' | jq .
```

**What each field means:**

| Field | Required? | What it is | Example |
|-------|-----------|-----------|---------|
| `name` | ✅ Yes | Name of the style | `"Traditional"` |
| `description` | No | Short description | `"Classic bold lines and colours"` |

**Expected response:**
```json
{
  "success": true,
  "data": {
    "id": "cmnkqe3nj0004tbkhxyshp6m8",
    "name": "Traditional",
    "description": "Classic bold lines and colours",
    "exampleImageUrl": null,
    "isActive": true
  },
  "meta": null,
  "error": null
}
```

---

### 5.8 — Admin: Create an artist

Requires ADMIN token.

> ⚠️ **Important:** Creating an artist also creates a **User account** for them (so they can log in). You must provide their `email`, `password`, and a `slug` (a URL-safe identifier). These are all required fields.

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

**What each field means:**

| Field | Required? | What it is | Example | Rule |
|-------|-----------|-----------|---------|------|
| `name` | ✅ Yes | Artist's display name | `"Alex Ink"` | Max 100 characters |
| `email` | ✅ Yes | Artist's login email | `"alex@yourstudio.com"` | Must be a valid email, unique |
| `password` | ✅ Yes | Artist's login password | `"Artist123!"` | Min 8 characters |
| `slug` | ✅ Yes | URL identifier for their public profile | `"alex-ink"` | Lowercase letters, numbers, hyphens only. E.g. `"alex-ink"`, `"jane-doe-tattoo"` |
| `bio` | No | Short bio shown on their profile | `"Specialist in traditional and neo-trad"` | Max 2000 characters |

> **Why did my previous attempt fail?** The error said `email`, `password`, and `slug` were required. The earlier curl only sent `name`, `bio`, and `instagram` — which is why it failed. The correct command is above.

**Expected response:**
```json
{
  "success": true,
  "data": {
    "id": "cmnkr2xyz0005ahqv123abc45",
    "slug": "alex-ink",
    "bio": "Specialist in traditional and neo-trad",
    "profileImageUrl": null,
    "portfolioImages": [],
    "isActive": true,
    "userId": "cmnkr2xyz0006ahqv456def78",
    "user": {
      "id": "cmnkr2xyz0006ahqv456def78",
      "name": "Alex Ink",
      "email": "alex@yourstudio.com"
    }
  },
  "meta": null,
  "error": null
}
```

---

## Part 6 — Common Errors and Fixes

| Error you see | What it means | How to fix |
|---|---|---|
| **No output at all (silence)** | Server is not running | Go to Terminal A and run `npm run dev` |
| `"code": "INVALID_CREDENTIALS"` | Wrong email or password | Use the exact email and password from step 3.1 |
| `"code": "INVALID_TOKEN"` | Token is expired (15 min limit) | Re-run the `TOKEN=...` command from Part 4 |
| `"code": "FORBIDDEN"` | Your account role is not ADMIN | Go to step 3.2 and promote your account in Prisma Studio |
| `"code": "VALIDATION_ERROR"` with `body.placement: Required` | You submitted a lead without the placement field (tattoo studios require it) | Add `"placement": {"area":"left_arm"}` to your lead POST body |
| `"code": "VALIDATION_ERROR"` with `body.email`, `body.password`, `body.slug: Required` | You tried to create an artist without the required login fields | Add `"email"`, `"password"`, and `"slug"` to your artist POST body |
| `"code": "CONFLICT"` | Email already registered | Use a different email address |
| `jq: command not found` | jq is not installed | Run `brew install jq` in Terminal B |
| `TOKEN` is empty (`echo $TOKEN` shows nothing) | jq could not parse the login response | Make sure the login curl succeeded and that jq is installed |

---

## Part 7 — Roles Explained

| Role | Who it is | What they can access |
|---|---|---|
| `CUSTOMER` | A regular client | Public endpoints + their own profile |
| `ARTIST` | A studio artist / staff member | Public endpoints + their own bookings + their own availability |
| `ADMIN` | Studio owner / manager | Everything — leads, exports, all artists, styles, settings |

> **How to change a role:** Only through Prisma Studio (`npx prisma studio` → open http://localhost:5555 → find the user in the `User` table → change `role` → save).

---

## Part 8 — Quick Reference Cheatsheet

```bash
# ── TERMINAL A — keep this open always ───────────────────────────────────────
cd ~/Desktop/Automation/backend && npm run dev

# ── TERMINAL B — run these commands ──────────────────────────────────────────

# Refresh your admin token (do this every 15 min or when you open a new terminal):
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"Curia.1312"}' | jq -r '.data.accessToken')
echo "Token: ${TOKEN:0:40}..."

# Health check:
curl -s http://localhost:3000/health | jq .data.status

# Who am I?
curl -s http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer $TOKEN" | jq .data

# List all leads (admin only):
curl -s http://localhost:3000/api/leads \
  -H "Authorization: Bearer $TOKEN" | jq .

# Export leads as CSV (admin only):
curl -s http://localhost:3000/api/leads/export \
  -H "Authorization: Bearer $TOKEN"

# Submit a lead (public — tattoo studio requires placement field):
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

# Create a style (admin only):
curl -s -X POST http://localhost:3000/api/styles \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Traditional","description":"Classic bold lines"}' | jq .

# Create an artist (admin only) — email, password, and slug are all required:
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
