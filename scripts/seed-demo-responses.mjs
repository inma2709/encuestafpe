/**
 * Insert demo responses for the ACTIVE survey version (supports CCAA→province).
 * Run: npm run db:seed-demo
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

const sb = createClient(env.PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const secret = env.SURVEY_UNLOCK_SECRET;
const slug = "docentes-fpe-2026";
const COUNT = Number(process.argv[2] ?? 10);

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function hashToken(token) {
  return createHash("sha256").update(`${secret}:${token}`).digest("hex");
}

const { data: study, error: studyErr } = await sb
  .from("studies")
  .select("id")
  .eq("slug", slug)
  .single();
if (studyErr) throw studyErr;

const { data: wave, error: waveErr } = await sb
  .from("study_waves")
  .select("id")
  .eq("study_id", study.id)
  .eq("is_open", true)
  .single();
if (waveErr) throw waveErr;

const { data: survey, error: surveyErr } = await sb
  .from("surveys")
  .select("id")
  .eq("study_id", study.id)
  .limit(1)
  .single();
if (surveyErr) throw surveyErr;

const { data: version, error: versionErr } = await sb
  .from("survey_versions")
  .select("id")
  .eq("survey_id", survey.id)
  .eq("is_active", true)
  .single();
if (versionErr) throw versionErr;

const { data: questions, error: qErr } = await sb
  .from("questions")
  .select("id, code, type, is_required, question_options(id, code, region_id)")
  .eq("survey_version_id", version.id)
  .eq("is_active", true);
if (qErr) throw qErr;

const ccaaQ = questions.find((q) => q.code === "demo_ccaa");
const provQ = questions.find((q) => q.code === "demo_province");

for (let i = 0; i < COUNT; i++) {
  const token = randomBytes(32).toString("base64url");
  const { data: session, error: sErr } = await sb
    .from("response_sessions")
    .insert({
      study_id: study.id,
      wave_id: wave.id,
      survey_version_id: version.id,
      unlock_token_hash: hashToken(token),
      duration_ms: 60_000 + Math.floor(Math.random() * 180_000),
    })
    .select("id")
    .single();
  if (sErr) throw sErr;

  let ccaaOpt = null;
  let provOpt = null;
  if (ccaaQ?.question_options?.length) {
    ccaaOpt = pick(ccaaQ.question_options);
    if (provQ?.question_options?.length) {
      const filtered = provQ.question_options.filter(
        (o) => o.region_id === ccaaOpt.region_id,
      );
      provOpt = pick(filtered.length ? filtered : provQ.question_options);
    }
  }

  const rows = [];
  for (const q of questions) {
    if (q.type === "text") {
      if (!q.is_required && Math.random() < 0.5) continue;
      rows.push({
        session_id: session.id,
        question_id: q.id,
        option_id: null,
        value_text: "Inestabilidad de encargos y baja remuneración",
        value_number: null,
      });
      continue;
    }
    const opts = q.question_options ?? [];
    if (!opts.length) continue;
    let opt;
    if (q.code === "demo_ccaa" && ccaaOpt) opt = ccaaOpt;
    else if (q.code === "demo_province" && provOpt) opt = provOpt;
    else opt = pick(opts);
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
  console.log(`Response ${i + 1}/${COUNT} ok`);
}

console.log(`Inserted ${COUNT} demo responses on version ${version.id}`);
