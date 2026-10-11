import test from "node:test";
import assert from "node:assert/strict";

import { getUsageProgressPercent } from "./usage";

test("returns zero when no usage exists", () => {
  assert.equal(
    getUsageProgressPercent({ githubUsed: 0, githubLimit: 15, aiUsed: 0, aiLimit: 5 }),
    0,
  );
});

test("uses the combined quota for the percentage", () => {
  assert.equal(
    getUsageProgressPercent({ githubUsed: 5, githubLimit: 15, aiUsed: 3, aiLimit: 5 }),
    40,
  );
});

test("caps usage at 100 percent", () => {
  assert.equal(
    getUsageProgressPercent({ githubUsed: 25, githubLimit: 15, aiUsed: 5, aiLimit: 5 }),
    100,
  );
});
