import { readFile } from "node:fs/promises";
import { buildPrompt, validateResume, safeURL } from "../dist/core.js";
import { fetchResearch } from "./research.mjs";
import { checked } from "./pipeline.mjs";
import { companyContext } from "./company.mjs";

export function modelReady() {
  return !!(process.env.MAKE_AI_WEBHOOK_URL || process.env.OLLAMA_MODEL);
}
export async function modelText(prompt) {
  if (process.env.MAKE_AI_WEBHOOK_URL) {
    const url = new URL(process.env.MAKE_AI_WEBHOOK_URL);
    if (
      !/^hook\.[a-z0-9]+\.make\.com$/.test(url.hostname) ||
      url.protocol !== "https:"
    )
      throw Error("Writing service is not configured correctly.");
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
      signal: AbortSignal.timeout(55000),
      redirect: "error",
    });
    if (!r.ok)
      throw Error(
        "The writing service is unavailable or its free allowance is used up. Try again later.",
      );
    const text = await r.text();
    if (text.length > 50000)
      throw Error("Writing response exceeded its limit.");
    try {
      const j = JSON.parse(text);
      if (typeof j.text === "string") return j.text;
    } catch {}
    throw Error("The writing service did not return a completed draft.");
  }
  if (process.env.OLLAMA_MODEL && !process.env.VERCEL) {
    const r = await fetch("http://127.0.0.1:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OLLAMA_MODEL,
        prompt,
        stream: false,
      }),
      signal: AbortSignal.timeout(55000),
    });
    if (!r.ok) throw Error("The local writing model is unavailable.");
    return (await r.json()).response;
  }
  throw Error(
    "AI writing has not been connected by the app owner yet. Your profile and saved jobs are ready; no draft has been fabricated.",
  );
}
export async function researchCompany(job) {
  // A retrieved source is evidence of its text, not independent verification of every company claim.
  const results = [];
  let website = job.companyWebsite;
  try {
    const context = await companyContext(job);
    if (context) {
      results.push(context.source);
      website ||= context.website;
    }
  } catch {}
  const urls = [job.url];
  if (safeURL(website)) urls.unshift(website);
  for (const url of urls.slice(0, 2))
    try {
      const r = await fetchResearch(url);
      results.push({
        ...r,
        notes: r.excerpt,
        checkedAt: r.fetchedAt,
        verified: false,
        kind: url === job.url ? "Job listing" : "Company website",
      });
    } catch (e) {
      results.push({
        url,
        verified: false,
        error: String(e.message).slice(0, 180),
        checkedAt: new Date().toISOString(),
      });
    }
  return results;
}
export function factualChecks(text, profile, job, kind) {
  const errors = kind === "resume" ? validateResume(text, job).errors : [];
  if (/[—]/.test(text)) errors.push("The draft contains an em dash.");
  const candidate = JSON.stringify(profile).toLowerCase();
  const quantified = [
    ...text.matchAll(
      /\b\d+(?:\.\d+)?\s*(?:%|percent|years? of experience|million|billion)\b/gi,
    ),
  ].map((m) => m[0]);
  for (const claim of quantified)
    if (!candidate.includes(claim.toLowerCase()))
      errors.push("Check an unsupported quantified claim: " + claim);
  if (
    kind === "coverLetter" &&
    (text.split(/\s+/).length < 120 || text.split(/\s+/).length > 350)
  )
    errors.push("The cover letter should be a short, complete letter.");
  return [...new Set(errors)];
}
export async function generate(db, uid, jobId, kind) {
  if (!["resume", "coverLetter"].includes(kind))
    throw Error("Choose a resume or cover letter.");
  if (!modelReady())
    throw Error("AI writing is not connected yet. Your saved work is safe.");
  const row = checked(
    await db
      .from("jobs")
      .select("*")
      .eq("id", jobId)
      .eq("user_id", uid)
      .single(),
  );
  const profile = checked(
    await db.from("user_profiles").select("data").eq("user_id", uid).single(),
  ).data;
  const profileWarnings = [];
  if (!profile.confirmed) profileWarnings.push("Profile facts are not confirmed yet. Review every line before using this draft.");
  if (!profile.skills?.trim()) profileWarnings.push("Add your real skills before finalizing this draft.");
  if (kind === "resume" && !profile.experience?.trim()) profileWarnings.push("Add one truthful experience or clearly labelled project entry before exporting.");
  let sources = row.data.research || [];
  if (
    !sources.some(
      (s) =>
        s.kind === "Company website" &&
        s.notes &&
        Date.now() - Date.parse(s.checkedAt) < 30 * 86400000,
    )
  )
    sources = await researchCompany(row.data);
  const evidence = sources.filter((s) => s.notes);
  if (!evidence.length)
    throw Error(
      "Company sources could not be read. Add an official company website in this job, then retry. The agent will not invent company research.",
    );
  checked(
    await db
      .from("company_research")
      .upsert(
        {
          user_id: uid,
          job_id: jobId,
          data: { sources, checkedAt: new Date().toISOString() },
        },
        { onConflict: "user_id,job_id" },
      ),
  );
  checked(
    await db
      .from("jobs")
      .update({ data: { ...row.data, research: sources } })
      .eq("id", jobId)
      .eq("user_id", uid),
  );
  const master = await readFile(
    new URL("../dist/prompts/master-resume.txt", import.meta.url),
    "utf8",
  );
  const prompt =
    buildPrompt(
      master,
      {
        ...row.data,
        research: evidence.map((s) => ({
          ...s,
          verified: true,
          verificationScope:
            "Retrieved source text, not independent verification of company claims",
        })),
      },
      profile,
      kind,
    ) +
    "\nSOURCE SCOPE: The application fetched these pages now. Job-listing excerpts may support role requirements and company self-description only. Do not invent independent company strategy or claim to have checked sources not supplied. Describe challenges as role-supported needs, not verified internal failures. Return only the requested document.";
  let text = await modelText(prompt),
    errors = factualChecks(text, profile, row.data, kind);
  if (errors.length) {
    text = await modelText(
      prompt +
        "\nRepair the following draft without adding facts. Errors: " +
        JSON.stringify(errors) +
        "\nDraft:\n" +
        text,
    );
    errors = factualChecks(text, profile, row.data, kind);
  }
  // Save an editable first draft even when strict rules find issues. The user can
  // correct the content in the editor before exporting or applying.
  return checked(
    await db
      .from("generated_documents")
      .insert({
        user_id: uid,
        job_id: jobId,
        kind,
        data: {
          text,
          profile,
          job: row.data,
          sources,
          reviewed: false,
          validation: {
            errors,
            warnings: [...profileWarnings, ...errors.map((x) => `Review: ${x}`),
              "Review every factual claim before applying. Automated checks cannot guarantee truthfulness or ATS acceptance.",
            ],
          },
          preset: "master-v1",
          createdAt: new Date().toISOString(),
        },
      })
      .select()
      .single(),
  );
}
