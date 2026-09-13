import test from "node:test";
import assert from "node:assert/strict";
import {
  preferences,
  DEFAULT_PREFERENCES,
  normalizeSourceJob,
  analyze,
  match,
  searchSource,
} from "../lib/discovery.mjs";
import { newRun } from "../lib/pipeline.mjs";
import { factualChecks } from "../lib/writing.mjs";
import {validateDocxArchive} from '../lib/upload.mjs';
import {createDocx} from '../dist/export.js';
test('default experience preference remains two years',()=>assert.equal(preferences().maxYears,2));
test('Word intake rejects oversized expanded archives',async()=>{
 const bytes=Buffer.from(await createDocx('Parser fixture').arrayBuffer());
 validateDocxArchive(bytes);
 const central=bytes.indexOf(Buffer.from([0x50,0x4b,0x01,0x02]));
 bytes.writeUInt32LE(20_000_000,central+24);
 assert.throws(()=>validateDocxArchive(bytes),/too large/);
});
const fixture = {
  title: "DevOps Intern",
  companyName: "Test fixture only",
  description:
    "Use Linux, Docker and Terraform. No employment experience is required.",
  guid: "https://himalayas.app/companies/test-fixture/jobs/devops-intern",
  locationRestrictions: ["Pakistan"],
  seniority: "Entry-level",
  pubDate: 1789290000,
};
test("normalization rejects off-source application links and preserves source dates", () => {
  assert.equal(
    normalizeSourceJob({ ...fixture, guid: "https://evil.test/job" }),
    null,
  );
  const j = normalizeSourceJob(fixture);
  assert.equal(j.source, "Himalayas");
  assert.equal(j.postedAt, "2026-09-13T09:00:00.000Z");
});
test("missing remote restrictions are not silently treated as worldwide hiring", () => {
  const j = normalizeSourceJob({ ...fixture, locationRestrictions: [] });
  const m = match(j, { skills: "Linux, Docker" }, DEFAULT_PREFERENCES);
  assert.equal(m.eligible, false);
  assert.equal(m.decision, "review");
});
test("location restriction overrides worldwide prose", () => {
  const j = normalizeSourceJob({
    ...fixture,
    locationRestrictions: ["United States"],
    description: "We have customers worldwide. Use Linux and Docker.",
  });
  assert.equal(
    match(j, { skills: "Linux" }, DEFAULT_PREFERENCES).decision,
    "excluded",
  );
});
test("experience requirement is extracted with source evidence and excludes senior roles", () => {
  const j = normalizeSourceJob({
    ...fixture,
    description: "You need 5+ years of professional experience with Docker.",
  });
  assert.equal(analyze(j).minimumYears, 5);
  assert.equal(
    match(j, { skills: "Docker" }, DEFAULT_PREFERENCES).decision,
    "excluded",
  );
});
test("transferable role stays visible for review instead of disappearing below a hard score", () => {
  const j = normalizeSourceJob({
    ...fixture,
    title: "Junior Software Engineer",
    description: "Use Linux and Python to support cloud infrastructure.",
  });
  assert.equal(
    match(j, { skills: "Linux" }, DEFAULT_PREFERENCES).decision,
    "review",
  );
});
test("preference limits constrain request fanout and preserve a zero threshold", () => {
  const p = preferences({
    titles: Array.from({ length: 50 }, (_, i) => "Title" + i),
    minimumScore: 0,
    maxYears: 0,
  });
  assert.equal(p.titles.length, 12);
  assert.equal(p.minimumScore, 0);
  assert.equal(newRun({ preferences: p }).tasks.length, 24);
});
test("empty source results are valid, rate limits are actionable and not retried in a loop", async () => {
  const result = await searchSource(
    { title: "Cloud", page: 1 },
    DEFAULT_PREFERENCES,
    async () => new Response(JSON.stringify({ jobs: [], totalCount: 0 })),
  );
  assert.equal(result.jobs.length, 0);
  let calls = 0;
  await assert.rejects(
    () =>
      searchSource(
        { title: "Cloud", page: 1 },
        DEFAULT_PREFERENCES,
        async () => {
          calls++;
          return new Response("", { status: 429 });
        },
      ),
    /busy/,
  );
  assert.equal(calls, 1);
});
test("cover validator flags unsupported years and em dashes", () => {
  const text =
    "I have 9 years of experience — " +
    "I used Linux for my project. ".repeat(25);
  const errors = factualChecks(
    text,
    { skills: "Linux", experience: "Personal project" },
    fixture,
    "coverLetter",
  );
  assert.ok(errors.some((e) => e.includes("em dash")));
  assert.ok(errors.some((e) => e.includes("quantified")));
});
