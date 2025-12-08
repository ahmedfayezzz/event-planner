# thlothyah Migration: Missing Features & Pages

## Summary

This document details features and pages from the Flask application that are **not yet migrated** to the Next.js version.

---

## Missing Pages

### 1. Public Profile Page (`/u/[username]`)

**Flask Route:** `@app.route('/u/<username>')`
**Template:** `templates/profile.html`

**Features:**
- Display user's public profile (name, company, position, activity type)
- Show AI-generated professional description
- Display social media links (Instagram, Snapchat, Twitter)
- List user's registered sessions (approved only)
- Handle inactive users (redirect with error)

**Required tRPC Endpoints:**
- `user.getByUsername` - Get public profile by username

**Implementation Priority:** HIGH (core feature)

---

### 2. Guest Session Registration (`/session/[id]/guest-register`)

**Flask Route:** `@app.route('/session/<int:session_id>/guest-register')`
**Template:** `templates/session_register.html`

**Features:**
- Allow non-logged-in users to register for sessions
- Optional account creation during registration (checkbox)
- Companion management (add up to `maxCompanions` companions)
- Form fields for guest info:
  - Name, email, phone (required)
  - Password (if creating account)
  - Instagram, Snapchat, Twitter
  - Company, position, activity type
  - Gender, goal
- Check for existing user by email
- Link previous guest registrations to new account
- Send appropriate emails (pending vs confirmed)
- Create companion guest registrations

**Required tRPC Endpoints:**
- `registration.guestRegister` - Handle guest registration with companions

**Implementation Priority:** HIGH (core registration flow)

---

### 3. Registration Confirmation Page (`/registration/[id]/confirmation`)

**Flask Route:** `@app.route('/registration/<int:registration_id>/confirmation')`
**Template:** `templates/registration_confirmation.html`

**Features:**
- Show confirmation after guest registration
- Display registration details
- Show QR code for check-in (if approved)
- Show pending status message (if requires approval)
- Show session information

**Required tRPC Endpoints:**
- `registration.getConfirmation` - Get registration details for confirmation page

**Implementation Priority:** HIGH (part of guest registration flow)

---

### 4. Event/Embed Pages

**Flask Routes:**
- `@app.route('/event/<path:identifier>')` - Redirect to session registration
- `@app.route('/event/<path:identifier>/embed')` - Embeddable widget

**Templates:**
- `templates/embed_full.html` - Full embed view
- `templates/embed_mini.html` - Mini embed view

**Features:**
- Support slug or ID-based URLs
- Full embed: Shows session details, countdown, registration form
- Mini embed: Compact widget for embedding in external sites
- CORS-friendly for iframe embedding
- Check `embedEnabled` setting

**Implementation Priority:** MEDIUM (depends on external use)

---

### 5. Session Companions View (`/admin/sessions/[id]/companions`)

**Flask Route:** `@app.route('/admin/session/<int:session_id>/companions')`
**Template:** `templates/admin/session_companions.html`

**Features:**
- List all companions for a session
- Show companion details (name, company, title, phone, email)
- Show who invited them (registrant name/email)
- Total companion count
- Option to send invitation emails to companions

**Required tRPC Endpoints:**
- `companion.getBySession` - Get all companions for a session

**Implementation Priority:** MEDIUM

---

### 6. Analytics Page (`/admin/analytics`)

**Flask Route:** `@app.route('/admin/analytics')`
**Template:** `templates/admin/analytics.html`

**Note:** AI analytics (OpenAI) is dropped, but basic statistics are still needed.

**Features to Implement:**
- Basic statistics dashboard:
  - Total users by activity type
  - Registration trends over time
  - Session performance metrics
  - Attendance rates
- Charts using Recharts or similar
- No AI/OpenAI integration

**Required tRPC Endpoints:**
- `admin.getAnalytics` - Get basic analytics data

**Implementation Priority:** LOW (can add later)

---

## Missing Features

### 1. QR Code System (User-Facing)

**Flask Route:** `@app.route('/my-qr/<int:session_id>')`

**Features:**
- Generate QR code for user's registration
- Show QR in user dashboard for each registered session
- Include in confirmation emails

**Implementation:**
- Add to `user/dashboard` page
- Use `qrcode` package for generation
- Store QR data: `user:{userId},session:{sessionId},reg:{registrationId}`

**Required tRPC Endpoints:**
- `registration.getQrCode` - Generate QR code for registration

**Implementation Priority:** HIGH

---

### 2. CSV Export (`/admin/export/users`)

**Flask Route:** `@app.route('/admin/export/<export_type>')`

**Features:**
- Export users to CSV
- Fields: Name, Email, Phone, Activity Type, Company, Position, Attendance Count
- Export session attendees
- Export registrations

**Implementation:**
- Add export buttons to admin pages
- Use client-side CSV generation or server-side with file download

**Required tRPC Endpoints:**
- `admin.exportUsers` - Get user data for export
- `admin.exportAttendees` - Get attendee data for session

**Implementation Priority:** LOW

---

### 3. Invitation System (WhatsApp/Email)

**Flask Routes:**
- `@app.route('/api/admin/users-for-invite/<int:session_id>')`
- `@app.route('/api/admin/send-invites/<int:session_id>')`
- `@app.route('/api/admin/generate-whatsapp-invites/<int:session_id>')`
- `@app.route('/api/admin/session-invites/<int:session_id>')`

**Features:**
- Get list of users available for invitation
- Send email invitations with tokens
- Generate WhatsApp message links
- Track invitation status (sent, used)
- Custom invitation messages

**Current Status:** tRPC endpoints exist in `invitation.ts` but admin UI components not implemented

**Implementation:**
- Add invitation modal to admin session pages
- User selection interface
- WhatsApp link generator
- Invitation status tracking

**Implementation Priority:** MEDIUM

---

### 4. Remember Me / Refresh Token

**Flask Implementation:**
- Generates refresh token on login
- Stores in HTTP-only cookie (30 days)
- Auto-login via `@app.before_request`
- Token renewal on each request

**Current Status:** NextAuth handles sessions differently (JWT strategy)

**Implementation:**
- Add "Remember me" checkbox to login form
- Configure NextAuth session maxAge
- Already partially handled by NextAuth JWT strategy

**Implementation Priority:** LOW (NextAuth handles this)

---

### 5. Session Slug URLs

**Flask:** Sessions can have slugs for pretty URLs (`/event/business-tuesday-50`)

**Current Status:** Prisma schema has `slug` field, not used in routing

**Implementation:**
- Add slug generation in session create/edit
- Update session detail page to support slug lookup
- Update links throughout app

**Implementation Priority:** LOW

---

### 6. Invite-Only Sessions

**Flask:** Sessions can be `invite_only`, requiring valid invite token to register

**Current Status:**
- Prisma schema has `inviteOnly` and `inviteMessage` fields
- `Invite` model exists
- No frontend enforcement

**Implementation:**
- Check `inviteOnly` in session registration
- Require valid invite token
- Show appropriate error messages

**Implementation Priority:** MEDIUM

---

### 7. Registration Deadline

**Flask:** Sessions can have `registration_deadline` (hours before session)

**Current Status:**
- Prisma schema has `registrationDeadline` field
- Not enforced in registration flow

**Implementation:**
- Add deadline input in session create/edit (hours before)
- Check deadline in `canRegister` logic
- Show deadline in session detail

**Implementation Priority:** MEDIUM

---

## Missing tRPC Procedures

### user.ts
- [ ] `getByUsername` - Get public profile by username
- [ ] `getQrCode` - Generate QR code for session registration

### registration.ts
- [ ] `guestRegister` - Handle guest registration with companions
- [ ] `getConfirmation` - Get registration details for confirmation

### admin.ts
- [ ] `getAnalytics` - Basic analytics data
- [ ] `exportUsers` - Export user data for CSV
- [ ] `exportAttendees` - Export attendee data

### session.ts
- [ ] `getBySlug` - Get session by slug (for embed/event URLs)

---

## File Structure for Missing Pages

```
src/app/
├── u/
│   └── [username]/
│       └── page.tsx          # Public profile
├── session/
│   └── [id]/
│       ├── page.tsx          # (exists) Session detail
│       └── guest-register/
│           └── page.tsx      # Guest registration
├── registration/
│   └── [id]/
│       └── confirmation/
│           └── page.tsx      # Registration confirmation
├── event/
│   └── [identifier]/
│       ├── page.tsx          # Event redirect
│       └── embed/
│           └── page.tsx      # Embed widget
└── admin/
    ├── sessions/
    │   └── [id]/
    │       └── companions/
    │           └── page.tsx  # Session companions
    └── analytics/
        └── page.tsx          # Analytics dashboard
```

---

## Priority Order

### Phase 1 (Core Functionality)
1. Public Profile Page (`/u/[username]`)
2. Guest Session Registration (`/session/[id]/guest-register`)
3. Registration Confirmation (`/registration/[id]/confirmation`)
4. User QR Code Display (in dashboard)

### Phase 2 (Admin Features)
5. Session Companions View
6. Invitation System UI
7. Invite-Only Session Enforcement
8. Registration Deadline Enforcement

### Phase 3 (Polish)
9. Embed Pages
10. Analytics Page (basic stats)
11. CSV Export
12. Session Slug URLs

---

## Estimated Effort

| Feature                   | Complexity | Time Estimate |
|---------------------------|------------|---------------|
| Public Profile            | Medium     | 2-3 hours     |
| Guest Registration        | High       | 4-6 hours     |
| Registration Confirmation | Low        | 1-2 hours     |
| QR Code Display           | Low        | 1-2 hours     |
| Session Companions        | Low        | 1-2 hours     |
| Invitation UI             | Medium     | 3-4 hours     |
| Embed Pages               | Medium     | 3-4 hours     |
| Analytics Page            | Medium     | 3-4 hours     |
| CSV Export                | Low        | 1-2 hours     |
| Slug URLs                 | Low        | 1 hour        |

**Total Estimated: 20-30 hours**

---

## Feature Gaps in Migrated Pages

Below are features present in Flask pages that are **missing from their Next.js counterparts**.

---

### User Dashboard (`/user/dashboard`)

**Flask Template:** `templates/user_dashboard.html`
**Next.js Page:** `src/app/user/dashboard/page.tsx`

| Feature                            | Flask | Next.js | Notes                                                       |
|------------------------------------|-------|---------|-------------------------------------------------------------|
| Profile info section               | ✅     | ❌       | Name, email, phone, company, position, goal, AI description |
| Edit profile button                | ✅     | ❌       | Links to profile edit                                       |
| Attendance rate stat               | ✅     | ❌       | Shows % of sessions attended                                |
| Attendance status per registration | ✅     | ❌       | Shows attended/absent/not started                           |
| QR code modal                      | ✅     | ❌       | `/my-qr/{sessionId}` endpoint, modal display                |
| QR button per session              | ✅     | ❌       | Button links to non-existent `/user/qr/[id]`                |
| Logout button in header            | ✅     | ❌       | Explicit logout action                                      |

**Missing tRPC Data:**
- User profile details in dashboard response
- Attendance status per registration
- QR code generation endpoint

---

### Session Detail (`/session/[id]`)

**Flask Template:** `templates/session_detail.html`
**Next.js Page:** `src/app/session/[id]/page.tsx`

| Feature                     | Flask | Next.js | Notes                                              |
|-----------------------------|-------|---------|----------------------------------------------------|
| User info section           | ✅     | ❌       | Shows logged-in user's name, email, phone, company |
| Share on X (Twitter) button | ✅     | ❌       | Opens Twitter share dialog                         |
| Copy session link button    | ✅     | ❌       | Copies URL to clipboard                            |
| QR code modal               | ✅     | ❌       | For registered users                               |
| Show QR button              | ✅     | ❌       | When user is approved                              |
| Registration date display   | ✅     | ❌       | Shows when user registered                         |

**Implementation:**
- Add share buttons (Twitter/copy link)
- Add QR code modal for registered users
- Show user's registration info when logged in

---

### Admin Dashboard (`/admin`)

**Flask Template:** `templates/admin/dashboard.html`
**Next.js Page:** `src/app/admin/page.tsx`

| Feature                               | Flask | Next.js | Notes                                         |
|---------------------------------------|-------|---------|-----------------------------------------------|
| Approve button in registrations table | ✅     | ❌       | Quick approve for pending                     |
| Session dropdown menu                 | ✅     | ❌       | Attendees, Check-in, Generate QR links        |
| Quick Actions section                 | ✅     | ❌       | Add session, Send notifications, Bulk actions |
| Export data dropdown                  | ✅     | ❌       | Export users/sessions CSV                     |
| Analytics page link                   | ✅     | ❌       | Link to `/admin/analytics`                    |
| QR code modal for sessions            | ✅     | ❌       | Generate session QR codes                     |

**Next.js Extras (not in Flask):**
- Attendance stats table with charts ✅

---

### Admin Sessions List (`/admin/sessions`)

**Flask Template:** `templates/admin/sessions.html`
**Next.js Page:** `src/app/admin/sessions/page.tsx`

| Feature               | Flask | Next.js | Notes                           |
|-----------------------|-------|---------|---------------------------------|
| Session status filter | ✅     | ❓       | Filter by open/closed/completed |
| Batch actions         | ✅     | ❌       | Select multiple sessions        |
| Quick status change   | ✅     | ❌       | Dropdown to change status       |
| Companions link       | ✅     | ❌       | Link to view companions         |
| Check-in link         | ✅     | ❓       | Link to check-in page           |

---

### Admin Session Edit (`/admin/sessions/[id]`)

**Flask Template:** `templates/admin/edit_session.html`
**Next.js Page:** `src/app/admin/sessions/[id]/page.tsx`

| Feature                   | Flask | Next.js | Notes                           |
|---------------------------|-------|---------|---------------------------------|
| Invitation section        | ✅     | ❌       | Add emails, send invites        |
| Invitation history        | ✅     | ❌       | List of sent invitations        |
| WhatsApp invite generator | ✅     | ❌       | Generate WhatsApp message links |
| Embed code preview        | ✅     | ❌       | Show iframe embed code          |
| Delete session button     | ✅     | ❓       | With confirmation               |

---

### Admin Session Attendees (`/admin/sessions/[id]/attendees`)

**Flask Template:** `templates/admin/session_attendees.html`
**Next.js Page:** `src/app/admin/sessions/[id]/attendees/page.tsx`

| Feature                 | Flask | Next.js | Notes                               |
|-------------------------|-------|---------|-------------------------------------|
| Companion count column  | ✅     | ❓       | Show # of companions per registrant |
| View companions link    | ✅     | ❌       | Link to companions page             |
| Approve button          | ✅     | ❓       | For pending registrations           |
| Export attendees button | ✅     | ❌       | CSV export                          |
| Send reminder email     | ✅     | ❌       | Send email to all attendees         |
| Search/filter           | ✅     | ❓       | Filter by name/email                |

---

### Register Page (`/register`)

**Flask Template:** `templates/register.html`
**Next.js Page:** `src/app/register/page.tsx`

| Feature                  | Flask | Next.js | Notes                                 |
|--------------------------|-------|---------|---------------------------------------|
| Social media fields      | ✅     | ❓       | Instagram, Snapchat, Twitter          |
| Company fields           | ✅     | ❓       | Company name, position, activity type |
| Gender field             | ✅     | ❓       | Male/Female selection                 |
| Goal field               | ✅     | ❓       | What they want from joining           |
| Phone validation (Saudi) | ✅     | ❓       | Format: 05XXXXXXXX                    |
| Username generation      | ✅     | ❓       | Auto-generate from email              |

---

### Sessions List (`/sessions`)

**Flask Template:** `templates/sessions.html`
**Next.js Page:** `src/app/sessions/page.tsx`

| Feature                   | Flask | Next.js | Notes                                    |
|---------------------------|-------|---------|------------------------------------------|
| Session filters           | ✅     | ❓       | Filter by status (open/closed/completed) |
| Search sessions           | ✅     | ❌       | Search by title                          |
| Countdown per session     | ✅     | ❓       | Show countdown to session date           |
| Guest info display        | ✅     | ❓       | Show guest name if set                   |
| Registration progress bar | ✅     | ❓       | Visual fill indicator                    |

---

## Priority Updates After Comparison

Based on the detailed comparison, here's the updated priority:

### Immediate Fixes (Essential for Parity)

1. **User Dashboard:**
   - Add profile info section
   - Add attendance rate calculation
   - Implement QR code modal and endpoint
   - Add attendance status per registration

2. **Session Detail:**
   - Add share buttons (Twitter, copy link)
   - Add QR code for registered users

3. **Admin Dashboard:**
   - Add quick approve button for registrations
   - Add session action dropdown menu
   - Add quick actions section

### High Priority

4. Public Profile Page (`/u/[username]`)
5. Guest Registration (`/session/[id]/guest-register`)
6. Registration Confirmation Page
7. Invitation System UI

### Medium Priority

8. Session Companions Page
9. CSV Export
10. Embed Pages
11. Admin Analytics (basic stats)

---

## Summary of All Gaps

| Category                           | Count | Priority    |
|------------------------------------|-------|-------------|
| Missing Pages                      | 6     | High        |
| Missing Features in Existing Pages | 25+   | Medium-High |
| Missing tRPC Endpoints             | 8     | High        |
| UI Enhancements                    | 15+   | Medium      |

**Revised Total Estimated: 35-45 hours**
