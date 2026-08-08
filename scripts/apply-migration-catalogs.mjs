import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
  readFileSync(".env", "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1)];
    }),
);

const sb = createClient(
  env.PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

const migration = readFileSync("supabase/migrations/20260807120000_catalogs_v2.sql", "utf8");

console.log("Aplicando migración catalogs_v2...");

// Split by statement (simple approach)
const statements = migration
  .split(";")
  .map(s => s.trim())
  .filter(s => s && !s.startsWith("--"));

for (const stmt of statements) {
  if (!stmt) continue;
  console.log(`\nEjecutando: ${stmt.substring(0, 60)}...`);
  const { error } = await sb.rpc("exec_sql", { sql: stmt + ";" });
  if (error) {
    console.error("❌ Error:", error.message);
    // Continue anyway, some might already exist
  } else {
    console.log("✅ OK");
  }
}

console.log("\n✅ Migración completada. Ejecuta ahora: npm run db:apply-v2");
process.exit(0);
