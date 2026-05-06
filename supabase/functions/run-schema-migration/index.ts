// One-shot schema migration runner. Reads schema.sql sibling and runs it via SUPABASE_DB_URL.
import postgres from "https://deno.land/x/postgresjs@v3.4.4/mod.js";

Deno.serve(async (req) => {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  };
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const dbUrl = Deno.env.get("SUPABASE_DB_URL");
    if (!dbUrl) throw new Error("SUPABASE_DB_URL not set");

    const sqlPath = new URL("./schema.sql", import.meta.url);
    const schemaText = await Deno.readTextFile(sqlPath);

    const sql = postgres(dbUrl, { max: 1, prepare: false, idle_timeout: 5 });

    // Run as a single unprepared simple query — psql-style multi-statement.
    await sql.unsafe(schemaText);

    await sql.end({ timeout: 5 });
    return new Response(JSON.stringify({ ok: true, bytes: schemaText.length }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Migration failed:", e);
    return new Response(
      JSON.stringify({ ok: false, error: String(e?.message ?? e), stack: e?.stack }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }
});
