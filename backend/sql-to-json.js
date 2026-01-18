#!/usr/bin/env node

/**
 * Alternative migration: PostgreSQL SQL dump → MongoDB
 * Uses mongoimport-friendly JSON format
 *
 * This script converts SQL dump to NDJSON (newline-delimited JSON)
 * which can be imported directly into MongoDB using mongoimport
 *
 * Usage: node sql-to-json.js
 */

const fs = require("fs");
const path = require("path");
const readline = require("readline");

const OUTPUT_DIR = path.join(__dirname, "..", "postgres_json_export");
const BACKUP_FILE = path.join(__dirname, "..", "render_postgres_backup.sql");

// Create output directory
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Check backup file exists
if (!fs.existsSync(BACKUP_FILE)) {
  console.error("❌ Error: render_postgres_backup.sql not found");
  console.error("   Run pg_dump first to create the backup.");
  process.exit(1);
}

console.log("📖 Reading SQL backup file...");
const sqlContent = fs.readFileSync(BACKUP_FILE, "utf8");

// Extract INSERT statements
function convertSqlToJson() {
  const files = {};

  // Regex to match INSERT statements
  const insertRegex =
    /INSERT INTO "public"\.?"(\w+)"?\s*\((.*?)\)\s*VALUES\s*((?:\(.*?\),?\s*)+);/gis;

  let match;
  let totalInserted = 0;

  while ((match = insertRegex.exec(sqlContent)) !== null) {
    const tableName = match[1];
    const columnsStr = match[2];
    const valuesStr = match[3];

    // Parse column names
    const columns = columnsStr
      .split(",")
      .map((col) => col.trim().replace(/"/g, ""));

    // Initialize table file
    if (!files[tableName]) {
      files[tableName] = {
        path: path.join(OUTPUT_DIR, `${tableName}.ndjson`),
        stream: null,
        count: 0,
      };
    }

    // Parse VALUES tuples
    const valueRegex = /\(([^)]+)\)/g;
    let valueMatch;

    while ((valueMatch = valueRegex.exec(valuesStr)) !== null) {
      try {
        const values = parseValuesFromSQL(valueMatch[1]);

        if (values.length === columns.length) {
          const jsonObj = {};
          columns.forEach((col, idx) => {
            jsonObj[col] = values[idx];
          });

          // Write to NDJSON file
          if (!files[tableName].stream) {
            files[tableName].stream = fs.createWriteStream(
              files[tableName].path
            );
          }

          files[tableName].stream.write(JSON.stringify(jsonObj) + "\n");
          files[tableName].count++;
          totalInserted++;
        }
      } catch (e) {
        // Skip malformed rows
      }
    }
  }

  // Close all streams
  return new Promise((resolve) => {
    let closed = 0;

    Object.values(files).forEach((file) => {
      if (file.stream) {
        file.stream.end(() => {
          closed++;
          if (closed === Object.keys(files).length) {
            // Print summary
            console.log(`\n✅ Conversion complete!\n`);
            console.log("📁 JSON files created:");
            Object.entries(files).forEach(([table, file]) => {
              console.log(`   • ${table}.ndjson (${file.count} records)`);
            });
            console.log(`\n📊 Total records: ${totalInserted}`);
            console.log(`\n📤 To import into MongoDB, use mongoimport:`);
            console.log(
              `   mongoimport --uri "mongodb+srv://..." --db xavlink --collection User --file postgres_json_export/User.ndjson\n`
            );
            resolve();
          }
        });
      }
    });

    if (Object.values(files).every((f) => !f.stream)) {
      console.log("❌ No INSERT statements found in SQL dump");
      process.exit(1);
    }
  });
}

// Parse SQL values from a VALUES tuple
function parseValuesFromSQL(valuesStr) {
  const values = [];
  let current = "";
  let inString = false;
  let escaped = false;

  for (let i = 0; i < valuesStr.length; i++) {
    const char = valuesStr[i];
    const nextChar = valuesStr[i + 1];

    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }

    if (char === "\\" && inString) {
      escaped = true;
      continue;
    }

    if (char === "'" && (i === 0 || valuesStr[i - 1] !== "\\")) {
      inString = !inString;
      current += char;
      continue;
    }

    if (char === "," && !inString) {
      values.push(sqlValueToJs(current.trim()));
      current = "";
      continue;
    }

    current += char;
  }

  if (current.trim()) {
    values.push(sqlValueToJs(current.trim()));
  }

  return values;
}

// Convert SQL value to JavaScript
function sqlValueToJs(value) {
  if (!value) return null;

  value = value.trim();

  if (value === "NULL") return null;
  if (value === "true") return true;
  if (value === "false") return false;
  if (value === "''") return "";

  // String
  if (value.startsWith("'") && value.endsWith("'")) {
    let str = value.slice(1, -1);
    str = str.replace(/\\'/g, "'");
    str = str.replace(/\\\\/g, "\\");
    return str;
  }

  // Number
  if (!isNaN(value) && value !== "") {
    return value.includes(".") ? parseFloat(value) : parseInt(value);
  }

  // UUID/string
  return value;
}

// Run conversion
console.log("🔄 Converting SQL to JSON...\n");
convertSqlToJson()
  .then(() => {
    console.log("💡 Tip: NDJSON files are ready for mongoimport");
    console.log(
      "   Each line is a separate JSON object (no array brackets needed)\n"
    );
  })
  .catch((error) => {
    console.error("❌ Conversion failed:", error);
    process.exit(1);
  });
