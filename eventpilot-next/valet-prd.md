# Product Requirements Document: Valet Service Module

| Field   | Value        |
|---------|--------------|
| Version | 1.0          |
| Date    | January 2026 |
| Status  | Draft        |

---

## 1. Overview

The Valet Service Module is a complimentary feature integrated within the event management platform. It enables event organizers to offer seamless parking assistance to their guests, improving the overall event experience without any payment processing involved.

### 1.1 Purpose

Streamline parking logistics for private events by providing organizers with tools to manage valet operations and guests with a convenient, ticketless parking experience.

### 1.2 Scope

- Integrated module within existing event management system
- Supports private events: weddings, corporate gatherings, parties, galas
- Free service provided by organizer to guests
- Three user roles: Admin (Organizer), Valet Employee, Guest

---

## 2. User Roles and Features

### 2.1 Admin (Event Organizer)

The admin configures and monitors valet services for their event.

**High Priority**

- Enable or disable valet service for the event
- Set total parking capacity
- View guest list with valet requests indicated
- Mark specific guests as VIP for priority service
- View live count of parked vehicles vs capacity
- View current retrieval queue
- Send broadcast message to all guests (e.g., "Retrieval is now open")

**Low Priority**

- Configure parking zones or areas
- Staff assignment and scheduling
- Post-event analytics and summary report
- Arrival rate visualization

### 2.2 Valet Employee

Valet staff handle vehicle parking and retrieval operations.

**High Priority**

- Search guest by name or scan QR code
- View guest name and VIP status
- Enter vehicle details (make, model, color)
- Assign parking slot or location identifier
- Mark vehicle as parked
- View retrieval queue with priority order
- Mark vehicle as retrieved
- Trigger notification to guest when car is ready

**Low Priority**

- Clock in and out functionality
- Capture vehicle photos at drop-off
- Visual lot map with slot availability
- Claim specific retrieval jobs from queue
- Flag and report incidents

### 2.3 Guest

Guests experience a seamless, ticketless valet service.

**High Priority**

- Indicate valet parking needed during RSVP
- Receive confirmation when vehicle is parked
- Request car retrieval via app, SMS, or QR code
- Receive notification when car is ready for pickup

**Low Priority**

- Pre-register vehicle details before event
- View queue position and estimated wait time
- Receive pickup location instructions

---

## 3. User Flows

### 3.1 Guest Arrival Flow

1. Guest arrives at venue and pulls up to valet area
2. Valet searches guest by name or scans QR from invitation
3. System displays guest info and VIP status
4. Valet enters vehicle details and assigns parking location
5. Valet marks car as parked
6. Guest receives confirmation notification

### 3.2 Guest Departure Flow

1. Guest requests car via app, SMS keyword, or QR scan
2. Request appears in valet retrieval queue (VIPs prioritized)
3. Valet retrieves vehicle from parking location
4. Valet marks car as retrieved, triggering guest notification
5. Guest picks up car at designated area

---

## 4. Feature Priority Matrix

| Feature                           | Admin | Valet | Guest | Priority |
|-----------------------------------|:-----:|:-----:|:-----:|----------|
| Enable valet for event            |   ✓   |       |       | High     |
| Set parking capacity              |   ✓   |       |       | High     |
| View guest list with valet status |   ✓   | View  |       | High     |
| Mark VIP guests                   |   ✓   |       |       | High     |
| Live parked count                 |   ✓   |       |       | High     |
| Broadcast message to guests       |   ✓   |       |       | High     |
| Search or scan guest              |       |   ✓   |       | High     |
| Enter vehicle details             |       |   ✓   |       | High     |
| Assign parking location           |       |   ✓   |       | High     |
| Mark parked / retrieved           |       |   ✓   |       | High     |
| View retrieval queue              |   ✓   |   ✓   |       | High     |
| Notify guest when ready           |       |   ✓   |   ✓   | High     |
| Request valet at RSVP             |       |       |   ✓   | High     |
| Request retrieval                 |       |       |   ✓   | High     |
| Pre-register vehicle details      |       |       |   ✓   | Low      |
| View wait time                    |       |       |   ✓   | Low      |
| Lot map visualization             |   ✓   |   ✓   |       | Low      |
| Post-event report                 |   ✓   |       |       | Low      |
| Vehicle photos                    |       |   ✓   |       | Low      |
| Staff scheduling                  |   ✓   |       |       | Low      |

---

## 5. Data Model

### 5.1 Valet Configuration (per event)

| Field                | Type    | Description                           |
|----------------------|---------|---------------------------------------|
| enabled              | Boolean | Valet service on/off                  |
| lotCapacity          | Integer | Maximum parking spots                 |
| retrievalNotice      | Integer | Minutes notice for retrieval          |
| allowPreRegistration | Boolean | Allow guests to pre-register vehicles |
| smsKeyword           | String  | Keyword for SMS retrieval requests    |

### 5.2 Guest Valet Record

| Field         | Type     | Description                                           |
|---------------|----------|-------------------------------------------------------|
| guestId       | String   | Reference to guest record                             |
| needsValet    | Boolean  | Guest requested valet service                         |
| vehicle.make  | String   | Vehicle manufacturer                                  |
| vehicle.model | String   | Vehicle model                                         |
| vehicle.color | String   | Vehicle color                                         |
| vehicle.plate | String   | License plate (optional)                              |
| status        | Enum     | expected \| parked \| requested \| ready \| retrieved |
| slot          | String   | Parking location identifier                           |
| parkedAt      | DateTime | Timestamp when parked                                 |
| requestedAt   | DateTime | Timestamp of retrieval request                        |
| retrievedAt   | DateTime | Timestamp when retrieved                              |

---

## 6. Integration Points

### 6.1 Event System Integration

- RSVP form includes valet request checkbox
- Guest list displays valet status column
- Event dashboard shows valet summary widget
- Single QR code for both event check-in and valet

### 6.2 Notification Channels

- Push notifications via event app
- SMS for guests without app
- In-app alerts for admin and valet staff

---

## 7. Out of Scope

- Payment processing or tipping
- Third-party valet vendor marketplace
- Insurance or liability management
- Vehicle damage claims workflow
- GPS tracking of valet staff

---

## 8. Success Metrics

- Average retrieval time under 5 minutes
- Guest notification delivery rate above 95%
- Zero lost vehicles or keys
- Organizer adoption rate for events with 50+ guests