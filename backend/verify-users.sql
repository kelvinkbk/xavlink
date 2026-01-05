-- SQL script to verify existing users who registered before email was configured
-- Run this in your Render PostgreSQL console or via Prisma Studio

-- Option 1: Verify ALL existing users
UPDATE "User" SET "emailVerified" = true WHERE "emailVerified" = false;

-- Option 2: Verify a specific user by email
-- UPDATE "User" SET "emailVerified" = true WHERE email = 'Kelvinkbk2006@gmail.com';

-- Check verified status
-- SELECT id, name, email, "emailVerified" FROM "User";
