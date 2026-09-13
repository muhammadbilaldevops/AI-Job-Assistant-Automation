# 🌈 Applydesk · AI Job Assistant Automation

<p align="center"><strong>Real job discovery · private career profile · tailored documents · user-controlled applications</strong></p>

<p align="center">
  <img src="https://img.shields.io/badge/status-internal%20testing-16a085?style=for-the-badge" alt="Internal testing" />
  <img src="https://img.shields.io/badge/frontend-React%20%2B%20Vite-61dafb?style=for-the-badge" alt="React and Vite" />
  <img src="https://img.shields.io/badge/backend-Vercel%20%2B%20Supabase-3ecf8e?style=for-the-badge" alt="Vercel and Supabase" />
  <img src="https://img.shields.io/badge/automation-Make%20%2B%20Gemini-ff6b35?style=for-the-badge" alt="Make and Gemini" />
</p>

Applydesk is a practical, privacy-first job application workspace. It helps a candidate save career facts once, discover real opportunities, compare each role with preferences, and prepare a tailored resume or cover letter. It is a workbench, not a fictional job board: every listing keeps its source link and the final application stays under the candidate's control.

**Live app:** [ai-job-assistant-automation.vercel.app](https://ai-job-assistant-automation.vercel.app/) 🔥

**Login email:** admin@gmail.com 👀
**password:**    admin123

**Start here if you are new:** [Beginner end-to-end guide](docs/BEGINNER-GUIDE.md)

![Applydesk architecture](docs/architecture-3d.svg)

> 💡 **One-sentence explanation:** Applydesk turns a candidate's saved facts and a real job description into a reviewed, downloadable application package, while keeping the final Indeed application in the user's hands.

## Why this project exists

Job hunting repeats the same work: search several titles and locations, copy a description, rewrite a resume, format a document, and track applications. Paid tools often hide this workflow behind subscriptions. Applydesk brings the useful parts into one free-tier-friendly project while keeping candidate facts private and source websites visible.

## What a user can do

1. Create search profiles with multiple titles, locations, radius and remote preference.
2. Discover real remote listings from the configured public feed and open official Indeed Pakistan searches in a new tab.
3. Save, deduplicate, edit or remove one job, or remove all saved jobs.
4. See transparent match reasons, missing requirements and location/experience checks.
5. Upload a PDF, Word document or text resume. The parser extracts text and maps safe fields into the profile for review.
6. Select a saved job and generate a job-specific resume or optional cover letter using the preserved master prompt and company research.
7. Edit the draft, validate writing rules, save versions, and download a real `.docx` or Markdown file (or print to PDF).
8. Track application status, notes and research, and export or restore a private workspace backup.

## ✨ Feature cards

| 🧭 Discover | 🧠 Understand | 📝 Prepare | 🔒 Control |
| --- | --- | --- | --- |
| Saved titles, cities, radius and remote choices | Explainable match score, strengths and checks | Tailored resume, cover letter, Word and Markdown | Supabase Auth, RLS, private uploads and user review |

### 🧭 Real job discovery

The search form saves repeatable preferences. Public-feed adapters return source listings, then the app normalizes dates, locations and links, filters unsafe destinations, deduplicates by job key and calculates a transparent match. Each card retains the original source URL and attribution.

### 📄 Resume intake and autofill

The upload endpoint accepts PDF, `.docx` and text. `pdfjs-dist` runs without a browser worker in Vercel, `mammoth` reads Word text, and size limits protect the server. Extracted text is converted into suggestions for name, contact, location, field, skills and experience. The user reviews suggestions before they become saved profile facts.

### 🧩 Tailored documents

Selecting a saved job combines the job description, verified profile, bounded company research and the unchanged master prompt. The AI returns structured JSON. Client-side validators reject placeholders, unsupported claims, em dashes, incorrect sections and malformed bullets before a document can be saved or downloaded. The `docx` exporter creates a genuine Word file with consistent typography and an optional second-page break.

### 🌐 Official Indeed handoff

The Indeed button opens the official Pakistan site in a new tab with the user's chosen search. Applydesk does not scrape authenticated pages, store credentials or submit forms automatically. The user can browse and apply manually while the workspace keeps notes and status.

## Boundaries that keep the workflow real

The app does not invent vacancies, scrape Indeed behind a login, store Indeed credentials, or submit applications unattended. **View original & apply** opens the official Indeed URL so the user can sign in and complete the application themselves. Automatic collection uses approved public feeds; Make can run the collector in the background, but it never receives an Indeed password.

## Architecture

The browser is the main workspace. Supabase Auth protects user data and Storage keeps uploads private. Vercel serves the web app and API routes. Make provides optional orchestration: a scheduled worker asks the Supabase edge function to collect listings, while a separate webhook sends a structured writing prompt to Gemini and returns JSON. The client validates, stores and renders the result.

```text
Browser → Vercel client/API → Supabase Auth + Postgres + Storage
                    │                 └→ Edge worker → public job feeds
                    └→ Make webhook → Gemini → validated resume/letter JSON
```

See the [3D architecture diagram](docs/architecture-3d.svg), [Make guide](docs/MAKE-SETUP.md), and [verification runbook](docs/VERIFICATION.md).

### 🔁 Request-by-request implementation

1. **Browser → Vercel:** React sends an authenticated request with the Supabase access token.
2. **Vercel → Supabase:** API handlers validate the session, read/write owner-scoped rows, or accept an upload.
3. **Supabase worker → feeds:** The edge function calls only approved public sources, normalizes records and stores them with source evidence.
4. **Browser → Make:** A document request posts `{ prompt, job, profile, research }` to the private Make webhook.
5. **Make → Gemini:** Make maps `prompt` into the Gemini module and maps the model response into the strict JSON contract.
6. **Make → Vercel → browser:** JSON returns to the API and client, where validation and human review happen before persistence.

## Technology

- Vite, React and modern JavaScript for the responsive single-page interface.
- Supabase Auth, Postgres, Row Level Security and private Storage.
- Vercel for the production build and serverless API surface.
- Make for scheduled discovery and AI-writing orchestration.
- Google Gemini through Make, with local Ollama as an optional development fallback.
- `pdfjs-dist` for workerless server-side PDF extraction, `mammoth` for `.docx`, and `docx` for export.
- Vitest plus project check/build scripts for regression coverage.

## Repository map

Each major folder has its own beginner guide:

| Folder | Purpose |
| --- | --- |
| [`client/`](client/README.md) | UI, routes, state, forms and document screens |
| [`api/`](api/README.md) | Vercel HTTP handlers and safe server-side adapters |
| [`lib/`](lib/README.md) | Parsing, matching, prompts, validation and persistence helpers |
| [`supabase/`](supabase/README.md) | Edge worker, migrations and database integration |
| [`scripts/`](scripts/README.md) | Local checks and operational helpers |
| [`tests/`](tests/README.md) | Unit and workflow tests |
| [`docs/`](docs/README.md) | Product, architecture, Make and release documentation |
| [`dist/`](dist/README.md) | Versioned prompt and distribution assets |

## Run it locally

```bash
npm ci
npm run build
npm run check
npm test
npm start
```

Copy `.env.example` to `.env.local` and add only values for services you enabled. The important production setting is `MAKE_AI_WEBHOOK_URL`; never commit webhook URLs, Supabase service keys, model keys or worker keys. Supabase redirect URLs must include local and Vercel origins. For internal testing, create or auto-confirm a user in Supabase Authentication before signing in.

## Make integration

The project uses two small scenarios. **Applydesk · real job intake** receives approved listing data and returns a normalized response. **Applydesk · background discovery** runs on a schedule and calls the Supabase worker with a private hashed key. The writing scenario receives `{ prompt, job, profile, research }`, calls Gemini, and returns strict JSON containing document text and metadata. The application still performs matching, deduplication, rule validation and persistence. Full module configuration, connection setup and troubleshooting are in [`docs/MAKE-SETUP.md`](docs/MAKE-SETUP.md).

### 🛠️ Make setup in plain steps

1. Create an HTTP webhook in Make and copy its private URL into Vercel as `MAKE_AI_WEBHOOK_URL`.
2. Add the Gemini connection in Make and select the configured flash model.
3. Map the incoming `prompt` field to Gemini. Keep the response format JSON.
4. Map the model's text candidate into the response JSON fields expected by the API.
5. Activate the writing scenario and send one test job from the Documents screen.
6. Create the scheduled discovery scenario. Its HTTP module calls the Supabase `job-worker` URL with the hashed worker key.
7. Run the scenario once, confirm a successful execution, then choose the schedule (six-hour internal default).
8. Read Make execution history when debugging. A Make failure must show an actionable message and must never delete the saved job or profile.

Make is an orchestrator, not the database and not the match engine. This keeps the system portable: the UI and validation still work when the webhook is temporarily unavailable.

## 🗃️ Database and security

Supabase Postgres stores users' profiles, saved searches, jobs, documents, research, statuses and notes. Every durable table has an owner relationship and Row Level Security policies limit reads and writes to the authenticated owner. Uploaded resumes live in private Storage. The browser receives public configuration only; service-role keys, worker secrets and webhook URLs stay in server or Vercel settings.

## 🔌 API responsibilities

The Vercel API is intentionally small. It authenticates requests, parses PDF/Word/text uploads, calls the Make writing adapter, reads bounded company pages and exposes health-safe responses. Normalization, matching, prompt assembly, validation and DOCX generation are shared library functions, so the same rules run in tests and production. See [`api/README.md`](api/README.md) and [`lib/README.md`](lib/README.md).

## Prompt and document quality

The original master prompt is preserved byte-for-byte at [`dist/prompts/master-resume.txt`](dist/prompts/master-resume.txt) and verified by [`docs/master-prompt.sha256`](docs/master-prompt.sha256). Generated drafts are checked for placeholders, forbidden em dashes, section rules and bullet format before export. A second-page resume wrapper is available, but no tool can honestly promise a 100% ATS score or a job offer; the candidate reviews every fact before applying.

## Deployment

The `main` branch is linked to Vercel and the GitHub repository. A normal push builds and deploys the app. Configure Supabase and Make secrets in Vercel Environment Variables, then verify the production origin, auth redirect and API health. The deployment guide and release checklist are in [`docs/RELEASE-0.3.md`](docs/RELEASE-0.3.md).

## Roadmap

Next improvements are provider-agnostic email delivery, richer approved feeds, background notifications, stronger observability and optional paid team plans. The core privacy model and user-controlled Indeed handoff should remain unchanged.

## License and responsible use

This repository is a personal software-house project. Use it only with accounts and data you are authorized to use, follow each job site's terms, and review generated documents before sending them.
