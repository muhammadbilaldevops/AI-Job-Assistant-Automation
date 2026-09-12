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

The local workspace was opened successfully through the supported browser connection. Further UI and deployment checks are recorded with the release result. Early development examples were removed after the user clarified that the app must contain only real input; the final public app starts empty.

## Integration status

| Integration | Status |
|---|---|
| GitHub | Repository access verified; final commit/push result recorded in the handoff |
| Vercel | CLI user and free Hobby team verified; deployment result recorded in the handoff |
| Make | Local adapter and scenario specification implemented; native account tools absent from this task, so account connection cannot be verified and no live scenario was created |
| Supabase | Account listing worked; no projects present; no project was created |
| Neon | Account listing worked; no project for this app was created or unrelated project modified |
| Indeed Pakistan | Correct public site verified; human-operated search launch and real record capture implemented; no account connection, scraper or auto-submit |
| Ollama | Optional local adapter implemented; no model installed or real inference benchmark run |

## Deliberate limitations

The prototype is a functioning personal workbench, not the completed autonomous system. Automatic discovery of every Indeed vacancy, independent background company research, multi-user auth/storage, unattended applications and production service guarantees are not implemented. No fake online connection or successful application status stands in for those capabilities.

Word export is an actual OOXML ZIP package. Office-suite pagination and all possible input lengths still require the user's final document preview. Structural checks are not a semantic fact checker or an ATS acceptance guarantee. The manual AI handoff and local-provider path must be described accurately in demonstrations.
