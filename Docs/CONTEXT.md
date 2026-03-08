# Evenly - Project Context Document

> **Purpose**: This file captures all decisions, discussions, and context from the initial planning chat so a new chat session can continue development without losing information.
> 
> **Created**: March 7, 2026
> **Project Path**: `C:\Users\91809\OneDrive\Desktop\split_project\Evenly`

---

## 1. What Is Evenly?

A **Splitwise-like web application** for splitting expenses among groups. Users authenticate via Gmail, create groups, add expenses with flexible split methods, track balances, and settle debts.

---

## 2. Documents Created

| File | Path | Description |
|------|------|-------------|
| PRD | `Evenly/Docs/PRD.md` | Full Product Requirements Document (v1.1) |
| Schema | `Evenly/Docs/Tables.md` | Complete database schema with SQL definitions |
| Context | `Evenly/Docs/CONTEXT.md` | This file |

---

## 3. Tech Stack (Decided)

| Component | Technology |
|-----------|------------|
| Frontend | React.js + Vite + shadcn/ui |
| Backend | Node.js + Express.js |
| Database | Supabase (PostgreSQL) |
| Authentication | Google OAuth 2.0 + Supabase Auth |
| Hosting | Vercel (frontend) + Railway/Render (backend) - TBD |

**Explicitly excluded from MVP:**
- No file storage service (no attachments)
- No email service (no email notifications)
- No rate limiting for now

---

## 4. Database Tables (6 Tables)

| Table | Purpose |
|-------|---------|
| `users` | User accounts (name, email, profile_pic from Google, default_currency) |
| `groups` | Expense groups (name, currency, invite_code, created_by, is_deleted) |
| `user_groups` | User-group memberships (user_id, group_id, role: admin/member) |
| `transactions` | Expenses & settlements (amount, paid_by, distribution as JSONB, type, category) |
| `activity_logs` | Audit trail (group_id, user_id, type, data as JSONB) |
| `balances` | Pre-computed debtor-creditor balances (from_user_id owes to_user_id amount) |

Full SQL definitions are in `Tables.md`.

---

## 5. Key Design Decisions

### 5.1 Features IN MVP
- Gmail OAuth login (no email/password)
- Group CRUD with admin roles
- Permanent invite code per group + shareable link with auto-join
- Expense CRUD with 4 distribution methods (equal, exact, percentage, share)
- Manual settlement recording (partial allowed)
- Per-group balance breakdown (who owes whom)
- Activity log for all group actions
- Transaction categories (predefined: Food, Transport, etc.)
- Currency support per group (all transactions use group currency)
- Dark/Light mode theme toggle
- Desktop-first responsive design (also mobile responsive)

### 5.2 Features NOT in MVP (Future Scope)
- Notifications (in-app, email, push) - entirely removed from MVP
- Expense attachments (receipts/bills)
- Simplified debts algorithm
- Payment integration (UPI)
- Recurring expenses
- Multiple payers per transaction
- Mobile apps
- Export reports
- Receipt OCR

### 5.3 Removed Features (Discussed & Explicitly Excluded)
- Profile picture upload (Google provides it, stored but no upload UI)
- Logout from all devices
- Expiring invite links (only permanent code + shareable link)
- Invite code regeneration
- Soft delete for transactions (hard delete only; groups have soft delete)
- Per-transaction currency (group currency applies to all)
- Currency conversion

---

## 6. Key Business Rules

### Authentication
- Gmail OAuth only, no email/password
- First-time users prompted to set display name
- Session managed via JWT (Supabase Auth)

### Groups
- Creator is auto-assigned admin role
- Group must have 2+ members (creator + at least 1 other)
- Each group has ONE currency (applies to all transactions)
- Group currency changeable by admin only if no transactions exist
- Group deletion requires all balances to be zero
- Soft delete for groups (is_deleted flag)

### Invite System
- Permanent invite code auto-generated at group creation (6-char alphanumeric)
- Code visible to ALL group members (not just admin)
- Shareable link format: `{app_url}/join?code={invite_code}`
- Link click → auto-join if authenticated, else login first then auto-join
- No code regeneration, no expiring links

### Members
- Roles: admin, member
- Admin powers: remove members, delete group, manage invite codes, promote/demote members
- Any member can create/edit/delete any expense (discussed - acknowledged risk)
- Members must settle all balances before leaving
- Members can only be removed if their balance is zero
- Group creator cannot be removed or demoted

### Transactions
- Type: 'expense' or 'settlement'
- Description/title is OPTIONAL
- Amount is required
- 4 distribution methods: equal, exact, percentage, share
- Categories: Food & Drinks, Transportation, Accommodation, Shopping, Entertainment, Utilities, Rent, Healthcare, Education, Others
- Can be backdated
- Hard delete (no soft delete)

### Settlements
- Manual recording only (no payment integration)
- Uses `paid_by` (payer) + `splits[0].user_id` (receiver) structure
- Settlement always has exactly ONE user in splits
- `paid_by` and `splits[0].user_id` must be different
- Partial settlements allowed

### Balances
- Pre-computed table (NOT computed on-the-fly)
- Updated via **application-level logic (Option A)** on every transaction change
- One-directional storage: from_user (debtor) → to_user (creditor)
- Amount always positive; if balance flips, swap from/to
- Zero balances are deleted (no zero-amount records)
- One record per user pair per group
- Database triggers (Option B) discussed but deferred for later as safety net

---

## 7. Activity Log Types

| Type | When Logged |
|------|-------------|
| `group_created` | New group created |
| `group_updated` | Group name/settings changed |
| `member_joined` | User joins via code/link |
| `member_left` | User voluntarily leaves |
| `member_removed` | Admin removes a member |
| `member_promoted` | Member promoted to admin |
| `member_demoted` | Admin demoted to member |
| `expense_added` | New expense created |
| `expense_updated` | Expense edited (stores before/after snapshot) |
| `expense_deleted` | Expense deleted (stores snapshot) |
| `settlement_recorded` | Settlement created |
| `settlement_updated` | Settlement edited |
| `settlement_deleted` | Settlement deleted |

All activity log entries store contextual data in a JSONB `data` field. See `Tables.md` for exact structures.

---

## 8. UI Pages (Planned)

| Page | Priority |
|------|----------|
| Landing Page | P0 |
| Login Page (Google OAuth) | P0 |
| Dashboard (groups overview, balances) | P0 |
| Group List | P0 |
| Group Detail (members, expenses, balances, activity log) | P0 |
| Add/Edit Expense Form | P0 |
| Add Settlement Form | P0 |
| Join Group (code entry / auto-join via link) | P0 |
| Profile/Settings | P1 |

Design approach: Desktop-first, responsive for mobile, dark/light mode toggle.

---

## 9. Open Items & Recommendations (Not Yet Acted On)

These were discussed but user hasn't decided/implemented yet:

### 9.1 Schema Improvements Suggested
- [x] **Add `updated_by` field to transactions table** - ✅ Added. Tracks who last edited (important since any member can edit any expense). NULLABLE UUID FK to users.
- [x] **`profile_pic` in users table** - ✅ Keeping it. Google provides it for free via OAuth, no upload UI needed.
- [x] **`icon` in groups table** - ✅ Keeping column, skipping UI for MVP.

### 9.2 Policy Concerns Raised
- **Any member can edit/delete any expense** - Risk of malicious edits. Suggested: at minimum rely on activity log for accountability. Consider restricting to creator + admin in future.
- **Must settle to leave group** - What about tiny balances or inactive groups? Suggested: consider threshold or admin override in future.
- **No notification system** - Users won't know when expenses are added. Activity log exists but requires manual checking. Consider adding basic in-app notifications post-MVP.

### 9.3 Architecture Decision Pending
- **Supabase-only vs Express backend**: Since Supabase provides Auth, Database, and Edge Functions, the Express backend could potentially be skipped. User chose Express for now. Can reconsider.

---

## 10. Balance Calculation Logic

### On Expense Added
```
For each user in splits (except payer):
  → That user owes payer the split amount
  → UPSERT balance record (from=split_user, to=payer)
  → Handle direction flips if reverse record exists
```

### On Settlement Recorded
```
paid_by pays splits[0].user_id
  → Decrease from_user(paid_by) → to_user(receiver) balance
  → Delete record if zero, swap direction if negative
```

### On Transaction Edited
```
1. Reverse old transaction's balance effects
2. Apply new transaction's balance effects
```

### On Transaction Deleted
```
Reverse the transaction's balance effects
```

### Key Rules
1. Always store debtor → creditor (one direction only)
2. Delete record if amount reaches zero
3. Swap from/to if amount goes negative
4. One record per (group, user_pair)

---

## 11. What To Do Next

The following tasks are pending and should be the starting point in a new chat:

1. ~~**Finalize open schema items**~~ ✅ Done - `updated_by` added, `profile_pic` and `icon` kept
2. **Define API contracts** (endpoints documented per-feature as we build)
3. ~~**Set up project structure**~~ ✅ Done - monorepo: `client/` + `server/`
4. ~~**Initialize projects**~~ ✅ Done - Vite + React (JS) + shadcn/ui frontend, Express (JS) backend
5. ~~**Set up Supabase**~~ ✅ Done - project created, Google OAuth configured, `users` table migrated
6. **Start building** - suggested order:
   - ~~Auth flow (Google OAuth)~~ ✅ Done & tested end-to-end (see Section 13.1)
   - ~~Group CRUD + invite system~~ ✅ Done (see Section 13.3)
   - Transaction CRUD + distribution logic
   - Balance calculation
   - Activity logging
   - UI pages

---

## 12. How To Use This Document

Start a new chat with a prompt like:

> "Read the file at `C:\Users\91809\OneDrive\Desktop\split_project\Evenly\Docs\CONTEXT.md` to understand the full project context. Then read `PRD.md` and `Tables.md` in the same Docs folder. We're building Evenly - a Splitwise-like app. All planning is done. Let's start with [specific task]."

This gives the new session complete context to continue without repeating discussions.

---

## 13. Feature Implementation Log

### 13.1 Authentication (Google OAuth) - ✅ Completed

**Date**: March 8, 2026

#### What was built

**Frontend (client/):**
- `src/lib/supabase.js` - Supabase client initialized with project URL + anon key
- `src/contexts/AuthContext.jsx` - Auth state management (user, session, loading). Provides `signInWithGoogle()` and `signOut()` functions. Listens to Supabase auth state changes.
- `src/pages/LoginPage.jsx` - Google OAuth login button. Redirects to `/dashboard` if already logged in.
- `src/pages/AuthCallbackPage.jsx` - Handles OAuth redirect. Exchanges PKCE code for session if present, then navigates to `/dashboard`. Critical: this page must exist at `/` so Supabase's redirect doesn't get caught by the catch-all route (which would strip auth tokens from the URL).
- `src/pages/DashboardPage.jsx` - Placeholder dashboard. Shows logged-in user email/name + sign out button.
- `src/components/ProtectedRoute.jsx` - Wrapper that redirects to `/login` if not authenticated.
- `src/App.jsx` - Routes: `/login`, `/auth/callback`, `/` (AuthCallbackPage), `/dashboard` (protected), `*` → `/login`

**Backend (server/):**
- `src/config/supabase.js` - Two Supabase clients: `supabaseAdmin` (service_role key, bypasses RLS) and `supabase` (anon key, respects RLS)
- `src/middleware/auth.js` - `authenticate` middleware: extracts Bearer token from Authorization header, verifies via `supabaseAdmin.auth.getUser()`, attaches user info to `req.user`
- `src/routes/auth.js` - Two endpoints:
  - `GET /api/auth/me` - Returns user profile from `users` table. Auto-creates user row on first login (syncs id, name, email, profile_pic from Google). Returns `is_new_user: true` for first-time users.
  - `PATCH /api/auth/me` - Updates `name` and/or `default_currency`. Validates name (1-100 chars) and currency (3-letter code).

**Database:**
- `users` table created in Supabase (only this table for now, others added per-feature)

#### Auth flow
```
1. User clicks "Continue with Google" on LoginPage
2. Supabase Auth SDK redirects to Google OAuth consent
3. Google redirects back to Supabase, which redirects to app origin (http://localhost:5173/)
4. Route "/" renders AuthCallbackPage (NOT the catch-all, which would strip tokens)
5. AuthCallbackPage exchanges PKCE code for session (if ?code= param present)
6. Supabase Auth SDK stores session (JWT) in browser
7. AuthContext picks up the session via onAuthStateChange
8. AuthCallbackPage navigates to /dashboard
9. Frontend sends JWT in Authorization header to backend API calls
10. Backend middleware verifies JWT via supabaseAdmin.auth.getUser()
11. AuthContext calls syncUserToBackend() → GET /api/auth/me creates user row on first login
```

#### OAuth Callback Bug Fix (March 8, 2026)
**Problem**: After Google sign-in, Supabase redirected to `http://localhost:5173/`. The catch-all route `*` immediately did `<Navigate to="/login" replace />`, which stripped the auth tokens from the URL hash/query params before Supabase could read them. Result: user always landed back on login page with no session.

**Fix**: Added a dedicated route for `/` that renders `AuthCallbackPage`. This page stays rendered long enough for Supabase to parse the tokens and establish a session, then navigates to `/dashboard`.

**Also required**: Adding `http://localhost:5173/auth/callback` to Supabase Dashboard > Authentication > URL Configuration > Redirect URLs.

#### API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/auth/me` | Yes | Get/create user profile |
| PATCH | `/api/auth/me` | Yes | Update name, currency |

#### Environment variables
- **client/.env**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- **server/.env**: `PORT`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`

#### Dependencies installed
- **client**: `@supabase/supabase-js`, `react-router-dom`, `lucide-react`
- **server**: `@supabase/supabase-js`, `pg`

---

### 13.2 Automated Database Migrations - ✅ Completed

**Date**: March 8, 2026

#### What was built

- `server/src/db/database.js` - PostgreSQL connection pool using `pg` package. Connects via `DATABASE_URL` from `.env`.
- `server/src/db/migrate.js` - Migration runner that:
  1. Creates a `migrations` tracking table on first run
  2. Reads `.sql` files from `server/src/db/migrations/` in alphabetical order
  3. Skips already-executed migrations
  4. Runs new migrations inside a transaction (rollback on failure)
  5. Records each successful migration in the `migrations` table
- `server/index.js` - Migrations run automatically on server startup, before the server starts listening

#### How it works
```
Server starts → runMigrations() → reads migrations/ folder
  → compares against migrations table → runs only new ones
  → each in a transaction (BEGIN/COMMIT/ROLLBACK)
  → server starts listening after all migrations pass
```

#### Migration files
| File | Description |
|------|-------------|
| `001_users.sql` | Users table + updated_at trigger function |

New tables are added as numbered `.sql` files (002_groups.sql, 003_user_groups.sql, etc.).

#### For new developers
1. Clone the repo
2. Copy `.env.example` → `.env` in both `client/` and `server/`
3. Fill in Supabase credentials
4. Run `npm install` in both `client/` and `server/`
5. Run `npm run dev` in `server/` — migrations run automatically
6. Run `npm run dev` in `client/`

---

### 13.3 Group CRUD + Invite System - ✅ Completed

**Date**: March 8, 2026

#### What was built

**Backend (server/) — Steps 1-7:**

1. `src/db/migrations/002_groups.sql` — Groups table (name, currency, invite_code, created_by, is_deleted, soft delete)
2. `src/db/migrations/003_user_groups.sql` — User-groups junction table (user_id, group_id, role: admin/member, joined_at)
3. `src/utils/inviteCode.js` — `generateInviteCode()` — 6-character alphanumeric code using `crypto.randomBytes`
4. `src/middleware/group.js` — Two middleware functions:
   - `requireGroupMember` — verifies user is a member of the group, attaches `req.membership`
   - `requireGroupAdmin` — extends `requireGroupMember`, also checks `role === 'admin'`
5. `src/routes/groups.js` — 9 endpoints (see API table below)
6. Routes mounted in `server/index.js` at `/api/groups`
7. `client/src/services/groups.js` — Frontend API service with 9 functions matching all backend endpoints

**Frontend (client/) — Steps 8-12:**

8. **shadcn components installed** — `dialog`, `input`, `label`, `card`, `tabs`, `badge`, `separator`, `avatar`, `dropdown-menu` (all using base-nova / @base-ui/react style)
9. **CreateGroupDialog** (`src/components/CreateGroupDialog.jsx`) — Modal dialog with name + currency (select) fields. Calls `createGroup()`, notifies parent via `onGroupCreated` callback. Currencies: INR (default), USD, EUR, GBP, JPY, CAD, AUD.
10. **DashboardPage** (`src/pages/DashboardPage.jsx`) — Responsive card grid (1/2/3 columns). Shows group cards with name, currency badge, role, creation date. Empty state with icon when no groups. "Create Group" button triggers the dialog. Sign Out button in header.
11. **GroupDetailPage** (`src/pages/GroupDetailPage.jsx`) — Full group detail view with:
    - Header: group name, currency badge, member count, admin badge, invite code copy button
    - Group actions dropdown: Leave Group, Delete Group (admin only)
    - 4 tabs (Members, Expenses, Balances, Activity)
    - **Members tab** (functional): avatar + name + email, role badge, admin dropdown per member (promote/demote/remove). Respects rules: can't act on self, can't act on creator.
    - **Expenses/Balances/Activity tabs**: placeholder UI with icons — ready for future features
12. **JoinGroupPage** (`src/pages/JoinGroupPage.jsx`) — Card-centered layout with invite code input (monospace, uppercase, 6-char max). Supports pre-filling via `?code=` query param (for shareable links). On success, navigates to the group detail page.
13. **App.jsx updated** — 3 new protected routes: `/groups/:id` → GroupDetailPage, `/join` → JoinGroupPage

#### API Endpoints (9 total)

| Method | Endpoint | Auth | Access | Description |
|--------|----------|------|--------|-------------|
| POST | `/api/groups` | Yes | Any user | Create group (name, currency) |
| GET | `/api/groups` | Yes | Any user | List user's groups (with `my_role`) |
| GET | `/api/groups/:id` | Yes | Members | Get group details + member_count |
| PATCH | `/api/groups/:id` | Yes | Admin | Update name/currency |
| DELETE | `/api/groups/:id` | Yes | Admin | Soft delete group |
| GET | `/api/groups/:id/members` | Yes | Members | List members (with profile info) |
| POST | `/api/groups/join` | Yes | Any user | Join via invite code |
| DELETE | `/api/groups/:id/members/:userId` | Yes | Admin/Self | Remove member or leave |
| PATCH | `/api/groups/:id/members/:userId` | Yes | Admin | Promote/demote role |

#### Response format
All endpoints return `{ success: boolean, data: ... }` on success and `{ success: false, error: { code, message } }` on failure.

#### Frontend routes added

| Path | Component | Protected | Description |
|------|-----------|-----------|-------------|
| `/groups/:id` | GroupDetailPage | Yes | Group detail with tabs |
| `/join` | JoinGroupPage | Yes | Join group via invite code |
| `/join?code=ABC123` | JoinGroupPage | Yes | Pre-filled invite code |

#### Files created/modified
- **New files**: `CreateGroupDialog.jsx`, `GroupDetailPage.jsx`, `JoinGroupPage.jsx`
- **Modified files**: `DashboardPage.jsx` (complete rewrite), `App.jsx` (added routes)
- **New shadcn components**: dialog, input, label, card, tabs, badge, separator, avatar, dropdown-menu

#### TODOs in code
- Balance checks in `DELETE /api/groups/:id` and `DELETE /api/groups/:id/members/:userId` are commented out with `TODO: Uncomment when balances feature is built`
- Currency change check in `PATCH /api/groups/:id` queries `transactions` table (returns 0 if table doesn't exist yet, which is safe)
- Expenses, Balances, Activity tabs are placeholder UI — will be implemented in their respective feature steps

#### Post-Build Fixes (March 8, 2026)

After initial build, a thorough audit identified issues across the Join Group flow and member management UX. All fixes have been implemented:

**Join Group Flow Fixes (6 fixes):**

1. **"Join Group" button on Dashboard** — Added `Join Group` button (with `UserPlus` icon) in the dashboard header next to "Create Group". Also added a clickable text link in the empty state ("join one with an invite code").

2. **Group preview endpoint** — Created `GET /api/groups/preview/:code` (authenticated, any user). Returns `{ name, currency, member_count }` for a group by invite code without joining. Added `previewGroup(code)` to frontend service (`client/src/services/groups.js`).

3. **Reworked JoinGroupPage** — Two-step flow: (1) enter invite code → (2) preview shows group name, currency, member count → confirm & join. Auto-previews when `?code=` query param is present in the URL.

4. **Copy invite link** — Changed copy button behavior: copies full shareable link (`{origin}/join?code=ABC123`) instead of just the code. Raw code is still shown as text next to the button.

5. **Return URL preserved across auth redirect** — `ProtectedRoute` passes `?redirect=` to login page. Before OAuth redirect, the redirect path is saved to `sessionStorage`. After login, `AuthCallbackPage` checks `sessionStorage` for a saved redirect and navigates there instead of always going to `/dashboard`.

6. **EditGroupDialog** — Created `EditGroupDialog.jsx` as a controlled dialog (no trigger — avoids dropdown/dialog focus trap conflicts). Integrated into `GroupDetailPage` as an "Edit Group" dropdown item (admin only). Pre-fills current name/currency, only sends changed fields via `PATCH /api/groups/:id`.

**Gap Fixes (3 fixes):**

7. **Confirm before member removal (Gap 2)** — Added `if (!confirm('Are you sure you want to remove this member?')) return;` at the top of `handleRemoveMember()` in `GroupDetailPage.jsx`. (Leave and Delete already had confirms.)

8. **Error feedback for member actions (Gap 3)** — Added `memberError` state to `GroupDetailPage`. `handlePromote`, `handleDemote`, and `handleRemoveMember` now set `memberError` on failure and clear it on success. Error message renders at the top of the Members tab.

9. **Member count on dashboard cards (Gap 4)** — Updated `GET /api/groups` backend endpoint to fetch member count per group via `Promise.all` with individual count queries. Updated `DashboardPage.jsx` to show member count (with `Users` icon) in each group card footer.

**Updated API Endpoints (10 total — 1 new):**

| Method | Endpoint | Auth | Access | Description |
|--------|----------|------|--------|-------------|
| GET | `/api/groups/preview/:code` | Yes | Any user | Preview group by invite code (NEW) |

**Files created:**
- `client/src/components/EditGroupDialog.jsx`

**Files modified:**
- `client/src/pages/GroupDetailPage.jsx` — invite link copy, EditGroupDialog, confirm on remove, memberError feedback
- `client/src/pages/DashboardPage.jsx` — Join Group button, empty state link, member count on cards
- `client/src/pages/JoinGroupPage.jsx` — complete rewrite: two-step preview → join flow
- `client/src/pages/AuthCallbackPage.jsx` — reads sessionStorage for redirect after login
- `client/src/contexts/AuthContext.jsx` — saves redirect to sessionStorage before OAuth
- `client/src/components/ProtectedRoute.jsx` — passes `?redirect=` param to login
- `client/src/services/groups.js` — added `previewGroup(code)`
- `server/src/routes/groups.js` — added preview endpoint, added member count to `GET /api/groups`

---

### 13.4 Backend Refactoring: Supabase SDK → PostgreSQL + Controllers - ✅ Completed

**Date**: March 8, 2026

#### Why

The backend was using `supabaseAdmin.from(...)` (Supabase JS SDK / PostgREST) for all database operations. This was replaced with raw PostgreSQL queries via the `pg` Pool for several reasons:
- Direct SQL gives more control and clarity
- Removes dependency on Supabase PostgREST for DB access
- Supabase SDK is now used **only** for Auth (JWT verification)
- Better separation of concerns with controller pattern

#### What changed

**New files created:**
- `server/src/controllers/authController.js` — `getMe()`, `updateMe()` handlers with pg queries
- `server/src/controllers/groupController.js` — all 10 group handlers with pg queries: `createGroup`, `listGroups`, `getGroup`, `updateGroup`, `deleteGroup`, `listMembers`, `previewGroup`, `joinGroup`, `removeMember`, `updateMemberRole`

**Files rewritten:**
- `server/src/routes/auth.js` — slimmed to route definitions only (imports controller functions)
- `server/src/routes/groups.js` — slimmed to route definitions only (imports controller functions)
- `server/src/middleware/group.js` — converted from Supabase SDK to pg queries, added try/catch error handling
- `server/src/config/supabase.js` — removed unused `supabase` (anon) client export. Only `supabaseAdmin` remains, used exclusively for Auth.

**Files unchanged:**
- `server/src/middleware/auth.js` — still uses `supabaseAdmin.auth.getUser()` (Supabase Auth SDK, intentionally kept)
- `server/src/db/database.js` — pg Pool (already existed)
- `server/src/db/migrate.js` — migration runner (already used pg)
- `server/src/utils/inviteCode.js` — no Supabase usage
- `server/index.js` — no changes needed

#### Conversion stats
- **26 Supabase DB queries** converted to raw PostgreSQL across 3 files
- **1 Supabase Auth call** kept as-is (`auth.getUser()` in middleware/auth.js)
- **0 remaining `supabaseAdmin.from()` calls** in the codebase

#### New backend file structure
```
server/src/
├── config/
│   └── supabase.js              (Supabase Auth SDK only)
├── controllers/
│   ├── authController.js        (auth endpoint handlers)
│   └── groupController.js       (group endpoint handlers)
├── db/
│   ├── database.js              (pg Pool)
│   ├── migrate.js               (migration runner)
│   └── migrations/
│       ├── 001_users.sql
│       ├── 002_groups.sql
│       └── 003_user_groups.sql
├── middleware/
│   ├── auth.js                  (JWT verification via Supabase Auth)
│   └── group.js                 (membership/admin checks via pg)
├── routes/
│   ├── auth.js                  (route definitions only)
│   └── groups.js                (route definitions only)
└── utils/
    └── inviteCode.js            (invite code generator)
```

#### Key improvements in converted queries
- `listGroups` — single SQL query with JOIN + subquery for member count (was N+1: one query + one count per group)
- `getGroup` — single query with subquery for count (was 2 separate queries)
- `previewGroup` — single query with subquery for count (was 2 separate queries)
- Dynamic UPDATE queries use parameterized `$1, $2...` placeholders (SQL injection safe)
- `member_count` from pg comes as string, explicitly parsed with `parseInt()`
