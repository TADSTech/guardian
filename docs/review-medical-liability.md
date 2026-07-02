# Human Review: Medical & Liability Boundaries

This document details critical legal, compliance, and medical safety considerations surrounding Guardian's document explainer module.

---

## ⚕️ 1. Healthcare Translation Boundaries
* **Module**: Document Analysis (e.g. summarizing handwritten prescriptions and dosage details).
* **Risks**:
  * Medical instructions are highly sensitive. A single hallucinated number (e.g. translating "take once daily" to "take three times daily") could cause critical overdoses or health issues.
  * Guardian must NEVER be perceived as a replacement for professional clinical advice.
* **Human Review Action Items**:
  * [ ] Verify the system prompt forces the model to include standard, context-appropriate warnings when processing medical terms.
  * [ ] Ensure the prompt explicitly instructs the LLM to write: *"Always consult your doctor or pharmacist to confirm dosage instructions. Do not change dosages based on this automated report."*
  * [ ] Ensure the disclaimer is displayed in bold/high-contrast formatting on both the dashboard and the WhatsApp reply templates.

---

## ⚖️ 2. Legal Disclaimers & Terms of Service
* **Vulnerability**: Vulnerable users or family sponsors might rely completely on Guardian's safety classification to make financial decisions. If a scam slip past the filter and results in financial loss, liability becomes a concern.
* **Human Review Action Items**:
  * [ ] Draft a Terms of Service (ToS) and Privacy Policy that clearly states Guardian is a secondary safety assistant and does not guarantee 100% phishing detection.
  * [ ] Audit GDPR / NDPR (Nigeria Data Protection Regulation) compliance: Ensure that user-submitted texts and images are processed in-memory and are NOT logged or stored in external history logs if they contain Personally Identifiable Information (PII), such as actual banking details or medical credentials, unless explicitly consented.
