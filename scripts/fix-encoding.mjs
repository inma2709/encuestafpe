/**
 * One-shot fix: rewrite survey copy with correct UTF-8 via Supabase API.
 * Run: cross-env NODE_TLS_REJECT_UNAUTHORIZED=0 node scripts/fix-encoding.mjs
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

const sb = createClient(env.PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const questions = {
  demo_age: "¿Cuál es tu tramo de edad?",
  demo_gender: "¿Con qué género te identificas?",
  demo_ccaa: "¿En qué comunidad autónoma impartes principalmente FPE?",
  demo_city: "¿En qué ciudad o municipio impartes principalmente?",
  demo_experience:
    "¿Cuántos años llevas impartiendo Formación Profesional para el Empleo?",
  job_status:
    "¿Cuál es tu situación laboral principal como docente de FPE?",
  teaching_mode: "¿En qué modalidad impartes principalmente?",
  hours_week:
    "¿Cuántas horas semanales de docencia FPE impartes habitualmente?",
  income_stability:
    "¿En qué medida consideras estable tu situación económica como docente de FPE?",
  job_satisfaction:
    "En general, ¿cuál es tu grado de satisfacción con tu trabajo como docente de FPE?",
  main_challenge:
    "¿Cuál es el principal reto al que te enfrentas actualmente?",
  would_recommend:
    "¿Recomendarías la docencia en FPE como carrera profesional?",
};

const questionHelp = {
  demo_city:
    "Indica la localidad principal. No se publicarán datos que permitan identificarte.",
  income_stability: "1 = Nada estable · 5 = Muy estable",
  job_satisfaction: "1 = Nada satisfecho/a · 5 = Muy satisfecho/a",
};

const optionsByQuestion = {
  demo_age: [
    ["age_18_29", "18–29 años"],
    ["age_30_39", "30–39 años"],
    ["age_40_49", "40–49 años"],
    ["age_50_59", "50–59 años"],
    ["age_60_plus", "60 años o más"],
    ["age_na", "Prefiero no decirlo"],
  ],
  demo_gender: [
    ["gender_woman", "Mujer"],
    ["gender_man", "Hombre"],
    ["gender_nonbinary", "No binario"],
    ["gender_other", "Otro"],
    ["gender_na", "Prefiero no decirlo"],
  ],
  demo_ccaa: [
    ["ccaa_01", "Andalucía"],
    ["ccaa_02", "Aragón"],
    ["ccaa_03", "Asturias"],
    ["ccaa_04", "Illes Balears"],
    ["ccaa_05", "Canarias"],
    ["ccaa_06", "Cantabria"],
    ["ccaa_07", "Castilla y León"],
    ["ccaa_08", "Castilla-La Mancha"],
    ["ccaa_09", "Cataluña"],
    ["ccaa_10", "Comunitat Valenciana"],
    ["ccaa_11", "Extremadura"],
    ["ccaa_12", "Galicia"],
    ["ccaa_13", "Comunidad de Madrid"],
    ["ccaa_14", "Región de Murcia"],
    ["ccaa_15", "Navarra"],
    ["ccaa_16", "País Vasco"],
    ["ccaa_17", "La Rioja"],
    ["ccaa_18", "Ceuta"],
    ["ccaa_19", "Melilla"],
  ],
  demo_experience: [
    ["exp_lt1", "Menos de 1 año"],
    ["exp_1_3", "1–3 años"],
    ["exp_4_7", "4–7 años"],
    ["exp_8_15", "8–15 años"],
    ["exp_gt15", "Más de 15 años"],
  ],
  job_status: [
    ["job_employee", "Cuenta ajena (contrato)"],
    ["job_self", "Autónomo/a"],
    ["job_mixed", "Mixto (cuenta ajena y autónomo)"],
    ["job_other", "Otra situación"],
  ],
  teaching_mode: [
    ["mode_presencial", "Presencial"],
    ["mode_teleformacion", "Teleformación"],
    ["mode_online", "Online / virtual"],
    ["mode_mixed", "Mixta"],
  ],
  hours_week: [
    ["hours_lt10", "Menos de 10 h"],
    ["hours_10_20", "10–20 h"],
    ["hours_21_30", "21–30 h"],
    ["hours_31_40", "31–40 h"],
    ["hours_gt40", "Más de 40 h"],
  ],
  main_challenge: [
    ["challenge_instability", "Inestabilidad / discontinuidad de encargos"],
    ["challenge_pay", "Remuneración insuficiente"],
    ["challenge_admin", "Carga administrativa"],
    ["challenge_materials", "Falta de materiales o recursos"],
    ["challenge_recognition", "Falta de reconocimiento profesional"],
    ["challenge_other", "Otro"],
  ],
  would_recommend: [
    ["rec_yes", "Sí"],
    ["rec_maybe", "Depende"],
    ["rec_no", "No"],
  ],
};

const regions = [
  ["01", "Andalucía", "andalucia"],
  ["02", "Aragón", "aragon"],
  ["03", "Asturias, Principado de", "asturias"],
  ["04", "Balears, Illes", "islas-baleares"],
  ["05", "Canarias", "canarias"],
  ["06", "Cantabria", "cantabria"],
  ["07", "Castilla y León", "castilla-y-leon"],
  ["08", "Castilla-La Mancha", "castilla-la-mancha"],
  ["09", "Cataluña", "cataluna"],
  ["10", "Comunitat Valenciana", "comunitat-valenciana"],
  ["11", "Extremadura", "extremadura"],
  ["12", "Galicia", "galicia"],
  ["13", "Madrid, Comunidad de", "madrid"],
  ["14", "Murcia, Región de", "murcia"],
  ["15", "Navarra, Comunidad Foral de", "navarra"],
  ["16", "País Vasco", "pais-vasco"],
  ["17", "Rioja, La", "la-rioja"],
  ["18", "Ceuta", "ceuta"],
  ["19", "Melilla", "melilla"],
];

const study = {
  title:
    "Estudio sobre la situación de los docentes de Formación Profesional para el Empleo",
  summary:
    "Un estudio de la Formación Profesional para el Empleo para conocer la realidad profesional de quienes imparten FPE en España.",
};
for (const [ine, name, slug] of regions) {
  const { error } = await sb.from("regions").update({ name }).eq("ine_code", ine);
  if (error) throw error;
  console.log("region", slug);
}

{
  const { error } = await sb
    .from("studies")
    .update({ title: study.title, summary: study.summary })
    .eq("slug", "docentes-fpe-2026");
  if (error) throw error;
}

const { data: qs, error: qErr } = await sb
  .from("questions")
  .select("id, code");
if (qErr) throw qErr;

for (const q of qs) {
  const label = questions[q.code];
  if (!label) continue;
  const patch = { label };
  if (questionHelp[q.code]) patch.help_text = questionHelp[q.code];
  const { error } = await sb.from("questions").update(patch).eq("id", q.id);
  if (error) throw error;
  console.log("question", q.code);

  const opts = optionsByQuestion[q.code];
  if (!opts) continue;
  for (const [code, optLabel] of opts) {
    const { error: oErr } = await sb
      .from("question_options")
      .update({ label: optLabel })
      .eq("question_id", q.id)
      .eq("code", code);
    if (oErr) throw oErr;
  }
}

console.log("Done. Encoding fixed.");
