/**
 * Aplicar migración de provincias - agrega pregunta demo_province con cascada desde CCAA
 * Run: npm run db:add-provinces
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env", "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1)];
    }),
);

const sb = createClient(env.PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const VERSION_ID = "b1000000-0000-4000-8000-000000000004";
const QUESTION_ID = "c1000000-0000-4000-8000-000000000014";

// Mapa de códigos INE de región a UUIDs
const REGION_UUID = {
  "01": "a1000000-0000-4000-8000-000000000001",
  "02": "a1000000-0000-4000-8000-000000000002",
  "03": "a1000000-0000-4000-8000-000000000003",
  "04": "a1000000-0000-4000-8000-000000000004",
  "05": "a1000000-0000-4000-8000-000000000005",
  "06": "a1000000-0000-4000-8000-000000000006",
  "07": "a1000000-0000-4000-8000-000000000007",
  "08": "a1000000-0000-4000-8000-000000000008",
  "09": "a1000000-0000-4000-8000-000000000009",
  "10": "a1000000-0000-4000-8000-000000000010",
  "11": "a1000000-0000-4000-8000-000000000011",
  "12": "a1000000-0000-4000-8000-000000000012",
  "13": "a1000000-0000-4000-8000-000000000013",
  "14": "a1000000-0000-4000-8000-000000000014",
  "15": "a1000000-0000-4000-8000-000000000015",
  "16": "a1000000-0000-4000-8000-000000000016",
  "17": "a1000000-0000-4000-8000-000000000017",
  "18": "a1000000-0000-4000-8000-000000000018",
  "19": "a1000000-0000-4000-8000-000000000019",
};

// [ineCode, nombre, slug, región]
const PROVINCES_DATA = [
  ["01", "Araba/Álava", "alava", "16"],
  ["02", "Albacete", "albacete", "08"],
  ["03", "Alicante/Alacant", "alicante", "10"],
  ["04", "Almería", "almeria", "01"],
  ["05", "Ávila", "avila", "07"],
  ["06", "Badajoz", "badajoz", "11"],
  ["07", "Balears, Illes", "islas-baleares", "04"],
  ["08", "Barcelona", "barcelona", "09"],
  ["09", "Burgos", "burgos", "07"],
  ["10", "Cáceres", "caceres", "11"],
  ["11", "Cádiz", "cadiz", "01"],
  ["12", "Castellón/Castelló", "castellon", "10"],
  ["13", "Ciudad Real", "ciudad-real", "08"],
  ["14", "Córdoba", "cordoba", "01"],
  ["15", "Coruña, A", "a-coruna", "12"],
  ["16", "Cuenca", "cuenca", "08"],
  ["17", "Girona", "girona", "09"],
  ["18", "Granada", "granada", "01"],
  ["19", "Guadalajara", "guadalajara", "08"],
  ["20", "Gipuzkoa", "gipuzkoa", "16"],
  ["21", "Huelva", "huelva", "01"],
  ["22", "Huesca", "huesca", "02"],
  ["23", "Jaén", "jaen", "01"],
  ["24", "León", "leon", "07"],
  ["25", "Lleida", "lleida", "09"],
  ["26", "Rioja, La", "la-rioja", "17"],
  ["27", "Lugo", "lugo", "12"],
  ["28", "Madrid", "madrid", "13"],
  ["29", "Málaga", "malaga", "01"],
  ["30", "Murcia", "murcia", "14"],
  ["31", "Navarra", "navarra", "15"],
  ["32", "Ourense", "ourense", "12"],
  ["33", "Asturias", "asturias", "03"],
  ["34", "Palencia", "palencia", "07"],
  ["35", "Palmas, Las", "las-palmas", "05"],
  ["36", "Pontevedra", "pontevedra", "12"],
  ["37", "Salamanca", "salamanca", "07"],
  ["38", "Santa Cruz de Tenerife", "santa-cruz-de-tenerife", "05"],
  ["39", "Cantabria", "cantabria", "06"],
  ["40", "Segovia", "segovia", "07"],
  ["41", "Sevilla", "sevilla", "01"],
  ["42", "Soria", "soria", "07"],
  ["43", "Tarragona", "tarragona", "09"],
  ["44", "Teruel", "teruel", "02"],
  ["45", "Toledo", "toledo", "08"],
  ["46", "Valencia/València", "valencia", "10"],
  ["47", "Valladolid", "valladolid", "07"],
  ["48", "Bizkaia", "bizkaia", "16"],
  ["49", "Zamora", "zamora", "07"],
  ["50", "Zaragoza", "zaragoza", "02"],
  ["51", "Ceuta", "ceuta", "18"],
  ["52", "Melilla", "melilla", "19"],
];

console.log("⚙️  Aplicando migración de provincias...\n");

// 1. Insertar provincias
const provinceRows = PROVINCES_DATA.map(([ineCode, name, slug, regionCode], idx) => ({
  id: `p0000000-0000-4000-8000-${String(idx + 1).padStart(12, "0")}`,
  ine_code: ineCode,
  name,
  slug,
  region_id: REGION_UUID[regionCode],
}));

const { error: provError } = await sb.from("provinces").upsert(provinceRows, {
  onConflict: "ine_code",
  ignoreDuplicates: false,
});

if (provError) {
  console.error("❌ Error al insertar provincias:", provError);
  process.exit(1);
}
console.log("✅ Provincias insertadas (52 registros)");

// 2. Actualizar posiciones de preguntas existentes (>=4)
const { data: questionsToUpdate, error: fetchError } = await sb
  .from("questions")
  .select("id, position")
  .eq("survey_version_id", VERSION_ID)
  .gte("position", 4);

if (fetchError) {
  console.error("❌ Error al buscar preguntas:", fetchError);
  process.exit(1);
}

for (const q of questionsToUpdate) {
  await sb
    .from("questions")
    .update({ position: q.position + 1 })
    .eq("id", q.id);
}
console.log(`✅ Posiciones actualizadas (${questionsToUpdate.length} preguntas)`);

// 3. Insertar pregunta demo_province
const { error: qError } = await sb.from("questions").upsert({
  id: QUESTION_ID,
  survey_version_id: VERSION_ID,
  code: "demo_province",
  type: "select",
  label: "¿En qué provincia impartes principalmente FPE?",
  help_text: "Selecciona primero la comunidad autónoma",
  position: 4,
  is_required: true,
  is_active: true,
});

if (qError) {
  console.error("❌ Error al insertar pregunta:", qError);
  process.exit(1);
}
console.log("✅ Pregunta demo_province creada");

// 4. Insertar opciones de provincia
const optionRows = provinceRows.map((prov, idx) => ({
  question_id: QUESTION_ID,
  code: `prov_${prov.ine_code}`,
  label: prov.name,
  position: idx + 1,
  province_id: prov.id,
  is_active: true,
}));

const { error: optError } = await sb.from("question_options").upsert(optionRows, {
  onConflict: "question_id,code",
  ignoreDuplicates: false,
});

if (optError) {
  console.error("❌ Error al insertar opciones:", optError);
  process.exit(1);
}
console.log("✅ Opciones de provincia insertadas (52 opciones)");

console.log("\n✨ Migración completada con éxito");
console.log("\n📊 Resumen:");
console.log("   • 52 provincias españolas");
console.log("   • Pregunta demo_province (posición 4)");
console.log("   • 52 opciones vinculadas");
console.log("\n🔄 Recarga el servidor dev para ver los cambios");
