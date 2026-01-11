# Valet Service Module - User Experience & Flows

## 1. User Roles

### 1.1 Admin (Event Organizer)
The event organizer who configures and monitors valet services.

**Goals:**
- Enable valet parking as a premium service for their event
- Monitor parking capacity and operations
- Mark important guests as VIP for priority service
- Communicate with guests about valet status

### 1.2 Valet Employee
Staff members who handle vehicle parking and retrieval.

**Goals:**
- Quickly identify arriving guests
- Record vehicle information accurately
- Process retrieval requests efficiently
- Prioritize VIP guests appropriately

### 1.3 Guest
Event attendees using the valet service.

**Goals:**
- Request valet parking when registering
- Drop off vehicle without hassle
- Request car retrieval easily
- Know when car is ready for pickup

---

## 2. User Flows

### 2.1 Admin: Enable Valet for Event

**Entry Point:** Admin Session Edit Page

**Steps:**
1. Admin navigates to session edit page
2. Scrolls to "Valet Service" section
3. Toggles "Enable Valet Parking" switch
4. Enters parking capacity (e.g., 100 spots)
5. Optionally sets retrieval notice time (default 5 minutes)
6. Saves session settings

**Success Criteria:**
- Valet checkbox appears on registration forms
- Valet dashboard becomes accessible for this session

---

### 2.2 Admin: Manage Valet Employees

**Entry Point:** Admin Settings > Valet Employees

**Steps:**
1. Admin navigates to Valet Employees page
2. Clicks "Add Employee" button
3. Fills form: name, username, password, phone (optional)
4. Submits form
5. Shares credentials with valet staff

**Success Criteria:**
- Employee can login at `/valet/login`
- Employee appears in employee list

---

### 2.3 Admin: Mark Guest as VIP

**Entry Point:** Session Attendees List or Valet Dashboard

**Steps:**
1. Admin views attendee list
2. Locates guest who needs VIP treatment
3. Clicks VIP toggle/button on guest row
4. Confirmation shown

**Success Criteria:**
- Guest's valet record shows VIP badge
- Guest appears at top of retrieval queue when requesting car

---

### 2.4 Admin: Monitor Valet Operations

**Entry Point:** Session Detail Page > Valet Card

**What Admin Sees:**
- Live count: "45/100 spots filled"
- Queue status: "3 cars in retrieval queue"
- Quick actions: View Queue, Send Broadcast

**Steps:**
1. Admin opens session detail page
2. Views valet statistics card
3. Clicks "View Queue" to see retrieval requests
4. Clicks "Send Broadcast" to notify all guests (e.g., "Retrieval now open")

---

### 2.5 Guest: Register with Valet Request

**Entry Point:** Session Registration Form

**Steps:**
1. Guest opens registration page
2. Fills personal and professional details
3. Sees "Valet Parking" section (if enabled for session)
4. Checks "I need valet parking" checkbox
5. Completes registration
6. Receives confirmation showing valet is requested

**Success Criteria:**
- Registration includes `needsValet: true`
- ValetRecord created with status `expected`
- Confirmation page/email shows valet confirmation

---

### 2.6 Guest: Vehicle Drop-off (Arrival)

**Entry Point:** Physical arrival at venue valet area

**Steps:**
1. Guest arrives at valet drop-off area
2. Valet employee greets guest
3. Valet searches guest by name OR scans QR code
4. System displays guest info and VIP status
5. Valet enters vehicle details (make, model, color, plate)
6. Valet assigns parking slot location
7. Valet clicks "Park Vehicle"
8. Guest receives notification: "Your car has been parked"

**Guest Experience:**
- No paper ticket needed
- Quick identification via QR or name
- Confirmation notification provides peace of mind

---

### 2.7 Guest: Request Car Retrieval (App Method)

**Entry Point:** User Registrations Page or Confirmation Page

**Steps:**
1. Guest opens their registrations on EventPilot
2. Locates the session registration
3. Sees valet status: "Parked at A-15"
4. Clicks "Request My Car" button
5. Confirmation dialog appears
6. Guest confirms request
7. Status updates to "Retrieval Requested"
8. Guest receives notification when car is ready

**Success Criteria:**
- Request appears in valet retrieval queue
- VIP guests appear at top of queue
- Status visible to guest updates in real-time

---

### 2.8 Guest: Request Car Retrieval (QR Method)

**Entry Point:** QR code displayed at pickup area

**Steps:**
1. Guest walks to pickup area
2. Sees QR code sign: "Scan to request your car"
3. Opens phone camera or QR scanner
4. Scans QR code
5. Redirected to retrieval request page
6. Page auto-identifies guest from registration QR
7. Guest confirms retrieval request
8. Status updates and guest waits

**Success Criteria:**
- No app download required
- Works for guests who didn't create accounts

---

### 2.9 Valet Employee: Login

**Entry Point:** `/valet/login`

**Steps:**
1. Valet opens valet portal on tablet/phone
2. Enters username and password
3. Clicks "Login"
4. Redirected to valet dashboard

**UI Notes:**
- Large, touch-friendly inputs
- Remember username option
- Clean, minimal interface

---

### 2.10 Valet Employee: Park Vehicle

**Entry Point:** Valet Dashboard

**Steps:**
1. Valet sees search bar and "Scan QR" button
2. **Option A:** Types guest name, selects from results
3. **Option B:** Clicks "Scan QR", scans guest's QR code
4. Guest card appears with: name, VIP badge (if applicable), phone
5. Valet fills vehicle form: make, model, color, plate (optional)
6. Valet enters parking slot (e.g., "A-15", "Row 3 Spot 12")
7. Clicks "Park Vehicle"
8. Success confirmation shown
9. Notification sent to guest

**UI Notes:**
- QR scanner should open quickly
- Vehicle form should have common makes/models as suggestions
- Large "Park Vehicle" button for easy tapping

---

### 2.11 Valet Employee: Process Retrieval Queue

**Entry Point:** Valet Queue Page

**Steps:**
1. Valet navigates to Queue tab
2. Sees list of retrieval requests sorted by priority:
   - VIP guests at top with badge
   - Non-VIP in order of request time
3. Each item shows: guest name, vehicle info, parking slot, time requested
4. Valet selects a request to retrieve
5. Goes to parking slot, retrieves vehicle
6. Drives to pickup area
7. Clicks "Mark Ready" on the queue item
8. Guest receives notification: "Your car is ready at [pickup location]"
9. When guest picks up, valet clicks "Mark Retrieved"

**UI Notes:**
- Auto-refresh queue every 5-10 seconds
- Visual distinction for VIP (gold/yellow highlight)
- Clear action buttons: "Mark Ready" -> "Mark Retrieved"

---

### 2.12 Guest: Receive Car

**Entry Point:** Push notification or email

**Steps:**
1. Guest receives notification: "Your car is ready!"
2. Notification includes pickup location
3. Guest walks to pickup area
4. Shows confirmation to valet (optional)
5. Receives car keys and drives away

**Success Criteria:**
- Clear communication of pickup location
- Fast notification delivery

---

## 3. Screen Inventory

### 3.1 Admin Screens

| Screen | Purpose | Key Elements |
|--------|---------|--------------|
| Session Edit | Configure valet | Enable toggle, capacity input |
| Session Detail | Monitor valet | Stats card, queue link, broadcast |
| Valet Employees | Manage staff | Employee list, add/edit forms |
| Session Valet Detail | Deep valet view | Full guest list, VIP toggles, queue |

### 3.2 Valet Portal Screens

| Screen | Purpose | Key Elements |
|--------|---------|--------------|
| Login | Employee auth | Username, password, login button |
| Dashboard | Park vehicles | Search, QR scan, vehicle form |
| Queue | Process retrievals | Sorted list, ready/retrieved actions |

### 3.3 Guest Screens

| Screen | Purpose | Key Elements |
|--------|---------|--------------|
| Registration | Request valet | Valet checkbox |
| Confirmation | View valet status | Status badge, request button |
| Registrations List | Manage registrations | Valet status per registration |
| QR Retrieval | Request via QR | Auto-identified request form |

---

## 4. Notification Messages

### 4.1 Email Notifications

**Vehicle Parked:**
```
Subject: Your car has been parked - [Event Name]

Hello [Guest Name],

Your vehicle has been parked by our valet team.

Vehicle: [Color] [Make] [Model]
Parking Location: [Slot]

When you're ready to leave, request your car through:
- The EventPilot app
- Or scan the QR code at the pickup area

We'll notify you when your car is ready.

Best regards,
[Event Name] Team
```

**Vehicle Ready:**
```
Subject: Your car is ready! - [Event Name]

Hello [Guest Name],

Your car is ready for pickup!

Vehicle: [Color] [Make] [Model]
Pickup Location: [Main Entrance / Valet Area]

Please proceed to the pickup area at your convenience.

Best regards,
[Event Name] Team
```

**Admin Broadcast:**
```
Subject: Valet Update - [Event Name]

Hello [Guest Name],

[Custom message from admin]

Best regards,
[Event Name] Team
```

---

## 5. Error States & Edge Cases

### 5.1 Guest Not Found

**Scenario:** Valet searches for guest but no results
**Solution:**
- Show "No guests found" message
- Suggest checking spelling
- Offer manual entry option (future enhancement)

### 5.2 Parking Lot Full

**Scenario:** Admin capacity reached
**Solution:**
- Show warning to valet when at 90% capacity
- Block new registrations with valet when full (or show warning)
- Admin can adjust capacity if needed

### 5.3 Double Retrieval Request

**Scenario:** Guest requests car while already in queue
**Solution:**
- Show current queue position
- Disable request button when already requested

### 5.4 Valet Session Expired

**Scenario:** Valet employee's JWT expires
**Solution:**
- Redirect to login page
- Show friendly message: "Session expired, please login again"

### 5.5 Guest Without Account

**Scenario:** Guest registered without creating account
**Solution:**
- QR-based retrieval works without login
- Guest can use QR code from confirmation email

---

## 6. Accessibility Considerations

- Large touch targets for valet portal (min 44px)
- High contrast for outdoor use (bright sunlight)
- RTL support for Arabic text
- Screen reader labels for status badges
- Keyboard navigation for admin panels
