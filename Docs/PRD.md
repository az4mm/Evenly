# Product Requirements Document (PRD)
## Evenly - Expense Splitting Application

---

## 1. Overview

### 1.1 Product Name
**Evenly**

### 1.2 Product Summary
Evenly is a web-based expense splitting application that allows users to create groups, add shared expenses, and track who owes whom. It simplifies splitting bills among friends, roommates, travel companions, and colleagues.

### 1.3 Problem Statement
Splitting expenses among groups is tedious and error-prone when done manually. People often forget who paid for what, leading to awkward conversations and unresolved debts. Existing solutions can be complex or lack features needed for Indian users.

### 1.4 Solution
Evenly provides a simple, intuitive platform for:
- Creating expense-sharing groups
- Adding and splitting expenses with flexible distribution methods
- Tracking balances in real-time
- Maintaining a transparent activity log
- Settling debts with clear visibility

---

## 2. Goals & Success Metrics

### 2.1 Goals
| Goal | Description |
|------|-------------|
| Simplify expense tracking | Reduce time spent on manual calculations |
| Transparent splitting | All members see all transactions and activities |
| Frictionless onboarding | Gmail auth + invite links for quick group joining |
| Mobile-friendly | Responsive web app accessible on all devices |

### 2.2 Success Metrics (KPIs)
| Metric | Target (6 months post-launch) |
|--------|-------------------------------|
| Registered users | 10,000+ |
| Active groups | 5,000+ |
| Monthly active users | 40% of registered |
| Average transactions per group | 10+ |
| User retention (30-day) | 50%+ |

---

## 3. Target Users

### 3.1 Primary Personas

**1. College Students**
- Frequently split food, outings, subscriptions
- Tech-savvy, prefer quick mobile-friendly solutions
- Price-sensitive (free tier important)

**2. Roommates/Flatmates**
- Split rent, utilities, groceries monthly
- Need recurring visibility into shared expenses
- Value simplicity over features

**3. Travel Groups**
- Create trip-specific groups
- Multiple expenses over short period
- Need clear settlement at trip end

**4. Work Colleagues**
- Split team lunches, celebrations
- May need expense reports/exports (future)
- Professional, minimal interface preferred

---

## 4. Features & Requirements

### 4.1 Authentication

| ID | Requirement | Priority |
|----|-------------|----------|
| AUTH-01 | Users can sign up/login using Gmail (Google OAuth 2.0) | P0 |
| AUTH-02 | First-time users are prompted to set display name | P0 |
| AUTH-03 | Users can set default currency preference (default: INR) | P1 |
| AUTH-04 | Session management with secure JWT tokens | P0 |

---

### 4.2 User Profile

| ID | Requirement | Priority |
|----|-------------|----------|
| PROF-01 | View and edit display name | P0 |
| PROF-02 | View email (non-editable, from Gmail) | P0 |
| PROF-03 | Set default currency | P1 |
| PROF-04 | View list of all groups user is part of | P0 |
| PROF-05 | View overall balance summary (total owed / total to receive) | P1 |

---

### 4.3 Group Management

| ID | Requirement | Priority |
|----|-------------|----------|
| GRP-01 | User can create a new group with a name | P0 |
| GRP-02 | Group creator automatically becomes admin | P0 |
| GRP-03 | Group must have at least 2 members (creator + 1 other) | P0 |
| GRP-04 | Admin can set group icon/image | P2 |
| GRP-05 | Each group has a default currency (default: INR) | P1 |
| GRP-06 | Admin can edit group name and settings | P0 |
| GRP-07 | Admin can delete the group (with confirmation) | P1 |
| GRP-08 | Group deletion requires all balances to be settled | P1 |

#### 4.3.1 Invite System

| ID | Requirement | Priority |
|----|-------------|----------|
| INV-01 | Each group has a unique, permanent invite code generated at group creation | P0 |
| INV-02 | Invite code is visible to all members of the group | P0 |
| INV-03 | Users can join group by manually entering the invite code | P0 |
| INV-04 | Shareable invite link contains the code as a parameter for auto-join | P0 |
| INV-05 | Clicking invite link redirects user to app and automatically joins them to the group (if authenticated) | P0 |
| INV-06 | Non-authenticated users clicking link are prompted to login first, then auto-joined | P0 |

#### 4.3.2 Member Management

| ID | Requirement | Priority |
|----|-------------|----------|
| MEM-01 | View list of all group members with roles | P0 |
| MEM-02 | Admin can remove members from group | P0 |
| MEM-03 | Member can only be removed if their balance is zero | P0 |
| MEM-04 | Members can leave group voluntarily | P0 |
| MEM-05 | Members can only leave if their balance is settled (zero) | P0 |
| MEM-06 | Admin can promote other members to admin | P1 |
| MEM-07 | Admin can demote other admins (except original creator) | P1 |
| MEM-08 | Group creator cannot be removed or demoted | P0 |

---

### 4.4 Transactions (Expenses)

| ID | Requirement | Priority |
|----|-------------|----------|
| TXN-01 | Any group member can add a new expense | P0 |
| TXN-02 | Expense must have: amount, paid by, split among. Title/description is optional | P0 |
| TXN-03 | Expense can optionally have a category | P1 |
| TXN-04 | Any group member can edit any expense | P0 |
| TXN-05 | Any group member can delete any expense | P0 |
| TXN-06 | Expense date can be backdated | P1 |

#### 4.4.1 Distribution Methods

| ID | Requirement | Priority |
|----|-------------|----------|
| DIST-01 | **Equal Split**: Divide amount equally among selected members | P0 |
| DIST-02 | **Exact Amounts**: Specify exact amount each person owes | P0 |
| DIST-03 | **Percentage**: Specify percentage each person owes (must sum to 100%) | P0 |
| DIST-04 | **Shares/Ratio**: Specify share units (e.g., 2:1:1 split) | P0 |
| DIST-05 | Payer can be excluded from split (paid for others) | P1 |
| DIST-06 | System validates that split amounts match total expense | P0 |

#### 4.4.2 Categories

| ID | Requirement | Priority |
|----|-------------|----------|
| CAT-01 | Predefined categories: Food & Drinks, Transportation, Accommodation, Shopping, Entertainment, Utilities, Rent, Healthcare, Education, Others | P1 |
| CAT-02 | Default category is "Others" if not selected | P1 |
| CAT-03 | Category icon/color for visual distinction | P2 |

---

### 4.5 Settlements

| ID | Requirement | Priority |
|----|-------------|----------|
| SET-01 | Any member can record a settlement (manual) | P0 |
| SET-02 | Settlement records: who paid, who received, amount | P0 |
| SET-03 | Settlement updates balances in real-time | P0 |
| SET-04 | Settlement can be edited or deleted by any member | P0 |
| SET-05 | System suggests optimal settlements (who should pay whom) | P2 |
| SET-06 | Partial settlements allowed | P0 |

---

### 4.6 Balances

| ID | Requirement | Priority |
|----|-------------|----------|
| BAL-01 | Show per-group balance for logged-in user | P0 |
| BAL-02 | Show detailed breakdown: "You owe X ₹500", "Y owes you ₹300" | P0 |
| BAL-03 | Show net balance (total owed - total receivable) | P0 |
| BAL-04 | Balances update in real-time after transactions/settlements | P0 |
| BAL-05 | Show balance history/trend (future scope) | P3 |
| BAL-06 | Simplified debts - minimize transactions (future scope) | P3 |

---

### 4.7 Activity Log

| ID | Requirement | Priority |
|----|-------------|----------|
| ACT-01 | All group activities are logged | P0 |
| ACT-02 | Activity log visible to all group members | P0 |
| ACT-03 | Log shows: who did what, when, and relevant details | P0 |
| ACT-04 | Activity types include: | |
| | - Group created | P0 |
| | - Group settings updated | P0 |
| | - Member joined | P0 |
| | - Member left | P0 |
| | - Member removed | P0 |
| | - Member promoted/demoted | P1 |
| | - Expense added | P0 |
| | - Expense edited (with before/after snapshot) | P0 |
| | - Expense deleted | P0 |
| | - Settlement recorded | P0 |
| | - Settlement edited/deleted | P0 |
| ACT-05 | Activity log supports pagination | P1 |
| ACT-06 | Filter activity log by type | P2 |

---

### 4.8 Currency Support

| ID | Requirement | Priority |
|----|-------------|----------|
| CUR-01 | Support for multiple currencies: INR (₹), USD ($), EUR (€), GBP (£), and other major currencies | P1 |
| CUR-02 | Default currency is INR | P0 |
| CUR-03 | Each group has a single currency set at creation (applies to all transactions in that group) | P0 |
| CUR-04 | All transactions within a group use the group's currency (no mixed currencies within a group) | P0 |
| CUR-05 | Group currency can be changed by admin (only if no transactions exist) | P1 |

---

## 5. User Interface Requirements

### 5.1 Pages/Screens

| Page | Description | Priority |
|------|-------------|----------|
| Landing Page | Marketing page with features, CTA to login | P0 |
| Login Page | Google OAuth login button | P0 |
| Dashboard | Overview of all groups, total balances, recent activity | P0 |
| Group List | List of all groups user is part of | P0 |
| Group Detail | Group info, members, expenses, balances, activity log | P0 |
| Add/Edit Expense | Form to create or modify expense | P0 |
| Add Settlement | Form to record settlement | P0 |
| Profile/Settings | User profile and preferences | P1 |
| Join Group | Page for entering invite code or processing invite link | P0 |

### 5.2 Responsive Design

| ID | Requirement | Priority |
|----|-------------|----------|
| UI-01 | Desktop-first responsive design (also responsive for mobile) | P0 |
| UI-02 | Support screen sizes: 320px to 1920px+ | P0 |
| UI-03 | Touch-friendly buttons and inputs on mobile (min 44px touch targets) | P0 |
| UI-04 | Fast loading (< 3s) | P1 |
| UI-05 | Dark mode and Light mode support (theme toggle) | P0 |

---

## 6. Technical Requirements

### 6.1 Architecture

| Component | Technology |
|-----------|------------|
| Frontend | React.js + Vite + shadcn/ui |
| Backend | Node.js with Express.js |
| Database | Supabase (PostgreSQL) |
| Authentication | Google OAuth 2.0 + Supabase Auth |
| Hosting | Vercel (frontend) + Railway/Render (backend) |

### 6.2 Database Tables

1. **users** - User accounts and preferences
2. **groups** - Group information (includes permanent invite code)
3. **user_groups** - User-group memberships with roles
4. **transactions** - Expenses and settlements
5. **activity_logs** - Audit trail

### 6.3 API Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| API-01 | RESTful API design | P0 |
| API-02 | JWT-based authentication | P0 |
| API-03 | Input validation and sanitization | P0 |
| API-04 | Proper error handling with meaningful messages | P0 |
| API-05 | API documentation (Swagger/OpenAPI) | P2 |

### 6.4 Security Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| SEC-01 | HTTPS only | P0 |
| SEC-02 | Secure OAuth implementation | P0 |
| SEC-03 | JWT token expiry and refresh mechanism | P0 |
| SEC-04 | Input sanitization to prevent XSS/injection | P0 |
| SEC-05 | CORS properly configured | P0 |
| SEC-06 | Sensitive data encryption at rest | P2 |

### 6.5 Performance Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| PERF-01 | Page load time < 3 seconds | P0 |
| PERF-02 | API response time < 500ms (95th percentile) | P0 |
| PERF-03 | Support 1000 concurrent users | P1 |
| PERF-04 | Database queries optimized with proper indexing | P0 |

---

## 7. Future Scope (Post-MVP)

| Feature | Description | Priority |
|---------|-------------|----------|
| Simplified Debts | Algorithm to minimize number of transactions | P3 |
| Payment Integration | UPI/PayTM integration for direct settlements | P3 |
| Recurring Expenses | Auto-create monthly/weekly splits | P3 |
| Export Reports | CSV/PDF export of transactions | P3 |
| Multiple Payers | Single expense paid by multiple people | P3 |
| Push Notifications | Push notifications for key events | P3 |
| Email Notifications | Email notifications for key events | P3 |
| Mobile Apps | Native Android/iOS apps | P3 |
| Offline Support | Work offline, sync when online | P3 |
| Analytics | Spending trends and insights | P3 |
| Reminders | Automated payment reminders | P3 |
| Comments | Comments/discussion on expenses | P3 |
| Receipt OCR | Auto-extract amount from receipt images | P3 |
| Expense Attachments | Upload receipts/bills to transactions | P3 |

---

## 8. Release Plan

### Phase 1: MVP (8-10 weeks)
- Google OAuth authentication
- Group creation and management
- Permanent invite code system with shareable links
- Basic expense CRUD with all distribution methods
- Expense categories
- Currency support per group
- Balance calculation and display
- Activity log
- Dark/Light mode theme
- Desktop-first responsive web UI

### Phase 2: Enhanced (4-6 weeks post-MVP)
- Simplified debts algorithm
- Admin role management (promote/demote)
- Export functionality
- Performance optimization

### Phase 3: Growth (Ongoing)
- Notification system (in-app, email, push)
- Mobile apps
- Payment integration
- Expense attachments

---

## 9. Success Criteria for MVP

| Criteria | Measurement |
|----------|-------------|
| Users can sign up via Gmail | 100% success rate |
| Users can create groups and invite others | Invite acceptance rate > 80% |
| Users can add expenses with any split method | < 1 min average time to add expense |
| Balances are accurate | 100% calculation accuracy |
| Activity log shows all actions | Complete audit trail |
| App is responsive | Works on mobile and desktop |
| System is stable | < 0.1% error rate |

---

## 10. Open Questions / Decisions Needed

| Question | Options | Status |
|----------|---------|--------|
| Hosting platform | Vercel + Railway / AWS / GCP | **To be decided** |

---

## 11. Appendix

### A. Priority Legend
| Priority | Meaning |
|----------|---------|
| P0 | Must have for MVP launch |
| P1 | Should have for MVP, can slip to Phase 2 |
| P2 | Nice to have, Phase 2 |
| P3 | Future scope |

### B. Glossary
| Term | Definition |
|------|------------|
| Expense | A shared cost that needs to be split among group members |
| Settlement | A payment made to clear debt between two members |
| Balance | Net amount a user owes or is owed in a group |
| Split | The distribution of an expense among members |
| Admin | Group member with elevated permissions |
| Invite Code | Permanent unique code for joining a group |

### C. Tech Stack (Decided)
| Component | Technology |
|-----------|------------|
| Frontend | React.js + Vite + shadcn/ui |
| Backend | Node.js + Express.js |
| Database | Supabase (PostgreSQL) |
| Authentication | Google OAuth 2.0 + Supabase Auth |

---

*Document Version: 1.1*
*Created: March 7, 2026*
*Last Updated: March 7, 2026*
