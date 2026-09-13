// dist/core.js
function safeURL(value) {
  try {
    const u = new URL(value);
    return ["http:", "https:"].includes(u.protocol) && !u.username && !u.password ? u.href : "";
  } catch {
    return "";
  }
}
function canonicalURL(value) {
  const s = safeURL(value);
  if (!s) return "";
  const u = new URL(s);
  if (/(^|\.)indeed\.com$/.test(u.hostname) && u.searchParams.get("jk"))
    return `https://${u.hostname}/viewjob?jk=${encodeURIComponent(u.searchParams.get("jk"))}`;
  for (const k of [...u.searchParams.keys()])
    if (/^(utm_|ref$|source$|tracking)/i.test(k)) u.searchParams.delete(k);
  u.hash = "";
  u.searchParams.sort();
  return u.href.replace(/\/$/, "");
}

// lib/discovery.mjs
var SOURCE_VERSION = "2026-09-himalayas-v1";
var DEFAULT_PREFERENCES = {
  titles: ["DevOps", "Cloud Engineer", "AI Engineer", "Machine Learning"],
  cities: ["Islamabad", "Rawalpindi"],
  country: "Pakistan",
  allowRemote: true,
  maxYears: 2,
  minimumScore: 60,
  pages: 2,
  notifications: true,
  daily: false
};
function preferences(input = {}) {
  const list = (v, fallback) => [
    ...new Set(
      (Array.isArray(v) ? v : fallback).map((s) => String(s).trim().slice(0, 80)).filter(Boolean)
    )
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
    daily: input.daily === true
  };
}
function plainText(html) {
  return String(html || "").replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, "").replace(/<\/(p|li|div|h[1-6])>/gi, "\n").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/[ \t]+/g, " ").replace(/\n\s*\n/g, "\n").trim();
}
var date = (v) => {
  const n = Number(v);
  const d = new Date(Number.isFinite(n) && n > 0 ? n * 1e3 : v);
  return Number.isFinite(+d) ? d.toISOString() : null;
};
function normalizeSourceJob(j) {
  const url = canonicalURL(j.guid || j.applicationLink);
  if (!url || new URL(url).hostname !== "himalayas.app" || !j.title || !j.companyName || !j.description)
    return null;
  const restrictions = Array.isArray(j.locationRestrictions) ? j.locationRestrictions : [];
  return {
    source_key: url,
    title: String(j.title).slice(0, 200),
    company: String(j.companyName).slice(0, 200),
    url,
    source: "Himalayas",
    description: plainText(j.description).slice(0, 5e4),
    location: restrictions.length ? restrictions.join(", ") : "Remote \xB7 country not specified",
    mode: "Remote",
    countries: restrictions,
    timezoneRestrictions: Array.isArray(j.timezoneRestrictions) ? j.timezoneRestrictions : [],
    seniority: j.seniority || "",
    employmentType: j.employmentType || "",
    companySlug: j.companySlug || "",
    postedAt: date(j.pubDate),
    deadline: date(j.expiryDate),
    salary: j.minSalary ? `${j.currency || ""} ${j.minSalary}${j.maxSalary ? "\u2013" + j.maxSalary : ""} / ${j.salaryPeriod || "year"}` : "",
    discoveredAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
function analyze(job) {
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
    "Grafana"
  ];
  const has = (word) => new RegExp(
    `(^|[^a-z0-9])${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^a-z0-9])`,
    "i"
  ).test(text);
  const years = [
    ...text.matchAll(
      /\b(\d{1,2})(?:\s*[-–]\s*\d{1,2})?\s*\+?\s*years?\s+(?:of\s+)?(?:relevant\s+|professional\s+|industry\s+)?experience/gi
    )
  ].map((m) => Number(m[1]));
  return {
    method: "Evidence extraction",
    skills: tech.filter(has),
    minimumYears: years.length ? Math.max(...years) : null,
    requirements: text.split(/\n|(?<=[.!?])\s+/).filter(
      (s) => /experience|proficien|familiar|degree|knowledge|required|responsib|you will/i.test(
        s
      )
    ).slice(0, 8).map((s) => s.trim().slice(0, 500)),
    evidence: [],
    version: SOURCE_VERSION
  };
}
function match(job, profile, p, analysis = analyze(job)) {
  const strengths = [], gaps = [], title = job.title.toLowerCase();
  const aliases = (s) => s.toLowerCase().replace(/artificial intelligence/g, "ai").replace(/machine learning/g, "ml").replace(
    /\b(engineer|engineering|developer|intern|associate|junior|graduate|trainee)\b/g,
    ""
  ).trim().split(/\s+/).filter(Boolean);
  const titleHit = p.titles.some((t) => {
    const words = aliases(t);
    return words.length ? words.every(
      (w) => new RegExp(
        `\\b${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
        "i"
      ).test(
        title.replace(/machine learning/g, "ml").replace(/artificial intelligence/g, "ai")
      )
    ) : title.includes(t.toLowerCase());
  });
  const related = p.titles.some(
    (t) => aliases(t).some(
      (w) => new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(
        job.description.replace(/machine learning/gi, "ml").replace(/artificial intelligence/gi, "ai")
      )
    )
  );
  let score = titleHit ? 35 : related ? 15 : 0;
  if (titleHit) strengths.push("Matches a role you are looking for");
  else gaps.push("Outside your preferred roles");
  const early = /intern|junior|graduate|trainee|associate|entry/i.test(
    job.title + " " + job.seniority
  );
  const senior = /\b(senior|staff|principal|lead|director|manager)\b/i.test(
    job.title + " " + job.seniority
  );
  let excluded = !titleHit && !related || job.mode === "Remote" && !p.allowRemote;
  if (analysis.minimumYears !== null && analysis.minimumYears > p.maxYears) {
    excluded = true;
    gaps.push(
      `Asks for ${analysis.minimumYears}+ years; your limit is ${p.maxYears}`
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
  const explicitWorld = /\b(work from anywhere in the world|(?:this role|this position|candidates|applicants|location)[^.!?\n]{0,60}\bworldwide)\b/i.test(
    job.description
  );
  let eligible = countries.includes(country) || country === "pakistan" && countries.includes("pk");
  if (countries.length && !eligible) {
    excluded = true;
    gaps.push("Location restrictions do not include your country");
  }
  if (!countries.length && explicitWorld) eligible = true;
  if (eligible) {
    score += 25;
    strengths.push("Source supports your remote location");
  } else gaps.push("Confirm country eligibility and work authorization");
  if (job.timezoneRestrictions?.length)
    gaps.push("Check the stated working time zones");
  const candidate = String(profile.skills || "").split(/[,;\n]/).map((s) => s.trim().toLowerCase()).filter(Boolean);
  const supported = analysis.skills.filter(
    (s) => candidate.includes(s.toLowerCase())
  );
  const missing = analysis.skills.filter((s) => !supported.includes(s));
  score += analysis.skills.length ? Math.round(20 * supported.length / analysis.skills.length) : 0;
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
    decision: excluded ? "excluded" : titleHit && eligible && score >= p.minimumScore ? "recommended" : "review",
    version: SOURCE_VERSION
  };
}
async function searchSource(task, p, fetcher = fetch) {
  const u = new URL("https://himalayas.app/jobs/api/search");
  u.searchParams.set("q", task.title);
  u.searchParams.set("country", p.country);
  u.searchParams.set("sort", "recent");
  u.searchParams.set("page", String(task.page));
  if (p.maxYears < 3) u.searchParams.set("seniority", "Entry-level");
  const response = await fetcher(u, {
    signal: AbortSignal.timeout(15e3),
    redirect: "error",
    headers: { Accept: "application/json" }
  });
  if (!response.ok)
    throw Error(
      response.status === 429 ? "The job source is busy. Please try again later." : `Job source returned ${response.status}.`
    );
  const reader = response.body.getReader();
  let length = 0, parts = [];
  for (; ; ) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > 4e6) {
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
    jobs: (data.jobs || []).slice(0, 20).map(normalizeSourceJob).filter(Boolean),
    total: Number(data.totalCount) || 0
  };
}

// lib/company.mjs
var cache = /* @__PURE__ */ new Map();
async function companyContext(job, fetcher = fetch) {
  const slug = job.companySlug;
  if (!/^[a-z0-9-]{1,160}$/.test(slug || "")) return null;
  const hit = cache.get(slug);
  if (hit && Date.now() - hit.at < 864e5) return hit.value;
  const r = await fetcher("https://mcp.himalayas.app/mcp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream"
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: {
        name: "get_company_details",
        arguments: { company_slug: slug }
      }
    }),
    signal: AbortSignal.timeout(1e4),
    redirect: "error"
  });
  if (!r.ok) throw Error("Company profile source could not be read.");
  const body = await r.text();
  if (body.length > 15e4) throw Error("Company profile is too large.");
  const message = JSON.parse(
    body.startsWith("event:") ? body.split("\n").find((l) => l.startsWith("data: ")).slice(6) : body
  );
  if (message.error || message.result?.isError)
    throw Error("Company profile source returned an error.");
  const text = message.result?.content?.filter((c) => c.type === "text").map((c) => c.text).join("\n") || "";
  const name = text.match(/^#\s+(.+)/)?.[1]?.trim();
  if (!name || name.toLowerCase() !== job.company.trim().toLowerCase())
    throw Error("Company identity could not be matched to this listing.");
  const website = text.match(/\*\*Website:\*\*\s+(https:\/\/[^\s]+)/)?.[1] || "";
  const value = {
    website,
    source: {
      url: `https://himalayas.app/companies/${slug}`,
      title: name + " company profile",
      notes: text.slice(0, 1e4),
      checkedAt: (/* @__PURE__ */ new Date()).toISOString(),
      verified: false,
      kind: "Company profile via Himalayas",
      identityMatched: true
    }
  };
  if (cache.size > 100) cache.delete(cache.keys().next().value);
  cache.set(slug, { at: Date.now(), value });
  return value;
}

// lib/pipeline.mjs
var now = () => (/* @__PURE__ */ new Date()).toISOString();
function checked(result) {
  if (result.error) throw Error(result.error.message);
  return result.data;
}
function newRun(profile) {
  const p = preferences(profile.preferences);
  const tasks = p.allowRemote ? p.titles.flatMap((title) => [1, 2].map((page) => ({ title, page }))) : [];
  return {
    preferences: p,
    profile: { ...profile },
    cursor: 0,
    tasks,
    found: 0,
    saved: 0,
    excluded: 0,
    errors: [],
    events: [
      {
        at: now(),
        state: "STARTING",
        message: "Search created using your saved preferences."
      }
    ]
  };
}
async function processRun(db, uid, id, fetcher = fetch) {
  let run = checked(
    await db.from("automation_runs").select("*").eq("id", id).eq("user_id", uid).single()
  );
  if (["PAUSED", "COMPLETED", "FAILED"].includes(run.state)) return run;
  const lease = now();
  const claimed = checked(
    await db.from("automation_runs").update({
      lease_until: new Date(Date.now() + 9e4).toISOString(),
      state: "SEARCHING",
      updated_at: lease
    }).eq("id", id).eq("user_id", uid).eq("updated_at", run.updated_at).lt("lease_until", lease).not("state", "in", "(PAUSED,COMPLETED,FAILED)").select()
  );
  if (!claimed.length) return run;
  const d = structuredClone(run.data), task = d.tasks[d.cursor];
  const event = (state2, message) => {
    d.events.push({ at: now(), state: state2, message });
    d.events = d.events.slice(-60);
  };
  try {
    if (task) {
      event(
        "SEARCHING",
        `Searching ${task.title}, page ${task.page}, on Himalayas.`
      );
      const cacheKey = JSON.stringify([task, d.preferences.country]);
      const source = await cachedSource(
        cacheKey,
        () => searchSource(task, d.preferences, fetcher)
      );
      const current = checked(
        await db.from("automation_runs").select("state").eq("id", id).eq("user_id", uid).single()
      );
      if (current.state === "PAUSED")
        return checked(
          await db.from("automation_runs").update({ lease_until: "1970-01-01" }).eq("id", id).eq("user_id", uid).select().single()
        );
      d.found += source.jobs.length;
      event(
        "ANALYZING",
        `Read ${source.jobs.length} real listings and extracted their stated requirements.`
      );
      const existing = source.jobs.length ? checked(
        await db.from("jobs").select("id,source_key,data").eq("user_id", uid).in(
          "source_key",
          source.jobs.map((j) => j.source_key)
        )
      ) : [];
      event(
        "MATCHING",
        "Comparing titles, experience, skills and location restrictions."
      );
      let researched = 0;
      for (const j of source.jobs) {
        const a = analyze(j), m = match(j, d.profile, d.preferences, a);
        if (m.decision === "excluded") {
          d.excluded++;
          continue;
        }
        const old = existing.find((x) => x.source_key === j.source_key);
        const data = {
          ...j,
          analysis: a,
          match: m,
          research: old?.data?.research || [],
          note: old?.data?.note || ""
        };
        data.companyWebsite = old?.data?.companyWebsite || "";
        if (researched < 2 && !data.research.some(
          (s) => s.notes && Date.now() - Date.parse(s.checkedAt) < 864e5
        )) {
          researched++;
          event(
            "RESEARCHING_COMPANY",
            `Reading the company profile for ${j.company}.`
          );
          try {
            const context = await companyContext(j, fetcher);
            if (context) {
              data.research = [context.source];
              data.companyWebsite ||= context.website;
            }
          } catch {
            data.research = [
              {
                kind: "Company profile",
                url: j.url,
                error: "Company research could not be retrieved. Retry from the job details.",
                checkedAt: now()
              }
            ];
          }
        }
        const saved = old ? checked(
          await db.from("jobs").update({ data, updated_at: now() }).eq("id", old.id).eq("user_id", uid).select().single()
        ) : checked(
          await db.from("jobs").insert({ user_id: uid, source_key: j.source_key, data }).select().single()
        );
        checked(
          await db.from("job_analysis").upsert(
            { user_id: uid, job_id: saved.id, data: a },
            { onConflict: "user_id,job_id" }
          )
        );
        checked(
          await db.from("job_matches").upsert(
            { user_id: uid, job_id: saved.id, data: m },
            { onConflict: "user_id,job_id" }
          )
        );
        checked(
          await db.from("company_research").upsert(
            {
              user_id: uid,
              job_id: saved.id,
              data: { sources: data.research }
            },
            { onConflict: "user_id,job_id" }
          )
        );
        if (!old) d.saved++;
      }
      event(
        "SAVING_JOBS",
        "Saved relevant listings and updated existing matches without duplicates."
      );
    }
  } catch (e) {
    d.errors.push({
      at: now(),
      task,
      message: String(e.message).slice(0, 240)
    });
    event(
      "SEARCHING",
      "This source request failed. Other searches can continue."
    );
  }
  d.cursor++;
  const done = d.cursor >= d.tasks.length, failed = done && d.tasks.length > 0 && d.errors.length >= d.tasks.length;
  const state = failed ? "FAILED" : done ? "COMPLETED" : "SEARCHING";
  if (done)
    event(
      state,
      d.tasks.length ? `Search finished: ${d.saved} new jobs saved, ${d.excluded} outside your preferences.` : "No enabled remote source. Enable remote search or browse your preferred city on Indeed."
    );
  const updated = checked(
    await db.from("automation_runs").update({ data: d, state, lease_until: "1970-01-01", updated_at: now() }).eq("id", id).eq("user_id", uid).neq("state", "PAUSED").select()
  );
  if (done && updated.length && d.preferences.notifications)
    checked(
      await db.from("notifications").insert({
        user_id: uid,
        data: { message: d.events.at(-1).message, runId: id, read: false }
      })
    );
  return updated[0] || checked(
    await db.from("automation_runs").select("*").eq("id", id).eq("user_id", uid).single()
  );
}
var cache2 = /* @__PURE__ */ new Map();
async function cachedSource(key, fn) {
  const hit = cache2.get(key);
  if (hit && Date.now() - hit.at < 36e5) return hit.data;
  const data = await fn();
  if (cache2.size > 100) cache2.delete(cache2.keys().next().value);
  cache2.set(key, { at: Date.now(), data });
  return data;
}
export {
  checked,
  newRun,
  processRun
};
