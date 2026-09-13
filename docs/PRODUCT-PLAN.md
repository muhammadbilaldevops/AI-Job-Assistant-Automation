# AI Job Application Assistant using Make

## 1. The decision

Build a private application assistant around real vacancies, with **Indeed Pakistan as the primary human-operated job source**: https://pk.indeed.com/. The product is not a replacement job board. It starts empty, saves actual job descriptions and links, keeps candidate facts once, prepares company-specific resume sections and cover letters, formats them, and tracks what happened after applying.

The recommended first release automates preparation and organization. Keep the final application submission under the applicant's control. Add automatic collection only through a source and access method that permit it. Do not market browser automation as safe merely because it imitates a person's clicks. Indeed's published rules cover automated access and submissions, including agentic tools, unless permitted by Indeed. Its terms also describe possible permitted AI connectors; their existence does not establish availability or authorization for this account. [Indeed terms](https://www.indeed.com/legal)

The strict zero-additional-subscription version cannot simultaneously promise unlimited premium AI, reliable independent web research, always-on browser operation, every latest Indeed job, and production SaaS uptime. The realistic tradeoff is local ownership, limited optional cloud services, and a manual AI handoff or local model. The objective is to remove repeated profile entry, prompt construction, formatting and tracking first, then expand automation with evidence that it saves time.

This plan and repository are the first implementation, not a claim that every later phase is already complete. Research was performed on 12-13 September 2026. Prices and availability must be checked again before enabling a paid or usage-based service.

## 2. What the user actually does

The intended daily loop is:

1. Open the assistant and see pending applications and saved searches.
2. Open one real Indeed Pakistan search, starting with the highest-priority role family.
3. Select the real location and radius controls on Indeed and sort by newest where available.
4. Read promising listings, checking location, experience and eligibility before preparing documents.
5. Save the actual source link, full job description, title, employer and known dates.
6. Let the assistant deduplicate and rank saved records. Review the explanations rather than trusting a single score.
7. Open the strongest listing, research the exact employer, and save current source notes.
8. Generate a tailored resume using the complete original preset and verified candidate facts.
9. Generate a cover letter separately if the application benefits from one.
10. Review facts, wording, format, missing requirements and document preview.
11. Export Word or PDF without recreating the layout manually.
12. Open the original listing, complete its real application, and review all answers and attachments.
13. Submit personally. Only then mark the record Applied and retain the exact document version used.
14. Record replies, interview dates and follow-up decisions. Measure outcomes weekly.

The primary source remains Indeed Pakistan. Employer career pages and documented public employer feeds are supplementary ways to verify or discover actual openings, not fictional replacements for Indeed.

## 3. Search design for Islamabad, Rawalpindi and remote work

Use separate searches. A giant query containing every title makes it harder to understand which terms are productive and can exclude useful alternatives.

| Family | Primary titles | Expansion titles to test later |
|---|---|---|
| DevOps | DevOps Intern, Associate DevOps Engineer, Junior DevOps Engineer | DevOps Trainee, Graduate DevOps Engineer, Platform Intern, SRE Intern |
| Cloud | Cloud Intern, Associate Cloud Engineer, Graduate Cloud Engineer | Cloud Support Associate, Cloud Operations Intern, Infrastructure Trainee |
| AI | AI Engineer Intern, Associate AI Engineer, Artificial Intelligence Intern | Graduate AI Engineer, AI Developer Intern, Generative AI Intern |
| ML | Machine Learning Intern, MLOps Intern | Junior ML Engineer, AI/ML Intern, ML Engineering Trainee |

For every primary title, run Islamabad, Rawalpindi and Remote searches separately. Start with the titles that best match actual candidate evidence; a preference for a field is not evidence of proficiency in it. The current app starts with 11 title presets across three locations. Users can add, edit, pause and remove each saved search, including a 0–100 km radius. Separate editable acceptance rules control target role families, office cities, country for remote work, experience requirements and whether remote work is included. Changes persist in the browser and in backups.

Use a discovery radius of at most 100 km in the real job-board UI. Treat this separately from willingness to commute. A 100 km circle may contain places outside Islamabad and Rawalpindi. Default acceptance is those two cities; nearby places need explicit review. Do not claim that an unverified URL parameter implements an exact kilometer radius. Hybrid roles have an office location and should be checked like on-site roles.

For remote jobs, store an explicit eligibility state:

- Pakistan accepted.
- Worldwide accepted, with employment/contractor and work-authorization details still checked.
- Restricted to a different country or region.
- Unknown, requiring review.

Check time-zone overlap, night shifts, employment versus contractor status, payment currency, stated compensation, internship pay, required equipment, travel and any residency requirement. "Remote" is a work arrangement, not proof that a company can hire someone in Pakistan.

Intern, trainee, graduate, junior and associate are useful discovery terms. Associate does not always mean no experience. Read actual minimum years and responsibilities. Exclude clear senior, lead, principal and management roles from the daily shortlist unless the user deliberately chooses to inspect them. Keep suitable 1-2-year roles as stretch opportunities when the candidate's real projects or prior work are relevant; never manufacture employment years to qualify.

Prefer a daily check of recent results, with a weekly wider search to recover missed or delayed postings. Store `postedAt`, `firstSeenAt`, `lastSeenAt` and `deadline` separately. Missing publication date stays unknown. An updated listing is not necessarily a newly published job. No source can guarantee that every fresh vacancy will be captured.

## 4. Collection, duplicates and freshness

Start with a manual Save Job form and batch JSON intake. Required data should include title, company, full description, original URL and source. Keep compensation and experience requirements optional when the listing does not provide them.

The implementation supports real input and documented Greenhouse/Lever feed adapters through the local server and the Vercel API. Users can save up to five employer feeds. Optional collection checks them on app opening and hourly while the browser remains active, saves eligible roles and reports unclear eligibility and source failures separately. It does not retrieve an Indeed description merely from a link. Copying a URL alone cannot give a static browser app permission or technical access to a cross-origin page. The user should be told this directly, rather than shown a fake Connected state.

Use the site's stable job ID when available. For Indeed, `jk` is retained in a normalized source URL and unrelated tracking parameters are removed. For employer websites, preserve the canonical job URL. Do not merge two jobs just because titles match. Different locations or requisition IDs may represent different vacancies.

A repeated import should refresh observation time and changes while preserving status, notes and documents. A changed description invalidates prior fact review. In the shared product, retain a content hash and immutable description revisions, show a diff, and warn if the employer's requirements changed after tailoring.

When a feed fails, show the failed source and last successful check. "No jobs found" must mean a successful empty search, not a hidden permission error. Closed jobs should be archived or labeled expired, not silently deleted. Only permitted sources should be rechecked automatically. Check the original live listing before applying.

For email intake later, prefer an explicit job-alert label and narrow read scope. Process alerts already delivered to the user's mailbox, minimize retained sender and recipient data, and distinguish alert snippets from complete job descriptions. Verify any resulting collection method against the source's terms. Do not grant an AI agent access to the entire mailbox merely to find job alerts.

## 5. Matching that can be explained

Apply hard eligibility decisions before using ranking. An expired deadline, a known incompatible office location, or a remote country restriction should not be overcome by a high keyword score. Unknown information belongs in a review queue.

The first implementation uses a transparent 100-point heuristic:

| Component | Maximum | Evidence |
|---|---:|---|
| Role family | 25 | Title contains a target DevOps, cloud or AI/ML family |
| Entry-level title | 20 | Internship, trainee, graduate, junior or associate wording |
| Location fit | 25 | Preferred city or manually recorded remote eligibility |
| Verified skill overlap | 20 | Up to five literal matching profile skill terms |
| Freshness | 10 | Known publication date within seven days |

These components total 100. Eligibility is a separate decision: an excluded job can still have matching skill terms, but it must not be treated as recommended merely because of its priority score.

This is not an employer's ATS score, a likelihood of interview, or proof of qualification. Current skill matching is lexical and does not infer proficiency or semantic equivalence. Add a controlled alias vocabulary later, for example CI/CD and continuous integration, then test false positives. Distinguish required from preferred tools and identify actual gaps. Never put a missing keyword into the candidate's skills just to improve the score.

A later match record should show: strongest reasons to apply, hard blockers, missing information, required skills with supporting evidence, preferred skills, degree/experience restrictions, and a confidence level. Review ten ranked jobs each week and adjust the heuristic using observed usefulness, not invented accuracy numbers.

## 6. Candidate facts and personalization

The canonical profile is the source of truth. A resume upload is optional, because this product must work for future users, not only its creator. Start with structured text entry. Add PDF/DOCX extraction later with a mandatory candidate confirmation step before imported content becomes trusted facts.

Store contact details, public professional links, education, verified certifications, skills and proficiency, exact employment titles and dates, real projects, responsibilities, evidence URLs, and practical preferences. Keep salary expectations, availability and authorization answers separate from public resume content. Do not request identity documents, passwords or unnecessary sensitive information.

In a later evidence model, every generated claim links to a fact ID. Facts have type, source, date, candidate verification and visibility. A metric such as a deployment-time reduction must link to a real measurement. An employer's requirement is never promoted into candidate evidence.

Save writing preferences per user: simple English, short-to-medium sentences, no em dashes, no exaggerated claims, and an editable banned-phrases list. Let users save preferred revisions as examples, but never silently change the original preset. A new user's default need not contain this creator's personal employment history or preferences.

The current profile preference text is passed to generation. It does not dynamically reprogram the scoring rules; that belongs in a future typed preferences screen with clearly defined behavior.

## 7. Exact master prompt preservation and conflict handling

The attached master prompt is copied byte-for-byte into `dist/prompts/master-resume.txt`, with a SHA-256 integrity check. It is not summarized, shortened or replaced. The generation prompt begins with the original content, then appends candidate data, job data, research and explicit truth/source guardrails.

| Master section | Required behavior | Implementation and verification |
|---|---|---|
| 1. Professional summary | Exactly two paragraphs; company research; business priorities and 2-4 relevant pain points; contribution-focused second paragraph | Prompt retained; paragraph count checked; relevance and support need fact review |
| 2. Formatting | Exact heading; 10 pt body; 11 pt emphasis; company bold only; designated statements bold italic | Preview, Word and print styling; structural checks for opening emphasis |
| 3. Technical skills | Only 5-6 relevant categories; bold category labels; accurate tools | Category count and bullet pattern checked; factual competence reviewed |
| 4. Experience | One relevant entry, at most five `▸` bullets, realistic action wording | One header and 1-5 bullet checks; official title, employer and dates retained |
| 5. Job analysis | Internally identify top requirements, responsibilities, tools, soft skills, pain points, hiring priorities and ATS terms | Full instruction retained; analysis stays outside final resume |
| 6. Research | Reliable current sources; conservative treatment of unverifiable facts | Source notebook and recency gate; independent browsing is not falsely claimed |
| 7. Job-specific language | Natural relevant keywords without stuffing | Prompt rule; human quality review; future evidence-linked keyword analysis |
| 8. Writing style | Simple natural professional English; no fake achievements, jargon or repetition | Preset plus phrase warnings and separate editorial review |
| 9. Truthfulness | No fabricated companies, degrees, certificates, years, tools, seniority, projects or numbers | Verified profile; missing facts block or remain draft placeholders; final export rejects placeholders |
| 10. Final output | Only summary, skills and experience; no explanations, cover letter or conclusion | Heading/order checks; cover letter uses a different generation flow |
| 11. Logic | Company → business → priorities → challenges; role → actions → value | Prompt preserved; semantic logic requires review, not regex alone |
| 12. Input | Real title, company and full description | Required job inputs supplied with the canonical profile |

There are three important edge cases. First, "use a relevant job title" cannot justify changing a real employment title into a position the person never held. Keep the official title and tailor responsibilities; put the target title in the summary. Second, the preset assumes prior experience. If a future user has none, ask for truthful information or offer an explicitly different Projects preset rather than inventing an employer. Third, the exact "After researching" opening requires actual research. If no reliable company facts are available, leave generation pending or obtain the user's choice of a clearly different conservative preset. Do not assert research that did not happen.

The extra guardrails make these truthfulness priorities explicit while preserving every original instruction. They are visible in generated prompts. The app's checks cover structural rules, not complete semantic compliance. A checkbox and regular expressions cannot prove that an AI output is true.

## 8. Company research and drafting pipeline

Use the exact employer identity from the listing. Confirm the domain, industry and country to avoid researching a similarly named business. Prefer official products/services, about and careers pages; use current reports and press releases where relevant. A company's own public information and a full job description are stronger grounding than a job-board summary alone.

Each research record needs URL, page title, checked date, concise factual notes, the relevant role requirement, and a distinction between fact and inference. For example, a job mentioning monitoring supports a contribution around identifying service issues; it does not prove that the company's systems are unreliable. Do not invent hidden internal pain points.

The current app uses user-verified notes and considers at least one source checked within 30 days sufficient to unlock prompt generation. This is a workflow gate, not independent verification. Recheck fast-changing company announcements and every job's active status sooner. Keep source citations in the research panel, separate from the resume because the preset requires only the three output sections.

Future automatic research should use an explicit search provider or a permitted retrieval worker. Cache the company dossier, record retrieval status, restrict fetch size and time, reject private-network destinations, revalidate redirects and treat page text as untrusted data. A local language model alone does not browse the internet. Do not describe a search-link button as automatic company research.

Generation stages should be: validate inputs, collect research, analyze requirements privately, map supported facts, draft, check structure, check claims, revise within a bounded retry count, preview, user review, save version, export. A stalled or failed stage should show its status. The user should be able to edit before retrying, so the workflow does not consume credits in an endless correction loop.

## 9. Resume formatting and cover letters

Default resume output exactly matches the supplied sections-only preset. A separate full-resume export mode adds the candidate's existing name/contact, education and projects without silently changing the preset. Early-career applicants often need these sections; omitting them from a complete resume just because the tailoring prompt omits them would be a product mistake.

Use an A4, one-column, text-based document with Arial, 10 pt body and 11 pt emphasized runs. Keep headings consistent, links readable, bullets selectable, and avoid text boxes, decorative charts, proficiency bars or images carrying important text. Do not promise compatibility with every ATS. Confirm that the text extracts in reading order and that bold/italic emphasis survives export.

The implementation has a real `.docx` exporter using an OOXML ZIP package, a Markdown draft download, and browser print/Save as PDF. Browser PDF requires choosing the destination once; it is not an unattended server PDF service. Check page breaks, overflow, contact line and headings in the actual print preview. Do not shrink fonts indefinitely to force a single page. Later add server PDF rendering only after hosting limits and cost are measured.

Cover letters have their own prompt: 180-250 words as a starting preference, 3-4 short paragraphs, a verified company connection, one or two supported examples, simple English, and a short close. No em dashes, invented hiring-manager names, guarantees, fake excitement, or repetition of every resume bullet. If no recipient is known, use a neutral hiring-team greeting. Keep tone and length editable per user. Do not call an AI detector a measure of writing quality.

Keep immutable versions with job description, preset version, profile snapshot, research snapshot, output and timestamp. The current app captures those snapshots on Save draft version. Associate the final submitted version with the application in the next release, and preserve historical evidence even when the profile later changes.

## 10. Make, ChatGPT, local AI and browser control

These are different systems with different access:

| Component | Its job | What it does not automatically supply |
|---|---|---|
| Web app | Profile, job records, prompts, preview, export and tracking | Permission to read another site's logged-in pages |
| Make | Triggers, permitted integrations, transformations and scheduled coordination | Control of the browser already open on the user's PC |
| Connected agent session | User-authorized actions within tools exposed to that session | An always-on service owned by the deployed website |
| Local worker | Optional local model and outbound calls while the PC is awake | Cloud uptime, free GPU compute or website permission |
| Hosted worker | Authenticated intake, jobs and research queues for multiple users | Unlimited free execution or model tokens |

The practical browser bridge, if later supported and permitted, needs an installed client/extension or explicitly connected agent runtime, a narrow command protocol, per-action status, session ownership and a clear review boundary. The cloud must not receive the applicant's Indeed password or raw browser cookies. It must stop at captchas, authentication challenges, unsupported forms or ambiguous commitments. Do not use stealth settings, account rotation or security bypasses to make a demo appear successful.

GPT-6 Astra is documented as an API model, but its API has usage-based pricing. At research time its listed standard text rates were $10 per million input tokens and $50 per million output tokens. A hypothetical 8,000-input/1,500-output request is about $0.155 before any extra tool usage or other billable tokens. That is an estimate, not a resume quote or free entitlement. [OpenAI GPT-6 Astra documentation](https://developers.openai.com/api/docs/models/gpt-6-astra)

Use these generation modes:

1. **Manual AI handoff, available now:** the app constructs the complete prompt; the user uses an already available chat service and pastes back the result. Its account limits apply. There is no additional app API charge, but no claim of unlimited access.
2. **Local Ollama, optional adapter implemented:** the user's machine runs a compatible downloaded model. No provider API payment is required for local inference, but hardware, electricity, download size, latency and output quality still matter. Live research remains a separate step. The app does not download a model automatically. [Ollama API](https://docs.ollama.com/api/introduction)
3. **Make AI or provider free allowance, evaluate later:** quotas, data handling and availability must be checked. Never silently switch to a paid model when an allowance ends.
4. **Paid API, future opt-in only:** user or product owner supplies the budget, usage caps and server-side credentials. This is outside the current zero-spend mode.

The app never embeds the developer's AI credential in a public frontend. A connected Codex model is not a free backend credential for every visitor.

## 11. First Make scenario and operating budget

The recommended first scenario is **Real Job Intake**. An actual listing supplied by the user is sent to a private webhook, validated and normalized, then returned as a jobs batch. The app performs duplicate handling and visible ranking. This proves a real task with actual inputs before expanding to daily collection. Approved employer feeds can become a second input.

See [MAKE-SETUP.md](MAKE-SETUP.md) for the native MCP build sequence, payload contract, local connection, scheduling and failure behavior. The official native tools are now available. Scenario 7386585 was created, activated and verified with connection checks and an actual job batch. All three observed runs succeeded and consumed 9 credits in total.

The public Make plan listed 1,000 monthly free credits and a 15-minute minimum scheduled interval. Use on-demand runs initially and measure actual module and bundle costs. The minimum interval is a limit, not a recommendation to poll every 15 minutes. Reserve credits for failures and useful runs rather than empty checks. [Make pricing](https://www.make.com/en/pricing)

The local server sends outbound requests to Make. Make cannot reach `localhost` on the user's PC from its cloud. Do not expose the computer publicly just to avoid building the correct boundary. For the later hosted product use an authenticated endpoint, signed requests, input limits, rate limits, replay protection and server-side secret storage. Never place an unrestricted Make webhook URL in public JavaScript.

## 12. Current competitor research and product lessons

This comparison reviews published product flows and pricing pages. It is not a paid-account hands-on benchmark, proof of their marketing claims, or a ranking of hiring outcomes.

| Product | Published workflow | Useful design lesson |
|---|---|---|
| Teal | Job tracking, resume versions, keyword matching and AI writing; core tracking/resumes have a free tier, advanced AI/features are limited or paid | Put a job and its document versions together; show editing and matching beside each other. [Teal](https://www.tealhq.com/tools/resume-builder), [pricing](https://www.tealhq.com/pricing) |
| Simplify | A profile powers application autofill; users review and submit; resume tailoring has additional tiers | Save canonical facts once, make suggestions visible and preserve final user control. A competitor's extension support does not establish permission for our own Indeed bot. [Simplify](https://simplify.jobs/copilot), [setup flow](https://help.simplify.jobs/en/articles/1749022-installing-and-setting-up-copilot) |
| Huntr | Tracker, tailored resume packets, cover letters and job matching; published free limits include 100 tracked jobs and limited tailored packets | Keep application packets, notes and status in the same workspace. [Huntr pricing and features](https://huntr.co/pricing) |
| Jobscan | Resume versus job-description analysis and keyword feedback | Explain missing terms and evidence; do not claim our heuristic reproduces proprietary ATS behavior. The pricing page did not yield usable public plan details in this review. [Jobscan](https://www.jobscan.co/) |
| Kickresume | Guided AI writing and resume templates | Provide a document preview and simple editing controls, but retain a plain text-oriented export for this user's preset. [Kickresume](https://www.kickresume.com/en/ai-resume-writer/) |

The resulting UI is a working surface: overview, saved jobs, search planner, application tracker, verified profile, research/editor workspace, automation settings and backup/preset screen. No marketing hero, invented vacancy feed or simulated live automation is needed. Empty states explain the next real action. Statuses include pending setup, failed fetch, review required and successful completion.

The differentiator is the exact personal writing preset, evidence-backed tailoring, explicit Pakistan eligibility, reliable exports and portable data. Do not spend the first month replicating every paid competitor's template library, CRM and analytics module.

## 13. Stack, hosting and data architecture

### Personal release, implemented first

- Static HTML/CSS and JavaScript modules. No runtime package dependencies and no paid build system.
- Browser-local workspace with backup/restore; private data is not committed to the repository.
- Node.js local server for private Make and Ollama adapters, plus public feed and research adapters.
- A Vercel function for public employer feeds and explicit company-page reading, with bounded requests and no model credentials.
- Real Word export and browser PDF printing.
- GitHub source and automated tests.
- Vercel personal Hobby deployment, with Netlify configuration as an alternative.

The connected Vercel account was verified as a Hobby team. Hobby is for personal non-commercial use, so reassess before offering a paid SaaS. A public portfolio app can demonstrate real browser-local functions without exposing the creator's private data or providing unlimited model usage. [Vercel Hobby](https://vercel.com/docs/plans/hobby)

Netlify's researched free plan uses 300 monthly credits with a hard limit and no automatic recharge. It is an alternative deployment target, not required alongside Vercel. Free limits can pause functionality; they do not guarantee permanent unrestricted hosting. [Netlify pricing documentation](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/)

### Shared-account release, planned

Choose Supabase first for integrated accounts, relational records and private document storage. Keep Neon as an alternative when database branching or the selected backend architecture makes it more appropriate. Do not run both for the same records simply because both plugins are installed. No existing unrelated database should be reused automatically.

Supabase's researched free tier listed 500 MB database storage, 1 GB file storage, 50,000 monthly active users and pausing after a week of inactivity, with a two-active-project limit. Those quotas are not a production availability promise. No Supabase project was created in this task. [Supabase pricing](https://supabase.com/pricing)

The future relational model should include users/profiles, evidence facts, search presets, source jobs, per-user saved jobs, job revisions, research sources, generation runs, document versions, applications, application events, automation runs and usage counters. Keep shared public job metadata separate from private candidate and application records. Add unique `(source, external_job_id)` keys where available and unique `(user_id, job_id)` saved-job keys.

Every private table must have an owner and enforced row-level access rules, including reads, inserts, updates and deletes. Use private storage and short-lived authorized download links. Never expose service-role credentials to the browser. Test with two unrelated users, including attempts to guess IDs or change ownership. Add safe account deletion, export, retention and backup recovery before collecting real users' resumes.

The cloud browser app should call a server job endpoint, receive a job ID, and poll or subscribe for completion. Long generation should not depend on one browser request remaining open. Record `queued`, `running`, `needs_input`, `failed`, `completed` and `cancelled`; make retries idempotent and bound them. Keep model providers behind a small adapter interface so changing provider does not rewrite the job/profile system.

## 14. Security, trust and quality boundaries

Treat job descriptions, employer pages, imported backups and AI output as untrusted data. Never let a job description instruct the agent to reveal a profile, change a webhook, or visit a credential-bearing URL. Render escaped text and a narrow emphasis format; do not inject raw model HTML.

The local server binds to loopback, checks the request host and same-origin JSON requests, limits payload sizes, restricts provider destinations, uses timeouts and avoids automatic paid retries. Its personal-use design is not suitable for direct exposure as a multi-user API. Browser-local records are not encrypted by the app; clearly tell users to avoid shared computers and export backups.

Before a SaaS release add authentication, tenant isolation, CSRF protections appropriate to the session design, secret rotation, durable queues, rate and spending limits, redacted logs, retention controls, source-policy review and a tested restore procedure. Use synthetic data only inside tests, never as apparently real public vacancies.

Do not auto-answer sensitive or commitment-bearing application questions. Candidate authorization, availability, salary, relocation, demographics and legal declarations should come from explicit candidate answers. Never guess them from a resume. Do not perform assessments or attestations as if the user completed them personally.

## 15. Delivery sequence with acceptance criteria

These are planning estimates for a beginner working part time, not promises. Adjust after using the first release.

| Phase | Suggested effort | Deliverable | Done when |
|---|---:|---|---|
| 0. Boundaries and source design | 1-2 days | Exact user requirements, real source rules, zero-spend modes | No fictional job feed or false connected status; unknown facts remain unknown |
| 1. Personal workbench | 3-5 days | Profile, real job capture, duplicates, ranking, research, preset, editor, exports, tracking | A real listing becomes a reviewed application packet and survives reload/backup restore |
| 2. First Make scenario | 1-3 days after tool access | Real Job Intake and one verified run | Actual listing round-trips once, malformed input fails, duplicates do not multiply, credits recorded |
| 3. Reduce daily effort | 4-7 days | Permitted alert/feed intake, freshness checks, better filters and local AI trials | New actual records arrive without fake results; source failures are visible; manual path still works |
| 4. Public portfolio | 1-2 days | Hosted app, README, walkthrough, architecture and test evidence | A recruiter can use real core functions without seeing the owner's profile or needing a paid key |
| 5. Small shared beta | 2-4 weeks | Auth, private storage, account isolation, cloud jobs and quotas | Two-user isolation, delete/export and restore tests pass; costs and quality are measured |
| 6. Paid product | After demonstrated demand | Sustainable plans, billing, support and service operations | Users repeatedly find it useful and unit economics cover actual inference, hosting and support |

Do not delay personal job searching until every future feature exists. Use the workbench on a few real opportunities, record which steps still take time, and build the next feature around the largest repeated burden.

## 16. Verification plan

Functional tests must cover canonical URL duplicates, source changes, location restrictions, unknown remote eligibility, seniority flags, deadline expiry, missing dates, truthful profile grounding, malicious text, master checksum, paragraph and bullet limits, unresolved placeholders and export package validity.

Browser checks should include saving a real-shaped record, profile persistence, applying filters, research entry, draft editing, version restore, validation failures, Word download, print preview, backup restore, keyboard navigation and narrow-screen layout. Tests may use clearly marked fixtures; they must not ship as a selectable vacancy feed.

Document checks should inspect the actual Word package, extract text and compare it with the approved draft. Open Word/LibreOffice and a PDF viewer in a release checklist to verify pagination and emphasis. The minimal exporter is not a claim of exhaustive office-suite compatibility. Use visual regression fixtures for very long names, multi-page work history, Unicode and lengthy URLs.

For Make, verify a real execution and corresponding app record, test a duplicate replay and an invalid payload, inspect credit usage, and check that no candidate profile or secret is written to logs. For local AI, use an installed model, measure runtime and inspect unsupported claims; the adapter alone does not prove model quality. For hosting, verify the deployed page and assets, inspect browser errors, and confirm secrets are absent from published files.

Metrics to collect privately during a two-week pilot: time per reviewed application, proportion of saved jobs that are eligible, duplicate rate, incomplete-source rate, manual edit count, unsupported claim count, export defects, AI latency, Make credits, and interview responses. Never claim a project increased interview rates before collecting enough actual evidence.

## 17. Portfolio and later SaaS positioning

Repository title: **AI Job Assistant Automation**. Product working name: **Applydesk**. Check name/domain availability before commercial branding; no trademark clearance is implied.

Tell recruiters what the project demonstrates: real workflow design, input validation, API boundaries, document generation, safe local services, automated tests, CI, deployment, observability planning and honest cost management. Show architecture and a short workflow recording using consented or redacted records. Label limitations plainly. Avoid claiming autonomous Indeed applications or live AI research if those are not implemented and verified.

For SaaS, first validate that users return and save meaningful time. Keep a useful free tier for profile, manual capture and exports. Potential paid value is cloud research/generation, cross-device history, approved integrations, larger document libraries and collaboration, all subject to cost. Do not promise unlimited premium-model use. Estimate per-user costs from actual measured calls, retries, storage and support, then choose limits and pricing. Verify payment processor eligibility and payout support for the operator's country before selecting billing infrastructure; do not assume a provider is available in Pakistan.

The immediate success criterion is practical: one real job, one truthful targeted packet, no repeated manual formatting, and a clear application record. Full autonomous job-board operation remains a separate integration problem, not something a polished interface can pretend to solve.

## 18. Current status and unresolved work

Version 0.2 implements the real-job workspace, editable search profiles and acceptance rules, direct Indeed Pakistan launch links, profile, job editing/removal, manual/batch capture, duplicates, explainable ranking, saved-job document chooser, research notebook and live public company-page reader. It preserves the master prompt byte for byte, builds an independent cover-letter prompt, saves draft versions and exports Word, Markdown and print output. Full resume mode adds education/projects after an explicit second-page break with overflow guidance.

Saved public employer feeds support optional on-open and hourly matching-job collection while the app remains active. The local Make bridge is configured; native scenario 7386585 is active and passed real connection and job-batch tests. The scenario transports supplied records. It does not itself discover vacancies or store records in a cloud database.

Not operational: autonomous Indeed browsing/collection, an app-owned Indeed login, unattended application submission, independently validated AI company analysis, an installed/tested local model, multi-user cloud accounts or persistence, billing and SaaS service guarantees. A current company page can now be read, but company identity, factual notes and AI-generated conclusions still require review. No universal ATS score or exactly-two-pages guarantee is made.

Supabase and Neon account tools were inspected earlier; neither database is needed for this personal browser-local release. The future shared product should choose one isolated backend. The Vercel personal deployment is live, with secrets excluded. Netlify remains a static alternative requiring the local companion for API features.

## 19. Beginner experience and persistent settings

The navigation groups the work into Overview, Saved jobs, Find jobs, Documents, Applications, My profile, Automations and Data & preset. On a small screen it becomes a horizontal navigation strip, with single-column forms. Empty screens explain the next action without invented content.

Find jobs separates discovery from acceptance. Editing a query should never erase saved jobs. Paused searches remain editable and can still be opened manually. Removing a search asks for confirmation; changing matching rules immediately recalculates saved-job priorities. The original preset remains separately downloadable.

Documents begins with a saved-job selector. A selected job opens three choices in sequence: company research, tailored resume and optional cover letter. The document editor shows research/profile/draft/review progress. A missing profile or stale source stops final drafting/export where required. It must not fabricate candidate history to fill empty fields.

The complete CV wrapper is separate from the exact three-section preset. Name, contact details and education are required for a full export. The two-page option also requires real project content. It inserts a real Word page break before education/projects, shows an estimated overflow warning and never removes text to force a page count. Word's final rendering remains authoritative.

Indeed authentication belongs to Indeed in the visitor's existing browser profile. Ordinary cookies may keep the session, but expiry, logout, device changes and security checks can require another sign-in. The assistant cannot copy, lock or guarantee this session, and stores no Indeed password or cookies. An open app is not proof that an external website is signed in.

Automation settings distinguish manual requests, page-open collection and future cloud workers. Each feed can be removed. The user can pause scheduled checks. Unknown remote eligibility is not automatically accepted, failed requests are visible, and browser suspension or closure stops local collection. Backups include search settings and feed definitions; restored automatic collection starts paused.

## 20. Research reader and free service limits

The reader fetches only a user-selected public HTTPS company URL. It pins a validated public IPv4 destination, checks redirects again, rejects internal addresses, limits response size, bounds request duration and extracts readable text without executing page scripts. It does not act as an Indeed or LinkedIn scraper. Sites requiring JavaScript or rejecting the reader need manually checked notes.

Fetched text is evidence material, not verified company identity and not an instruction to the model. The app records access time, preserves relevant excerpts and asks the user to confirm the facts. Company research must separate what the source states from role-related inferences. A successful fetch alone never makes the resume claim true.

The public adapters consume Vercel's finite hosting allowance. Their in-memory throttle is a small courtesy limit and resets across server instances; it is not a durable abuse or spending control. There are no paid model credentials or private Make hooks behind them. Before opening a shared production service, add authenticated quotas, a durable rate limiter, operational monitoring and a deliberate cost policy.
