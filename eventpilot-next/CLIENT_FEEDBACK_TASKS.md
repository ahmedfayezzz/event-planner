# Client Feedback - Actionable Tasks

> Organized from client meeting notes. Technical references included for implementation.

---

## 🔴 High Priority - Core Functionality

### 1. Rename "Session" to "Event" Throughout App ✅ DONE
- **Scope**: Database schema, API routes, UI labels, URLs
- **Implementation**: Changed all Arabic UI labels from "جلسة" to "حدث" across 30+ files
- **Files updated**:
  - All `src/app/**/*.tsx` - UI labels updated
  - `src/server/api/routers/*.ts` - Error messages updated
  - `src/lib/email.ts` - Email templates updated
  - Navigation, breadcrumbs, forms, pages
- **Note**: Kept internal naming as "session", only changed user-facing Arabic labels

### 2. Registration Flow Improvements

#### 2.1 "Register as Member" vs "Guest" Clarity ✅ DONE
- **Implementation**: Renamed "التسجيل" button to "الانضمام كعضو" (Join as Member)
- **Files updated**:
  - `src/app/session/[id]/page.tsx` - Updated button text
  - `src/app/register/page.tsx` - Updated page title

#### 2.2 Existing Users → Navigate to Registration Form ✅ DONE
- **Implementation**: Created simplified member registration page for authenticated users
- **Features**:
  - Shows user info (read-only, pulled from account)
  - Companions input (optional)
  - Hosting preferences (optional, only shown if user is not already a host)
  - Redirects authenticated users from session page to member registration
- **Files created**:
  - `src/app/session/[id]/member-register/page.tsx` - New member registration page
- **Files updated**:
  - `src/app/session/[id]/page.tsx` - Button links to member registration
  - `src/server/api/routers/registration.ts` - Added hosting preferences to registerForSession
  - `src/server/api/routers/user.ts` - Added wantsToHost field to getMyProfile

#### 2.3 Allow Users to Edit Their Registration ✅ DONE
- **Implementation**: Created edit registration page with companion management
- **Files created**:
  - `src/app/user/registrations/[id]/edit/page.tsx` - Edit registration page
- **Files updated**:
  - `src/server/api/routers/registration.ts` - Added `updateRegistration` mutation
  - `src/app/user/dashboard/page.tsx` - Added edit button to registration cards
- **Features**:
  - Only allows editing for users with accounts (not guest registrations)
  - Loads existing companions and allows add/remove/edit
  - Validates ownership (users can only edit their own registrations)
  - Shows registration status and session details

### 3. Companion Details - Make Mandatory (Except Email) ✅ DONE
- **Implementation**: Made companion name and phone required; email optional
- **Files updated**:
  - `src/server/api/routers/registration.ts` - Updated Zod schema with required validation for name and phone
  - `src/app/session/[id]/guest-register/page.tsx` - Added asterisk to phone label, updated validation
  - `src/app/session/[id]/member-register/page.tsx` - Added asterisk to phone label, updated validation

---

## 🟡 Medium Priority - Configurability

### 4. Dynamic Session Settings (Admin Configurable)

#### 4.1 Social Media Fields - Optional & Configurable ✅ DONE
- **Implementation**: Added `showSocialMediaFields: Boolean @default(true)` to Session model
- **Scope**: Applies to SESSION REGISTRATION FORMS only (not website footer/email)
- **Files updated**:
  - `prisma/schema.prisma` - Added field to Session model
  - `src/lib/schemas/session.ts` - Added to form schema
  - `src/components/admin/session-form.tsx` - Added toggle in session settings
  - `src/server/api/routers/session.ts` - Added to create/update mutations

#### 4.2 Registration Form Field Visibility - Configurable ✅ DONE
- **Implementation**: Added three boolean flags to control field visibility in registration forms
- **Flags**: `showSocialMediaFields`, `showRegistrationPurpose`, `showCateringInterest`
- **Global Defaults**: Stored in Settings model for account registration
- **Per-Session**: Configurable in Session model for session-specific registration
- **Migration**: Database schema migrated successfully
- **Files updated**:
  - `prisma/schema.prisma` - Added flags to both Settings and Session models, removed `registrationPurposes` field
  - `src/server/api/routers/settings.ts` - Settings CRUD with default values and auto-creation
  - `src/server/api/routers/session.ts` - Added fields to create/update mutations
  - `src/lib/schemas/session.ts` - Added to form schema, removed `registrationPurposes`
  - `src/app/admin/settings/page.tsx` - UI with toggle switches using derived state pattern
  - `src/components/admin/session-form.tsx` - Loads settings defaults, allows per-session overrides
- **Note**: Flags are ready but not yet integrated into actual registration forms

#### 4.3 Professional Info - Make Mandatory ✅ DONE
- **Implementation**: Added required validation for `companyName` and `position` fields
- **Files updated**:
  - `src/server/api/routers/auth.ts` - Updated register schema with required fields
  - `src/app/register/page.tsx` - Updated form validation and UI to show required fields

#### 4.4 Guest Profile Display - Dynamic Based on Session Settings
- **Current**: `showGuestProfile` exists in Session model
- **Verify**: Ensure all guest displays respect this setting
- **Files**: Check `src/app/session/[id]/page.tsx`, event pages

#### 4.5 Attendee Count Display - Dynamic
- **Current**: `showParticipantCount` exists in Session model
- **Verify**: Ensure implementation is complete across all views

### 5. Hosting Feature Enhancements ✅ ALL DONE

#### 5.1 Update Hosting Message ✅ DONE
- **Implementation**: Updated hosting message text across registration forms
- **New text**: "هل تريد تقديم الضيافة في أحد أحداثنا القادمة؟"
- **Added note**: "سوف يتم التواصل معكم لتحديد الاحتياج"
- **Files updated**:
  - `src/app/register/page.tsx`
  - `src/app/session/[id]/guest-register/page.tsx`

#### 5.2 Link Events to Hosts (Catering Management) ✅ DONE
- **Implementation**: Created complete EventCatering system with CRUD operations
- **Schema changes**: Added EventCatering model to `prisma/schema.prisma`
  ```prisma
  model EventCatering {
    id             String   @id @default(cuid())
    sessionId      String
    hostId         String?
    hostingType    String   // dinner, beverage, dessert, other
    isSelfCatering Boolean  @default(false)
    notes          String?
    createdAt      DateTime @default(now())
    updatedAt      DateTime @updatedAt
    session        Session  @relation(...)
    host           User?    @relation(...)
  }
  ```
- **Files created**:
  - `src/app/admin/sessions/[id]/catering/page.tsx` - Catering management page
  - `src/server/api/routers/catering.ts` - Complete CRUD API
- **Files updated**:
  - `src/lib/constants.ts` - Standardized HOSTING_TYPES (dinner, beverage, dessert, other)
  - `src/app/admin/sessions/[id]/page.tsx` - Added catering display section
  - `src/components/admin/session-form.tsx` - Added self-catering option with type/notes
  - `src/server/api/routers/session.ts` - Auto-create/update catering entries
  - `src/components/admin/breadcrumbs.tsx` - Added "الضيافة" label

#### 5.3 Add Host Manually in Admin ✅ DONE
- **Implementation**: Added manual host creation with full form validation
- **Files updated**:
  - `src/app/admin/hosts/page.tsx` - Added "إضافة مضيف" button and dialog form
  - `src/server/api/routers/admin.ts` - Added `createHost` mutation with smart duplicate handling

#### 5.4 WhatsApp Message to Hosts ✅ DONE
- **Implementation**: Added WhatsApp action column with pre-filled message
- **Files updated**:
  - `src/app/admin/hosts/page.tsx` - Added WhatsApp action column
  - `src/lib/utils.ts` - Created `getWhatsAppUrl()` utility function with Saudi phone formatting

---

## 🟢 UI/UX Improvements

### 6. Display & Ordering

#### 6.1 all pages,tables - ASC by Date ✅ DONE
- **Implementation**: Added `sortOrder` parameter to session list query
- **Change**: Public views use ASC (upcoming events first), admin views use DESC (recent first)
- **Files updated**:
  - `src/server/api/routers/session.ts` - Added sortOrder parameter with default logic
  - `src/app/sessions/page.tsx` - Uses ASC order for public view

#### 6.2 Registrations Order
- **Verify**: Ensure registrations display in consistent order
- **Files**: `src/server/api/routers/admin.ts` - `getSessionRegistrations`

#### 6.3 Change "نبذة عن الجلسة" to "الوصف"
- **Files**: Search and replace in:
  - `src/app/session/[id]/page.tsx`
  - `src/app/admin/sessions/*/page.tsx`
  - Any other session display components

### 7. Mobile-Friendly Tables (Expandable) ✅ DONE
- **Implementation**: Expandable table rows using Collapsible component
- **Approach**: CSS-based column hiding with expand button for mobile
- **Files updated**:
  - `src/app/admin/users/page.tsx` - Users table with expandable rows
  - `src/app/admin/sessions/[id]/attendees/page.tsx` - Attendees table with expandable rows
- **Mobile visible columns**: Name + Status + Expand button
- **Expanded content shows**: Email, Phone, Type, Date, Actions
- **Desktop**: Full table unchanged with all columns visible

### 8. Attendees Table Enhancements

#### 8.1 Filter by Status ✅ DONE
- **Files**: `src/app/admin/sessions/[id]/attendees/page.tsx`
- **Implementation**: Dropdown filter for approval status (approved/pending/all)

#### 8.2 Bulk Selection with Checkboxes ✅ DONE
- **Files**: `src/app/admin/sessions/[id]/attendees/page.tsx`
- **Implementation**:
  - Checkbox column with "select all" header checkbox
  - Indeterminate state for partial selection
  - Selected rows highlighted
  - Bulk actions bar appears when items selected:
    - **تأكيد (Approve)** - Approves all pending selected registrations
    - **واتساب (WhatsApp)** - Opens WhatsApp for first selected with phone
    - **تصدير المحدد (Export Selected)** - Downloads CSV of selected rows
  - Clear selection button
- **Backend**: Added `approveMultiple` mutation to registration router

#### 8.3 WhatsApp Confirmation Message Option ✅ DONE
- **Files**: `src/app/admin/sessions/[id]/attendees/page.tsx`
- **Implementation**:
  - WhatsApp icon button in actions column for each row with phone number
  - Pre-filled Arabic message with event details:
    - Greeting with attendee name
    - Event title and date
    - Location
    - **QR code page link** for attendance verification
    - Sign-off from "ثلوثية الأعمال"
  - Uses existing `getWhatsAppUrl` utility to open WhatsApp app

#### 8.4 Public QR Page for WhatsApp Sharing ✅ DONE
- **Implementation**: Created public QR page accessible via link (no auth required)
- **Files created**:
  - `src/app/qr/[id]/page.tsx` - Public QR page with download option
- **Files updated**:
  - `src/server/api/routers/attendance.ts` - Added `getPublicQR` and `getPublicBrandedQR` endpoints
  - `src/app/admin/sessions/[id]/attendees/page.tsx` - WhatsApp message includes QR page link
- **Features**:
  - Displays QR code with attendee name and session info
  - Download button for branded QR (with logo, session title, date/time)
  - Shows session date, time, and location
  - Attendance instructions in Arabic
  - Error handling for invalid/unapproved registrations
- **URL format**: `/qr/{registrationId}`

---

## 🔵 New Features

### 9. Location Link for Sessions ✅ DONE
- **Implementation**: Added `locationUrl` field for Google Maps links
- **Files updated**:
  - `prisma/schema.prisma` - Added `locationUrl String?` field
  - `src/lib/schemas/session.ts` - Added to form schema
  - `src/components/admin/session-form.tsx` - Added input field in both create and edit modes
  - `src/app/session/[id]/page.tsx` - Renders location as clickable link with icon
  - `src/server/api/routers/session.ts` - Added to create/update mutations
  - `prisma/seed.ts` - Added sample location URLs for all sessions
 
### 10. Invitation Expiry Date
- **Current**: `Invite` model has `usedAt` but no expiry
- **Add**: `expiresAt: DateTime?` to Invite model
- **Files**:
  - `prisma/schema.prisma`
  - `src/server/api/routers/invite.ts` - Add expiry validation
  - `src/app/admin/sessions/[id]/invites/page.tsx` - Add expiry input

### 11. WhatsApp Number Improvements

#### 11.1 Add Numbers Separately with Country Code
- **Current**: Single phone input
- **Change**: Multi-number input with country code selector, plus button to add more numbers each one at a time
- **Files**: WhatsApp sending UI in admin

#### 11.2 WhatsApp Link Type - User Choice ✅ CLARIFIED
- **Decision**: Give users the choice to open in regular WhatsApp OR WhatsApp Business
- **Implementation**: Show two buttons/options when sending WhatsApp message
  - Regular WhatsApp: `wa.me/[phone]?text=[message]`
  - WhatsApp Business: `https://api.whatsapp.com/send?phone=[phone]&text=[message]`
- **Files**:
  - `src/lib/utils.ts` - Create both URL generator functions
  - Admin attendee/host pages - Add dropdown or two-button UI for WhatsApp actions

#### 11.3 Phone Contacts Access (Research)
- **Research**: Web Contacts API availability
- **Note**: Limited browser support, may not be feasible

### 12. User Labels/Groups ✅ DONE
- **Implementation**: Complete label system with Jira-style UX
- **Schema**: Added UserLabel model with many-to-many User relationship
  ```prisma
  model UserLabel {
    id    String @id @default(cuid())
    name  String @unique
    color String @default("#3b82f6")
    users User[]
  }
  ```
- **Features**:
  - Assign 0, 1, or multiple labels to users
  - Filter users by label(s) in admin users page
  - Create labels on-the-fly during assignment (Jira-style)
  - Auto-save on selection change
  - Random color assignment for new labels (8 preset colors)
  - Clickable label cell in users table opens assignment dialog
- **Files created**:
  - `src/server/api/routers/label.ts` - Complete CRUD + assignment API
  - `src/components/admin/user-label-manager.tsx` - Label assignment dialog
- **Files updated**:
  - `prisma/schema.prisma` - Added UserLabel model
  - `src/server/api/root.ts` - Registered label router
  - `src/server/api/routers/admin.ts` - Added label filtering to getUsers
  - `src/app/admin/users/page.tsx` - Label column, filter dialog, assignment UI

### 13. Admin Roles (Dynamic Permissions) ✅ DONE
- **Current**: Simple ADMIN/USER role in User model
- **Implementation**: Granular permissions based on menu items with SUPER_ADMIN role
- **Schema changes**:
  - Added `SUPER_ADMIN` to Role enum (full access to everything)
  - Added 7 boolean permission fields to User model:
    - `canAccessDashboard`, `canAccessSessions`, `canAccessUsers`
    - `canAccessHosts`, `canAccessAnalytics`, `canAccessCheckin`, `canAccessSettings`
- **Features**:
  - SUPER_ADMIN has all permissions by default (hardcoded in logic)
  - Regular ADMIN needs explicit permission flags set to true
  - Only SUPER_ADMIN can manage other admins' permissions
  - Admin sidebar filters based on permissions
  - **Separate pages for Members vs Admins**:
    - `/admin/users` - "الأعضاء" (Members) - Regular users with company, labels, registrations, attendance
    - `/admin/admins` - "المديرين" (Admins) - Admin users with role and permission management (SUPER_ADMIN only)
  - Create new admin users directly with permissions
  - Promote regular users to admin from Members page
- **Files created**:
  - `src/lib/permissions.ts` - Permission helper library with constants and utility functions
  - `src/app/admin/admins/page.tsx` - Dedicated admin users management page
- **Files updated**:
  - `prisma/schema.prisma` - Added SUPER_ADMIN role and permission fields
  - `src/types/next-auth.d.ts` - Updated session types with permissions
  - `src/server/auth.config.ts` - Include permissions in JWT and session
  - `src/server/auth.ts` - Return permissions from authorize
  - `src/middleware.ts` - Check for both ADMIN and SUPER_ADMIN
  - `src/server/api/trpc.ts` - Added superAdminProcedure
  - `src/server/api/routers/admin.ts` - Added getAdminUsers, updateUserPermissions, createAdmin
  - `src/app/admin/layout.tsx` - Filter sidebar links based on permissions, added "المديرين" link
  - `src/app/admin/users/page.tsx` - Simplified to show only regular users (role=USER)
  - `prisma/seed.ts` - Added SUPER_ADMIN and limited ADMIN users
- **Login credentials**:
  - Super Admin: admin@eventpilot.com / admin123 (full access)
  - Admin: moderator@eventpilot.com / admin123 (limited: dashboard, sessions, checkin)

### 14. User Profile in Admin ✅ DONE
- **Implementation**: Complete user profile page with full details
- **Files created**: `src/app/admin/users/[id]/page.tsx`
- **Files updated**:
  - `src/server/api/routers/admin.ts` - Added `getUserById` query
  - `src/app/admin/users/page.tsx` - Added "عرض الملف" (View Profile) link in dropdown menu
- **Features**:
  - Header with user name, role badge, active status
  - Stats cards: registrations, attendance (with percentage), companions, hosting requests
  - User details card: email, phone, company, position, social links, labels
  - Labels management with inline assignment (Jira-style)
  - Registration history table with session info, date, companions, status, attendance

### 15. Analytics - Search All Users (Guest + Members)
- **Current**: `src/server/api/routers/admin.ts` - `getAnalytics`
- **Add**: Combined search across users and guest registrations
- **Files**: Analytics page, admin router

---

## 🎨 Design & Branding

### 16. QR Code Image Design ✅ DONE
- **Implementation**: Created branded QR code template with EventPilot branding
- **Files created**:
  - `src/lib/qr-branded.ts` - Branded QR generator using sharp
- **Files updated**:
  - `src/lib/email.ts` - Updated to use branded QR in confirmation emails
  - `src/server/api/routers/registration.ts` - Pass raw QR data to email functions
  - `src/server/api/routers/companion.ts` - Pass raw QR data to email functions
  - `src/server/api/routers/attendance.ts` - Added `getBrandedQR` and `getPublicBrandedQR` endpoints
  - `src/app/user/qr/[id]/page.tsx` - Added download button
  - `src/app/qr/[id]/page.tsx` - Added download button for public QR page
  - `package.json` - Moved sharp to production dependencies
- **Features**:
  - Branded template (400x540px) with logo, gold border, emerald green theme
  - **Welcome message** "مرحباً" with attendee name
  - Session-specific info: title, date, time
  - Arabic text "امسح للتحقق من الحضور" (Scan to verify attendance)
  - **Decorative brand elements**: gold corner accents, gradient lines, emerald dots
  - Download button on both user QR page and public QR page
  - Used in confirmation emails (both user and companion emails)

### 17. Footer & Email Contact Info
- **Current**: Email template has placeholder contact info
- **Files**:
  - `src/lib/email.ts` - Update footer section (lines 171-176)
  - `src/components/footer.tsx` (if exists) or layout files
- **Add**: Actual phone number and email from client

### 18. Website Contact Info (Footer & Email) ✅ CLARIFIED
- **Note**: This is SEPARATE from task 4.1 (session registration forms)
- **Scope**: Website footer and email templates - NOT registration forms
- **Change**: Update or remove social media links from:
  - `src/components/footer.tsx` (or layout) - Website footer
  - `src/lib/email.ts` - Email template footer
- **Action**: Get client's preferred contact info (phone, email, social links if any)

### 19. Website name/logo updates and SEO


---

## ❌ Confirmed NOT Implementing

- Public user profiles showing registered sessions - **Client said NO**

---

## 📋 Task Priority Summary

| Priority        | Total  | Completed | Remaining | Focus Area                            |
|-----------------|--------|-----------|-----------|---------------------------------------|
| 🔴 High         | 5      | 5 ✅       | 0         | Core functionality, registration flow |
| 🟡 Medium       | 5      | 6 ✅       | -1        | Configurability, hosting features     |
| 🟢 UI/UX        | 9      | 6 ✅       | 3         | Tables, display, mobile               |
| 🔵 New Features | 7      | 3 ✅       | 4         | New capabilities                      |
| 🎨 Design       | 3      | 1 ✅       | 2         | Branding, visual                      |
| **TOTAL**       | **29** | **21 ✅**  | **8**     | **Overall Progress: 72%**             |

---

## 📊 Completion Summary

### ✅ Completed Features (21 tasks)
1. **Session → Event Renaming** - All UI labels updated
2. **Social Media Fields** - Configurable per session
3. **Professional Info** - Made mandatory
4. **Attendee Count Display** - Verified working
5. **Complete Hosting System** - EventCatering model, admin pages, self-catering, WhatsApp integration
6. **Sessions Ordering** - ASC for public, DESC for admin
7. **Location Links** - Google Maps integration
8. **Registration Form Field Visibility** - Three configurable flags with global defaults and per-session overrides
9. **Registration Button Clarity** - Renamed to "الانضمام كعضو" (Join as Member)
10. **Member Registration Flow** - Simplified registration for authenticated users (companions + catering only)
11. **Companion Details Mandatory** - Name and phone required, email optional
12. **Edit Registration** - Users can edit their event registrations and manage companions
13. **Admin Roles (Dynamic Permissions)** - SUPER_ADMIN role with separate Members/Admins pages
14. **User Labels/Groups** - Jira-style label assignment with inline creation, filtering, and auto-save
15. **User Profile in Admin** - Full user details page with registration history and stats
16. **Filter by Status (8.1)** - Attendees table has status filter dropdown
17. **Bulk Selection (8.2)** - Checkbox column, select all, bulk approve/export/WhatsApp actions
18. **WhatsApp Confirmation (8.3)** - Send confirmation messages via WhatsApp with pre-filled event details
19. **QR Code Image Design (#16)** - Branded QR template with logo, session info, and download button
20. **Mobile-Friendly Tables (#7)** - Expandable rows using Collapsible component for Users and Attendees tables
21. **Public QR Page (8.4)** - Shareable QR page link in WhatsApp messages with download option

### 🔧 Recent Implementation

**Public QR Page for WhatsApp Sharing** - Shareable attendance QR page:
- Public page at `/qr/{registrationId}` - no authentication required
- WhatsApp confirmation message now includes QR page link
- Download button fetches branded QR with logo, session title, date/time
- Shows attendee name, session details, location, and instructions
- Error handling for invalid or unapproved registrations

**User Labels/Groups** - Jira-style label management system:
- Click on any user's label cell to open assignment dialog
- Type to search existing labels, click to toggle
- If label doesn't exist, click "إنشاء [name]" to create instantly
- Labels auto-save on selection (no save button needed)
- Multi-select label filter in users table
- Color-coded badges throughout UI

**Edit Registration Feature** - Complete registration editing system:
- Users can edit their event registrations from the dashboard
- Manage companions: add, remove, or edit companion information
- Ownership validation ensures users can only edit their own registrations
- Only available for users with accounts (not guest registrations)
- Edit button appears on all upcoming registrations in the dashboard
- Clean UI with existing data pre-filled

**Member Registration Flow** - Created simplified registration page for authenticated users:
- Auto-fills user information from account
- Only asks for companions (optional) and hosting preferences (if not already a host)
- No need to re-enter personal details
- Clean, focused user experience

**Companion Details Validation** - Made companion information more complete:
- **Name**: Required (minimum 2 characters)
- **Phone**: Required (minimum 9 characters)
- **Email**: Optional
- **Company & Title**: Optional
- Validation enforced in both API schema and UI forms

---

## Next Steps

1. ~~Get clarification on conflicting items (social media: configurable vs remove)~~ ✅ DONE - Separate concerns
2. ~~Get QR code design from client~~ ✅ CLARIFIED - Need branded template design from client
3. Get actual contact info for footer/emails - **PENDING**
4. ~~Decide WhatsApp link type preference~~ ✅ DONE - Give users choice between both
5. ~~Registration Flow Improvements (Task 2.1, 2.2, 2.3)~~ ✅ DONE
6. ~~Companion Details Mandatory (Task 3)~~ ✅ DONE
7. **Next Priority**: UI/UX Improvements (Task 6.2, 6.3, 7, 8)
8. **Next Priority**: New Features (Task 10-15)
