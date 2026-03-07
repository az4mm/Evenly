# Database Schema - Evenly

> **Database**: Supabase (PostgreSQL)
> **Last Updated**: March 7, 2026

---

## 1. users

Stores user account information.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique user identifier |
| name | VARCHAR(100) | NOT NULL | Display name |
| email | VARCHAR(255) | UNIQUE, NOT NULL | Gmail address (from OAuth) |
| profile_pic | TEXT | NULLABLE | Profile picture URL (from Google) |
| default_currency | VARCHAR(3) | DEFAULT 'INR' | User's preferred currency |
| created_at | TIMESTAMP | DEFAULT NOW() | Account creation timestamp |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last profile update |

**Indexes:**
- `idx_users_email` ON email

---

## 2. groups

Stores group information.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique group identifier |
| name | VARCHAR(100) | NOT NULL | Group name |
| icon | TEXT | NULLABLE | Group icon/image URL |
| currency | VARCHAR(3) | NOT NULL, DEFAULT 'INR' | Group currency (applies to all transactions) |
| invite_code | VARCHAR(10) | UNIQUE, NOT NULL | Permanent unique invite code |
| created_by | UUID | FOREIGN KEY → users(id) | User who created the group |
| is_deleted | BOOLEAN | DEFAULT FALSE | Soft delete flag |
| created_at | TIMESTAMP | DEFAULT NOW() | Group creation timestamp |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update timestamp |

**Indexes:**
- `idx_groups_invite_code` ON invite_code
- `idx_groups_created_by` ON created_by

**Notes:**
- `invite_code` is auto-generated on group creation (e.g., 8-character alphanumeric)
- `is_deleted` can only be TRUE if all balances are settled

---

## 3. user_groups

Junction table for user-group memberships.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique membership identifier |
| user_id | UUID | FOREIGN KEY → users(id), NOT NULL | Reference to user |
| group_id | UUID | FOREIGN KEY → groups(id), NOT NULL | Reference to group |
| role | VARCHAR(20) | NOT NULL, DEFAULT 'member' | Role: 'admin' or 'member' |
| joined_at | TIMESTAMP | DEFAULT NOW() | When user joined the group |

**Indexes:**
- `idx_user_groups_user_id` ON user_id
- `idx_user_groups_group_id` ON group_id
- `idx_user_groups_unique` UNIQUE ON (user_id, group_id)

**Constraints:**
- UNIQUE constraint on (user_id, group_id) - user can only be in a group once
- Role ENUM: CHECK (role IN ('admin', 'member'))

---

## 4. transactions

Stores expenses and settlements.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique transaction identifier |
| group_id | UUID | FOREIGN KEY → groups(id), NOT NULL | Group this transaction belongs to |
| description | VARCHAR(255) | NULLABLE | Optional description/title |
| category | VARCHAR(50) | DEFAULT 'Others' | Expense category |
| amount | DECIMAL(12,2) | NOT NULL, CHECK (amount > 0) | Total amount |
| paid_by | UUID | FOREIGN KEY → users(id), NOT NULL | User who paid |
| distribution | JSONB | NOT NULL | Split distribution (see below) |
| type | VARCHAR(20) | NOT NULL, DEFAULT 'expense' | 'expense' or 'settlement' |
| created_by | UUID | FOREIGN KEY → users(id), NOT NULL | User who created this record |
| updated_by | UUID | FOREIGN KEY → users(id), NULLABLE | User who last edited this record |
| transaction_date | DATE | DEFAULT CURRENT_DATE | Date of expense (can be backdated) |
| created_at | TIMESTAMP | DEFAULT NOW() | Record creation timestamp |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update timestamp |

**Indexes:**
- `idx_transactions_group_id` ON group_id
- `idx_transactions_paid_by` ON paid_by
- `idx_transactions_created_by` ON created_by
- `idx_transactions_updated_by` ON updated_by
- `idx_transactions_type` ON type
- `idx_transactions_date` ON transaction_date

**Constraints:**
- type ENUM: CHECK (type IN ('expense', 'settlement'))
- category ENUM: CHECK (category IN ('Food & Drinks', 'Transportation', 'Accommodation', 'Shopping', 'Entertainment', 'Utilities', 'Rent', 'Healthcare', 'Education', 'Others'))

### Distribution JSONB Structure

#### Equal Split
```json
{
  "method": "equal",
  "splits": [
    { "user_id": "uuid-1", "amount": 100.00 },
    { "user_id": "uuid-2", "amount": 100.00 }
  ]
}
```

#### Exact Amounts
```json
{
  "method": "exact",
  "splits": [
    { "user_id": "uuid-1", "amount": 150.00 },
    { "user_id": "uuid-2", "amount": 50.00 }
  ]
}
```

#### Percentage
```json
{
  "method": "percentage",
  "splits": [
    { "user_id": "uuid-1", "amount": 150.00, "percentage": 75 },
    { "user_id": "uuid-2", "amount": 50.00, "percentage": 25 }
  ]
}
```

#### Share/Ratio
```json
{
  "method": "share",
  "splits": [
    { "user_id": "uuid-1", "amount": 150.00, "shares": 3 },
    { "user_id": "uuid-2", "amount": 50.00, "shares": 1 }
  ]
}
```

#### Settlement

Settlements record debt payments between two users.

**Structure:**
- `paid_by` → The user who is **paying** (settling their debt)
- `splits[0].user_id` → The user who is **receiving** the payment
- `amount` → The settlement amount

```json
{
  "method": "settlement",
  "splits": [
    { "user_id": "uuid-receiver", "amount": 200.00 }
  ]
}
```

**Example Scenario:**
> John owes Jane ₹500. John pays Jane ₹200 to partially settle.

```
Transaction Record:
├── type: "settlement"
├── paid_by: "john-uuid"        ← John is paying
├── amount: 200.00
└── distribution:
    └── method: "settlement"
    └── splits: [
          { "user_id": "jane-uuid", "amount": 200.00 }  ← Jane receives
        ]
```

**Balance Effect:**
- John's debt to Jane decreases by ₹200
- Jane's credit from John decreases by ₹200

**Important Notes:**
1. Settlement always has exactly ONE user in splits (the receiver)
2. `paid_by` and `splits[0].user_id` must be different users
3. `amount` and `splits[0].amount` must be equal
4. Category field is ignored for settlements (can be NULL or 'Others')

---

## 5. activity_logs

Audit trail for all group activities.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique log identifier |
| group_id | UUID | FOREIGN KEY → groups(id), NOT NULL | Group this activity belongs to |
| user_id | UUID | FOREIGN KEY → users(id), NOT NULL | User who performed the action |
| transaction_id | UUID | FOREIGN KEY → transactions(id), NULLABLE | Related transaction (if applicable) |
| type | VARCHAR(50) | NOT NULL | Activity type |
| data | JSONB | NOT NULL | Activity-specific data |
| created_at | TIMESTAMP | DEFAULT NOW() | When activity occurred |

**Indexes:**
- `idx_activity_logs_group_id` ON group_id
- `idx_activity_logs_user_id` ON user_id
- `idx_activity_logs_type` ON type
- `idx_activity_logs_created_at` ON created_at DESC

### Activity Types & Data Structures

#### group_created
```json
{
  "group_name": "Trip to Goa",
  "currency": "INR"
}
```

#### group_updated
```json
{
  "changes": {
    "name": { "old": "Old Name", "new": "New Name" },
    "icon": { "old": null, "new": "url" }
  }
}
```

#### member_joined
```json
{
  "member_id": "uuid",
  "member_name": "John Doe",
  "method": "invite_code"
}
```

#### member_left
```json
{
  "member_id": "uuid",
  "member_name": "John Doe"
}
```

#### member_removed
```json
{
  "removed_user_id": "uuid",
  "removed_user_name": "John Doe"
}
```

#### member_promoted
```json
{
  "member_id": "uuid",
  "member_name": "John Doe",
  "new_role": "admin"
}
```

#### member_demoted
```json
{
  "member_id": "uuid",
  "member_name": "John Doe",
  "new_role": "member"
}
```

#### expense_added
```json
{
  "description": "Dinner",
  "amount": 1000,
  "paid_by_name": "John Doe",
  "category": "Food & Drinks",
  "distribution": {
    "method": "equal",
    "splits": [
      { "user_id": "uuid-1", "user_name": "John", "amount": 500 },
      { "user_id": "uuid-2", "user_name": "Jane", "amount": 500 }
    ]
  }
}
```

#### expense_updated
```json
{
  "changes": {
    "amount": { "old": 1000, "new": 1200 },
    "description": { "old": "Dinner", "new": "Team Dinner" }
  },
  "snapshot_before": { ... },
  "snapshot_after": { ... }
}
```

#### expense_deleted
```json
{
  "snapshot": {
    "description": "Dinner",
    "amount": 1000,
    "paid_by_name": "John Doe",
    "distribution": { ... }
  }
}
```

#### settlement_recorded
```json
{
  "from_user_id": "uuid",
  "from_user_name": "John Doe",
  "to_user_id": "uuid",
  "to_user_name": "Jane Doe",
  "amount": 500
}
```

#### settlement_updated
```json
{
  "changes": {
    "amount": { "old": 500, "new": 600 }
  }
}
```

#### settlement_deleted
```json
{
  "snapshot": {
    "from_user_name": "John Doe",
    "to_user_name": "Jane Doe",
    "amount": 500
  }
}
```

---

## 6. balances

Pre-computed table storing net balances between user pairs in each group. This table is **updated automatically** whenever a transaction is added, edited, or deleted.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique balance record identifier |
| group_id | UUID | FOREIGN KEY → groups(id), NOT NULL | Group this balance belongs to |
| from_user_id | UUID | FOREIGN KEY → users(id), NOT NULL | User who **owes** money |
| to_user_id | UUID | FOREIGN KEY → users(id), NOT NULL | User who **is owed** money |
| amount | DECIMAL(12,2) | NOT NULL, CHECK (amount > 0) | Net amount owed |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update timestamp |

**Indexes:**
- `idx_balances_group_id` ON group_id
- `idx_balances_from_user` ON from_user_id
- `idx_balances_to_user` ON to_user_id
- `idx_balances_unique` UNIQUE ON (group_id, from_user_id, to_user_id)

**Constraints:**
- UNIQUE constraint on (group_id, from_user_id, to_user_id)
- CHECK constraint: from_user_id != to_user_id (can't owe yourself)
- CHECK constraint: amount > 0 (if zero, delete the record)

### Key Rules

1. **One-directional storage**: Always store from debtor → creditor
2. **No zero balances**: If amount becomes 0, delete the record
3. **No negative amounts**: If balance flips, swap from/to users
4. **One record per pair**: Only one record exists for any user pair in a group

### How Balances Are Calculated

#### On Expense Added

```
Expense: User A paid ₹300, split among A, B, C equally (₹100 each)

Logic:
- A paid ₹300, A's share is ₹100 → A is owed ₹200 by others
- B's share is ₹100 → B owes A ₹100
- C's share is ₹100 → C owes A ₹100

Balance Updates:
- UPSERT balances SET amount = amount + 100 WHERE from=B, to=A
- UPSERT balances SET amount = amount + 100 WHERE from=C, to=A
```

#### On Settlement Recorded

```
Settlement: User B pays User A ₹100

Logic:
- B's debt to A decreases by ₹100

Balance Update:
- UPDATE balances SET amount = amount - 100 WHERE from=B, to=A
- If amount becomes 0 → DELETE the record
- If amount becomes negative → Swap from/to and make positive
```

#### On Transaction Deleted

```
Reverse the original transaction's effect on balances
```

### Example Walkthrough

**Group**: Weekend Trip (Alice, Bob, Charlie)

| Step | Action | Alice owes | Bob owes | Charlie owes |
|------|--------|------------|----------|--------------|
| 1 | Bob pays ₹600 dinner (equal: ₹200 each) | Alice→Bob: ₹200 | - | Charlie→Bob: ₹200 |
| 2 | Alice pays ₹300 taxi (equal: ₹100 each) | Alice→Bob: ₹200-₹100=₹100 | Bob→Alice: ₹100 | Charlie→Alice: ₹100, Charlie→Bob: ₹200 |
| 3 | Alice settles ₹100 to Bob | Alice→Bob: ₹0 (deleted) | Bob→Alice: ₹100 | Charlie→Alice: ₹100, Charlie→Bob: ₹200 |

**Final Balances Table:**
```
┌──────────┬──────────────┬────────────┬────────┐
│ group_id │ from_user_id │ to_user_id │ amount │
├──────────┼──────────────┼────────────┼────────┤
│ trip-1   │ bob          │ alice      │ 100.00 │
│ trip-1   │ charlie      │ alice      │ 100.00 │
│ trip-1   │ charlie      │ bob        │ 200.00 │
└──────────┴──────────────┴────────────┴────────┘
```

**Reading the balances:**
- Bob owes Alice ₹100
- Charlie owes Alice ₹100
- Charlie owes Bob ₹200

### Querying Balances

**Get all balances for a user in a group:**
```sql
-- What I owe others
SELECT to_user_id, amount 
FROM balances 
WHERE group_id = 'xxx' AND from_user_id = 'my-id';

-- What others owe me
SELECT from_user_id, amount 
FROM balances 
WHERE group_id = 'xxx' AND to_user_id = 'my-id';
```

**Get user's net balance in a group:**
```sql
SELECT 
  COALESCE(credit.total, 0) - COALESCE(debit.total, 0) as net_balance
FROM 
  (SELECT SUM(amount) as total FROM balances WHERE group_id = 'xxx' AND to_user_id = 'my-id') credit,
  (SELECT SUM(amount) as total FROM balances WHERE group_id = 'xxx' AND from_user_id = 'my-id') debit;

-- Positive = others owe you
-- Negative = you owe others
```

**Check if user can leave group:**
```sql
SELECT EXISTS (
  SELECT 1 FROM balances 
  WHERE group_id = 'xxx' 
  AND (from_user_id = 'my-id' OR to_user_id = 'my-id')
) as has_unsettled_balance;
```

---

## Entity Relationship Diagram

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│    users     │       │ user_groups  │       │    groups    │
├──────────────┤       ├──────────────┤       ├──────────────┤
│ id (PK)      │──┐    │ id (PK)      │    ┌──│ id (PK)      │
│ name         │  │    │ user_id (FK) │────┘  │ name         │
│ email        │  └────│ group_id (FK)│───────│ invite_code  │
│ profile_pic  │       │ role         │       │ currency     │
│ default_curr │       │ joined_at    │       │ created_by   │──┐
│ created_at   │       └──────────────┘       │ is_deleted   │  │
│ updated_at   │                              │ created_at   │  │
└──────────────┘                              │ updated_at   │  │
       │                                      └──────────────┘  │
       │                                             │          │
       │    ┌────────────────────────────────────────┘          │
       │    │                                                   │
       │    │  ┌──────────────────┐    ┌──────────────────┐    │
       │    │  │   transactions   │    │  activity_logs   │    │
       │    │  ├──────────────────┤    ├──────────────────┤    │
       │    └──│ group_id (FK)    │    │ group_id (FK)    │────┘
       │       │ paid_by (FK)     │────│ user_id (FK)     │────┐
       └───────│ created_by (FK)  │    │ transaction_id   │    │
               │ description      │    │ type             │    │
               │ category         │    │ data (JSONB)     │    │
               │ amount           │    │ created_at       │    │
               │ distribution     │    └──────────────────┘    │
               │ type             │                            │
               │ transaction_date │    ┌──────────────────┐    │
               │ created_at       │    │    balances      │    │
               │ updated_at       │    ├──────────────────┤    │
               └──────────────────┘    │ group_id (FK)    │────┘
                                       │ from_user_id (FK)│────┐
                                       │ to_user_id (FK)  │────┤
                                       │ amount           │    │
                                       │ updated_at       │    │
                                       └──────────────────┘    │
                                                               │
                       ┌───────────────────────────────────────┘
                       │
                       └── (users.id)
```

---

## SQL Table Definitions

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    profile_pic TEXT,
    default_currency VARCHAR(3) DEFAULT 'INR',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);

-- 2. Groups Table
CREATE TABLE groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    icon TEXT,
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    invite_code VARCHAR(10) UNIQUE NOT NULL,
    created_by UUID NOT NULL REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_groups_invite_code ON groups(invite_code);
CREATE INDEX idx_groups_created_by ON groups(created_by);

-- 3. User Groups Table
CREATE TABLE user_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    joined_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, group_id)
);

CREATE INDEX idx_user_groups_user_id ON user_groups(user_id);
CREATE INDEX idx_user_groups_group_id ON user_groups(group_id);

-- 4. Transactions Table
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    description VARCHAR(255),
    category VARCHAR(50) DEFAULT 'Others' CHECK (category IN (
        'Food & Drinks', 'Transportation', 'Accommodation', 'Shopping', 
        'Entertainment', 'Utilities', 'Rent', 'Healthcare', 'Education', 'Others'
    )),
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    paid_by UUID NOT NULL REFERENCES users(id),
    distribution JSONB NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'expense' CHECK (type IN ('expense', 'settlement')),
    created_by UUID NOT NULL REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    transaction_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_transactions_group_id ON transactions(group_id);
CREATE INDEX idx_transactions_paid_by ON transactions(paid_by);
CREATE INDEX idx_transactions_created_by ON transactions(created_by);
CREATE INDEX idx_transactions_updated_by ON transactions(updated_by);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);

-- 5. Activity Logs Table
CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
    type VARCHAR(50) NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_activity_logs_group_id ON activity_logs(group_id);
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_type ON activity_logs(type);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at DESC);

-- 6. Balances Table
CREATE TABLE balances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    from_user_id UUID NOT NULL REFERENCES users(id),
    to_user_id UUID NOT NULL REFERENCES users(id),
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(group_id, from_user_id, to_user_id),
    CHECK (from_user_id != to_user_id)
);

CREATE INDEX idx_balances_group_id ON balances(group_id);
CREATE INDEX idx_balances_from_user ON balances(from_user_id);
CREATE INDEX idx_balances_to_user ON balances(to_user_id);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON groups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_balances_updated_at BEFORE UPDATE ON balances
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

## Notes

1. **UUIDs**: Using UUIDs instead of auto-increment IDs for better security and distributed systems compatibility
2. **JSONB**: PostgreSQL's JSONB type for flexible distribution storage with indexing support
3. **Soft Delete**: Only `groups` table has soft delete; transactions are hard deleted
4. **Timestamps**: All tables include `created_at`; mutable tables include `updated_at`
5. **Invite Code**: Generated server-side (e.g., `nanoid` or custom function) on group creation
6. **Balances**: Pre-computed table updated on every transaction change for fast balance queries
