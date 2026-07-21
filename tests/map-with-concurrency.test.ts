import test from "node:test";
import assert from "node:assert/strict";
import { mapWithConcurrency } from "../lib/async/map-with-concurrency";

const delay = (milliseconds: number) => new Promise(resolve => setTimeout(resolve, milliseconds));

test("returns ordered results and handles an empty list", async () => {
  assert.deepEqual(await mapWithConcurrency([], 4, async value => value), []);

  const results = await mapWithConcurrency([30, 5, 20], 2, async value => {
    await delay(value);
    return value * 2;
  });

  assert.deepEqual(results, [60, 10, 40]);
});

test("never exceeds the configured concurrency", async () => {
  let active = 0;
  let peak = 0;

  await mapWithConcurrency(Array.from({ length: 12 }, (_, index) => index), 4, async value => {
    active += 1;
    peak = Math.max(peak, active);
    await delay(10);
    active -= 1;
    return value;
  });

  assert.equal(peak, 4);
});

test("rejects when a mapper fails", async () => {
  await assert.rejects(
    mapWithConcurrency([1, 2, 3], 2, async value => {
      if (value === 2) throw new Error("upload failed");
      return value;
    }),
    /upload failed/
  );
});

test("rejects invalid concurrency values", async () => {
  await assert.rejects(mapWithConcurrency([1], 0, async value => value), /positive integer/);
});
