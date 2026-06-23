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

Prerequisites: Node.js 22+ and pnpm 10+ (`corepack enable` can provide pnpm with supported Node installations).

```bash
cp .env.example .env
pnpm install
pnpm --filter @ai-job-hunter/worker playwright:install
pnpm dev
```

Open `http://localhost:5173`; the API is at `http://localhost:3001/health`.

Useful checks:

```bash
pnpm typecheck
pnpm build
```

To run the worker in non-submitting inspection mode:

```bash
pnpm --filter @ai-job-hunter/worker dev -- https://example.com
```

## Deliberate gaps before product work

- CV file storage and secure PDF/DOCX text extraction
- Job-board source adapters and terms-of-service/rate-limit handling
- Database, authentication, encryption, and user review workflow
- A real local AI adapter (for example, Ollama) plus output validation
- Robust application-form field mapping. Submission must remain explicitly user-approved.
