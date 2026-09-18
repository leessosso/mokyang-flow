-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'LEADER',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Group" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "currentLeaderId" TEXT,
    CONSTRAINT "Group_currentLeaderId_fkey" FOREIGN KEY ("currentLeaderId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Member" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "groupId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Member_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GroupLeaderTerm" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "groupId" TEXT NOT NULL,
    "leaderId" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL,
    "endedAt" DATETIME,
    CONSTRAINT "GroupLeaderTerm_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GroupLeaderTerm_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LeaderMeeting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "SharingPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "meetingId" TEXT,
    "serviceDate" DATETIME NOT NULL,
    "useHomeGroups" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "SharingPlan_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "LeaderMeeting" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SharingGroup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "planId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "homeGroupId" TEXT,
    CONSTRAINT "SharingGroup_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SharingPlan" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SharingAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sharingGroupId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    CONSTRAINT "SharingAssignment_sharingGroupId_fkey" FOREIGN KEY ("sharingGroupId") REFERENCES "SharingGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SharingAssignment_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WorshipService" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "title" TEXT NOT NULL DEFAULT '주일예배'
);

-- CreateTable
CREATE TABLE "SeatingZone" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serviceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "gridRow" INTEGER,
    "gridCol" INTEGER,
    CONSTRAINT "SeatingZone_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "WorshipService" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SeatingAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serviceId" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    CONSTRAINT "SeatingAssignment_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "WorshipService" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SeatingAssignment_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "SeatingZone" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SeatingAssignment_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PastoralThread" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "memberId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PastoralThread_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PastoralMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "threadId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PastoralMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "PastoralThread" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PastoralMessage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "GroupLeaderTerm_groupId_idx" ON "GroupLeaderTerm"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "SharingPlan_meetingId_key" ON "SharingPlan"("meetingId");

-- CreateIndex
CREATE UNIQUE INDEX "SharingAssignment_sharingGroupId_memberId_key" ON "SharingAssignment"("sharingGroupId", "memberId");

-- CreateIndex
CREATE UNIQUE INDEX "SeatingAssignment_serviceId_groupId_key" ON "SeatingAssignment"("serviceId", "groupId");

-- CreateIndex
CREATE UNIQUE INDEX "PastoralThread_memberId_key" ON "PastoralThread"("memberId");

-- CreateIndex
CREATE INDEX "PastoralMessage_threadId_idx" ON "PastoralMessage"("threadId");
