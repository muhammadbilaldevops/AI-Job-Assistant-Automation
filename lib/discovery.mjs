import { canonicalURL } from "../dist/core.js";

export const SOURCE_VERSION = "2026-09-himalayas-v1";
export const DEFAULT_PREFERENCES = {
  titles: ["DevOps", "Cloud Engineer", "AI Engineer", "Machine Learning"],
  cities: ["Islamabad", "Rawalpindi"],
  country: "Pakistan",
  allowRemote: true,
  maxYears: 2,
  minimumScore: 60,
  pages: 2,
  notifications: true,
  daily: false,
};
export const STATES = [
  "IDLE",
  "STARTING",
  "SEARCHING",
  "ANALYZING",
  "RESEARCHING_COMPANY",
  "MATCHING",
  "SAVING_JOBS",
  "GENERATING_RESUME",
  "GENERATING_COVER_LETTER",
  "COMPLETED",
  "FAILED",
  "PAUSED",
];
export function preferences(input = {}) {
  const list = (v, fallback) =>
    [
      ...new Set(
        (Array.isArray(v) ? v : fallback)
          .map((s) => String(s).trim().slice(0, 80))
          .filter(Boolean),
      ),
    ].slice(0, 12);
  return {
    ...DEFAULT_PREFERENCES,
    titles: list(input.titles, DEFAULT_PREFERENCES.titles),
    cities: list(input.cities, DEFAULT_PREFERENCES.cities),
    country: String(input.country || "Pakistan").slice(0, 80),
    allowRemote: input.allowRemote !== false,
    maxYears: Math.max(0, Math.min(40, Number(input.maxYears ?? 2) || 0)),
    minimumScore: Math.max(0, Math.min(100, Number(input.minimumScore ?? 60))),
    pages: 2,
    notifications: input.notifications !== false,
    daily: input.daily === true,
  };
}
export function plainText(html) {
  return String(html || "")
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<\/(p|li|div|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n/g, "\n")
    .trim();
}
const date = (v) => {
  const n = Number(v);
  const d = new Date(Number.isFinite(n) && n > 0 ? n * 1000 : v);
  return Number.isFinite(+d) ? d.toISOString() : null;
};
export function normalizeSourceJob(j) {
  const url = canonicalURL(j.guid || j.applicationLink);
  if (
    !url ||
    new URL(url).hostname !== "himalayas.app" ||
    !j.title ||
    !j.companyName ||
    !j.description
  )
    return null;
  const restrictions = Array.isArray(j.locationRestrictions)
    ? j.locationRestrictions
    : [];
  return {
    source_key: url,
    title: String(j.title).slice(0, 200),
    company: String(j.companyName).slice(0, 200),
    url,
    source: "Himalayas",
    description: plainText(j.description).slice(0, 50000),
    location: restrictions.length
      ? restrictions.join(", ")
      : "Remote · country not specified",
    mode: "Remote",
    countries: restrictions,
    timezoneRestrictions: Array.isArray(j.timezoneRestrictions)
      ? j.timezoneRestrictions
      : [],
    seniority: j.seniority || "",
    employmentType: j.employmentType || "",
    companySlug: j.companySlug || "",
    postedAt: date(j.pubDate),
    deadline: date(j.expiryDate),
    salary: j.minSalary
      ? `${j.currency || ""} ${j.minSalary}${j.maxSalary ? "–" + j.maxSalary : ""} / ${j.salaryPeriod || "year"}`
      : "",
    discoveredAt: new Date().toISOString(),
  };
}
export function analyze(job) {
  const text = job.description;
  const tech = [
    "Linux",
    "Docker",
    "Kubernetes",
    "Terraform",
    "Ansible",
    "AWS",
    "Azure",
    "GCP",
    "Python",
    "JavaScript",
    "TypeScript",
    "React",
    "Node.js",
    "Git",
    "Jenkins",
    "CI/CD",
    "SQL",
    "PostgreSQL",
    "Bash",
    "PowerShell",
    "PyTorch",
    "TensorFlow",
    "LLM",
    "MLOps",
    "Prometheus",
    "Grafana",
  ];
  const has = (word) =>
    new RegExp(
      `(^|[^a-z0-9])${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^a-z0-9])`,
      "i",
    ).test(text);
  const years = [
    ...text.matchAll(
      /\b(\d{1,2})(?:\s*[-–]\s*\d{1,2})?\s*\+?\s*years?\s+(?:of\s+)?(?:relevant\s+|professional\s+|industry\s+)?experience/gi,
    ),
  ].map((m) => Number(m[1]));
  return {
    method: "Evidence extraction",
    skills: tech.filter(has),
    minimumYears: years.length ? Math.max(...years) : null,
    requirements: text
      .split(/\n|(?<=[.!?])\s+/)
      .filter((s) =>
        /experience|proficien|familiar|degree|knowledge|required|responsib|you will/i.test(
          s,
        ),
      )
      .slice(0, 8)
      .map((s) => s.trim().slice(0, 500)),
    evidence: [],
    version: SOURCE_VERSION,
  };
}
export function match(job, profile, p, analysis = analyze(job)) {
  const strengths = [],
    gaps = [],
    title = job.title.toLowerCase();
  const aliases = (s) =>
    s
      .toLowerCase()
      .replace(/artificial intelligence/g, "ai")
      .replace(/machine learning/g, "ml")
      .replace(
        /\b(engineer|engineering|developer|intern|associate|junior|graduate|trainee)\b/g,
        "",
      )
      .trim()
      .split(/\s+/)
      .filter(Boolean);
  const titleHit = p.titles.some((t) => {
    const words = aliases(t);
    return words.length
      ? words.every((w) =>
          new RegExp(
            `\\b${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
            "i",
          ).test(
            title
              .replace(/machine learning/g, "ml")
              .replace(/artificial intelligence/g, "ai"),
          ),
        )
      : title.includes(t.toLowerCase());
  });
  const related = p.titles.some((t) =>
    aliases(t).some((w) =>
      new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(
        job.description
          .replace(/machine learning/gi, "ml")
          .replace(/artificial intelligence/gi, "ai"),
      ),
    ),
  );
  let score = titleHit ? 35 : related ? 15 : 0;
  if (titleHit) strengths.push("Matches a role you are looking for");
  else gaps.push("Outside your preferred roles");
  const early = /intern|junior|graduate|trainee|associate|entry/i.test(
    job.title + " " + job.seniority,
  );
  const senior = /\b(senior|staff|principal|lead|director|manager)\b/i.test(
    job.title + " " + job.seniority,
  );
  let excluded =
    (!titleHit && !related) || (job.mode === "Remote" && !p.allowRemote);
  if (analysis.minimumYears !== null && analysis.minimumYears > p.maxYears) {
    excluded = true;
    gaps.push(
      `Asks for ${analysis.minimumYears}+ years; your limit is ${p.maxYears}`,
    );
  } else if (senior && p.maxYears < 4) {
    excluded = true;
    gaps.push("Seniority exceeds your saved experience level");
  } else {
    score += early ? 20 : 10;
    if (early) strengths.push("Entry-level role");
    else gaps.push("Confirm expected experience");
  }
  const countries = (job.countries || []).map((c) => String(c).toLowerCase());
  const country = p.country.toLowerCase();
  const explicitWorld =
    /\b(work from anywhere in the world|(?:this role|this position|candidates|applicants|location)[^.!?\n]{0,60}\bworldwide)\b/i.test(
      job.description,
    );
  let eligible =
    countries.includes(country) ||
    (country === "pakistan" && countries.includes("pk"));
  if (countries.length && !eligible) {
    excluded = true;
    gaps.push("Location restrictions do not include your country");
  }
  if (!countries.length && explicitWorld) eligible = true;
  // A feed's missing country restrictions are unknown, not evidence of worldwide hiring.
  if (eligible) {
    score += 25;
    strengths.push("Source supports your remote location");
  } else gaps.push("Confirm country eligibility and work authorization");
  if (job.timezoneRestrictions?.length)
    gaps.push("Check the stated working time zones");
  const candidate = String(profile.skills || "")
    .split(/[,;\n]/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const supported = analysis.skills.filter((s) =>
    candidate.includes(s.toLowerCase()),
  );
  const missing = analysis.skills.filter((s) => !supported.includes(s));
  score += analysis.skills.length
    ? Math.round((20 * supported.length) / analysis.skills.length)
    : 0;
  if (supported.length) strengths.push("Your skills: " + supported.join(", "));
  if (missing.length) gaps.push("Skills to review: " + missing.join(", "));
  if (job.deadline && Date.parse(job.deadline) < Date.now()) {
    excluded = true;
    gaps.push("Source expiry date has passed");
  }
  return {
    score,
    strengths,
    gaps,
    eligible: !excluded && eligible,
    decision: excluded
      ? "excluded"
      : titleHit && eligible && score >= p.minimumScore
        ? "recommended"
        : "review",
    version: SOURCE_VERSION,
  };
}
export async function searchSource(task, p, fetcher = fetch) {
  const u = new URL("https://himalayas.app/jobs/api/search");
  u.searchParams.set("q", task.title);
  u.searchParams.set("country", p.country);
  u.searchParams.set("sort", "recent");
  u.searchParams.set("page", String(task.page));
  if (p.maxYears < 3) u.searchParams.set("seniority", "Entry-level");
  const response = await fetcher(u, {
    signal: AbortSignal.timeout(15000),
    redirect: "error",
    headers: { Accept: "application/json" },
  });
  if (!response.ok)
    throw Error(
      response.status === 429
        ? "The job source is busy. Please try again later."
        : `Job source returned ${response.status}.`,
    );
  const reader = response.body.getReader();
  let length = 0,
    parts = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > 4_000_000) {
      await reader.cancel();
      throw Error("Source response exceeded the limit.");
    }
    parts.push(value);
  }
  const bytes = new Uint8Array(length);
  let pos = 0;
  for (const part of parts) {
    bytes.set(part, pos);
    pos += part.length;
  }
  const data = JSON.parse(new TextDecoder().decode(bytes));
  return {
    jobs: (data.jobs || [])
      .slice(0, 20)
      .map(normalizeSourceJob)
      .filter(Boolean),
    total: Number(data.totalCount) || 0,
  };
}
