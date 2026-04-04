# BookingAutomation — Operational Testing Guide

> **Run every command from:** `~/Desktop/Automation/backend` unless told otherwise.  
> Copy and paste each block exactly. Wait for it to finish before running the next one.

---

## ⚠️ The Golden Rule — Two Terminals

You always need **two separate terminal windows open at the same time**:

| Terminal | What runs | Port |
|----------|-----------|------|
| **Terminal A** | `npm run dev` — the API backend server | `3000` |
| **Terminal B** | Your curl commands / Prisma Studio | — |

**If Terminal A is not running, every curl command returns nothing.** The `-s` flag on curl suppresses the "connection refused" error message, so silence = server is down.

---

## Part 1 — Start Your Server

### Terminal A — Start the API backend (keep this running always)

```bash
cd ~/Desktop/Automation/backend && npm run dev
```

**You will see:**
```
[info] Server started {"port":3000,"env":"development","pid":12345}
```

> Leave this terminal open. Never close it while testing. If the server crashes, re-run this command.

---

### Terminal B — Verify the server is alive

Open a **new terminal window** and run:

```bash
curl http://localhost:3000/health
```

**You will see:**
```json
{"success":true,"data":{"status":"ok","timestamp":"2026-04-04T18:30:00.000Z","env":"development"},"meta":null,"error":null}
```

> If you get nothing — Terminal A's server is not running. Go back and start it.

---

## Part 2 — Create Your First User

### Step 2.1 — Register a new user

**All** new users start as `CUSTOMER`. You register them via the API — never create them manually in Prisma Studio.

In **Terminal B**, run:

```bash
curl -s -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "Admin123!",
    "name": "My Admin"
  }' | jq .
```

> Replace `admin@test.com`, `Admin123!`, and `My Admin` with whatever you want.  
> The password must be at least 8 characters. **Remember this password — you will use it to log in.**

**You will see something like:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjbHVpNXh...",
    "refreshToken": "a3f8b2c1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0",
    "user": {
      "id": "clui5xyz1234abcd",
      "email": "admin@test.com",
      "name": "My Admin",
      "role": "CUSTOMER",
      "phone": null,
      "isActive": true,
      "createdAt": "2026-04-04T18:30:00.000Z",
      "updatedAt": "2026-04-04T18:30:00.000Z"
    }
  }
}
```

**Note the `id` field** (e.g. `clui5xyz1234abcd`) — you may need it.  
**Note the `accessToken`** — this is a 15-minute token. You can use it now but it expires.

---

### Step 2.2 — Promote the user to ADMIN in Prisma Studio

You cannot promote yourself via the API (by design — only admins can promote others). Instead, do it directly in the database:

1. Open a **third terminal window** and run:
   ```bash
   cd ~/Desktop/Automation/backend && npx prisma studio
   ```
2. Open your browser at **http://localhost:5555**
3. Click **User** in the left sidebar
4. Find your user row (look for the email `admin@test.com`)
5. Click on that row to open it
6. Find the **`role`** field — it currently says `CUSTOMER`
7. Click the dropdown and change it to **`ADMIN`**
8. Click **Save 1 change** (green button at the top right)
9. You can now close Prisma Studio (Ctrl+C in that terminal)

> ⚠️ **Do NOT touch the `passwordHash` field.** It looks like `$2b$12$abc123...` — leave it exactly as is. Changing it will break login.

---

### Step 2.3 — Log in to get a fresh token

Now log in with your email and the plain-text password you chose in Step 2.1:

```bash
curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "Admin123!"
  }' | jq .
```

> Use YOUR email and YOUR password here — the ones from Step 2.1.

**You will see:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjbHVpNXh...",
    "refreshToken": "d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4",
    "user": {
      "id": "clui5xyz1234abcd",
      "email": "admin@test.com",
      "name": "My Admin",
      "role": "ADMIN",
      ...
    }
  }
}
```

> Notice `"role": "ADMIN"` — the promotion worked.

---

## Part 3 — Using Your Token

The `accessToken` is what you put in every protected API request. It looks like:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjbHVpNXh...
```

**It expires after 15 minutes.** If you get a `401 INVALID_TOKEN` error, just log in again (Step 2.3) to get a new one.

### How to use the token in a curl command

Add this header to any request that requires authentication:
```
-H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Example — get your own profile:**
```bash
curl -s http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjbHVpNXh..." | jq .
```

Replace the token with YOUR actual token from the login response.

**You will see:**
```json
{
  "success": true,
  "data": {
    "id": "clui5xyz1234abcd",
    "email": "admin@test.com",
    "name": "My Admin",
    "role": "ADMIN",
    "phone": null,
    "isActive": true,
    "createdAt": "2026-04-04T18:30:00.000Z",
    "updatedAt": "2026-04-04T18:30:00.000Z"
  }
}
```

---

## Part 4 — Save Your Token as a Shell Variable (Easier Workflow)

Instead of copy-pasting the token into every command, save it to a variable in Terminal B:

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"Admin123!"}' | jq -r '.data.accessToken')

echo $TOKEN
```

> Replace the email and password with yours. If `jq` is not installed, run `brew install jq` on Mac.

You will see the raw token string printed. Now you can use `$TOKEN` in any command:

```bash
curl -s http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer $TOKEN" | jq .
```

> **Note:** `$TOKEN` only lasts 15 minutes, and only in this terminal session. If you open a new terminal or wait too long, re-run the `TOKEN=...` command above to get a fresh one.

---

## Part 5 — Test the Main API Endpoints

All commands below use `$TOKEN`. Run the token-save command from Part 4 first.

---

### 5.1 — Public: Check health

```bash
curl -s http://localhost:3000/health | jq .
```

Expected: `"status": "ok"`

---

### 5.2 — Public: List artists

```bash
curl -s http://localhost:3000/api/artists | jq .
```

Expected: `"data": []` (empty until you create artists)

---

### 5.3 — Public: List styles (tattoo styles, etc.)

```bash
curl -s http://localhost:3000/api/styles | jq .
```

Expected: `"data": []` (empty until you create styles)

---

### 5.4 — Public: Submit a lead (contact form)

```bash
curl -s -X POST http://localhost:3000/api/leads \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Smith",
    "email": "jane@example.com",
    "phone": "+441234567890",
    "description": "Interested in a sleeve tattoo",
    "source": "instagram"
  }' | jq .
```

Expected: a lead object with `"status": "NEW"`

---

### 5.5 — Admin: List all leads

```bash
curl -s http://localhost:3000/api/leads \
  -H "Authorization: Bearer $TOKEN" | jq .
```

Expected: paginated list of leads including the one from step 5.4.

---

### 5.6 — Admin: Export leads as CSV

```bash
curl -s http://localhost:3000/api/leads/export \
  -H "Authorization: Bearer $TOKEN"
```

Expected: CSV text output with column headers like `id,name,email,phone,...`

To save it to a file:
```bash
curl -s http://localhost:3000/api/leads/export \
  -H "Authorization: Bearer $TOKEN" -o leads.csv && echo "Saved to leads.csv"
```

---

### 5.7 — Admin: Create a style

```bash
curl -s -X POST http://localhost:3000/api/styles \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Traditional",
    "description": "Classic bold lines and colours"
  }' | jq .
```

Expected: the new style object with an `id`.

---

### 5.8 — Admin: Create an artist

```bash
curl -s -X POST http://localhost:3000/api/artists \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Alex Ink",
    "bio": "Specialist in traditional and neo-trad",
    "instagram": "@alexink"
  }' | jq .
```

Expected: the new artist object with an `id`.

---

## Part 6 — Common Errors and Fixes

| What you see | What it means | Fix |
|---|---|---|
| No output at all | Server is not running | Start Terminal A: `npm run dev` |
| `"code": "INVALID_CREDENTIALS"` | Wrong email or password | Use the exact email/password from Step 2.1 |
| `"code": "INVALID_TOKEN"` | Token expired (15 min) | Re-run the `TOKEN=...` command from Part 4 |
| `"code": "FORBIDDEN"` | Your role is not ADMIN | Go back to Step 2.2 and promote the user in Prisma Studio |
| `"code": "VALIDATION_ERROR"` | Missing or wrong field in JSON body | Check the error details for which field is wrong |
| `jq: command not found` | jq not installed | Run `brew install jq` in Terminal B |

---

## Part 7 — Roles Explained

| Role | Who it is | What they can do |
|---|---|---|
| `CUSTOMER` | A regular user / client | View public endpoints, manage their own profile |
| `ARTIST` | A tattoo artist / staff member | Everything CUSTOMER can do, plus manage their own bookings and availability |
| `ADMIN` | Studio owner / manager | Full access to all API endpoints — leads, artists, styles, settings, exports |

> **How to change a role:** Only via Prisma Studio (http://localhost:5555 while `npx prisma studio` is running). Find the user in the `User` table, change the `role` field, and save.

> **Note:** A `SUPER_ADMIN` tier is planned for a future phase when multiple studios exist. For now `ADMIN` is the highest role.

---

## Part 8 — Quick Reference Card

```bash
# ── Start everything ─────────────────────────────────────────────────────────
# Terminal A (leave open):
cd ~/Desktop/Automation/backend && npm run dev

# Terminal B (for commands):
# Optional — open database GUI:
cd ~/Desktop/Automation/backend && npx prisma studio
# Then open http://localhost:5555 in your browser

# ── Get / refresh your admin token ───────────────────────────────────────────
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"Admin123!"}' | jq -r '.data.accessToken')
echo "Token saved: ${TOKEN:0:30}..."

# ── Health check ──────────────────────────────────────────────────────────────
curl -s http://localhost:3000/health | jq .data.status

# ── Who am I? ────────────────────────────────────────────────────────────────
curl -s http://localhost:3000/api/auth/me -H "Authorization: Bearer $TOKEN" | jq .data

# ── List leads (admin) ───────────────────────────────────────────────────────
curl -s http://localhost:3000/api/leads -H "Authorization: Bearer $TOKEN" | jq .

# ── Submit a lead (public) ───────────────────────────────────────────────────
curl -s -X POST http://localhost:3000/api/leads \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"t@t.com","description":"Test enquiry"}' | jq .
```
