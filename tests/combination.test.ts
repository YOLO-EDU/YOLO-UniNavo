import { test } from "node:test";
import assert from "node:assert/strict";
import { candidateMatrix } from "../src/candidate-plans.ts";
import { selectivity, listDiff } from "../src/matching.ts";

const cell = (band: string, sat: number) =>
  candidateMatrix().find((c) => c.band === band && c.sat === sat)!;

test("selectivity averages the middle of each published SAT range", () => {
  assert.equal(selectivity(cell("75–80%", 1200).selected), 1234);
  assert.equal(selectivity(cell("95–100%", 1500).selected), 1533);
  assert.equal(selectivity([]), null);
});

test("selectivity rises from the lowest to the highest combination", () => {
  const low = selectivity(cell("75–80%", 1100).selected)!;
  const high = selectivity(cell("95–100%", 1500).selected)!;
  assert.ok(low < high);
});

test("the difference between two lists names who joins and who leaves", () => {
  const diff = listDiff(
    cell("75–80%", 1200).selected,
    cell("75–80%", 1300).selected,
  );
  assert.deepEqual(
    diff.added.map((s) => s.id).sort(),
    ["colorado", "ohio-state-columbus"].sort(),
  );
  assert.deepEqual(
    diff.removed.map((s) => s.id).sort(),
    ["nebraska-lincoln", "washington-state"].sort(),
  );
  const same = cell("75–80%", 1400).selected;
  assert.deepEqual(listDiff(same, same), { added: [], removed: [] });
});
