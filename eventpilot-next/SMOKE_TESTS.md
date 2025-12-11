# Smoke Tests - ثلوثية الأعمال

> Comprehensive smoke test cases for AI-powered QA testing using Playwright MCP

---

## Setup

### 1. Install Playwright MCP
```bash
claude mcp add playwright npx '@playwright/mcp@latest'
```

### 2. Start Development Server
```bash
cd eventpilot-next
npm run dev
```
Server runs at: `http://localhost:3000`

### 3. Seed Test Data
```bash
npx prisma db seed
```

---

## Test Data

### Test Accounts
| Role        | Email                    | Password        |
|-------------|--------------------------|-----------------|
| Super Admin | support@tda.sa           | @dm!n@thlothyah |
| Admin       | moderator@eventpilot.com | admin123        |
| Member      | (create during tests)    | Test123!        |

### Base URL
```
http://localhost:3000
```

---

## Test Cases

## 1. GUEST Tests (No Login Required)

### GUEST-01: View Homepage
**Priority**: Critical

**Steps**:
1. Navigate to homepage
2. Verify hero section displays
3. Verify countdown timer shows (if upcoming event exists)
4. Verify navigation links work

**AI Prompt**:
```
Use playwright to navigate to localhost:3000 and verify:
1. The page title contains "ثلوثية الأعمال"
2. There is a hero section with the site name
3. Navigation menu has links to "الأحداث" (Events) and "تسجيل" (Register)
Take a screenshot of the homepage
```

**Expected**: Homepage loads with branding, countdown, and navigation

---

### GUEST-02: Browse Sessions List
**Priority**: Critical

**Steps**:
1. Navigate to /sessions
2. Verify sessions grid displays
3. Click on "القادمة" (Upcoming) tab
4. Verify session cards show title, date, status

**AI Prompt**:
```
Use playwright to:
1. Navigate to localhost:3000/sessions
2. Wait for the page to load
3. Verify there are session cards displayed
4. Click on the "القادمة" tab if visible
5. Take a screenshot showing the sessions list
```

**Expected**: Sessions list displays with filterable tabs

---

### GUEST-03: View Session Details
**Priority**: Critical

**Steps**:
1. Navigate to /sessions
2. Click on any session card
3. Verify session details page shows title, date, time, location
4. Verify registration buttons are visible

**AI Prompt**:
```
Use playwright to:
1. Navigate to localhost:3000/sessions
2. Click on the first session card
3. Wait for the session details page to load
4. Verify the page shows: title, date, time, location
5. Verify there is a "سجل كزائر" (Register as Guest) button
6. Take a screenshot of the session details
```

**Expected**: Session details page with all info and registration CTA

---

### GUEST-04: Complete Guest Registration
**Priority**: Critical

**Preconditions**: Open session exists with available spots

**Steps**:
1. Navigate to session details
2. Click "سجل كزائر" (Register as Guest)
3. Fill required fields: name, email, phone
4. Select gender
5. Fill company and position
6. Submit form
7. Verify confirmation page

**AI Prompt**:
```
Use playwright to:
1. Navigate to localhost:3000/sessions
2. Click the first available session
3. Click the "سجل كزائر" button
4. Fill the form:
   - Name: "أحمد محمد"
   - Email: "test.guest@example.com"
   - Phone: "0501234567"
   - Select gender "ذكر"
   - Company: "شركة اختبار"
   - Position: "مدير"
5. Click the submit button
6. Wait for redirect to confirmation page
7. Take a screenshot of the result
```

**Expected**: Registration completes, confirmation page shows success

---

### GUEST-05: Guest Registration with Companions
**Priority**: High

**Steps**:
1. Go to guest registration form
2. Fill main registrant info
3. Click "إضافة مرافق" (Add Companion)
4. Fill companion: name, phone
5. Add second companion
6. Submit form

**AI Prompt**:
```
Use playwright to:
1. Navigate to a session's guest registration page
2. Fill main registrant info (name, email, phone, gender)
3. Find and click the "إضافة مرافق" button
4. Fill companion 1: name "سارة أحمد", phone "0507654321"
5. Click add companion again
6. Fill companion 2: name "محمد علي", phone "0509876543"
7. Submit the form
8. Verify success and take screenshot
```

**Expected**: Registration with 2 companions succeeds

---

### GUEST-06: Guest Registration - Create Account Option
**Priority**: High

**Steps**:
1. Go to guest registration form
2. Fill registration info
3. Check "إنشاء حساب" checkbox
4. Enter password (6+ chars)
5. Confirm password
6. Submit

**AI Prompt**:
```
Use playwright to:
1. Navigate to guest registration page
2. Fill basic info (name, email, phone, gender)
3. Find and check the "إنشاء حساب" or account creation checkbox
4. Enter password "Test123!" in the password field
5. Confirm the password
6. Submit the form
7. Verify account creation succeeded
```

**Expected**: Guest registers AND creates account in one step

---

### GUEST-07: View Registration Confirmation
**Priority**: High

**Preconditions**: Complete a registration first

**Steps**:
1. After successful registration
2. Verify confirmation page shows
3. Check registration details displayed
4. Verify next steps instructions

**AI Prompt**:
```
After completing a guest registration, verify:
1. The URL contains "confirmation"
2. There is a success message displayed
3. Registration details are shown (name, event)
4. Take a screenshot of the confirmation page
```

**Expected**: Confirmation page with registration summary

---

### GUEST-08: Access Public QR Page
**Priority**: Medium

**Preconditions**: Valid registration ID

**Steps**:
1. Navigate to /qr/{registrationId}
2. Verify QR code displays
3. Verify attendee name shows
4. Verify download button exists

**AI Prompt**:
```
Use playwright to:
1. Navigate to localhost:3000/qr/[use-a-valid-registration-id]
2. Verify QR code image is displayed
3. Verify attendee name is shown
4. Check for download button
5. Take a screenshot
```

**Expected**: Public QR page accessible with code and info

---

### GUEST-09: View Event Embed Widget
**Priority**: Medium

**Steps**:
1. Navigate to /event/{slug}/embed
2. Verify compact event card displays
3. Verify registration button works

**AI Prompt**:
```
Use playwright to:
1. Navigate to localhost:3000/event/[session-slug]/embed
2. Verify the embed widget shows event title
3. Verify date and time are displayed
4. Verify there is a registration button
5. Take a screenshot of the embed widget
```

**Expected**: Embeddable widget renders correctly

---

### GUEST-10: Registration Validation Errors
**Priority**: High

**Steps**:
1. Go to guest registration
2. Submit empty form
3. Verify validation errors show
4. Fill invalid email, submit
5. Verify email error

**AI Prompt**:
```
Use playwright to:
1. Navigate to guest registration page
2. Click submit without filling any fields
3. Verify error messages appear for required fields
4. Fill only name with "Test"
5. Fill email with "invalid-email" (no @)
6. Click submit
7. Verify email validation error appears
8. Take a screenshot showing the validation errors
```

**Expected**: Clear validation errors for each field

---

## 2. MEMBER Tests (Authenticated User)

### MEMBER-01: Register New Account
**Priority**: Critical

**Steps**:
1. Navigate to /register
2. Fill all required fields
3. Set password (6+ chars)
4. Submit form
5. Verify redirect to login

**AI Prompt**:
```
Use playwright to:
1. Navigate to localhost:3000/register
2. Fill the form:
   - Name: "عضو اختبار"
   - Email: "new.member@example.com"
   - Phone: "0551234567"
   - Select gender
   - Password: "Test123!"
   - Confirm password: "Test123!"
   - Company: "شركة جديدة"
   - Position: "موظف"
3. Submit the form
4. Verify redirect to login page
5. Take a screenshot
```

**Expected**: Account created, redirected to login

---

### MEMBER-02: Login with Valid Credentials
**Priority**: Critical

**Steps**:
1. Navigate to /user/login
2. Enter valid email
3. Enter correct password
4. Click login
5. Verify redirect to dashboard

**AI Prompt**:
```
Use playwright to:
1. Navigate to localhost:3000/user/login
2. Enter email: "new.member@example.com" (or existing member)
3. Enter password: "Test123!"
4. Click the login button
5. Wait for redirect
6. Verify you are on the dashboard/registrations page
7. Take a screenshot of the dashboard
```

**Expected**: Login succeeds, user sees dashboard

---

### MEMBER-03: Login with Invalid Credentials
**Priority**: High

**Steps**:
1. Navigate to /user/login
2. Enter valid email
3. Enter wrong password
4. Click login
5. Verify error message

**AI Prompt**:
```
Use playwright to:
1. Navigate to localhost:3000/user/login
2. Enter email: "test@example.com"
3. Enter password: "wrongpassword"
4. Click login
5. Verify an error message appears
6. Take a screenshot showing the error
```

**Expected**: Error message "Invalid credentials" or similar

---

### MEMBER-04: View User Dashboard
**Priority**: Critical

**Preconditions**: Logged in as member

**Steps**:
1. Navigate to /user/registrations
2. Verify user info displays
3. Verify registration cards show
4. Check upcoming vs archive tabs

**AI Prompt**:
```
After logging in as a member, use playwright to:
1. Navigate to localhost:3000/user/registrations
2. Verify the user's name appears
3. Verify stats cards show (registrations, events)
4. Check if there are registration cards
5. Click on "القادمة" and "الأرشيف" tabs
6. Take screenshots of each tab
```

**Expected**: Dashboard shows user info, stats, registrations

---

### MEMBER-05: Register for Event as Member
**Priority**: Critical

**Preconditions**: Logged in as member, open session exists

**Steps**:
1. Navigate to /sessions
2. Click on open session
3. Click "احجز مكانك" (Reserve your spot)
4. Verify member registration form (simplified)
5. Submit

**AI Prompt**:
```
While logged in as a member:
1. Navigate to localhost:3000/sessions
2. Click on an available session
3. Click the "احجز مكانك" button
4. Verify the simplified member registration form shows your info
5. Submit the registration
6. Verify success message or confirmation
7. Take a screenshot
```

**Expected**: Quick registration for existing members

---

### MEMBER-06: Add Companions to Registration
**Priority**: High

**Steps**:
1. During member registration
2. Click add companion
3. Fill companion details
4. Submit with companion

**AI Prompt**:
```
While registering as a member:
1. On the member registration form
2. Click "إضافة مرافق"
3. Fill: name "مرافق واحد", phone "0505555555"
4. Submit the registration
5. Verify companion appears in confirmation
```

**Expected**: Registration includes companion

---

### MEMBER-07: Edit Existing Registration
**Priority**: High

**Preconditions**: Has existing upcoming registration

**Steps**:
1. Go to dashboard
2. Find upcoming registration
3. Click edit button
4. Modify companions
5. Save changes

**AI Prompt**:
```
As a logged-in member with an existing registration:
1. Navigate to localhost:3000/user/registrations
2. Find an upcoming registration card
3. Click the edit button
4. Add or modify a companion
5. Save changes
6. Verify the changes are saved
7. Take a screenshot
```

**Expected**: Registration updated successfully

---

### MEMBER-08: View QR Access Card
**Priority**: Critical

**Preconditions**: Has approved registration

**Steps**:
1. Go to dashboard
2. Find approved registration
3. Click QR/access card button
4. Verify QR displays

**AI Prompt**:
```
As a member with an approved registration:
1. Navigate to localhost:3000/user/registrations
2. Find a registration marked as approved
3. Click the QR code or access card button
4. Verify QR code page loads
5. Verify your name and event details show
6. Take a screenshot of the QR card
```

**Expected**: QR code displayed with user/event info

---

### MEMBER-09: Edit User Profile
**Priority**: Medium

**Steps**:
1. Navigate to /user/profile
2. Update name or bio
3. Save changes
4. Verify changes persisted

**AI Prompt**:
```
As a logged-in member:
1. Navigate to localhost:3000/user/profile
2. Change the bio to "هذا نص تجريبي للاختبار"
3. Click save
4. Refresh the page
5. Verify the bio is still updated
6. Take a screenshot
```

**Expected**: Profile updates saved

---

### MEMBER-10: Change Password
**Priority**: Medium

**Steps**:
1. Navigate to change password page
2. Enter current password
3. Enter new password
4. Confirm new password
5. Submit

**AI Prompt**:
```
As a logged-in member:
1. Navigate to localhost:3000/user/change-password
2. Enter current password
3. Enter new password "NewPass123!"
4. Confirm new password
5. Submit
6. Verify success message
```

**Expected**: Password changed successfully

---

### MEMBER-11: Forgot Password Flow
**Priority**: High

**Steps**:
1. Go to login page
2. Click forgot password
3. Enter email
4. Submit
5. Verify email sent message

**AI Prompt**:
```
Use playwright to:
1. Navigate to localhost:3000/user/login
2. Click "نسيت كلمة المرور" link
3. Enter email: "test@example.com"
4. Submit the form
5. Verify a message about email being sent appears
6. Take a screenshot
```

**Expected**: Reset email sent (or message shown)

---

### MEMBER-12: Logout
**Priority**: High

**Steps**:
1. While logged in
2. Find logout button
3. Click logout
4. Verify redirected to login/home

**AI Prompt**:
```
While logged in as a member:
1. Find and click the logout button (may be in menu)
2. Verify you are logged out
3. Try accessing localhost:3000/user/registrations
4. Verify you are redirected to login
5. Take a screenshot
```

**Expected**: User logged out, cannot access protected pages

---

## 3. ADMIN Tests

### ADMIN-01: Admin Login
**Priority**: Critical

**Steps**:
1. Navigate to /admin/login or /user/login
2. Enter admin credentials
3. Verify redirect to admin dashboard

**AI Prompt**:
```
Use playwright to:
1. Navigate to localhost:3000/user/login
2. Enter email: "admin@eventpilot.com"
3. Enter password: "admin123"
4. Submit login
5. Navigate to localhost:3000/admin
6. Verify admin dashboard loads
7. Take a screenshot
```

**Expected**: Admin logged in, can access /admin

---

### ADMIN-02: View Admin Dashboard
**Priority**: Critical

**Preconditions**: Logged in as admin

**Steps**:
1. Navigate to /admin
2. Verify stats cards show
3. Verify recent activity
4. Verify navigation sidebar

**AI Prompt**:
```
As admin, use playwright to:
1. Navigate to localhost:3000/admin
2. Verify stats cards: Users, Sessions, Registrations, Pending
3. Verify sidebar navigation links
4. Take a screenshot of the dashboard
```

**Expected**: Dashboard with metrics and navigation

---

### ADMIN-03: Create New Session/Event
**Priority**: Critical

**Steps**:
1. Go to /admin/sessions
2. Click "حدث جديد" (New Event)
3. Fill form: title, date, time, location
4. Set capacity
5. Save

**AI Prompt**:
```
As admin:
1. Navigate to localhost:3000/admin/sessions
2. Click "حدث جديد" button
3. Fill the form:
   - Title: "حدث اختبار جديد"
   - Date: tomorrow's date
   - Time: "19:00"
   - Location: "فندق الريتز"
   - Max Participants: 50
   - Max Companions: 2
4. Submit the form
5. Verify redirect to session details
6. Take a screenshot
```

**Expected**: New session created successfully

---

### ADMIN-04: Edit Existing Session
**Priority**: High

**Steps**:
1. Go to /admin/sessions
2. Click on a session
3. Click edit
4. Modify title or date
5. Save

**AI Prompt**:
```
As admin:
1. Navigate to localhost:3000/admin/sessions
2. Click on any session
3. Click the edit button
4. Change the title to "حدث معدل"
5. Save changes
6. Verify the title is updated
7. Take a screenshot
```

**Expected**: Session updated

---

### ADMIN-05: Delete Session
**Priority**: Medium

**Steps**:
1. Go to session list
2. Click delete on a session
3. Confirm deletion
4. Verify removed from list

**AI Prompt**:
```
As admin:
1. Navigate to localhost:3000/admin/sessions
2. Find a test session to delete
3. Click the delete option in the dropdown
4. Confirm the deletion dialog
5. Verify the session is removed
6. Take a screenshot
```

**Expected**: Session deleted

---

### ADMIN-06: View Session Registrations
**Priority**: Critical

**Steps**:
1. Go to session details
2. Click "إدارة المسجلين" (Manage Registrations)
3. Verify registrations table shows
4. Check filters work

**AI Prompt**:
```
As admin:
1. Navigate to localhost:3000/admin/sessions/[id]
2. Click "إدارة المسجلين" button
3. Verify the registrations table displays
4. Try the status filter dropdown
5. Try searching for a name
6. Take a screenshot
```

**Expected**: Registrations list with filters

---

### ADMIN-07: Approve Pending Registration
**Priority**: Critical

**Steps**:
1. Go to registrations page
2. Filter by pending
3. Find pending registration
4. Click approve
5. Verify status changes

**AI Prompt**:
```
As admin:
1. Navigate to session registrations page
2. Filter by "قيد الانتظار" (Pending)
3. Find a pending registration
4. Click the approve button
5. Verify the status changes to approved
6. Take a screenshot
```

**Expected**: Registration approved

---

### ADMIN-08: Reject Registration
**Priority**: High

**Steps**:
1. Find pending registration
2. Click reject/delete
3. Confirm
4. Verify removed

**AI Prompt**:
```
As admin:
1. Navigate to session registrations
2. Find a pending registration
3. Click the reject or delete button
4. Confirm the action
5. Verify the registration is removed
6. Take a screenshot
```

**Expected**: Registration rejected/removed

---

### ADMIN-09: Export Registrations CSV
**Priority**: Medium

**Steps**:
1. Go to registrations page
2. Click export button
3. Verify CSV downloads

**AI Prompt**:
```
As admin:
1. Navigate to session registrations page
2. Click the export/download button
3. Verify a CSV file download starts
(Note: Playwright may not track downloads, just verify button works)
```

**Expected**: CSV file downloads

---

### ADMIN-10: QR Check-in (Scanner)
**Priority**: Critical

**Steps**:
1. Go to /admin/checkin/{id}
2. Click start scan
3. Allow camera access
4. Scan QR code

**AI Prompt**:
```
As admin:
1. Navigate to localhost:3000/admin/checkin/[session-id]
2. Click "بدء المسح" (Start Scan) button
3. Verify QR scanner dialog opens
4. Note: Camera scanning requires physical QR, verify UI works
5. Take a screenshot of the scanner dialog
```

**Expected**: QR scanner opens (camera permission required)

---

### ADMIN-11: Manual Check-in
**Priority**: Critical

**Steps**:
1. Go to check-in page
2. Click manual check-in
3. Search for attendee
4. Select and check in
5. Verify status updates

**AI Prompt**:
```
As admin:
1. Navigate to localhost:3000/admin/checkin/[session-id]
2. Click "تسجيل يدوي" (Manual Check-in)
3. In the dialog, search for an attendee
4. Select the attendee checkbox
5. Click confirm/check-in
6. Verify their status changes to checked-in
7. Take a screenshot
```

**Expected**: Attendee manually checked in

---

### ADMIN-12: Bulk Check-in
**Priority**: High

**Steps**:
1. Go to check-in page
2. Open manual check-in
3. Select all attendees
4. Bulk check in

**AI Prompt**:
```
As admin:
1. Navigate to check-in page
2. Open manual check-in dialog
3. Click "تحديد الكل" (Select All)
4. Click bulk check-in button
5. Verify all selected are checked in
6. Take a screenshot
```

**Expected**: Multiple attendees checked in at once

---

### ADMIN-13: Send Invitations
**Priority**: High

**Steps**:
1. Go to session invitations page
2. Enter phone numbers
3. Compose message
4. Send invitations

**AI Prompt**:
```
As admin:
1. Navigate to localhost:3000/admin/sessions/[id]/invitations
2. Add phone numbers: "0501234567", "0507654321"
3. Verify invite message preview
4. Click send
5. Verify invitations appear in the list
6. Take a screenshot
```

**Expected**: Invitations sent and listed

---

### ADMIN-14: Manage Users List
**Priority**: High

**Steps**:
1. Go to /admin/users
2. Verify user table displays
3. Try search
4. Try filters

**AI Prompt**:
```
As admin:
1. Navigate to localhost:3000/admin/users
2. Verify users table displays
3. Search for "أحمد"
4. Try the role filter
5. Take a screenshot
```

**Expected**: Users list with search and filters

---

### ADMIN-15: View User Profile (Admin)
**Priority**: Medium

**Steps**:
1. Go to users list
2. Click on a user
3. Verify profile page shows all details

**AI Prompt**:
```
As admin:
1. Navigate to localhost:3000/admin/users
2. Click on any user's "عرض الملف" option
3. Verify user profile page shows: info, registrations, stats
4. Take a screenshot
```

**Expected**: Full user profile with history

---

### ADMIN-16: Add User Labels
**Priority**: Medium

**Steps**:
1. Go to user profile or users list
2. Click labels area
3. Create new label or select existing
4. Save

**AI Prompt**:
```
As admin:
1. Navigate to localhost:3000/admin/users
2. Click on a user's labels cell
3. Type "VIP" to create new label
4. Click the create option
5. Verify label is added
6. Take a screenshot
```

**Expected**: Label created and assigned

---

### ADMIN-17: Filter Users by Label
**Priority**: Medium

**Steps**:
1. Go to users list
2. Click label filter
3. Select a label
4. Verify filtered results

**AI Prompt**:
```
As admin:
1. Navigate to localhost:3000/admin/users
2. Click the label filter button
3. Select a label
4. Verify users list filters to show only labeled users
5. Take a screenshot
```

**Expected**: Users filtered by label

---

### ADMIN-18: View Analytics Dashboard
**Priority**: High

**Steps**:
1. Go to /admin/analytics
2. Verify charts load
3. Verify tables show data

**AI Prompt**:
```
As admin:
1. Navigate to localhost:3000/admin/analytics
2. Wait for page to fully load
3. Verify stats cards appear
4. Verify at least one chart renders
5. Scroll to see all sections
6. Take screenshots of key sections
```

**Expected**: Analytics with charts and metrics

---

### ADMIN-19: Manage Hosts/Catering
**Priority**: Medium

**Steps**:
1. Go to /admin/hosts
2. Verify hosts list displays
3. Check filter by type

**AI Prompt**:
```
As admin:
1. Navigate to localhost:3000/admin/hosts
2. Verify hosts table displays
3. Try the hosting type filter
4. Take a screenshot
```

**Expected**: Hosts list with filters

---

### ADMIN-20: Add Host Manually
**Priority**: Medium

**Steps**:
1. Go to hosts page
2. Click add host
3. Fill form
4. Save

**AI Prompt**:
```
As admin:
1. Navigate to localhost:3000/admin/hosts
2. Click "إضافة مضيف" button
3. Fill: name "مضيف جديد", phone "0508888888"
4. Select hosting type
5. Submit
6. Verify host appears in list
7. Take a screenshot
```

**Expected**: Host added to system

---

### ADMIN-21: WhatsApp Message to Host
**Priority**: Medium

**Steps**:
1. Go to hosts list
2. Find host with phone
3. Click WhatsApp button
4. Verify WhatsApp opens (or link generated)

**AI Prompt**:
```
As admin:
1. Navigate to localhost:3000/admin/hosts
2. Find a host with a phone number
3. Click the WhatsApp button
4. Verify WhatsApp link is triggered
(Note: WhatsApp will try to open externally)
5. Take a screenshot
```

**Expected**: WhatsApp link opens with pre-filled message

---

### ADMIN-22: Update Global Settings
**Priority**: Medium

**Steps**:
1. Go to /admin/settings
2. Toggle a setting
3. Save
4. Verify persisted

**AI Prompt**:
```
As admin:
1. Navigate to localhost:3000/admin/settings
2. Toggle "عرض حقول التواصل الاجتماعي"
3. Save settings
4. Refresh page
5. Verify the toggle state persisted
6. Take a screenshot
```

**Expected**: Settings saved

---

### ADMIN-23: Export Users CSV
**Priority**: Medium

**Steps**:
1. Go to users page
2. Click export
3. Verify download starts

**AI Prompt**:
```
As admin:
1. Navigate to localhost:3000/admin/users
2. Click the export button
3. Verify CSV download initiates
```

**Expected**: Users exported to CSV

---

## 4. Edge Cases & Error Handling

### EDGE-01: Register for Full Event
**Priority**: High

**Preconditions**: Session at max capacity

**AI Prompt**:
```
Use playwright to:
1. Navigate to a session that is full (registrations = max)
2. Try to access registration page
3. Verify appropriate message shows (full/closed)
4. Take a screenshot
```

**Expected**: Cannot register, shows "مكتمل" message

---

### EDGE-02: Register for Closed Event
**Priority**: High

**AI Prompt**:
```
Use playwright to:
1. Navigate to a session with status "closed"
2. Verify registration buttons are disabled or hidden
3. Verify message indicates registration is closed
4. Take a screenshot
```

**Expected**: Registration not allowed

---

### EDGE-03: Register for Past Event
**Priority**: Medium

**AI Prompt**:
```
Use playwright to:
1. Navigate to a completed/past event
2. Verify no registration option available
3. Verify status shows "منعقدة" (completed)
4. Take a screenshot
```

**Expected**: No registration for past events

---

### EDGE-04: Duplicate Registration Attempt
**Priority**: High

**AI Prompt**:
```
After registering as a member for an event:
1. Try to register again for the same event
2. Verify error message about already registered
3. Take a screenshot
```

**Expected**: Error - already registered

---

### EDGE-05: Invalid Invite Token
**Priority**: Medium

**AI Prompt**:
```
Use playwright to:
1. Navigate to localhost:3000/session/[id]/guest-register?token=invalid123
2. Verify error about invalid invitation
3. Take a screenshot
```

**Expected**: Invalid token error

---

### EDGE-06: Exceed Companion Limit
**Priority**: Medium

**AI Prompt**:
```
During registration (if max companions = 2):
1. Add companion 1
2. Add companion 2
3. Try to add companion 3
4. Verify limit message or button disabled
5. Take a screenshot
```

**Expected**: Cannot exceed companion limit

---

### EDGE-07: QR Scan - Already Checked In
**Priority**: High

**AI Prompt**:
```
As admin during check-in:
1. Check in an attendee (manually or QR)
2. Try to check them in again
3. Verify duplicate check-in message
4. Take a screenshot
```

**Expected**: Message - already checked in

---

### EDGE-08: QR Scan - Invalid Code
**Priority**: High

**AI Prompt**:
```
As admin on check-in page:
1. Open QR scanner
2. Scan an invalid QR code (or simulate)
3. Verify error message about invalid code
```

**Expected**: Invalid QR error

---

### EDGE-09: Access Admin Without Permission
**Priority**: Critical

**AI Prompt**:
```
As a regular member (not admin):
1. Login as regular user
2. Try to navigate to localhost:3000/admin
3. Verify access denied or redirect to login
4. Take a screenshot
```

**Expected**: Access denied for non-admins

---

### EDGE-10: Session Timeout Handling
**Priority**: Medium

**AI Prompt**:
```
1. Login as user
2. Wait or simulate session expiry
3. Try to access protected page
4. Verify redirect to login
```

**Expected**: Graceful redirect to login

---

## Quick Reference: Test Summary

| Category   | Count  | Critical | High   | Medium |
|------------|--------|----------|--------|--------|
| Guest      | 10     | 4        | 4      | 2      |
| Member     | 12     | 5        | 5      | 2      |
| Admin      | 23     | 7        | 8      | 8      |
| Edge Cases | 10     | 1        | 5      | 4      |
| **Total**  | **55** | **17**   | **22** | **16** |

---

## Running Tests with AI

### Start a Test Session
```
Use playwright mcp to run smoke tests on localhost:3000.
Start with GUEST-01: Navigate to homepage and verify it loads correctly with the site title "ثلوثية الأعمال"
```

### Run Multiple Tests
```
Run the following smoke tests in sequence:
1. GUEST-01: View Homepage
2. GUEST-02: Browse Sessions
3. GUEST-03: View Session Details
Take screenshots after each test.
```

### Run Full Category
```
Run all ADMIN smoke tests (ADMIN-01 through ADMIN-23).
Login first with admin@eventpilot.com / admin123.
Report pass/fail for each test.
```

---

## Test Results Template

```markdown
## Smoke Test Run - [DATE]

### Environment
- URL: localhost:3000
- Browser: Chrome (Playwright)
- Tester: Claude AI

### Results

| Test ID  | Name                 | Status | Notes              |
|----------|----------------------|--------|--------------------|
| GUEST-01 | View Homepage        | ✅ PASS |                    |
| GUEST-02 | Browse Sessions      | ✅ PASS |                    |
| GUEST-03 | View Session Details | ❌ FAIL | Button not visible |

### Summary
- Passed: X/55
- Failed: X/55
- Blocked: X/55

### Issues Found
1. [GUEST-03] Registration button not visible on mobile viewport
```
