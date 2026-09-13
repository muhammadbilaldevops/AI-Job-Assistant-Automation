import {
  STATUSES,
  TITLES,
  PRESET_VERSION,
  blankProfile,
  safeURL,
  normalizeJob,
  mergeJobs,
  matchJob,
  researchReady,
  buildPrompt,
  validateResume,
  escapeHTML as e,
  resumeHTML,
} from "./core.js";
import {
  defaultSearches,
  defaultRules,
  normalizeSearch,
  normalizeRules,
  normalizeFeed,
  searchLink,
} from "./preferences.js";
import { fullResumeText, pageBudget } from "./documents.js";
import { download, createDocx } from "./export.js";
const STORAGE = "applydesk.workspace.v1",
  root = document.querySelector("#app");
let state = {
    version: 1,
    profile: blankProfile(),
    jobs: [],
    searches: defaultSearches(),
    rules: defaultRules(),
    feeds: [],
    autoCollect: false,
  },
  page = "dashboard",
  selected = null,
  tab = "research",
  query = "",
  filter = "All",
  eligibility = "All",
  fullResume = true,
  master = "",
  editingSearch = null,
  twoPages = true,
  editingJob = null;
let storageError = "";
try {
  const saved = localStorage.getItem(STORAGE);
  if (saved) {
    const x = JSON.parse(saved);
    if (x.version === 1 && Array.isArray(x.jobs) && x.profile)
      state = {
        ...x,
        jobs: x.jobs.filter((j) => j.source !== "Fictional demo"),
      };
    else
      storageError =
        "An incompatible workspace was found. Export or restore a compatible backup.";
  }
} catch {
  storageError =
    "Browser storage is unavailable or damaged. Export a backup before closing this page.";
}
try {
  const r = await fetch("./prompts/master-resume.txt");
  if (!r.ok) throw Error();
  master = await r.text();
} catch {
  storageError +=
    " The master preset could not be loaded. Reload before generating a prompt.";
}
state.searches = Array.isArray(state.searches)
  ? state.searches
  : defaultSearches();
state.rules = state.rules || defaultRules();
state.feeds = Array.isArray(state.feeds) ? state.feeds : [];
state.autoCollect = state.autoCollect === true;
const priority = (j) => matchJob(j, state.profile, Date.now(), state.rules);
let pendingResearch = null,
  collecting = false;
const $ = (s) => document.querySelector(s),
  val = (id) => document.getElementById(id)?.value ?? "",
  job = () => state.jobs.find((x) => x.id === selected);
function toast(s) {
  const t = $("#toast");
  t.textContent = s;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 5000);
}
function persist() {
  try {
    localStorage.setItem(STORAGE, JSON.stringify(state));
    return true;
  } catch {
    toast("Storage is full or unavailable. Export a backup now.");
    return false;
  }
}
function go(next) {
  page = next;
  render();
  window.scrollTo(0, 0);
}
function date(s) {
  return s
    ? new Date(s).toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "Unknown";
}
function button(text, action, extra = "") {
  return `<button data-action="${action}" ${extra}>${text}</button>`;
}
function field(id, label, value = "", type = "text", extra = "") {
  return `<div class="field"><label for="${id}">${label}</label><input id="${id}" type="${type}" value="${e(value)}" ${extra}></div>`;
}
function area(id, label, value = "", extra = "") {
  return `<div class="field"><label for="${id}">${label}</label><textarea id="${id}" ${extra}>${e(value)}</textarea></div>`;
}
function select(id, label, options, value) {
  return `<div class="field"><label for="${id}">${label}</label><select id="${id}">${options.map((o) => `<option ${o === value ? "selected" : ""}>${e(o)}</option>`).join("")}</select></div>`;
}
function heading(title, description, actions = "") {
  return `<div class="heading"><div><h1>${title}</h1><p>${description}</p></div><div class="actions">${actions}</div></div>`;
}
function sortedJobs() {
  return [...state.jobs]
    .filter(
      (j) =>
        (filter === "All" || j.status === filter) &&
        (eligibility === "All" || priority(j).eligibility === eligibility) &&
        `${j.title} ${j.company} ${j.location}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort((a, b) => priority(b).score - priority(a).score);
}
function card(j) {
  const m = priority(j);
  return `<article class="jobcard"><div class="jobtop"><div><button class="jobtitle" data-job="${e(j.id)}">${e(j.title)}</button><div class="jobmeta">${e(j.company)}<br>${e(j.location)} · ${e(j.mode)}</div></div><div class="score">${m.score}<small>priority</small></div></div><div class="tags"><span class="tag ${m.eligibility.toLowerCase()}">${m.eligibility}</span><span class="tag">${e(j.status)}</span><span class="tag">Posted: ${date(j.postedAt)}</span></div></article>`;
}
function empty() {
  return `<div class="empty"><h3>Your next opportunity starts here</h3><p>Save a job description to compare it with your skills and prepare a tailored application.</p>${button("Save your first job", "add", 'class="primary"')}</div>`;
}
function dashboard() {
  const active = state.jobs.filter(
      (j) => !["Archived", "Rejected"].includes(j.status),
    ),
    eligible = active.filter((j) => priority(j).eligibility === "Eligible");
  return (
    heading(
      "Your application workspace",
      "A focused search. A thoughtful application.",
      button("+ Save a job", "add", 'class="primary"'),
    ) +
    `<div class="stats"><div class="stat"><span>Saved opportunities</span><b>${active.length}</b><span>In your workspace</span></div><div class="stat"><span>Meets acceptance rules</span><b>${eligible.length}</b><span>Review skills before applying</span></div><div class="stat"><span>Applications sent</span><b>${state.jobs.filter((j) => j.status === "Applied").length}</b><span>Manually confirmed by you</span></div><div class="stat"><span>Interview stage</span><b>${state.jobs.filter((j) => j.status === "Interview").length}</b><span>Keep your notes together</span></div></div><div class="workgrid"><section class="panel"><div class="panel-title"><h2>Worth a closer look</h2>${button("View all jobs", "jobs", 'class="pill-btn"')}</div><p class="muted">A transparent priority score, not an ATS score or a hiring prediction.</p>${
      active.filter((j) => priority(j).eligibility !== "Excluded").length
        ? active
            .filter((j) => priority(j).eligibility !== "Excluded")
            .sort((a, b) => priority(b).score - priority(a).score)
            .slice(0, 4)
            .map(card)
            .join("")
        : empty()
    }</section><aside><div class="panel"><div class="section-label">YOUR SEARCH FOCUS</div><h2>${e(state.rules.cities.filter((c) => c !== "Rwp").join(", "))}.<br>${state.rules.allowRemote ? "Remote from " + e(state.rules.remoteCountry) + "." : "Office roles only."}</h2><p class="muted">${state.searches.filter((x) => x.enabled).length} active saved searches. Up to ${state.rules.maxYears} years of required experience.</p><div class="tags"><span class="tag">Up to 100 km discovery</span><span class="tag">Entry-level</span></div><div class="links">${button("Open search planner", "search", 'class="pill-btn"')}</div></div><div class="panel"><h2>A repeatable routine</h2>${[
      [
        "Save your real experience",
        "One profile becomes the source for every tailored draft.",
      ],
      [
        "Capture a promising job",
        "Review the location, requirements and original listing.",
      ],
      [
        "Research, tailor, review",
        "Save your sources and check every claim before exporting.",
      ],
      [
        "Apply and keep track",
        "Submit on the employer site yourself, then update the status.",
      ],
    ]
      .map(
        (s, i) =>
          `<div class="step"><span class="num">${i + 1}</span><div><b>${s[0]}</b><p>${s[1]}</p></div></div>`,
      )
      .join("")}</div></aside></div>`
  );
}
function jobsPage() {
  return (
    heading(
      "Saved jobs",
      "Keep the description, research and application in one place.",
      button("+ Save a job", "add", 'class="primary"'),
    ) +
    `<div class="filters"><input id="search-jobs" aria-label="Search saved jobs" placeholder="Search titles, companies or locations" value="${e(query)}"><select id="status-filter" aria-label="Filter by application status">${["All", ...STATUSES].map((o) => `<option ${o === filter ? "selected" : ""}>${o}</option>`).join("")}</select><select id="eligibility-filter" aria-label="Filter by location eligibility">${["All", "Eligible", "Review", "Excluded"].map((o) => `<option ${o === eligibility ? "selected" : ""}>${o}</option>`).join("")}</select></div><div id="job-results">${sortedJobs().length ? sortedJobs().map(card).join("") : empty()}</div>`
  );
}
function profilePage() {
  const p = state.profile;
  return (
    heading(
      "Your verified profile",
      "Write this once. Keep every future draft grounded in it.",
      button("Save profile", "save-profile", 'class="primary"'),
    ) +
    `<div class="notice">Your details stay in this browser unless you download a backup or deliberately send a generation prompt to a provider. No resume is required to try the product. Do not enter passwords or identity document numbers.</div><div class="panel formgrid">${field("name", "Name", p.name)}${field("contact", "Contact line and public portfolio links", p.contact)}<div class="full">${area("skills", "Verified skills, one per line or separated by commas", p.skills, 'placeholder="Only skills you can honestly discuss in an interview"')}${area("experience", "Real work history: official title, employer, dates, responsibilities and evidence", p.experience, 'placeholder="Do not turn coursework into employment. If you have no work experience, say that explicitly."')}${area("education", "Education and real certifications", p.education)}${area("projects", "Real projects: what you built, your contribution, tools and evidence links", p.projects)}${area("preferences", "Search and writing preferences", p.preferences)}</div></div><div class="notice warn">Changing this profile marks saved documents for a fresh review. Your original master preset is kept separately and never rewritten.</div>`
  );
}
function searchPage() {
  const current = state.searches.find((x) => x.id === editingSearch) || {
    title: "",
    location: "Islamabad",
    radius: 100,
  };
  return (
    heading(
      "Find your next role",
      "Your searches and acceptance rules are remembered on this device.",
      '<a class="external-button" href="https://pk.indeed.com/" target="_blank" rel="noopener noreferrer">Browse Indeed Pakistan ↗</a>',
    ) +
    `<div class="connection-banner"><div><span class="status-dot"></span><b>Indeed opens in your browser</b><p>Sign in there using your usual browser profile. Indeed manages your cookies and may ask you to sign in again. Applydesk cannot read or lock that session.</p></div><span class="tag">Manual browsing available</span></div><div class="split"><section class="panel"><div class="section-label">1 · SEARCH SETTINGS</div><h2>${editingSearch ? "Edit saved search" : "Add a saved search"}</h2><form id="search-form">${field("search-title", "Job title", current.title, "text", 'required maxlength="120" placeholder="e.g. DevOps Intern"')}${field("search-location", "Search location", current.location, "text", 'required maxlength="120"')}${field("search-radius", "Discovery radius in km (0–100)", current.radius, "number", 'required min="0" max="100"')}<div class="actions"><button type="submit" class="primary">${editingSearch ? "Save changes" : "Add search"}</button>${editingSearch ? button("Cancel edit", "cancel-search") : ""}</div></form><p class="muted">Links request newest jobs and your chosen radius. Confirm the filters on Indeed because the site controls how they are applied.</p></section><section class="panel"><div class="section-label">2 · ACCEPTANCE RULES</div><h2>What counts as a match?</h2><form id="rules-form">${area("rule-titles", "Target titles or role families, one per line", state.rules.titles.join("\n"), "required")}${field("rule-cities", "Accepted office cities, separated by commas", state.rules.cities.join(", "), "text", "required")}${field("rule-country", "Country you will work remotely from", state.rules.remoteCountry, "text", "required")}${field("rule-years", "Maximum required years of experience", state.rules.maxYears, "number", 'required min="0" max="50"')}<label class="checkrow"><input id="rule-remote" type="checkbox" ${state.rules.allowRemote ? "checked" : ""}>Include remote opportunities</label><button type="submit" class="primary">Save matching rules</button></form><p class="muted">A keyword match is a shortlist aid. Review the description, work authorization, salary and time zone yourself.</p></section></div><div class="panel-title"><h2>Saved searches <span class="count">${state.searches.length}</span></h2></div><div class="search-list">${state.searches.map((x) => `<article class="search-item ${x.enabled ? "" : "paused-search"}"><span class="section-label">${e(x.location)} · ${x.radius} km</span><h3>${e(x.title)}</h3><a href="${e(searchLink(x))}" target="_blank" rel="noopener noreferrer">Browse real jobs ↗</a><div class="actions compact">${button("Edit", "edit-search", `data-id="${e(x.id)}" class="pill-btn"`)}${button(x.enabled ? "Pause" : "Enable", "toggle-search", `data-id="${e(x.id)}" class="pill-btn"`)}${button("Remove", "remove-search", `data-id="${e(x.id)}" class="pill-btn danger"`)}</div></article>`).join("") || '<div class="empty">Add your first search above.</div>'}</div>`
  );
}
function documentsPage() {
  const current = job();
  return (
    heading(
      "Application documents",
      "Choose a saved job, research its company, then prepare your application.",
    ) +
    `<section class="panel"><div class="section-label">START WITH A REAL OPPORTUNITY</div><label for="document-job">Which job are you preparing for?</label><select id="document-job"><option value="">Choose a saved job</option>${state.jobs
      .filter((j) => j.status !== "Archived")
      .map(
        (j) =>
          `<option value="${e(j.id)}" ${current?.id === j.id ? "selected" : ""}>${e(j.title)} · ${e(j.company)}</option>`,
      )
      .join(
        "",
      )}</select>${current ? `<div class="document-choices"><button data-doc="research"><span class="num">1</span><b>Company research</b><small>Current sources for your professional summary</small></button><button data-doc="resume"><span class="num">2</span><b>Tailored resume</b><small>Full CV or exact master sections · Word export</small></button><button data-doc="coverLetter"><span class="num">3</span><b>Cover letter <span class="tag">Optional</span></b><small>Simple English, company-specific, no em dashes</small></button></div>` : '<div class="empty"><h3>Select a job to begin</h3><p>Your documents will stay attached to that job.</p>' + button("Save a real job", "add", 'class="primary"') + "</div>"}</section>`
  );
}
function addPage() {
  const current = state.jobs.find((j) => j.id === editingJob) || {};
  return (
    heading(
      editingJob ? "Edit opportunity" : "Save an opportunity",
      "Paste the full description. Keep the original link for your final review.",
    ) +
    `<form id="job-form" class="panel formgrid">${field("title", "Job title", current.title ?? "", "text", 'required maxlength="200"')}${field("company", "Company", current.company ?? "", "text", 'required maxlength="200"')}${field("url", "Original job URL", current.url ?? "", "url", "required")}${field("location", "Location", current.location ?? "", "text", "required")}${select("mode", "Work arrangement", ["On-site", "Hybrid", "Remote"], current.mode || "On-site")}${select("remoteEligibility", "Remote eligibility", ["Unknown", "Pakistan", "Worldwide", "Eligible for my country", "Restricted"], current.remoteEligibility || "Unknown")}${field("postedAt", "Date posted (leave blank if unknown)", current.postedAt ?? "", "date")}${field("deadline", "Application deadline (optional)", current.deadline ?? "", "date")}${field("minYears", "Minimum required years (optional)", current.minYears ?? "", "number", 'min="0" max="50"')}${field("source", "Source", current.source || "Manual")}<div class="full">${area("description", "Full job description", current.description || "", 'required maxlength="50000"')}<div class="actions"><button class="primary" type="submit">Save job</button><button type="button" data-action="jobs">Cancel</button></div></div></form>`
  );
}
function researchPanel(j) {
  return `<div class="split"><section class="panel"><h2>Company research</h2><p class="muted">Use the official company and careers pages. Verify the company identity, products and role priorities. Record facts separately from reasonable role-related inferences.</p><div class="links"><a href="https://www.google.com/search?q=${encodeURIComponent(j.company + " official website careers")}" target="_blank" rel="noopener noreferrer">Find official sources ↗</a></div><form id="research-form">${field("source-url", "Source URL", "", "url", "required")}<div class="actions">${button("Read this company page", "fetch-research", 'class="pill-btn"')}</div><div id="fetched-source"></div>${area("source-notes", "Facts and relevance to this vacancy", "", 'required placeholder="Facts: ...\nRole-related inference: ..."')}<label class="checkrow"><input type="checkbox" id="source-verified" required>I opened this source, checked the company identity and verified these notes.</label><button type="submit" class="primary">Save research source</button></form></section><section class="panel"><h2>Evidence notebook</h2>${j.research.length ? j.research.map((r, i) => `<div class="source"><a href="${e(safeURL(r.url))}" target="_blank" rel="noopener noreferrer">${e(new URL(r.url).hostname)} ↗</a><div class="source-date">Checked ${date(r.checkedAt)} · ${r.verified ? "Confirmed by you" : "Unverified"}</div><p>${e(r.notes)}</p><button class="pill-btn" data-remove-source="${i}">Remove source</button></div>`).join("") : '<p class="muted">No sources yet. Research is required before a company-specific draft can claim “After researching”.</p>'}<div class="notice ${researchReady(j) ? "good" : "warn"}">${researchReady(j) ? "Recent user-verified research is available. The app has not independently browsed or verified these facts." : "Add or refresh a source before generating. Notes older than 30 days require another check."}</div></section></div>`;
}
function documentText(j, kind) {
  return kind === "resume" && fullResume
    ? fullResumeText(j.resume || "", state.profile, twoPages)
    : j[kind] || "";
}
function paper(j, kind) {
  return `<article class="paper">${resumeHTML(documentText(j, kind)) || "<p>Your formatted document will appear here after you paste or generate a draft.</p>"}</article>`;
}
function docPanel(j, kind) {
  const resume = kind === "resume",
    text = j[kind] || "",
    v = resume
      ? validateResume(text, j)
      : {
          errors: !text.trim()
            ? ["Add a cover letter draft."]
            : /—/.test(text)
              ? ["Remove em dashes."]
              : [],
          warnings: [
            "Check names, company facts and every claim against your profile.",
          ],
        };
  return `<div class="notice">Free path: build the prompt, use it in your own AI chat with browsing, then paste the finished ${resume ? "three resume sections" : "cover letter"} below. Local generation is optional and needs Ollama running on your computer. This public site does not include a paid AI API.</div><div class="workflow-track"><span>Research ${researchReady(j) ? "✓" : "needed"}</span><span>Verified profile ${state.profile.skills ? "✓" : "needed"}</span><span>Draft ${text ? "✓" : "needed"}</span><span>Review ${j.reviewed ? "✓" : "needed"}</span></div><div class="actions">${button("Copy generation prompt", "copy-prompt", 'class="primary"')}${button("Download prompt", "download-prompt")}${button("Generate with local Ollama", "generate")}<span class="muted">${resume ? "Exact master preset " + PRESET_VERSION : "Separate cover letter preset"}</span></div><div class="split"><section class="panel">${area("draft", resume ? "Resume sections (Markdown)" : "Cover letter draft", text, 'class="editor"')}<div class="actions">${button("Save draft version", "save-draft", 'class="primary"')}${button("Check formatting", "check-draft")}</div><p class="muted">Typing is saved automatically. Save a draft version to create a named point in history.</p>${resume ? `<label class="checkrow"><input type="checkbox" id="full-resume" ${fullResume ? "checked" : ""}>Complete resume: include my name, contact details, education and real projects. Uncheck for the original three sections only.</label><label class="checkrow"><input type="checkbox" id="two-pages" ${twoPages ? "checked" : ""}>Two-page layout: begin education and projects on page 2. Check the final page count in Word; long content can overflow.</label><div class="notice" id="page-budget">${pageBudget(documentText(j, kind)).warnings.map(e).join(" ") || "10 pt body and 11 pt emphasis. Content is never silently cut or shrunk."}</div>` : ""}<label class="checkrow"><input type="checkbox" id="reviewed" ${j.reviewed ? "checked" : ""}>I checked the current resume and cover letter against my real experience and sources, and removed unsupported claims.</label><div id="validation">${validationHTML(v)}</div><div class="actions">${button("Download Word (.docx)", "docx")}${button("Print / Save as PDF", "print")}${button("Download draft (.md)", "markdown")}</div><details><summary>Saved versions (${j.versions.length})</summary>${j.versions.map((x, i) => `<p class="muted">${e(x.kind)} · ${date(x.createdAt)} ${button("Restore", "restore-version", `data-version="${i}" class="pill-btn"`)}</p>`).join("")}</details></section><section><div class="panel-title"><h2>Document preview</h2><span class="muted">A4 · Arial · 10/11 pt</span></div><div id="preview">${paper(j, kind)}</div></section></div>`;
}
function validationHTML(v) {
  return `<div class="notice ${v.errors.length ? "warn" : "good"}"><b>${v.errors.length ? "Before final export" : "Structure checks passed"}</b><ul class="checks">${[...v.errors, ...v.warnings].map((x) => `<li>${e(x)}</li>`).join("")}</ul></div>`;
}
function detailPage() {
  const j = job();
  if (!j) {
    page = "jobs";
    return jobsPage();
  }
  const m = priority(j);
  return (
    heading(
      e(j.title),
      e(j.company) + " · " + e(j.location),
      button("Back to jobs", "jobs"),
    ) +
    `<div class="panel"><div class="formgrid"><div>${select("job-status", "Application status", STATUSES, j.status)}</div><div><div class="section-label">Priority ${m.score}/100 · ${m.eligibility}</div><p class="muted">${e([...m.reasons, ...m.flags].join(" · "))}</p></div></div><div class="actions">${j.url ? `<a href="${e(safeURL(j.url))}" target="_blank" rel="noopener noreferrer">Open original listing ↗</a>` : ""}${button("Send this job to Make", "make-job", 'class="pill-btn"')}${button("Edit job", "edit-job", 'class="pill-btn"')}${button("Remove job", "remove-job", 'class="pill-btn danger"')}<span class="muted">First saved ${date(j.firstSeenAt)} · Last seen ${date(j.lastSeenAt)}</span></div><details><summary>Saved job description</summary><div class="detail-description">${e(j.description)}</div></details></div><div class="tabs">${[
      ["research", "Company research"],
      ["resume", "Tailored resume"],
      ["coverLetter", "Cover letter"],
      ["notes", "Application notes"],
    ]
      .map(
        ([key, label]) =>
          `<button data-tab="${key}" class="${tab === key ? "active" : ""}">${label}</button>`,
      )
      .join(
        "",
      )}</div>${tab === "research" ? researchPanel(j) : tab === "notes" ? `<div class="panel">${area("application-note", "Interview, follow-up and submission notes", j.note)}${button("Save notes", "save-notes", 'class="primary"')}<p class="muted">Open listing does not mean Applied. Update the status only after you have submitted successfully yourself.</p></div>` : docPanel(j, tab)}`
  );
}
function tracker() {
  return (
    heading(
      "Application tracker",
      "Move each opportunity forward when something actually changes.",
    ) +
    `<div class="board">${STATUSES.filter((s) => s !== "Archived")
      .map(
        (s) =>
          `<section class="panel"><h2>${s} <span class="count">${state.jobs.filter((j) => j.status === s).length}</span></h2>${
            state.jobs
              .filter((j) => j.status === s)
              .map(card)
              .join("") || '<p class="muted">No jobs at this stage.</p>'
          }</section>`,
      )
      .join("")}</div>`
  );
}
function automation() {
  return (
    heading(
      "Automation center",
      "Real source imports, clear run history and controls you can pause.",
    ) +
    `<div class="connection-banner"><div><span class="status-dot"></span><b>You control what runs</b><p>Employer feeds can refresh while this workspace is open. Indeed browsing stays in your browser; this site has no access to your Indeed login.</p></div><span class="tag">No paid AI fallback</span></div><div class="split"><section class="panel"><div class="section-label">MAKE · PERSONAL CONNECTION</div><h2>Check your local Make bridge</h2><p>The project owner's Make scenario is connected and active. It receives a supplied job batch and returns it for the app to merge. It does not discover jobs or apply to them.</p>${button("Check Make connection", "make-intake", 'class="primary"')}<p class="muted">Uses the private local configuration. Public visitors must run their own local copy and connect their own Make scenario. Webhook secrets are never embedded in this website.</p><div id="make-result"></div></section><section class="panel"><div class="section-label">AUTOMATIC SAVING</div><h2>Refresh saved employer feeds</h2><label class="checkrow"><input type="checkbox" id="auto-collect" ${state.autoCollect ? "checked" : ""}>Check my saved employer feeds when I open the app, then hourly while it stays open.</label><p class="muted">Only roles that meet your saved title, location and experience rules are automatically saved. Unclear remote eligibility is left for manual review. This does not search Indeed.</p>${button(collecting ? "Checking feeds…" : "Check feeds now", "collect-feeds", `class="primary" ${collecting ? "disabled" : ""}`)}<p class="muted">Last attempt: ${date(state.lastCollectAt)}. ${e(state.collectSummary || "No automatic check yet.")}</p></section></div><section class="panel"><h2>Add an employer source</h2><p class="muted">Use an employer’s real Greenhouse or Lever board token from its careers page. This source is separate from your Indeed searches.</p><form id="feed-form" class="formgrid">${select("feed-provider", "Provider", ["Greenhouse", "Lever"], "Greenhouse")}${field("feed-board", "Board token", "", "text", 'required pattern="[A-Za-z0-9_-]+"')}${field("feed-company", "Employer name", "", "text", 'required maxlength="200"')}<div class="full actions"><button type="submit" class="primary">Save employer feed</button></div></form>${state.feeds.map((f) => `<div class="source"><b>${e(f.company)}</b><p class="muted">${e(f.provider)} · ${e(f.board)} · ${e(f.lastResult || "Not checked yet")}</p><div class="actions">${button("Import for manual review", "import-feed", `data-id="${e(f.id)}" class="pill-btn"`)}${button("Remove feed", "remove-feed", `data-id="${e(f.id)}" class="pill-btn danger"`)}</div></div>`).join("")}</section><section class="panel"><h2>Import a real job batch</h2><p class="muted">For source data you already have, paste an array or an object containing a jobs array. Duplicate jobs keep your application status and documents.</p>${area("import-json", "Job data", "", "")}${button("Import jobs", "import-jobs", 'class="primary"')}</section><section class="panel"><h2>When can it run?</h2><p><b>App open:</b> opted-in employer feed checks and saving to this browser. If a browser suspends a tab, checks resume after it wakes.</p><p><b>App closed or computer asleep:</b> browser collection stops. Make can run its cloud trigger, but this version has no cloud job database to receive unattended results.</p><p><b>Indeed:</b> open the real website, sign in there and browse manually. Save an actual description and URL in Saved jobs. No application is submitted by this app.</p></section>`
  );
}
function settings() {
  return (
    heading(
      "Data and writing preset",
      "Your profile belongs to you. Keep a backup before clearing browser data.",
    ) +
    `<div class="split"><section class="panel"><h2>Workspace backup</h2><p>Export profile, jobs, research, drafts, versions and notes as JSON. It contains your personal information. Keep it private.</p><div class="actions">${button("Export private backup", "backup", 'class="primary"')}</div><div class="field"><label for="restore-file">Restore a workspace backup</label><input id="restore-file" type="file" accept=".json,application/json"></div><p class="muted">Restoring replaces this browser’s workspace after confirmation. This is a single-device prototype; it does not sync between people or browsers.</p><div class="actions">${button("Clear this workspace", "clear", 'class="danger"')}</div></section><section class="panel"><h2>Original resume preset</h2><p class="muted">The attached master prompt is included unchanged. Extra guardrails and candidate data are appended when you build a generation prompt.</p>${button("Download original preset", "master")}<details><summary>Read the complete master prompt</summary><pre>${e(master)}</pre></details><p>Cover letters use their own prompt, with simple English and no em dashes.</p></section></div><div class="notice warn">This version stores data in browser storage, which is not encrypted by the application. Do not use a shared computer for private records. Clearing site data removes the local workspace. No analytics or advertising scripts are included.</div>`
  );
}
function render() {
  root.innerHTML = `<div class="shell"><aside class="sidebar"><div class="brand"><img src="./favicon.svg" alt="">Applydesk</div><nav aria-label="Main navigation">${[
    ["dashboard", "Overview"],
    ["jobs", "Saved jobs"],
    ["search", "Find jobs"],
    ["documents", "Documents"],
    ["tracker", "Applications"],
    ["profile", "My profile"],
    ["automation", "Automations"],
    ["settings", "Data & preset"],
  ]
    .map(
      ([key, label]) =>
        `<button data-action="${key}" class="${page === key ? "active" : ""}">${label}</button>`,
    )
    .join(
      "",
    )}</nav><div class="foot"><strong>AI Job Assistant</strong>Personal edition · v0.2<br>Built for a thoughtful job search.<br><a href="https://github.com/muhammadbilaldevops/AI-Job-Assistant-Automation" target="_blank" rel="noopener noreferrer">View project ↗</a></div></aside><main class="main"><div class="topline"><span>WORKSPACE / ${e(page === "detail" ? "APPLICATION" : page.toUpperCase())}</span><span class="local-pill">Stored on this device</span></div>${storageError ? `<div class="notice error">${e(storageError)}</div>` : ""}${({ dashboard, jobs: jobsPage, profile: profilePage, search: searchPage, add: addPage, detail: detailPage, documents: documentsPage, tracker, automation, settings }[page] || dashboard)()}</main></div>`;
}
async function copy(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast("Prompt copied. Paste it into your chosen AI chat.");
  } catch {
    download("generation-prompt.txt", text);
    toast("Clipboard unavailable. The prompt was downloaded instead.");
  }
}
function generationPrompt() {
  const j = job();
  if (!master) throw Error("Master preset unavailable. Reload the app.");
  if (!state.profile.skills.trim() || !state.profile.experience.trim())
    throw Error(
      "Add your verified skills and real work history in My profile first. If you have no work experience, state that honestly.",
    );
  if (!researchReady(j))
    throw Error("Add a recent verified company source first.");
  return buildPrompt(
    master,
    j,
    { ...state.profile, searchRules: state.rules },
    tab === "coverLetter" ? "cover" : "resume",
  );
}
function saveVersion() {
  const j = job();
  j[tab] = val("draft");
  j.versions.push({
    kind: tab,
    text: j[tab],
    createdAt: new Date().toISOString(),
    preset: PRESET_VERSION,
    profileSnapshot: structuredClone(state.profile),
    researchSnapshot: structuredClone(j.research),
    jobDescription: j.description,
  });
  j.reviewed = false;
  if (persist())
    toast("Draft version saved. Review this version before final export.");
  render();
}
function exportGuard() {
  const j = job();
  j[tab] = val("draft");
  if (!j.reviewed)
    throw Error(
      "Confirm that you reviewed the current documents and their facts.",
    );
  if (!researchReady(j))
    throw Error("Refresh the company research before final export.");
  const errors =
    tab === "resume"
      ? validateResume(j.resume, j).errors
      : !j.coverLetter.trim()
        ? ["Add a cover letter."]
        : j.coverLetter.includes("—")
          ? ["Remove em dashes."]
          : [];
  if (errors.length) throw Error(errors[0]);
  if (fullResume && tab === "resume") {
    if (
      !state.profile.name ||
      !state.profile.contact ||
      !state.profile.education.trim()
    )
      throw Error(
        "Complete name, contact details and education in My profile for a full resume.",
      );
    if (twoPages && !state.profile.projects.trim())
      throw Error(
        "Add your real projects for a useful second page, or turn off the two-page layout.",
      );
  }
  return documentText(j, tab);
}
function filename(ext) {
  const j = job();
  return (
    `${j.company}-${j.title}-${tab}`
      .replace(/[^a-zA-Z0-9_-]+/g, "-")
      .slice(0, 110) +
    "." +
    ext
  );
}
async function sourceApi(action, body) {
  return ["localhost", "127.0.0.1"].includes(location.hostname)
    ? api("/api/" + action, body)
    : api("/api/service", { ...body, action });
}
async function api(path, body) {
  const r = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.headers.get("content-type")?.includes("application/json"))
    throw Error(
      "This adapter requires the local app. See the setup guide in the repository.",
    );
  const x = await r.json();
  if (!r.ok) throw Error(x.error || "The adapter failed.");
  return x;
}
root.addEventListener("click", async (ev) => {
  const b = ev.target.closest("button");
  if (!b) return;
  try {
    if (b.dataset.doc) {
      tab = b.dataset.doc;
      go("detail");
      return;
    }
    if (b.dataset.job) {
      pendingResearch = null;
      selected = b.dataset.job;
      tab = "research";
      go("detail");
      return;
    }
    if (b.dataset.tab) {
      tab = b.dataset.tab;
      render();
      return;
    }
    if (b.dataset.removeSource !== undefined) {
      job().research.splice(Number(b.dataset.removeSource), 1);
      job().reviewed = false;
      persist();
      render();
      return;
    }
    const a = b.dataset.action;
    if (!a) return;
    if (
      [
        "dashboard",
        "jobs",
        "search",
        "tracker",
        "profile",
        "automation",
        "settings",
        "add",
        "documents",
      ].includes(a)
    ) {
      if (a === "add") editingJob = null;
      go(a);
      return;
    }
    if (a === "edit-search") {
      editingSearch = b.dataset.id;
      go("search");
      document.getElementById("search-title").focus();
    }
    if (a === "cancel-search") {
      editingSearch = null;
      render();
    }
    if (a === "toggle-search") {
      const x = state.searches.find((x) => x.id === b.dataset.id);
      x.enabled = !x.enabled;
      persist();
      render();
    }
    if (
      a === "remove-search" &&
      confirm("Remove this saved search? Your saved jobs will remain.")
    ) {
      state.searches = state.searches.filter((x) => x.id !== b.dataset.id);
      persist();
      render();
    }
    if (a === "edit-job") {
      editingJob = job().id;
      go("add");
    }
    if (
      a === "remove-job" &&
      confirm(
        "Remove this job and its research, drafts and notes? Export a backup first if needed.",
      )
    ) {
      state.jobs = state.jobs.filter((j) => j.id !== selected);
      selected = null;
      persist();
      go("jobs");
    }
    if (a === "fetch-research") {
      const targetId = selected,
        url = val("source-url");
      if (!safeURL(url))
        throw Error("Enter an official company page URL first.");
      b.disabled = true;
      b.textContent = "Reading current page…";
      try {
        const result = await sourceApi("research", { url });
        if (selected !== targetId || tab !== "research") return;
        pendingResearch = result;
        $("#source-url").value = result.url;
        $("#fetched-source").innerHTML =
          `<details open><summary>${e(result.title)} · Read ${date(result.fetchedAt)}</summary><p class="muted">Current page text, not independently verified facts. Check the company identity, then write the relevant facts in your notes below.</p><pre>${e(result.excerpt)}</pre></details>`;
        toast(
          "Live page read. Check its identity and add the relevant facts below.",
        );
      } finally {
        b.disabled = false;
        b.textContent = "Read this company page";
      }
    }
    if (a === "save-profile") {
      const p = {};
      for (const k of Object.keys(blankProfile())) p[k] = val(k);
      state.profile = p;
      state.jobs.forEach((j) => (j.reviewed = false));
      if (persist())
        toast("Profile saved. Existing drafts need a fresh fact review.");
    }
    if (a === "copy-prompt") await copy(generationPrompt());
    if (a === "download-prompt")
      download(filename("prompt.txt"), generationPrompt());
    if (a === "save-draft") saveVersion();
    if (a === "check-draft") {
      job()[tab] = val("draft");
      persist();
      render();
      toast("Structure checked. Review facts separately.");
    }
    if (a === "generate") {
      const prompt = generationPrompt(),
        targetJob = job(),
        targetKind = tab;
      b.disabled = true;
      b.textContent = "Generating locally…";
      const x = await api("/api/generate", { prompt });
      targetJob[targetKind] = x.text;
      targetJob.reviewed = false;
      persist();
      if (job()?.id === targetJob.id && tab === targetKind) render();
      toast("Local draft received. Review its structure and every fact.");
    }
    if (a === "markdown") download(filename("md"), documentText(job(), tab));
    if (a === "docx") download(filename("docx"), createDocx(exportGuard()));
    if (a === "print") {
      const text = exportGuard();
      document.querySelector(".print-only")?.remove();
      const p = document.createElement("div");
      p.className = "print-only";
      p.innerHTML = `<article class="paper">${resumeHTML(text)}</article>`;
      document.body.append(p);
      window.print();
    }
    if (a === "restore-version") {
      const v = job().versions[Number(b.dataset.version)];
      job()[v.kind] = v.text;
      job().reviewed = false;
      tab = v.kind;
      persist();
      render();
    }
    if (a === "save-notes") {
      job().note = val("application-note");
      persist();
      toast("Application notes saved.");
    }
    if (a === "backup")
      download(
        "applydesk-private-backup.json",
        JSON.stringify(state, null, 2),
        "application/json",
      );
    if (a === "master") download("master-resume-original.txt", master);
    if (
      a === "clear" &&
      confirm(
        "Clear this browser workspace? Download a private backup first if you want to restore it later.",
      )
    ) {
      state = {
        version: 1,
        profile: blankProfile(),
        jobs: [],
        searches: defaultSearches(),
        rules: defaultRules(),
        feeds: [],
        autoCollect: false,
      };
      persist();
      go("dashboard");
    }
    if (a === "import-jobs") {
      const x = JSON.parse(val("import-json"));
      const list = Array.isArray(x) ? x : x.jobs;
      if (!Array.isArray(list) || list.length > 500)
        throw Error("Import up to 500 jobs at a time.");
      const r = mergeJobs(state.jobs, list);
      state.jobs = r.jobs;
      persist();
      toast(`${r.added} jobs added; ${r.updated} duplicates refreshed.`);
      go("jobs");
    }
    if (a === "make-job") {
      const j = job();
      if (!j.url)
        throw Error(
          "Add an original listing URL before sending a job to Make.",
        );
      b.disabled = true;
      const x = await api("/api/make", {
        jobs: [
          {
            title: j.title,
            company: j.company,
            url: j.url,
            description: j.description,
            location: j.location,
            mode: j.mode,
            remoteEligibility: j.remoteEligibility,
            postedAt: j.postedAt,
            source: j.source,
          },
        ],
      });
      if (!Array.isArray(x.jobs) || x.jobs.length > 500)
        throw Error("Make must return a jobs array.");
      const r = mergeJobs(state.jobs, x.jobs);
      state.jobs = r.jobs;
      persist();
      render();
      toast("Make returned the job batch. Review the refreshed records.");
    }
    if (a === "make-intake") {
      b.disabled = true;
      try {
        const x = await api("/api/make", {});
        if (!Array.isArray(x.jobs) || !x.requestId)
          throw Error("The Make response did not match the expected contract.");
        const result = $("#make-result");
        if (result)
          result.innerHTML =
            '<div class="notice good">Connection verified. Make received the request and returned a valid response. No jobs were discovered by this check.</div>';
        toast("Make connection verified.");
      } finally {
        b.disabled = false;
      }
    }
    if (a === "collect-feeds") await collectFeeds(true);
    if (
      a === "remove-feed" &&
      confirm("Remove this employer source? Existing saved jobs will remain.")
    ) {
      state.feeds = state.feeds.filter((f) => f.id !== b.dataset.id);
      persist();
      render();
    }
    if (a === "import-feed") {
      const feed = state.feeds.find((f) => f.id === b.dataset.id);
      b.disabled = true;
      try {
        const x = await sourceApi("feed", feed);
        const result = mergeJobs(state.jobs, x.jobs);
        state.jobs = result.jobs;
        feed.lastResult = result.added + " added for manual review";
        persist();
        go("jobs");
        toast(feed.lastResult);
      } finally {
        b.disabled = false;
      }
    }
  } catch (err) {
    toast(err.message || "Something went wrong.");
    b.disabled = false;
    if (b.dataset.action === "generate")
      b.textContent = "Generate with local Ollama";
  }
});
root.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  try {
    if (ev.target.id === "job-form") {
      const x = {};
      for (const key of [
        "title",
        "company",
        "url",
        "location",
        "mode",
        "remoteEligibility",
        "postedAt",
        "deadline",
        "minYears",
        "source",
        "description",
      ])
        x[key] = val(key);
      if (editingJob) {
        const old = state.jobs.find((j) => j.id === editingJob),
          clean = normalizeJob(x);
        const duplicate = state.jobs.find(
          (j) => j.id !== editingJob && j.url === clean.url,
        );
        if (duplicate) throw Error("Another saved job already uses that URL.");
        Object.assign(
          old,
          ...[
            "title",
            "company",
            "url",
            "location",
            "mode",
            "remoteEligibility",
            "postedAt",
            "deadline",
            "minYears",
            "source",
            "description",
          ].map((k) => ({ [k]: clean[k] })),
          { reviewed: false },
        );
        editingJob = null;
        persist();
        toast("Job updated. Review its documents again.");
      } else {
        const r = mergeJobs(state.jobs, [x]);
        state.jobs = r.jobs;
        persist();
        toast(r.added ? "Job saved." : "Existing job refreshed.");
      }
      go("jobs");
    }
    if (ev.target.id === "search-form") {
      const item = normalizeSearch({
        id: editingSearch || undefined,
        title: val("search-title"),
        location: val("search-location"),
        radius: val("search-radius"),
      });
      if (
        state.searches.some(
          (x) =>
            x.id !== item.id &&
            x.title.toLowerCase() === item.title.toLowerCase() &&
            x.location.toLowerCase() === item.location.toLowerCase() &&
            x.radius === item.radius,
        )
      )
        throw Error("This search is already saved.");
      if (editingSearch)
        state.searches = state.searches.map((x) =>
          x.id === editingSearch ? { ...item, enabled: x.enabled } : x,
        );
      else state.searches.push(item);
      editingSearch = null;
      persist();
      render();
      toast("Search saved for your next visit.");
    }
    if (ev.target.id === "rules-form") {
      state.rules = normalizeRules({
        titles: val("rule-titles").split("\n"),
        cities: val("rule-cities").split(","),
        remoteCountry: val("rule-country"),
        maxYears: val("rule-years"),
        allowRemote: $("#rule-remote").checked,
      });
      persist();
      render();
      toast("Rules saved. All saved jobs have been ranked again.");
    }
    if (ev.target.id === "research-form") {
      if (!safeURL(val("source-url")))
        throw Error("Enter a valid public source URL.");
      job().research.push({
        url: safeURL(val("source-url")),
        notes: val("source-notes"),
        verified: $("#source-verified").checked,
        checkedAt: new Date().toISOString(),
        ...(pendingResearch?.url === safeURL(val("source-url"))
          ? {
              excerpt: pendingResearch.excerpt,
              fetchedAt: pendingResearch.fetchedAt,
            }
          : {}),
      });
      pendingResearch = null;
      job().reviewed = false;
      persist();
      render();
    }
    if (ev.target.id === "feed-form") {
      const feed = {
        id: crypto.randomUUID(),
        provider: val("feed-provider"),
        board: val("feed-board").trim(),
        company: val("feed-company").trim(),
      };
      if (state.feeds.length >= 5)
        throw Error(
          "Use up to five feeds to keep checks small and affordable.",
        );
      if (
        state.feeds.some(
          (f) => f.provider === feed.provider && f.board === feed.board,
        )
      )
        throw Error("This feed is already saved.");
      state.feeds.push(feed);
      persist();
      render();
      toast("Employer feed saved. Check it now or enable automatic refresh.");
    }
  } catch (err) {
    toast(err.message);
  }
});
root.addEventListener("input", (ev) => {
  if (ev.target.id === "search-jobs") {
    query = ev.target.value;
    $("#job-results").innerHTML =
      sortedJobs().map(card).join("") ||
      '<div class="empty">No jobs match these filters.</div>';
  }
  if (ev.target.id === "draft") {
    job()[tab] = ev.target.value;
    job().reviewed = false;
    const review = $("#reviewed");
    if (review) review.checked = false;
    persist();
    $("#preview").innerHTML = paper(job(), tab);
    const budget = $("#page-budget");
    if (budget)
      budget.textContent =
        pageBudget(documentText(job(), tab)).warnings.join(" ") ||
        "10 pt body and 11 pt emphasis. Check the final page count in Word.";
  }
  if (ev.target.id === "application-note") {
    job().note = ev.target.value;
    persist();
  }
});
root.addEventListener("change", async (ev) => {
  try {
    const id = ev.target.id;
    if (id === "auto-collect") {
      state.autoCollect = ev.target.checked;
      persist();
      toast(
        state.autoCollect
          ? "Feed checks enabled while the app is open."
          : "Automatic feed checks paused.",
      );
      if (state.autoCollect) await collectFeeds();
    }
    if (id === "document-job") {
      selected = ev.target.value || null;
      render();
    }
    if (id === "two-pages") {
      twoPages = ev.target.checked;
      $("#preview").innerHTML = paper(job(), tab);
      const budget = $("#page-budget");
      if (budget)
        budget.textContent =
          pageBudget(documentText(job(), tab)).warnings.join(" ") ||
          "10 pt body and 11 pt emphasis. Check the final page count in Word.";
    }
    if (id === "status-filter") {
      filter = ev.target.value;
      render();
    }
    if (id === "eligibility-filter") {
      eligibility = ev.target.value;
      render();
    }
    if (id === "job-status") {
      job().status = ev.target.value;
      job().statusUpdatedAt = new Date().toISOString();
      persist();
      toast("Application status updated.");
    }
    if (id === "reviewed") {
      job().reviewed = ev.target.checked;
      persist();
    }
    if (id === "full-resume") {
      fullResume = ev.target.checked;
      $("#preview").innerHTML = paper(job(), tab);
      const budget = $("#page-budget");
      if (budget)
        budget.textContent =
          pageBudget(documentText(job(), tab)).warnings.join(" ") ||
          "10 pt body and 11 pt emphasis. Check the final page count in Word.";
    }
    if (id === "restore-file") {
      const f = ev.target.files[0];
      if (!f) return;
      if (f.size > 10 * 1024 * 1024) throw Error("Backup exceeds 10 MB.");
      const x = JSON.parse(await f.text());
      if (
        x.version !== 1 ||
        !Array.isArray(x.jobs) ||
        x.jobs.length > 5000 ||
        !x.profile ||
        Object.keys(blankProfile()).some(
          (k) => typeof x.profile[k] !== "string",
        )
      )
        throw Error("This is not a compatible workspace backup.");
      const restored = x.jobs.map((j) => {
        const n = normalizeJob(j);
        if (
          !STATUSES.includes(j.status) ||
          !Array.isArray(j.research) ||
          !Array.isArray(j.versions)
        )
          throw Error("Backup contains invalid job records.");
        return {
          ...n,
          id: n.id,
          status: j.status,
          firstSeenAt: j.firstSeenAt || n.firstSeenAt,
          lastSeenAt: j.lastSeenAt || n.lastSeenAt,
          note: String(j.note || ""),
          resume: String(j.resume || ""),
          coverLetter: String(j.coverLetter || ""),
          research: j.research.filter(
            (r) => safeURL(r.url) && typeof r.notes === "string",
          ),
          versions: j.versions.filter(
            (v) =>
              ["resume", "coverLetter"].includes(v.kind) &&
              typeof v.text === "string",
          ),
          reviewed: false,
        };
      });
      if (confirm("Replace this browser workspace with the selected backup?")) {
        state = {
          version: 1,
          profile: x.profile,
          jobs: restored,
          searches: Array.isArray(x.searches)
            ? x.searches.slice(0, 300).map(normalizeSearch)
            : defaultSearches(),
          rules: x.rules ? normalizeRules(x.rules) : defaultRules(),
          feeds: Array.isArray(x.feeds)
            ? x.feeds.slice(0, 5).map(normalizeFeed)
            : [],
          autoCollect: false,
        };
        persist();
        render();
        toast("Backup restored. Review documents again before final export.");
      }
    }
  } catch (err) {
    toast(err.message);
  }
});
async function collectFeeds(force = false) {
  if (collecting) return;
  if (!state.feeds.length) {
    if (force) toast("Add an employer feed first.");
    return;
  }
  if (
    !force &&
    (!state.autoCollect ||
      Date.now() - Date.parse(state.lastCollectAt || "1970-01-01") < 3600000)
  )
    return;
  collecting = true;
  state.lastCollectAt = new Date().toISOString();
  persist();
  let added = 0,
    review = 0,
    failed = 0;
  const workspaceAtStart = state;
  try {
    for (const feed of [...state.feeds]) {
      if (!force && !state.autoCollect) break;
      try {
        const x = await sourceApi("feed", feed);
        if (state !== workspaceAtStart || !state.feeds.includes(feed)) continue;
        const normalized = x.jobs.map((j) => normalizeJob(j));
        const eligible = normalized.filter(
          (j) =>
            priority(j).eligibility === "Eligible" ||
            state.jobs.some((old) => old.url === j.url),
        );
        review += normalized.filter(
          (j) => priority(j).eligibility === "Review",
        ).length;
        const result = mergeJobs(state.jobs, eligible);
        state.jobs = result.jobs;
        added += result.added;
        feed.lastResult = `${result.added} new matches; ${x.jobs.length} listings checked`;
      } catch (error) {
        failed++;
        feed.lastResult = error.message;
      }
      persist();
      await new Promise((resolve) => setTimeout(resolve, 2600));
    }
    if (state !== workspaceAtStart) return;
    state.collectSummary = `${added} new matches saved. ${review} uncertain roles need manual review from their source. ${failed} source checks failed.`;
    persist();
    if (page === "automation" || page === "jobs" || page === "dashboard")
      render();
    if (force || added || failed) toast(state.collectSummary);
  } finally {
    collecting = false;
    if (page === "automation") render();
  }
}
render();
setTimeout(() => collectFeeds(), 1500);
setInterval(() => {
  if (document.visibilityState === "visible") collectFeeds();
}, 60000);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") collectFeeds();
});
// Progressive agent support: normal UI remains fully usable without WebMCP.
if (document.modelContext?.registerTool) {
  const lifecycle = new AbortController();
  const registrations = [
    {
      name: "open_job_search_planner",
      title: "Open job search planner",
      description:
        "Open the assistant search planner. This does not access Indeed or run a search.",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: () => {
        go("search");
        return { screen: "Search planner", externalSearchStarted: false };
      },
    },
    {
      name: "list_saved_job_summaries",
      title: "List saved jobs",
      description:
        "Read summaries of jobs already saved in this browser workspace. Does not search job boards or return candidate profile data.",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: () => ({
        jobs: state.jobs.map((j) => ({
          id: j.id,
          title: j.title,
          company: j.company,
          url: j.url,
          status: j.status,
          eligibility: priority(j).eligibility,
        })),
      }),
    },
    {
      name: "save_real_job",
      title: "Save a real job",
      description:
        "Save a user-supplied real listing to this browser workspace. Requires the actual source URL and full description. Does not fetch the page, contact the employer, or submit an application.",
      inputSchema: {
        type: "object",
        properties: {
          title: { type: "string" },
          company: { type: "string" },
          url: { type: "string" },
          description: { type: "string" },
          location: { type: "string" },
          mode: { type: "string", enum: ["On-site", "Hybrid", "Remote"] },
          remoteEligibility: {
            type: "string",
            enum: [
              "Unknown",
              "Pakistan",
              "Worldwide",
              "Eligible for my country",
              "Restricted",
            ],
          },
        },
        required: ["title", "company", "url", "description", "location"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute: (input) => {
        if (!input || !safeURL(input.url))
          throw Error("A valid source URL is required.");
        const result = mergeJobs(state.jobs, [
          { ...input, source: "User-authorized agent intake" },
        ]);
        state.jobs = result.jobs;
        if (!persist())
          throw Error("Could not persist the record. Export a backup.");
        go("jobs");
        return {
          added: result.added,
          updated: result.updated,
          submittedApplication: false,
        };
      },
    },
  ];
  for (const tool of registrations)
    try {
      Promise.resolve(
        document.modelContext.registerTool(tool, { signal: lifecycle.signal }),
      ).catch(() => {});
    } catch {}
  window.addEventListener("pagehide", () => lifecycle.abort(), { once: true });
}
