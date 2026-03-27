-- Add deviceTokens array field to User model for Firebase push notifications
ALTER TABLE "User" ADD COLUMN "deviceTokens" ARRAY DEFAULT ARRAY[];
