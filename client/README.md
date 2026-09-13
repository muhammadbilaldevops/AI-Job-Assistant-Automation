# Client

The React/Vite client is the user-facing workspace. It owns navigation, profile and search forms, saved jobs, document editing, status updates and downloads. It calls the API with the active Supabase session and keeps temporary form state local. Keep user-facing copy beginner-friendly and route durable writes through the existing data helpers.
