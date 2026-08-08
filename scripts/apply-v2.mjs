/**
 * Apply research instrument v9 (v1–v8 kept historical). Incremental: FPE share, work source, sector experience years, materials_how; drop entities count, income_share, expertise_basis.
 * Run: npm run db:apply-v2
 */
import { createClient } from "@supabase/supabase-js";
import { createHash, randomBytes } from "node:crypto";
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

const VERSION_ID = "b1000000-0000-4000-8000-000000000012";
const SURVEY_ID = "b1000000-0000-4000-8000-000000000003";
const STUDY_ID = "b1000000-0000-4000-8000-000000000001";

const REGION = {
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

const PROVINCES = [
  ["04", "Almería", "almeria", "01"],
  ["11", "Cádiz", "cadiz", "01"],
  ["14", "Córdoba", "cordoba", "01"],
  ["18", "Granada", "granada", "01"],
  ["21", "Huelva", "huelva", "01"],
  ["23", "Jaén", "jaen", "01"],
  ["29", "Málaga", "malaga", "01"],
  ["41", "Sevilla", "sevilla", "01"],
  ["22", "Huesca", "huesca", "02"],
  ["44", "Teruel", "teruel", "02"],
  ["50", "Zaragoza", "zaragoza", "02"],
  ["33", "Asturias", "asturias-prov", "03"],
  ["07", "Illes Balears", "illes-balears", "04"],
  ["35", "Las Palmas", "las-palmas", "05"],
  ["38", "Santa Cruz de Tenerife", "santa-cruz-tenerife", "05"],
  ["39", "Cantabria", "cantabria-prov", "06"],
  ["05", "Ávila", "avila", "07"],
  ["09", "Burgos", "burgos", "07"],
  ["24", "León", "leon", "07"],
  ["34", "Palencia", "palencia", "07"],
  ["37", "Salamanca", "salamanca", "07"],
  ["40", "Segovia", "segovia", "07"],
  ["42", "Soria", "soria", "07"],
  ["47", "Valladolid", "valladolid", "07"],
  ["49", "Zamora", "zamora", "07"],
  ["02", "Albacete", "albacete", "08"],
  ["13", "Ciudad Real", "ciudad-real", "08"],
  ["16", "Cuenca", "cuenca", "08"],
  ["19", "Guadalajara", "guadalajara", "08"],
  ["45", "Toledo", "toledo", "08"],
  ["08", "Barcelona", "barcelona", "09"],
  ["17", "Girona", "girona", "09"],
  ["25", "Lleida", "lleida", "09"],
  ["43", "Tarragona", "tarragona", "09"],
  ["03", "Alicante/Alacant", "alicante", "10"],
  ["12", "Castellón/Castelló", "castellon", "10"],
  ["46", "Valencia/València", "valencia", "10"],
  ["06", "Badajoz", "badajoz", "11"],
  ["10", "Cáceres", "caceres", "11"],
  ["15", "A Coruña", "a-coruna", "12"],
  ["27", "Lugo", "lugo", "12"],
  ["32", "Ourense", "ourense", "12"],
  ["36", "Pontevedra", "pontevedra", "12"],
  ["28", "Madrid", "madrid-prov", "13"],
  ["30", "Murcia", "murcia-prov", "14"],
  ["31", "Navarra", "navarra-prov", "15"],
  ["01", "Araba/Álava", "alava", "16"],
  ["48", "Bizkaia", "bizkaia", "16"],
  ["20", "Gipuzkoa", "gipuzkoa", "16"],
  ["26", "La Rioja", "la-rioja-prov", "17"],
  ["51", "Ceuta", "ceuta-prov", "18"],
  ["52", "Melilla", "melilla-prov", "19"],
];

const FAMILIES = [
  ["ADG", "Administración y gestión", "administracion-gestion"],
  ["AFD", "Actividades físicas y deportivas", "actividades-fisicas"],
  ["AGA", "Agraria", "agraria"],
  ["ARG", "Artes gráficas", "artes-graficas"],
  ["ART", "Artes y artesanías", "artes-artesanias"],
  ["COM", "Comercio y marketing", "comercio-marketing"],
  ["EOC", "Edificación y obra civil", "edificacion-obra-civil"],
  ["ELE", "Electricidad y electrónica", "electricidad-electronica"],
  ["ENA", "Energía y agua", "energia-agua"],
  ["FME", "Fabricación mecánica", "fabricacion-mecanica"],
  ["HOT", "Hostelería y turismo", "hosteleria-turismo"],
  ["IMA", "Instalación y mantenimiento", "instalacion-mantenimiento"],
  ["IMP", "Imagen personal", "imagen-personal"],
  ["IMS", "Imagen y sonido", "imagen-sonido"],
  ["INA", "Industrias alimentarias", "industrias-alimentarias"],
  ["IEC", "Industrias extractivas", "industrias-extractivas"],
  ["INF", "Informática y comunicaciones", "informatica-comunicaciones"],
  ["MAM", "Madera, mueble y corcho", "madera-mueble"],
  ["MAP", "Marítimo-pesquera", "maritimo-pesquera"],
  ["QUI", "Química", "quimica"],
  ["SAN", "Sanidad", "sanidad"],
  ["SEA", "Seguridad y medio ambiente", "seguridad-medio-ambiente"],
  ["SSC", "Servicios socioculturales y a la comunidad", "servicios-socioculturales"],
  ["TCP", "Textil, confección y piel", "textil-confeccion"],
  ["TMV", "Transporte y mantenimiento de vehículos", "transporte-vehiculos"],
  ["VIC", "Vidrio y cerámica", "vidrio-ceramica"],
];

function qid(n) {
  return `d8000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
}
function oid(n) {
  return `e8000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
}
function provId(ine) {
  return `f1000000-0000-4000-8000-0000000000${ine.padStart(2, "0")}`;
}
function famId(i) {
  return `f2000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`;
}

async function must(label, result) {
  if (result.error) {
    console.error(label, result.error);
    throw result.error;
  }
  return result.data;
}

async function tableExists(name) {
  const { error } = await sb.from(name).select("*").limit(1);
  if (!error) return true;
  if (/Could not find|schema cache|does not exist|PGRST205|42P01/i.test(error.message || "")) {
    return false;
  }
  return true;
}

function likertOptions() {
  return [
    ["likert_1", "1"],
    ["likert_2", "2"],
    ["likert_3", "3"],
    ["likert_4", "4"],
    ["likert_5", "5"],
  ];
}

const questionsDef = [
  {
    n: 1,
    code: "demo_gender",
    type: "single",
    label: "¿Con qué género te identificas?",
    required: true,
    options: [
      ["gender_woman", "Mujer"],
      ["gender_man", "Hombre"],
      ["gender_nonbinary", "No binario"],
      ["gender_other", "Otro"],
      ["gender_na", "Prefiero no decirlo"],
    ],
  },
  {
    n: 2,
    code: "demo_age",
    type: "single",
    label: "¿Cuál es tu tramo de edad?",
    required: true,
    options: [
      ["age_18_29", "18–29 años"],
      ["age_30_39", "30–39 años"],
      ["age_40_49", "40–49 años"],
      ["age_50_59", "50–59 años"],
      ["age_60_plus", "60 años o más"],
      ["age_na", "Prefiero no decirlo"],
    ],
  },
  {
    n: 3,
    code: "demo_ccaa",
    type: "single",
    label: "¿En qué comunidad autónoma impartes principalmente FPE?",
    required: true,
    options: [
      ["ccaa_01", "Andalucía", "01"],
      ["ccaa_02", "Aragón", "02"],
      ["ccaa_03", "Asturias", "03"],
      ["ccaa_04", "Illes Balears", "04"],
      ["ccaa_05", "Canarias", "05"],
      ["ccaa_06", "Cantabria", "06"],
      ["ccaa_07", "Castilla y León", "07"],
      ["ccaa_08", "Castilla-La Mancha", "08"],
      ["ccaa_09", "Cataluña", "09"],
      ["ccaa_10", "Comunitat Valenciana", "10"],
      ["ccaa_11", "Extremadura", "11"],
      ["ccaa_12", "Galicia", "12"],
      ["ccaa_13", "Comunidad de Madrid", "13"],
      ["ccaa_14", "Región de Murcia", "14"],
      ["ccaa_15", "Navarra", "15"],
      ["ccaa_16", "País Vasco", "16"],
      ["ccaa_17", "La Rioja", "17"],
      ["ccaa_18", "Ceuta", "18"],
      ["ccaa_19", "Melilla", "19"],
    ],
  },
  {
    n: 4,
    code: "demo_experience",
    type: "single",
    label: "¿Cuántos años llevas dedicándote a la FPE?",
    required: true,
    options: [
      ["exp_lt1", "Menos de 1 año"],
      ["exp_1_3", "1–3 años"],
      ["exp_4_7", "4–7 años"],
      ["exp_8_15", "8–15 años"],
      ["exp_gt15", "Más de 15 años"],
    ],
  },
  {
    n: 5,
    code: "demo_education",
    type: "single",
    label: "¿Cuál es tu nivel máximo de estudios?",
    required: true,
    options: [
      ["edu_secondary", "ESO o inferior"],
      ["edu_bachiller", "Bachillerato / FP grado medio"],
      ["edu_fp_superior", "FP grado superior"],
      ["edu_university", "Universidad (grado / licenciatura)"],
      ["edu_master", "Máster / doctorado"],
    ],
  },
  {
    n: 6,
    code: "demo_families",
    type: "multi",
    label: "¿En qué familias profesionales has impartido formación?",
    help: "Puedes marcar todas las que correspondan.",
    required: true,
    familyOpts: true,
  },
  {
    n: 7,
    code: "demo_family",
    type: "select",
    label: "¿Cuál consideras tu familia profesional principal?",
    help: "Debe estar entre las familias que has marcado arriba.",
    required: true,
    familyOpts: true,
  },
  {
    n: 8,
    code: "demo_sector_experience",
    type: "single",
    label:
      "¿Cuántos años de experiencia profesional tienes en la materia que impartes (fuera de la docencia)?",
    required: true,
    options: [
      ["sect_none", "Ninguna"],
      ["sect_lt3", "Menos de 3 años"],
      ["sect_3_5", "3–5 años"],
      ["sect_6_10", "6–10 años"],
      ["sect_gt10", "Más de 10 años"],
    ],
  },
  {
    n: 9,
    code: "teaching_mode",
    type: "single",
    label: "¿En qué modalidad impartes principalmente?",
    required: true,
    options: [
      ["mode_presencial", "Presencial"],
      ["mode_teleformacion", "Teleformación"],
      ["mode_mixed", "Mixta"],
    ],
  },
  {
    n: 10,
    code: "job_is_main",
    type: "single",
    label: "¿Es la FPE tu actividad profesional principal?",
    required: true,
    options: [
      ["main_yes", "Sí"],
      ["main_no", "No"],
    ],
  },
  {
    n: 11,
    code: "job_relation",
    type: "single",
    label: "¿Cuál es tu relación laboral principal en FPE?",
    required: true,
    options: [
      ["rel_employee", "Contrato de trabajo (cuenta ajena)"],
      ["rel_self", "Autónomo/a"],
      ["rel_other", "Ocasional"],
    ],
  },
  {
    n: 12,
    code: "job_entity_type",
    type: "single",
    label: "¿Qué tipo de entidad te proporciona principalmente tu actividad docente en FPE?",
    required: true,
    options: [
      ["ent_public_admin", "Administración pública (ayuntamiento, comunidad autónoma, etc.)"],
      ["ent_chamber", "Cámara de Comercio"],
      ["ent_training_center", "Academia o centro privado de formación"],
      ["ent_private_company", "Formación interna de empresas"],
      ["ent_ett", "ETT"],
      ["ent_social_partner", "Organización empresarial o sindical"],
      ["ent_ngo", "Asociación, fundación u ONG"],
      ["ent_other", "Otras"],
    ],
  },
  {
    n: 13,
    code: "job_fpe_share",
    type: "single",
    label: "¿Qué porcentaje aproximado de tu actividad docente corresponde a FPE?",
    required: true,
    options: [
      ["fpe_all", "Toda"],
      ["fpe_gt75", "Más del 75%"],
      ["fpe_50_75", "Entre el 50 y el 75%"],
      ["fpe_lt50", "Menos del 50%"],
      ["fpe_occasional", "Solo ocasionalmente"],
    ],
  },
  {
    n: 14,
    code: "job_income_share",
    type: "single",
    label: "¿Qué porcentaje de tus ingresos mensuales supone la docencia de FPE en tu situación financiera?",
    required: true,
    options: [
      ["inc_share_all", "Todo (100%)"],
      ["inc_share_75_100", "Entre el 75% y el 99%"],
      ["inc_share_50_75", "Entre el 50% y el 74%"],
      ["inc_share_25_50", "Entre el 25% y el 49%"],
      ["inc_share_lt25", "Menos del 25%"],
      ["inc_share_none", "No supone ingresos significativos"],
    ],
  },
  {
    n: 15,
    code: "job_centers_year",
    type: "single",
    label: "¿En cuántos centros de formación has impartido en el último año?",
    required: true,
    options: [
      ["centers_1", "1"],
      ["centers_2", "2"],
      ["centers_3", "3"],
      ["centers_4_5", "4–5"],
      ["centers_gt5", "Más de 5"],
    ],
  },
  {
    n: 16,
    code: "job_months_year",
    type: "single",
    label: "¿Cuántos meses sueles trabajar en FPE en un año?",
    required: true,
    options: [
      ["months_1_3", "1–3 meses"],
      ["months_4_6", "4–6 meses"],
      ["months_7_9", "7–9 meses"],
      ["months_10_12", "10–12 meses"],
    ],
  },
  {
    n: 17,
    code: "course_notice",
    type: "single",
    label:
      "¿Con cuánta antelación conoces normalmente que vas a impartir un curso?",
    help: "Mide incertidumbre sobre la carga de trabajo futura, no solo el hueco entre cursos.",
    required: true,
    options: [
      ["notice_same_week", "Con menos de una semana (a veces días)"],
      ["notice_1_4w", "Con 1–4 semanas"],
      ["notice_1_3m", "Con 1–3 meses"],
      ["notice_gt3m", "Con más de 3 meses"],
      ["notice_unknown", "Es muy variable / no puedo generalizar"],
    ],
  },
  {
    n: 18,
    code: "course_search",
    type: "single",
    label: "¿Cuánto tiempo dedicas habitualmente a la búsqueda de nuevos cursos?",
    required: true,
    options: [
      ["search_none_contacted", "No hago búsqueda activa: me contactan directamente los centros"],
      ["search_lt1h", "Menos de 1 hora a la semana"],
      ["search_1_3h", "Entre 1 y 3 horas a la semana"],
      ["search_4_7h", "Entre 4 y 7 horas a la semana"],
      ["search_gt7h", "Más de 7 horas a la semana"],
    ],
  },
  {
    n: 19,
    code: "unpaid_hours",
    type: "single",
    label:
      "¿Cuántas horas semanales no remuneradas dedicas fuera del aula (preparación, correcciones, tutorías, gestión)?",
    required: true,
    options: [
      ["unpaid_0", "Ninguna / casi ninguna"],
      ["unpaid_1_3", "1–3 horas"],
      ["unpaid_4_6", "4–6 horas"],
      ["unpaid_7_10", "7–10 horas"],
      ["unpaid_gt10", "Más de 10 horas"],
    ],
  },
  {
    n: 20,
    code: "materials_how",
    type: "single",
    label: "¿Cómo gestionas el material para las clases?",
    required: true,
    options: [
      ["mat_company", "Me lo da la empresa"],
      ["mat_self_paid", "Los creo yo con remuneración aparte"],
      ["mat_self_unpaid", "Creo mis propios materiales sin remuneración extra"],
      ["mat_adapt", "Adapto los que me facilita la empresa"],
    ],
  },
  {
    n: 21,
    code: "unpaid_tasks",
    type: "multi",
    label: "¿Qué tareas realizas habitualmente sin remuneración específica?",
    help: "Selecciona todas las que correspondan.",
    required: true,
    options: [
      ["task_tutoring", "Tutorías fuera del horario"],
      ["task_grading", "Corrección de actividades"],
      ["task_docs", "Elaboración documental"],
      ["task_admin", "Gestión administrativa"],
      ["task_recruit", "Captación de empresas"],
      ["task_coord", "Coordinación"],
      ["task_followup", "Seguimiento de alumnos"],
      ["task_internships", "Organizar prácticas"],
      ["task_none", "Ninguna"],
      ["task_other", "Otras"],
    ],
  },
  {
    n: 22,
    code: "income_annual_range",
    type: "single",
    label: "¿En qué rango se encuentran tus ingresos brutos anuales totales por docencia en FPE?",
    help: "Incluye todos los conceptos: clases, preparación, coordinación, etc.",
    required: true,
    options: [
      ["range_under_10k", "Menos de 10.000€"],
      ["range_10k_15k", "10.000€ - 15.000€"],
      ["range_15k_20k", "15.000€ - 20.000€"],
      ["range_20k_25k", "20.000€ - 25.000€"],
      ["range_25k_30k", "25.000€ - 30.000€"],
      ["range_30k_40k", "30.000€ - 40.000€"],
      ["range_40k_50k", "40.000€ - 50.000€"],
      ["range_over_50k", "Más de 50.000€"],
      ["range_no_answer", "Prefiero no responder"],
    ],
  },
  {
    n: 23,
    code: "sector_hard_to_find_work",
    type: "likert",
    label: "Considero que es difícil encontrar trabajo en FPE",
    help: "1 = Totalmente en desacuerdo · 5 = Totalmente de acuerdo",
    required: true,
    likert: true,
  },
  {
    n: 24,
    code: "sector_salaries_adequate",
    type: "likert",
    label: "Considero que los salarios son adecuados",
    help: "1 = Totalmente en desacuerdo · 5 = Totalmente de acuerdo",
    required: true,
    likert: true,
  },
  {
    n: 25,
    code: "sector_recognition",
    type: "likert",
    label: "Considero que la profesión está suficientemente reconocida",
    help: "1 = Totalmente en desacuerdo · 5 = Totalmente de acuerdo",
    required: true,
    likert: true,
  },
  {
    n: 26,
    code: "sector_problems",
    type: "multi",
    label:
      "¿Cuáles consideras actualmente los principales problemas de la Formación Profesional para el Empleo?",
    help: "Selecciona como máximo 3 opciones.",
    required: true,
    maxValue: 3,
    options: [
      ["prob_instability", "Inestabilidad laboral"],
      ["prob_low_pay", "Bajos salarios"],
      ["prob_too_many", "Exceso de docentes"],
      ["prob_bureaucracy", "Exceso de burocracia o carga administrativa"],
      ["prob_unpaid", "Demasiadas horas no remuneradas"],
      ["prob_late_pay", "Retrasos en los pagos"],
      ["prob_find_courses", "Dificultad para encontrar cursos"],
      ["prob_uncertainty", "Incertidumbre sobre cuándo volveré a impartir formación"],
      ["prob_competition", "Demasiada competencia"],
      ["prob_recognition", "Falta de reconocimiento profesional"],
      ["prob_regulation", "Cambios constantes en la normativa"],
      ["prob_planning", "Mala planificación de convocatorias"],
      ["prob_intrusion", "Intrusismo profesional"],
      ["prob_quality", "Baja calidad de algunos centros"],
      ["prob_tenders", "Dificultad para acceder a licitaciones"],
      ["prob_other", "Otra"],
    ],
  },
  {
    n: 27,
    code: "sector_missing_problem",
    type: "single",
    label: "¿Hay algún problema importante que no aparezca en la lista anterior?",
    required: true,
    options: [
      ["missing_no", "No"],
      ["missing_yes", "Sí"],
    ],
  },
  {
    n: 28,
    code: "open_comment",
    type: "text",
    label: "Descríbelo brevemente",
    help: "Solo si has indicado que falta algún problema en la lista.",
    required: false,
  },
  {
    n: 29,
    code: "student_recruitment_difficulty",
    type: "single",
    label: "¿Cómo valoras actualmente la dificultad de encontrar alumnado para los cursos de FPE?",
    required: true,
    options: [
      ["recruit_easy", "Muy fácil, hay mucha demanda"],
      ["recruit_normal", "Normal, no supone un problema especial"],
      ["recruit_somewhat", "Algo difícil, requiere esfuerzo"],
      ["recruit_difficult", "Bastante difícil, es una preocupación constante"],
      ["recruit_very_difficult", "Muy difícil, cada vez hay menos alumnado"],
      ["recruit_not_applicable", "No aplica a mi situación"],
    ],
  },
  {
    n: 30,
    code: "future_3y",
    type: "single",
    label: "¿Dónde crees que estarás profesionalmente dentro de tres años?",
    required: true,
    options: [
      ["fut_main_fpe", "Seguiré trabajando principalmente en FPE"],
      ["fut_partial", "Trabajaré parcialmente en FPE"],
      ["fut_leave", "Abandonaré la FPE"],
      ["fut_increase", "Aumentaré mi dedicación"],
      ["fut_retire", "Me jubilaré"],
      ["fut_unknown", "No lo sé"],
    ],
  },
];

console.log("Checking catalog tables…");
const hasProvinces = await tableExists("provinces");
const hasFamilies = await tableExists("professional_families");
console.log({ hasProvinces, hasFamilies });

if (hasProvinces) {
  const rows = PROVINCES.map(([ine, name, slug, reg]) => ({
    id: provId(ine),
    region_id: REGION[reg],
    ine_code: ine,
    name,
    slug,
  }));
  await must("provinces", await sb.from("provinces").upsert(rows, { onConflict: "ine_code" }));
}
if (hasFamilies) {
  const rows = FAMILIES.map(([code, name, slug], i) => ({
    id: famId(i),
    code,
    name,
    slug,
    position: i + 1,
  }));
  await must("families", await sb.from("professional_families").upsert(rows, { onConflict: "code" }));
}

await must(
  "deactivate others",
  await sb.from("survey_versions").update({ is_active: false }).eq("survey_id", SURVEY_ID),
);

await must(
  "upsert v9",
  await sb.from("survey_versions").upsert(
    {
      id: VERSION_ID,
      survey_id: SURVEY_ID,
      version_label: "v9",
      is_active: true,
    },
    { onConflict: "survey_id,version_label" },
  ),
);
await must("activate v9", await sb.from("survey_versions").update({ is_active: true }).eq("id", VERSION_ID));

const { data: existingQ } = await sb.from("questions").select("id").eq("survey_version_id", VERSION_ID);
if (existingQ?.length) {
  const qids = existingQ.map((q) => q.id);
  const { data: sessions } = await sb
    .from("response_sessions")
    .select("id")
    .eq("survey_version_id", VERSION_ID);
  const sids = (sessions ?? []).map((s) => s.id);
  if (sids.length) {
    await sb.from("answers").delete().in("session_id", sids);
    await sb.from("response_sessions").delete().eq("survey_version_id", VERSION_ID);
    console.log("Cleared", sids.length, "demo sessions for version");
  }
  await sb.from("question_options").delete().in("question_id", qids);
  await sb.from("questions").delete().eq("survey_version_id", VERSION_ID);
  console.log("Cleared previous questions for version");
}

let selectSupported = true;
let optionSeq = 1;

for (const def of questionsDef) {
  let type = def.type;
  if (type === "select" && !selectSupported) type = "single";

  const questionRow = {
    id: qid(def.n),
    survey_version_id: VERSION_ID,
    code: def.code,
    type,
    label: def.label,
    help_text: def.help ?? null,
    position: def.n,
    is_required: def.required,
    is_active: true,
    max_value: def.maxValue ?? null,
  };

  let ins = await sb.from("questions").insert(questionRow);
  if (ins.error && type === "select") {
    selectSupported = false;
    questionRow.type = "single";
    type = "single";
    ins = await sb.from("questions").insert(questionRow);
  }
  await must(`Q ${def.code}`, ins);

  let optionRows = [];
  if (def.likert) {
    optionRows = likertOptions().map(([code, label], i) => ({
      id: oid(optionSeq++),
      question_id: qid(def.n),
      code,
      label,
      position: i + 1,
      is_active: true,
    }));
  } else if (def.provinceOpts) {
    optionRows = PROVINCES.map(([ine, name, , reg], i) => ({
      id: oid(optionSeq++),
      question_id: qid(def.n),
      code: `prov_${ine}`,
      label: name,
      position: i + 1,
      region_id: REGION[reg],
      is_active: true,
      ...(hasProvinces ? { province_id: provId(ine) } : {}),
    }));
  } else if (def.familyOpts) {
    optionRows = FAMILIES.map(([code, name], i) => ({
      id: oid(optionSeq++),
      question_id: qid(def.n),
      code: `fam_${code}`,
      label: name,
      position: i + 1,
      is_active: true,
      ...(hasFamilies ? { professional_family_id: famId(i) } : {}),
    }));
  } else if (def.options) {
    optionRows = def.options.map((opt, i) => {
      const [code, label, regionIne] = opt;
      return {
        id: oid(optionSeq++),
        question_id: qid(def.n),
        code,
        label,
        position: i + 1,
        region_id: regionIne ? REGION[regionIne] : null,
        is_active: true,
      };
    });
  }

  if (optionRows.length) {
    for (const r of optionRows) {
      if (!hasProvinces) delete r.province_id;
      if (!hasFamilies) delete r.professional_family_id;
    }
    let { error } = await sb.from("question_options").insert(optionRows);
    if (error) {
      for (const r of optionRows) {
        delete r.province_id;
        delete r.professional_family_id;
      }
      await must(`opts ${def.code}`, await sb.from("question_options").insert(optionRows));
    } else {
      console.log(`opts ${def.code}: ${optionRows.length}`);
    }
  }
}

console.log("Instrument v9 seeded.");

const secret = env.SURVEY_UNLOCK_SECRET;
function hashToken(token) {
  return createHash("sha256").update(`${secret}:${token}`).digest("hex");
}
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function pickN(arr, n) {
  const copy = [...arr];
  const out = [];
  while (out.length < n && copy.length) {
    out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]);
  }
  return out;
}

const { data: wave } = await sb
  .from("study_waves")
  .select("id")
  .eq("study_id", STUDY_ID)
  .eq("is_open", true)
  .single();

const { data: questions } = await sb
  .from("questions")
  .select("id, code, type, is_required, max_value, question_options(id, code, region_id)")
  .eq("survey_version_id", VERSION_ID)
  .eq("is_active", true);

const ccaaQ = questions.find((q) => q.code === "demo_ccaa");
const familiesQ = questions.find((q) => q.code === "demo_families");
const familyQ = questions.find((q) => q.code === "demo_family");
const problemsQ = questions.find((q) => q.code === "sector_problems");
const missingQ = questions.find((q) => q.code === "sector_missing_problem");

const COUNT = 20;
for (let i = 0; i < COUNT; i++) {
  const token = randomBytes(32).toString("base64url");
  const { data: session, error: sErr } = await sb
    .from("response_sessions")
    .insert({
      study_id: STUDY_ID,
      wave_id: wave.id,
      survey_version_id: VERSION_ID,
      unlock_token_hash: hashToken(token),
      duration_ms: 120_000 + Math.floor(Math.random() * 180_000),
    })
    .select("id")
    .single();
  if (sErr) throw sErr;

  const ccaaOpt = pick(ccaaQ.question_options);
  const famPicked = pickN(familiesQ.question_options, 1 + Math.floor(Math.random() * 3));
  const principal = pick(famPicked);
  const problems = pickN(problemsQ.question_options, 1 + Math.floor(Math.random() * 3));
  const missingYes = Math.random() < 0.25;
  const missingOpt = missingQ?.question_options?.find((o) =>
    missingYes ? o.code === "missing_yes" : o.code === "missing_no",
  );

  const rows = [];
  for (const q of questions) {
    if (q.type === "text") {
      if (q.code === "open_comment") {
        if (!missingYes) continue;
        rows.push({
          session_id: session.id,
          question_id: q.id,
          option_id: null,
          value_text: "Retrasos en la resolución de certificados de profesionalidad.",
          value_number: null,
        });
        continue;
      }
      if (!q.is_required && Math.random() < 0.5) continue;
      rows.push({
        session_id: session.id,
        question_id: q.id,
        option_id: null,
        value_text: "Comentario demo sobre precariedad e inestabilidad.",
        value_number: null,
      });
      continue;
    }
    if (q.type === "multi") {
      let opts;
      if (q.code === "demo_families") opts = famPicked;
      else if (q.code === "sector_problems") opts = problems;
      else opts = pickN(q.question_options, Math.min(2, q.question_options.length));
      for (const opt of opts) {
        rows.push({
          session_id: session.id,
          question_id: q.id,
          option_id: opt.id,
          value_text: null,
          value_number: null,
        });
      }
      continue;
    }
    let opt;
    if (q.code === "demo_ccaa") opt = ccaaOpt;
    else if (q.code === "demo_family") opt = principal;
    else if (q.code === "sector_missing_problem") opt = missingOpt;
    else opt = pick(q.question_options);
    if (!opt) continue;
    rows.push({
      session_id: session.id,
      question_id: q.id,
      option_id: opt.id,
      value_text: null,
      value_number: null,
    });
  }

  const { error: aErr } = await sb.from("answers").insert(rows);
  if (aErr) throw aErr;
  console.log(`Demo ${i + 1}/${COUNT}`);
}

console.log("Done. Active version: v9 with", questions.length, "questions.");
