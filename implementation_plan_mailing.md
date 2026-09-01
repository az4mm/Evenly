# Email Notifications for Activity Log Events

Notify group members via email when key activities happen in their groups — expenses added, settlements recorded, members joining, and expenses/settlements deleted.

---

## Trigger Events (5 types)

| Activity Type | Email Subject Example | Why Notify |
|---|---|---|
| `member_joined` | "Alex joined Trip to Goa" | Awareness — someone new in the group |
| `expense_added` | "Alex added ₹1,200 for Dinner" | Directly affects balances |
| `settlement_recorded` | "Alex paid you ₹500" | Money movement |
| `expense_deleted` | "Alex deleted ₹1,200 Dinner" | Silently changes balances |
| `settlement_deleted` | "Alex deleted a ₹500 payment to you" | Silently changes balances |

**Recipients**: All group members **except** the user who triggered the activity.

---

## Open Questions

> [!IMPORTANT]
> **Sender email domain**: Resend requires a verified domain for production (e.g., `notifications@evenly.app`). For development, Resend provides a sandbox `onboarding@resend.dev` address. Do you have a domain ready, or should we plan for sandbox-only initially?

---

## Proposed Changes

### 1. Email Provider Setup (Resend)

#### [NEW] Resend dependency
```
npm install resend   (in server/)
```

- **Free tier**: 100 emails/day, 1 API key
- **No SMTP config** — clean REST API, single function call
- **Built-in HTML support** — no templating engine needed

#### [MODIFY] [.env](file:///c:/Users/91809/OneDrive/Desktop/split_project/Evenly_web/server/.env)
```env
RESEND_API_KEY=re_xxxxxxxxxxxx
RESEND_FROM_EMAIL=Evenly <notifications@yourdomain.com>
CLIENT_URL=http://localhost:5173
```

#### [MODIFY] [.env.example](file:///c:/Users/91809/OneDrive/Desktop/split_project/Evenly_web/server/.env.example)
Add the same 3 keys with placeholder values.

---

### 2. Database Migration

#### [NEW] `server/src/db/migrations/006_notification_preferences.sql`

Add a per-group email notification preference to `user_groups`:

```sql
ALTER TABLE user_groups
  ADD COLUMN email_notifications BOOLEAN NOT NULL DEFAULT true;
```

- `true` (default) — user receives emails for this group
- `false` — user has opted out for this group
- Per-group granularity: user can mute noisy groups while keeping alerts for others

---

### 3. Backend — Email Service Module

#### [NEW] `server/src/services/emailService.js`

Thin wrapper around Resend SDK:

```
emailService.js
├── initResend()          — creates Resend client from env
├── sendEmail(to, subject, html)  — single email send
└── sendBulkEmails(recipients[])  — batch send (Resend supports batch API)
```

- **Fire-and-forget**: All email calls will be `async` but **not awaited** in the controllers. Errors are logged to console, never block the API response.
- **Graceful degradation**: If `RESEND_API_KEY` is not set, the module silently skips all sends (logs a warning on startup). This keeps local dev working without email config.

---

### 4. Backend — Notification Helper

#### [NEW] `server/src/services/notificationService.js`

Central function that controllers call after logging an activity:

```
notifyGroupMembers({ groupId, excludeUserId, activityType, data, client })

Steps:
  1. Query user_groups JOIN users WHERE group_id = $1
     AND user_id != excludeUserId
     AND email_notifications = true
  2. Build email subject + HTML body based on activityType
  3. Call emailService.sendBulkEmails() (fire-and-forget)
```

**Email content builder** — a `buildEmailContent(activityType, data, groupName, currency)` function that returns `{ subject, html }`:

| Type | Subject | Body highlights |
|---|---|---|
| `member_joined` | "{name} joined {group}" | "{name} has joined your group {group}" |
| `expense_added` | "{name} added ₹{amount} for {desc}" | Amount, who paid, split summary, link to group |
| `settlement_recorded` | "{payer} paid {receiver} ₹{amount}" | Settlement details, updated context |
| `expense_deleted` | "{name} deleted ₹{amount} {desc}" | What was deleted, warning this changes balances |
| `settlement_deleted` | "{name} deleted a ₹{amount} payment" | What was deleted, warning this changes balances |

Every email includes:
- **Evenly branding** (logo, colors)
- **"View in Evenly" button** → `{CLIENT_URL}/groups/{groupId}`
- **Unsubscribe link** → `{CLIENT_URL}/groups/{groupId}/unsubscribe?token={jwt}` or API-direct link

---

### 5. Backend — Controller Integration

#### [MODIFY] [expenseController.js](file:///c:/Users/91809/OneDrive/Desktop/split_project/Evenly_web/server/src/controllers/expenseController.js)

Add a single `notifyGroupMembers()` call (fire-and-forget) after each `COMMIT` in these 3 handlers:

| Handler | Activity Type | Data Passed |
|---|---|---|
| `addExpense()` — when `type === 'expense'` | `expense_added` | description, amount, paid_by_name, category |
| `addExpense()` — when `type === 'settlement'` | `settlement_recorded` | amount, paid_by_name, receiver_name |
| `deleteExpense()` — when `type === 'expense'` | `expense_deleted` | snapshot description, amount, paid_by_name |
| `deleteExpense()` — when `type === 'settlement'` | `settlement_deleted` | snapshot amount, paid_by_name, receiver |

**Placement**: After `await client.query('COMMIT')` and before `res.json(...)`. This ensures emails only fire for successful transactions.

#### [MODIFY] [groupController.js](file:///c:/Users/91809/OneDrive/Desktop/split_project/Evenly_web/server/src/controllers/groupController.js)

| Handler | Activity Type | Data Passed |
|---|---|---|
| `joinGroup()` | `member_joined` | joiner name, group name |

**Placement**: After the `activity_logs` INSERT, before `res.json(...)`.

---

### 6. Backend — Unsubscribe Endpoint

#### [MODIFY] [groups.js](file:///c:/Users/91809/OneDrive/Desktop/split_project/Evenly_web/server/src/routes/groups.js) (routes)

```
PATCH /api/groups/:id/notification-preferences
Body: { email_notifications: boolean }
Auth: authenticated + group member
```

#### [NEW] Handler in `groupController.js`

```js
export async function updateNotificationPreference(req, res) {
  // UPDATE user_groups SET email_notifications = $1
  // WHERE user_id = req.user.id AND group_id = req.params.id
}
```

This serves both:
- The frontend toggle (UI opt-out)
- A one-click unsubscribe link in emails (with a signed token or direct auth)

---

### 7. Frontend — Notification Toggle

#### [MODIFY] [GroupDetailPage.jsx](file:///c:/Users/91809/OneDrive/Desktop/split_project/Evenly_web/client/src/pages/GroupDetailPage.jsx)

Add a **"Email Notifications"** toggle (shadcn `Switch` component) in the group settings area or header dropdown. Shows current state, calls `PATCH /api/groups/:id/notification-preferences` on toggle.

Alternatively, place it in the **Members tab** next to the user's own row, or in the **Edit Group dialog** (admin sees global, members see their own preference).

#### [MODIFY] [groups.js](file:///c:/Users/91809/OneDrive/Desktop/split_project/Evenly_web/client/src/services/groups.js) (service)

```js
export async function updateNotificationPreference(groupId, enabled) {
  // PATCH /api/groups/${groupId}/notification-preferences
  // body: { email_notifications: enabled }
}
```

---

### 8. Email Template

A single responsive HTML email template with dynamic content slots:

```
┌─────────────────────────────────┐
│  ✂️  Evenly                     │  ← Brand header (metallic blue)
├─────────────────────────────────┤
│                                 │
│  {headline}                     │  ← "Alex added ₹1,200 for Dinner"
│                                 │
│  {detail_lines}                 │  ← "Group: Trip to Goa"
│                                 │     "Category: Food & Drinks"
│                                 │     "Split: Equal among 4 members"
│                                 │
│  ┌───────────────────────┐      │
│  │   View in Evenly →    │      │  ← CTA button
│  └───────────────────────┘      │
│                                 │
├─────────────────────────────────┤
│  Unsubscribe from this group    │  ← Footer link
│  You received this because      │
│  you're a member of {group}     │
└─────────────────────────────────┘
```

Built as a plain JS function returning an HTML string (no templating engine dependency needed).

---

## Phase 2: Queuing Architecture (Future Upgrade)

For MVP, the email dispatch will use a **"Fire-and-Forget"** pattern. The controller will call the email service asynchronously without `await`-ing the response. This prevents slow third-party API calls from blocking the HTTP response to the user.

**Why Fire-and-Forget for MVP:**
- Zero infrastructure overhead (no Redis or extra worker processes needed).
- High speed for the user (response is sent instantly).
- Perfect for low-volume (<100 emails/day) where silent failures are acceptable.

**When and Why to Queue (Future Upgrade):**
As the user base scales, silent failures, rate limits, and unhandled crashes become problematic. A dedicated message queue (e.g., BullMQ + Redis) will be necessary.

A queue provides:
1. **Guaranteed Delivery & Retries**: If the Resend API is down or rate-limits the app, the queue worker will automatically retry sending the email with exponential backoff.
2. **Durability**: If the Node.js server crashes mid-flight, pending emails are safely stored in Redis and will resume when the server restarts.
3. **Concurrency Control**: You can explicitly limit email sending to, for example, 10 per second to respect provider rate limits.
4. **Decoupling**: Fully separates the web server workload from the background processing workload, allowing you to scale them independently.

When implementing the queue later, the `notificationService.js` will simply change from calling `emailService.sendBulkEmails()` directly to pushing a job onto the Redis queue, meaning minimal refactoring will be required.

---

## New File Summary

| File | Type | Purpose |
|---|---|---|
| `server/src/db/migrations/006_notification_preferences.sql` | Migration | Add `email_notifications` column to `user_groups` |
| `server/src/services/emailService.js` | Service | Resend SDK wrapper, send/bulk-send |
| `server/src/services/notificationService.js` | Service | Orchestrator: query recipients, build content, dispatch |

## Modified File Summary

| File | Change |
|---|---|
| `server/.env` / `.env.example` | Add `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `CLIENT_URL` |
| `server/package.json` | Add `resend` dependency |
| `server/src/controllers/expenseController.js` | Fire-and-forget `notifyGroupMembers()` in 4 handlers |
| `server/src/controllers/groupController.js` | Fire-and-forget `notifyGroupMembers()` in `joinGroup()` + new `updateNotificationPreference()` handler |
| `server/src/routes/groups.js` | Add `PATCH /:id/notification-preferences` route |
| `client/src/pages/GroupDetailPage.jsx` | Email notification toggle UI |
| `client/src/services/groups.js` | Add `updateNotificationPreference()` API call |

---

## Verification Plan

### Manual Verification
1. **Happy path**: Add an expense → verify other group members receive email within ~5 seconds
2. **Opt-out**: Toggle notifications off for a group → add expense → verify NO email sent
3. **Self-exclusion**: Verify the user who adds the expense does NOT receive an email
4. **Graceful fallback**: Remove `RESEND_API_KEY` from `.env` → verify server starts fine, API works, no crash on activity
5. **Unsubscribe link**: Click unsubscribe in email → verify preference toggles off

### Automated Tests
```bash
# Verify migration applies cleanly
npm run dev   (server starts, migration 006 runs)

# Verify new column exists
psql -c "SELECT email_notifications FROM user_groups LIMIT 1;"

# Verify API endpoint
curl -X PATCH /api/groups/{id}/notification-preferences \
  -H "Authorization: Bearer {token}" \
  -d '{"email_notifications": false}'
```
