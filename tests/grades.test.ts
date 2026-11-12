import { test } from "node:test";
import assert from "node:assert/strict";
import {
  bestSat,
  coreAverage,
  emptyGrades,
  gradeBand,
  normalizeGrades,
  removeCourse,
  saveCourse,
  saveSat,
  simpleAverage,
  suggestTag,
  type CourseGrade,
} from "../src/grades.ts";

const course = (over: Partial<CourseGrade> = {}): CourseGrade => ({
  id: "c1",
  code: "ENG3U",
  name: "English",
  grade: 11,
  midterm: 82,
  final: null,
  tag: "required",
  updatedBy: "student",
  updatedAt: "2026-10-17",
  ...over,
});

test("Ontario course codes suggest a tag a person can still change", () => {
  assert.equal(suggestTag("ENG3U"), "required");
  assert.equal(suggestTag("mcr3u"), "required");
  assert.equal(suggestTag("CHW3M"), "major");
  assert.equal(suggestTag("HSP3U"), "major");
  assert.equal(suggestTag("SPH3U"), "science");
  assert.equal(suggestTag("ICS3U"), "other");
  assert.equal(suggestTag(""), "other");
});

test("a final mark replaces the midterm, and averages round to one decimal", () => {
  const courses = [
    course({ id: "a", midterm: 82 }),
    course({ id: "b", midterm: 70, final: 77 }),
    course({ id: "c", midterm: 80 }),
  ];
  assert.equal(simpleAverage(courses), 79.7);
  assert.equal(simpleAverage([]), null);
  assert.equal(simpleAverage([course({ midterm: null, final: null })]), null);
});

test("core average uses only required and major-related courses", () => {
  const courses = [
    course({ id: "eng", tag: "required", midterm: 82 }),
    course({ id: "his", tag: "major", midterm: 85 }),
    course({ id: "phy", tag: "science", midterm: 71 }),
    course({ id: "cs", tag: "other", midterm: 78 }),
  ];
  assert.equal(coreAverage(courses), 83.5);
});

test("grade bands include the lower edge, exclude the upper, and keep 100 in the last band", () => {
  assert.equal(gradeBand(75), "75–80%");
  assert.equal(gradeBand(79.9), "75–80%");
  assert.equal(gradeBand(80), "80–85%");
  assert.equal(gradeBand(100), "95–100%");
  assert.equal(gradeBand(59.9), "");
  assert.equal(gradeBand(null), "");
});

test("best SAT is the highest single-sitting total, ignoring nothing else", () => {
  let state = emptyGrades();
  assert.equal(bestSat(state.sat), null);
  state = saveSat(state, {
    id: "s1",
    date: "2026-09-20",
    kind: "practice",
    readingWriting: 580,
    math: 540,
    updatedBy: "student",
    updatedAt: "2026-09-20",
  });
  state = saveSat(state, {
    id: "s2",
    date: "2026-10-18",
    kind: "practice",
    readingWriting: 630,
    math: 580,
    updatedBy: "teacher",
    updatedAt: "2026-10-18",
  });
  assert.equal(bestSat(state.sat), 1210);
  assert.deepEqual(
    state.sat.map((a) => a.id),
    ["s1", "s2"],
  );
});

test("saving an existing course replaces it, and removing it leaves the others", () => {
  let state = saveCourse(emptyGrades(), course({ id: "a" }));
  state = saveCourse(state, course({ id: "b", code: "CHW3M" }));
  state = saveCourse(state, course({ id: "a", midterm: 90, updatedBy: "mom" }));
  assert.equal(state.courses.length, 2);
  assert.equal(state.courses.find((c) => c.id === "a")!.midterm, 90);
  assert.equal(state.courses.find((c) => c.id === "a")!.updatedBy, "mom");
  state = removeCourse(state, "a");
  assert.deepEqual(
    state.courses.map((c) => c.id),
    ["b"],
  );
});

test("stored data survives a round trip and malformed entries are dropped", () => {
  const good = saveCourse(emptyGrades(), course());
  assert.deepEqual(normalizeGrades(JSON.parse(JSON.stringify(good))), good);
  assert.deepEqual(normalizeGrades(null), emptyGrades());
  assert.deepEqual(normalizeGrades({ version: 2 }), emptyGrades());
  const cleaned = normalizeGrades({
    version: 1,
    courses: [
      course({ id: "ok" }),
      course({ id: "too-high", midterm: 101 }),
      course({ id: "no-name", name: "  " }),
      course({ id: "bad grade", grade: 13 }),
      { ...course({ id: "who" }), updatedBy: "stranger" },
    ],
    sat: [
      {
        id: "s",
        date: "2026-10-18",
        kind: "practice",
        readingWriting: 630,
        math: 585,
        updatedBy: "student",
        updatedAt: "2026-10-18",
      },
    ],
    ap: [{ id: "x", course: "", mode: "exam-only", status: "considering" }],
  });
  assert.deepEqual(
    cleaned.courses.map((c) => c.id),
    ["ok", "who"],
  );
  assert.equal(cleaned.courses[1].updatedBy, "student");
  assert.equal(cleaned.sat.length, 0);
  assert.equal(cleaned.ap.length, 0);
});

test("the U.S. GPA converts each Ontario mark and weights half credits", async () => {
  const { usGpa, usPoints, courseCredit } = await import("../src/grades.ts");
  assert.deepEqual(
    [100, 80, 79.9, 70, 69, 56, 55, 50, 49].map(usPoints),
    [4, 4, 3, 3, 2, 2, 1, 1, 0],
  );
  assert.equal(courseCredit("CHV2O1"), 0.5);
  assert.equal(courseCredit("GLC2O1"), 0.5);
  assert.equal(courseCredit("ENG2D1"), 1);
  const c = (
    code: string,
    final: number | null,
    midterm: number | null = null,
  ) => ({
    id: code,
    code,
    name: code,
    grade: 10,
    midterm,
    final,
    tag: "other" as const,
    updatedBy: "student" as const,
    updatedAt: "2026-07-07",
  });
  assert.equal(usGpa([]), null);
  assert.equal(usGpa([c("SNC1W1", null)]), null);
  // Taeyul's grade 10: five A credits, two B credits, a half A and a half B.
  assert.equal(
    usGpa([
      c("BEP2O1", 92),
      c("ENG2D1", 71),
      c("SNC2D1", 76),
      c("TGJ2O1", 94),
      c("ADA2O1", 95),
      c("CHV2O1", 81),
      c("GLC2O1", 77),
      c("HRE2O1", 86),
      c("MPM2D1", 94),
    ]),
    3.69,
  );
  assert.equal(usGpa([c("MCR3U1", null, 86), c("CIA4U1", null, 70)]), 3.5);
});
