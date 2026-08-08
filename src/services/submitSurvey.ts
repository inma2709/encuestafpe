import { createUnlockToken, hashUnlockToken } from "@/lib/crypto";
import { getSupabaseAdmin } from "@/lib/supabase";
import {
  DomainError,
  type AnswerInput,
  type SubmitSurveyInput,
  type SubmitSurveyResult,
} from "@/types";
import { getActiveSurvey } from "./getActiveSurvey";
import { isQuestionApplicable, isRespondentType, type RespondentType } from "@/lib/respondent";

export async function submitSurvey(
  input: SubmitSurveyInput,
): Promise<SubmitSurveyResult> {
  if (input.website && input.website.trim() !== "") {
    throw new DomainError("Solicitud rechazada", "FORBIDDEN");
  }

  const active = await getActiveSurvey(input.studySlug);

  if (active.study.status !== "open") {
    throw new DomainError("Este estudio no acepta nuevas respuestas", "CLOSED");
  }

  const respondentType = validateAnswers(active.questions, input.answers);

  const unlockToken = createUnlockToken();
  const unlockTokenHash = hashUnlockToken(unlockToken);
  const admin = getSupabaseAdmin();

  const { data: session, error: sessionError } = await admin
    .from("response_sessions")
    .insert({
      study_id: active.study.id,
      wave_id: active.wave.id,
      survey_version_id: active.version.id,
      unlock_token_hash: unlockTokenHash,
      duration_ms: input.durationMs ?? null,
      respondent_type: respondentType,
    })
    .select("id")
    .single();

  if (sessionError || !session) {
    throw new DomainError(
      sessionError?.message ?? "No se pudo guardar la sesión",
      "INTERNAL",
    );
  }

  const rows = flattenAnswers(session.id, input.answers);
  const { error: answersError } = await admin.from("answers").insert(rows);

  if (answersError) {
    await admin.from("response_sessions").delete().eq("id", session.id);
    throw new DomainError(answersError.message, "INTERNAL");
  }

  return {
    ok: true,
    unlockToken,
    studySlug: active.study.slug,
  };
}

function validateAnswers(
  questions: Awaited<ReturnType<typeof getActiveSurvey>>["questions"],
  answers: AnswerInput[],
): RespondentType {
  const byId = new Map(questions.map((q) => [q.id, q]));
  const answered = new Set<string>();
  const profileQuestion = questions.find((question) => question.code === "respondent_type");
  const profileAnswer = profileQuestion
    ? answers.find((answer) => answer.questionId === profileQuestion.id && "optionId" in answer)
    : undefined;
  const profileOption = profileQuestion && profileAnswer && "optionId" in profileAnswer
    ? profileQuestion.options.find((option) => option.id === profileAnswer.optionId)
    : undefined;
  if (!profileOption || !isRespondentType(profileOption.code)) {
    throw new DomainError("Selecciona tu relación con la FPE", "VALIDATION");
  }
  const respondentType = profileOption.code;

  for (const answer of answers) {
    const question = byId.get(answer.questionId);
    if (!question) {
      throw new DomainError("Pregunta no válida", "VALIDATION");
    }
    if (answered.has(answer.questionId)) {
      throw new DomainError("Respuesta duplicada", "VALIDATION");
    }
    if (!isQuestionApplicable(question, respondentType)) {
      throw new DomainError("La pregunta no corresponde al perfil seleccionado", "VALIDATION");
    }
    answered.add(answer.questionId);

    if ("optionId" in answer) {
      if (
        question.type !== "single" &&
        question.type !== "likert" &&
        question.type !== "select"
      ) {
        throw new DomainError("Tipo de respuesta incorrecto", "VALIDATION");
      }
      if (!question.options.some((o) => o.id === answer.optionId)) {
        throw new DomainError("Opción no válida", "VALIDATION");
      }
    } else if ("optionIds" in answer) {
      if (question.type !== "multi") {
        throw new DomainError("Tipo de respuesta incorrecto", "VALIDATION");
      }
      if (answer.optionIds.length === 0 && question.required) {
        throw new DomainError(`Falta responder: ${question.label}`, "VALIDATION");
      }
      if (
        question.maxValue != null &&
        answer.optionIds.length > question.maxValue
      ) {
        throw new DomainError(
          `Máximo ${question.maxValue} opciones en: ${question.label}`,
          "VALIDATION",
        );
      }
      const unique = new Set(answer.optionIds);
      if (unique.size !== answer.optionIds.length) {
        throw new DomainError("Opciones duplicadas", "VALIDATION");
      }
      for (const id of answer.optionIds) {
        if (!question.options.some((o) => o.id === id)) {
          throw new DomainError("Opción no válida", "VALIDATION");
        }
      }
    } else if ("valueText" in answer) {
      if (question.type !== "text") {
        throw new DomainError("Tipo de respuesta incorrecto", "VALIDATION");
      }
      const text = answer.valueText.trim();
      if (!text && question.required) {
        throw new DomainError(`Falta responder: ${question.label}`, "VALIDATION");
      }
      if (text.length > 1000) {
        throw new DomainError("Texto demasiado largo", "VALIDATION");
      }
    } else if ("valueNumber" in answer) {
      if (question.type !== "number") {
        throw new DomainError("Tipo de respuesta incorrecto", "VALIDATION");
      }
      if (
        question.minValue != null &&
        answer.valueNumber < question.minValue
      ) {
        throw new DomainError("Valor fuera de rango", "VALIDATION");
      }
      if (
        question.maxValue != null &&
        answer.valueNumber > question.maxValue
      ) {
        throw new DomainError("Valor fuera de rango", "VALIDATION");
      }
    }
  }

  // CCAA ↔ provincia coherencia
  const ccaaQ = questions.find((q) => q.code === "demo_ccaa");
  const provQ = questions.find((q) => q.code === "demo_province");
  if (ccaaQ && provQ) {
    const ccaaAns = answers.find(
      (a) => a.questionId === ccaaQ.id && "optionId" in a,
    );
    const provAns = answers.find(
      (a) => a.questionId === provQ.id && "optionId" in a,
    );
    if (ccaaAns && provAns && "optionId" in ccaaAns && "optionId" in provAns) {
      const ccaaOpt = ccaaQ.options.find((o) => o.id === ccaaAns.optionId);
      const provOpt = provQ.options.find((o) => o.id === provAns.optionId);
      if (
        ccaaOpt?.regionId &&
        provOpt?.regionId &&
        ccaaOpt.regionId !== provOpt.regionId
      ) {
        throw new DomainError(
          "La provincia no pertenece a la comunidad autónoma seleccionada",
          "VALIDATION",
        );
      }
    }
  }

  // Familia principal ⊆ familias impartidas
  const familiesQ = questions.find((q) => q.code === "demo_families");
  const familyQ = questions.find((q) => q.code === "demo_family");
  if (familiesQ && familyQ) {
    const famAns = answers.find(
      (a) => a.questionId === familiesQ.id && "optionIds" in a,
    );
    const principalAns = answers.find(
      (a) => a.questionId === familyQ.id && "optionId" in a,
    );
    if (
      famAns &&
      principalAns &&
      "optionIds" in famAns &&
      "optionId" in principalAns
    ) {
      const principalOpt = familyQ.options.find(
        (o) => o.id === principalAns.optionId,
      );
      const taughtCodes = new Set(
        famAns.optionIds
          .map((id) => familiesQ.options.find((o) => o.id === id)?.code)
          .filter(Boolean),
      );
      // Match by option code (fam_XXX) since multi and select have separate option rows
      if (principalOpt && !taughtCodes.has(principalOpt.code)) {
        // Also allow match if same professional family code suffix
        const taughtSuffixes = [...taughtCodes].map((c) =>
          String(c).replace(/^fam_/, ""),
        );
        const principalSuffix = principalOpt.code.replace(/^fam_/, "");
        if (!taughtSuffixes.includes(principalSuffix)) {
          throw new DomainError(
            "La familia principal debe estar entre las familias en las que has impartido",
            "VALIDATION",
          );
        }
      }
    }
  }

  // Comentario abierto solo si indica que falta un problema
  const missingQ = questions.find((q) => q.code === "sector_missing_problem");
  const openQ = questions.find((q) => q.code === "open_comment");
  if (missingQ && openQ) {
    const missingAns = answers.find(
      (a) => a.questionId === missingQ.id && "optionId" in a,
    );
    const openAns = answers.find(
      (a) => a.questionId === openQ.id && "valueText" in a,
    );
    const yesOpt = missingQ.options.find((o) => o.code === "missing_yes");
    const saidYes =
      missingAns &&
      "optionId" in missingAns &&
      yesOpt &&
      missingAns.optionId === yesOpt.id;
    if (saidYes) {
      const text =
        openAns && "valueText" in openAns ? openAns.valueText.trim() : "";
      if (!text) {
        throw new DomainError(
          "Describe el problema que no aparece en la lista",
          "VALIDATION",
        );
      }
    }
  }

  for (const question of questions) {
    if (question.required && isQuestionApplicable(question, respondentType) && !answered.has(question.id)) {
      throw new DomainError(`Falta responder: ${question.label}`, "VALIDATION");
    }
  }
  return respondentType;
}

function flattenAnswers(
  sessionId: string,
  answers: AnswerInput[],
): Array<{
  session_id: string;
  question_id: string;
  option_id: string | null;
  value_text: string | null;
  value_number: number | null;
}> {
  const rows: Array<{
    session_id: string;
    question_id: string;
    option_id: string | null;
    value_text: string | null;
    value_number: number | null;
  }> = [];

  for (const answer of answers) {
    if ("optionId" in answer) {
      rows.push({
        session_id: sessionId,
        question_id: answer.questionId,
        option_id: answer.optionId,
        value_text: null,
        value_number: null,
      });
    } else if ("optionIds" in answer) {
      for (const optionId of answer.optionIds) {
        rows.push({
          session_id: sessionId,
          question_id: answer.questionId,
          option_id: optionId,
          value_text: null,
          value_number: null,
        });
      }
    } else if ("valueText" in answer) {
      rows.push({
        session_id: sessionId,
        question_id: answer.questionId,
        option_id: null,
        value_text: answer.valueText.trim(),
        value_number: null,
      });
    } else {
      rows.push({
        session_id: sessionId,
        question_id: answer.questionId,
        option_id: null,
        value_text: null,
        value_number: answer.valueNumber,
      });
    }
  }

  return rows;
}
