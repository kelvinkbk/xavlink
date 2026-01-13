-- Add social link verification fields
ALTER TABLE "User" ADD COLUMN "linkedInVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "githubVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "portfolioVerified" BOOLEAN NOT NULL DEFAULT false;
