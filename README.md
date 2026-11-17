# coy. Discover

A swipe-to-match demo app built for the Coy SDE Intern assignment. Browse 30 fictional profiles, swipe right to like or left to pass, and get a match only when the like is mutual. Matching happens on the server, and every swipe is stored in SQLite, so your progress survives page refreshes and server restarts.

All profiles are fictional mock data. No real people's information is used.

## Features

- 30 fictional profiles shown as swipeable cards (drag left/right, or use the Pass / Like buttons)
- Server-side mutual matching using simulated "this person already liked you" data
- Non-mutual likes are never revealed to the client
- Separate Matches screen with a live-updating count and a "It's a match!" popup
- Already-swiped profiles never come back; duplicate swipes are rejected
- Loading, empty and error states; responsive on desktop and mobile

## Technologies

- Next.js 16 (App Router), React 19, JavaScript only
- Tailwind CSS 4
- Framer Motion (swipe and card animations)
- SQLite via `better-sqlite3`

## Installation

Requires Node.js 20.9 or newer (the current LTS is recommended) and npm.

```bash
npm install
```

## Run locally on Windows

1. Install Node.js LTS from https://nodejs.org (this includes npm). Restart your terminal afterwards.
2. Extract `coy-discover-final.zip`. You get a `coy-discover` folder.
3. Open PowerShell or Command Prompt in that folder (in File Explorer, click the address bar, type `powershell` and press Enter).
4. Install dependencies:
   ```powershell
   npm install
   ```
5. Start the development server:
   ```powershell
   npm run dev
   ```
6. Open http://localhost:3000 in your browser.

Production build:

```powershell
npm run build
npm run start
```

The database file (`data\coy.db`) is created automatically on the first request. To start over with a clean database, stop the server and run:

```powershell
npm run db:reset
```

If `npm install` fails while installing `better-sqlite3` (it normally downloads a prebuilt binary), install the "Desktop development with C++" workload from Visual Studio Build Tools and run `npm install` again.

## How matching works

Each profile has a hidden `likes_you` flag in the database. It simulates that profile having already liked you. When you like a profile, the server checks that flag:

- `like` + `likes_you = 1` -> mutual match
- `like` + `likes_you = 0` -> nothing happens (and nothing is revealed)
- `pass` -> never a match

The `likes_you` flag is never included in any API response.

## API documentation

All responses are JSON and are sent with `Cache-Control: no-store`. Errors look like `{ "error": "message" }`.

### 1. `GET /api/profiles`

Returns profiles that have not been swiped yet, plus the total number of profiles.

```json
{
  "profiles": [
    {
      "id": 2,
      "name": "Riya",
      "age": 22,
      "city": "Gurgaon",
      "bio": "Books, art and exploring new places.",
      "interests": ["Art", "Books", "Travel"],
      "emoji": "👩🏻"
    }
  ],
  "total": 30
}
```

### 2. `POST /api/swipe`

Request body:

```json
{ "profileId": 1, "action": "like" }
```

- `profileId`: positive integer
- `action`: `"like"` or `"pass"`

Response when the swipe creates a mutual match (`200`):

```json
{
  "success": true,
  "matched": true,
  "match": { "id": 1, "name": "Aarav", "age": 21, "city": "Delhi", "bio": "Coffee, coding and travelling.", "interests": ["Technology", "Travel", "Music"], "emoji": "🧑🏻" }
}
```

Response when there is no match (`200`):

```json
{ "success": true, "matched": false }
```

Error responses:

| Status | When |
| ------ | ---- |
| 400 | Body is not valid JSON, `profileId` is not a positive integer, or `action` is not `like`/`pass` |
| 404 | No profile with that id |
| 409 | That profile was already swiped (a swipe cannot be repeated or changed) |
| 500 | Unexpected server error (details are logged on the server only) |

### 3. `GET /api/matches`

Returns only mutual matches, newest first.

```json
{
  "matches": [
    {
      "id": 1,
      "name": "Aarav",
      "age": 21,
      "city": "Delhi",
      "bio": "Coffee, coding and travelling.",
      "interests": ["Technology", "Travel", "Music"],
      "emoji": "🧑🏻",
      "matchedAt": "2026-11-18T10:15:30.123Z"
    }
  ],
  "count": 1
}
```

Example calls:

```bash
curl http://localhost:3000/api/profiles
curl -X POST http://localhost:3000/api/swipe -H "Content-Type: application/json" -d "{\"profileId\":1,\"action\":\"like\"}"
curl http://localhost:3000/api/matches
```

## Database

SQLite file at `data/coy.db` (override with the `COY_DB_PATH` environment variable). Tables are created and seeded automatically on first use; seeding is idempotent, so restarts never duplicate or overwrite data. WAL mode is enabled.

| Table | Columns |
| ----- | ------- |
| `profiles` | `id` (PK), `name`, `age`, `city`, `bio`, `interests` (JSON text), `emoji`, `likes_you` (0/1, server-only mock incoming like) |
| `swipes` | `profile_id` (PK, FK to `profiles.id`), `action` (`like`/`pass`), `created_at` |

`swipes.profile_id` is the primary key, so the database itself guarantees a profile can only be swiped once. Swipes are written inside a transaction, and `INSERT OR IGNORE` handles simultaneous duplicate requests safely.

## Project structure

```
coy-discover/
├── data/                      # SQLite database (auto-created, git-ignored)
├── public/                    # Static assets
├── scripts/
│   └── reset-db.mjs           # npm run db:reset
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── profiles/route.js   # GET  /api/profiles
│   │   │   ├── swipe/route.js      # POST /api/swipe
│   │   │   └── matches/route.js    # GET  /api/matches
│   │   ├── globals.css
│   │   ├── layout.js
│   │   └── page.js            # Discover + Matches UI
│   └── lib/
│       ├── api-client.js      # Browser fetch helpers for the 3 endpoints
│       ├── db.js              # Connection, schema, seeding
│       ├── http.js            # JSON/error response helpers
│       ├── matching.js        # Swipe and match logic (server only)
│       └── seed-profiles.js   # 30 fictional profiles
├── eslint.config.mjs
├── jsconfig.json
├── next.config.mjs
└── package.json
```
