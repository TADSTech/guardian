# Guardian hackathon roadmap

## Product decision

Guardian is an AI-powered digital-safety and accessibility assistant for vulnerable Nigerians. The demo has one promise: **send or upload something confusing, then get a calm, clear, safe next step.**

The three dependable judge journeys are:

1. Scam screenshot → risk level, evidence, and safety advice.
2. Healthcare document → extracted facts, plain-language explanation, and warnings.
3. Chrome extension → a difficult webpage becomes easier to read, hear, and understand.

WhatsApp and voice are supporting demo surfaces. They should feel real, but neither may jeopardise the core flows.

## Locked stack

| Layer | Choice | Reason |
|---|---|---|
| Web | Next.js App Router, TypeScript, Tailwind, shadcn/ui, Framer Motion | Premium landing page, demo lab, and judge mode. |
| API | Node.js, Fastify, TypeScript | Small, typed boundary for uploads and integrations. |
| AI | OpenAI Responses API with GPT-5 family models | One provider abstraction for image, document, and text understanding. |
| Speech | OpenAI transcription; browser speech synthesis | Reliable input and no extra voice service. |
| Extension | Chrome Manifest V3, React popup, content script | Proves Guardian's accessibility promise. |
| Persistence | None by default; SQLite only for local demo history | Prepared fixtures beat infrastructure for this demo. |

## Repository target

```text
apps/
  web/                         # Landing, demo lab, judge presentation mode
  extension/                   # Manifest V3 popup and content script
  api/                         # Fastify HTTP API
packages/
  contracts/                   # Shared schemas and types
  shared-ui/                   # Optional shared design primitives
  demo-fixtures/               # Curated uploads and deterministic fallback results
docs/                           # Build and judging documentation
```

`apps/api` contains modules for `fraud-analysis`, `document-explainer`, `voice`, and `whatsapp`. Do not deploy them as separate services during the hackathon.

## Minimal data model

Persistence is optional. If demo history is added, use only `analysis` (id, kind, fixture_key, risk_level, result_json, created_at) and `feedback` (id, analysis_id, rating, note, created_at). Process uploads in memory where possible; do not retain them by default.

## Delivery phases

| Phase | Goal | Outcome |
|---|---|---|
| 1 | Foundation | Coherent product shell with supplied demo assets. |
| 2 | Core analysis | Scam and document journeys work against API and fixtures. |
| 3 | Accessibility differentiator | Chrome extension visibly transforms a webpage. |
| 4 | Voice and WhatsApp realism | Voice works; WhatsApp is webhook-ready with a graceful simulated view. |
| 5 | Judge mode and finish | One-click demos, fallbacks, docs, presentation polish. |

## Phase 1 — Foundation

*Goal: A judge can understand Guardian and start a prepared demo in under 30 seconds.*

- [ ] Create the workspace structure above and Bun workspaces.
- [ ] Scaffold `apps/web` with Next.js, Tailwind, shadcn/ui, and motion preferences.
- [ ] Add Guardian tokens: warm off-white, deep trust green, semantic risk colours, 8px spacing, legible sans-serif type.
- [ ] Build landing page: promise, trust indicators, three feature cards, demo CTA.
- [ ] Build demo lab shell with Scam Detector, Document Explainer, and Voice Assistant tabs.
- [ ] Add fixture metadata and thumbnail assets.
- [ ] Create `packages/contracts` schemas for `AnalysisRequest` and `AnalysisResult`.

**Done when:** desktop and mobile layouts are usable, keyboard focus is visible, reduced motion is respected, and each tab can load an example.

## Phase 2 — Core analysis

*Goal: The two highest-value judge flows return polished, safe results.*

- [ ] Scaffold Fastify API with health endpoint and CORS for the web app.
- [ ] Implement `POST /v1/analyze/scam` for text, URL, and image inputs.
- [ ] Implement `POST /v1/analyze/document` for images and PDFs.
- [ ] Create structured fraud and document-result contracts.
- [ ] Add OpenAI provider adapter and a deterministic fixture fallback selected by fixture key.
- [ ] Build results with risk badge, evidence list, and “What to do now” section.
- [ ] Add loading, unsupported-file, API-unavailable, and low-confidence states.

**Done when:** prepared scam and prescription examples work without an API key; live analysis works when configured.

## Phase 3 — Chrome extension

*Goal: A judge can watch Guardian make a confusing page easier to use.*

- [ ] Configure Manifest V3, minimal permissions, popup React app, and content-script bundle.
- [ ] Implement a floating Guardian button injected only after user activation.
- [ ] Implement Elderly Mode: larger type, line height, and contrast.
- [ ] Implement Focus Mode without deleting the original page.
- [ ] Implement “Simplify this page” using selected/main-page text and the shared API contract.
- [ ] Implement browser speech synthesis for “Read aloud.”
- [ ] Build a safe fixture page that guarantees a live transformation.

**Done when:** the extension loads unpacked, works on the fixture page, toggles off cleanly, and is keyboard-accessible.

## Phase 4 — Voice and WhatsApp realism

*Goal: Guardian feels WhatsApp-first without depending on external account configuration.*

- [ ] Implement `POST /v1/analyze/voice`: transcription followed by explanation.
- [ ] Add a voice-note fixture and browser-speech response playback.
- [ ] Add a WhatsApp conversation mock view inside the web demo.
- [ ] Add `POST /v1/webhooks/whatsapp` with verification and idempotency interfaces, protected by configuration.
- [ ] Use the same analysis contracts for web, mock WhatsApp, and future Cloud API delivery.

**Done when:** a voice fixture returns a transcript and safe explanation; the WhatsApp mock demonstrates the intended conversation.

## Phase 5 — Judge mode and final polish

*Goal: The demo is fast, resilient, and easy to present under pressure.*

- [ ] Add `/presentation` with one-click scenario cards and preloaded results.
- [ ] Add an explicit “live analysis / prepared example” indicator.
- [ ] Produce `architecture.md`, `setup.md`, and `judging-demo-script.md` from the delivered system.
- [ ] Run visual QA: mobile, large-text, keyboard-only, empty/error states, and contrast checks.
- [ ] Add API and contract tests for fixture fallbacks.
- [ ] Rehearse a 3-minute flow: problem → scam → document → extension → close.

**Done when:** every prepared scenario completes without a network dependency, no critical console errors remain, and a new presenter can follow the script.

## API surface

| Route | Phase | Purpose |
|---|---:|---|
| `GET /health` | 2 | API health check |
| `POST /v1/analyze/scam` | 2 | Scam text, URL, and image analysis |
| `POST /v1/analyze/document` | 2 | Document explanation |
| `POST /v1/analyze/page` | 3 | Extension page simplification |
| `POST /v1/analyze/voice` | 4 | Transcribe and explain voice note |
| `POST /v1/webhooks/whatsapp` | 4 | WhatsApp Cloud API seam |

## Deliberately not building

- Native mobile app — WhatsApp, web, and Chrome cover the demo.
- Independent AI microservices — one Fastify app is easier to validate and present.
- Custom models or offline inference — provider APIs are sufficient.
- Full accounts, analytics, billing, or retention systems — no value for the judge journey.
- Medical diagnosis — Guardian explains and flags information only.

## Current status

**Phase 1 — complete.** The Next.js product shell, interactive demo lab, shared contracts, and fixture catalogue are in place. Phase 2 is next.
