-- Add image column to Post table
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "image" TEXT;
