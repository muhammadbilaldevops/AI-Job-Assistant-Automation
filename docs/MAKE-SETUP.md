# Make real job intake

## Verified account connection

The official Make plugin is connected. The scenario **Applydesk · real job intake**, ID 7386585, was created in Muhammad's private space and activated on 13 September 2026. The account zone is eu1.make.com. No third-party credentials were needed for these built-in modules.

Open it in [Make](https://eu1.make.com/2772469/scenarios/7386585/edit). Access depends on your Make account. The secret webhook is stored only in the creator's local `.env` and is deliberately absent from this guide, the Git repository and the public site.

## What the scenario actually does

1. **Custom webhook** receives a request from Applydesk.
2. **Transform to JSON** encodes the supplied jobs, request ID and processing timestamp.
3. **Webhook response** sends that batch back to the application.

The local app validates title, employer, URL and description before sending. The app merges returned jobs by source URL and preserves saved application progress. This first scenario is an integration bridge. It does not discover new jobs, rank them, write to a cloud database, research companies, sign in to Indeed or submit applications.

The trigger runs only when requested. It has no recurring empty polls. A verified execution used 3 credits for 3 module operations. The Free plan has finite credits; check your account before extending or scheduling it. [Make pricing](https://www.make.com/en/pricing)

## Evidence from the actual build

The native environment, app discovery and module specification tools were used before authoring. The generic webhook learned a real connection-check request containing the requested search families and locations, with an empty jobs array. Its detected fields were inspected before downstream mapping was added.

Execution `889bdf8b62a6445d8f6a01b09fe026d0` succeeded in 138 ms and used 3 credits. A later browser check verified the local app's Check Make connection button. A real published Vercel employer-feed record was then sent through `/api/make`; its URL and complete description were returned unchanged. This was an integration test, not a recommended Pakistan job or an application submission.

## Use it from your local app

Start the repository with `npm start`. The command reads `.env` when present. Open the local address shown in the terminal.

- In Automations, **Check Make connection** sends an empty connection check and reports success only after validating the response. It does not claim jobs were found.
- Open a saved real job and choose **Send this job to Make** to send its listing fields. Your candidate profile, contact details, resume and cover letter are excluded.
- Wait at least one minute between requests. The local server enforces this small usage guard.

The public Vercel app intentionally cannot invoke the creator's private Make webhook. A public unprotected bridge would let any visitor consume the creator's Make allowance. Shared SaaS access needs authenticated users, per-user connections and durable usage limits first.

## Contract

Requests have `action`, `requestId` and `jobs`. `connection_check` uses an empty list; `normalize_jobs` carries up to 20 validated real listings. Responses contain `jobs`, `requestId`, `processedAt` and a source label. The transport preserves data; despite the historical action name, the Make modules do not perform semantic normalization.

The adapter accepts only official regional HTTPS Make hook destinations, imposes request/response limits, blocks cross-origin local requests and times out after 40 seconds. No automatic retry is sent. If a request times out, inspect the Make run before trying again because the first request may have succeeded.

## Extending the flow later

Add only source methods that permit automated access. Public employer feeds already work directly through the application, including matching and saving while its page is open. For cloud collection while the browser is closed, first add a separate database with authenticated owner records, idempotency keys, run history and quotas. Then let Make write permitted source results to that backend.

To reuse the design in another account, discover actual module specifications through the native Make tools, create the webhook trigger, inspect a real request, then map and test the downstream modules. Do not copy this account's hook, connection IDs or private data. Never treat generic browser control or an HTTP module as an authorized Indeed integration.
