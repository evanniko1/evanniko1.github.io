#!/usr/bin/env node
"use strict";

const assert = require("assert");
const { parseDirectScholarCitationCount, parseSerpApiCitationCount, normalizeCount } = require("./update-scholar-citations");

assert.strictEqual(normalizeCount("1,234", "test count"), 1234);
assert.throws(() => normalizeCount("not-a-number", "test count"), /invalid test count/);

assert.strictEqual(
  parseDirectScholarCitationCount('<td class="gsc_rsb_std">247</td><td class="gsc_rsb_std">200</td>'),
  247
);

assert.strictEqual(
  parseDirectScholarCitationCount('<a class="gsc_a_ac gs_ibl">100</a><a class="gsc_a_ac gs_ibl">25</a><a class="gsc_a_ac gs_ibl"></a>'),
  125
);

assert.throws(
  () => parseDirectScholarCitationCount('<html><head><title>Sorry</title></head><body>unusual traffic</body></html>'),
  /anti-bot|unusual-traffic/
);

assert.deepStrictEqual(
  parseSerpApiCitationCount({
    search_metadata: { status: "Success" },
    cited_by: {
      table: [
        { citations: { all: 247, since_2021: 200 } },
        { h_index: { all: 8, since_2021: 7 } },
      ],
    },
  }),
  { totalCitations: 247, source: "serpapi:cited_by.table.citations.all" }
);

assert.throws(
  () => parseSerpApiCitationCount({ search_metadata: { status: "Error", error: "bad key" } }),
  /bad key/
);

assert.throws(
  () => parseSerpApiCitationCount({ cited_by: { table: [] } }),
  /cited_by.table/
);

console.log("Scholar citation parser checks passed.");
