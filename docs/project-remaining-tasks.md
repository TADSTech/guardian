# Guardian: Remaining Production Tasks

This document outlines the engineering and design tasks remaining to move the Guardian prototype into production-readiness.

---

## 🛠️ Outstanding Technical Tasks

### 1. Webhook Signature Verification
* **Objective**: Secure the Fastify `POST /v1/webhooks/whatsapp` receiver.
* **Requirements**: Verify the SHA-256 HMAC signature sent by Meta (`X-Hub-Signature-256`) against the local `APP_SECRET` to reject spoofed webhooks.

### 2. Actual Speech-to-Text (STT) for Voice Notes
* **Objective**: Replace the voice-note fixture lookups with actual transcription.
* **Requirements**: Connect to OpenAI Whisper API (or local Whisper bindings) to transcribe incoming `.ogg` WhatsApp audio notes before sending the text to the security analysis engine.

### 3. Production Session State Store (Redis)
* **Objective**: Replace the local file-based `auth_info_guardian` multi-file credentials storage.
* **Requirements**: Write a custom Baileys authentication provider that saves session credentials into Redis or a secure database to support container scaling (Docker/Kubernetes).

### 4. Security Red Teaming (Prompt Injection Defense)
* **Objective**: Bulletproof the system prompt against malicious inputs designed to bypass the classifier.
* **Requirements**: Perform testing with adversarial prompts and enforce input isolation using XML blocks and pre-classification heuristics.

### 5. Compliance & Terms of Service Audit
* **Objective**: Provide legal disclaimers for the medical translation and scam warning systems.
* **Requirements**: Draft standard disclaimers, clarify NDPR (Nigeria Data Protection Regulation) user privacy guidelines, and ensure banking and medical data are processed entirely in-memory.
