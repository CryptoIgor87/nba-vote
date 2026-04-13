import pg from "pg";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const client = new pg.Client({
  connectionString:
    "postgresql://postgres.vttlbeewxbwkikmxdlev:uhnkjL2XdAjOU1iD@aws-0-us-west-2.pooler.supabase.com:5432/postgres",
  ssl: { rejectUnauthorized: false },
});

async function run() {
  await client.connect();
  console.log("Connected to Supabase DB");

  const files = ["001-init.sql", "002-seed-teams.sql"];

  for (const file of files) {
    console.log(`Running ${file}...`);
    const sql = readFileSync(join(__dirname, file), "utf-8");
    try {
      await client.query(sql);
      console.log(`  ✓ ${file} done`);
    } catch (err) {
      console.error(`  ✗ ${file} error:`, err.message);
    }
  }

  // Verify
  const { rows: tables } = await client.query(
    "SELECT tablename FROM pg_tables WHERE tablename LIKE 'nba_%' ORDER BY tablename"
  );
  console.log("\nCreated tables:", tables.map((t) => t.tablename).join(", "));

  const { rows: teams } = await client.query(
    "SELECT COUNT(*) as count FROM nba_teams"
  );
  console.log("Teams seeded:", teams[0].count);

  const { rows: settings } = await client.query(
    "SELECT COUNT(*) as count FROM nba_settings"
  );
  console.log("Settings:", settings[0].count);

  await client.end();
}

run().catch(console.error);
