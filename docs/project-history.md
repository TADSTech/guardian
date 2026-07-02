# Guardian Project History

This document chronicles the step-by-step development history of the Guardian family digital safety net.

---

## 📅 Timeline & Accomplished Milestones

### Phase 1: Core Scaffolding & Shared Typings
* **Shared Typings**: Defined standard TypeScript interfaces in `packages/contracts` for analysis requests and responses (kind, riskLevel, riskScore, evidence, actions, disclaimer).
* **Next.js Dashboard Scaffolding**: Setup dashboard layouts, tabs, custom CSS variables (emerald green/cream), and routing structure in `apps/web`.
* **Fastify Server setup**: Created the `apps/api` workspace and configured the base server with CORS, health routes, and modular request handlers.

### Phase 2: Analysis Engine & WhatsApp Bot Core
* **Analysis Engine**: Created `apps/api/src/analysis/engine.ts` supporting fixture lookups and offline fallback heuristic classifiers.
* **Direct Baileys Bot**: Developed the socket listener in `apps/api/src/whatsapp/connection.ts` managing the direct client connection via pairing codes and auto-answering forwarded text/media.
* **WhatsApp Cloud Webhooks**: Exposed webhook routes in `apps/api/src/index.ts` supporting validation challenges and idempotency caches for Meta Cloud API integration.

### Phase 3: Chrome Extension & Sideloading
* **Unpacked Extension**: Created the Chrome extension folder containing the manifest, popup HTML, and content scripts.
* **Accessibility Features**: Implemented **Elderly Mode** (large fonts and high contrast), **Focus Mode** (clearing page clutter), **Read Aloud** (SpeechSynthesis), and **Simplify Content** (API integration).
* **Package Zip**: Bundled the extension into a zip file inside the dashboard public directory to make it immediately downloadable.

### Phase 4: Database Persistence & AI Upgrades
* **SQLite Database**: Set up `apps/api/src/database.ts` using `bun:sqlite` to log analysis actions and user feedback locally. Exponent history routes to the dashboard.
* **Live OpenAI Vision/Text API**: Integrated live Chat Completion calls to `gpt-4o-mini` with base64 Vision capabilities, falling back gracefully to offline heuristics when the API key is absent.

### Phase 5: Presentation Mode & UI Polishing
* **Judge Presentation Hub**: Created the `/presentation` screen letting presenters run one-click scenarios without waiting for user typing.
* **Design & Icon Upgrade**: Replaced all emojis in the web frontend and extension with clean, responsive Lucide React icons and inline SVGs. Wired **GSAP** entrance cascades and Material UI **Tooltips** for refined visual polish.
