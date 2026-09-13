const cache = new Map();
export async function companyContext(job, fetcher = fetch) {
  const slug = job.companySlug;
  if (!/^[a-z0-9-]{1,160}$/.test(slug || "")) return null;
  const hit = cache.get(slug);
  if (hit && Date.now() - hit.at < 86400000) return hit.value;
  const r = await fetcher("https://mcp.himalayas.app/mcp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: {
        name: "get_company_details",
        arguments: { company_slug: slug },
      },
    }),
    signal: AbortSignal.timeout(10000),
    redirect: "error",
  });
  if (!r.ok) throw Error("Company profile source could not be read.");
  const body = await r.text();
  if (body.length > 150000) throw Error("Company profile is too large.");
  const message = JSON.parse(
    body.startsWith("event:")
      ? body
          .split("\n")
          .find((l) => l.startsWith("data: "))
          .slice(6)
      : body,
  );
  if (message.error || message.result?.isError)
    throw Error("Company profile source returned an error.");
  const text =
    message.result?.content
      ?.filter((c) => c.type === "text")
      .map((c) => c.text)
      .join("\n") || "";
  const name = text.match(/^#\s+(.+)/)?.[1]?.trim();
  if (!name || name.toLowerCase() !== job.company.trim().toLowerCase())
    throw Error("Company identity could not be matched to this listing.");
  const website =
    text.match(/\*\*Website:\*\*\s+(https:\/\/[^\s]+)/)?.[1] || "";
  const value = {
    website,
    source: {
      url: `https://himalayas.app/companies/${slug}`,
      title: name + " company profile",
      notes: text.slice(0, 10000),
      checkedAt: new Date().toISOString(),
      verified: false,
      kind: "Company profile via Himalayas",
      identityMatched: true,
    },
  };
  if (cache.size > 100) cache.delete(cache.keys().next().value);
  cache.set(slug, { at: Date.now(), value });
  return value;
}
