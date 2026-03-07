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
3. **Set up project structure** (monorepo: `client/` + `server/` + `supabase/`)
4. **Initialize projects** (Vite + React frontend, Express backend)
5. **Set up Supabase** (create project, run SQL migrations)
6. **Start building** - suggested order:
   - Auth flow (Google OAuth)
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
