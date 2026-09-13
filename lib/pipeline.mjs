import { preferences, searchSource, analyze, match } from "./discovery.mjs";
import { companyContext } from "./company.mjs";
const now = () => new Date().toISOString();
export function checked(result) {
  if (result.error) throw Error(result.error.message);
  return result.data;
}
export function newRun(profile) {
  const p = preferences(profile.preferences);
  const tasks = p.allowRemote
    ? p.titles.flatMap((title) => [1, 2].map((page) => ({ title, page })))
    : [];
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
        message: "Search created using your saved preferences.",
      },
    ],
  };
}
export async function processRun(db, uid, id, fetcher = fetch) {
  let run = checked(
    await db
      .from("automation_runs")
      .select("*")
      .eq("id", id)
      .eq("user_id", uid)
      .single(),
  );
  if (["PAUSED", "COMPLETED", "FAILED"].includes(run.state)) return run;
  const lease = now();
  const claimed = checked(
    await db
      .from("automation_runs")
      .update({
        lease_until: new Date(Date.now() + 90000).toISOString(),
        state: "SEARCHING",
        updated_at: lease,
      })
      .eq("id", id)
      .eq("user_id", uid)
      .eq("updated_at", run.updated_at)
      .lt("lease_until", lease)
      .not("state", "in", "(PAUSED,COMPLETED,FAILED)")
      .select(),
  );
  if (!claimed.length) return run;
  const d = structuredClone(run.data),
    task = d.tasks[d.cursor];
  const event = (state, message) => {
    d.events.push({ at: now(), state, message });
    d.events = d.events.slice(-60);
  };
  try {
    if (task) {
      event(
        "SEARCHING",
        `Searching ${task.title}, page ${task.page}, on Himalayas.`,
      );
      const cacheKey = JSON.stringify([task, d.preferences.country]);
      const source = await cachedSource(cacheKey, () =>
        searchSource(task, d.preferences, fetcher),
      );
      const current = checked(
        await db
          .from("automation_runs")
          .select("state")
          .eq("id", id)
          .eq("user_id", uid)
          .single(),
      );
      if (current.state === "PAUSED")
        return checked(
          await db
            .from("automation_runs")
            .update({ lease_until: "1970-01-01" })
            .eq("id", id)
            .eq("user_id", uid)
            .select()
            .single(),
        );
      d.found += source.jobs.length;
      event(
        "ANALYZING",
        `Read ${source.jobs.length} real listings and extracted their stated requirements.`,
      );
      const existing = source.jobs.length
        ? checked(
            await db
              .from("jobs")
              .select("id,source_key,data")
              .eq("user_id", uid)
              .in(
                "source_key",
                source.jobs.map((j) => j.source_key),
              ),
          )
        : [];
      event(
        "MATCHING",
        "Comparing titles, experience, skills and location restrictions.",
      );
      let researched = 0;
      for (const j of source.jobs) {
        const a = analyze(j),
          m = match(j, d.profile, d.preferences, a);
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
          note: old?.data?.note || "",
        };
        data.companyWebsite = old?.data?.companyWebsite || "";
        if (
          researched < 2 &&
          !data.research.some(
            (s) => s.notes && Date.now() - Date.parse(s.checkedAt) < 86400000,
          )
        ) {
          researched++;
          event(
            "RESEARCHING_COMPANY",
            `Reading the company profile for ${j.company}.`,
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
                error:
                  "Company research could not be retrieved. Retry from the job details.",
                checkedAt: now(),
              },
            ];
          }
        }
        const saved = old
          ? checked(
              await db
                .from("jobs")
                .update({ data, updated_at: now() })
                .eq("id", old.id)
                .eq("user_id", uid)
                .select()
                .single(),
            )
          : checked(
              await db
                .from("jobs")
                .insert({ user_id: uid, source_key: j.source_key, data })
                .select()
                .single(),
            );
        checked(
          await db
            .from("job_analysis")
            .upsert(
              { user_id: uid, job_id: saved.id, data: a },
              { onConflict: "user_id,job_id" },
            ),
        );
        checked(
          await db
            .from("job_matches")
            .upsert(
              { user_id: uid, job_id: saved.id, data: m },
              { onConflict: "user_id,job_id" },
            ),
        );
        checked(
          await db
            .from("company_research")
            .upsert(
              {
                user_id: uid,
                job_id: saved.id,
                data: { sources: data.research },
              },
              { onConflict: "user_id,job_id" },
            ),
        );
        if (!old) d.saved++;
      }
      event(
        "SAVING_JOBS",
        "Saved relevant listings and updated existing matches without duplicates.",
      );
    }
  } catch (e) {
    d.errors.push({
      at: now(),
      task,
      message: String(e.message).slice(0, 240),
    });
    event(
      "SEARCHING",
      "This source request failed. Other searches can continue.",
    );
  }
  d.cursor++;
  const done = d.cursor >= d.tasks.length,
    failed = done && d.tasks.length > 0 && d.errors.length >= d.tasks.length;
  const state = failed ? "FAILED" : done ? "COMPLETED" : "SEARCHING";
  if (done)
    event(
      state,
      d.tasks.length
        ? `Search finished: ${d.saved} new jobs saved, ${d.excluded} outside your preferences.`
        : "No enabled remote source. Enable remote search or browse your preferred city on Indeed.",
    );
  const updated = checked(
    await db
      .from("automation_runs")
      .update({ data: d, state, lease_until: "1970-01-01", updated_at: now() })
      .eq("id", id)
      .eq("user_id", uid)
      .neq("state", "PAUSED")
      .select(),
  );
  if (done && updated.length && d.preferences.notifications)
    checked(
      await db
        .from("notifications")
        .insert({
          user_id: uid,
          data: { message: d.events.at(-1).message, runId: id, read: false },
        }),
    );
  return (
    updated[0] ||
    checked(
      await db
        .from("automation_runs")
        .select("*")
        .eq("id", id)
        .eq("user_id", uid)
        .single(),
    )
  );
}
const cache = new Map();
async function cachedSource(key, fn) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < 3600000) return hit.data;
  const data = await fn();
  if (cache.size > 100) cache.delete(cache.keys().next().value);
  cache.set(key, { at: Date.now(), data });
  return data;
}
