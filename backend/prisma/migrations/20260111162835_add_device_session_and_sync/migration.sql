/*
  Warnings:

  - You are about to drop the column `commentsCount` on the `Post` table. All the data in the column will be lost.
  - You are about to drop the column `images` on the `Post` table. All the data in the column will be lost.
  - You are about to drop the column `isDraft` on the `Post` table. All the data in the column will be lost.
  - You are about to drop the column `likesCount` on the `Post` table. All the data in the column will be lost.
  - You are about to drop the column `richContent` on the `Post` table. All the data in the column will be lost.
  - You are about to drop the column `scheduledAt` on the `Post` table. All the data in the column will be lost.
  - You are about to drop the column `templateType` on the `Post` table. All the data in the column will be lost.
  - You are about to drop the column `viewCount` on the `Post` table. All the data in the column will be lost.
  - You are about to drop the `DraftPost` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `KeywordMute` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PostAnalytics` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PostReaction` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PostReview` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PostShare` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PostTag` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PostView` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "SkillProficiency" AS ENUM ('beginner', 'intermediate', 'expert');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "RequestStatus" ADD VALUE 'completed';
ALTER TYPE "RequestStatus" ADD VALUE 'cancelled';

-- DropForeignKey
ALTER TABLE "Bookmark" DROP CONSTRAINT "Bookmark_postId_fkey";

-- DropForeignKey
ALTER TABLE "DraftPost" DROP CONSTRAINT "DraftPost_userId_fkey";

-- DropForeignKey
ALTER TABLE "KeywordMute" DROP CONSTRAINT "KeywordMute_userId_fkey";

-- DropForeignKey
ALTER TABLE "Like" DROP CONSTRAINT "Like_postId_fkey";

-- DropForeignKey
ALTER TABLE "PostAnalytics" DROP CONSTRAINT "PostAnalytics_postId_fkey";

-- DropForeignKey
ALTER TABLE "PostReaction" DROP CONSTRAINT "PostReaction_postId_fkey";

-- DropForeignKey
ALTER TABLE "PostReaction" DROP CONSTRAINT "PostReaction_userId_fkey";

-- DropForeignKey
ALTER TABLE "PostReview" DROP CONSTRAINT "PostReview_authorId_fkey";

-- DropForeignKey
ALTER TABLE "PostReview" DROP CONSTRAINT "PostReview_postId_fkey";

-- DropForeignKey
ALTER TABLE "PostShare" DROP CONSTRAINT "PostShare_postId_fkey";

-- DropForeignKey
ALTER TABLE "PostTag" DROP CONSTRAINT "PostTag_postId_fkey";

-- DropForeignKey
ALTER TABLE "PostView" DROP CONSTRAINT "PostView_postId_fkey";

-- DropIndex
DROP INDEX "Post_createdAt_idx";

-- DropIndex
DROP INDEX "Post_isDraft_idx";

-- DropIndex
DROP INDEX "Post_scheduledAt_idx";

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "actionUrl" TEXT,
ADD COLUMN     "archived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isPinned" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Post" DROP COLUMN "commentsCount",
DROP COLUMN "images",
DROP COLUMN "isDraft",
DROP COLUMN "likesCount",
DROP COLUMN "richContent",
DROP COLUMN "scheduledAt",
DROP COLUMN "templateType",
DROP COLUMN "viewCount",
ADD COLUMN     "image" TEXT;

-- AlterTable
ALTER TABLE "Request" ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "counterOffer" TEXT,
ADD COLUMN     "counterPrice" TEXT,
ADD COLUMN     "deadline" TIMESTAMP(3),
ADD COLUMN     "isUrgent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "message" TEXT,
ADD COLUMN     "reminderSentAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Skill" ADD COLUMN     "proficiency" "SkillProficiency" NOT NULL DEFAULT 'beginner',
ADD COLUMN     "subcategory" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "githubUrl" TEXT,
ADD COLUMN     "lastActiveAt" TIMESTAMP(3),
ADD COLUMN     "linkedInUrl" TEXT,
ADD COLUMN     "portfolioUrl" TEXT,
ADD COLUMN     "profileViews" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "UserSettings" ADD COLUMN     "commentNotifications" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "followNotifications" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "likeNotifications" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "quietHoursEnd" TEXT,
ADD COLUMN     "quietHoursStart" TEXT;

-- DropTable
DROP TABLE "DraftPost";

-- DropTable
DROP TABLE "KeywordMute";

-- DropTable
DROP TABLE "PostAnalytics";

-- DropTable
DROP TABLE "PostReaction";

-- DropTable
DROP TABLE "PostReview";

-- DropTable
DROP TABLE "PostShare";

-- DropTable
DROP TABLE "PostTag";

-- DropTable
DROP TABLE "PostView";

-- CreateTable
CREATE TABLE "Favorite" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "favoriteUserId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfileView" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "viewerId" UUID NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfileView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkillEndorsement" (
    "id" UUID NOT NULL,
    "skillId" UUID NOT NULL,
    "endorserId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SkillEndorsement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkillCertification" (
    "id" UUID NOT NULL,
    "skillId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "issuer" TEXT NOT NULL,
    "issueDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "certificateUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SkillCertification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequestTemplate" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RequestTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModNote" (
    "id" UUID NOT NULL,
    "reportId" UUID NOT NULL,
    "moderatorId" UUID NOT NULL,
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeviceSession" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "deviceId" TEXT NOT NULL,
    "deviceName" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeviceSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPhoto" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Achievement" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Achievement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Favorite_userId_idx" ON "Favorite"("userId");

-- CreateIndex
CREATE INDEX "Favorite_favoriteUserId_idx" ON "Favorite"("favoriteUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Favorite_userId_favoriteUserId_key" ON "Favorite"("userId", "favoriteUserId");

-- CreateIndex
CREATE INDEX "ProfileView_userId_idx" ON "ProfileView"("userId");

-- CreateIndex
CREATE INDEX "ProfileView_viewerId_idx" ON "ProfileView"("viewerId");

-- CreateIndex
CREATE INDEX "ProfileView_viewedAt_idx" ON "ProfileView"("viewedAt");

-- CreateIndex
CREATE INDEX "SkillEndorsement_skillId_idx" ON "SkillEndorsement"("skillId");

-- CreateIndex
CREATE INDEX "SkillEndorsement_endorserId_idx" ON "SkillEndorsement"("endorserId");

-- CreateIndex
CREATE UNIQUE INDEX "SkillEndorsement_skillId_endorserId_key" ON "SkillEndorsement"("skillId", "endorserId");

-- CreateIndex
CREATE INDEX "SkillCertification_skillId_idx" ON "SkillCertification"("skillId");

-- CreateIndex
CREATE INDEX "RequestTemplate_userId_idx" ON "RequestTemplate"("userId");

-- CreateIndex
CREATE INDEX "ModNote_reportId_idx" ON "ModNote"("reportId");

-- CreateIndex
CREATE INDEX "ModNote_moderatorId_idx" ON "ModNote"("moderatorId");

-- CreateIndex
CREATE INDEX "DeviceSession_userId_idx" ON "DeviceSession"("userId");

-- CreateIndex
CREATE INDEX "DeviceSession_deviceId_idx" ON "DeviceSession"("deviceId");

-- CreateIndex
CREATE INDEX "UserPhoto_userId_idx" ON "UserPhoto"("userId");

-- CreateIndex
CREATE INDEX "UserPhoto_order_idx" ON "UserPhoto"("order");

-- CreateIndex
CREATE INDEX "Achievement_userId_idx" ON "Achievement"("userId");

-- CreateIndex
CREATE INDEX "Achievement_type_idx" ON "Achievement"("type");

-- CreateIndex
CREATE UNIQUE INDEX "Achievement_userId_type_key" ON "Achievement"("userId", "type");

-- CreateIndex
CREATE INDEX "Notification_type_idx" ON "Notification"("type");

-- CreateIndex
CREATE INDEX "Notification_isPinned_idx" ON "Notification"("isPinned");

-- CreateIndex
CREATE INDEX "Notification_archived_idx" ON "Notification"("archived");

-- CreateIndex
CREATE INDEX "Request_toUserId_status_idx" ON "Request"("toUserId", "status");

-- CreateIndex
CREATE INDEX "Request_deadline_idx" ON "Request"("deadline");

-- CreateIndex
CREATE INDEX "Request_isUrgent_idx" ON "Request"("isUrgent");

-- CreateIndex
CREATE INDEX "Skill_proficiency_idx" ON "Skill"("proficiency");

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_favoriteUserId_fkey" FOREIGN KEY ("favoriteUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileView" ADD CONSTRAINT "ProfileView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillEndorsement" ADD CONSTRAINT "SkillEndorsement_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillEndorsement" ADD CONSTRAINT "SkillEndorsement_endorserId_fkey" FOREIGN KEY ("endorserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillCertification" ADD CONSTRAINT "SkillCertification_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModNote" ADD CONSTRAINT "ModNote_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModNote" ADD CONSTRAINT "ModNote_moderatorId_fkey" FOREIGN KEY ("moderatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceSession" ADD CONSTRAINT "DeviceSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPhoto" ADD CONSTRAINT "UserPhoto_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Achievement" ADD CONSTRAINT "Achievement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
