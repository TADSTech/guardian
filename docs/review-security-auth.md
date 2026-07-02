# Human Review: Security & Authentication

This document details critical security and authentication aspects of the Guardian application that require manual inspection, verification, and hardening before production deployment.

---

## 🔒 1. WhatsApp Session Credentials Storage
* **File Location**: `apps/api/auth_info_guardian/`
* **Mechanism**: Direct file-system state storage used by the `@whiskeysockets/baileys` socket client to keep WhatsApp authentication credentials (keys, tokens, and signal protocols).
* **Risks**:
  * If these session files are compromised, an attacker can hijack the WhatsApp connection, read messages, and impersonate the Guardian bot.
  * Inadvertent commits to public source repositories would leak live WhatsApp session tokens.
* **Human Review Action Items**:
  * [ ] Verify that `auth_info_guardian` is explicitly added to the monorepo's `.gitignore` at both root and package levels.
  * [ ] Audit production storage: For cloud deployments (e.g. AWS, GCP), session state should be encrypted at rest or stored in a secure Redis/database store rather than unencrypted local disk folders.

---

## 🌐 2. Webhook Signature Validation
* **Endpoint**: `POST /v1/webhooks/whatsapp`
* **Current State**: The endpoint currently accepts incoming JSON payloads from Meta without checking the cryptographic signature.
* **Risks**:
  * Attackers can send spoofed JSON payloads directly to this endpoint, triggering false safety logs and spamming users.
* **Human Review Action Items**:
  * [ ] Implement cryptographic verification of the `X-Hub-Signature-256` header.
  * [ ] Securely store Meta's App Secret in a secure secrets manager (like Vault or AWS Secrets Manager) and verify signatures using a SHA-256 HMAC.
  * [ ] Verify webhook verification tokens matches standard environment variables before accepting incoming webhooks.
