/**
 * Migration script: PostgreSQL SQL dump → MongoDB
 * Parses render_postgres_backup.sql and imports data into MongoDB Atlas
 *
 * Usage: node migrate-from-postgres.js
 */

const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// Table names in the database
const TABLES = [
  "User",
  "Post",
  "Comment",
  "Like",
  "Follow",
  "Chat",
  "ChatParticipant",
  "Message",
  "Notification",
  "Skill",
  "SkillEndorsement",
  "SkillRecommendation",
  "SkillCertification",
  "Request",
  "RequestTemplate",
  "Review",
  "Bookmark",
  "BlockedUser",
  "Report",
  "AuditLog",
  "DeviceSession",
  "Activity",
  "Achievement",
  "Favorite",
  "MessageReaction",
  "MessageRead",
  "ModNote",
  "ProfileView",
  "UserPhoto",
  "UserSettings",
];

// Read SQL dump file
function readSqlDump() {
  const backupPath = path.join(__dirname, "..", "render_postgres_backup.sql");

  if (!fs.existsSync(backupPath)) {
    console.error(
      "❌ Error: render_postgres_backup.sql not found at",
      backupPath
    );
    console.error("   Run pg_dump first to create the backup.");
    process.exit(1);
  }

  return fs.readFileSync(backupPath, "utf8");
}

// Parse INSERT statements from SQL dump
function extractInsertStatements(sqlContent) {
  const inserts = {};

  // Match INSERT statements with table names
  const insertRegex =
    /INSERT INTO "public"\.?"(\w+)"?\s*\((.*?)\)\s*VALUES\s*(.*?)(?=;|INSERT|$)/gis;

  let match;
  while ((match = insertRegex.exec(sqlContent)) !== null) {
    const tableName = match[1];
    const columns = match[2].split(",").map((c) => c.trim().replace(/"/g, ""));
    const valuesStr = match[3];

    if (!inserts[tableName]) {
      inserts[tableName] = { columns, rows: [] };
    }

    // Parse multiple VALUES tuples
    const valueRegex = /\((.*?)\)(?=,\s*\(|\s*;|$)/gs;
    let valueMatch;
    while ((valueMatch = valueRegex.exec(valuesStr)) !== null) {
      const values = parseValues(valueMatch[1]);
      inserts[tableName].rows.push(values);
    }
  }

  return inserts;
}

// Parse individual values from VALUES clause
function parseValues(valueStr) {
  const values = [];
  let current = "";
  let inQuotes = false;
  let escaped = false;

  for (let i = 0; i < valueStr.length; i++) {
    const char = valueStr[i];

    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }

    if (char === "\\") {
      escaped = true;
      current += char;
      continue;
    }

    if (char === "'") {
      inQuotes = !inQuotes;
      current += char;
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(parseValue(current.trim()));
      current = "";
      continue;
    }

    current += char;
  }

  if (current.trim()) {
    values.push(parseValue(current.trim()));
  }

  return values;
}

// Convert SQL value to JavaScript value
function parseValue(value) {
  if (value === "NULL") return null;
  if (value === "true") return true;
  if (value === "false") return false;
  if (value === "''") return "";

  // String value
  if (value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1).replace(/\\'/g, "'").replace(/\\\\/g, "\\");
  }

  // Number value
  if (!isNaN(value)) {
    return value.includes(".") ? parseFloat(value) : parseInt(value);
  }

  // UUID or other string
  return value;
}

// Convert SQL row to Prisma create object
function rowToCreateObject(columns, values) {
  const obj = {};

  for (let i = 0; i < columns.length; i++) {
    const col = columns[i];
    const val = values[i];

    // Convert PostgreSQL UUID to MongoDB ObjectId format if needed
    if (col === "id" && typeof val === "string" && val.includes("-")) {
      // Keep as string - MongoDB will handle ObjectId mapping via Prisma
      obj[col] = val;
    } else {
      obj[col] = val;
    }
  }

  return obj;
}

// Main migration function
async function migrate() {
  try {
    console.log("🔄 Starting migration from PostgreSQL to MongoDB...\n");

    // Read SQL dump
    console.log("📖 Reading SQL backup file...");
    const sqlContent = readSqlDump();
    console.log("✅ SQL backup loaded\n");

    // Extract INSERT statements
    console.log("🔍 Parsing INSERT statements...");
    const inserts = extractInsertStatements(sqlContent);

    const tableCount = Object.keys(inserts).length;
    const totalRows = Object.values(inserts).reduce(
      (sum, t) => sum + t.rows.length,
      0
    );
    console.log(`✅ Found ${tableCount} tables with ${totalRows} total rows\n`);

    // Migrate each table
    let migratedCount = 0;

    for (const [tableName, data] of Object.entries(inserts)) {
      if (data.rows.length === 0) continue;

      try {
        console.log(`📤 Migrating ${tableName} (${data.rows.length} rows)...`);

        const createObjects = data.rows.map((row) =>
          rowToCreateObject(data.columns, row)
        );

        // Use prisma's createMany for batch insert
        if (prisma[tableName] && prisma[tableName].createMany) {
          await prisma[tableName].createMany({
            data: createObjects,
            skipDuplicates: true, // Skip if duplicate IDs exist
          });

          console.log(
            `   ✅ ${data.rows.length} records inserted into ${tableName}`
          );
          migratedCount++;
        } else {
          console.log(`   ⚠️  Table model not found in Prisma schema`);
        }
      } catch (error) {
        console.log(`   ⚠️  Error migrating ${tableName}: ${error.message}`);
      }
    }

    console.log(`\n✅ Migration complete! Migrated ${migratedCount} tables`);
    console.log(
      "📊 Check MongoDB Atlas Data Explorer to verify imported data\n"
    );
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
migrate().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
