-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "passwordHash" TEXT,
    "instagram" TEXT,
    "snapchat" TEXT,
    "twitter" TEXT,
    "companyName" TEXT,
    "position" TEXT,
    "activityType" TEXT,
    "gender" TEXT,
    "goal" TEXT,
    "aiDescription" TEXT,
    "isApproved" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "resetToken" TEXT,
    "resetTokenExpires" DATETIME,
    "refreshToken" TEXT,
    "refreshTokenExpires" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "date" DATETIME NOT NULL,
    "guestName" TEXT,
    "guestProfile" TEXT,
    "maxParticipants" INTEGER NOT NULL DEFAULT 50,
    "maxCompanions" INTEGER NOT NULL DEFAULT 5,
    "status" TEXT NOT NULL DEFAULT 'open',
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "showParticipantCount" BOOLEAN NOT NULL DEFAULT true,
    "location" TEXT,
    "registrationDeadline" DATETIME,
    "showCountdown" BOOLEAN NOT NULL DEFAULT true,
    "showGuestProfile" BOOLEAN NOT NULL DEFAULT true,
    "enableMiniView" BOOLEAN NOT NULL DEFAULT false,
    "customConfirmationMessage" TEXT,
    "embedEnabled" BOOLEAN NOT NULL DEFAULT true,
    "slug" TEXT,
    "inviteOnly" BOOLEAN NOT NULL DEFAULT false,
    "inviteMessage" TEXT,
    "sendQrInEmail" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Registration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "sessionId" TEXT NOT NULL,
    "registeredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isApproved" BOOLEAN NOT NULL DEFAULT true,
    "approvalNotes" TEXT,
    "guestName" TEXT,
    "guestEmail" TEXT,
    "guestPhone" TEXT,
    "guestInstagram" TEXT,
    "guestSnapchat" TEXT,
    "guestTwitter" TEXT,
    "guestCompanyName" TEXT,
    "guestPosition" TEXT,
    "guestActivityType" TEXT,
    "guestGender" TEXT,
    "guestGoal" TEXT,
    CONSTRAINT "Registration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Registration_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "attended" BOOLEAN NOT NULL DEFAULT false,
    "checkInTime" DATETIME,
    "qrVerified" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Attendance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Attendance_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Companion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "registrationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "company" TEXT,
    "title" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "inviteSent" BOOLEAN NOT NULL DEFAULT false,
    "inviteSentAt" DATETIME,
    "inviteToken" TEXT,
    "convertedToUserId" TEXT,
    CONSTRAINT "Companion_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "Registration" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Companion_convertedToUserId_fkey" FOREIGN KEY ("convertedToUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Invite" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" DATETIME,
    CONSTRAINT "Invite_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionNumber_key" ON "Session"("sessionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Session_slug_key" ON "Session"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Registration_userId_sessionId_key" ON "Registration"("userId", "sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_userId_sessionId_key" ON "Attendance"("userId", "sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "Invite_token_key" ON "Invite"("token");

-- CreateIndex
CREATE INDEX "Invite_sessionId_idx" ON "Invite"("sessionId");
