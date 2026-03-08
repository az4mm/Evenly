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
- Permanent invite code auto-generated at group creation (8-char alphanumeric)
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
   - Group CRUD + invite system
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
