# API

These Vercel handlers are the small server boundary for parsing uploads, calling the configured Make AI webhook and serving safe integrations. They validate input, never expose service keys, and return stable JSON errors so the client can show a useful message. Production secrets belong in Vercel environment variables.
