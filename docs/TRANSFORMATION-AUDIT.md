# Applydesk transformation audit and architecture

Current implementation and remaining work: [v0.3 release guide](RELEASE-0.3.md).

Reviewed 13 September 2026 against the user's 42-section master project instruction. This document supersedes the manual-first direction of PRODUCT-PLAN.md.

## What was wrong

The deployed v0.2 was a manual workspace. Users supplied jobs, company research and externally generated drafts. The optional board collector required employer tokens. A Make webhook merely echoed a batch. There was no account, resume ingestion, durable search pipeline or automatic company research. This did not meet the intended product.

## Keep / rebuild / add

| Area | Decision | Reason |
| --- | --- | --- |
| Exact original resume prompt and checksum | Keep | User's authoritative writing requirements, preserved byte for byte |
| DOCX exporter, CV wrapper, print stylesheet | Keep and strengthen | Genuine editable Word output already works; page count remains layout-dependent |
| Job URL normalization, source readers, SSRF protection | Keep | Tested useful foundations |
| Match heuristic | Rebuild | Hardcoded seniority and narrow rules; missing evidence and uncertain eligibility |
| Dashboard and navigation | Rebuild | Begin with onboarding and search, not manual input |
| Profile | Rebuild | Structured reusable candidate facts and uploaded originals |
| Research | Rebuild | Agent retrieves sources and records citations, freshness and uncertainty |
| Generation | Rebuild | Server loads job, profile and evidence; one action generates, validates and saves |
| Make scenario | Rebuild incrementally | Orchestrate actual processing and scheduled runs, not echo data |
| Auth, owner isolation, private storage | Add | Supabase, free project explicitly authorized |
| Job-source adapter catalog | Add | Working public APIs selected by preferences, without board-token setup |
| Persistent runs, pause, retry, activity | Add | Real stored state and bounded work, not animated fake progress |
| Document library and revisions | Add | Originals, generated text and immutable previous versions |
| Notifications and cost controls | Add | In-app, opt out, bounded daily work, no automatic paid fallback |

## Architecture decision

Evolve the current ESM/Node project in stages. Keep the small Vercel frontend and tested utilities; split the new interface, agent logic, persistence, sources and model provider into modules. A framework rewrite is not needed to deliver automation. Supabase provides Auth, PostgreSQL and private resume storage. API handlers authenticate each request, use the user's identity for row-level security, and never expose a privileged database key. Make wakes bounded worker steps and can provide AI through an authorized connection. Local Ollama remains an optional provider. A connected Codex plugin is a development integration, not automatically an app-runtime model subscription.

Browser -> authenticated API -> persisted run -> discovery adapter -> deterministic normalization/analysis -> evidence-based matching -> save real jobs -> company research -> selected-job generation -> structural and factual checks -> document version -> user review/download. Final applications remain on the employer's site.

## Data model

`user_profiles`: owner, structured profile, preferences, confirmed facts, revision.
`jobs`: owner, source URL identity, original text and structured metadata, timestamps, application state.
`company_research`: owner, job/company identity, source URL, excerpt, retrieval timestamp, confidence and failure reason.
`job_analysis` and `job_matches`: owner/job, extracted requirements, evidence, strengths/gaps, score version and profile revision.
`resumes`: owner, private storage path, extracted text, parsing state, original filename/type.
`generated_documents`: owner/job, kind, text, profile/job snapshot, validator result and parent version.
`automation_runs`: owner, kind, state, cursor, counters, bounded error log, attempts, lease and timestamps.
`notifications`: owner, run, message, unread state. No email until the user explicitly enables it.

Every exposed table has owner RLS and indexes; each update has both USING and WITH CHECK. Private files use an owner-prefixed path. Unique owner/source URL prevents duplicates. Durable run identity and a lease prevent parallel duplicate processing. Failed source calls are recorded independently so successful sources remain useful. Profile changes invalidate old match/document confidence rather than silently changing saved documents.

## User journey

1. Open a clear welcome screen; create account or explore local mode.
2. Upload an existing DOCX/text PDF, complete simple starter questions, or skip to preferences. Confirm extracted facts before use.
3. Choose titles, cities, remote country, career level and minimum score. Defaults support Islamabad/Rawalpindi and Pakistan-eligible remote roles.
4. Start search. Show real source progress, counts and actionable errors. Pause stops new work; already completed work is retained.
5. Saved Jobs shows recommendations and a separate needs-review group. Missing country eligibility is never treated as worldwide acceptance.
6. Open a job for its description, requirements, evidence and company context. Resume and cover letter are separate one-click actions.
7. Review/edit, retain revisions, download Word or print PDF. No guarantee of 100% ATS acceptance or a universal two-page rendering.

## Source and cost decisions

- Himalayas explicitly permits job-search experiences and AI automation using its public API. Preserve attribution and its original job links. Cache requests, observe 429 responses, limit pages and do not syndicate its listings elsewhere. https://himalayas.app/api
- Greenhouse and Lever expose public job-board GET APIs. Keep source attribution and do not submit applications. https://developers.greenhouse.io/job-board.html and https://github.com/lever/postings-api
- Indeed prohibits unofficial automated Apply and restricts bot access. Keep user browsing and final applications; do not capture Indeed cookies or claim persistent authorization the app does not possess. https://www.indeed.com/legal
- Supabase project creation returned $0/month and was authorized in the user's existing organization. No paid upgrades.
- Make and AI providers have finite quotas. Do not assume unlimited free models, web search or credits. Cap work, cache repeated inputs and surface quota failures. No paid fallback.

## API and agent boundaries

- Session/config endpoints: expose public configuration, authenticated session lifecycle.
- Profile endpoint: validate and save confirmed reusable facts/preferences.
- Resume ingest: bounded file parsing, original private storage, editable confirmation.
- Search start/step/pause/status: one owner, idempotent persisted cursor and activity.
- Source adapter: search(preferences, cursor) returns real normalized jobs and next cursor.
- Analysis: explicit structured requirements and quoted evidence. AI enrichment optional and labelled separately from deterministic extraction.
- Company research: source retrieval, identity check, citations, freshness cache; unverified claims never silently accepted.
- Generate: load owned job/profile/research, apply exact preset, validate, bounded repair, save version.
- Documents: read/edit/duplicate/delete/download owned versions.
- Make worker: authenticated wake-up, no profile in public webhook URLs; worker rechecks ownership and pause before writes.

## Incremental delivery and acceptance

Audit and architecture -> profile/auth -> real discovery -> persistent processing -> generation -> dashboard -> integration tests and deployment. Each phase must have functioning behavior before it is described as complete. Test a new user, persistence, tenant isolation, no-resume path, actual public feeds, deduplication, remote restrictions, pause/resume, failed source recovery, selected-job generation, original-prompt preservation, unsafe output rejection and document exports. Test fixtures belong only in automated tests; public screens begin empty.

## Explicit boundaries

The new master asks for a large product. Configured services, executable adapters and tested live behavior must be reported separately. A provider awaiting credentials is not working AI. An unscheduled worker is not background automation. A formatted draft is not proven truthful, and a local workspace is not multi-user authentication. Future SaaS billing, broader sources and unattended browser work follow only after this core is verified.
