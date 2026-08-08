import { getSupabaseAnon } from "@/lib/supabase";
import {
  DomainError,
  type ActiveSurvey,
  type QuestionType,
  type StudyStatus,
  type SurveyQuestion,
} from "@/types";

function resolveDisplay(
  type: QuestionType,
  code: string,
  optionsCount: number,
): SurveyQuestion["display"] {
  if (type === "text") return "text";
  if (type === "number") return "number";
  if (type === "multi") return "checkbox";
  if (type === "likert") return "likert";
  if (
    type === "select" ||
    code === "demo_province" ||
    code === "demo_family" ||
    optionsCount > 12
  ) {
    return "select";
  }
  return "radio";
}

export async function getActiveSurvey(slug: string): Promise<ActiveSurvey> {
  const supabase = getSupabaseAnon();

  const { data: study, error: studyError } = await supabase
    .from("studies")
    .select("id, slug, title, summary, status")
    .eq("slug", slug)
    .maybeSingle();

  if (studyError) {
    throw new DomainError(studyError.message, "INTERNAL");
  }
  if (!study) {
    throw new DomainError("Estudio no encontrado", "NOT_FOUND");
  }
  if (study.status === "draft" || study.status === "archived") {
    throw new DomainError("Estudio no disponible", "NOT_FOUND");
  }

  const { data: wave, error: waveError } = await supabase
    .from("study_waves")
    .select("id, label, opens_at, closes_at, is_open")
    .eq("study_id", study.id)
    .eq("is_open", true)
    .maybeSingle();

  if (waveError) {
    throw new DomainError(waveError.message, "INTERNAL");
  }
  if (!wave) {
    throw new DomainError("No hay una oleada abierta para este estudio", "CLOSED");
  }

  const { data: survey, error: surveyError } = await supabase
    .from("surveys")
    .select("id, title")
    .eq("study_id", study.id)
    .limit(1)
    .maybeSingle();

  if (surveyError) {
    throw new DomainError(surveyError.message, "INTERNAL");
  }
  if (!survey) {
    throw new DomainError("Encuesta no configurada", "INTERNAL");
  }

  const { data: version, error: versionError } = await supabase
    .from("survey_versions")
    .select("id, version_label, is_active")
    .eq("survey_id", survey.id)
    .eq("is_active", true)
    .maybeSingle();

  if (versionError) {
    throw new DomainError(versionError.message, "INTERNAL");
  }
  if (!version) {
    throw new DomainError("No hay una versión activa del cuestionario", "INTERNAL");
  }

  // Obtener mapa de provincias para resolver region_id
  const { data: provincesData } = await supabase
    .from("provinces")
    .select("id, region_id");
  
  const provinceRegionMap = new Map<string, string>();
  (provincesData ?? []).forEach(p => {
    provinceRegionMap.set(p.id, p.region_id);
  });

  const { data: questionsRaw, error: questionsError } = await supabase
    .from("questions")
    .select(
      `
      id,
      code,
      type,
      label,
      help_text,
      position,
      is_required,
      audience,
      min_value,
      max_value,
      question_options (
        id,
        code,
        label,
        position,
        region_id,
        province_id,
        professional_family_id,
        is_active
      )
    `,
    )
    .eq("survey_version_id", version.id)
    .eq("is_active", true)
    .order("position", { ascending: true });

  if (questionsError) {
    // Fallback if new columns not migrated yet
    if (/province_id|professional_family_id/i.test(questionsError.message)) {
      return getActiveSurveyLegacy(slug, study, wave, survey, version);
    }
    throw new DomainError(questionsError.message, "INTERNAL");
  }

  const questions: SurveyQuestion[] = (questionsRaw ?? []).map((q) => {
    const options = (q.question_options ?? [])
      .filter((o: { is_active: boolean }) => o.is_active)
      .sort(
        (a: { position: number }, b: { position: number }) =>
          a.position - b.position,
      )
      .map(
        (o: {
          id: string;
          code: string;
          label: string;
          position: number;
          region_id: string | null;
          province_id: string | null;
          professional_family_id: string | null;
        }) => ({
          id: o.id,
          code: o.code,
          label: o.label,
          position: o.position,
          // Para opciones de provincia, usar region_id desde el mapa
          regionId: o.province_id 
            ? provinceRegionMap.get(o.province_id) ?? null
            : o.region_id,
          provinceId: o.province_id ?? null,
          professionalFamilyId: o.professional_family_id ?? null,
        }),
      );

    const type = q.type as QuestionType;
    return {
      id: q.id,
      code: q.code,
      type,
      display: resolveDisplay(type, q.code, options.length),
      label: q.label,
      helpText: q.help_text,
      position: q.position,
      required: q.is_required,
      audience: q.audience ?? "all",
      minValue: q.min_value,
      maxValue: q.max_value,
      options,
    };
  });

  return {
    study: {
      id: study.id,
      slug: study.slug,
      title: study.title,
      summary: study.summary,
      status: study.status as StudyStatus,
    },
    wave: {
      id: wave.id,
      label: wave.label,
      opensAt: wave.opens_at,
      closesAt: wave.closes_at,
    },
    survey: {
      id: survey.id,
      title: survey.title,
    },
    version: {
      id: version.id,
      versionLabel: version.version_label,
    },
    questions,
  };
}

/** @deprecated path when province_id columns are absent */
async function getActiveSurveyLegacy(
  slug: string,
  study: { id: string; slug: string; title: string; summary: string | null; status: string },
  wave: { id: string; label: string; opens_at: string | null; closes_at: string | null },
  survey: { id: string; title: string },
  version: { id: string; version_label: string },
): Promise<ActiveSurvey> {
  const supabase = getSupabaseAnon();
  const { data: questionsRaw, error } = await supabase
    .from("questions")
    .select(
      `
      id, code, type, label, help_text, position, is_required, min_value, max_value,
      question_options ( id, code, label, position, region_id, is_active )
    `,
    )
    .eq("survey_version_id", version.id)
    .eq("is_active", true)
    .order("position", { ascending: true });

  if (error) throw new DomainError(error.message, "INTERNAL");

  const questions: SurveyQuestion[] = (questionsRaw ?? []).map((q) => {
    const options = (q.question_options ?? [])
      .filter((o: { is_active: boolean }) => o.is_active)
      .sort(
        (a: { position: number }, b: { position: number }) =>
          a.position - b.position,
      )
      .map(
        (o: {
          id: string;
          code: string;
          label: string;
          position: number;
          region_id: string | null;
        }) => ({
          id: o.id,
          code: o.code,
          label: o.label,
          position: o.position,
          regionId: o.region_id,
          provinceId: null,
          professionalFamilyId: null,
        }),
      );
    const type = q.type as QuestionType;
    return {
      id: q.id,
      code: q.code,
      type,
      display: resolveDisplay(type, q.code, options.length),
      label: q.label,
      helpText: q.help_text,
      position: q.position,
      required: q.is_required,
      audience: "all",
      minValue: q.min_value,
      maxValue: q.max_value,
      options,
    };
  });

  return {
    study: {
      id: study.id,
      slug: study.slug,
      title: study.title,
      summary: study.summary,
      status: study.status as StudyStatus,
    },
    wave: {
      id: wave.id,
      label: wave.label,
      opensAt: wave.opens_at,
      closesAt: wave.closes_at,
    },
    survey: { id: survey.id, title: survey.title },
    version: { id: version.id, versionLabel: version.version_label },
    questions,
  };
}
