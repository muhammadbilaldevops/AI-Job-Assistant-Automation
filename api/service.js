import { fetchResearch } from "../lib/research.mjs";
import { feedURL, feedJobs } from "../server.mjs";
// Public, credential-free adapters only. Make and model secrets stay on the local server.
const recent = new Map();
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST")
    return res.status(405).json({ error: "Use POST." });
  let origin;
  try {
    origin = new URL(req.headers.origin).host;
  } catch {}
  if (
    origin !== req.headers.host ||
    !req.headers["content-type"]?.startsWith("application/json")
  )
    return res
      .status(403)
      .json({ error: "Use the application on this website." });
  const key = String(req.headers["x-forwarded-for"] || "unknown").split(",")[0],
    now = Date.now();
  for (const [ip, time] of recent) if (now - time > 60000) recent.delete(ip);
  if (now - (recent.get(key) || 0) < 2500)
    return res
      .status(429)
      .json({
        error: "Please wait a few seconds before another source request.",
      });
  recent.set(key, now);
  try {
    const input =
      typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    if (!input || JSON.stringify(input).length > 4000)
      throw Error("Invalid or oversized request.");
    if (input.action === "research")
      return res.status(200).json(await fetchResearch(input.url));
    if (input.action === "feed") {
      if (
        typeof input.company !== "string" ||
        !input.company.trim() ||
        input.company.length > 200
      )
        throw Error("Enter the employer name.");
      const response = await fetch(feedURL(input.provider, input.board), {
        signal: AbortSignal.timeout(15000),
        redirect: "error",
      });
      if (!response.ok)
        throw Error(`The employer feed returned HTTP ${response.status}.`);
      let size = 0;
      const chunks = [];
      for await (const chunk of response.body) {
        size += chunk.length;
        if (size > 5 * 1024 * 1024) throw Error("The feed is too large.");
        chunks.push(chunk);
      }
      return res
        .status(200)
        .json({
          jobs: feedJobs(
            input.provider,
            JSON.parse(Buffer.concat(chunks).toString()),
            input.company,
          ),
        });
    }
    return res.status(400).json({ error: "Unknown source action." });
  } catch (error) {
    return res
      .status(400)
      .json({
        error: String(error.message).replace(/https?:\/\/\S+/g, "[source URL]"),
      });
  }
}
