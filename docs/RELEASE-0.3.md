# Applydesk v0.3 · 13 September 2026

This guide supersedes the v0.2 README, USER-GUIDE, MAKE-SETUP and VERIFICATION descriptions. The transformation audit remains the architectural plan.

## Current experience

1. Sign in, upload a PDF/DOCX/text resume, enter a starter profile, or skip to preferences.
2. Save preferred titles, country, experience limit and remote-work preferences.
3. Start a search. A separate background worker retrieves real Himalayas listings, extracts requirements, evaluates eligibility, deduplicates results and saves company-profile sources.
4. Review recommended jobs and uncertain matches with reasons, source links and timestamps. Apply on the original site yourself.
5. Select a saved job for a tailored resume or optional cover letter. **Hosted AI writing is awaiting a Gemini connection in Make.** The interface reports this limitation rather than generating placeholder documents.

Accounts, profiles, search runs, jobs and document versions live in Supabase with owner-based access policies. Uploaded originals are in a private bucket. Make checks unfinished work every six hours and starts searches for users who enable daily discovery. Immediate searches do not wait for this schedule. A current step can finish after Pause; disable daily discovery separately to stop future runs.

## Boundaries and remaining work

- Automatic discovery uses the [Himalayas public API](https://himalayas.app/api). This remote source does not supply Islamabad/Rawalpindi on-site jobs. Indeed links support manual browsing; there is no Indeed account connection, cookie capture, scraping or automatic application submission.
- Matching is rule-based, with visible evidence. Unknown country eligibility stays marked for review. Scores do not predict hiring outcomes.
- Research uses [Himalayas MCP](https://himalayas.app/mcp), with bounded official-page retrieval for selected jobs. Sources are retrieved evidence, not independently verified claims. Search steps perform at most two company lookups; remaining jobs can be researched when selected.
- The original resume prompt remains unchanged in `dist/prompts/master-resume.txt`, checksum verified. Generation loads it with confirmed candidate facts and sources. Structural validation, a bounded repair attempt, version saving, genuine Word export and browser PDF printing are implemented. Live model output is not yet verified.
- A full-resume wrapper supplies a page break; long content still needs layout review. There is no 100% ATS or universal two-page guarantee.
- Public signup email delivery needs SMTP configuration and testing. Password recovery, OCR, additional job sources, billing, administration and larger-scale queues remain future work. This is a personal/portfolio release, not a finished commercial SaaS.
- API search starts are limited to four per day, writing attempts to four per UTC day in the database, and scheduled sweeps to three runs and twenty opted-in profiles. Search limits are not hardened commercial quotas. No paid fallback or plan upgrade is enabled.

## Make status

The official plugin is connected. Old batch-echo scenario 7386585 is inactive. **Applydesk · background job search** (7390506) is active every six hours. Its authenticated worker request passed actual Make execution `73e126757286432bb543a1608f24d65e`. A private header key is hashed in a service-only table. Never publish that key or an unredacted scenario export.

Writing scenario 7390278 is inactive. The built-in AI test failed because its model connection was unavailable. A native Gemini connection request is pending with the owner. After connection, resolve an available free model, test the exact resume and cover-letter flows, and only then set the private `MAKE_AI_WEBHOOK_URL` on Vercel. Input is JSON containing `prompt`; output must be JSON containing `text`. Do not paste keys into chat or GitHub. A Codex/ChatGPT subscription does not provide this app with a runtime model API.

## Verification

- Browser sign-in with isolated confirmed QA accounts, onboarding without a resume, preference saving, real search progress and completion passed.
- An actual eight-step search read 18 real source records and saved 14 distinct relevant/review-needed jobs with no source errors. These were isolated test-account results, not public seed data.
- Company profiles and source timestamps were saved automatically.
- Cross-user reads/updates returned no rows; foreign-job document references failed; worker configuration was inaccessible to ordinary users.
- A test DOCX was parsed and stored privately. Another user could not download it. The original was removed afterward. Unauthenticated API and invalid worker-key requests were rejected.
- Automated tests cover normalization, source uncertainty, eligibility, duplicate handling, archive expansion limits, prompt preservation, structural validation, Word packaging and source-reader protections.
- Not yet verified: live model writing, real candidate document pagination, production signup delivery, PDF parsing against a user resume, long-term scheduling and load.
- Database advisor: the no-policy notice for `worker_configuration` is intentional. Leaked-password protection is disabled; review [Supabase password security](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) before wider release. No upgrade was enabled to clear that notice.

## Run and deploy

Use Node.js 22 or later:

```sh
npm ci
npm run build
npm run check
npm test
npm start
```

Local address: http://127.0.0.1:4173. Copy `.env.example` to `.env` only for optional server-side providers. `OLLAMA_MODEL` may name an already installed model for local use. Keep all private endpoints out of public source.

Vercel hosts `dist` and `/api/agent`. Supabase runs the separate search worker. The public project URL and publishable key in `dist/config.js` are intended for browser use; owner policies protect data. Privileged keys are never frontend configuration. Apply the migrations and redeploy the worker when installing into another project. Its gateway JWT check is disabled because its body validates user JWTs or the scheduler key itself.

The old static-only Netlify configuration cannot run this cloud workflow. The opt-in `scripts/cloud-smoke.mjs` requires disposable accounts and `QA_PASSWORD`; never use real user credentials for it.

## Implementation map

| Component | Location |
| --- | --- |
| Workspace and onboarding | `client/workspace.js`, `dist/workspace.css` |
| Authenticated API and uploads | `api/agent.js`, `lib/upload.mjs` |
| Discovery, analysis and matching | `lib/discovery.mjs` |
| Persistent search steps | `lib/pipeline.mjs` |
| Company sources and writing | `lib/company.mjs`, `lib/writing.mjs` |
| Worker and owner policies | `supabase/functions`, `supabase/migrations` |
| Original preset and export | `dist/prompts`, `dist/core.js`, `dist/documents.js`, `dist/export.js` |
