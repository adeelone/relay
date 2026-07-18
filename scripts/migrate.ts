import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getPool } from "@/lib/db/pool";

const sql = await readFile(
  join(process.cwd(), "migrations", "001_initial.sql"),
  "utf8",
);
await getPool().query(sql);
console.log("Migrations applied.");
process.exit(0);
