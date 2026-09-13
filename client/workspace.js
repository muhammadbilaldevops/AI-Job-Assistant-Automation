import { createClient } from "@supabase/supabase-js";
import { cloud } from "../dist/config.js";
import { escapeHTML as e, resumeHTML, STATUSES } from "../dist/core.js";
import { createDocx, download } from "../dist/export.js";
import { fullResumeText, pageBudget } from "../dist/documents.js";
import { DEFAULT_PREFERENCES } from "../lib/discovery.mjs";

const db = createClient(cloud.url, cloud.key);
const root = document.querySelector("#app");
let session,
  page = "dashboard",
  profile = {},
  jobs = [],
  docs = [],
  originals = [],
  runs = [],
  notices = [],
  selected = null,
  docId = null,
  busy = false,
  driving = false,
  error = "",
  capabilities = {},
  authMode = "signup",
  filter = "all";
let booting = true;
const AUTH_ENABLED = false;
const LOCAL_PREVIEW = true;
const icons = {
  dashboard: "▦",
  profile: "◎",
  search: "⌕",
  jobs: "▤",
  documents: "▧",
  settings: "⚙",
};
const nav = [
  ["dashboard", "Dashboard"],
  ["profile", "My profile"],
  ["search", "AI job search"],
  ["jobs", "Saved jobs"],
  ["documents", "Documents"],
  ["settings", "Automation settings"],
];
const fmt = (d) =>
  d
    ? new Date(d).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })
    : "Not stated";
const button = (label, action, cls = "primary", attrs = "") =>
  `<button class="${cls}" data-action="${action}" ${attrs}>${label}</button>`;
const input = (name, label, value = "", extra = "") =>
  `<label>${label}<input name="${name}" value="${e(value)}" ${extra}></label>`;
const area = (name, label, value = "", help = "") =>
  `<label>${label}<textarea name="${name}" rows="4">${e(value)}</textarea>${help ? `<small>${help}</small>` : ""}</label>`;
const toast = (message) => {
  const el = document.querySelector("#toast");
  el.textContent = message;
  el.classList.add("visible");
  setTimeout(() => el.classList.remove("visible"), 6000);
};
const check = (r) => {
  if (r.error) throw Error(r.error.message);
  return r.data;
};
async function api(action, body = {}) {
  const { data } = await db.auth.getSession();
  if (!data.session && LOCAL_PREVIEW) return {};
  if (!data.session) throw Error("Sign in to continue.");
  const r = await fetch("/api/agent", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${data.session.access_token}`,
    },
    body: JSON.stringify({ action, ...body }),
  });
  const j = await r.json();
  if (r.status === 401) {
    await db.auth.signOut({scope:'local'});
    session=null; profile={}; jobs=[]; docs=[]; runs=[]; originals=[]; notices=[];
  }
  if (!r.ok) throw Error(j.error || "This action could not finish.");
  return j;
}
async function load() {
  if (LOCAL_PREVIEW && session?.user?.id === "local-preview") return;
  const result = await Promise.all([
    db.from("user_profiles").select("data").maybeSingle(),
    db
      .from("jobs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500),
    db
      .from("generated_documents")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100),
    db
      .from("automation_runs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20),
    db.from("resumes").select("*").order("created_at", { ascending: false }),
    db
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);
  profile = check(result[0])?.data || {};
  jobs = check(result[1]);
  docs = check(result[2]);
  runs = check(result[3]);
  originals = check(result[4]);
  notices = check(result[5]);
}
const active = () =>
  runs.find((r) => !["COMPLETED", "FAILED", "PAUSED"].includes(r.state));
const running = () => active() || runs[0];
function welcome() {
  if (!AUTH_ENABLED) return `<div class="welcome"><a class="brand" href="/">a<span>applydesk<span class="brand-dot">.</span></span></a><div class="auth-paused"><span class="pill">APPLYDESK WORKSPACE</span><h1>Your career story<br><em>starts here.</em></h1><p>Discover real opportunities, understand your matches and prepare applications with confidence.</p></div><footer>BUILT FOR YOUR NEXT OPPORTUNITY <span>A thoughtful job search, one step at a time.</span></footer></div>`;
  return `<div class="welcome"><a class="brand" href="/">a<span>applydesk<span class="brand-dot">.</span></span></a><div class="welcome-grid"><section><div class="eyebrow"><span class="live-dot"></span> YOUR NEXT CHAPTER STARTS HERE</div><h1>Less searching.<br>More <em>possibility.</em></h1><p class="intro">A job search that starts with you. Save your career story once, discover real opportunities, and prepare applications that sound like you.</p><div class="welcome-steps"><div><b>01</b><span>Tell us about you<small>A resume or a few simple answers.</small></span></div><div><b>02</b><span>Let your search do the work<small>Real listings, clear matches, saved automatically.</small></span></div><div><b>03</b><span>Make your next move<small>Review your documents. Apply when you are ready.</small></span></div></div><p class="source-note">Real opportunities from <a href="https://himalayas.app" target="_blank" rel="noopener noreferrer">Himalayas</a>. Browse Indeed alongside your saved search.</p></section><section class="auth-card"><span class="pill">YOUR PERSONAL WORKSPACE</span><div class="auth-modes" role="tablist" aria-label="Account access"><button class="auth-mode ${authMode === "signin" ? "selected" : ""}" data-action="auth-mode" data-mode="signin" role="tab">Sign in</button><button class="auth-mode ${authMode === "signup" ? "selected" : ""}" data-action="auth-mode" data-mode="signup" role="tab">Create account</button></div><h2>${authMode === "signup" ? "Start your next chapter" : "Welcome back"}</h2><p>Your profile, matches and documents, together.</p><form id="auth">${input("email", "Email address", "", 'type="email" autocomplete="email" required')}${input("password", "Password", "", 'type="password" minlength="8" autocomplete="' + (authMode === "signup" ? "new-password" : "current-password") + '" required')}<button class="primary full" ${busy ? "disabled" : ""}>${busy ? "Please wait…" : authMode === "signup" ? "Create my workspace ↗" : "Sign in ↗"}</button></form>${error ? `<p class="error" role="alert">${e(error)}</p>` : ""}<div class="auth-switch">${authMode === "signup" ? "Already have an account?" : "New to Applydesk?"} ${button(authMode === "signup" ? "Sign in" : "Create an account", "auth-switch", "text-button")}</div><p class="privacy">Your resume stays private to your account. You choose when to create documents and when to apply.</p></section></div><footer>BUILT FOR YOUR NEXT OPPORTUNITY <span>A thoughtful job search, one step at a time.</span></footer></div>`;
}
function heading(kicker, title, subtitle, actions = "") {
  return `<div class="page-heading"><div><div class="eyebrow">${kicker}</div><h1>${title}</h1><p>${subtitle}</p></div><div class="actions">${actions}</div></div>`;
}
function shell(content) {
  return `<aside class="sidebar"><a class="brand" href="/">a<span>applydesk<span class="brand-dot">.</span></span></a><div class="workspace-label">MY WORKSPACE</div><nav aria-label="Main navigation">${nav.map(([id, label]) => `<button class="nav-item ${page === id ? "selected" : ""}" data-page="${id}"><span>${icons[id]}</span>${label}${id === "jobs" && jobs.length ? `<i>${jobs.length}</i>` : ""}</button>`).join("")}</nav><div class="sidebar-bottom"><div class="private-badge"><span>◈</span><div>Your space. Your pace.<small>You control every application.</small></div></div><button class="account" data-action="signout"><b>${e((profile.name || session.user.email || "U")[0].toUpperCase())}</b><span>${e(profile.name || "My account")}<small>Sign out</small></span><span>↗</span></button></div></aside><div class="workspace"><header class="topbar"><span>Workspace <span class="slash">/</span> ${e(nav.find((n) => n[0] === page)?.[1] || "Job details")}</span><span class="top-status"><span class="live-dot"></span> ${active() ? "Search in progress" : "Your workspace is saved"}</span></header><main>${error ? `<div class="error" role="alert">${e(error)} ${button("Dismiss", "dismiss", "text-button")}</div>` : ""}${content}</main><footer>APPLYDESK <span>Real sources. Your story. Your decision.</span></footer></div>`;
}
function progress() {
  const r = running();
  if (!r)
    return `<div class="quiet"><span class="orbit">⌕</span><h3>Your search is ready when you are</h3><p>Choose the roles you want. We’ll look for relevant listings and keep them here.</p>${button("Set up my search ↗", "preferences")}</div>`;
  const d = r.data;
  const pct = Math.min(
    100,
    Math.round((d.cursor / Math.max(1, d.tasks.length)) * 100),
  );
  return `<div class="run-header"><span class="pill ${r.state === "FAILED" ? "warning" : ""}">${e(r.state.replaceAll("_", " "))}</span><span>${d.cursor} / ${d.tasks.length} searches</span></div><progress value="${pct}" max="100" aria-label="Search progress">${pct}%</progress><p>${e(d.events?.at(-1)?.message || "Preparing your search.")}</p><div class="run-numbers"><div><strong>${d.found}</strong><span>Listings read</span></div><div><strong>${d.saved}</strong><span>New jobs saved</span></div><div><strong>${d.excluded}</strong><span>Outside preferences</span></div></div>${d.errors?.length ? `<p class="error">${d.errors.length} source request(s) could not finish. ${e(d.errors.at(-1).message)}</p>` : ""}`;
}
function card(row) {
  const j = row.data,
    m = j.match || {};
  return `<article class="job-card"><div class="job-card-top"><div class="company-mark">${e(j.company.slice(0, 2).toUpperCase())}</div><span class="match ${m.decision === "review" ? "review" : ""}">${Number(m.score) || 0}% match</span></div><small>${e(j.company)}</small><h3><button data-job="${row.id}">${e(j.title)}</button></h3><div class="tags"><span>◉ ${e(j.mode || "Remote")}</span><span>${e(j.employmentType || "See listing")}</span></div><p class="job-reason">${e(m.decision === "review" ? "Needs review: " + (m.gaps?.[0] || "Check requirements") : m.strengths?.[0] || "Saved for you")}</p><div class="job-card-foot"><a href="${e(j.url)}" target="_blank" rel="noopener noreferrer">${e(j.source)} ↗</a><span>Saved ${fmt(row.created_at)}</span></div></article>`;
}
function dashboard() {
  const recommend = jobs.filter(
    (j) => j.data.match?.decision === "recommended",
  );
  const name = profile.name?.split(" ")[0];
  return (
    heading(
      "YOUR CAREER, MOVING FORWARD",
      `Let’s find your next chapter${name ? ", " + e(name) : ""}.`,
      "A little less busywork. A little closer to the right opportunity.",
      button(
        active() ? "View search" : "Start job search ↗",
        active() ? "view-search" : "start",
      ),
    ) +
    `<div class="hero"><div><span class="pill">YOUR JOB SEARCH ASSISTANT</span><h2>You bring the ambition.<br>We’ll help with the search.</h2><p>Real opportunities, matched to your preferences.<br>Your career story stays with you every step of the way.</p>${button(profile.confirmed ? "Edit my preferences" : "Complete my profile →", profile.confirmed ? "preferences" : "profile", "white")}</div><div class="hero-art" aria-hidden="true"><div class="orbit-ring"></div><div class="art-card"><span>YOUR NEXT OPPORTUNITY</span><b>Closer than<br>you think<span>↗</span></b><i>DISCOVER · PREPARE · APPLY</i></div><div class="spark">✧</div></div></div><div class="metrics"><div><span>Saved opportunities</span><strong>${jobs.length}</strong><small>Real listings in your workspace</small></div><div><span>Recommended matches</span><strong>${recommend.length}</strong><small>Meet your saved match threshold</small></div><div><span>Prepared documents</span><strong>${docs.length}</strong><small>Your resume and letter versions</small></div><div><span>Applications tracked</span><strong>${jobs.filter((j) => ["Applied", "Interview", "Offer"].includes(j.status)).length}</strong><small>Progress you have recorded</small></div></div><div class="two-columns"><section class="panel"><div class="section-heading"><h2>Your search activity</h2>${button("View all ↗", "view-search", "text-button")}</div>${progress()}</section><section class="panel next-steps"><h2>Your next steps</h2><button data-action="profile"><b>${profile.confirmed ? "✓" : "1"}</b><span>Build your career profile<small>${profile.confirmed ? "Your confirmed facts are saved." : "Start with a resume or a few answers."}</small></span><i>↗</i></button><button data-action="preferences"><b>${profile.preferences ? "✓" : "2"}</b><span>Choose what comes next<small>Roles, location and experience level.</small></span><i>↗</i></button><button data-action="start"><b>3</b><span>Discover your opportunities<small>Let your saved preferences guide the search.</small></span><i>↗</i></button></section></div><div class="section-heading"><h2>Opportunities for you</h2>${button("All saved jobs ↗", "jobs", "text-button")}</div>${jobs.length ? `<div class="job-grid">${jobs.slice(0, 3).map(card).join("")}</div>` : `<div class="empty-inline">Your real matches will appear here after your first search. No sample jobs.</div>`}`
  );
}
function profilePage() {
  const p = profile;
  return (
    heading(
      "LET’S START WITH YOU",
      "Your story, saved once.",
      "Use a resume you already have, or tell us about your experience below.",
    ) +
    `<section class="upload-panel"><span class="upload-icon">↥</span><div><h3>Bring your existing resume</h3><p>PDF, Word or text · up to 3 MB. Your original is kept private.</p></div><label class="primary upload-button">${busy ? "Reading file…" : "Upload resume"}<input type="file" id="resume-upload" accept=".pdf,.docx,.txt" ${busy ? "disabled" : ""}></label></section>${originals[0] && !originals[0].data.confirmed ? `<details class="panel"><summary>Review the text extracted from ${e(originals[0].data.name)}</summary><p>Confirm the fields below before using these facts. File extraction does not verify their accuracy.</p><pre class="extracted">${e(originals[0].data.text)}</pre></details>` : ""}<form id="profile" class="panel profile-form"><div class="section-heading"><div><h2>The essentials</h2><p>Only include facts you want used in your applications.</p></div><span class="pill">PRIVATE TO YOU</span></div><div class="form-grid">${input("name", "Your name", p.name || "", 'autocomplete="name"')}${input("contact", "Email, phone and professional links", p.contact || "")}${input("location", "Where do you live?", p.location || "")}${input("headline", "How would you describe your field?", p.headline || "")}</div>${area("skills", "What skills and tools have you actually used?", p.skills || "", "Separate skills with commas. Include coursework and personal projects only when you can discuss your work.")}${area("experience", "Your real experience", p.experience || "", "Official title | employer or clearly labelled project | dates, then what you actually did. Your exact resume preset uses one entry. Leave blank if you have none.")}${area("education", "Education and qualifications", p.education || "", "Institution, degree or qualification, and dates. Only list completed or accurately labelled ongoing qualifications.")}${area("projects", "Projects you can explain", p.projects || "", "What you built, tools you used, and a link if available.")}${area("certifications", "Certifications and languages", p.certifications || "")}<label class="checkbox"><input type="checkbox" name="confirmed" ${p.confirmed ? "checked" : ""}> I have checked these facts and want them used in my documents.</label><div class="form-actions">${button("Save my profile →", "submit-profile")}<button type="button" class="secondary" data-action="preferences">Set preferences first</button></div></form>`
  );
}
function preferenceFields() {
  const p = profile.preferences || DEFAULT_PREFERENCES;
  return `<div class="form-grid">
    ${area("titles", "Which roles are you looking for?", p.titles.join("\n"), "One title per line. Add, edit or remove titles at any time.")}
    ${area("cities", "Which cities work for you?", p.cities.join("\n"), "On-site city browsing is available through Indeed. Automatic discovery currently covers remote listings.")}
    ${input("country", "Country you will work from", p.country)}
    ${input("maxYears", "Maximum years of experience requested", p.maxYears, 'type="number" min="0" max="40"')}
    ${input("minimumScore", "Recommended-match threshold", p.minimumScore, 'type="number" min="0" max="100"')}
    </div>
    <label class="checkbox"><input type="checkbox" name="allowRemote" ${p.allowRemote ? "checked" : ""}> Include remote jobs</label>
    <label class="checkbox"><input type="checkbox" name="daily" ${p.daily ? "checked" : ""}> Run a daily search in the background, even when this app is closed</label>
    <label class="checkbox"><input type="checkbox" name="notifications" ${p.notifications ? "checked" : ""}> Show search updates in my workspace</label>
    <p class="field-note">Daily searches run after 24 hours at the next six-hour Make check. Relevant roles with uncertain eligibility or a lower score stay visible under “Needs review.”</p>`;
}
function searchPage() {
  const p = profile.preferences || DEFAULT_PREFERENCES,
    r = running();
  return (
    heading(
      "LET YOUR PREFERENCES LEAD",
      "A search that works for you.",
      "Start a real search, follow its progress, and return to saved results.",
      active()
        ? button("Pause search", "pause", "secondary")
        : r?.state === "PAUSED"
          ? button("Resume search ↗", "resume")
          : button("Run my search ↗", "start"),
    ) +
    `<div class="two-columns"><section class="panel"><div class="section-heading"><h2>Search progress</h2><span class="pill">REAL SOURCE DATA</span></div>${progress()}<p class="field-note">${capabilities.background ? "Background processing is connected." : "Keep Applydesk open while a search runs. Its saved progress can resume when you return."}</p></section><section class="panel"><h2>Where we look</h2><div class="source-row"><b>H</b><div><strong>Himalayas</strong><p>Public remote-job API. Attribution and original links are kept with every listing.</p></div><span class="pill">Connected</span></div><div class="source-row"><b>i</b><div><strong>Indeed Pakistan</strong><p>Open a saved title and location to browse and apply in your own browser.</p></div></div><details><summary>Browse Indeed with my preferences</summary><div class="link-list">${p.titles
      .slice(0, 12)
      .flatMap((t) =>
        p.cities.map(
          (c) =>
            `<a href="https://pk.indeed.com/jobs?q=${encodeURIComponent(t)}&l=${encodeURIComponent(c)}&radius=100&sort=date" target="_blank" rel="noopener noreferrer">${e(t)} · ${e(c)} ↗</a>`,
        ),
      )
      .join(
        "",
      )}</div></details></section></div><section class="panel"><h2>My search preferences</h2><form id="preferences">${preferenceFields()}<button class="primary">Save preferences</button></form></section><section class="panel"><h2>Activity log</h2>${
      r?.data.events?.length
        ? `<ol class="timeline">${[...r.data.events]
            .reverse()
            .map(
              (a) =>
                `<li><span>${e(a.state.replaceAll("_", " "))}</span><p>${e(a.message)}</p><small>${new Date(a.at).toLocaleTimeString()}</small></li>`,
            )
            .join("")}</ol>`
        : "<p>Your search activity will appear here.</p>"
    }</section>`
  );
}
function jobsPage() {
  const list = jobs.filter(
    (j) => filter === "all" || j.data.match?.decision === filter,
  );
  return (
    heading(
      "OPPORTUNITIES, ORGANIZED",
      "Your saved jobs.",
      "Real listings collected for you. Open a job to see why it matches and prepare your documents.",
      button("Find more jobs ↗", "start"),
    ) +
    `<div class="filter-bar">${[
      ["all", "All saved"],
      ["recommended", "Recommended"],
      ["review", "Needs review"],
    ]
      .map(
        ([v, l]) =>
          `<button class="${filter === v ? "active" : ""}" data-filter="${v}">${l} <span>${jobs.filter((j) => v === "all" || j.data.match?.decision === v).length}</span></button>`,
      )
      .join(
        "",
      )}</div>${list.length ? `<div class="job-grid">${list.map(card).join("")}</div>` : `<section class="panel quiet"><span class="orbit">⌕</span><h2>${jobs.length ? "No jobs in this group yet" : "Your next opportunity belongs here"}</h2><p>Run your search to save real listings. If a search finds no suitable roles, you can adjust your preferences and try again.</p>${button("Open my search", "view-search")}</section>`}`
  );
}
function detail() {
  const row = jobs.find((j) => j.id === selected);
  if (!row) return jobsPage();
  const j = row.data,
    m = j.match || {};
  return (
    heading(
      e(j.company),
      e(j.title),
      `${e(j.location)} · Saved ${fmt(row.created_at)}`,
      `<a class="primary" href="${e(j.url)}" target="_blank" rel="noopener noreferrer">View original & apply ↗</a>`,
    ) +
    `<div class="two-columns detail-columns"><div><section class="panel"><div class="section-heading"><h2>Why this could fit</h2><span class="match">${m.score || 0}% match</span></div><div class="evidence-columns"><div><h3>Your strengths</h3><ul>${(m.strengths || []).map((s) => `<li>${e(s)}</li>`).join("")}</ul></div><div><h3>Things to check</h3><ul>${(m.gaps || []).map((s) => `<li>${e(s)}</li>`).join("")}</ul></div></div><p class="field-note">This is a transparent rule-based match, not a prediction of hiring success.</p></section><section class="panel"><h2>What the role asks for</h2><ul>${(j.analysis?.requirements || []).map((s) => `<li>${e(s)}</li>`).join("")}</ul><details><summary>Read the full job description</summary><div class="description">${e(j.description)}</div></details><p class="source-note">Originally published on <a href="${e(j.url)}" target="_blank" rel="noopener noreferrer">${e(j.source)}</a>. Dates and availability reflect the source.</p></section><section class="panel"><div class="section-heading"><h2>Company research</h2>${button("Refresh sources", "research", "text-button")}</div>${(j.research || []).length ? j.research.map((s) => `<div class="research-source"><a href="${e(s.url)}" target="_blank" rel="noopener noreferrer">${e(s.title || s.kind || "Source")} ↗</a><small>Read ${fmt(s.checkedAt)} · ${s.kind === "Company website" ? "Company website" : "Listing evidence"}</small>${s.error ? `<p class="error">Could not read this source.</p>` : `<p>${e((s.notes || "").slice(0, 700))}</p>`}</div>`).join("") : "<p>Sources are read automatically when you prepare a document. You can also read them now.</p>"}<form id="company-site">${input("companyWebsite", "Official website (optional)", j.companyWebsite || "", 'type="url" placeholder="https://company.com/about"')}<button class="secondary">Save website</button></form></section></div><div><section class="panel prepare-panel"><span class="pill">YOUR APPLICATION, YOUR VOICE</span><h2>Make it personal.</h2><p>Use your saved profile and this job to prepare a document. No prompt copying.</p>${button(busy ? "Preparing…" : "Create tailored resume ↗", "generate-resume", "primary full", busy ? "disabled" : "")}${button("Create cover letter ↗", "generate-cover", "secondary full", busy ? "disabled" : "")}<small>A cover letter is optional. Review all facts before applying.</small>${!capabilities.ai ? '<p class="field-note">AI writing connection is being configured. Your profile and jobs can already be saved.</p>' : ""}</section><section class="panel"><h3>Application progress</h3><label>Status<select id="job-status">${STATUSES.map((s) => `<option ${row.status === s ? "selected" : ""}>${s}</option>`).join("")}</select></label><form id="job-note">${area("note", "Your notes", j.note || "")}<button class="secondary">Save notes</button></form></section><section class="panel"><h3>Prepared for this job</h3>${
      docs
        .filter((d) => d.job_id === row.id)
        .map(
          (d) =>
            `<button class="document-link" data-doc="${d.id}">${d.kind === "resume" ? "Resume" : "Cover letter"} <small>${fmt(d.created_at)} ↗</small></button>`,
        )
        .join("") || "<p>No documents yet.</p>"
    }${button("Remove saved job", "delete-job", "text-button danger")}</section></div></div>`
  );
}
function documentsPage() {
  const d = docs.find((x) => x.id === docId);
  if (d) {
    const text =
      d.kind === "resume"
        ? fullResumeText(d.data.text, d.data.profile, true)
        : d.data.text;
    return (
      heading(
        "YOUR DOCUMENT LIBRARY",
        d.kind === "resume" ? "Your tailored resume" : "Your cover letter",
        e(d.data.job?.company || "Saved document"),
        button("Back to documents", "documents", "secondary"),
      ) +
      `<div class="document-toolbar">${button("Download Word ↓", "word")}${button("Print / save PDF", "pdf", "secondary")}${button("Duplicate", "duplicate", "secondary")}${button("Delete", "delete-doc", "text-button danger")}</div><div class="two-columns"><section class="panel"><h2>Edit your draft</h2><form id="edit-document">${area("text", "Document text", d.data.text)}<label class="checkbox"><input name="reviewed" type="checkbox" ${d.data.reviewed ? "checked" : ""}> I reviewed the candidate and company facts.</label><button class="primary">Save as a new version</button></form><p class="field-note">Your previous version is retained. Formatting checks cannot guarantee ATS acceptance. Confirm the final page count in Word.</p>${pageBudget(
        text,
      )
        .warnings.map((s) => `<p class="error">${e(s)}</p>`)
        .join(
          "",
        )}</section><section class="paper" id="document-paper">${resumeHTML(text)}</section></div>`
    );
  }
  return (
    heading(
      "EVERY VERSION, IN ONE PLACE",
      "Your document library.",
      "Originals and personalized drafts, ready when you need them.",
    ) +
    `<section class="panel"><h2>Tailored documents</h2>${docs.length ? docs.map((d) => `<div class="library-row"><span class="file-icon">▧</span><div><h3>${e(d.data.job?.company || "Document")} · ${d.kind === "resume" ? "Resume" : "Cover letter"}</h3><p>${e(d.data.job?.title || "")} · ${fmt(d.created_at)} · ${d.data.reviewed ? "Reviewed" : "Review before applying"}</p></div><button class="secondary" data-doc="${d.id}">Open ↗</button></div>`).join("") : `<div class="quiet"><h3>Your story, tailored to the opportunity.</h3><p>Choose a saved job to create a resume or optional cover letter.</p>${button("Choose a saved job", "jobs")}</div>`}</section><section class="panel"><h2>Original resumes</h2>${originals.map((o) => `<div class="library-row"><span class="file-icon">▧</span><div><h3>${e(o.data.name)}</h3><p>Private original · ${fmt(o.created_at)}</p></div><button class="secondary" data-original="${o.id}">Download</button><button class="text-button danger" data-delete-original="${o.id}">Delete</button></div>`).join("") || "<p>Upload a resume from My profile to keep your original here.</p>"}</section>`
  );
}
function settings() {
  return (
    heading(
      "MAKE IT YOURS",
      "Your assistant, your preferences.",
      "Control how your workspace works for you.",
    ) +
    `<section class="panel"><h2>Automation</h2><p>Searches save their progress to your account. ${capabilities.background ? "The background worker is connected." : "While a search runs, keep this app open. Return to AI job search to resume saved progress."}</p><p>Up to four searches and four generated documents per day. Source and AI provider limits may be lower.</p><form id="preferences">${preferenceFields()}<button class="primary">Save settings</button></form></section><section class="panel"><h2>Your data belongs to you</h2>${button("Sign out", "signout", "secondary")}<p>Download a backup of your profile, saved jobs and document text.</p>${button("Export my workspace", "backup", "secondary")}<details><summary>Import data from the previous Applydesk</summary><p>Your old browser workspace is left intact until you choose to import it. Check the imported profile before generating documents.</p>${button("Import my old workspace", "migrate", "secondary")}</details></section><section class="panel"><h2>Writing preset</h2><p>Your original master prompt is preserved exactly. Its summary, skills and experience rules are applied during resume generation. Cover letters use a separate preset with simple English and no em dashes.</p><a href="/prompts/master-resume.txt" target="_blank">Read the exact original prompt ↗</a></section>`
  );
}
function render() {
  if (booting) { root.innerHTML = '<div class="auth-loading"><span class="live-dot"></span><p>Opening your private workspace…</p></div>'; return; }
  if (!session) {
    root.innerHTML = welcome();
    return;
  }
  root.innerHTML = shell(
    (
      {
        dashboard,
        profile: profilePage,
        search: searchPage,
        jobs: jobsPage,
        documents: documentsPage,
        settings,
        detail,
      }[page] || dashboard
    )() + (page==='dashboard' && profile.preferences?.notifications && notices.length ? `<section class="panel"><div class="section-heading"><h2>Workspace updates</h2>${button('Mark all read','read-notices','text-button')}</div>${notices.slice(0,5).map(n=>`<p>${n.data.read?'':'● '}${e(n.data.message)} <small>${fmt(n.created_at)}</small></p>`).join('')}</section>` : ''),
  );
}
function navigate(p) {
  page = p;
  error = "";
  if (p === "documents") docId = null;
  render();
  window.scrollTo(0, 0);
}
async function drive() {
  if (driving || !active()) return;
  driving = true;
  try {
    let lastWake = Date.now();
    await api("wake", { id: active().id });
    while (active() && session) {
      await new Promise((resolve) => setTimeout(resolve, 2500));
      const previous = active();
      if (!previous) break;
      const current = check(
        await db
          .from("automation_runs")
          .select("*")
          .eq("id", previous.id)
          .single(),
      );
      runs = runs.map((r) => (r.id === current.id ? current : r));
      if (
        current.data.cursor !== previous.data.cursor ||
        ["COMPLETED", "FAILED"].includes(current.state)
      )
        await load();
      if (["dashboard", "search", "jobs"].includes(page) && !document.activeElement?.closest('form')) render();
      if (
        active() &&
        Date.now() - lastWake > 30000 &&
        Date.parse(current.lease_until) < Date.now()
      ) {
        lastWake = Date.now();
        await api("wake", { id: current.id });
      }
    }
  } catch (err) {
    error = err.message;
    render();
  } finally {
    driving = false;
  }
}
async function saveJob(data) {
  check(
    await db
      .from("jobs")
      .update({ data, updated_at: new Date().toISOString() })
      .eq("id", selected),
  );
  await load();
  render();
}
root.addEventListener("click", async (ev) => {
  const el = ev.target.closest("button,[data-action]");
  if (!el) return;
  if (el.dataset.page) {
    navigate(el.dataset.page);
    if (page === "search") drive();
    return;
  }
  if (el.dataset.job) {
    selected = el.dataset.job;
    navigate("detail");
    return;
  }
  if (el.dataset.doc) {
    docId = el.dataset.doc;
    page = "documents";
    render();
    return;
  }
  if (el.dataset.filter) {
    filter = el.dataset.filter;
    render();
    return;
  }
  const a = el.dataset.action;
  if (el.closest("form") && (!a || a === "submit-profile")) return;
  try {
    if(a==='read-notices'){for(const n of notices.filter(n=>!n.data.read))check(await db.from('notifications').update({data:{...n.data,read:true}}).eq('id',n.id));await load();render();return;}
    if (el.dataset.original) {
      const o = originals.find((o) => o.id === el.dataset.original);
      const blob = check(
        await db.storage.from("career-originals").download(o.data.path),
      );
      download(o.data.name, blob, o.data.type);
      return;
    }
    if (el.dataset.deleteOriginal) {
      const o = originals.find((o) => o.id === el.dataset.deleteOriginal);
      if (!confirm("Delete this original resume?")) return;
      check(await db.storage.from("career-originals").remove([o.data.path]));
      check(await db.from("resumes").delete().eq("id", o.id));
      await load();
      render();
      return;
    }
    if (!a) return;
    if (a === "auth-switch") {
      authMode = authMode === "signup" ? "signin" : "signup";
      error = "";
      render();
      return;
    }
    if (a === "auth-mode") {
      authMode = el.dataset.mode === "signin" ? "signin" : "signup";
      error = "";
      render();
      return;
    }
    if (a === "dismiss") {
      error = "";
      render();
      return;
    }
    if (a === "signout") {
      await db.auth.signOut();
      session = null;
      profile = {};
      jobs = [];
      docs = [];
      runs = [];
      render();
      return;
    }
    if (["profile", "jobs", "documents"].includes(a)) {
      navigate(a);
      return;
    }
    if (["preferences", "view-search"].includes(a)) {
      navigate("search");
      drive();
      return;
    }
    if (a === "start") {
      if (!profile.preferences) {
        navigate("search");
        toast("Save your preferences, then start your search.");
        return;
      }
      if (busy) return;
      busy = true;
      await api("start");
      await load();
      navigate("search");
      drive();
    }
    if (a === "pause") {
      if (active()) await api("pause", { id: active().id });
      await load();
      render();
    }
    if (a === "resume") {
      await api("resume", { id: running().id });
      await load();
      render();
      drive();
    }
    if (a === "research") {
      busy = true;
      await api("research", { id: selected });
      await load();
      render();
    }
    if (a.startsWith("generate-")) {
      if (busy) return;
      busy = true;
      render();
      const result = await api("generate", {
        id: selected,
        kind: a === "generate-resume" ? "resume" : "coverLetter",
      });
      await load();
      docId = result.document.id;
      page = "documents";
    }
    if (a === "delete-job") {
      if (!confirm("Remove this saved job and its generated documents?"))
        return;
      check(await db.from("jobs").delete().eq("id", selected));
      await load();
      navigate("jobs");
    }
    if (["word", "pdf", "duplicate", "delete-doc"].includes(a)) {
      const d = docs.find((x) => x.id === docId);
      if (!d) return;
      const text =
        d.kind === "resume"
          ? fullResumeText(d.data.text, d.data.profile, true)
          : d.data.text;
      if (a === "word")
        download(
          `${d.data.job.company}-${d.kind}.docx`,
          createDocx(text),
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        );
      if (a === "pdf") window.print();
      if (a === "duplicate") {
        const copy = check(
          await db
            .from("generated_documents")
            .insert({
              user_id: session.user.id,
              job_id: d.job_id,
              kind: d.kind,
              data: { ...d.data, parent: d.id, reviewed: false },
            })
            .select()
            .single(),
        );
        await load();
        docId = copy.id;
      }
      if (a === "delete-doc" && confirm("Delete this document version?")) {
        check(await db.from("generated_documents").delete().eq("id", d.id));
        await load();
        docId = null;
      }
    }
    if (a === "backup")
      download(
        "applydesk-backup.json",
        JSON.stringify(
          {
            version: 2,
            profile,
            jobs,
            docs,
            originals: originals.map((o) => ({
              ...o,
              data: { ...o.data, path: undefined },
            })),
            runs,
          },
          null,
          2,
        ),
        "application/json",
      );
    if (a === "migrate") {
      const old = JSON.parse(
        localStorage.getItem("applydesk.workspace.v1") || "null",
      );
      if (!old) throw Error("No previous workspace was found in this browser.");
      await api("profile", {
        profile: {
          ...old.profile,
          confirmed: false,
          preferences: profile.preferences || DEFAULT_PREFERENCES,
        },
      });
      for (const j of old.jobs || []) {
        if (!j.url) continue;
        check(
          await db
            .from("jobs")
            .upsert(
              {
                user_id: session.user.id,
                source_key: j.url,
                data: {
                  ...j,
                  match: {
                    score: 0,
                    decision: "review",
                    gaps: [
                      "Imported from your previous workspace. Run a new search to refresh matching.",
                    ],
                  },
                },
                status: j.status || "Saved",
              },
              { onConflict: "user_id,source_key" },
            ),
        );
      }
      await load();
      navigate("profile");
      toast("Old data imported. Please review your profile.");
    }
  } catch (err) {
    const message = String(err.message || err);
    error = /rate limit|email rate limit/i.test(message)
      ? "Supabase has reached its free confirmation-email limit. Do not retry yet. Wait for the limit to reset, then create the account once, or use Sign in if you already confirmed it."
      : /email not confirmed/i.test(message)
        ? "Confirm your email from the latest message, then use Sign in."
        : message;
  } finally {
    busy = false;
    render();
  }
});
root.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const form = ev.target,
    values = Object.fromEntries(new FormData(form));
  if (busy) return;
  busy = true;
  error = "";
  try {
    if (form.id === "auth") {
      const result =
        authMode === "signup"
          ? await db.auth.signUp({
              email: values.email,
              password: values.password,
              options: { emailRedirectTo: "https://ai-job-assistant-automation.vercel.app/" },
            })
          : await db.auth.signInWithPassword({
              email: values.email,
              password: values.password,
            });
      check(result);
      if (!result.data.session) {
        error = "Check your email to confirm your account, then sign in.";
      } else {
        session = result.data.session;
        await load();
        capabilities = await api("status");
        page = profile.confirmed ? "dashboard" : "profile";
      }
    }
    if (form.id === "profile") {
      await api("profile", {
        profile: {
          ...profile,
          ...values,
          confirmed: values.confirmed === "on",
        },
      });
      await load();
      toast("Your career profile is saved.");
    }
    if (form.id === "preferences") {
      const p = {
        ...DEFAULT_PREFERENCES,
        titles: String(values.titles || "")
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
        cities: String(values.cities || "")
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
        country: values.country,
        maxYears: Number(values.maxYears),
        minimumScore: Number(values.minimumScore),
        allowRemote: values.allowRemote === "on",
        notifications: values.notifications === "on",
        daily: values.daily === "on",
      };
      if (!p.titles.length) throw Error("Add at least one role.");
      await api("profile", { profile: { ...profile, preferences: p } });
      await load();
      toast("Preferences saved. You can start your search.");
    }
    if (form.id === "company-site")
      await saveJob({
        ...jobs.find((j) => j.id === selected).data,
        companyWebsite: values.companyWebsite,
      });
    if (form.id === "job-note")
      await saveJob({
        ...jobs.find((j) => j.id === selected).data,
        note: values.note,
      });
    if (form.id === "edit-document") {
      const d = docs.find((d) => d.id === docId);
      const saved = check(
        await db
          .from("generated_documents")
          .insert({
            user_id: session.user.id,
            job_id: d.job_id,
            kind: d.kind,
            data: {
              ...d.data,
              text: values.text,
              reviewed: values.reviewed === "on",
              parent: d.id,
              validation: {
                errors: [],
                warnings: ["Edited by the user. Review the final version."],
              },
            },
          })
          .select()
          .single(),
      );
      await load();
      docId = saved.id;
      toast("Saved as a new version.");
    }
  } catch (err) {
    error = err.message;
  } finally {
    busy = false;
    render();
  }
});
root.addEventListener("change", async (ev) => {
  if (!["job-status", "resume-upload"].includes(ev.target.id)) return;
  try {
    if (ev.target.id === "job-status") {
      check(
        await db
          .from("jobs")
          .update({ status: ev.target.value })
          .eq("id", selected),
      );
      await load();
      render();
    }
    if (ev.target.id === "resume-upload") {
      const file = ev.target.files[0];
      if (!file) return;
      if (file.size > 3 * 1024 * 1024)
        throw Error("Choose a resume under 3 MB.");
      busy = true;
      render();
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const result = await api("parse", { name: file.name, base64 });
      // Preserve original text. Suggestions are editable and never silently confirmed.
      const lines = result.text
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      const suggestion = { ...profile, confirmed: false };
      if (!suggestion.name && lines[0]?.length < 80) suggestion.name = lines[0];
      if (!suggestion.contact)
        suggestion.contact = (
          result.text.match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g) || []
        ).join(" | ");
      for (const [key, pattern] of [
        [
          "skills",
          /(?:TECHNICAL SKILLS|SKILLS)\s*\n([\s\S]*?)(?=\n[A-Z][A-Z &]{3,}\n|$)/,
        ],
        [
          "experience",
          /(?:WORK EXPERIENCE|EXPERIENCE)\s*\n([\s\S]*?)(?=\n[A-Z][A-Z &]{3,}\n|$)/,
        ],
        ["education", /EDUCATION\s*\n([\s\S]*?)(?=\n[A-Z][A-Z &]{3,}\n|$)/],
      ])
        if (!suggestion[key])
          suggestion[key] = result.text.match(pattern)?.[1]?.trim() || "";
      await api("profile", { profile: suggestion });
      await load();
      toast(
        "Resume read. Review the extracted text and confirm your profile fields.",
      );
    }
  } catch (err) {
    error = err.message;
  } finally {
    busy = false;
    render();
  }
});
async function boot() {
  try {
    session = (await db.auth.getSession()).data.session;
    if (session) {
      await load();
      capabilities = await api("status");
      page = profile.confirmed ? "dashboard" : "profile";
    } else if (LOCAL_PREVIEW) {
      session = { user: { id: "local-preview", email: "Preview workspace" } };
      profile = { name: "Preview workspace", preferences: DEFAULT_PREFERENCES };
      capabilities = { cloud: false, background: false, ai: false };
      page = "dashboard";
    }
  } catch (err) {
    error = err.message;
  }
  booting = false;
  render();
  if (session && active()) drive();
}
boot();
