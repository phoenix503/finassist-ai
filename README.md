# FinAssist AI

FinAssist AI is a banking information assistant. The current app provides a web chat interface and a NestJS API that can answer general banking questions with Gemini. The API also has protected endpoints for uploading PDFs, storing their text in PostgreSQL, generating vector embeddings, and retrieving relevant passages for a search query.

The assistant is informational: its prompts tell it not to invent account information, request passwords, PINs, or OTPs, or claim to perform financial transactions. It is not connected to authenticated bank accounts.

## Features

- Angular chat UI with streamed assistant responses.
- Gemini powered chat and text embeddings.
- PDF text extraction and splitting into overlapping chunks.
- PostgreSQL with pgvector for document chunks and similarity search.
- DTO validation, upload size and file-signature checks, chat-history limits, API token protection for document endpoints, and a basic per-process request rate limit.
- A separate `day1-llm-chatbot` command-line prototype for experimenting with Gemini prompts and structured responses.

## How it works

1. The Angular client sends chat messages to `POST /api/chat/stream` and renders the streamed response.
2. The API sends the conversation to the configured Gemini model.
3. A trusted client can upload a PDF to `POST /api/documents/upload`. The API extracts its text, splits it into chunks, and stores the chunks in PostgreSQL.
4. `POST /api/documents/:documentId/embed` creates embeddings for stored chunks and saves them as pgvector vectors.
5. `POST /api/documents/search` embeds a query and returns up to five closest chunks.

Document routes require `Authorization: Bearer <DOCUMENTS_API_TOKEN>`. The current web UI only implements chat; it does not include document upload or search screens.

## Tech stack

| Area | Technologies |
| --- | --- |
| Web client | Angular 17, TypeScript, RxJS |
| API | NestJS, Node.js, TypeScript, Express |
| Generative AI | Google Gemini via `@google/genai` |
| Document processing | `pdf-parse`, Multer |
| Database and vectors | PostgreSQL, pgvector, `pg` |
| Validation | `class-validator`, `class-transformer` |
| Local database | Docker Compose |

## Prerequisites

- Node.js and npm
- Docker Compose (for the local PostgreSQL/pgvector service)
- A Gemini API key and access to the configured chat and embedding models
- A PostgreSQL schema with the `documents` and `document_chunks` tables, including a pgvector `embedding` column. This repository currently does not include database migrations or schema initialization scripts.

## Local setup

### 1. Configure secrets

Copy `.env.example` to the workspace root `.env` and `apps/api/.env.example` to `apps/api/.env`. Set distinct, high-entropy values for the database password and `DOCUMENTS_API_TOKEN`; set your Gemini API key, chat model, and embedding model in `apps/api/.env`.

The Compose service reads `POSTGRES_PASSWORD` from the root `.env`. The API reads database settings and Gemini configuration from `apps/api/.env` when started with `apps/api` as its working directory. Keep both files private. If a credential has been exposed, revoke and replace it before use.

### 2. Start PostgreSQL

From the project root, run:

```bash
docker compose up -d postgres
```

PostgreSQL is bound to localhost on port `5432`. Provision the required database tables and pgvector extension before using document features.

### 3. Install dependencies

```bash
cd apps/api && npm install
cd ../web && npm install
```

### 4. Start the API and web app

In separate terminals:

```bash
cd apps/api && npm run start:dev
```

```bash
cd apps/web && npm start
```

The API listens on port `3000` and allows the local Angular origin `http://localhost:4200`. The Angular chat service currently uses `http://localhost:3000` directly.

## API routes

| Method | Route | Purpose | Authentication |
| --- | --- | --- | --- |
| `POST` | `/api/chat` | Generate a non-streaming chat reply | None |
| `POST` | `/api/chat/stream` | Stream a chat reply as server-sent events | None |
| `POST` | `/api/documents/upload` | Upload and extract a PDF | Bearer token |
| `GET` | `/api/documents/test-embedding` | Generate a sample embedding | Bearer token |
| `POST` | `/api/documents/:documentId/embed` | Generate embeddings for stored chunks | Bearer token |
| `POST` | `/api/documents/search` | Search embedded document chunks | Bearer token |

## Security notes

See [SECURITY.md](SECURITY.md) for configuration and deployment notes. The document token is a shared service gate, not user identity or per-user document authorization. Do not put it in browser code. The in-memory rate limit is process-local and should be replaced with a shared limiter for multi-instance deployments. Do not use the current setup with real customer data without adding authentication, authorization, and a production security review.

## Additional project notes

- The API package provides `npm run build`, `npm run lint`, and Vitest commands from `apps/api`.
- The Angular package provides `npm start`, `npm run build`, and `npm test` from `apps/web`.
- `day1-llm-chatbot` is a separate early prototype; run it from that directory with `npm run dev` after setting `GEMINI_API_KEY` and optionally `GEMINI_MODEL`.
