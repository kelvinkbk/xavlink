-- Add scheduled post fields and create Activity and SkillRecommendation tables
ALTER TABLE "Post" ADD COLUMN "scheduledAt" TIMESTAMP;
ALTER TABLE "Post" ADD COLUMN "isScheduled" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "Activity" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "type" TEXT NOT NULL,
  "description" TEXT,
  "postId" UUID,
  "targetUserId" UUID,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id"),
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
  FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE SET NULL
);

CREATE INDEX "Activity_userId_idx" ON "Activity"("userId");
CREATE INDEX "Activity_type_idx" ON "Activity"("type");
CREATE INDEX "Activity_createdAt_idx" ON "Activity"("createdAt");

CREATE TABLE "SkillRecommendation" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "skillName" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "score" DECIMAL(3,2) NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id"),
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
  UNIQUE("userId", "skillName")
);

CREATE INDEX "SkillRecommendation_userId_idx" ON "SkillRecommendation"("userId");
CREATE INDEX "SkillRecommendation_score_idx" ON "SkillRecommendation"("score");

CREATE INDEX "Post_scheduledAt_idx" ON "Post"("scheduledAt");
CREATE INDEX "Post_isScheduled_idx" ON "Post"("isScheduled");
