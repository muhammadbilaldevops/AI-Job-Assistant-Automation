import { lookup } from "node:dns/promises";
import https from "node:https";

export function publicIPv4(ip) {
  if (!/^\d+\.\d+\.\d+\.\d+$/.test(ip)) return false;
  const [a, b, c, d] = ip.split(".").map(Number);
  if ([a, b, c, d].some((x) => x > 255)) return false;
  return !(
    a === 0 ||
    a === 10 ||
    a === 127 ||
    a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && (b === 168 || b === 0 || b === 2)) ||
    (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
    (a === 203 && b === 0 && c === 113)
  );
}
export function researchURL(value) {
  const u = new URL(value);
  if (
    u.protocol !== "https:" ||
    u.username ||
    u.password ||
    (u.port && u.port !== "443") ||
    !u.hostname.includes(".") ||
    u.hostname.endsWith(".local") ||
    u.hostname.endsWith(".internal")
  )
    throw Error(
      "Use a public HTTPS company page without credentials or a custom port.",
    );
  if (/(^|\.)(indeed\.com|linkedin\.com)$/.test(u.hostname))
    throw Error(
      "Use the company’s own public website for this research reader. Browse job boards directly.",
    );
  return u;
}
export function htmlText(html) {
  return html
    .replace(
      /<(script|style|noscript|svg|nav|footer)\b[^>]*>[\s\S]*?<\/\1>/gi,
      " ",
    )
    .replace(/<[^>]*>/g, " ")
    .replace(/&#(\d+);/g, (_, n) =>
      Number(n) <= 0x10ffff ? String.fromCodePoint(Number(n)) : " ",
    )
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}
async function readPublicPage(url) {
  // Resolve and pin a validated public IPv4 address. Redirects get the same checks.
  const addresses = await lookup(url.hostname, { all: true, family: 4 });
  if (!addresses.length || addresses.some((a) => !publicIPv4(a.address)))
    throw Error("This destination is not a public website.");
  return new Promise((resolve, reject) => {
    const request = https.get(
      url,
      {
        headers: {
          "User-Agent": "Applydesk-Company-Research/0.2",
          Accept: "text/html,text/plain",
        },
        lookup: (_host, options, cb) =>
          cb(
            null,
            options.all
              ? [{ address: addresses[0].address, family: 4 }]
              : addresses[0].address,
            4,
          ),
      },
      (res) => {
        if ([301, 302, 303, 307, 308].includes(res.statusCode)) {
          res.resume();
          resolve({ redirect: res.headers.location });
          return;
        }
        if (res.statusCode !== 200) {
          res.resume();
          reject(
            Error(
              `The page returned HTTP ${res.statusCode}. Open it manually and add verified notes.`,
            ),
          );
          return;
        }
        if (!/^text\/(html|plain)/i.test(res.headers["content-type"] || "")) {
          res.resume();
          reject(
            Error("This reader supports HTML and plain-text company pages."),
          );
          return;
        }
        let size = 0;
        const chunks = [];
        res.on("data", (chunk) => {
          size += chunk.length;
          if (size > 2 * 1024 * 1024)
            res.destroy(Error("The page is too large. Add notes manually."));
          else chunks.push(chunk);
        });
        res.on("end", () =>
          resolve({ html: Buffer.concat(chunks).toString("utf8") }),
        );
        res.on("error", reject);
      },
    );
    const timer = setTimeout(
      () => request.destroy(Error("Company page timed out. Open it manually.")),
      12000,
    );
    request.on("close", () => clearTimeout(timer));
    request.on("error", reject);
  });
}
export async function fetchResearch(value) {
  let url = researchURL(value);
  for (let i = 0; i < 3; i++) {
    const result = await readPublicPage(url);
    if (result.redirect) {
      url = researchURL(new URL(result.redirect, url).href);
      continue;
    }
    const text = htmlText(result.html);
    if (text.length < 100)
      throw Error(
        "Too little readable text. This page may require JavaScript; add verified notes manually.",
      );
    const title = htmlText(
      result.html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] ||
        url.hostname,
    );
    return {
      url: url.href,
      title,
      excerpt: text.slice(0, 14000),
      truncated: text.length > 14000,
      fetchedAt: new Date().toISOString(),
      verified: false,
    };
  }
  throw Error("Too many redirects. Open the final company page manually.");
}
