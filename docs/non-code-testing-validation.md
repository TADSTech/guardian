# Non-Code Deliverables: Testing & User Validation

This document outlines the manual testing, user feedback sessions, and accessibility validation procedures required before releasing Guardian to the public.

---

## 👵 1. Vulnerable User Focus Groups
* **Objective**: Validate readability, vocabulary translation, and simplicity of safety reviews with actual target demographics (elderly users and digital novices).
* **Action Items**:
  * [ ] **Test Group Selection**: Recruit 5-10 elderly dependents and their family sponsors in Nigeria to use the WhatsApp Bot for 1 week.
  * [ ] **Readability Audits**: Verify if translated warnings in Pidgin or Yoruba are understood instantly. Adjust System prompts if users find terms confusing.
  * [ ] **Interviews**: Collect user feedback on whether they felt safe forwarding suspicious links to the bot.

---

## 🛡️ 2. Accessibility Companion Validation
* **Objective**: Verify that the browser extension companion functions correctly across various assistive tools.
* **Action Items**:
  * [ ] **Screen Reader Audit**: Test the dashboard and extension buttons with screen readers (NVDA, JAWS, or VoiceOver) to verify ARIA tags and tab indexes.
  * [ ] **Contrast Verification**: Use contrast checkers to verify that Elderly Mode text styling meets WCAG AAA guidelines (minimum 7:1 ratio).
  * [ ] **Clearness & Focus Testing**: Test Focus Mode on 10 popular news websites to check if distracting banner ads and cookie popups are successfully hidden without breaking core content.

---

## 📊 3. Feedback Forms & NPS Surveys
* **Objective**: Measure family sponsor satisfaction and dependent safety improvement.
* **Action Items**:
  * [ ] **Sponsor Survey**: Create an Net Promoter Score (NPS) email survey asking sponsors: *"How likely are you to recommend Guardian to protect your parents?"*
  * [ ] **Threat Verification Form**: Create a simple Google Form/Airtable sheet for sponsors to report false positives (safe texts marked as scam) or false negatives (missed scams).
