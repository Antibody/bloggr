import pg from "pg";
import { readdir, readFile } from "node:fs/promises";
if (!process.env.DATABASE_URL) {
  console.error("Set DATABASE_URL securely before running migrations.");
  process.exit(1);
}
const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
try {
  await db.connect();
  await db.query("SELECT pg_advisory_lock(73199421)");
  await db.query(
    "CREATE TABLE IF NOT EXISTS public.bloggr_migrations(name text PRIMARY KEY,applied_at timestamptz NOT NULL DEFAULT now()); REVOKE ALL ON public.bloggr_migrations FROM PUBLIC,anon,authenticated;",
  );
  const files = (
    await readdir(new URL("../supabase/migrations/", import.meta.url))
  )
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const file of files) {
    const { rowCount } = await db.query(
      "SELECT 1 FROM public.bloggr_migrations WHERE name=$1",
      [file],
    );
    if (rowCount) continue;
    const sql = await readFile(
      new URL("../supabase/migrations/" + file, import.meta.url),
      "utf8",
    );
    await db.query("BEGIN");
    try {
      await db.query(sql.replace(/^BEGIN;\s*/, "").replace(/COMMIT;\s*$/, ""));
      await db.query("INSERT INTO public.bloggr_migrations(name) VALUES($1)", [
        file,
      ]);
      await db.query("COMMIT");
      console.log("Applied", file);
    } catch (error) {
      await db.query("ROLLBACK");
      throw error;
    }
  }
  // Schema cache reloads are asynchronous. Request one even on a no-op rerun;
  // example setup separately waits for the REST API to expose the schema.
  await db.query("NOTIFY pgrst, 'reload schema'");
  console.log("Migrations complete.");
} catch {
  console.error(
    "Migration failed. Verify database access and migration compatibility; no credentials were logged.",
  );
  process.exitCode = 1;
} finally {
  await db.end();
}
