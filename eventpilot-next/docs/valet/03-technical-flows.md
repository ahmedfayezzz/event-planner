# Valet Service Module - Technical Flows

## 1. System Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        A[Admin Panel] --> API
        B[Valet Portal] --> API
        C[Guest App] --> API
        D[QR Scanner] --> API
    end

    subgraph "API Layer"
        API[tRPC API]
        API --> AUTH[NextAuth]
        API --> VAUTH[Valet JWT Auth]
    end

    subgraph "Business Logic"
        API --> VR[Valet Router]
        API --> RR[Registration Router]
        API --> SR[Session Router]
    end

    subgraph "Data Layer"
        VR --> DB[(PostgreSQL)]
        RR --> DB
        SR --> DB
    end

    subgraph "External Services"
        VR --> EMAIL[Resend Email]
    end
```

---

## 2. Authentication Flow

### 2.1 Valet Employee Login

```mermaid
sequenceDiagram
    participant V as Valet Employee
    participant P as Valet Portal
    participant API as tRPC API
    participant DB as Database

    V->>P: Enter username/password
    P->>API: valet.login({ username, password })
    API->>DB: Find ValetEmployee by username
    DB-->>API: Employee record
    API->>API: Verify password (bcrypt)
    alt Password valid
        API->>API: Generate JWT token
        API-->>P: { token, employee }
        P->>P: Store token in localStorage
        P->>P: Redirect to dashboard
    else Password invalid
        API-->>P: Error: Invalid credentials
        P->>V: Show error message
    end
```

### 2.2 Valet Procedure Middleware

```mermaid
sequenceDiagram
    participant P as Valet Portal
    participant API as tRPC API
    participant MW as valetProcedure
    participant H as Handler

    P->>API: Request with x-valet-token header
    API->>MW: Execute middleware
    MW->>MW: Extract token from header
    MW->>MW: Verify JWT signature
    alt Token valid
        MW->>MW: Decode employee data
        MW->>H: Execute with ctx.valetEmployee
        H-->>API: Response
        API-->>P: Success
    else Token invalid/expired
        MW-->>API: UNAUTHORIZED error
        API-->>P: 401 Error
        P->>P: Redirect to login
    end
```

---

## 3. Registration Flow with Valet

### 3.1 Guest Registration with Valet Request

```mermaid
sequenceDiagram
    participant G as Guest
    participant F as Registration Form
    participant API as tRPC API
    participant DB as Database
    participant E as Email Service

    G->>F: Fill registration form
    G->>F: Check "Need valet parking"
    G->>F: Submit form
    F->>API: registration.guestRegister({ ...data, needsValet: true })

    API->>DB: Create Registration
    DB-->>API: Registration created

    alt Session requires approval
        API->>E: Send pending email
    else Auto-approved
        API->>DB: Create ValetRecord (status: expected)
        DB-->>API: ValetRecord created
        API->>E: Send confirmation email with valet info
    end

    API-->>F: { registration, valetRecord }
    F->>G: Show confirmation page
```

### 3.2 Admin Approves Registration with Valet

```mermaid
sequenceDiagram
    participant A as Admin
    participant P as Admin Panel
    participant API as tRPC API
    participant DB as Database
    participant E as Email Service

    A->>P: Click "Approve" on registration
    P->>API: registration.approve({ registrationId })

    API->>DB: Update Registration (isApproved: true)
    API->>DB: Check if needsValet = true

    alt needsValet is true
        API->>DB: Create ValetRecord (status: expected)
        DB-->>API: ValetRecord created
    end

    API->>E: Send confirmation email
    API-->>P: Success
    P->>A: Show success toast
```

---

## 4. Vehicle Parking Flow

### 4.1 Park Vehicle via Search

```mermaid
sequenceDiagram
    participant V as Valet Employee
    participant P as Valet Portal
    participant API as tRPC API
    participant DB as Database
    participant E as Email Service

    V->>P: Search guest by name
    P->>API: valet.searchGuests({ sessionId, query })
    API->>DB: Find registrations with needsValet=true
    DB-->>API: Matching registrations
    API-->>P: Guest list

    V->>P: Select guest
    P->>API: valet.getValetRecord({ registrationId })
    API-->>P: Guest info + valet record

    V->>P: Fill vehicle form (make, model, color, slot)
    V->>P: Click "Park Vehicle"
    P->>API: valet.parkVehicle({ registrationId, vehicleMake, vehicleModel, vehicleColor, parkingSlot })

    API->>DB: Update ValetRecord
    Note over DB: status: parked<br/>parkedAt: now()<br/>parkedByEmployeeId: employee.id
    DB-->>API: Updated record

    API->>E: sendValetParkedEmail(guest)
    API-->>P: Success
    P->>V: Show success confirmation
```

### 4.2 Park Vehicle via QR Scan

```mermaid
sequenceDiagram
    participant V as Valet Employee
    participant P as Valet Portal
    participant CAM as Camera
    participant API as tRPC API
    participant DB as Database

    V->>P: Click "Scan QR"
    P->>CAM: Request camera access
    CAM-->>P: Camera stream

    V->>CAM: Scan guest's QR code
    CAM->>P: QR data detected
    P->>P: Parse QR data (registrationId)
    P->>API: valet.getGuestByQR({ qrData })

    API->>DB: Find Registration by ID
    API->>DB: Find ValetRecord
    DB-->>API: Guest + valet info
    API-->>P: Guest details

    P->>V: Display guest card
    Note over P: Continue with vehicle form...
```

---

## 5. Retrieval Flow

### 5.1 Guest Requests Retrieval (App)

```mermaid
sequenceDiagram
    participant G as Guest
    participant A as Guest App
    participant API as tRPC API
    participant DB as Database

    G->>A: View registration details
    A->>API: valet.getMyValetStatus({ registrationId })
    API->>DB: Get ValetRecord
    DB-->>API: Record (status: parked)
    API-->>A: Valet status

    A->>G: Show "Request My Car" button
    G->>A: Click button
    A->>API: valet.requestRetrieval({ registrationId })

    API->>DB: Update ValetRecord
    Note over DB: status: requested<br/>retrievalRequestedAt: now()<br/>retrievalPriority: isVip ? 100 : 0
    DB-->>API: Updated record

    API-->>A: Success
    A->>G: Show "Retrieval Requested" status
```

### 5.2 Guest Requests Retrieval (QR)

```mermaid
sequenceDiagram
    participant G as Guest
    participant QR as QR Code Sign
    participant B as Browser
    participant API as tRPC API
    participant DB as Database

    G->>QR: Scan QR at pickup area
    QR-->>B: Open retrieval URL with params

    B->>API: valet.requestRetrievalByQR({ qrData })
    API->>API: Parse QR, extract registrationId
    API->>DB: Find ValetRecord

    alt Record found and status is 'parked'
        API->>DB: Update status to 'requested'
        DB-->>API: Success
        API-->>B: { success: true, message: "Car requested" }
        B->>G: Show confirmation page
    else Not found or wrong status
        API-->>B: Error message
        B->>G: Show error
    end
```

### 5.3 Valet Processes Retrieval Queue

```mermaid
sequenceDiagram
    participant V as Valet Employee
    participant P as Valet Portal
    participant API as tRPC API
    participant DB as Database
    participant E as Email Service

    loop Every 5 seconds
        P->>API: valet.getRetrievalQueue({ sessionId })
        API->>DB: Get ValetRecords WHERE status='requested'
        Note over DB: ORDER BY retrievalPriority DESC,<br/>retrievalRequestedAt ASC
        DB-->>API: Sorted queue
        API-->>P: Queue list
        P->>V: Display updated queue
    end

    V->>V: Retrieve vehicle from slot
    V->>P: Click "Mark Ready" on queue item
    P->>API: valet.markVehicleReady({ valetRecordId })

    API->>DB: Update ValetRecord
    Note over DB: status: ready<br/>vehicleReadyAt: now()
    DB-->>API: Updated record

    API->>E: sendValetReadyEmail(guest)
    API-->>P: Success
    P->>V: Item moves to "Ready" section

    Note over V: Guest arrives for pickup

    V->>P: Click "Mark Retrieved"
    P->>API: valet.markVehicleRetrieved({ valetRecordId })

    API->>DB: Update ValetRecord
    Note over DB: status: retrieved<br/>retrievedAt: now()
    DB-->>API: Updated record

    API-->>P: Success
    P->>V: Item removed from queue
```

---

## 6. Admin Monitoring Flow

### 6.1 View Live Statistics

```mermaid
sequenceDiagram
    participant A as Admin
    participant P as Admin Panel
    participant API as tRPC API
    participant DB as Database

    A->>P: Open session detail page
    P->>API: valet.getSessionValetStats({ sessionId })

    API->>DB: Count ValetRecords by status
    Note over DB: SELECT status, COUNT(*)<br/>FROM ValetRecord<br/>WHERE sessionId = ?<br/>GROUP BY status
    DB-->>API: Status counts

    API->>DB: Get Session.valetLotCapacity
    DB-->>API: Capacity

    API-->>P: { parked: 45, requested: 3, ready: 1, capacity: 100 }
    P->>A: Display stats card
    Note over P: "45/100 parked"<br/>"4 in queue"
```

### 6.2 Send Broadcast Message

```mermaid
sequenceDiagram
    participant A as Admin
    participant P as Admin Panel
    participant API as tRPC API
    participant DB as Database
    participant E as Email Service

    A->>P: Click "Send Broadcast"
    P->>A: Show message dialog
    A->>P: Enter message, click Send
    P->>API: valet.sendBroadcast({ sessionId, message })

    API->>DB: Get all registrations with needsValet=true
    DB-->>API: Guest list with emails

    loop For each guest
        API->>E: sendValetBroadcastEmail(guest, message)
    end

    API-->>P: { sent: 45 }
    P->>A: Show success: "Message sent to 45 guests"
```

---

## 7. Data Flow Diagrams

### 7.1 ValetRecord State Machine

```mermaid
stateDiagram-v2
    [*] --> expected: Registration approved<br/>with needsValet=true

    expected --> parked: Valet parks vehicle

    parked --> requested: Guest requests retrieval

    requested --> ready: Valet marks ready

    ready --> retrieved: Guest picks up

    retrieved --> [*]

    note right of expected: Guest hasn't arrived
    note right of parked: Vehicle in lot
    note right of requested: In retrieval queue
    note right of ready: At pickup area
    note right of retrieved: Complete
```

### 7.2 Notification Triggers

```mermaid
flowchart LR
    subgraph "Status Changes"
        A[expected -> parked]
        B[requested -> ready]
        C[Admin broadcast]
    end

    subgraph "Email Notifications"
        A --> D[sendValetParkedEmail]
        B --> E[sendValetReadyEmail]
        C --> F[sendValetBroadcastEmail]
    end

    subgraph "Recipients"
        D --> G[Guest]
        E --> G
        F --> H[All guests with valet]
    end
```

---

## 8. Database Queries

### 8.1 Get Retrieval Queue (Priority Sorted)

```sql
SELECT
    vr.*,
    r.id as registration_id,
    COALESCE(u.name, r.guest_name) as guest_name,
    COALESCE(u.phone, r.guest_phone) as guest_phone
FROM valet_record vr
JOIN registration r ON vr.registration_id = r.id
LEFT JOIN "user" u ON r.user_id = u.id
WHERE vr.session_id = $1
  AND vr.status = 'requested'
ORDER BY
    vr.retrieval_priority DESC,  -- VIPs first
    vr.retrieval_requested_at ASC  -- Then by request time
```

### 8.2 Get Session Valet Statistics

```sql
SELECT
    COUNT(*) FILTER (WHERE status = 'expected') as expected,
    COUNT(*) FILTER (WHERE status = 'parked') as parked,
    COUNT(*) FILTER (WHERE status = 'requested') as requested,
    COUNT(*) FILTER (WHERE status = 'ready') as ready,
    COUNT(*) FILTER (WHERE status = 'retrieved') as retrieved
FROM valet_record
WHERE session_id = $1
```

### 8.3 Search Guests with Valet

```sql
SELECT
    r.id,
    COALESCE(u.name, r.guest_name) as name,
    COALESCE(u.phone, r.guest_phone) as phone,
    vr.status as valet_status,
    vr.is_vip
FROM registration r
LEFT JOIN "user" u ON r.user_id = u.id
LEFT JOIN valet_record vr ON r.id = vr.registration_id
WHERE r.session_id = $1
  AND r.needs_valet = true
  AND r.is_approved = true
  AND (
    LOWER(u.name) LIKE LOWER($2 || '%')
    OR LOWER(r.guest_name) LIKE LOWER($2 || '%')
  )
LIMIT 10
```

---

## 9. API Request/Response Examples

### 9.1 Park Vehicle

**Request:**
```typescript
api.valet.parkVehicle.mutate({
  registrationId: "clxyz123",
  vehicleMake: "Toyota",
  vehicleModel: "Camry",
  vehicleColor: "White",
  vehiclePlate: "ABC 1234",  // optional
  parkingSlot: "A-15"
})
```

**Response:**
```typescript
{
  id: "clvalet456",
  registrationId: "clxyz123",
  guestName: "Ahmed Mohammed",
  status: "parked",
  vehicleMake: "Toyota",
  vehicleModel: "Camry",
  vehicleColor: "White",
  parkingSlot: "A-15",
  parkedAt: "2026-01-15T18:30:00Z"
}
```

### 9.2 Get Retrieval Queue

**Request:**
```typescript
api.valet.getRetrievalQueue.query({
  sessionId: "clsession789"
})
```

**Response:**
```typescript
[
  {
    id: "clvalet111",
    guestName: "VIP Guest",
    guestPhone: "+966501234567",
    isVip: true,
    vehicleMake: "Mercedes",
    vehicleModel: "S-Class",
    vehicleColor: "Black",
    parkingSlot: "VIP-1",
    retrievalRequestedAt: "2026-01-15T22:00:00Z",
    retrievalPriority: 100
  },
  {
    id: "clvalet222",
    guestName: "Regular Guest",
    guestPhone: "+966509876543",
    isVip: false,
    vehicleMake: "Honda",
    vehicleModel: "Accord",
    vehicleColor: "Silver",
    parkingSlot: "B-23",
    retrievalRequestedAt: "2026-01-15T21:55:00Z",
    retrievalPriority: 0
  }
]
```

---

## 10. Error Handling

### 10.1 Error Codes

| Code | Message | Cause |
|------|---------|-------|
| `VALET_NOT_ENABLED` | Valet not enabled for this session | Session.valetEnabled is false |
| `ALREADY_PARKED` | Vehicle already parked | ValetRecord.status is not 'expected' |
| `NOT_PARKED` | Vehicle not parked yet | Trying to request retrieval when status is 'expected' |
| `ALREADY_REQUESTED` | Retrieval already requested | ValetRecord.status is 'requested' or 'ready' |
| `CAPACITY_FULL` | Parking lot is full | Parked count >= Session.valetLotCapacity |
| `GUEST_NOT_FOUND` | Guest not found | No registration with given ID |
| `INVALID_QR` | Invalid QR code | QR data cannot be parsed |

### 10.2 Error Response Format

```typescript
{
  code: "ALREADY_REQUESTED",
  message: "You have already requested your car. Current queue position: 3"
}
```
