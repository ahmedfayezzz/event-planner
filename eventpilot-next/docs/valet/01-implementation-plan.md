# Valet Service Module - Implementation Plan

## Overview

Integrate a valet parking service module into EventPilot. The module provides:
- **Separate valet portal** at `/valet` with its own login system
- **Admin controls** to enable/configure valet per session
- **Guest features** to request valet during RSVP and request retrieval
- **Valet employee features** to manage vehicle parking and retrieval

---

## 1. Database Schema Changes

### 1.1 New Enum: ValetStatus

```prisma
enum ValetStatus {
  expected    // Guest indicated valet needed, not arrived yet
  parked      // Vehicle is parked
  requested   // Retrieval requested by guest
  ready       // Vehicle at pickup area
  retrieved   // Guest picked up vehicle
}
```

### 1.2 New Model: ValetEmployee

```prisma
model ValetEmployee {
  id            String    @id @default(cuid())
  name          String
  username      String    @unique
  passwordHash  String
  phone         String?
  isActive      Boolean   @default(true)

  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  valetRecords  ValetRecord[] @relation("ParkedByEmployee")

  @@index([username])
  @@index([isActive])
}
```

### 1.3 New Model: ValetRecord

```prisma
model ValetRecord {
  id              String      @id @default(cuid())
  registrationId  String      @unique
  sessionId       String

  // Denormalized guest info for quick access
  guestName       String
  guestPhone      String?
  isVip           Boolean     @default(false)

  // Vehicle details
  vehicleMake     String?
  vehicleModel    String?
  vehicleColor    String?
  vehiclePlate    String?

  // Parking info
  parkingSlot     String?
  status          ValetStatus @default(expected)

  // Timestamps
  parkedAt              DateTime?
  parkedByEmployeeId    String?
  retrievalRequestedAt  DateTime?
  retrievalPriority     Int       @default(0)  // Higher = more priority
  vehicleReadyAt        DateTime?
  retrievedAt           DateTime?

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  // Relations
  registration      Registration   @relation(fields: [registrationId], references: [id], onDelete: Cascade)
  session           Session        @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  parkedByEmployee  ValetEmployee? @relation("ParkedByEmployee", fields: [parkedByEmployeeId], references: [id])

  @@index([sessionId])
  @@index([status])
  @@index([registrationId])
}
```

### 1.4 Modify Session Model

Add fields to existing Session model:

```prisma
// Valet configuration
valetEnabled          Boolean   @default(false)
valetLotCapacity      Int       @default(0)
valetRetrievalNotice  Int       @default(5)  // minutes

// Add relation
valetRecords          ValetRecord[]
```

### 1.5 Modify Registration Model

Add field to existing Registration model:

```prisma
needsValet            Boolean   @default(false)

// Add relation
valetRecord           ValetRecord?
```

---

## 2. File Structure

### 2.1 New Pages

```
src/app/
  valet/
    layout.tsx                    # Standalone layout (no main navbar)
    login/page.tsx                # Valet employee login
    dashboard/page.tsx            # Main valet dashboard
    queue/page.tsx                # Retrieval queue view

  admin/
    sessions/[id]/valet/page.tsx  # Admin valet config for session
    valet-employees/page.tsx      # Manage valet employees
```

### 2.2 New Components

```
src/components/
  valet/
    valet-search.tsx              # Guest search by name
    valet-vehicle-form.tsx        # Vehicle details entry
    valet-queue-list.tsx          # Retrieval queue display
    valet-status-badge.tsx        # Status indicator
    valet-stats-cards.tsx         # Dashboard statistics
    valet-guest-card.tsx          # Guest info card

  admin/
    valet-config-section.tsx      # Session valet settings
    valet-employee-form.tsx       # Create/edit employee
```

### 2.3 New Files

```
src/lib/
  valet-auth.ts                   # JWT generation/verification for valet

src/server/api/routers/
  valet.ts                        # New tRPC router
```

---

## 3. tRPC Router: `valet.ts`

### 3.1 Valet Employee Auth Procedures

| Procedure | Type | Auth | Purpose |
|-----------|------|------|---------|
| `login` | mutation | public | Valet employee login, returns JWT |
| `logout` | mutation | valet | Clear valet session |
| `getMe` | query | valet | Get current employee info |

### 3.2 Admin Procedures

| Procedure | Type | Auth | Purpose |
|-----------|------|------|---------|
| `createEmployee` | mutation | admin | Create valet employee |
| `updateEmployee` | mutation | admin | Update employee details |
| `listEmployees` | query | admin | List all valet employees |
| `deleteEmployee` | mutation | admin | Delete/deactivate employee |
| `updateSessionConfig` | mutation | admin | Set session valet settings |
| `getSessionConfig` | query | admin | Get session valet config |
| `markGuestVip` | mutation | admin | Toggle VIP status on registration |
| `getSessionValetStats` | query | admin | Live parked count, queue length |
| `getSessionValetGuests` | query | admin | Guest list with valet status |
| `sendBroadcast` | mutation | admin | Send message to all guests |

### 3.3 Valet Employee Procedures

| Procedure | Type | Auth | Purpose |
|-----------|------|------|---------|
| `searchGuests` | query | valet | Search guests by name |
| `getGuestByQR` | query | valet | Lookup guest from QR scan |
| `getValetRecord` | query | valet | Get valet record details |
| `parkVehicle` | mutation | valet | Record vehicle parking |
| `getRetrievalQueue` | query | valet | VIP-prioritized queue |
| `markVehicleReady` | mutation | valet | Mark car ready, notify guest |
| `markVehicleRetrieved` | mutation | valet | Complete retrieval |

### 3.4 Guest/Public Procedures

| Procedure | Type | Auth | Purpose |
|-----------|------|------|---------|
| `requestRetrieval` | mutation | public | Guest requests car retrieval |
| `getMyValetStatus` | query | protected | Guest views their valet status |

---

## 4. Integration Points

### 4.1 Registration Forms

**Files to modify:**
- `src/app/session/[id]/guest-register/page.tsx`
- `src/app/session/[id]/member-register/page.tsx`

**Changes:**
- Add "Need valet parking?" checkbox (only if `session.valetEnabled`)
- Pass `needsValet` to registration mutation

### 4.2 Registration Router

**File:** `src/server/api/routers/registration.ts`

**Changes:**
- Accept `needsValet` in input schema
- On approved registration with `needsValet=true`, create `ValetRecord` with status `expected`

### 4.3 Session Form

**File:** `src/components/admin/session-form.tsx`

**Changes:**
- Add "Valet Service" section with enable toggle, capacity input

### 4.4 User Registrations Page

**File:** `src/app/user/registrations/page.tsx`

**Changes:**
- Show valet status badge if `needsValet`
- Add "Request My Car" button when status is `parked`

### 4.5 Email Notifications

**File:** `src/lib/email.ts`

**New functions:**
- `sendValetParkedEmail()` - "Your car has been parked"
- `sendValetReadyEmail()` - "Your car is ready for pickup"
- `sendValetBroadcastEmail()` - Admin broadcast message

---

## 5. Implementation Phases

### Phase 1: Database & Auth Foundation
1. Add Prisma schema changes (models + fields)
2. Run `prisma migrate dev`
3. Create `src/lib/valet-auth.ts` for JWT handling
4. Add `valetProcedure` middleware to `trpc.ts`

### Phase 2: Valet Employee Management
5. Create valet router with employee CRUD
6. Register router in `root.ts`
7. Create `/admin/valet-employees` page
8. Create employee form component

### Phase 3: Session Valet Configuration
9. Add valet fields to session create/update mutations
10. Add valet config section to session form
11. Create `/admin/sessions/[id]/valet` page

### Phase 4: Valet Portal
12. Create `/valet/layout.tsx` (standalone, no main navbar)
13. Create `/valet/login/page.tsx`
14. Create `/valet/dashboard/page.tsx` with search + vehicle form
15. Create `/valet/queue/page.tsx`

### Phase 5: Registration Integration
16. Add `needsValet` checkbox to registration forms
17. Update registration mutations to handle valet
18. Create ValetRecord on approval

### Phase 6: Guest Retrieval
19. Add valet status to user registrations page
20. Add "Request My Car" button
21. Create public retrieval endpoints

### Phase 7: Notifications
22. Create valet email templates
23. Integrate notifications with valet actions

---

## 6. Verification Plan

### Database
- [ ] Run `prisma migrate dev` successfully
- [ ] Verify new tables created in database

### Admin Flow
- [ ] Create valet employee from admin panel
- [ ] Enable valet on a session with capacity
- [ ] Mark a guest as VIP

### Registration Flow
- [ ] Register for session with valet checkbox visible
- [ ] Verify ValetRecord created on approval

### Valet Portal Flow
- [ ] Login as valet employee at `/valet/login`
- [ ] Search guest by name
- [ ] Enter vehicle details and park
- [ ] View retrieval queue
- [ ] Mark vehicle ready (triggers notification)
- [ ] Mark vehicle retrieved

### Guest Flow
- [ ] View valet status in registrations page
- [ ] Request car retrieval via button
- [ ] Receive email when car is ready

---

## 7. Key Files Summary

| Purpose | File Path |
|---------|-----------|
| Prisma Schema | `prisma/schema.prisma` |
| tRPC Root | `src/server/api/root.ts` |
| tRPC Context | `src/server/api/trpc.ts` |
| Registration Router | `src/server/api/routers/registration.ts` |
| Session Router | `src/server/api/routers/session.ts` |
| Guest Register Page | `src/app/session/[id]/guest-register/page.tsx` |
| Session Form | `src/components/admin/session-form.tsx` |
| Email Utils | `src/lib/email.ts` |
| QR Utils | `src/lib/qr.ts` |
