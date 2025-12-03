# EventPilot Migration Tasks: Flask → Next.js

## Progress Legend
- [ ] Not started
- [~] In progress
- [x] Completed

---

## Phase 1: Project Setup [COMPLETED]
- [x] Create Next.js app with `create-next-app`
- [x] Install tRPC v11 + TanStack Query + Zod
- [x] Install NextAuth v5 + Prisma 6.18.0
- [x] Initialize Prisma with SQLite
- [x] Set up shadcn/ui
- [x] Configure RTL support + Cairo Arabic font
- [x] Set up tRPC context with NextAuth session
- [x] Create Prisma schema (6 models)
- [x] Verify build passes

---

## Phase 2: tRPC Routers [COMPLETED]

### 2.1 Auth Router (`src/server/api/routers/auth.ts`)
- [x] `register` - Create user account with validation
  - Generate unique username from name
  - Hash password with bcrypt
  - Link previous guest registrations by email/phone
- [x] `login` - Email + password login (handled by NextAuth)
- [x] `forgotPassword` - Generate reset token, send email
- [x] `resetPassword` - Validate token, update password
- [x] `changePassword` - For logged-in users
- [x] `validateResetToken` - Validate reset token before showing form

### 2.2 User Router (`src/server/api/routers/user.ts`)
- [x] `getProfile` - Get user profile by username (public)
- [x] `getMyProfile` - Get current user's profile (protected)
- [x] `updateProfile` - Update user profile fields
- [x] `getDashboard` - Get user dashboard data with registrations
- [x] `checkUsername` - Check if username is available

### 2.3 Session Router (`src/server/api/routers/session.ts`)
- [x] `list` - List all sessions (with filters)
- [x] `getUpcoming` - Get upcoming open sessions
- [x] `getById` - Get session by ID
- [x] `getBySlug` - Get session by slug
- [x] `create` - Create new session (admin)
- [x] `update` - Update session (admin)
- [x] `getCountdown` - Get countdown data for session
- [x] `getEmbedCode` - Generate embed iframe code (admin)
- [x] `checkRegistration` - Check if user is registered for session

### 2.4 Registration Router (`src/server/api/routers/registration.ts`)
- [x] `registerForSession` - Register logged-in user for session
- [x] `guestRegister` - Guest registration (no account)
- [x] `getMyRegistrations` - Get user's registrations
- [x] `getSessionRegistrations` - Get all registrations for session (admin)
- [x] `approve` - Approve single registration (admin)
- [x] `approveAll` - Bulk approve registrations (admin)
- [x] `getConfirmation` - Get registration confirmation data

### 2.5 Companion Router (`src/server/api/routers/companion.ts`)
- [x] `add` - Add companion to registration
- [x] `list` - List companions for a registration
- [x] `getSessionCompanions` - Get all companions for session (admin)
- [x] `sendInvite` - Send email invite to companion
- [x] `remove` - Remove companion from registration

### 2.6 Attendance Router (`src/server/api/routers/attendance.ts`)
- [x] `markAttendance` - Mark user attended (admin)
- [x] `markAttendanceQR` - Mark attendance via QR scan (admin)
- [x] `getSessionAttendance` - Get attendance for session (admin)
- [x] `getMyQR` - Get user's QR code for session

### 2.7 Invitation Router (`src/server/api/routers/invitation.ts`)
- [x] `getUsersForInvite` - Get users available for invitation (admin)
- [x] `sendInvites` - Send email invitations (admin)
- [x] `generateWhatsAppLinks` - Generate WhatsApp invite links (admin)
- [x] `getSessionInvites` - Get all invites for session (admin)
- [x] `validateToken` - Validate invitation token
- [x] `resendInvite` - Resend invitation email (admin)
- [x] `deleteInvite` - Delete invitation (admin)

### 2.8 Admin Router (`src/server/api/routers/admin.ts`)
- [x] `getDashboard` - Get admin dashboard stats
- [x] `exportUsers` - Export users to CSV
- [x] `exportSessionRegistrations` - Export session registrations to CSV
- [x] `getSessionQR` - Get session QR code for check-in
- [x] `getUsers` - Get all users with pagination and filters
- [x] `toggleUserActive` - Toggle user active status
- [x] `updateUserRole` - Update user role

---

## Phase 3: Utility Functions (`src/lib/`) [COMPLETED]

### 3.1 Email Utilities (`src/lib/email.ts`)
- [x] `sendEmail` - Base email sending with Resend
- [x] `sendConfirmationEmail` - Registration confirmation
- [x] `sendPendingEmail` - Registration pending approval
- [x] `sendConfirmedEmail` - Registration confirmed with QR
- [x] `sendCompanionEmail` - Companion notification
- [x] `sendPasswordResetEmail` - Password reset link
- [x] `sendInvitationEmail` - Session invitation

### 3.2 QR Utilities (`src/lib/qr.ts`)
- [x] `generateQRCode` - Generate QR code as base64
- [x] `generateQRCodeBuffer` - Generate QR code as Buffer
- [x] `createQRCheckInData` - Generate QR data string for check-in
- [x] `parseQRData` - Parse QR code data for check-in
- [x] `generateSessionCode` - Generate unique session code

### 3.3 Validation Utilities (`src/lib/validation.ts`)
- [x] `generateUsername` - Generate unique username from name
- [x] `formatPhoneNumber` - Format to Saudi +966 format
- [x] `validateEmail` - Email format validation
- [x] `validateSocialMediaUrl` - Validate Instagram/Snapchat/Twitter URLs
- [x] `validateSaudiPhone` - Validate Saudi phone number
- [x] `validatePassword` - Validate password strength
- [x] `isEmailTaken` - Check if email is already registered
- [x] `isPhoneTaken` - Check if phone is already registered
- [x] `isUsernameTaken` - Check if username is taken

### 3.4 Misc Utilities (`src/lib/utils.ts`)
- [x] `generateInviteToken` - Secure random token
- [x] `formatArabicDate` - Format date in Arabic
- [x] `formatArabicTime` - Format time in Arabic
- [x] `formatArabicDateTime` - Format date and time in Arabic
- [x] `sanitizeInput` - Basic XSS prevention
- [x] `calculateAge` - Calculate age from birth date
- [x] `generateSlug` - Generate slug from text
- [x] `exportToCSV` - Export data to CSV format

---

## Phase 4: Pages & UI [COMPLETED]

### 4.1 Public Pages
- [x] `/` - Landing page with countdown + upcoming sessions
- [x] `/register` - User registration form
- [x] `/sessions` - All sessions listing
- [x] `/session/[id]` - Session detail (requires login)
- [x] `/session/[id]/guest-register` - Guest registration form
- [x] `/registration/[id]/confirmation` - Guest registration confirmation
- [x] `/u/[username]` - Public user profile
- [x] `/event/[slug]` - Event page (redirect to registration)
- [x] `/event/[slug]/embed` - Embeddable registration widget

### 4.2 User Pages (Protected)
- [x] `/user/login` - Login form
- [x] `/user/dashboard` - User dashboard
- [x] `/user/forgot-password` - Forgot password form
- [x] `/user/reset-password/[token]` - Reset password form
- [x] `/user/change-password` - Change password form
- [x] `/user/qr/[id]` - User QR code for session

### 4.3 Admin Pages (Admin Role Required)
- [x] `/admin` - Admin dashboard with stats
- [x] `/admin/login` - Admin login (unified with user login)
- [x] `/admin/sessions` - Sessions management (DataTable)
- [x] `/admin/sessions/new` - Create session form
- [x] `/admin/sessions/[id]` - Edit session form
- [x] `/admin/sessions/[id]/attendees` - Attendee management
- [x] `/admin/sessions/[id]/companions` - Companion management
- [x] `/admin/checkin` - Session selector for check-in
- [x] `/admin/checkin/[id]` - QR check-in interface
- [x] `/admin/users` - User management
- [x] `/admin/settings` - System settings

### 4.4 Error Pages
- [x] `/not-found` - 404 page
- [x] `error.tsx` - 500 error page

---

## Phase 5: Components [COMPLETED]

### 5.1 Layout Components
- [x] `Navbar` - Main navigation (RTL, user menu)
- [x] `Footer` - Site footer
- [x] `AdminLayout` - Admin panel layout with sidebar

### 5.2 Form Components
- [x] `RegistrationForm` - User/guest registration (inline in pages)
- [x] `SessionForm` - Create/edit session (admin) (inline in pages)
- [x] `CompanionFields` - Dynamic companion input fields (inline in guest-register page)
- [x] `PhoneInput` - Saudi phone number formatting (handled via validation)

### 5.3 Display Components
- [x] `SessionCard` - Session preview card
- [x] `CountdownTimer` - Countdown to session date (with compact mode)
- [x] `UserProfileCard` - User profile display (inline in /u/[username] page)
- [x] `RegistrationStatus` - Registration status badge (inline)

### 5.4 Admin Components
- [x] `StatsCard` - Dashboard statistics card (inline)
- [x] `DataTable` - Using shadcn Table component
- [x] `QRScanner` - Camera-based QR scanner (@yudiel/react-qr-scanner)
- [x] `QRDisplay` - QR code display component
- [x] `InviteModal` - User selection for invitations (tRPC endpoints ready)
- [x] `WhatsAppLinksModal` - WhatsApp invite links display (tRPC endpoints ready)

---

## Phase 6: Middleware & Auth [COMPLETED]

- [x] `middleware.ts` - Route protection
  - `/admin/*` → requires ADMIN role
  - `/user/*` → requires USER role (except login pages)
- [x] Session refresh logic (JWT strategy with 30 day maxAge)

---

## Phase 7: Testing & Polish [IN PROGRESS]

- [ ] RTL testing across all pages
- [ ] Mobile responsiveness
- [ ] Form validation error messages (Arabic)
- [x] Loading states with Skeleton components
- [x] Toast notifications for success/error (sonner)
- [x] Error pages (404, 500)

---

## Database Seed Script [COMPLETED]

- [x] `prisma/seed.ts` - Create default admin user
  - Email: admin@eventpilot.com
  - Password: admin123 (hashed)
  - Role: ADMIN
- [x] Sample session created
- [x] Sample user created (user@example.com / user123)

---

## Environment Variables

```env
DATABASE_URL=file:./dev.db
AUTH_SECRET=your-secret-key
RESEND_API_KEY=re_xxx
FROM_EMAIL=noreply@yourdomain.com
BASE_URL=http://localhost:3000
```

---

## Files Reference (Flask → Next.js)

| Flask File | Next.js Equivalent |
|------------|-------------------|
| `routes.py` (1614 lines) | `src/server/api/routers/*.ts` |
| `models.py` | `prisma/schema.prisma` |
| `utils.py` (479 lines) | `src/lib/*.ts` |
| `ai_service.py` | DROPPED (for now) |
| `templates/*.html` (26 files) | `src/app/**/*.tsx` |
| `static/js/*.js` (1542 lines) | React components + hooks |
| `static/css/*.css` (922 lines) | Tailwind + shadcn/ui |

---

## Notes

- AI analytics (GPT integration) is OUT OF SCOPE for initial migration
- Embed widget system is OUT OF SCOPE for initial migration
- CSV export can be added later
- All Arabic strings should be preserved exactly as they are in Flask
