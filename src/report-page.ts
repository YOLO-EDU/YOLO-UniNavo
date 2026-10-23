import { getLanguage } from "./i18n.ts";
import { upcomingDeadlines } from "./data/deadlines.ts";
import { scenarioSchoolMap } from "./data/scenario-catalog.ts";
import {
  bestSat,
  courseChanges,
  type EditorId,
  type GradesState,
} from "./grades.ts";
import {
  addMeeting,
  addNote,
  removeMeeting,
  removeNote,
  type JournalState,
} from "./journal.ts";
import { dayLabel, reportTasks, type PersonalMonth } from "./home-page.ts";
import { satChart } from "./charts.ts";
import {
  buildReport,
  nextRange,
  periodSeries,
  previousRange,
  monthRange,
  rangeFor,
  reportHash,
  type Period,
  type Range,
  type Report,
  type ReportTask,
} from "./report.ts";

const w = (en: string, ko: string) => (getLanguage() === "ko" ? ko : en);
const esc = (v: unknown) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const hours = (minutes: number) =>
  minutes % 60
    ? w(`${(minutes / 60).toFixed(1)} h`, `${(minutes / 60).toFixed(1)}시간`)
    : w(`${minutes / 60} h`, `${minutes / 60}시간`);
const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);

export interface ReportUi {
  period: Period;
  anchor: string;
}

function chipLabel(period: Period, r: Range, today: string) {
  const current = r.start <= today && today <= r.end;
  if (period === "month") {
    const m = Number(r.start.slice(5, 7));
    return `${w(new Date(`${r.start}T12:00:00Z`).toLocaleDateString("en-CA", { month: "short", timeZone: "UTC" }), `${m}월`)}${current ? w(" · this month", " · 이번 달") : ""}`;
  }
  return `${w(dayLabel(r.start), `${Number(r.start.slice(5, 7))}월 ${Number(r.start.slice(8))}일 주`)}${current ? w(" · this week", " · 이번 주") : ""}`;
}
function rangeTitle(period: Period, r: Range) {
  return period === "week"
    ? `${dayLabel(r.start)} – ${dayLabel(r.end)}`
    : new Date(`${r.start}T12:00:00Z`).toLocaleDateString(
        getLanguage() === "ko" ? "ko-KR" : "en-CA",
        { year: "numeric", month: "long", timeZone: "UTC" },
      );
}

function barChart(
  series: { range: Range; done: number }[],
  period: Period,
  today: string,
) {
  const max = Math.max(1, ...series.map((s) => s.done));
  return `<div class="done-bars" role="img" aria-label="${esc(series.map((s) => `${chipLabel(period, s.range, today)}: ${s.done}`).join(", "))}">${series
    .map((s, i) => {
      const last = i === series.length - 1;
      return `<div><span class="bar-col"><i class="${last ? "is-last" : ""} ${s.done ? "" : "is-zero"}" style="height:${s.done ? Math.max((s.done / max) * 100, 8) : 4}%"></i></span><small class="${last ? "strong-green" : ""}">${period === "week" ? `${Number(s.range.start.slice(5, 7))}/${Number(s.range.start.slice(8))}` : `${Number(s.range.start.slice(5, 7))}${w("", "월")}`}</small></div>`;
    })
    .join("")}</div>`;
}

export function renderReportPage(input: {
  ui: ReportUi;
  today: string;
  months: PersonalMonth[];
  checked: Set<string>;
  journal: JournalState;
  grades: GradesState;
}) {
  const { ui, today, months, checked, journal, grades } = input;
  const range = rangeFor(ui.period, ui.anchor);
  const tasks = reportTasks(months);
  const personal = new Set(
    months.flatMap((m) => m.tasks.filter((t) => t.personal)).map((t) => t.id),
  );
  const lang = (id: string) =>
    personal.has(id) ? "data-original-language" : "";
  const make = (r: Range) =>
    buildReport({ range: r, tasks, checked, journal, grades });
  const report = make(range);
  const prev = make(previousRange(ui.period, range));
  const thisMonth = range.end.slice(0, 7);
  const isCurrent = range.end >= today;
  const deadlines = upcomingDeadlines(range.end < today ? range.end : today, 3);
  const best = bestSat(grades.sat.filter((a) => a.date <= range.end));
  const satDelta =
    report.sat.best !== null && report.sat.previous !== null
      ? report.sat.best - report.sat.previous
      : null;
  const unit = ui.period === "week" ? w("week", "주") : w("month", "달");
  const tone = {
    good: w("On track", "순조로워요"),
    watch: w("Needs attention", "챙겨야 해요"),
    quiet: w("Quiet", "조용했어요"),
  }[report.tone];
  const monthTasks = tasks.filter((t) => t.monthId === thisMonth);
  const monthDone = monthTasks.filter((t) => checked.has(t.id)).length;
  const chips = [
    report.done.length
      ? `✓ ${w(`${report.done.length} done`, `할 일 ${report.done.length}개 끝냄`)}`
      : w("Nothing checked off", "체크한 할 일 없음"),
    ui.period === "month" && monthTasks.length
      ? w(
          `Roadmap ${monthDone}/${monthTasks.length}`,
          `로드맵 이번 달 ${monthDone}/${monthTasks.length}`,
        )
      : "",
    report.sat.best !== null
      ? satDelta
        ? `SAT ${report.sat.previous} → ${report.sat.best} (${signed(satDelta)})`
        : `SAT ${report.sat.best}`
      : "",
    report.meetings.length
      ? w(
          `${report.meetings.length} meetings · ${hours(report.meetingMinutes)}`,
          `선생님 만남 ${report.meetings.length}회 · ${hours(report.meetingMinutes)}`,
        )
      : "",
  ].filter(Boolean);
  const series = periodSeries(
    ui.period,
    range.start,
    ui.period === "week" ? 8 : 6,
  ).map((r) => ({ range: r, done: make(r).done.length }));
  const chipRanges = periodSeries(ui.period, today, 4);
  const inChips = chipRanges.some((r) => r.start === range.start);
  const toolbar = `<div class="report-toolbar"><div class="segmented" role="group" aria-label="${w("Report type", "리포트 종류")}"><button data-report-period="week" aria-pressed="${ui.period === "week"}">${w("Weekly", "주간")}</button><button data-report-period="month" aria-pressed="${ui.period === "month"}">${w("Monthly", "월간")}</button></div><div class="period-chips" role="group" aria-label="${w("Period", "기간")}"><button class="icon-button" data-report-go="${previousRange(ui.period, range).start}" aria-label="${w("Previous", "이전")}">‹</button>${inChips ? "" : `<button class="period-chip is-on" aria-pressed="true">${chipLabel(ui.period, range, today)}</button>`}${chipRanges.map((r) => `<button class="period-chip ${r.start === range.start ? "is-on" : ""}" aria-pressed="${r.start === range.start}" data-report-go="${r.start}">${chipLabel(ui.period, r, today)}</button>`).join("")}<button class="icon-button" data-report-go="${nextRange(ui.period, range).start}" aria-label="${w("Next", "다음")}" ${isCurrent ? "disabled" : ""}>›</button></div><div class="report-actions"><button class="button button-light" id="print-report">${w("Save PDF", "PDF 저장")}</button><button class="button" id="copy-report">${w("Copy this report's link", "이 리포트 링크 복사")}</button></div></div>`;
  const printHead = `<div class="print-head"><span>UNINAVO · ${ui.period === "week" ? w("WEEKLY REPORT", "주간 리포트") : w("MONTHLY REPORT", "월간 리포트")}</span><span>YOLO Education · ${dayLabel(today)} ${w("generated", "생성")}</span></div>`;
  const head = `<section class="report-head"><span class="eyebrow">${rangeTitle(ui.period, range)}</span><h1 class="home-title">${ui.period === "week" ? w("Taeyul's week", "태율이의 한 주") : w("Taeyul's month", "태율이의 한 달")}</h1></section>`;
  const status = `<section class="report-status tone-${report.tone}" aria-label="${w("Status", "상태")}"><span class="report-tone">${tone}</span>${chips.map((c) => `<span class="status-chip">${esc(c)}</span>`).join("")}${report.overdue ? `<span class="status-chip is-warn">${w(`${report.overdue} carried over`, `밀린 일 ${report.overdue}개`)}</span>` : ""}${deadlines[0] ? `<span class="status-next">${w("Next official date", "다음 공식 일정")} · ${dayLabel(deadlines[0].date)} ${esc(w(deadlines[0].en, deadlines[0].ko))}</span>` : ""}</section>`;
  const vs = (now: number, before: number) =>
    now === before
      ? `<span class="small muted">${w(`Same as last ${unit}`, `지난${unit}와 같음`)}</span>`
      : `<span class="small ${now > before ? "up" : "overdue"}">${w(`${signed(now - before)} vs last ${unit}`, `지난${unit}보다 ${signed(now - before)}`)}</span>`;
  const stats = `<section class="home-stats report-stats" aria-label="${w("Summary", "요약")}"><div class="panel"><span class="small muted">${w("Completed", "끝낸 일")}</span><strong class="stat">${report.done.length}</strong>${vs(report.done.length, prev.done.length)}</div><div class="panel"><span class="small muted">${w("Best SAT", "SAT 최고점")}</span><strong class="stat">${best ?? "—"}</strong>${best !== null && grades.satTarget !== null ? `<span class="small ${best >= grades.satTarget ? "up" : "muted"}">${best >= grades.satTarget ? w("Target reached", "목표 달성") : w(`${grades.satTarget - best} to target`, `목표까지 ${grades.satTarget - best}`)}</span>` : satDelta ? `<span class="small up">${signed(satDelta)}</span>` : ""}</div><div class="panel"><span class="small muted">${w("Teacher meetings", "선생님 만남")}</span><strong class="stat">${report.meetings.length}<small>${w("", "회")}${report.meetingMinutes ? ` · ${hours(report.meetingMinutes)}` : ""}</small></strong>${vs(report.meetings.length, prev.meetings.length)}</div><div class="panel"><span class="small muted">${w("Still open", "남은 일")}</span><strong class="stat">${report.open.length}</strong>${report.overdue ? `<span class="small overdue">${w(`${report.overdue} carried over`, `밀린 일 ${report.overdue}`)}</span>` : `<span class="small muted">${w("None overdue", "밀린 일 없음")}</span>`}</div></section>`;
  const flow = `<section class="report-flow" aria-label="${w("Trends", "흐름")}"><div class="panel"><div class="panel-head"><h2>${ui.period === "week" ? w("Completed · last 8 weeks", "최근 8주 끝낸 일") : w("Completed · last 6 months", "최근 6개월 끝낸 일")}</h2><span class="small muted">${w(`Total ${series.reduce((n, s) => n + s.done, 0)}`, `합계 ${series.reduce((n, s) => n + s.done, 0)}개`)}</span></div>${barChart(series, ui.period, today)}</div><div class="panel"><div class="panel-head"><h2>${w("SAT trend", "SAT 추이")}</h2>${grades.satTarget ? `<span class="small muted">${w("Target", "목표")} ${grades.satTarget}</span>` : ""}</div>${satChart(grades, range.end)}</div></section>`;
  const doneList = (r: Report) =>
    r.done
      .map(
        (d) =>
          `<div class="date-row"><span><span aria-hidden="true">✓ </span><span ${lang(d.task.id)}>${esc(d.task.title)}</span></span><span class="small muted">${dayLabel(d.date)}</span></div>`,
      )
      .join("") ||
    `<p class="muted">${w(`Nothing checked off this ${unit}.`, `이번 ${unit}에 체크한 할 일이 없어요.`)}</p>`;
  const taskRow = (t: ReportTask, note: string, warn = false) =>
    `<label class="report-task ${warn ? "is-overdue" : ""}"><input type="checkbox" data-task="${t.id}"><span ${lang(t.id)}>${esc(t.title)}</span>${note ? `<span class="small ${warn ? "overdue" : "muted"}">${note}</span>` : ""}</label>`;
  const overdue = report.open.filter((t) => t.monthId < thisMonth);
  const current = report.open.filter((t) => t.monthId === thisMonth);
  const nextMonth = nextRange(
    "month",
    monthRange(`${thisMonth}-01`),
  ).start.slice(0, 7);
  const upcoming = tasks
    .filter((t) => t.monthId === nextMonth && !checked.has(t.id))
    .slice(0, 3);
  const openList = `<section class="panel" aria-labelledby="open-title"><h2 id="open-title">${w("Still to do", "남은 일")}</h2>${overdue.length ? `<div class="group-label is-warn">${w(`Carried over · ${overdue.length}`, `밀린 일 · ${overdue.length}`)}</div>${overdue.map((t) => taskRow(t, w(`from ${t.monthId.slice(5)}`, `${Number(t.monthId.slice(5))}월부터`), true)).join("")}` : ""}<div class="group-label">${w(`This month · ${current.length}`, `이번 달 · ${current.length}`)}</div>${current.map((t) => taskRow(t, "")).join("") || `<p class="small muted">${w("All done for this month.", "이번 달 할 일을 다 했어요.")}</p>`}${upcoming.length ? `<div class="group-label">${w(`Coming up · ${nextMonth.slice(5)}`, `다음 달 미리보기 · ${Number(nextMonth.slice(5))}월`)}</div><p class="upcoming-line">${upcoming.map((t) => `<span ${lang(t.id)}>${esc(t.title)}</span>`).join(" · ")}</p>` : ""}</section>`;
  const meetings = `<section class="panel" aria-labelledby="meet-title"><div class="panel-head"><h2 id="meet-title">${w("Meetings with the teacher", "선생님과 만남")}</h2></div>${report.meetings.map((m) => `<article class="journal-item"><div class="small strong-green">${dayLabel(m.date)} · ${m.minutes}${w(" min", "분")}</div><p data-original-language>${esc(m.summary)}</p><button class="text-button small" data-delete-meeting="${m.id}">${w("Delete", "삭제")}</button></article>`).join("") || `<p class="muted small">${w("No meetings recorded.", "기록된 만남이 없어요.")}</p>`}<details class="inline-form"><summary class="button button-light">＋ ${w("Record a meeting", "만남 기록")}</summary><form id="meeting-form" class="journal-form"><div class="grades-form-pair"><label>${w("Date", "날짜")}<input type="date" name="date" required value="${today}"></label><label>${w("Minutes", "시간(분)")}<input type="number" name="minutes" required min="5" max="600" step="5" value="60"></label></div><label>${w("What you did", "한 일")}<textarea name="summary" required rows="2" maxlength="2000"></textarea></label><button class="button" type="submit">${w("Save", "저장")}</button></form></details></section>`;
  const schoolLabel = (id?: string) => {
    const s = id ? scenarioSchoolMap.get(id) : undefined;
    return s ? ` · ${esc(w(s.name, s.nameKo))}` : "";
  };
  const notes = `<section class="panel" aria-labelledby="memo-title"><div class="panel-head"><h2 id="memo-title">${w("Notes", "메모")}${ui.period === "month" && report.notes.length ? ` · ${report.notes.length}` : ""}</h2></div>${report.notes.map((n) => `<article class="journal-item"><div class="small muted">${dayLabel(n.date)}${schoolLabel(n.schoolId)}</div><p data-original-language>${esc(n.text)}</p><div class="journal-actions"><button class="text-button small" data-note-task="${n.id}">＋ ${w("Add as a task", "할 일로 추가")}</button><button class="text-button small" data-delete-note="${n.id}">${w("Delete", "삭제")}</button></div></article>`).join("") || `<p class="muted small">${w("No notes yet.", "아직 메모가 없어요.")}</p>`}<details class="inline-form"><summary class="button button-light">＋ ${w("Note", "메모")}</summary><form id="note-form" class="journal-form"><label><span class="sr-only">${w("Leave a note", "메모 남기기")}</span><textarea name="text" required rows="3" maxlength="2000"></textarea></label><button class="button" type="submit">${w("Save note", "남기기")}</button></form></details></section>`;
  const dates = `<section class="panel report-dates" aria-labelledby="dates-title"><h2 id="dates-title">${w("Upcoming official dates", "다가오는 공식 일정")}</h2>${deadlines.map((d) => `<div class="date-row"><strong>${dayLabel(d.date)}</strong><span>${esc(w(d.en, d.ko))}</span></div>`).join("") || `<p class="muted small">—</p>`}</section>`;
  let body: string;
  if (ui.period === "week") {
    body = `<div class="home-split"><div class="report-main"><section class="panel" aria-labelledby="done-title"><h2 id="done-title">${w("Done", "한 일")}</h2>${doneList(report)}</section>${openList}</div><div class="home-side">${meetings}${notes}${dates}</div></div>`;
  } else {
    const changes = courseChanges(grades, range);
    const changeRows = changes.length
      ? `<div class="change-table"><span class="th">${w("Course", "과목")}</span><span class="th num">${w("Before", "지난달")}</span><span class="th num">${w("Now", "이번 달")}</span><span class="th num">${w("Change", "변화")}</span>${changes
          .map(({ course, before, after }) => {
            const d = before !== null && after !== null ? after - before : null;
            return `<span><span data-original-language>${esc(course.name)}</span> <small class="muted">${esc(course.code)}</small></span><span class="num">${before ?? "—"}</span><span class="num strong">${after}</span><span class="num ${d === null ? "muted" : d > 0 ? "up" : d < 0 ? "overdue" : "muted"}">${d === null ? w("new", "새로") : d === 0 ? "—" : signed(Math.round(d * 10) / 10)}</span>`;
          })
          .join("")}</div>`
      : `<p class="muted small">${w("No marks entered yet.", "아직 입력한 내신이 없어요.")}</p>`;
    const totalTasks = tasks.length;
    const totalDone = tasks.filter((t) => checked.has(t.id)).length;
    const monthMeta = months.find((m) => m.id === thisMonth);
    const weeks = periodSeries("week", range.end, 6).filter(
      (r) => r.end >= range.start && r.start <= today,
    );
    body = `<div class="report-two"><section class="panel"><h2>${w("Course changes", "과목별 점수 변화")}</h2>${changeRows}</section><section class="panel"><h2>${w("Roadmap progress", "로드맵 진행")}</h2><div class="progress-line"><span>${monthMeta ? `${Number(thisMonth.slice(5))}${w("", "월")} · ${esc(monthMeta.title)}` : thisMonth}</span><strong>${monthDone} / ${monthTasks.length}</strong></div><span class="stat-bar"><i style="width:${monthTasks.length ? Math.round((monthDone / monthTasks.length) * 100) : 0}%"></i></span><div class="progress-line muted"><span>${w("All 23 months", "전체 23개월")}</span><span>${totalDone} / ${totalTasks}</span></div><span class="stat-bar thin"><i style="width:${Math.round((totalDone / Math.max(totalTasks, 1)) * 100)}%"></i></span>${upcoming.length ? `<div class="group-label">${w(`Next month · ${nextMonth.slice(5)}`, `다음 달 · ${Number(nextMonth.slice(5))}월`)}</div><p class="upcoming-line">${upcoming.map((t) => `<span ${lang(t.id)}>${esc(t.title)}</span>`).join(" · ")}</p>` : ""}</section></div><div class="report-two"><section class="panel"><h2>${w(`Done this month · ${report.done.length}`, `이번 달 한 일 · ${report.done.length}`)}</h2>${doneList(report)}</section>${notes}</div><div class="report-two">${meetings}${openList}</div><section class="panel"><h2>${w("Weeks", "주별 요약")}</h2><div class="week-cards">${weeks
      .map((r) => {
        const wr = make(r);
        const toneLabel = {
          good: w("On track", "순조로워요"),
          watch: w("Needs attention", "챙겨야 해요"),
          quiet: w("Quiet", "조용했어요"),
        }[wr.tone];
        return `<button class="week-card tone-${wr.tone}" data-report-week="${r.start}"><span class="small muted">${chipLabel("week", r, today)}</span><strong>${w(`${wr.done.length} done`, `${wr.done.length}개 끝냄`)}</strong><span class="small">${toneLabel}</span></button>`;
      })
      .join("")}</div></section>`;
  }
  return `${toolbar}${printHead}${head}${status}${stats}${flow}${body}<p class="print-foot">${w("Planning guidance, not an admission guarantee.", "입학 준비를 위한 안내이며 합격을 보장하지 않습니다.")}</p>`;
}

export interface ReportContext {
  ui: ReportUi;
  today: string;
  editor: () => EditorId;
  journal: () => JournalState;
  saveJournal: (next: JournalState) => void;
  addTaskFromNote: (text: string) => void;
  go: (period: Period, anchor: string) => void;
  announce: (message: string) => void;
}

export function bindReportPage(ctx: ReportContext) {
  document
    .querySelectorAll<HTMLButtonElement>("[data-report-period]")
    .forEach((b) =>
      b.addEventListener("click", () =>
        ctx.go(b.dataset.reportPeriod as Period, ctx.ui.anchor),
      ),
    );
  document
    .querySelectorAll<HTMLButtonElement>("[data-report-go]")
    .forEach((b) =>
      b.addEventListener("click", () =>
        ctx.go(ctx.ui.period, b.dataset.reportGo!),
      ),
    );
  document
    .querySelectorAll<HTMLButtonElement>("[data-report-week]")
    .forEach((b) =>
      b.addEventListener("click", () => ctx.go("week", b.dataset.reportWeek!)),
    );
  document.querySelector("#print-report")?.addEventListener("click", () => {
    window.print();
  });
  document
    .querySelector("#copy-report")
    ?.addEventListener("click", async () => {
      const url = `${location.origin}${location.pathname}${reportHash(ctx.ui.period, rangeFor(ctx.ui.period, ctx.ui.anchor))}`;
      try {
        await navigator.clipboard.writeText(url);
        ctx.announce(w("Link copied.", "링크를 복사했어요."));
      } catch {
        window.prompt(w("Copy this link", "이 링크를 복사하세요"), url);
      }
    });
  document
    .querySelector<HTMLFormElement>("#note-form")
    ?.addEventListener("submit", (event) => {
      event.preventDefault();
      const form = event.currentTarget as HTMLFormElement;
      const text = String(new FormData(form).get("text") ?? "").trim();
      if (!text) return;
      ctx.saveJournal(
        addNote(ctx.journal(), {
          id: `note-${crypto.randomUUID()}`,
          author: ctx.editor(),
          date: ctx.today,
          text,
        }),
      );
    });
  document
    .querySelector<HTMLFormElement>("#meeting-form")
    ?.addEventListener("submit", (event) => {
      event.preventDefault();
      const form = event.currentTarget as HTMLFormElement;
      if (!form.reportValidity()) return;
      const data = new FormData(form);
      ctx.saveJournal(
        addMeeting(ctx.journal(), {
          id: `meeting-${crypto.randomUUID()}`,
          author: ctx.editor(),
          date: String(data.get("date")),
          minutes: Number(data.get("minutes")),
          summary: String(data.get("summary") ?? "").trim(),
        }),
      );
    });
  document
    .querySelectorAll<HTMLButtonElement>("[data-delete-note]")
    .forEach((b) =>
      b.addEventListener("click", () =>
        ctx.saveJournal(removeNote(ctx.journal(), b.dataset.deleteNote!)),
      ),
    );
  document
    .querySelectorAll<HTMLButtonElement>("[data-delete-meeting]")
    .forEach((b) =>
      b.addEventListener("click", () =>
        ctx.saveJournal(removeMeeting(ctx.journal(), b.dataset.deleteMeeting!)),
      ),
    );
  document
    .querySelectorAll<HTMLButtonElement>("[data-note-task]")
    .forEach((b) =>
      b.addEventListener("click", () => {
        const note = ctx
          .journal()
          .notes.find((n) => n.id === b.dataset.noteTask);
        if (note) ctx.addTaskFromNote(note.text);
      }),
    );
}
