# Guardian: Remaining Production Tasks

This document outlines the engineering and design tasks remaining to move the Guardian prototype into production-readiness, plus a full codebase-vs-docs audit performed on 2026-07-02 and implemented on 2026-07-03.

Almost everything the audit found has since been fixed and verified (real browser tests, type checks, direct API tests) — see the ✅ notes below. A few items are intentionally still open because they need a product/legal decision rather than an engineering one; those are called out explicitly.

---

## 🛠️ Outstanding Technical Tasks

### 1. Webhook Signature Verification
* **Status**: ✅ Fixed. `apps/api/src/index.ts` now verifies `X-Hub-Signature-256` via HMAC-SHA256 against `WHATSAPP_APP_SECRET` before processing any webhook payload (falls back to permissive + a logged warning if the secret isn't configured, so local dev without Meta credentials still works).

### 2. Actual Speech-to-Text (STT) for Voice Notes
* **Status**: ✅ Fixed. `apps/api/src/analysis/engine.ts` now has a `transcribeAudio()` helper calling OpenAI Whisper, wired into both the direct Baileys bot (`whatsapp/connection.ts`) and the Cloud API webhook path (`index.ts`). Falls back to the `voice-otp` fixture when no `OPENAI_API_KEY` is configured.

### 3. Production Session State Store (Redis)
* **Status**: ⏳ Still open. `auth_info_guardian/` remains local-file-based (now at least `.gitignore`d — see Critical #4 below). Needed before this can run as more than one instance/container.

### 4. Security Red Teaming (Prompt Injection Defense)
* **Status**: ✅ Defensive code fixed. The system prompt in `engine.ts` now wraps untrusted content in `<user_content>` tags and explicitly instructs the model to never follow instructions found inside them. Actual adversarial red-teaming (running real attack prompts against it) hasn't been performed — that's a testing activity, not a code change, and should still happen before trusting this in production.

### 5. Compliance & Terms of Service Audit
* **Status**: ⏳ Still open — this needs legal review, not code. Related engineering fix already done: analysis results persisted to SQLite now have long digit runs (OTPs, PINs, BVNs, account/card numbers) redacted before storage (see Critical #5 below).

---

## 🔍 Audit Findings (2026-07-02) — Resolution Status (2026-07-03)

### Critical — all fixed
1. ✅ Webhook signature verification — see task #1 above.
2. ✅ Rate limiting + request size limits — `@fastify/rate-limit` (30 req/min), 8MB body cap, 2000-char text / 5MB image validation in `apps/api/src/index.ts`.
3. ✅ Prompt-injection defenses — see task #4 above.
4. ✅ `auth_info_guardian/` and `guardian.db` are now `.gitignore`d at `apps/api/.gitignore`; `guardian.db` untracked from git going forward. **Note**: old commits still contain prior snapshots of `guardian.db` in git history — purging that requires a history rewrite, which needs an explicit decision from the repo owner (not done here).
5. ✅ Raw PII no longer persisted — long digit runs are redacted before writing to `analysis.result_json` (the live API response to the user is unaffected, only what's stored).
6. ✅ CORS now allowlists `localhost:3000`/`127.0.0.1:3000` (configurable via `ALLOWED_ORIGINS`) plus any `chrome-extension://` origin, instead of `origin: true`.
7. ✅ Export & Reports CSV is now a real, working download built from `/v1/analyze/history`. The PDF option is honestly labeled "coming soon" (disabled) instead of simulating a fake export that always failed.

### High — all fixed
1. ✅ `docs/ROADMAP.md` corrected to say Chat Completions + `gpt-4o-mini` (matching the actual code), not GPT-5/Responses API.
2. ✅ Voice transcription implemented — see task #2 above.
3. ✅ Extension floating button no longer auto-injects; it's created only after the user clicks "Scan Page Now" in the toolbar popup.
4. ✅ Dashboard "Connected Members" and "Threat Interception Log" now derive from real state (WhatsApp connection status, `/v1/analyze/history`) instead of hardcoded arrays. The Browser Extension member is honestly labeled as an example, since the extension has no telemetry channel back to the API.
5. ✅ `localhost:5000` centralized into `apps/web/lib/api.ts` (`API_BASE_URL`, env-overridable via `NEXT_PUBLIC_API_URL`) and a single constant in `apps/extension/content.js`.

### Medium — all fixed
1. ✅ `docs/design-system.md` and `docs/non-code-design-assets.md` now document the actual palette from `apps/web/app/globals.css`, instead of two different unused palettes.
2. ✅ Elderly Mode fixed properly: switched from a per-element `font-size: %` (which compounded down the DOM tree — verified it nearly doubled text on just one level of nesting) to `zoom: 1.4` on `body`, which scales uniformly with no compounding.
3. ✅ `apps/web/components/demo-lab.tsx` is now wired into the landing page (`/#demo`) instead of sitting unused.
4. ✅ `packages/contracts`'s actual flat structure is now documented in `docs/architecture.md` instead of the unbuilt `http/`/`events/`/`models/` split.
5. ✅ The dashboard's `localStorage`-only login is now documented (`docs/setup.md`) as demo-only, not backed by real auth.
6. ✅ Presentation mode's offline fallback now reuses the same fixture data as the live API (moved into `packages/demo-fixtures`, the shared package that already existed for exactly this purpose), instead of hand-typed mock text that had drifted from the real fixtures.
7. ✅ Extension Focus Mode selectors changed from `[class*="ad"]` (matched "header", "shadow", "gradient", "download", etc.) to `[class~="ad"]`/`[class*="advert"]` (matches the actual word, verified with real false-positive/true-positive test cases).
8. ✅ Webhook idempotency moved from an in-memory `Set` to a SQLite-backed table (`processed_webhook_messages`), so it survives API restarts.

### Low — all fixed
1. ✅ `PITCH.md` corrected: backend is Node/Fastify/Bun, not Python/Flask.
2. ✅ `docs/design-system.md` corrected: no dashboard large-text-mode toggle exists (large text is currently only available via the extension's Elderly Mode).
3. ✅ `apps/api/README.md` and `apps/extension/README.md` rewritten to describe what's actually built instead of stale "Phase N will introduce..." stubs.
4. ✅ `docs/ROADMAP.md`'s API surface table now lists all real routes (`/v1/analyze/history`, `/v1/feedback`, `/v1/whatsapp/status`, `/v1/whatsapp/connect`, `/v1/whatsapp/disconnect`, the webhook verification `GET`).
5. Manual Scanner's disabled "Voice Note" tab remains as-is — it was never a bug, just a deliberate, already-explained limitation.

---

## What's genuinely still open

- **Redis/production session store** for WhatsApp credentials (task #3 above) — needed before running more than one instance.
- **Adversarial red-teaming** of the AI analysis endpoints — the defensive code is in place, but nobody's actually tried to break it yet.
- **Legal/compliance review** (ToS, NDPR) — not an engineering task.
- **Git history**: `guardian.db` was committed in earlier commits before this pass; old snapshots (which may include user-submitted scam/prescription text) still exist in history. Purging requires a history rewrite and explicit owner sign-off.
