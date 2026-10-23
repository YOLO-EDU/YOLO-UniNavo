import { getLanguage } from "./i18n.ts";
import { satTotal, type GradesState } from "./grades.ts";
import { dayLabel } from "./home-page.ts";

const w = (en: string, ko: string) => (getLanguage() === "ko" ? ko : en);
const esc = (v: unknown) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );

// Recent SAT totals as a small line chart with the target as a dashed line.
export function satChart(grades: GradesState, end: string) {
  const points = grades.sat.filter((a) => a.date <= end).slice(-6);
  if (!points.length)
    return `<p class="muted small">${w("No SAT scores yet.", "아직 SAT 점수가 없어요.")}</p>`;
  const target = grades.satTarget;
  const values = points.map(satTotal);
  const lo = Math.min(...values, target ?? Infinity) - 40;
  const hi = Math.max(...values, target ?? -Infinity) + 40;
  const y = (v: number) => 100 - ((v - lo) / Math.max(hi - lo, 1)) * 80;
  const x = (i: number) =>
    points.length === 1 ? 200 : 40 + (i * 320) / (points.length - 1);
  const label = points
    .map((a) => `${dayLabel(a.date)} ${satTotal(a)}`)
    .join(", ");
  return `<svg class="sat-trend" role="img" aria-label="${esc(`SAT ${label}${target ? `, ${w("target", "목표")} ${target}` : ""}`)}" viewBox="0 0 400 120">${target ? `<line x1="20" x2="380" y1="${y(target)}" y2="${y(target)}" class="trend-target"></line><text x="380" y="${y(target) - 6}" text-anchor="end" class="trend-target-label">${w("target", "목표")} ${target}</text>` : ""}${points.length > 1 ? `<polyline points="${points.map((a, i) => `${x(i)},${y(satTotal(a))}`).join(" ")}" class="trend-line"></polyline>` : ""}${points.map((a, i) => `<circle cx="${x(i)}" cy="${y(satTotal(a))}" r="${i === points.length - 1 ? 6 : 4}" class="${i === points.length - 1 ? "trend-last" : "trend-dot"}"></circle><text x="${x(i)}" y="${Math.min(y(satTotal(a)) + 22, 116)}" text-anchor="middle" class="trend-label">${satTotal(a)}</text>`).join("")}</svg>`;
}
