import { GRADE_BANDS, type GradeBand } from "./types.ts";

// Taeyul's own records. Anyone with the link may edit; updatedBy only labels
// who typed an entry and is not an access control.
export const EDITORS = ["student", "mom", "dad", "teacher"] as const;
export type EditorId = (typeof EDITORS)[number];
export type CourseTag = "required" | "major" | "science" | "other";
export interface CourseGrade {
  id: string;
  code: string;
  name: string;
  grade: number;
  midterm: number | null;
  final: number | null;
  tag: CourseTag;
  updatedBy: EditorId;
  updatedAt: string;
}
export interface SatAttempt {
  id: string;
  date: string;
  kind: "practice" | "official";
  readingWriting: number;
  math: number;
  updatedBy: EditorId;
  updatedAt: string;
}
export interface ApPlan {
  id: string;
  course: string;
  mode: "exam-only" | "course";
  status: "considering" | "checking-school" | "registered" | "done";
  updatedBy: EditorId;
  updatedAt: string;
}
export interface GradesState {
  version: 1;
  courses: CourseGrade[];
  sat: SatAttempt[];
  ap: ApPlan[];
  satTarget: number | null;
  // Earlier marks, kept when a course's mark changes, for monthly reports.
  history: MarkRecord[];
}
export interface MarkRecord {
  courseId: string;
  date: string;
  value: number;
}
export const emptyGrades = (): GradesState => ({
  version: 1,
  courses: [],
  sat: [],
  ap: [],
  satTarget: null,
  history: [],
});
const validTotal = (v: unknown): v is number =>
  typeof v === "number" &&
  Number.isInteger(v) &&
  v >= 400 &&
  v <= 1600 &&
  v % 10 === 0;
export const setSatTarget = (
  s: GradesState,
  target: number | null,
): GradesState => ({ ...s, satTarget: validTotal(target) ? target : null });

// Ontario course codes: ENG = English, M = math, C/H = social sciences and
// humanities, S = sciences. A suggestion only; the person may change it.
export function suggestTag(code: string): CourseTag {
  const c = code.trim().toUpperCase();
  if (c.startsWith("ENG") || c.startsWith("M")) return "required";
  if (c.startsWith("C") || c.startsWith("H")) return "major";
  if (c.startsWith("S")) return "science";
  return "other";
}

export const courseScore = (c: CourseGrade) => c.final ?? c.midterm;
const round1 = (n: number) => Math.round(n * 10) / 10;
export function simpleAverage(courses: CourseGrade[]): number | null {
  const scores = courses
    .map(courseScore)
    .filter((s): s is number => s !== null);
  return scores.length
    ? round1(scores.reduce((a, b) => a + b, 0) / scores.length)
    : null;
}
export const coreAverage = (courses: CourseGrade[]) =>
  simpleAverage(
    courses.filter((c) => c.tag === "required" || c.tag === "major"),
  );

// Same convention as the explorer: lower edge included, 100 in the last band.
export function gradeBand(average: number | null): GradeBand | "" {
  if (average === null || average < 60 || average > 100) return "";
  const i = Math.min(Math.floor((average - 60) / 5), GRADE_BANDS.length - 1);
  return GRADE_BANDS[i];
}

export const satTotal = (a: SatAttempt) => a.readingWriting + a.math;
export function bestSat(attempts: SatAttempt[]): number | null {
  return attempts.length ? Math.max(...attempts.map(satTotal)) : null;
}

const replaceById = <T extends { id: string }>(list: T[], item: T) =>
  list.some((x) => x.id === item.id)
    ? list.map((x) => (x.id === item.id ? item : x))
    : [...list, item];
export function saveCourse(s: GradesState, c: CourseGrade): GradesState {
  const before = s.courses.find((x) => x.id === c.id);
  const old = before ? courseScore(before) : null;
  const changed = before && old !== null && old !== courseScore(c);
  return {
    ...s,
    courses: replaceById(s.courses, c),
    history: changed
      ? [...s.history, { courseId: c.id, date: before.updatedAt, value: old }]
      : s.history,
  };
}
export const removeCourse = (s: GradesState, id: string): GradesState => ({
  ...s,
  courses: s.courses.filter((c) => c.id !== id),
  history: s.history.filter((h) => h.courseId !== id),
});
// The mark that was current on a date: the course's own mark once it was
// entered, otherwise the latest earlier record.
export function scoreAt(
  s: GradesState,
  courseId: string,
  date: string,
): number | null {
  const c = s.courses.find((x) => x.id === courseId);
  if (c && c.updatedAt <= date) return courseScore(c);
  const past = s.history
    .filter((h) => h.courseId === courseId && h.date <= date)
    .sort((a, b) => a.date.localeCompare(b.date))
    .at(-1);
  return past ? past.value : null;
}
// Difference between a course's current mark and its previous record.
export function lastChange(s: GradesState, courseId: string): number | null {
  const c = s.courses.find((x) => x.id === courseId);
  const now = c ? courseScore(c) : null;
  const prev = s.history
    .filter((h) => h.courseId === courseId)
    .sort((a, b) => a.date.localeCompare(b.date))
    .at(-1);
  return now === null || !prev
    ? null
    : Math.round((now - prev.value) * 10) / 10;
}
export function courseChanges(
  s: GradesState,
  range: { start: string; end: string },
) {
  const d = new Date(`${range.start}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  const before = d.toISOString().slice(0, 10);
  const levels = s.courses
    .filter((c) => courseScore(c) !== null)
    .map((c) => c.grade);
  const latest = levels.length ? Math.max(...levels) : null;
  return s.courses
    .filter((c) => c.grade === latest)
    .map((course) => ({
      course,
      before: scoreAt(s, course.id, before),
      after: scoreAt(s, course.id, range.end),
    }))
    .filter((c) => c.after !== null);
}
export const saveSat = (s: GradesState, a: SatAttempt): GradesState => ({
  ...s,
  sat: replaceById(s.sat, a).sort((x, y) => x.date.localeCompare(y.date)),
});
export const removeSat = (s: GradesState, id: string): GradesState => ({
  ...s,
  sat: s.sat.filter((a) => a.id !== id),
});
export const saveAp = (s: GradesState, p: ApPlan): GradesState => ({
  ...s,
  ap: replaceById(s.ap, p),
});
export const removeAp = (s: GradesState, id: string): GradesState => ({
  ...s,
  ap: s.ap.filter((p) => p.id !== id),
});

const validId = (v: unknown): v is string =>
  typeof v === "string" && /^[a-zA-Z0-9-]{1,100}$/.test(v);
const validDate = (v: unknown): v is string =>
  typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
const text = (v: unknown, max: number) =>
  typeof v === "string" ? v.trim().slice(0, max) : "";
const mark = (v: unknown): number | null | undefined =>
  v === null
    ? null
    : typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 100
      ? v
      : undefined;
const section = (v: unknown) =>
  typeof v === "number" &&
  Number.isInteger(v) &&
  v >= 200 &&
  v <= 800 &&
  v % 10 === 0;
const editor = (v: unknown): EditorId =>
  EDITORS.includes(v as EditorId) ? (v as EditorId) : "student";
const oneOf = <T extends string>(v: unknown, options: readonly T[]) =>
  options.includes(v as T) ? (v as T) : undefined;

export function normalizeGrades(input: unknown): GradesState {
  if (!input || typeof input !== "object") return emptyGrades();
  const g = input as Record<string, unknown>;
  if (g.version !== 1) return emptyGrades();
  const list = (v: unknown) =>
    (Array.isArray(v) ? v.slice(0, 500) : []).filter(
      (x): x is Record<string, unknown> => !!x && typeof x === "object",
    );
  const courses: CourseGrade[] = [];
  for (const c of list(g.courses)) {
    const midterm = mark(c.midterm),
      final = mark(c.final),
      tag = oneOf(c.tag, ["required", "major", "science", "other"] as const);
    if (
      !validId(c.id) ||
      !text(c.name, 80) ||
      !(typeof c.grade === "number" && c.grade >= 9 && c.grade <= 12) ||
      midterm === undefined ||
      final === undefined ||
      !tag ||
      !validDate(c.updatedAt)
    )
      continue;
    courses.push({
      id: c.id,
      code: text(c.code, 12).toUpperCase(),
      name: text(c.name, 80),
      grade: c.grade,
      midterm,
      final,
      tag,
      updatedBy: editor(c.updatedBy),
      updatedAt: c.updatedAt,
    });
  }
  const sat: SatAttempt[] = [];
  for (const a of list(g.sat)) {
    const kind = oneOf(a.kind, ["practice", "official"] as const);
    if (
      !validId(a.id) ||
      !validDate(a.date) ||
      !kind ||
      !section(a.readingWriting) ||
      !section(a.math) ||
      !validDate(a.updatedAt)
    )
      continue;
    sat.push({
      id: a.id,
      date: a.date,
      kind,
      readingWriting: a.readingWriting as number,
      math: a.math as number,
      updatedBy: editor(a.updatedBy),
      updatedAt: a.updatedAt,
    });
  }
  const ap: ApPlan[] = [];
  for (const p of list(g.ap)) {
    const mode = oneOf(p.mode, ["exam-only", "course"] as const),
      status = oneOf(p.status, [
        "considering",
        "checking-school",
        "registered",
        "done",
      ] as const);
    if (
      !validId(p.id) ||
      !text(p.course, 80) ||
      !mode ||
      !status ||
      !validDate(p.updatedAt)
    )
      continue;
    ap.push({
      id: p.id,
      course: text(p.course, 80),
      mode,
      status,
      updatedBy: editor(p.updatedBy),
      updatedAt: p.updatedAt,
    });
  }
  return {
    version: 1,
    courses,
    sat: sat.sort((x, y) => x.date.localeCompare(y.date)),
    ap,
    satTarget: validTotal(g.satTarget) ? g.satTarget : null,
    history: list(g.history)
      .filter(
        (h) =>
          validId(h.courseId) &&
          validDate(h.date) &&
          typeof mark(h.value) === "number",
      )
      .map((h) => ({
        courseId: h.courseId as string,
        date: h.date as string,
        value: h.value as number,
      })),
  };
}
