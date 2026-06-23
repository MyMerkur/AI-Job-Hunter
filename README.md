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

## StartupJobs scraper

The StartupJobs worker only visits public pages slowly, does not log in, and stops when it encounters a CAPTCHA/challenge. It never submits applications. `STARTUPJOBS_MAX_JOBS` caps each run (default: 20) and `STARTUPJOBS_REQUEST_DELAY_MS` controls the pause between requests (default: 2500 ms).

```bash
pnpm --filter worker playwright:install
pnpm --filter worker scrape:startupjobs
pnpm --filter worker scrape:jobs
pnpm --filter worker score:jobs
```

The deterministic development fixture remains available as `pnpm --filter worker scrape:mock`.

## Application form assistant

The assistant opens an existing application’s public job URL, optionally opens its apply form, fills known fields, and stops before submission. It never clicks a final submit/send button. A visible browser is the default; close it manually when your review is complete.

```bash
pnpm --filter worker assist:application APPLICATION_ID
```

Set `APPLY_ASSISTANT_HEADLESS=true` only for diagnostic runs; a headless run closes after filling and still never submits.

## AI providers

`packages/ai` has no paid API dependency. `RuleBasedAIProvider` produces deterministic drafts, `OllamaProvider` is a non-network placeholder that reads `OLLAMA_BASE_URL`, and `ManualChatGPTProvider` saves copyable prompts in `generated/prompts` (Git-ignored). ChatGPT Plus does not provide backend API access; use the manual provider to paste prompts into ChatGPT’s web interface.

## CV upload API

Start MongoDB and the API, then submit one PDF or DOCX file (10 MB by default):

```bash
curl -X POST http://localhost:3001/api/cv/upload \
  -F "file=@/absolute/path/to/cv.pdf" \
  -F "name=My CV"
```

Files are stored locally in `uploads/cv`, which is intentionally ignored by Git. List and detail endpoints are `GET /api/cv` and `GET /api/cv/:id`.

## Jobs API

`GET /api/jobs` returns jobs ordered by `score` descending then `createdAt` descending. Optional query filters are `source`, `status`, `minScore`, and `decision`. Update a workflow status with `PATCH /api/jobs/:id/status` and a JSON body such as `{ "status": "saved" }`.

## Application preparation API

`POST /api/applications/prepare` accepts `jobId`, `cvProfileId`, and a free provider (`rule_based`, `manual_chatgpt`, or `ollama`). It only creates reviewed drafts: tailored CV markdown, cover-letter markdown, an application with `prepared` status, and audit logs. It never submits an application.

## Deliberate gaps before product work

- CV file storage and secure PDF/DOCX text extraction
- Job-board source adapters and terms-of-service/rate-limit handling
- Database, authentication, encryption, and user review workflow
- A real local AI adapter (for example, Ollama) plus output validation
- Robust application-form field mapping. Submission must remain explicitly user-approved.
