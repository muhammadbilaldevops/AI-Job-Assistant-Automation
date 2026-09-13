// Original three-section preset stays intact. The complete CV is a separate wrapper.
export const PAGE_BREAK = "[[PAGE_BREAK]]";
export function fullResumeText(draft, profile, twoPages = true) {
  const front = [profile.name, profile.contact, "", draft].join("\n");
  const back = [
    profile.education ? "EDUCATION\n" + profile.education : "",
    profile.projects ? "PROJECTS\n" + profile.projects : "",
  ]
    .filter(Boolean)
    .join("\n\n");
  return back
    ? front + "\n" + (twoPages ? PAGE_BREAK + "\n" : "") + back
    : front;
}
export function pageBudget(text) {
  const pages = text.split(PAGE_BREAK);
  // Advisory conservative estimate, not Word's layout engine. No content is removed.
  const estimatedLines = pages.map((p) =>
    p
      .split(/\r?\n/)
      .reduce(
        (n, line) =>
          n + Math.max(1, Math.ceil(line.replace(/\*+/g, "").length / 88)),
        0,
      ),
  );
  return {
    pages: pages.length,
    estimatedLines,
    warnings: estimatedLines.flatMap((n, i) =>
      n > 47
        ? [
            `Page ${i + 1} may overflow. Shorten long paragraphs or lists and confirm the final page count in Word.`,
          ]
        : [],
    ),
  };
}
