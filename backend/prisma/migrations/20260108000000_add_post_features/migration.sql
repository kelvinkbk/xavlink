-- Alter Post table to add new fields
ALTER TABLE "Post" ADD COLUMN "images" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Post" ADD COLUMN "viewCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Post" ADD COLUMN "isDraft" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Post" ADD COLUMN "isPinned" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Post" ADD COLUMN "pinnedAt" TIMESTAMP(3);
ALTER TABLE "Post" ADD COLUMN "scheduledAt" TIMESTAMP(3);
ALTER TABLE "Post" ADD COLUMN "templateType" TEXT NOT NULL DEFAULT 'default';
ALTER TABLE "Post" ADD COLUMN "richContent" TEXT;

-- Drop old image column if exists and recreate without it (already handling in images array)
ALTER TABLE "Post" DROP COLUMN IF EXISTS "image";

-- CreateTable PostTag
CREATE TABLE "PostTag" (
    "id" UUID NOT NULL,
    "postId" UUID NOT NULL,
    "tag" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable PostView
CREATE TABLE "PostView" (
    "id" UUID NOT NULL,
    "postId" UUID NOT NULL,
    "userId" UUID,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostView_pkey" PRIMARY KEY ("id")
);

-- CreateTable PostShare
CREATE TABLE "PostShare" (
    "id" UUID NOT NULL,
    "postId" UUID NOT NULL,
    "sharedBy" UUID NOT NULL,
    "sharedWith" UUID,
    "shareType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostShare_pkey" PRIMARY KEY ("id")
);

-- CreateTable PostAnalytics
CREATE TABLE "PostAnalytics" (
    "id" UUID NOT NULL,
    "postId" UUID NOT NULL,
    "viewsToday" INTEGER NOT NULL DEFAULT 0,
    "viewsWeek" INTEGER NOT NULL DEFAULT 0,
    "viewsTotal" INTEGER NOT NULL DEFAULT 0,
    "likesTotal" INTEGER NOT NULL DEFAULT 0,
    "commentsTotal" INTEGER NOT NULL DEFAULT 0,
    "sharesTotal" INTEGER NOT NULL DEFAULT 0,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable KeywordMute
CREATE TABLE "KeywordMute" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "keyword" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KeywordMute_pkey" PRIMARY KEY ("id")
);

-- CreateTable DraftPost
CREATE TABLE "DraftPost" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "richContent" TEXT,
    "templateType" TEXT NOT NULL DEFAULT 'default',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DraftPost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PostTag_postId_idx" ON "PostTag"("postId");
CREATE INDEX "PostTag_tag_idx" ON "PostTag"("tag");
CREATE UNIQUE INDEX "PostTag_postId_tag_key" ON "PostTag"("postId", "tag");

-- CreateIndex
CREATE INDEX "PostView_postId_idx" ON "PostView"("postId");
CREATE INDEX "PostView_userId_idx" ON "PostView"("userId");

-- CreateIndex
CREATE INDEX "PostShare_postId_idx" ON "PostShare"("postId");
CREATE INDEX "PostShare_sharedBy_idx" ON "PostShare"("sharedBy");

-- CreateIndex
CREATE INDEX "PostAnalytics_postId_idx" ON "PostAnalytics"("postId");
CREATE UNIQUE INDEX "PostAnalytics_postId_key" ON "PostAnalytics"("postId");

-- CreateIndex
CREATE INDEX "KeywordMute_userId_idx" ON "KeywordMute"("userId");
CREATE INDEX "KeywordMute_keyword_idx" ON "KeywordMute"("keyword");
CREATE UNIQUE INDEX "KeywordMute_userId_keyword_key" ON "KeywordMute"("userId", "keyword");

-- CreateIndex
CREATE INDEX "DraftPost_userId_idx" ON "DraftPost"("userId");
CREATE INDEX "DraftPost_createdAt_idx" ON "DraftPost"("createdAt");

-- CreateIndex (Post table indexes)
CREATE INDEX "Post_userId_idx" ON "Post"("userId");
CREATE INDEX "Post_isPinned_idx" ON "Post"("isPinned");
CREATE INDEX "Post_isDraft_idx" ON "Post"("isDraft");
CREATE INDEX "Post_scheduledAt_idx" ON "Post"("scheduledAt");
CREATE INDEX "Post_createdAt_idx" ON "Post"("createdAt");

-- AddForeignKey
ALTER TABLE "PostTag" ADD CONSTRAINT "PostTag_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostView" ADD CONSTRAINT "PostView_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostShare" ADD CONSTRAINT "PostShare_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostAnalytics" ADD CONSTRAINT "PostAnalytics_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KeywordMute" ADD CONSTRAINT "KeywordMute_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DraftPost" ADD CONSTRAINT "DraftPost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
