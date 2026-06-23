# AI Job Hunter

Local-first tooling to upload a CV, discover and score job listings, prepare tailored application material, and eventually inspect application forms. No paid AI provider or application submission is included.

## Structure

- `apps/web` — React + Vite user interface
- `apps/api` — Express API (currently exposes `GET /health`)
- `apps/worker` — Node + Playwright worker; it can inspect a supplied URL but never submits a form
- `packages/shared` — cross-project domain types
- `packages/scoring` — deterministic skill-match scoring
- `packages/ai` — provider contract and unconfigured local-AI placeholder
- `packages/cv` — CV parsing and generation placeholders

## Setup

Prerequisites: Node.js 22+, pnpm 10+ (`corepack enable` can provide pnpm with supported Node installations), and a running local MongoDB instance.

```bash
cp .env.example .env
pnpm install
pnpm --filter @ai-job-hunter/worker playwright:install
pnpm dev
```

Open `http://localhost:5173`; the API is at `http://localhost:3001/health`.
Set `MONGODB_URI` in `.env` when MongoDB is not running at the default local address.

Useful checks:

```bash
pnpm typecheck
pnpm build
```

To run the worker in non-submitting inspection mode:

```bash
pnpm --filter @ai-job-hunter/worker dev -- https://example.com
```

## Mock job worker

The worker currently writes five deterministic sample jobs to MongoDB; it does not scrape or apply to real websites.

```bash
pnpm --filter worker playwright:install
pnpm --filter worker scrape:startupjobs
pnpm --filter worker scrape:jobs
pnpm --filter worker score:jobs
```

## CV upload API

Start MongoDB and the API, then submit one PDF or DOCX file (10 MB by default):

```bash
curl -X POST http://localhost:3001/api/cv/upload \
  -F "file=@/absolute/path/to/cv.pdf" \
  -F "name=My CV"
```

Files are stored locally in `uploads/cv`, which is intentionally ignored by Git. List and detail endpoints are `GET /api/cv` and `GET /api/cv/:id`.

## Deliberate gaps before product work

- CV file storage and secure PDF/DOCX text extraction
- Job-board source adapters and terms-of-service/rate-limit handling
- Database, authentication, encryption, and user review workflow
- A real local AI adapter (for example, Ollama) plus output validation
- Robust application-form field mapping. Submission must remain explicitly user-approved.
