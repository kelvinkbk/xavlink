const { PrismaClient } = require("@prisma/client");

/**
 * Prisma Database Client
 *
 * DATABASE MIGRATION: PostgreSQL (Render) → MongoDB Atlas
 *
 * WHY WE MIGRATED:
 * 1. Render's free PostgreSQL databases are EPHEMERAL - automatically deleted after 90 days
 * 2. XavLink requires persistent user data (accounts, messages, uploads, verification tokens)
 * 3. Student project - cannot afford paid infrastructure ($7-25/month)
 *
 * WHY MONGODB ATLAS:
 * 1. Persistent Storage - Free tier has no auto-deletion (unlike Render)
 * 2. User-Centric Schema - NoSQL flexibility suits evolving social features
 * 3. Horizontal Scaling - Easier to scale as the platform grows
 * 4. Schema Evolution - Add features without rigid SQL migrations
 * 5. Developer Experience - JSON documents align with Node.js/JavaScript
 *
 * IMPLEMENTATION:
 * - Database URL configured via DATABASE_URL environment variable (.env)
 * - Prisma provider changed to 'mongodb' in schema.prisma
 * - Use 'npx prisma db push' instead of 'npx prisma migrate dev' for schema sync
 * - No changes to API endpoints or frontend code
 *
 * See README.md "Database Migration" section for full details
 */

const prisma = new PrismaClient();

module.exports = prisma;
