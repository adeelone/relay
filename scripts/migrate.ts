import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { getPool } from "@/lib/db/pool";

const pool = getPool();
await pool.query(`
  create table if not exists schema_migrations (
    name text primary key,
    applied_at timestamptz not null default now()
  )
`);

const dir = join(process.cwd(), "migrations");
const files = (await readdir(dir))
  .filter((name) => name.endsWith(".sql"))
  .sort();

const { rows: appliedRows } = await pool.query(
  "select name from schema_migrations",
);
const applied = new Set(appliedRows.map((row) => row.name as string));

for (const file of files) {
  if (applied.has(file)) {
    console.log(`Skipping already-applied migration: ${file}`);
    continue;
  }
  const sql = await readFile(join(dir, file), "utf8");
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query(sql);
    await client.query("insert into schema_migrations (name) values ($1)", [
      file,
    ]);
    await client.query("commit");
    console.log(`Applied migration: ${file}`);
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

console.log("Migrations applied.");
process.exit(0);
