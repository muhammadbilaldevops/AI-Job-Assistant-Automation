import { createClient } from "@supabase/supabase-js";
import { cloud } from "../dist/config.js";
import { checked, newRun, processRun } from "../lib/pipeline.mjs";
import { generate, modelReady, researchCompany } from "../lib/writing.mjs";
import { preferences } from "../lib/discovery.mjs";
import {validateDocxArchive} from '../lib/upload.mjs';

const busy = new Set();
export default async function handler(req, res) {
  const send = (status, body) => {
    res.statusCode = status;
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "no-store");
    res.end(JSON.stringify(body));
  };
  if (req.method !== "POST") return send(405, { error: "Use POST." });
  const origin = req.headers.origin;
  if (origin) {try {if(new URL(origin).host!==req.headers.host) return send(403,{error:'Open this action from Applydesk.'});}catch{return send(403,{error:'Invalid origin.'});}}
  if (!String(req.headers["content-type"]).includes("application/json"))
    return send(415, { error: "Use a JSON request." });
  let uid;
  try {
    const token = String(req.headers.authorization || "").replace(
      /^Bearer /,
      "",
    );
    if (!token)
      return send(401, { error: "Sign in to save and search your jobs." });
    const db = createClient(cloud.url, cloud.key, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const auth = await db.auth.getUser(token);
    if (auth.error || !auth.data.user)
      return send(401, { error: "Your session has ended. Sign in again." });
    uid = auth.data.user.id;
    let body = req.body;
    if (body === undefined) {
      let raw = "";
      for await (const chunk of req) {
        raw += chunk;
        if (raw.length > 4200000)
          throw Error("File is too large. Use a resume under 3 MB.");
      }
      body = JSON.parse(raw);
    }
    if (typeof body === "string") body = JSON.parse(body);
    if (JSON.stringify(body).length > 4200000)
      throw Error("Request is too large.");
    const { action } = body;
    if (action === "status")
      return send(200, { ai: modelReady(), cloud: true, background: true });
    if (action === "wake") {
      const run = checked(
        await db
          .from("automation_runs")
          .select("id")
          .eq("id", body.id)
          .eq("user_id", uid)
          .single(),
      );
      const r = await fetch(`${cloud.url}/functions/v1/job-worker`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          apikey: cloud.key,
        },
        body: JSON.stringify({ id: run.id }),
        signal: AbortSignal.timeout(10000),
      });
      if (!r.ok)
        throw Error(
          "The background worker could not start. Your saved search can resume here.",
        );
      return send(200, { accepted: true });
    }
    if (action === "profile") {
      const data = body.profile;
      if (!data || JSON.stringify(data).length > 100000)
        throw Error("Profile is too large.");
      data.preferences = preferences(data.preferences);
      checked(
        await db
          .from("user_profiles")
          .upsert({ user_id: uid, data, updated_at: new Date().toISOString() }),
      );
      return send(200, { ok: true });
    }
    if (action === "start") {
      const profile = checked(
        await db
          .from("user_profiles")
          .select("data")
          .eq("user_id", uid)
          .maybeSingle(),
      );
      if (!profile?.data.preferences?.titles?.length)
        throw Error("Save your job preferences first.");
      const existing = checked(
        await db
          .from("automation_runs")
          .select("*")
          .eq("user_id", uid)
          .not("state", "in", "(COMPLETED,FAILED,PAUSED)")
          .limit(1),
      );
      if (existing.length) return send(200, { run: existing[0] });
      const recent = checked(
        await db
          .from("automation_runs")
          .select("id")
          .eq("user_id", uid)
          .gte("created_at", new Date(Date.now() - 86400000).toISOString()),
      );
      if (recent.length >= 4)
        throw Error(
          "You have used today’s four searches. Your results are saved; try again tomorrow.",
        );
      const run = checked(
        await db
          .from("automation_runs")
          .insert({ user_id: uid, data: newRun(profile.data) })
          .select()
          .single(),
      );
      return send(200, { run });
    }
    if (action === "step")
      return send(200, { run: await processRun(db, uid, body.id) });
    if (action === "pause")
      return send(200, {
        run: checked(
          await db
            .from("automation_runs")
            .update({ state: "PAUSED", updated_at: new Date().toISOString() })
            .eq("id", body.id)
            .eq("user_id", uid)
            .not("state", "in", "(COMPLETED,FAILED)")
            .select()
            .maybeSingle(),
        ),
      });
    if (action === "resume")
      return send(200, {
        run: checked(
          await db
            .from("automation_runs")
            .update({
              state: "SEARCHING",
              updated_at: new Date().toISOString(),
            })
            .eq("id", body.id)
            .eq("user_id", uid)
            .eq("state", "PAUSED")
            .select()
            .single(),
        ),
      });
    if (action === "research") {
      const row = checked(
        await db
          .from("jobs")
          .select("*")
          .eq("id", body.id)
          .eq("user_id", uid)
          .single(),
      );
      const research = await researchCompany(row.data);
      checked(
        await db
          .from("jobs")
          .update({ data: { ...row.data, research } })
          .eq("id", row.id)
          .eq("user_id", uid),
      );
      checked(
        await db
          .from("company_research")
          .upsert(
            { user_id: uid, job_id: row.id, data: { sources: research } },
            { onConflict: "user_id,job_id" },
          ),
      );
      return send(200, { research });
    }
    if (action === "generate") {
      if (busy.has(uid))
        return send(429, {
          error: "A document is already being prepared. Please wait.",
        });
      if (!modelReady())
        throw Error(
          "AI writing is not connected yet. Your saved work is safe.",
        );
      const day = new Date().toISOString().slice(0, 10);
      const attempts = checked(
        await db
          .from("generation_attempts")
          .select("slot")
          .eq("user_id", uid)
          .eq("day", day),
      );
      if (attempts.length >= 4)
        throw Error(
          "Today’s four writing attempts are used. You can still edit and download your saved documents.",
        );
      checked(
        await db
          .from("generation_attempts")
          .insert({ user_id: uid, day, slot: attempts.length }),
      );
      busy.add(uid);
      try {
        return send(200, {
          document: await generate(db, uid, body.id, body.kind),
        });
      } finally {
        busy.delete(uid);
      }
    }
    if (action === "parse") {
      const name = String(body.name || ""),
        bytes = Buffer.from(String(body.base64 || ""), "base64");
      if (bytes.length > 3 * 1024 * 1024 || bytes.length < 1)
        throw Error("Use a file between 1 byte and 3 MB.");
      let text = "",
        type = "text/plain";
      if (/\.docx$/i.test(name)) {
        validateDocxArchive(bytes);
        const mammoth = await import("mammoth");
        text = (await mammoth.default.extractRawText({ buffer: bytes })).value;
        type =
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      } else if (/\.pdf$/i.test(name)) {
        const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
        const pdf = await pdfjs.getDocument({
          data: new Uint8Array(bytes),
          isEvalSupported: false,
          disableWorker: true,
          useSystemFonts: true,
        }).promise;
        try {
          if (pdf.numPages > 10)
            throw Error("Upload a resume with at most 10 pages.");
          for (let p = 1; p <= pdf.numPages; p++)
            text +=
              (await (await pdf.getPage(p)).getTextContent()).items
                .map((i) => i.str+(i.hasEOL?'\n':' '))
                .join("") + "\n";
        } finally {
          await pdf.destroy();
        }
        type = "application/pdf";
      } else if (/\.txt$/i.test(name)) text = bytes.toString("utf8");
      else throw Error("Upload a PDF, DOCX or plain text resume.");
      if (!text.trim())
        throw Error(
          "This file has no readable text. For a scanned PDF, use the starter questions or export a text PDF first.",
        );
      if (text.length > 80000)
        throw Error("The resume contains too much text.");
      const path = `${uid}/${crypto.randomUUID()}.${name.split(".").pop().toLowerCase()}`;
      checked(
        await db.storage
          .from("career-originals")
          .upload(path, bytes, { contentType: type }),
      );
      let original;
      try {
        original = checked(
          await db
            .from("resumes")
            .insert({
              user_id: uid,
              data: {
                name: name.slice(0, 200),
                path,
                type,
                text,
                confirmed: false,
              },
            })
            .select()
            .single(),
        );
      } catch (e) {
        await db.storage.from("career-originals").remove([path]);
        throw e;
      }
      return send(200, { original, text });
    }
    return send(400, { error: "Unknown action." });
  } catch (e) {
    return send(400, {
      error: String(
        e.message || "This action could not finish. Please try again.",
      )
        .replace(/https?:\/\/\S+/g, "[service]")
        .slice(0, 500),
    });
  }
}
