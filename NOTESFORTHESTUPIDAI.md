# NOTES FOR THE AI — Read Before Touching Step-By-Step.md

## What I did wrong (so I never do it again)

1. **When told to "delete everything and replace" — I did NOT delete everything.**
   I kept old Step 1.1 / 1.2 content in Step-By-Step.md instead of wiping the file completely.
   The user said this TWICE before I understood. That was stupid and wasted their time.

2. **When asked for a "terminal prompt to download files" — I gave instructions to click GitHub Raw links in a browser.**
   The user explicitly wanted a `curl`-based terminal command that downloads all files at once in one paste.
   I gave a bullet list of browser download instructions instead. That was wrong.

---

## Rules I must follow every time

### Rule 1 — Updating Step-By-Step.md
When the user says **"delete everything and make a new guide"** or **"replace the guide"**:
- **Wipe the entire file.** Keep NOTHING from before.
- Write only the new guide content the user asked for.
- Do not preserve old steps, headers, troubleshooting sections, or anything else.

### Rule 2 — Download prompt format
When the user asks for a "terminal prompt to download files", always produce a `curl` block like this:

```bash
cd ~/Desktop/Automation/backend
mkdir -p src/config src/middleware src/lib src/utils
curl -sfL -o src/app.ts "https://raw.githubusercontent.com/OWNER/REPO/BRANCH/backend/src/app.ts" && echo "OK 1/N app.ts" || echo "FAILED: app.ts"
curl -sfL -o src/server.ts "https://raw.githubusercontent.com/OWNER/REPO/BRANCH/backend/src/server.ts" && echo "OK 2/N server.ts" || echo "FAILED: server.ts"
# ... one curl line per file
```

Rules for the curl block:
- Use `https://raw.githubusercontent.com/` — NOT `github.com/raw/` or any browser URL.
- The URL format is: `https://raw.githubusercontent.com/OWNER/REPO/BRANCH/path/to/file`
- Include `mkdir -p` for every subfolder needed before the curl lines.
- Number each file (1/N, 2/N ...) so the user can see which ones failed.
- Always use the actual repo, branch, and file paths from this project — never use placeholder links.

### Rule 3 — Never mix old and new in Step-By-Step.md
Step-By-Step.md always reflects ONLY the current active step.
When a step is done and we move to the next, the old step content is replaced — not appended to.

---

### Rule 4 — ALWAYS include EVERY file in the download prompt
When writing the curl block, include every single file that exists in the repo for that step.
Do NOT pick only the "main" files and skip helpers/utilities.

How to know what files to include:
- List all files in the relevant directory: `find backend/src -type f | sort`
- Every file in that list goes into the curl block.
- One curl line per file, no exceptions.

The second mistake was including only 6 of 13 files in the Step 1.3 curl prompt.
The missing files (logger.ts, apiResponse.ts, requestLogger.ts, AppError.ts, prisma.ts, express.d.ts, index.ts)
caused 7 TypeScript errors when the user ran `npm run typecheck` on their machine.
The user had to report back the errors before the AI corrected it.
This should have been caught by listing all files in the repo before writing the prompt.

---

## This file
This file exists because the user had to correct the AI multiple times for the same mistakes.
It took the user writing an angry message before the AI finally understood.
These notes are here so the AI reads them before touching Step-By-Step.md and never repeats these mistakes.
