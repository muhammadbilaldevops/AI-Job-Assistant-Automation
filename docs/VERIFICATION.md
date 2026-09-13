# Verification and release status

## Automated checks

- JavaScript syntax and required public files.
- Original master prompt SHA-256 integrity.
- Canonical Indeed URL deduplication.
- Duplicate refresh preserves application status and documents.
- Remote country eligibility, on-site restrictions, deadline and publication-date behavior.
- Source verification/recency and independent cover-letter prompt.
- Two summary paragraphs, skill counts, experience header/bullets and placeholder/em-dash failures.
- Escaped rendered HTML and valid Word package signatures/formatting runs.
- Allowlisted employer-feed URLs and preservation of unknown publication dates.
- Local server delivery, private-file exclusion and cross-origin rejection.

Run `npm run check` and `npm test` for the current result. The test report in the final handoff states what actually passed.

## Browser verification

The local workspace was opened successfully through the supported browser connection. Desktop layout and the real Indeed search links were inspected; the initial narrow browser view also rendered the responsive layout. Early development examples were removed after the user clarified that the app must contain only real input; the final public app starts empty.

Optional browser-agent tools registered successfully. Search-planner navigation and empty saved-job read-back returned the expected results; an invalid script URL was rejected without adding a record. A successful real-listing save through this optional tool was not exercised because no complete user-supplied real description was available. Its shared merge logic is covered by the unit tests.

Initial GitHub CI run 34714720615 passed. Vercel reported production deployment dpl_JDewL7qa1cTAuTTdLqWxi2T15xeJ READY, and an unauthenticated request to https://ai-job-assistant-automation.vercel.app returned HTTP 200. Later source revisions trigger the linked Git deployment automatically.

## Integration status

| Integration | Status |
|---|---|
| GitHub | Repository access verified; final commit/push result recorded in the handoff |
| Vercel | CLI user and free Hobby team verified; deployment result recorded in the handoff |
| Make | Official connection verified; scenario 7386585 active; browser connection check and actual employer job round trip passed; 3 credits per observed successful run |
| Supabase | Account listing worked; no projects present; no project was created |
| Neon | Account listing worked; no project for this app was created or unrelated project modified |
| Indeed Pakistan | Correct public site verified; human-operated search launch and real record capture implemented; no account connection, scraper or auto-submit |
| Ollama | Optional local adapter implemented; no model installed or real inference benchmark run |

## Deliberate limitations

The prototype is a functioning personal workbench, not the completed autonomous system. Automatic discovery of every Indeed vacancy, independent background company research, multi-user auth/storage, unattended applications and production service guarantees are not implemented. No fake online connection or successful application status stands in for those capabilities.

Word export is an actual OOXML ZIP package. Office-suite pagination and all possible input lengths still require the user's final document preview. Structural checks are not a semantic fact checker or an ATS acceptance guarantee. The manual AI handoff and local-provider path must be described accurately in demonstrations.

## Version 0.2 verification

The current automated suite adds editable search validation, radius limits, custom title/city matching, remote opt-out, a real Word page-break check, and the research reader’s private-address/URL checks. The original preset checksum still passes.

Browser checks confirmed a new relevant search survived reload, the Documents empty state and job selector rendered, and the local Make connection button returned its verified success message. Desktop and narrow layouts were inspected; the 390 px layout reported no horizontal document overflow.

The reader successfully fetched a current official company page and returned its title, text and access time with verified=false. The real Vercel Greenhouse feed returned 86 published records during the check. A published cloud-security role was round-tripped through the local Make bridge with its original URL and full description unchanged; no candidate profile was sent and no job application was made.

The two-page wrapper was tested at the OOXML level. No personalized final resume was authored or visually rendered in Word because candidate facts were not supplied. Page-count and content-quality guarantees cannot be inferred from package tests.
