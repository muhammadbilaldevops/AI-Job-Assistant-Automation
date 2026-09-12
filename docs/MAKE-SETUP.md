# First Make scenario: real job intake

Status: designed; not created or executed in the connected account. Make's plugin skills were installed, but no Make account/scenario tools were exposed to this task. Signing into the Make website and installing its plugin do not prove a successful MCP tool connection. No browser or direct-token workaround was used for Make.

## The first automation to build

**Name:** AI Job Assistant - Real Job Intake

**Purpose:** Accept real job records supplied by the user or a permitted source, normalize the batch, and return it to the application. It does not invent jobs, scrape Indeed, log into Indeed, or submit applications.

For the user's primary Indeed workflow, intake starts with an actual description and its `https://pk.indeed.com/` job link. An authorized native Indeed connector, if available to the account, can become another input later. Do not assume that Make's HTTP module or a generic browser connection is an authorized Indeed connector.

## Native MCP build procedure

Once Make tools are exposed, use the installed Make reference, building and operations skills. Do not invent module IDs or import an unverified blueprint.

1. Read the environment and find the user's private space/team and current subscription limits.
2. List relevant scenarios and reuse an existing matching scenario rather than duplicating it.
3. Find modules for receiving a custom webhook, normalizing a JSON payload, and responding to a webhook. Resolve exact names with `app_find`.
4. Read all module specifications together. Reuse existing connections, if any are required. This basic flow should not need an OpenAI, Gmail or database connection.
5. Prefer a user-triggered webhook over frequent polling. It has no background empty checks and no historical mailbox backfill.
6. If the webhook payload is learned, create only the trigger first, receive a real test job, inspect its detected fields, then patch the complete downstream flow. Do not guess learned field names.
7. Validate required title, company, original URL and description; return a clear error for incomplete input. Keep uncertain location and dates marked unknown.
8. Return `Content-Type: application/json` and a `jobs` array. Keep the response within the local adapter's 40-second timeout.
9. Keep scheduling inactive until the actual request and response mapping have been tested. Activate only the verified, requested flow. Do not enable bulk applications or email sending.
10. Inspect the execution result and verify the job appears in the app exactly once. Record actual credits consumed, scenario URL and execution ID in a private run log.

This procedure is a build specification, not an importable Make blueprint. An exported blueprint belongs in this folder only after its real module configuration has been created and tested.

## Input and output contract

Field names below are application fields, not guessed Make module identifiers.

```json
{
  "action": "collect_jobs",
  "requestId": "unique-id-for-this-request",
  "jobs": [
    {
      "title": "<actual advertised title>",
      "company": "<actual employer>",
      "url": "<actual job URL>",
      "description": "<complete real description>",
      "location": "<actual location or Unknown>",
      "mode": "On-site",
      "remoteEligibility": "Unknown",
      "postedAt": "",
      "source": "Indeed Pakistan - user supplied"
    }
  ]
}
```

The response is `{ "jobs": [...] }`. The placeholders above explain the schema and are not vacancies. Reject them in real runs. No profile or contact details are required for job intake.

## Local app wiring

Copy `.env.example` to `.env` and set `MAKE_WEBHOOK_URL` privately after Make returns the actual URL. Do not send the webhook URL to GitHub or paste it into a public frontend. Start the app with:

```powershell
node --env-file=.env server.mjs
```

The local app supports two deliberate calls:

- **Run Make intake:** sends an empty collection request for a scenario configured with approved feeds.
- **Send this job to Make:** sends the selected real listing to a job-intake scenario. No candidate profile is included.

Choose one corresponding scenario contract for the configured URL. Sending an empty collection request to a job-input-only scenario should return a clear missing-input error, not generate example jobs.

The local server allows only regional HTTPS `hook.<region>.make.com` destinations. The browser calls the same-origin local server; Make never calls `localhost` on the user's PC. Static hosting cannot run this local server. A production version needs an authenticated server endpoint and per-user limits before exposing any webhook-backed function.

## Optional second source

An employer's documented Greenhouse or Lever job feed can supply real published jobs. Configure only a board token found on that employer's real careers page. Public listing reads and application submission have different permissions. Do not use employer application API credentials that the user does not possess. Preserve source URL and observed time; Greenhouse `updated_at` must not be relabeled as original publication time.

## Credit budget

Make's public pricing listed 1,000 free credits per month and a 15-minute minimum scheduled interval when researched. Different modules can consume different amounts. Treat all calculations below as estimates to validate against actual execution history.

- One trigger check every 15 minutes could be 96 checks/day, approximately 2,880/month before any useful processing if that trigger bills each check.
- A single daily check is about 30 checks/month.
- A 4-credit batch, twice a day for 30 days, is approximately 240 credits before other modules and retries.
- Per-item modules multiply cost by the number of bundles. A 100-job feed does not necessarily cost the same as a 1-job feed.

Start with on-demand runs, retain a credit reserve, and stop rather than upgrade automatically. Make AI features may consume token-based credits; do not insert them under the assumption that a ChatGPT subscription pays for them.

## Failure behavior

- Empty results: return an empty array with successful source status; do not fabricate jobs.
- Authentication or permissions error: stop and show the native reconnect flow when available.
- Rate limit: obey `Retry-After`; do not loop aggressively.
- Timeout: mark the outcome unknown and check execution history before retrying a write.
- Duplicate response: merge by canonical source URL; preserve application status and document versions.
- Unsupported source: show the source error separately from an empty successful search.
- Captcha or login challenge on a job board: hand back to the user. No bypass or account rotation.

Sources: [Make pricing](https://www.make.com/en/pricing), [Make credits](https://help.make.com/credits), [Greenhouse Job Board API](https://docs.greenhouse.io/job-board.html), [Lever Postings API](https://github.com/lever/postings-api).
