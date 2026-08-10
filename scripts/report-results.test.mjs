import assert from "node:assert/strict";
import test from "node:test";
import { aggregateReportQuestions } from "../src/services/reportResults.ts";

const option = (question, code, position) => ({
  id: `${question}-${code}`,
  code,
  label: code,
  position,
  regionId: null,
  provinceId: null,
  professionalFamilyId: null,
});

function dataset({ sessionCount, answeredCount, counts, type = "single" }) {
  const options = counts.map((_, index) => option("q1", `option_${index + 1}`, index + 1));
  const sessions = Array.from({ length: sessionCount }, (_, index) => ({
    id: `session_${index + 1}`,
    completed_at: "2026-08-10T00:00:00Z",
    respondent_type: "teacher",
  }));
  const answers = [];
  let cursor = 0;
  counts.forEach((count, optionIndex) => {
    for (let index = 0; index < count; index += 1) {
      const sessionIndex = type === "multi" ? index % answeredCount : cursor++;
      answers.push({
        question_id: "q1",
        option_id: options[optionIndex].id,
        value_text: null,
        value_number: null,
        session_id: sessions[sessionIndex].id,
      });
    }
  });
  const question = {
    id: "q1",
    code: "test_question",
    type,
    display: type === "multi" ? "checkbox" : "radio",
    label: "Pregunta de prueba",
    helpText: null,
    position: 10,
    required: false,
    audience: "all",
    minValue: null,
    maxValue: null,
    options,
  };
  return {
    active: { study: { id: "study", slug: "test", title: "Test", summary: null, status: "open" }, wave: { id: "wave", label: "Wave", opensAt: null, closesAt: null }, survey: { id: "survey", title: "Survey" }, version: { id: "version", versionLabel: "v1" }, questions: [question] },
    sessions,
    answers,
    optionIdByCode: new Map(),
    optionMeta: new Map(),
    questionByCode: new Map([[question.code, question]]),
  };
}

function numericDataset(values) {
  const sessions = values.map((_, index) => ({
    id: `numeric_session_${index + 1}`,
    completed_at: "2026-08-10T00:00:00Z",
    respondent_type: "teacher",
  }));
  const question = {
    id: "numeric_q",
    code: "adequate_hourly_rate",
    type: "number",
    display: "number",
    label: "Remuneración adecuada",
    helpText: null,
    position: 43,
    required: true,
    audience: "all",
    minValue: 1,
    maxValue: 200,
    options: [],
  };
  return {
    active: { study: { id: "study", slug: "test", title: "Test", summary: null, status: "open" }, wave: { id: "wave", label: "Wave", opensAt: null, closesAt: null }, survey: { id: "survey", title: "Survey" }, version: { id: "version", versionLabel: "v1" }, questions: [question] },
    sessions,
    answers: values.map((value, index) => ({ question_id: question.id, option_id: null, value_text: null, value_number: value, session_id: sessions[index].id })),
    optionIdByCode: new Map(),
    optionMeta: new Map(),
    questionByCode: new Map([[question.code, question]]),
  };
}

const aggregate = (fixture, ids = fixture.sessions.map((session) => session.id)) =>
  aggregateReportQuestions(fixture, ids, 5)[0];

test("oculta con 4 respuestas y muestra con 5", () => {
  assert.equal(aggregate(dataset({ sessionCount: 4, answeredCount: 4, counts: [4] })).shownNow, false);
  assert.equal(aggregate(dataset({ sessionCount: 5, answeredCount: 5, counts: [5] })).shownNow, true);
});

test("calcula 30/7/3 sobre las 40 personas que respondieron", () => {
  const result = aggregate(dataset({ sessionCount: 40, answeredCount: 40, counts: [30, 7, 3] }));
  assert.deepEqual(result.buckets.map((bucket) => bucket.percentage), [75, 17.5, 7.5]);
  assert.equal(result.totalAnswers, 40);
});

test("usa el denominador propio de la pregunta", () => {
  const result = aggregate(dataset({ sessionCount: 100, answeredCount: 62, counts: [31, 31] }));
  assert.deepEqual(result.buckets.map((bucket) => bucket.percentage), [50, 50]);
  assert.equal(result.totalAnswers, 62);
  assert.equal(result.validSessions, 100);
});

test("la multirrespuesta usa personas y puede superar el 100 %", () => {
  const result = aggregate(dataset({ sessionCount: 5, answeredCount: 5, counts: [5, 4, 3], type: "multi" }));
  assert.deepEqual(result.buckets.map((bucket) => bucket.percentage), [100, 80, 60]);
  assert.equal(result.buckets.reduce((total, bucket) => total + bucket.percentage, 0), 240);
});

test("vuelve a aplicar privacidad sobre una selección filtrada", () => {
  const fixture = dataset({ sessionCount: 8, answeredCount: 8, counts: [8] });
  assert.equal(aggregate(fixture, fixture.sessions.slice(0, 3).map((session) => session.id)).shownNow, false);
  assert.equal(aggregate(fixture, fixture.sessions.map((session) => session.id)).shownNow, true);
});

test("mantiene opciones del catálogo con cero respuestas", () => {
  const result = aggregate(dataset({ sessionCount: 5, answeredCount: 5, counts: [5, 0] }));
  assert.deepEqual(result.buckets.map((bucket) => bucket.count), [5, 0]);
});

test("resume la remuneración con mediana, percentiles y rangos decimales exactos", () => {
  const fixture = numericDataset([14.99, 15, 19.5, 20, 24.99, 25, 29.99, 30, 39.99, 40, 49.99, 50]);
  const result = aggregate(fixture);
  assert.equal(result.numericSummary?.median, 27.5);
  assert.equal(result.numericSummary?.p25, 19.9);
  assert.equal(result.numericSummary?.p75, 40);
  assert.equal(result.numericSummary?.unit, "€/hora");
  assert.deepEqual(result.numericSummary?.distribution?.map((range) => range.count), [1, 2, 2, 2, 2, 2, 1]);
  assert.deepEqual(result.numericSummary?.distribution?.map((range) => range.label), [
    "Menos de 15 €", "15–<20 €", "20–<25 €", "25–<30 €", "30–<40 €", "40–<50 €", "50 € o más",
  ]);

  const suppressed = aggregate(numericDataset([20, 25, 30, 40]));
  assert.equal(suppressed.shownNow, false);
  assert.equal(suppressed.numericSummary, undefined);
  assert.deepEqual(suppressed.buckets, []);
});
