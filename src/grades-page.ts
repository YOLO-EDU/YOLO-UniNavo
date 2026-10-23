import { getLanguage, localize } from "./i18n.ts";
import {
  coreAverage,
  gradeBand,
  removeAp,
  removeCourse,
  removeSat,
  saveAp,
  saveCourse,
  saveSat,
  satTotal,
  simpleAverage,
  suggestTag,
  bestSat,
  courseScore,
  lastChange,
  setSatTarget,
  type ApPlan,
  type CourseGrade,
  type CourseTag,
  type EditorId,
  type GradesState,
} from "./grades.ts";
import { satChart } from "./charts.ts";

const w = (en: string, ko: string) => (getLanguage() === "ko" ? ko : en);
const esc = (v: unknown) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export const todayIso = () => new Date().toLocaleDateString("en-CA");
const shortDate = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString(
    getLanguage() === "ko" ? "ko-KR" : "en-CA",
    { month: "short", day: "numeric", timeZone: "UTC" },
  );

const tagLabels: Record<CourseTag, [string, string]> = {
  required: ["Required", "필수"],
  major: ["Major-related", "전공 관련"],
  science: ["Check science requirement", "과학 요건 확인"],
  other: ["Other", "기타"],
};
const apStatusLabels: Record<ApPlan["status"], [string, string]> = {
  considering: ["Considering", "검토 중"],
  "checking-school": ["Finding a test school", "응시 학교 확인 중"],
  registered: ["Registered", "신청 완료"],
  done: ["Exam taken", "응시 완료"],
};

export interface GradesUi {
  grade: number;
  notice: string;
  canUndo: boolean;
}

const tagShort: Record<CourseTag, [string, string]> = {
  required: ["Required", "필수"],
  major: ["Major", "전공"],
  science: ["Science req.", "과학 요건"],
  other: ["", ""],
};
const apSteps: ApPlan["status"][] = [
  "considering",
  "checking-school",
  "registered",
  "done",
];
const apStepLabels: Record<ApPlan["status"], [string, string]> = {
  considering: ["Review", "검토"],
  "checking-school": ["School", "학교 확인"],
  registered: ["Registered", "신청"],
  done: ["Taken", "응시"],
};

function marksList(state: GradesState, courses: CourseGrade[]) {
  if (!courses.length)
    return `<p class="empty-state grades-empty">${w("No courses for this grade yet. Add the first one.", "이 학년에 입력한 과목이 아직 없어요. 첫 과목을 추가하세요.")}</p>`;
  const sorted = [...courses].sort(
    (a, b) => (courseScore(b) ?? -1) - (courseScore(a) ?? -1),
  );
  // Bars run from 60 to 100 so differences between typical marks are visible.
  const pct = (n: number) => Math.min(Math.max(((n - 60) / 40) * 100, 2), 100);
  return `<div class="marks-grid"><div class="mark-row is-head"><span class="th">${w("Course", "과목")}</span><span class="th scale"><span>60</span><span>70</span><span>80</span><span>90</span><span>100</span></span><span class="th num">${w("Mark", "점수")}</span><span class="th num">${w("Change", "변화")}</span><span class="th"><span class="sr-only">${w("Edit", "수정")}</span></span></div>${sorted
    .map((c) => {
      const score = courseScore(c);
      const low = score !== null && score < 75;
      const change = lastChange(state, c.id);
      const [en, ko] = tagShort[c.tag];
      return `<div class="mark-row"><span class="mark-name"><strong data-original-language>${esc(c.name)}</strong>${en ? ` <span class="grade-tag tag-${c.tag}">${w(en, ko)}</span>` : ""}<small class="muted" data-original-language>${esc(c.code) || "—"} · ${c.final !== null ? w("Final", "최종") : w("Midterm", "중간")}</small></span><span class="mark-bar"><i class="${low ? "is-low" : c.tag === "other" ? "is-other" : ""}" style="width:${score === null ? 0 : pct(score)}%"></i></span><span class="num mark-score ${low ? "overdue" : ""}">${score ?? "—"}</span><span class="num ${change === null || change === 0 ? "muted" : change > 0 ? "up" : "overdue"}">${change === null || change === 0 ? "—" : `${change > 0 ? "▲" : "▼"} ${Math.abs(change)}`}</span><button class="icon-button mark-edit" data-edit-course="${c.id}" aria-label="${esc(w(`Edit ${c.name}`, `${c.name} 수정`))}">✎</button></div>`;
    })
    .join(
      "",
    )}</div><p class="small muted">${w("Highest first · change since the previous entry · below 75 in orange", "점수 높은 순 · 변화는 지난번 입력 대비 · 75점 아래는 주황색")}</p>`;
}

function satCard(state: GradesState) {
  const attempts = [...state.sat].reverse();
  return `<section class="grades-card" aria-labelledby="sat-history-title"><div class="grades-card-head"><h2 id="sat-history-title">SAT</h2></div>${satChart(state, "9999-12-31")}${attempts
    .map(
      (a) =>
        `<div class="sat-row"><span>${shortDate(a.date)} · ${a.kind === "official" ? w("Official", "실전") : w("Practice", "모의")}</span><span class="small muted">${w("R&W", "읽기·쓰기")} ${a.readingWriting} · ${w("Math", "수학")} ${a.math}</span><strong>${satTotal(a)}</strong><button class="text-button small" data-delete-sat="${a.id}" aria-label="${esc(w(`Delete ${shortDate(a.date)} score`, `${shortDate(a.date)} 점수 삭제`))}">${w("Delete", "삭제")}</button></div>`,
    )
    .join(
      "",
    )}<details class="inline-form"><summary class="button button-light">＋ ${w("Add a score", "점수 추가")}</summary><form id="sat-form" class="grades-form"><label>${w("Date", "날짜")}<input type="date" name="date" required value="${todayIso()}"></label><fieldset class="kind-choice"><legend>${w("Type", "종류")}</legend><label><input type="radio" name="kind" value="practice" checked>${w("Practice", "모의")}</label><label><input type="radio" name="kind" value="official">${w("Official", "실전")}</label></fieldset><div class="grades-form-pair"><label>${w("Reading & Writing", "읽기·쓰기")}<input type="number" name="readingWriting" required min="200" max="800" step="10" inputmode="numeric" placeholder="200–800"></label><label>${w("Math", "수학")}<input type="number" name="math" required min="200" max="800" step="10" inputmode="numeric" placeholder="200–800"></label></div><button class="button" type="submit">${w("Save", "저장")}</button></form></details><form id="grades-target-form" class="target-line"><label>${w("Target", "목표")} <input name="target" type="number" min="400" max="1600" step="10" inputmode="numeric" value="${state.satTarget ?? ""}" placeholder="1300"></label><button class="text-button small" type="submit">${w("Save", "저장")}</button></form></section>`;
}

function apCard(state: GradesState) {
  return `<section class="grades-card" aria-labelledby="ap-plan-title"><div class="grades-card-head"><h2 id="ap-plan-title">${w("AP plan", "AP 계획")}</h2><a class="text-link" href="#ap">${w("Suggested subjects →", "추천 과목 보기 →")}</a></div>${
    state.ap.length
      ? state.ap
          .map((p) => {
            const at = apSteps.indexOf(p.status);
            return `<article class="ap-card"><div class="ap-plan-head"><strong data-original-language>${esc(p.course)}</strong><button class="text-button small" data-delete-ap="${p.id}" aria-label="${esc(w(`Delete ${p.course}`, `${p.course} 삭제`))}">${w("Delete", "삭제")}</button></div><span class="small muted">${p.mode === "exam-only" ? w("Exam only", "시험만 응시") : w("Course and exam", "수업과 시험")}</span><div class="ap-steps" role="group" aria-label="${w("Progress", "진행 단계")}">${apSteps
              .map(
                (step, i) =>
                  `<button data-ap-step="${p.id}|${step}" aria-pressed="${i === at}" class="${i < at ? "is-done" : i === at ? "is-now" : ""}">${w(...apStepLabels[step])}</button>`,
              )
              .join("")}</div></article>`;
          })
          .join("")
      : `<p class="muted">${w("No AP subjects planned yet.", "아직 계획한 AP 과목이 없어요.")}</p>`
  }<details class="inline-form"><summary class="button button-light">＋ ${w("Add an AP subject", "AP 과목 추가")}</summary><form id="ap-form" class="ap-add"><label>${w("AP subject", "AP 과목")}<input name="course" required maxlength="80" placeholder="${w("e.g. AP Statistics", "예: AP Statistics")}"></label><label>${w("How", "방식")}<select name="mode"><option value="exam-only">${w("Exam only", "시험만 응시")}</option><option value="course">${w("Course and exam", "수업과 시험")}</option></select></label><button class="button" type="submit">${w("Add", "추가")}</button></form></details></section>`;
}

export function renderGradesPage(state: GradesState, ui: GradesUi) {
  const courses = state.courses.filter((c) => c.grade === ui.grade);
  const average = simpleAverage(courses),
    core = coreAverage(courses),
    band = gradeBand(average);
  const best = bestSat(state.sat);
  const coreNames = courses
    .filter((c) => c.tag === "required" || c.tag === "major")
    .map((c) => c.name);
  const nextAp = state.ap[0];
  const summary = `<section class="grades-summary" aria-label="${w("Summary", "요약")}"><div class="is-dark"><span class="small">${w("School average", "내신 평균")}</span><strong>${average ?? "—"}${average !== null ? "<small>%</small>" : ""}</strong><span class="small">${average !== null ? `${band ? `${band} ${w("band", "구간")} · ` : ""}${w(`${courses.length} courses`, `${courses.length}과목`)}` : w("Add marks to see it", "점수를 넣으면 나와요")}</span></div><div><span class="small muted">${w("Required & major", "필수·전공 관련")}</span><strong>${core ?? "—"}${core !== null ? "<small>%</small>" : ""}</strong><span class="small muted" data-original-language>${esc(coreNames.join(" · "))}</span></div><div><span class="small muted">${w("Best SAT", "SAT 최고점")}</span><strong>${best ?? "—"}</strong><span class="small muted">${best !== null && state.satTarget !== null ? (best >= state.satTarget ? w("Target reached", "목표 달성") : w(`${state.satTarget - best} to ${state.satTarget}`, `목표 ${state.satTarget}까지 ${state.satTarget - best}`)) : ""}</span></div><div><span class="small muted">${w("AP plan", "AP 계획")}</span><strong>${state.ap.length}<small>${w(" subjects", "과목")}</small></strong><span class="small ${nextAp && nextAp.status === "checking-school" ? "overdue" : "muted"}">${nextAp ? w(...apStatusLabels[nextAp.status]) : ""}</span></div></section>`;
  return `<div class="grades-head"><h1 class="home-title">${w("Grades", "성적")}</h1><div class="segmented" role="group" aria-label="${w("Grade", "학년")}">${[9, 10, 11, 12].map((g) => `<button data-grade-view="${g}" aria-pressed="${g === ui.grade}">${w(`Gr ${g}`, `${g}학년`)}</button>`).join("")}</div></div>
  ${ui.notice ? `<div class="planner-notice" role="status">${esc(ui.notice)} ${ui.canUndo ? `<button id="undo-grades" class="text-button">${w("Undo", "실행 취소")}</button>` : ""}</div>` : ""}
  ${summary}
  <section class="grades-card" aria-labelledby="school-marks-title"><div class="grades-card-head"><h2 id="school-marks-title">${w(`Ontario marks · Grade ${ui.grade}`, `온타리오 내신 · ${ui.grade}학년`)}</h2><button class="button" id="add-course">＋ ${w("Add course", "과목 추가")}</button></div>${marksList(state, courses)}</section>
  <div class="grades-two">${satCard(state)}${apCard(state)}</div>`;
}

export interface GradesContext {
  state: () => GradesState;
  editor: () => EditorId;
  ui: GradesUi;
  commit: (next: GradesState, notice: string, undoable?: boolean) => void;
  undo: () => void;
  rerender: () => void;
}

function openCourseEditor(ctx: GradesContext, id?: string) {
  const existing = ctx.state().courses.find((c) => c.id === id);
  const dialog = document.querySelector<HTMLDialogElement>("#task-dialog")!;
  const tagOptions = (selected: CourseTag) =>
    (Object.keys(tagLabels) as CourseTag[])
      .map(
        (t) =>
          `<option value="${t}" ${t === selected ? "selected" : ""}>${w(...tagLabels[t])}</option>`,
      )
      .join("");
  dialog.innerHTML = `<form id="course-form"><div class="dialog-header"><h2 id="task-dialog-title">${existing ? w("Edit course", "과목 수정") : w("Add a course", "과목 추가")}</h2><button type="button" class="close-dialog" aria-label="${w("Cancel", "취소")}">×</button></div><div class="task-form-fields"><div class="grades-form-pair"><label>${w("Course code", "과목 코드")}<input name="code" maxlength="12" placeholder="ENG3U" value="${esc(existing?.code ?? "")}"></label><label>${w("Grade", "학년")}<select name="grade">${[9, 10, 11, 12].map((g) => `<option value="${g}" ${g === (existing?.grade ?? ctx.ui.grade) ? "selected" : ""}>${w(`Grade ${g}`, `${g}학년`)}</option>`).join("")}</select></label></div><label>${w("Course name", "과목 이름")}<input name="name" required maxlength="80" value="${esc(existing?.name ?? "")}"></label><div class="grades-form-pair"><label>${w("Midterm", "중간")}<input type="number" name="midterm" min="0" max="100" step="0.1" inputmode="decimal" value="${existing?.midterm ?? ""}"></label><label>${w("Final", "최종")}<input type="number" name="final" min="0" max="100" step="0.1" inputmode="decimal" value="${existing?.final ?? ""}"></label></div><label>${w("Type", "분류")}<select name="tag">${tagOptions(existing?.tag ?? "other")}</select></label><div class="form-actions">${existing ? `<button type="button" id="delete-course" class="text-button danger">${w("Delete course", "과목 삭제")}</button>` : ""}<button type="button" id="cancel-course" class="text-button">${w("Cancel", "취소")}</button><button class="button" type="submit">${w("Save", "저장")}</button></div></div></form>`;
  const form = dialog.querySelector<HTMLFormElement>("form")!;
  const codeField = form.elements.namedItem("code") as HTMLInputElement;
  const tagField = form.elements.namedItem("tag") as HTMLSelectElement;
  let tagTouched = !!existing;
  tagField.addEventListener("change", () => (tagTouched = true));
  codeField.addEventListener("input", () => {
    if (!tagTouched) tagField.value = suggestTag(codeField.value);
  });
  dialog
    .querySelectorAll(".close-dialog, #cancel-course")
    .forEach((b) => b.addEventListener("click", () => dialog.close()));
  dialog.querySelector("#delete-course")?.addEventListener("click", () => {
    if (!existing) return;
    dialog.close();
    ctx.commit(
      removeCourse(ctx.state(), existing.id),
      w("Course deleted.", "과목을 삭제했어요."),
      true,
    );
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const num = (key: string) =>
      data.get(key) === "" ? null : Number(data.get(key));
    const midterm = num("midterm"),
      final = num("final");
    const course: CourseGrade = {
      id: existing?.id ?? `course-${crypto.randomUUID()}`,
      code: String(data.get("code") ?? "")
        .trim()
        .toUpperCase(),
      name: String(data.get("name") ?? "").trim(),
      grade: Number(data.get("grade")),
      midterm,
      final,
      tag: String(data.get("tag")) as CourseTag,
      updatedBy: ctx.editor(),
      updatedAt: todayIso(),
    };
    ctx.ui.grade = course.grade;
    dialog.close();
    ctx.commit(
      saveCourse(ctx.state(), course),
      w("Course saved.", "과목을 저장했어요."),
    );
  });
  localize(dialog);
  dialog.showModal();
}

export function bindGradesPage(ctx: GradesContext) {
  document
    .querySelectorAll<HTMLButtonElement>("[data-grade-view]")
    .forEach((b) =>
      b.addEventListener("click", () => {
        ctx.ui.grade = Number(b.dataset.gradeView);
        ctx.rerender();
      }),
    );
  document
    .querySelector("#add-course")
    ?.addEventListener("click", () => openCourseEditor(ctx));
  document
    .querySelectorAll<HTMLButtonElement>("[data-edit-course]")
    .forEach((b) =>
      b.addEventListener("click", () =>
        openCourseEditor(ctx, b.dataset.editCourse),
      ),
    );
  document
    .querySelectorAll<HTMLButtonElement>("[data-delete-sat]")
    .forEach((b) =>
      b.addEventListener("click", () =>
        ctx.commit(
          removeSat(ctx.state(), b.dataset.deleteSat!),
          w("Score deleted.", "점수를 삭제했어요."),
          true,
        ),
      ),
    );
  document
    .querySelector<HTMLFormElement>("#sat-form")
    ?.addEventListener("submit", (event) => {
      event.preventDefault();
      const form = event.currentTarget as HTMLFormElement;
      if (!form.reportValidity()) return;
      const data = new FormData(form);
      ctx.commit(
        saveSat(ctx.state(), {
          id: `sat-${crypto.randomUUID()}`,
          date: String(data.get("date")),
          kind: data.get("kind") === "official" ? "official" : "practice",
          readingWriting: Number(data.get("readingWriting")),
          math: Number(data.get("math")),
          updatedBy: ctx.editor(),
          updatedAt: todayIso(),
        }),
        w("SAT score saved.", "SAT 점수를 저장했어요."),
      );
    });
  document
    .querySelector<HTMLFormElement>("#ap-form")
    ?.addEventListener("submit", (event) => {
      event.preventDefault();
      const form = event.currentTarget as HTMLFormElement;
      if (!form.reportValidity()) return;
      const data = new FormData(form);
      ctx.commit(
        saveAp(ctx.state(), {
          id: `ap-${crypto.randomUUID()}`,
          course: String(data.get("course") ?? "").trim(),
          mode: data.get("mode") === "course" ? "course" : "exam-only",
          status: "considering",
          updatedBy: ctx.editor(),
          updatedAt: todayIso(),
        }),
        w("AP subject added.", "AP 과목을 추가했어요."),
      );
    });
  document.querySelectorAll<HTMLButtonElement>("[data-ap-step]").forEach((b) =>
    b.addEventListener("click", () => {
      const [id, status] = b.dataset.apStep!.split("|");
      const plan = ctx.state().ap.find((p) => p.id === id);
      if (!plan) return;
      ctx.commit(
        saveAp(ctx.state(), {
          ...plan,
          status: status as ApPlan["status"],
          updatedBy: ctx.editor(),
          updatedAt: todayIso(),
        }),
        w("AP status saved.", "AP 상태를 저장했어요."),
      );
    }),
  );
  document
    .querySelector<HTMLFormElement>("#grades-target-form")
    ?.addEventListener("submit", (event) => {
      event.preventDefault();
      const form = event.currentTarget as HTMLFormElement;
      if (!form.reportValidity()) return;
      const value = String(new FormData(form).get("target") ?? "");
      ctx.commit(
        setSatTarget(ctx.state(), value === "" ? null : Number(value)),
        w("Target saved.", "목표를 저장했어요."),
      );
    });
  document
    .querySelectorAll<HTMLButtonElement>("[data-delete-ap]")
    .forEach((b) =>
      b.addEventListener("click", () =>
        ctx.commit(
          removeAp(ctx.state(), b.dataset.deleteAp!),
          w("AP subject deleted.", "AP 과목을 삭제했어요."),
          true,
        ),
      ),
    );
  document.querySelector("#undo-grades")?.addEventListener("click", ctx.undo);
}
