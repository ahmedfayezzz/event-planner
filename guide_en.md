# Project: “Influencers Gathering” Website

A weekly platform that brings together influencers and business owners every Tuesday to build relationships, job opportunities, and collaborations.

---

## 🎯 Core Website Features

### 1. Home Page
- Brief introduction to the initiative.
- Countdown timer to the next session.
- Prominent registration button.
- Display the next 3 upcoming sessions, or one, or none if nothing is yet scheduled.
- Link to the user’s profile after registration.

---

### 2. Registration Page

The form includes:
- Full name.
- Instagram, Snapchat, or X (Twitter) link.
- Type of business or company.
  - Company name.
  - Position or job title.
- Goal for attending.
- Mobile number.
- Email address.

After registration:
- Show instant on-screen confirmation.
- Send an email or WhatsApp message (optional).
- Automatically create a user profile.

---

### 3. Participant Profile Page
- Unique link: `/u/username` or `/profile/userID`.
- Shows:
  - Name.
  - Social media links.
  - Description of the activity/business.
  - Purpose of participation.
  - Attendance history (how many sessions attended).

---

### 4. Tuesdays Sessions Page
- Dynamic schedule of Tuesday sessions.
- For each session, display:
  - Date and title.
  - Guest (and link to their profile if registered).
  - Number of registered participants.
  - Session status (open / full).
  - Registration link specific to that session.

---

### 5. Admin Panel
- Admin login (login required).
- View and export registrations (Excel / CSV).
- Change session status.
- Send reminders to registered participants.
- Hide or activate participant profiles.

---

## 🧠 AI Features (Optional)

### 1. Auto-generated user description

If the user writes a simple description, the system generates a professional description using the OpenAI API.

**Example:**

- Input: "I design coffee sleeves and I love photography."
- Output: "A designer of premium accessories who highlights brands’ visual identities through a distinct artistic lens."

---

## 🗄 Database Schema

### 📁 Collection: `users`

```json
{
  "id": "uuid",
  "name": "Mohammed Alkalbi",
  "instagram": "https://instagram.com/example",
  "project": "Independent coffee shop",
  "goal": "Build relationships with influencers",
  "email": "m@domain.com",
  "phone": "+9665xxxxxxx",
  "profile_url": "/u/mohammed",
  "attended_sessions": ["2025-09-09", "2025-09-16"]
}
```

### 📁 Collection: `sessions`

```json
{
  "id": "uuid",
  "date": "2025-09-16",
  "title": "Building a personal brand",
  "guest": "Reem Al-Suwailm",
  "registered_users": ["uuid1", "uuid2"],
  "status": "open"
}
```

---

## 🧰 Suggested Tech Stack

- **Frontend:** HTML + Tailwind CSS + JavaScript.
- **Backend:** Flask (Python) or Express (Node.js).
- **Database:** Firebase or MongoDB Atlas.
- **AI:** OpenAI API.
- **Email:** EmailJS or SMTP.
- **Messaging:** Twilio or WhatsApp Cloud API.
- **Hosting:** Replit or Vercel.

---

## 📅 Proposed Schedule for "Influencers Gathering" Sessions

| #  | Date         | Proposed Session Title                                 | Notes                                                      |
|----|--------------|--------------------------------------------------------|------------------------------------------------------------|
| 1  | 10 September | Building a personal digital identity                   | Focus on building a brand for influencers or entrepreneurs |
| 2  | 17 September | How to choose the right partnerships?                  | Influencer partnerships + startup projects                 |
| 3  | 24 September | Campaign analysis: what worked? what failed?           | Case studies from real market examples                     |
| 4  | 1 October    | Income from content: methods and pitfalls              | How influencers can monetize their platforms smartly       |
| 5  | 8 October    | Stories without ads: how to build relationships?       | The art of influence without direct selling                |
| 6  | 15 October   | Successful influencer-led projects: what’s the secret? | Host an influencer who launched a successful project       |
| 7  | 22 October   | Your audience isn’t forever… how do you keep them?     | Strategies to maintain engagement and trust                |
| 8  | 29 October   | Open session: feedback and ideas from attendees        | Interactive session bringing all participants together     |
| 9  | 5 November   | Your personal brand = your business                    | Importance of consistency between brand and direction      |
| 10 | 12 November  | Closing event and experience sharing                   | Recap of achievements + content for documentation          |

**Note:**
All session titles can be changed or adjusted based on the community’s needs and participants’ engagement, especially since you already started these gatherings earlier. The above table is only a proposal to help with planning and organization.

The session number is called the "gathering number" and should appear in every registration form with the session title, for example: "Gathering #10".

There is also an optional attendance check-in via QR code: organizers can scan and verify each registration before entry.

All registrants can either be auto-confirmed immediately, or—if configured for a specific session—require manual approval from the organizers. In that case, organizers review the list and choose whom to confirm or politely decline.