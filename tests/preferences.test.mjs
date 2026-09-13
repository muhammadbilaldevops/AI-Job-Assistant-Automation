import test from "node:test";
import assert from "node:assert/strict";
import {
  defaultRules,
  normalizeSearch,
  normalizeRules,
  searchLink,
} from "../dist/preferences.js";
import {
  matchJob,
  normalizeJob,
  blankProfile,
  resumeHTML,
} from "../dist/core.js";
import { fullResumeText, pageBudget, PAGE_BREAK } from "../dist/documents.js";
import { createDocx } from "../dist/export.js";
import { publicIPv4, researchURL, htmlText } from "../lib/research.mjs";

test("saved searches encode special titles and constrain radius", () => {
  const search = normalizeSearch({
    title: "C++ & Cloud",
    location: "Rawalpindi",
    radius: 50,
  });
  const url = new URL(searchLink(search));
  assert.equal(url.searchParams.get("q"), "C++ & Cloud");
  assert.equal(url.searchParams.get("radius"), "50");
  assert.equal(url.searchParams.get("sort"), "date");
  assert.throws(() => normalizeSearch({ ...search, radius: 101 }));
  assert.throws(() => normalizeSearch({ ...search, title: "" }));
});
test("custom rules change accepted cities and job families", () => {
  const rules = normalizeRules({
    ...defaultRules(),
    titles: ["Data Analyst"],
    cities: ["Lahore"],
  });
  const data = {
    title: "Junior Data Analyst",
    company: "Test fixture",
    description: "SQL analysis",
    location: "Lahore",
  };
  assert.equal(
    matchJob(normalizeJob(data), blankProfile(), Date.now(), rules).eligibility,
    "Eligible",
  );
  assert.equal(
    matchJob(
      normalizeJob({ ...data, title: "DevOps Intern" }),
      blankProfile(),
      Date.now(),
      rules,
    ).eligibility,
    "Excluded",
  );
  assert.equal(
    matchJob(
      normalizeJob({ ...data, location: "Islamabad" }),
      blankProfile(),
      Date.now(),
      rules,
    ).eligibility,
    "Excluded",
  );
});
test("remote opt out excludes otherwise eligible remote roles", () => {
  const rules = { ...defaultRules(), allowRemote: false };
  const job = normalizeJob({
    title: "Cloud Intern",
    company: "Test fixture",
    description: "Cloud",
    mode: "Remote",
    remoteEligibility: "Worldwide",
  });
  assert.equal(
    matchJob(job, blankProfile(), Date.now(), rules).eligibility,
    "Excluded",
  );
});
test("two-page wrapper preserves draft and uses a real Word page break", async () => {
  const draft = "PROFESSIONAL SUMMARY\nUnchanged draft.";
  const text = fullResumeText(
    draft,
    {
      name: "Test fixture",
      contact: "Public portfolio",
      education: "Real record required",
      projects: "Real project required",
    },
    true,
  );
  assert(text.includes(draft));
  assert.equal(text.split(PAGE_BREAK).length, 2);
  const xml = Buffer.from(await createDocx(text).arrayBuffer()).toString();
  assert(xml.includes('<w:br w:type="page"/>'));
  assert(!xml.includes(PAGE_BREAK));
  assert(resumeHTML(text).includes('class="page-break"'));
  assert(pageBudget("a".repeat(5000)).warnings.length);
  assert.equal(fullResumeText(draft, {}, true).split(PAGE_BREAK).length, 1);
});
test("company reader blocks private and reserved destinations", () => {
  for (const ip of [
    "127.0.0.1",
    "10.0.0.2",
    "172.16.0.1",
    "192.168.1.2",
    "169.254.169.254",
    "100.64.0.1",
    "0.0.0.0",
    "::1",
    "198.18.0.1",
    "203.0.113.4",
  ])
    assert.equal(publicIPv4(ip), false, ip);
  assert(publicIPv4("1.1.1.1"));
  for (const url of [
    "http://example.com",
    "https://example.com:8443",
    "https://user:pass@example.com",
    "https://localhost",
    "https://pk.indeed.com/jobs",
  ])
    assert.throws(() => researchURL(url));
  assert.equal(htmlText("<script>bad</script><p>A &amp; B</p>"), "A & B");
});
