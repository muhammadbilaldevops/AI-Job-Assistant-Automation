# Applydesk beginner guide: from first install to a reviewed application

This guide explains the complete system in plain language. You can read it without knowing React, databases or automation. Each section tells you what happens, why it exists and where to look in the repository.

## 1. The complete journey

1. Open the app and sign in with a Supabase Auth account. Authentication creates a private user session; every later request carries that session.
2. Open **Your story** and upload a PDF, Word document or text resume. The API extracts readable text, safely recognizes common fields, and puts suggestions into the form. You review and correct them before saving.
3. Open **Job search**. Add titles such as DevOps Intern, Cloud Intern or AI Engineer Intern, choose cities and radius, and decide whether remote work is allowed. Preferences are saved so the next search is repeatable.
4. Run discovery. Approved public feeds return real listings. The app normalizes titles, dates, locations and source URLs, removes duplicates, and calculates visible match reasons.
5. For Indeed Pakistan, choose **Browse Indeed with my preferences** or **View original & apply**. A new tab opens the official Indeed page. You sign in there yourself and submit applications yourself. Applydesk never stores Indeed credentials or clicks an authenticated application form.
6. Save a listing. The saved job keeps the original URL, source, dates, match details, notes and application status. You may edit it, remove one job, or remove all saved jobs.
7. Select a saved job in **Documents**. Company research is fetched only from bounded public URLs. The job, verified profile facts, research and the complete preserved master prompt are assembled into a structured writing request.
8. The request goes to the configured Make webhook. Make calls Gemini and returns strict JSON. If no hosted provider is configured, the local Ollama adapter can be used during development.
9. The client validates the result: no unresolved placeholders, no em dashes, correct sections, truthful facts and the required experience-bullet format. You can edit the draft and save versions.
10. Download a Word document or Markdown file, or print the Word preview to PDF. Review every claim, then use the official source link to apply.

## 2. What each technology does

### React and Vite (`client/`)

React renders the screens as reusable components. State holds the current profile, search form, selected job and draft. Vite serves the fast development server and creates the production browser bundle. The client should remain a presentation and interaction layer; business rules live in `lib/` so they are testable.

### Vercel (`api/`, deployment)

Vercel hosts the static client and runs small serverless handlers. Handlers receive HTTP requests, check the Supabase session, parse files or forward an approved AI request, and return JSON. Environment variables are configured in Vercel, never committed. A push to `main` creates a production deployment through the repository connection.

### Supabase (`supabase/`)

Supabase Auth handles sign-up, confirmation and sign-in. Postgres stores profiles, searches, jobs, documents, research and statuses. Row Level Security makes the database enforce `owner_id = authenticated user`; this is the privacy barrier even if a client request is modified. Private Storage holds uploaded resumes. The edge worker performs server-side discovery for the scheduled Make scenario.

### Make

Make is the visual orchestration layer. The background scenario runs on a schedule, sends a private hashed worker key to the Supabase edge function and lets the worker collect approved feeds. The writing scenario receives one JSON request, calls Gemini, maps the response to the expected fields and returns JSON to Vercel. Make does not decide whether a job matches and does not persist candidate data; the application remains the source of truth.

### Gemini and Ollama

Gemini is the hosted writing model reached through Make. The prompt asks for structured output rather than free-form chat. Ollama is an optional local model path for development when a private, offline draft is preferred. Neither provider is allowed to invent candidate facts; validation and human review remain mandatory.

### PDF, Word and document tooling

`pdfjs-dist` extracts PDF text without requiring a browser worker in the serverless runtime. `mammoth` extracts readable text from `.docx` files while archive-size limits protect the endpoint. The `docx` package builds a real Word document with headings, font sizes, bullets and a true page break for the two-page wrapper. Markdown remains available as a transparent, editable fallback.

## 3. How the data moves

```text
Sign in → Supabase session → client request with access token
Upload → Vercel parser → normalized profile suggestions → Supabase row
Search → public feed/API → normalize + match + dedupe → saved_jobs
Write → client prompt → Make webhook → Gemini → JSON → validate → document_versions
Apply → official Indeed/source URL opens in a new tab → user completes final steps
```

The client owns the interaction. Supabase owns private durable data. Vercel is the controlled server boundary. Make is an optional transport and scheduler. This separation makes failures visible: a feed error cannot silently become an invented job, and a writing error cannot overwrite the saved profile.

## 4. First local setup

Install Node.js, open the repository, then run:

```bash
npm ci
Copy-Item .env.example .env.local
npm run build
npm run check
npm test
npm start
```

Open the printed local URL. In Supabase, add that URL and the Vercel URL under Authentication → URL Configuration. Create or auto-confirm a test user in Authentication → Users. Use only test data while developing. Never put a service-role key, Make webhook URL, Gemini key or worker key in source control.

## 5. Configure services in the right order

1. Create the Supabase project and apply the migrations in `supabase/migrations`. Confirm RLS policies and the private storage bucket.
2. Deploy the `job-worker` edge function and set its private worker secret.
3. In Make, create or connect the HTTP and Gemini connections. Build the writing webhook and background discovery scenarios described in `docs/MAKE-SETUP.md`.
4. Put only the Make webhook URL in Vercel as `MAKE_AI_WEBHOOK_URL`; redeploy after changing it.
5. Test one profile, one public listing and one writing request. Check the Make execution history and the Vercel function log if a response fails.

## 6. Understanding the important folders

- `client/`: routes, controls, panels and user-facing error messages.
- `api/`: authenticated HTTP endpoints and upload/AI adapters.
- `lib/`: pure parsing, matching, prompt and export rules.
- `supabase/`: schema, RLS and scheduled worker code.
- `scripts/`: build and consistency checks.
- `tests/`: regression tests for edge cases and complete flows.
- `dist/prompts/`: the source master prompt used by every resume draft.
- `docs/`: operating guides, release notes, architecture and product decisions.

Each folder has a short local README. Start with the file that matches the area you are changing, then read the related tests before editing a rule.

## 7. Common problems and fixes

**Blank page:** run `npm run build`, inspect the browser console, and confirm the deployed build has the same commit as GitHub. A blank page usually means a bundle/runtime error, not a missing job.

**Email rate limit or confirmation loop:** wait for the provider limit to reset, use one confirmed test user, and verify redirect URLs. Do not hard-code a password in the application.

**PDF worker error:** the server uses workerless `pdfjs-dist` configuration and includes the worker asset for Vercel. Reinstall dependencies and redeploy if `node_modules` was copied from an old build.

**AI not connected:** confirm `MAKE_AI_WEBHOOK_URL`, the Make scenario is active, and the webhook returns the documented JSON shape. The saved job and profile remain safe when writing is unavailable.

**Empty profile after upload:** extraction success means text was read, not that every field can be identified. Review the extracted text, use clear headings in the source resume, and correct the suggestions before saving.

**Indeed results missing:** Indeed is intentionally opened as the official website. Use the public-feed collector for automatic discovery and use the Indeed button for manual browsing and applying.

## 8. Safe change and release checklist

Before pushing a change, run `npm run check`, `npm test`, `npm run build` and `git diff --check`. Test both an empty state and a populated state. Verify that an unauthenticated request cannot read another user's row, that source URLs remain intact, and that generated documents contain no placeholders or invented facts. Push to `main`, wait for Vercel to finish, then repeat one browser journey from sign-in through download.

## 9. What can be extended later

New approved job feeds can implement the feed adapter contract. New AI providers can implement the writing adapter without changing the UI. A paid SaaS edition can add teams, billing, quotas and notifications while preserving RLS, private uploads, source attribution and the user-controlled Indeed handoff.

The project is complete for internal testing when the checks pass and the user can perform the journey above. Production readiness additionally requires a verified email provider, monitored limits, a privacy policy, backups and a final review of every external site's terms.
