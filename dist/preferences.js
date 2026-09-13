import { TITLES } from "./core.js";

export const defaultSearches = () =>
  TITLES.flatMap((title) =>
    ["Islamabad", "Rawalpindi", "Remote"].map((location) => ({
      id: crypto.randomUUID(),
      title,
      location,
      radius: 100,
      enabled: true,
    })),
  );
export const defaultRules = () => ({
  titles: [...TITLES],
  cities: ["Islamabad", "Rawalpindi", "Rwp"],
  remoteCountry: "Pakistan",
  maxYears: 2,
  allowRemote: true,
});
export function normalizeSearch(value) {
  const title = String(value.title || "").trim(),
    location = String(value.location || "").trim();
  const radius = Number(value.radius);
  if (!title || title.length > 120 || !location || location.length > 120)
    throw Error("Enter a job title and location, each under 120 characters.");
  if (!Number.isInteger(radius) || radius < 0 || radius > 100)
    throw Error("Choose a radius from 0 to 100 km.");
  return {
    id: typeof value.id === "string" ? value.id : crypto.randomUUID(),
    title,
    location,
    radius,
    enabled: value.enabled !== false,
  };
}
export function normalizeRules(value = {}) {
  const list = (x) =>
    Array.isArray(x)
      ? x
          .map((s) => String(s).trim())
          .filter(Boolean)
          .slice(0, 100)
      : [];
  const titles = list(value.titles),
    cities = list(value.cities);
  if (!titles.length || !cities.length)
    throw Error("Add at least one target title and one accepted city.");
  const maxYears = Number(value.maxYears);
  if (!Number.isFinite(maxYears) || maxYears < 0 || maxYears > 50)
    throw Error("Enter a valid maximum experience requirement.");
  return {
    titles,
    cities,
    remoteCountry: String(value.remoteCountry || "Pakistan")
      .trim()
      .slice(0, 100),
    maxYears,
    allowRemote: value.allowRemote !== false,
  };
}
export function searchLink(search) {
  const url = new URL("https://pk.indeed.com/jobs");
  url.search = new URLSearchParams({
    q: search.title,
    l: search.location,
    radius: String(search.radius),
    sort: "date",
  });
  return url.href;
}
export function titleFits(title, titles) {
  const skip =
    /^(intern|internship|associate|junior|graduate|trainee|entry|level|senior|engineer|developer)$/i;
  return titles.some((term) => {
    const words = term
      .toLowerCase()
      .split(/[^a-z0-9+#]+/)
      .filter((w) => w && !skip.test(w));
    return words.length
      ? words.every((w) =>
          new RegExp(
            "(^|[^a-z0-9])" +
              w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") +
              "($|[^a-z0-9])",
            "i",
          ).test(title),
        )
      : title.toLowerCase().includes(term.toLowerCase());
  });
}
export function cityFits(location, cities) {
  return cities.some((city) =>
    new RegExp(
      "(^|[^a-z0-9])" +
        city.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") +
        "($|[^a-z0-9])",
      "i",
    ).test(location),
  );
}
export function normalizeFeed(value) {
  if (
    !value ||
    !["Greenhouse", "Lever"].includes(value.provider) ||
    !/^[A-Za-z0-9_-]{1,100}$/.test(value.board) ||
    !String(value.company || "").trim()
  )
    throw Error("Invalid employer feed settings.");
  return {
    id: typeof value.id === "string" ? value.id : crypto.randomUUID(),
    provider: value.provider,
    board: value.board,
    company: String(value.company).trim().slice(0, 200),
  };
}
