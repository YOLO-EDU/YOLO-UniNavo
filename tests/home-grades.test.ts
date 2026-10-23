import { test } from "node:test";
import assert from "node:assert/strict";
import { taskCategory } from "../src/task-category.ts";
import {
  emptyGrades,
  lastChange,
  saveCourse,
  type CourseGrade,
} from "../src/grades.ts";

test("roadmap tasks get a category from their sources", () => {
  assert.equal(taskCategory({ sourceIds: ["ap-order"] }), "ap");
  assert.equal(taskCategory({ sourceIds: ["sat-practice"] }), "sat");
  assert.equal(
    taskCategory({ sourceIds: ["ontario-ossd", "common-gpa"] }),
    "school",
  );
  assert.equal(taskCategory({ sourceIds: ["common-guide"] }), "activity");
  assert.equal(taskCategory({ sourceIds: ["essay-free"] }), "application");
  assert.equal(taskCategory({ sourceIds: ["early-plans"] }), "application");
  assert.equal(taskCategory({ sourceIds: ["federal-aid"] }), "cost");
  assert.equal(
    taskCategory({ sourceIds: ["student-visa", "sevis-official"] }),
    "visa",
  );
  assert.equal(taskCategory({ sourceIds: [], personal: true }), "mine");
  assert.equal(taskCategory({ sourceIds: [] }), "other");
});

test("the last change of a course compares its mark with the previous record", () => {
  const c: CourseGrade = {
    id: "eng",
    code: "ENG3U",
    name: "English",
    grade: 11,
    midterm: 80,
    final: null,
    tag: "required",
    updatedBy: "student",
    updatedAt: "2026-09-25",
  };
  let g = saveCourse(emptyGrades(), c);
  assert.equal(lastChange(g, "eng"), null);
  g = saveCourse(g, { ...c, midterm: 82, updatedAt: "2026-10-20" });
  assert.equal(lastChange(g, "eng"), 2);
  g = saveCourse(g, { ...c, midterm: 82, final: 79, updatedAt: "2026-11-20" });
  assert.equal(lastChange(g, "eng"), -3);
  assert.equal(lastChange(g, "missing"), null);
});
