# Using Applydesk with real Indeed jobs

## Set up once

Use My profile to enter real skills, employment, education and projects. Keep exact employer names, dates and job titles. If you have no employment experience, say so; the original preset assumes experience, so use a different truthful project preset in a future version rather than inventing a position.

The original master prompt can be read or downloaded from Data & preset. The app appends your job/profile/research context to it. The separate cover-letter prompt does not inherit the resume prompt's "No cover letter" restriction.

## Find and save actual openings

Find jobs lets you add, edit, pause and remove saved titles and locations. Matching rules let you change accepted cities, country and experience limits. Your choices survive reload. It opens `https://pk.indeed.com/` search pages. It does not sign you in, set an unverified radius, scrape pages or collect every result automatically. In Indeed, choose at most 100 km, check the actual office location, sort by newest where available, and open one role at a time.

Copy its original link and full description to Save a job. Use unknown dates when no date is given. For remote work, read the country restriction before choosing Pakistan or Worldwide. Saving a role does not mean you qualify; the score only helps prioritize review.

## Prepare the packet

Open Documents, select a saved job, and choose Company research. Enter a company URL and use Read this company page to fetch current readable text. Check its identity, then add source notes from the official company site or careers page. Confirm that you actually checked each source. The app requires a recent verified note before building a company-researched prompt.

Copy the generation prompt into the AI chat you already use. If it can browse, ask it to verify current official company sources. Keep extra analysis or research notes in the workspace and paste only the three final resume sections into the resume editor. The editor handles bold and italic Markdown. Do not paste an entire explanation around the resume.

Save a version after an important revision. Check formatting; confirm facts yourself. A structural pass cannot establish that the employer research or candidate claims are true. Editing either document invalidates the review checkbox.

Use sections-only output to follow the original preset. Select full-resume export if you also want your profile's name, contact details, education and projects. The latter fields are included as supplied, not automatically rewritten. Fill out name, contact details and education before exporting a full resume. Two-page layout also needs real project content and starts education/projects on page 2. Long content may overflow: use the guidance and inspect the actual Word page count.

Download Word for an editable document. Print / Save as PDF opens your browser's print flow: choose Save as PDF, use A4 and inspect every page. The browser may require switching off its header/footer URL display. Nothing sends the exported document to an employer until you choose to apply.

Generate the cover letter separately using its tab. It should be short, grounded in actual evidence and free of em dashes. Review the name, greeting and employer before exporting.

## Apply and track

Open the original live listing and verify that it still accepts applications. Review the uploaded file and all answers. Submit yourself, then choose Applied. Add any confirmation/reference number to private notes. Interviews, offers and rejections are separate statuses. Ready means your own workflow state, not an employer's acceptance.

## Make and local AI

The public Vercel app can run capture, editing, validation, exports, live company-page reading and public employer-feed imports. It cannot reach a local model on your PC through the site's own server. Run the local companion for optional adapters.

Send this job to Make transmits the selected job's title, employer, URL, description and location metadata to the configured private scenario. It excludes your candidate profile. The creator’s local scenario is configured and tested. New users must connect their own scenario. Check Make connection verifies the local bridge; it does not discover jobs. The public site cannot use the creator’s private hook.

Ollama generation requires the local Ollama service and a downloaded model named in `.env`. The model does not gain internet research just because it can write. No local model was installed by this project. Use the manual prompt path whenever a local model is too slow or inaccurate.

## Protect your work

Use Export private backup regularly, especially before changing browsers, devices or domains. Backups contain your profile and drafts, so do not publish them to GitHub. Restore replaces this browser's workspace only after confirmation. Browser-local storage is not encrypted by this application and can be cleared by browser settings.

In Automations, save an employer’s real Greenhouse or Lever board. Use Import for manual review to inspect all its listings, or Check feeds now to save only eligible matching roles. The optional on-open/hourly setting works while the page remains active. It stops when the browser closes and resumes when reopened. These feeds are supplementary to Indeed.

There are no accounts or cross-device sync in v0.2. Each visitor starts with an empty private local workspace. If the page is moved to another domain, its browser storage is separate; export from the old domain and restore on the new one.
