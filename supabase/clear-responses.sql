-- ============================================================================
-- Script para limpiar TODAS las respuestas de la encuesta
-- ============================================================================
-- ADVERTENCIA: Esto eliminará PERMANENTEMENTE todas las respuestas.
-- Usa esto solo para resetear a estado inicial sin datos de demostración.
-- ============================================================================

BEGIN;

-- 1. Eliminar todas las respuestas individuales.
-- La tabla se llama `answers` en el esquema actual; al borrarla primero se
-- mantiene explícito el orden de las relaciones.
DELETE FROM public.answers;

-- 2. Eliminar todas las sesiones de respuesta
DELETE FROM public.response_sessions;

COMMIT;

-- Verificar que todo está limpio
SELECT
  (SELECT COUNT(*) FROM public.answers) AS answers,
  (SELECT COUNT(*) FROM public.response_sessions) AS response_sessions;

-- Deberías ver 0 registros en ambas tablas
