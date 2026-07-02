# Guardian: The Digital Safety Net for Vulnerable Nigerians

**Guardian** is an AI-powered, WhatsApp-first digital safety assistant designed to protect vulnerable populations—such as the elderly, children, and first-time internet users—from online scams, confusing documents, and malicious links.

It acts as a trusted family member, analyzing suspicious content in local languages (Pidgin, Hausa, Yoruba, Igbo) and explaining the risks simply and calmly.

## The Pitch

In an era of sophisticated digital fraud, digital literacy is not enough to protect our most vulnerable. Guardian provides a managed safety layer that intercepts threats before they cause harm. 

**Key Features we are delivering:**
- **Omni-channel Protection:** Works where the users are—via WhatsApp Bot, SMS, and a Browser Extension.
- **Family Monitoring (Parental & Eldercare Controls):** Allows designated family members (sponsors) to monitor the digital safety of their kids or elderly parents. Sponsors receive alerts for high-risk encounters and can review a history of intercepted scams.
- **Local Language AI Summaries:** Understands Nigerian context and translates complex risks into simple, actionable advice in local languages.
- **Data Export & Reporting:** Generate PDF reports of safety metrics to share with authorities or for personal record-keeping.
- **Privacy-First Architecture:** Keeps data minimized and processed with consent.

## Architecture

This repository is a hackathon-focused monorepo containing the Guardian ecosystem:

```text
guardian/
├── apps/
│   ├── web/                    # Next.js Dashboard (Family Monitoring, Settings, Scanner)
│   ├── api/                    # Fastify Backend (AI Analysis, WhatsApp webhooks)
│   └── extension/              # Chrome Manifest V3 Accessibility & Phishing Overlay
├── packages/
│   ├── contracts/              # Shared types and API schemas
│   └── demo-fixtures/          # Reliable mock data for flawless presentations
└── docs/                       # Product roadmap and design guidelines
```

## Guiding Principles
- **Safety over confidence:** If Guardian is unsure, it escalates to the family sponsor.
- **Dignity in design:** No technical jargon. Just clear, safe next steps.
- **Accessibility:** High contrast, large text, keyboard support.

---
*Built for the moments you pause and wonder.*
