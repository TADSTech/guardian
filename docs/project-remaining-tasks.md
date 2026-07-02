# Guardian: Remaining Production Tasks

This document outlines the engineering and design tasks remaining to move the Guardian prototype into production-readiness, plus a full codebase-vs-docs audit performed on 2026-07-02.

---

## 🛠️ Outstanding Technical Tasks

### 1. Webhook Signature Verification
* **Objective**: Secure the Fastify `POST /v1/webhooks/whatsapp` receiver.
* **Requirements**: Verify the SHA-256 HMAC signature sent by Meta (`X-Hub-Signature-256`) against the local `APP_SECRET` to reject spoofed webhooks.
* **Status**: ⚠️ Confirmed still missing by audit — see Critical #1 below.

### 2. Actual Speech-to-Text (STT) for Voice Notes
* **Objective**: Replace the voice-note fixture lookups with actual transcription.
* **Requirements**: Connect to OpenAI Whisper API (or local Whisper bindings) to transcribe incoming `.ogg` WhatsApp audio notes before sending the text to the security analysis engine.
* **Status**: ⚠️ Confirmed still missing by audit — see High #2 below.

### 3. Production Session State Store (Redis)
* **Objective**: Replace the local file-based `auth_info_guardian` multi-file credentials storage.
* **Requirements**: Write a custom Baileys authentication provider that saves session credentials into Redis or a secure database to support container scaling (Docker/Kubernetes).

### 4. Security Red Teaming (Prompt Injection Defense)
* **Objective**: Bulletproof the system prompt against malicious inputs designed to bypass the classifier.
* **Requirements**: Perform testing with adversarial prompts and enforce input isolation using XML blocks and pre-classification heuristics.
* **Status**: ⚠️ Confirmed still missing by audit — see Critical #3 below.

### 5. Compliance & Terms of Service Audit
* **Objective**: Provide legal disclaimers for the medical translation and scam warning systems.
* **Requirements**: Draft standard disclaimers, clarify NDPR (Nigeria Data Protection Regulation) user privacy guidelines, and ensure banking and medical data are processed entirely in-memory.
* **Status**: ⚠️ Partially contradicted by audit — see Critical #5 below (raw analysis results, including user content, are currently persisted to SQLite unredacted).

---

## 🔍 Audit Findings: Codebase vs. Docs (2026-07-02)

A full pass compared every claim across the 19 project docs against the actual implementation in `apps/api`, `apps/web`, `apps/extension`, `packages/contracts`, and `packages/demo-fixtures`. Findings below are ranked by severity to guide the order of future implementation work. All are documentation-only findings — no code has been changed yet.

### Critical

1. **Webhook signature verification absent.** `apps/api/src/index.ts:146-151` accepts `POST /v1/webhooks/whatsapp` payloads without checking `X-Hub-Signature-256` at all — only `body.object === "whatsapp_business_account"` is validated. Confirms `docs/review-security-auth.md`.
2. **No rate limiting or request-size limits.** `@fastify/rate-limit` is not installed, and no 5MB image / 2000-character text caps exist anywhere in `apps/api`. Any analysis endpoint can be hit without limit, risking OpenAI cost exhaustion. Confirms `docs/review-ai-guardrails.md`.
3. **No prompt-injection defenses.** The system prompt in `apps/api/src/analysis/engine.ts:136-150` passes raw user-submitted text/images directly into the message content with no XML delimiting or input isolation. Confirms `docs/review-ai-guardrails.md`.
4. **WhatsApp session credentials not gitignored at package level.** `apps/api/src/whatsapp/connection.ts:37` resolves session storage to `apps/api/auth_info_guardian/`, but there is no `.gitignore` inside `apps/api/`, and the root `.gitignore` does not cover this path either. Risk of committing live WhatsApp session tokens. Confirms `docs/review-security-auth.md`.
5. **Raw analysis results persisted unredacted.** `apps/api/src/database.ts`'s `analysis.result_json` column stores the full result object — including echoed user content/evidence — with no PII filtering before save (`engine.ts:220-228`). Contradicts the in-memory-only privacy intent in `docs/review-medical-liability.md` and `docs/ROADMAP.md`'s "process uploads in memory where possible; do not retain them by default."
6. **CORS is wide open.** `apps/api/src/index.ts:15-18` sets `origin: true` with a comment noting "for the hackathon demo" — this is a real exposure if ever deployed as-is.
7. **Export & Reports feature is a non-functional stub.** `apps/web/app/dashboard/page.tsx:218-223`'s `handleExport()` always transitions to an error state after a hardcoded 2.5s timeout; no PDF or CSV is ever generated. Directly contradicts `PITCH.md` and `docs/pitch-off.md`'s claims of downloadable CSV incident reports "to submit as evidence to banks or authorities."

### High

1. **AI model contradicts docs.** The engine uses OpenAI Chat Completions with `gpt-4o-mini` (`apps/api/src/analysis/engine.ts:161-176`), while `docs/ROADMAP.md` states "OpenAI Responses API with GPT-5 family models." `docs/project-history.md` and `PITCH.md` already (correctly) describe the gpt-4o-mini reality, so `ROADMAP.md` is the outdated one.
2. **Voice transcription (STT) is fully stubbed.** Both the direct Baileys path (`apps/api/src/whatsapp/connection.ts:145-150`) and the Cloud webhook path (`apps/api/src/index.ts:199-201`) hardcode placeholder text ("Voice message input" / "Voice note") and always return the `voice-otp` fixture — no audio is ever transcribed.
3. **Floating Guardian button is not gated by user activation.** `apps/extension/content.js:186-227,310` calls `createOverlay()` unconditionally during script init, injecting the button and panel on every page load. Contradicts `docs/ROADMAP.md` Phase 3's "injected only after user activation" and raises an unstated user-consent concern (the extension also runs a phishing keyword scan automatically on every page with no notice).
4. **Dashboard "Connected Members" and "Threat Interception Log" are hardcoded.** `apps/web/app/dashboard/page.tsx:18-28` defines these as static arrays (e.g. "Mama," "Tunde," fixed alert timestamps) with no `fetch()` to any API. `docs/judging-demo-script.md` and `PITCH.md` describe this section as if it reflects real interception activity.
5. **`localhost:5000` is hardcoded throughout.** `apps/extension/content.js:280`, multiple call sites in `apps/web/app/dashboard/page.tsx`, and `apps/web/app/presentation/page.tsx:61` all hardcode the API origin. This breaks any deployment off a single local machine (e.g. presenting from a laptop with the extension calling a different host).

### Medium

1. **Three inconsistent color palettes exist.** `docs/design-system.md`, `docs/non-code-design-assets.md`, and the actual tokens in `apps/web/app/globals.css` (`--ink`, `--cream`, `--leaf`, `--deep`, `--danger`, `--mint`) all specify different hex values. There is no single source of truth for Guardian's brand colors.
2. **Elderly Mode understates its own claim.** `apps/extension/content.js:129-136` sets `font-size: 110% !important` — a 10% increase — while `docs/judging-demo-script.md` and `docs/project-history.md` describe it as doubling font size.
3. **`demo-lab.tsx` is orphaned.** `apps/web/components/demo-lab.tsx` is fully implemented but never imported or rendered anywhere in the app, despite `docs/ROADMAP.md` Phase 1 listing a "demo lab shell with Scam Detector, Document Explainer, and Voice Assistant tabs" as a deliverable.
4. **`packages/contracts` structure doesn't match `architecture.md`.** The package is a single flat `src/index.ts`; `docs/architecture.md` documents `http/`, `events/`, and `models/` subfolders that don't exist. Types are still correctly shared and consumed by both `apps/web` and `apps/api` — this is a documentation-structure mismatch, not a functional gap.
5. **Login system is undocumented.** `apps/web/app/login/page.tsx` implements a `localStorage`-only fake authentication flow (no backend, passwords stored client-side in JSON) that isn't mentioned in any doc.
6. **Presentation mode's offline fallback can mismatch fixture narrative.** `apps/web/app/presentation/page.tsx:76-108`'s hardcoded fallback results (used when the API is unreachable) aren't keyed to the same fixture data as the live path, risking a mismatched story if the API goes down mid-demo.
7. **Focus Mode selectors are overly broad.** `apps/extension/content.js:138-149` hides any element whose `class`/`id` merely contains the substring `"ad"` (e.g. would also match "breadcrumb"), risking legitimate content being hidden on some sites.
8. **Webhook idempotency dedup is in-memory only.** `apps/api/src/index.ts`'s `processedMessageIds` Set (capped at 1000 entries) resets on every server restart and isn't shared across instances — not durable enough for anything beyond a single-process demo.

### Low

1. **`PITCH.md:55` incorrectly claims a Python/Flask backend.** The entire backend is Node.js/Fastify/Bun; no Python exists anywhere in the repository.
2. **Large-text mode is undelivered.** `docs/design-system.md` lists it as a dashboard accessibility setting, but no such toggle or state exists anywhere in `apps/web`.
3. **`apps/api/README.md` and `apps/extension/README.md` are stale stubs.** Both still read "Phase 2 will introduce..." / "Phase 3 will introduce...", despite those phases being complete per `docs/project-history.md`.
4. **Several working API routes are undocumented in `docs/ROADMAP.md`'s API surface table.** `GET /v1/analyze/history`, `POST /v1/feedback`, `GET /v1/whatsapp/status`, `POST /v1/whatsapp/connect`, and `POST /v1/whatsapp/disconnect` all exist and function but aren't listed alongside the other routes.
5. **Manual Scanner's "Voice Note" tab is deliberately disabled**, with an explanatory tooltip ("Voice analysis is processed automatically via WhatsApp Bot notes") in `apps/web/app/dashboard/page.tsx:500-504`. Not a bug — flagged here only as a known, intentional limitation worth tracking.
