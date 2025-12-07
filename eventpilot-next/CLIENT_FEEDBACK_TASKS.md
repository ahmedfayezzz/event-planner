# Client Feedback - Actionable Tasks

> Organized from client meeting notes. Technical references included for implementation.

---

## 🔴 High Priority - Core Functionality

### 1. Rename "Session" to "Event" Throughout App
- **Scope**: Database schema, API routes, UI labels, URLs
- **Files affected**:
  - `prisma/schema.prisma` - Model name (consider keeping as is, just change UI labels)
  - All `src/server/api/routers/*.ts` - API naming
  - All `src/app/**/*.tsx` - UI labels
  - URL routes: `/session/` → `/event/`
- **Note**: May keep internal naming as "session" and only change user-facing labels

### 2. Registration Flow Improvements

#### 2.1 "Register as Member" vs "Guest" Clarity
- **Current**: Guest registration at `/session/[id]/guest-register/page.tsx`
- **Change**: Rename "التسجيل" button and label to "الانضمام كعضو" (Join as Member)
- **Files**:
  - `src/app/session/[id]/page.tsx`
  - `src/app/register/page.tsx`

#### 2.2 Existing Users → Navigate to Registration Form
- **Issue**: Existing logged-in users should be redirected to session registration, not account creation
- **Files**:
  - `src/app/session/[id]/page.tsx` - Add check for authenticated user
  - `src/app/register/page.tsx` - Redirect if already logged in

#### 2.3 Allow Users to Edit Their Registration
- **New Feature**: Add edit registration page/modal
- **Files to create**: `src/app/user/registrations/[id]/edit/page.tsx`
- **API**: Add `registration.update` mutation in `src/server/api/routers/registration.ts`

### 3. Companion Details - Make Mandatory (Except Email)
- **Current**: `src/app/session/[id]/guest-register/page.tsx` - companion fields
- **Change**: Make name, phone required; email optional
- **Files**:
  - `src/server/api/routers/registration.ts` - Update Zod schema
  - `src/server/api/routers/companion.ts` - Update validation
  - Registration form components

---

## 🟡 Medium Priority - Configurability

### 4. Dynamic Session Settings (Admin Configurable)

#### 4.1 Social Media Fields - Optional & Configurable ✅ CLARIFIED
- **Current**: Always shown in registration forms
- **Change**: Add to Session model: `showSocialMediaFields: Boolean @default(true)`
- **Scope**: This applies to SESSION REGISTRATION FORMS only (not website footer/email)
- **Files**:
  - `prisma/schema.prisma` - Add field to Session model
  - `src/app/admin/sessions/[id]/page.tsx` - Add toggle in session settings
  - Registration forms - Conditionally render social fields

#### 4.2 Registration Purpose - Dynamic/Configurable
- **Current**: Static field in registration
- **Change**: Admin can define custom purposes per session
- **Schema**: Add `registrationPurposes: String[]` to Session model
- **UI**: Multi-select or text input in admin session settings

#### 4.3 Professional Info - Make Mandatory
- **Current**: `src/app/register/page.tsx` - company/position fields
- **Change**: Add validation to require these fields
- **Files**:
  - `src/server/api/routers/auth.ts` - Update register schema
  - Registration form validation

#### 4.4 Guest Profile Display - Dynamic Based on Session Settings
- **Current**: `showGuestProfile` exists in Session model
- **Verify**: Ensure all guest displays respect this setting
- **Files**: Check `src/app/session/[id]/page.tsx`, event pages

#### 4.5 Attendee Count Display - Dynamic
- **Current**: `showParticipantCount` exists in Session model
- **Verify**: Ensure implementation is complete across all views

### 5. Hosting Feature Enhancements

#### 5.1 Update Hosting Message
- **Current text**: "هل تريد تقديم الضيافة؟"
- **New text**: "هل تريد تقديم الضيافة في أحد لقاءاتنا القادمة؟"
- **Add note**: "سوف يتم التواصل معكم لتحديد الاحتياج"
- **Files**:
  - `src/app/register/page.tsx`
  - `src/app/session/[id]/guest-register/page.tsx`

#### 5.2 Link Events to Hosts (Catering Management)
- **New Feature**: Create Event-Host relationship
- **Schema changes**:
  ```prisma
  model EventCatering {
    id          String   @id @default(cuid())
    sessionId   String
    session     Session  @relation(fields: [sessionId], references: [id])
    hostId      String?
    host        User?    @relation(fields: [hostId], references: [id])
    hostingType String   // dinner, beverage, dessert, other
    isSelfCatering Boolean @default(false)
    notes       String?
    createdAt   DateTime @default(now())
  }
  ```
- **Admin UI**: New page at `src/app/admin/sessions/[id]/catering/page.tsx`

#### 5.3 Add Host Manually in Admin
- **Files**: `src/app/admin/hosts/page.tsx` - Add "إضافة مضيف" button
- **API**: Add `admin.createHost` mutation

#### 5.4 WhatsApp Message to Hosts
- **Files**: `src/app/admin/hosts/page.tsx` - Add WhatsApp action column
- **Similar to**: Existing WhatsApp implementation in attendees

---

## 🟢 UI/UX Improvements

### 6. Display & Ordering

#### 6.1 all pages,tables - ASC by Date
- **Current**: `orderBy: { date: "desc" }` in `src/server/api/routers/session.ts`
- **Change**: For public views, use `orderBy: { date: "asc" }`
- **Keep DESC**: For admin views (recent first)

#### 6.2 Registrations Order
- **Verify**: Ensure registrations display in consistent order
- **Files**: `src/server/api/routers/admin.ts` - `getSessionRegistrations`

#### 6.3 Change "نبذة عن الجلسة" to "الوصف"
- **Files**: Search and replace in:
  - `src/app/session/[id]/page.tsx`
  - `src/app/admin/sessions/*/page.tsx`
  - Any other session display components

### 7. Mobile-Friendly Tables (Expandable)
- **Current**: Standard tables in admin views
- **Change**: Implement responsive/expandable table pattern
- **Files affected**:
  - `src/app/admin/sessions/[id]/attendees/page.tsx`
  - `src/app/admin/users/page.tsx`
  - `src/app/admin/hosts/page.tsx`
- **Implementation**: Use collapsible rows or card view on mobile

### 8. Attendees Table Enhancements

#### 8.1 Filter by Status
- **Files**: `src/app/admin/sessions/[id]/attendees/page.tsx`
- **Add**: Dropdown filter for approval status (approved/pending/all)

#### 8.2 Bulk Selection with Checkboxes
- **Files**: `src/app/admin/sessions/[id]/attendees/page.tsx`
- **Add**: Checkbox column, select all, bulk actions (approve, send message, export)

#### 8.3 WhatsApp Confirmation Message Option
- **New Feature**: Send confirmation via WhatsApp
- **Files**:
  - `src/app/admin/sessions/[id]/attendees/page.tsx`
  - Create WhatsApp message template function

---

## 🔵 New Features

### 9. Location Link for Sessions
- **Current**: `location: String?` in Session model
- **Add**: `locationUrl: String?` for Google Maps/directions link
- **Files**:
  - `prisma/schema.prisma`
  - `src/app/admin/sessions/new/page.tsx` - Add input field
  - `src/app/session/[id]/page.tsx` - Render as clickable link
  - include in confirmation email and all session display areas

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
- **Change**: Multi-number input with country code selector
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

### 12. User Labels/Groups
- **New Feature**: Tag users with custom labels
- **Schema**:
  ```prisma
  model UserLabel {
    id    String @id @default(cuid())
    name  String @unique
    color String?
    users User[]
  }
  ```
- **Admin UI**: Label management + user tagging

### 13. Admin Roles (Dynamic Permissions)
- **Current**: Simple ADMIN/USER role in User model
- **Change**: Granular permissions based on menu items
- **Options**:
  1. Role-based (Admin, Moderator, Viewer)
  2. Permission-based (can_manage_sessions, can_view_analytics, etc.)
- **Files**: Auth middleware, admin layout sidebar

### 14. User Profile in Admin
- **New Page**: `src/app/admin/users/[id]/page.tsx`
- **Content**: Full user details, registration history, attendance record, labels

### 15. Analytics - Search All Users (Guest + Members)
- **Current**: `src/server/api/routers/admin.ts` - `getAnalytics`
- **Add**: Combined search across users and guest registrations
- **Files**: Analytics page, admin router

---

## 🎨 Design & Branding

### 16. QR Code Image Design ✅ CLARIFIED
- **Current**: Basic QR code generation in `src/lib/qr.ts`
- **Change**: Design a branded image template and embed QR code inside it
- **Implementation**:
  1. Create branded image template (with logo, borders, event branding)
  2. Generate QR code
  3. Composite QR code into the designated area of the template
- **Technical approach**: Use canvas or image manipulation library (sharp, jimp, or canvas)
- **Client to provide**: Design template/mockup for the branded frame

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

---

## ❌ Confirmed NOT Implementing

- Public user profiles showing registered sessions - **Client said NO**

---

## 📋 Task Priority Summary

| Priority        | Count | Focus Area                            |
|-----------------|-------|---------------------------------------|
| 🔴 High         | 3     | Core functionality, registration flow |
| 🟡 Medium       | 5     | Configurability, hosting features     |
| 🟢 UI/UX        | 8     | Tables, display, mobile               |
| 🔵 New Features | 7     | New capabilities                      |
| 🎨 Design       | 3     | Branding, visual                      |

---

## Next Steps

1. ~~Get clarification on conflicting items (social media: configurable vs remove)~~ ✅ DONE - Separate concerns
2. ~~Get QR code design from client~~ ✅ CLARIFIED - Need branded template design from client
3. Get actual contact info for footer/emails - **PENDING**
4. ~~Decide WhatsApp link type preference~~ ✅ DONE - Give users choice between both
5. Prioritize within each category based on client needs
