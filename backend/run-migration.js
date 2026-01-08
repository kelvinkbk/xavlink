const { Client } = require("pg");

// Use external database URL (replace internal hostname with external)
const DATABASE_URL = process.env.DATABASE_URL.replace(
  "dpg-d5durrkhg0os73fho2a0-a",
  "dpg-d5durrkhg0os73fho2a0-a.oregon-postgres.render.com"
);

const client = new Client({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function runMigration() {
  try {
    await client.connect();
    console.log("✅ Connected to database");

    const result = await client.query(
      'ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "image" TEXT;'
    );
    console.log("✅ Migration executed successfully");
    console.log(result);

    // Verify the column was added
    const verify = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'Post' AND column_name = 'image';
    `);

    if (verify.rows.length > 0) {
      console.log("✅ Image column exists:", verify.rows[0]);
    } else {
      console.log("⚠️ Image column not found");
    }
  } catch (err) {
    console.error("❌ Error:", err.message);
  } finally {
    await client.end();
  }
}

runMigration();
