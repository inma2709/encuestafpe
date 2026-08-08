import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const env = Object.fromEntries(
  readFileSync(join(__dirname, "..", ".env"), "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1)];
    }),
);

console.log("❌ PROBLEMA DETECTADO:");
console.log("   La tabla 'provinces' no existe en tu base de datos");
console.log("   Por eso el filtro de cascada CCAA→Provincia no funciona\n");

console.log("✅ SOLUCIÓN:");
console.log("\n1. Abre tu proyecto Supabase Dashboard");
console.log("   https://supabase.com/dashboard");
console.log("\n2. Ve a SQL Editor");
console.log("\n3. Copia y pega este contenido:\n");
console.log("─".repeat(60));

const sqlContent = readFileSync(
  join(__dirname, "..", "supabase", "migrations", "20260807120000_catalogs_v2.sql"), 
  "utf8"
);

console.log(sqlContent);
console.log("─".repeat(60));

console.log("\n4. Click en RUN");
console.log("\n5. Luego ejecuta: npm run db:apply-v2");
console.log("   (Esto insertará las 52 provincias)\n");

