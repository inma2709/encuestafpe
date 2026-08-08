import type { HeadlineCard, KpiCard } from "@/types";
import type { MetricId, MetricOptionResult, MetricResult } from "./analyticsTypes";

export function metricOptions(metric: MetricResult | undefined): MetricOptionResult[] {
  return metric && "options" in metric ? metric.options : [];
}

export function topMetricOption(metric: MetricResult | undefined): MetricOptionResult | null {
  return metricOptions(metric).slice().sort((a, b) => b.count - a.count)[0] ?? null;
}

export function metricPercentage(metric: MetricResult | undefined, codes: readonly string[]): number | null {
  if (!metric || !("options" in metric) || metric.denominator.nValid === 0) return null;
  return Math.round(metric.options.filter((option) => codes.includes(option.code)).reduce((sum, option) => sum + option.percentage, 0) * 10) / 10;
}

export function metricKpi(id: string, metric: MetricResult | undefined, label: string, value: string, hint?: string): KpiCard {
  return { id, value, label, hint, suppressed: !metric || metric.sampleStatus === "hidden" || metric.sampleStatus === "very_low" };
}

export function dashboardKpis(metrics: Map<MetricId, MetricResult>): KpiCard[] {
  const main = metricPercentage(metrics.get("fpe_main_activity"), ["main_yes"]);
  const months = topMetricOption(metrics.get("months_worked_distribution"));
  const relation = metricPercentage(metrics.get("employment_relation_distribution"), ["rel_self"]);
  const income = topMetricOption(metrics.get("annual_income_distribution"));
  const unpaid = topMetricOption(metrics.get("unpaid_hours_distribution"));
  return [
    metricKpi("main", metrics.get("fpe_main_activity"), "considera la FPE su actividad principal", main == null ? "—" : `${Math.round(main)}%`),
    metricKpi("months", metrics.get("months_worked_distribution"), "tramo más frecuente de meses al año", months?.label ?? "—", months ? `${months.percentage}% · n=${months.count}` : undefined),
    metricKpi("self", metrics.get("employment_relation_distribution"), "autónomos/as", relation == null ? "—" : `${Math.round(relation)}%`),
    metricKpi("income", metrics.get("annual_income_distribution"), "tramo anual de ingresos FPE más frecuente", income?.label ?? "—", income ? `${income.percentage}%` : undefined),
    metricKpi("unpaid", metrics.get("unpaid_hours_distribution"), "horas no remuneradas más habituales", unpaid?.label ?? "—", unpaid ? `${unpaid.percentage}%` : undefined),
  ];
}

export function buildInsightHeadlines(metrics: Map<MetricId, MetricResult>): HeadlineCard[] {
  const main = metricPercentage(metrics.get("fpe_main_activity"), ["main_yes"]);
  const unpaid = metricPercentage(metrics.get("unpaid_hours_distribution"), ["unpaid_4_6", "unpaid_7_10", "unpaid_gt10"]);
  const problems = topMetricOption(metrics.get("sector_problems_ranking"));
  const cards: HeadlineCard[] = [];
  if (main != null && main >= 40) cards.push({ id: "main", text: `${Math.round(main)}% considera la FPE su actividad profesional principal.`, diffPp: main, n: metrics.get("fpe_main_activity")!.denominator.nValid });
  if (unpaid != null && unpaid >= 35) cards.push({ id: "unpaid", text: `${Math.round(unpaid)}% dedica cuatro o más horas semanales a trabajo no remunerado.`, diffPp: unpaid, n: metrics.get("unpaid_hours_distribution")!.denominator.nValid });
  if (problems) cards.push({ id: "problem", text: `El problema más señalado es «${problems.label}» (${problems.percentage}%).`, diffPp: problems.percentage, n: metrics.get("sector_problems_ranking")!.denominator.nValid });
  return cards.slice(0, 3);
}
