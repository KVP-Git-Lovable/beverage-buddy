import postgres from "https://deno.land/x/postgresjs@v3.4.4/mod.js";
import { SCHEMA_SQL } from "./schema.ts";

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

    const sql = postgres(dbUrl, { max: 1, prepare: false, idle_timeout: 5 });
    await sql.unsafe(SCHEMA_SQL);
    await sql.end({ timeout: 5 });

    return new Response(JSON.stringify({ ok: true, bytes: SCHEMA_SQL.length }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("Migration failed:", e);
    return new Response(
      JSON.stringify({ ok: false, error: String(e?.message ?? e), stack: e?.stack }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }
});
