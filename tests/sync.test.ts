import { test } from "node:test";
import assert from "node:assert/strict";
import { planStart } from "../src/sync.ts";

const empty = { grades: null, journal: null, planner: null };

test("an empty server receives this device's saved records", () => {
  const plan = planStart(
    { ...empty, grades: '{"a":1}', checked: "[]", language: '"ko"' },
    [],
    [],
  );
  assert.deepEqual(plan.push.sort(), ["checked", "grades"]);
  assert.deepEqual(plan.writes, {});
});

test("server records that differ replace the local copy", () => {
  const plan = planStart(
    { ...empty, grades: '{"a":1}', journal: '{"n":1}' },
    [
      { key: "grades", value: { a: 2 } },
      { key: "journal", value: { n: 1 } },
    ],
    [],
  );
  assert.deepEqual(plan.push, []);
  assert.deepEqual(plan.writes, { grades: '{"a":2}' });
});

test("unsent local edits go up and are not overwritten", () => {
  const plan = planStart(
    { ...empty, grades: '{"a":3}' },
    [{ key: "grades", value: { a: 2 } }],
    ["grades", "language"],
  );
  assert.deepEqual(plan.push, ["grades"]);
  assert.deepEqual(plan.writes, {});
});

test("keys outside the shared list are ignored", () => {
  const plan = planStart(empty, [{ key: "language", value: "en" }], []);
  assert.deepEqual(plan.writes, {});
});
