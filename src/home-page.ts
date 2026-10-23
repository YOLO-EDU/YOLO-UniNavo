import { getLanguage } from "./i18n.ts";
import { candidatePlan, normalizeCandidateInput } from "./candidate-plans.ts";
import { upcomingDeadlines } from "./data/deadlines.ts";
import type { GradesState } from "./grades.ts";
import type { JournalState } from "./journal.ts";
import { gradeInput, satPosition, type SatPosition } from "./matching.ts";
import type { PersonalTask } from "./planner.ts";
import { buildReport, weekRange, type ReportTask } from "./report.ts";
import { categoryLabels, taskCategory } from "./task-category.ts";
import type { Month } from "./types.ts";

const w = (en: string, ko: string) => (getLanguage() === "ko" ? ko : en);
const esc = (v: unknown) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export const dayLabel = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString(
    getLanguage() === "ko" ? "ko-KR" : "en-CA",
    { month: "short", day: "numeric", timeZone: "UTC" },
  );
const monthName = (id: string) =>
  new Date(`${id}-01T12:00:00Z`).toLocaleDateString(
    getLanguage() === "ko" ? "ko-KR" : "en-CA",
    { month: "short", timeZone: "UTC" },
  );
const daysBetween = (from: string, to: string) =>
  Math.round(
    (Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) /
      86_400_000,
  );

export type PersonalMonth = Omit<Month, "tasks"> & { tasks: PersonalTask[] };
export const reportTasks = (months: PersonalMonth[]): ReportTask[] =>
  months.flatMap((m) =>
    m.tasks.map((t) => ({ id: t.id, monthId: m.id, title: t.title })),
  );

export const positionLabels: Record<SatPosition, [string, string]> = {
  within: ["Within middle 50%", "SAT 중간 50% 안"],
  below: ["Below", "아래"],
  above: ["Above", "위"],
  "no-data": ["No published range", "분포 자료 없음"],
  "not-considered": ["SAT not considered", "SAT 미반영"],
};

function universitySummary(grades: GradesState) {
  const input = gradeInput(grades);
  if (!input || !input.band || input.sat === null)
    return `<p class="muted small">${w("Enter marks and an SAT score to see a shortlist.", "내신과 SAT 점수를 입력하면 후보가 나와요.")}</p><a class="text-link" href="#grades">${w("Enter grades →", "성적 입력하기 →")}</a>`;
  const plan = candidatePlan(
    normalizeCandidateInput({ band: input.band, sat: input.sat }),
  );
  if (!plan.selected.length)
    return `<p class="muted small">${w("The researched lists start at SAT 1100.", "조사한 목록은 SAT 1100부터예요.")}</p>`;
  const counts = { within: 0, below: 0, rest: 0 };
  for (const s of plan.selected) {
    const p = satPosition(s, input.sat);
    if (p === "within") counts.within++;
    else if (p === "below") counts.below++;
    else counts.rest++;
  }
  const preview = plan.selected
    .filter((s) => s.satRange && s.testing.policy !== "not-considered")
    .slice(0, 3);
  return `<div class="uni-stack" role="img" aria-label="${esc(w(`${counts.within} within, ${counts.below} below, ${counts.rest} without a range`, `범위 안 ${counts.within}곳, 아래 ${counts.below}곳, 자료 없음 ${counts.rest}곳`))}"><span class="s-within" style="flex:${counts.within}"></span><span class="s-below" style="flex:${counts.below}"></span><span class="s-rest" style="flex:${counts.rest}"></span></div><div class="uni-legend small"><span><i class="s-within"></i>${w("Within", "범위 안")} ${counts.within}</span><span><i class="s-below"></i>${w("Below", "아래")} ${counts.below}</span><span><i class="s-rest"></i>${w("No range", "자료 없음")} ${counts.rest}</span></div>${preview
    .map((s) => {
      const p = satPosition(s, input.sat);
      return `<div class="date-row"><span>${esc(w(s.name, s.nameKo))}</span><span class="small ${p === "within" ? "up" : p === "below" ? "overdue" : "muted"}">${p === "below" ? w(`${s.satRange!.low - input.sat!} below`, `${s.satRange!.low - input.sat!}점 아래`) : p === "within" ? w("Within", "범위 안") : w("Above", "위")}</span></div>`;
    })
    .join("")}`;
}

export function renderHomePage(input: {
  today: string;
  months: PersonalMonth[];
  checked: Set<string>;
  journal: JournalState;
  grades: GradesState;
}) {
  const { today, months, checked, journal, grades } = input;
  const range = weekRange(today);
  const tasks = reportTasks(months);
  const report = buildReport({ range, tasks, checked, journal, grades });
  const byId = new Map(months.flatMap((m) => m.tasks).map((t) => [t.id, t]));
  const thisMonth = today.slice(0, 7);
  const deadlines = upcomingDeadlines(today, 12);
  const next = deadlines[0];
  const total = report.done.length + report.open.length;
  const gi = gradeInput(grades);
  const best = gi?.sat ?? null;
  const target = grades.satTarget;
  const lang = (id: string) =>
    byId.get(id)?.personal ? "data-original-language" : "";
  const dueFor = (id: string) => {
    const t = byId.get(id);
    if (!t) return null;
    const cat = taskCategory(t);
    const d =
      cat === "ap"
        ? deadlines.find((x) => x.sourceIds.includes("ap-order"))
        : cat === "sat"
          ? deadlines.find((x) => x.en.startsWith("SAT registration"))
          : undefined;
    return d ?? null;
  };
  const tags = (id: string, overdue: boolean) => {
    const t = byId.get(id);
    if (!t) return "";
    const due = dueFor(id);
    return `<span class="task-tags"><span class="task-tag">${w(...categoryLabels[taskCategory(t)])}</span>${overdue ? `<span class="task-tag is-warn">${w(`From ${monthName(t.id.slice(0, 7))}`, `${monthName(t.id.slice(0, 7))}부터`)}</span>` : due ? `<span class="task-tag is-due">${w(`Before ${dayLabel(due.date)}`, `${dayLabel(due.date)} 전`)}</span>` : ""}</span>`;
  };
  const openRows = report.open
    .map(
      (t) =>
        `<label class="home-task"><input type="checkbox" data-task="${t.id}"><span><span class="home-task-title" ${lang(t.id)}>${esc(t.title)}</span>${tags(t.id, t.monthId < thisMonth)}</span></label>`,
    )
    .join("");
  const doneRows = report.done
    .map(
      (d) =>
        `<label class="home-task is-complete"><input type="checkbox" data-task="${d.task.id}" checked><span><span class="home-task-title" ${lang(d.task.id)}>${esc(d.task.title)}</span><span class="small muted">${w("Done", "완료")} ${dayLabel(d.date)}</span></span></label>`,
    )
    .join("");
  const daysLeft = next ? daysBetween(today, next.date) : null;
  const summary = `${total ? w(`${report.done.length} of ${total} done.`, `${total}개 중 ${report.done.length}개 끝냈어요.`) : w("Nothing scheduled this week.", "이번 주에 잡힌 할 일이 없어요.")} ${next ? (daysLeft === 0 ? w(`<strong class="overdue">${esc(next.en)} closes today.</strong>`, `<strong class="overdue">오늘 ${esc(next.ko)}</strong>이에요.`) : w(`Next: ${esc(next.en)} in ${daysLeft} days.`, `다음 마감은 ${daysLeft}일 뒤 ${esc(next.ko)}예요.`)) : ""}`;
  const pct = total ? Math.round((report.done.length / total) * 100) : 0;
  const latestNote = journal.notes[0];
  const ahead = months
    .filter((m) => m.id > thisMonth)
    .slice(0, 3)
    .map(
      (m, i) =>
        `<div class="ahead-card ahead-${i}"><span class="small strong-green">${monthName(m.id)}${m.id.slice(0, 4) !== thisMonth.slice(0, 4) ? ` ${m.id.slice(0, 4)}` : ""}</span><strong>${esc(m.title)}</strong><span class="ahead-tasks small">${m.tasks
          .slice(0, 3)
          .map(
            (t) =>
              `<span ${t.personal ? "data-original-language" : ""}>${esc(t.title)}</span>`,
          )
          .join("")}</span></div>`,
    )
    .join("");
  return `<header class="home-head v2"><span class="eyebrow">${dayLabel(range.start)} – ${dayLabel(range.end)}</span><h1 class="home-title">${w("This week", "이번 주에 할 일")}</h1><p class="home-summary">${summary}</p></header>
  <section class="home-glance" aria-label="${w("At a glance", "한눈에")}"><div class="glance-deadline">${next ? `<span class="dday-badge"><small>${w("Due", "마감")}</small><strong>${daysLeft === 0 ? w("Today", "오늘") : `D-${daysLeft}`}</strong></span><span><span class="small">${w("Next official date", "다음 공식 마감")}</span><strong>${esc(w(next.en, next.ko))}</strong>${deadlines[1] ? `<span class="small">${w("Then", "그다음")} ${dayLabel(deadlines[1].date)} ${esc(w(deadlines[1].en, deadlines[1].ko))}</span>` : ""}</span>` : `<span class="small">${w("No upcoming official dates", "다가오는 공식 일정 없음")}</span>`}</div><div class="panel glance-progress"><span class="ring" role="img" aria-label="${esc(w(`${report.done.length} of ${total} done`, `${total}개 중 ${report.done.length}개 완료`))}" style="--pct:${pct}%"><span>${report.done.length}/${total}</span></span><span><span class="small muted">${w("This week", "이번 주 진행")}</span><span>${w(`${report.open.length} open · ${report.overdue} carried over`, `남은 일 ${report.open.length} · 밀린 일 ${report.overdue}`)}</span></span></div><div class="panel glance-sat">${best !== null ? `<span class="glance-row small muted"><span>SAT</span>${target ? `<span>${w("Target", "목표")} ${target}</span>` : ""}</span><strong class="stat">${best}${report.sat.previous !== null && best > report.sat.previous ? ` <small class="up">+${best - report.sat.previous}</small>` : ""}</strong>${target ? `<span class="stat-bar"><i style="width:${Math.min(Math.round(((best - 400) / Math.max(target - 400, 1)) * 100), 100)}%"></i></span><span class="small muted">${best >= target ? w("Target reached", "목표 달성") : w(`${target - best} to go`, `목표까지 ${target - best}점`)}${gi ? ` · ${w("average", "내신")} ${gi.average}%` : ""}</span>` : `<span class="small muted">${gi ? `${w("Average", "내신")} ${gi.average}%` : ""}</span>`}` : `<span class="small muted">SAT</span><a class="text-link" href="#grades">${w("Add a score →", "점수 입력하기 →")}</a>`}</div></section>
  <div class="home-split"><section class="panel" aria-labelledby="home-tasks-title"><div class="panel-head"><h2 id="home-tasks-title">${w("To do", "할 일")}</h2><a class="text-link" href="#timeline">${w("Full plan →", "전체 계획 →")}</a></div>${openRows || `<p class="muted">${w("Nothing left for now.", "지금은 남은 할 일이 없어요.")}</p>`}${doneRows ? `<details class="done-fold"><summary>${w(`Show ${report.done.length} done`, `끝낸 일 ${report.done.length}개 보기`)}</summary>${doneRows}</details>` : ""}<form id="quick-task" class="quick-task"><label><span class="sr-only">${w("Add a task", "할 일 추가")}</span><input name="title" maxlength="180" placeholder="${w("+ Add a task for this week", "+ 이번 주 할 일 추가")}"></label></form></section>
  <div class="home-side">${latestNote ? `<section class="memo-card" aria-labelledby="home-memo-title"><h2 id="home-memo-title">${w("Latest note", "최근 메모")}</h2><p data-original-language>${esc(latestNote.text)}</p><span class="small">${dayLabel(latestNote.date)} · <a href="#report">${w("Open report", "리포트에서 보기")}</a></span></section>` : ""}<section class="panel" aria-labelledby="home-uni-title"><div class="panel-head"><h2 id="home-uni-title">${w("My university shortlist", "내 대학 후보 10곳")}</h2><a class="text-link" href="#universities">${w("View →", "보기 →")}</a></div>${universitySummary(grades)}</section></div></div>
  <section class="panel" aria-labelledby="home-ahead-title"><div class="panel-head"><h2 id="home-ahead-title">${w("Next three months", "앞으로 3개월")}</h2><span class="small muted">${w("Roadmap", "전체 로드맵")} ${tasks.filter((t) => checked.has(t.id)).length} / ${tasks.length} · <a href="#timeline">${w("All 23 months", "23개월 전체 보기")}</a></span></div><div class="ahead-grid">${ahead}</div></section>`;
}
