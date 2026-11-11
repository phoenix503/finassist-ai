# Security configuration

- Rotate any Gemini key that has been exposed. Keep all `.env` files out of Git.
- Copy `.env.example` to the workspace `.env` and `apps/api/.env.example` to
  `apps/api/.env`. Use distinct, high-entropy values for `POSTGRES_PASSWORD`,
  `DATABASE_PASSWORD`, and `DOCUMENTS_API_TOKEN`.
- Start the database with `POSTGRES_PASSWORD` set in the workspace environment.
  Compose binds PostgreSQL to localhost only.
- Every `/api/documents` endpoint requires
  `Authorization: Bearer <DOCUMENTS_API_TOKEN>`. Do not put this shared token in
  frontend code. This token is a service gate, not user identity or per-user
  document authorization; add a real identity and ownership model before using
  the API with multiple users or sensitive documents.
- The API applies an in-memory limit of 60 requests per IP per minute. It is
  process-local; use a shared rate limiter for multiple API instances and set
  proxy trust only for known reverse proxies.
