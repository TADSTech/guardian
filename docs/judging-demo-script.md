# Guardian Judging Demo Script

Follow this script to deliver a flawless, high-impact 3-minute demo to the hackathon judges.

---

## ⏱️ Timeline overview
* **0:00 - 0:45**: The Hook & Connected Dashboard (Family Safety)
* **0:45 - 1:15**: Localization & Dignity in Design
* **1:15 - 2:00**: Live Manual Scanner & Heuristics
* **2:00 - 2:45**: Chrome Extension Sideloading (Elderly & Focus Toggles)
* **2:45 - 3:00**: Summary, Impact, and Closing

---

## 🎬 Step-by-Step Walkthrough

### Step 1: The Hook & Connected Dashboard
1. Open the dashboard at `http://localhost:3000/dashboard`.
2. **Pitch**: *"This is the central command center where a tech-savvy family sponsor (e.g. son or daughter) monitors the safety of their dependents. Mama is protected via our WhatsApp Bot, and Tunde is protected via the Chrome browser extension. Over here in the Threat Interception Log, you can see real-world scam interceptions."*
3. Show the **Threat Interception Log** and point out the critical severity warnings.

### Step 2: Google Translate Localization
1. Click the **Google Translate** widget in the top right.
2. Select **Nigerian Pidgin**, **Yoruba**, or **Hausa**.
3. **Pitch**: *"Security jargon is useless if a grandmother can't understand it. With zero-latency client translation, the entire safety net localizes instantly to their native tongue, preserving their dignity."*

### Step 3: The Manual Scanner & OCR Document Explainer
1. Select the **Manual Scanner** tab.
2. Select the **Paste Text** sub-tab and paste:
   > "Congratulations! You have been selected to receive 50,000 Naira. Click the link to claim your prize..."
3. Click **"Analyze for Safety"**.
4. **Pitch**: *"Guardian parses incoming content using local scam heuristic classifiers (falling back to OpenAI GPT models when online). It breaks down the analysis into: (1) what this is, (2) the risk rating, (3) detected evidence, and (4) safe next steps, ensuring the user is never left in the dark."*
5. Highlight the **Evidence Detected** and **Safe Next Steps** sections.

### Step 4: Chrome Extension Sideloading
1. Click **"Install Extension"** under the **Family Safety** tab.
2. Sideload the unpacked extension via `chrome://extensions` in Chrome Developer Mode.
3. Open any website (or a test page). Click the green shield icon (🛡️) on the bottom right.
4. Toggle **Elderly Mode**: Note how page font sizes double and background contrast sharpens.
5. Toggle **Focus Mode**: Note how ads, sidebars, and confusing headers disappear.
6. Click **Simplify page**: View the quick clean summary of the site content.
7. Click **Read aloud**: Demonstrates browser speech synthesis reading content out.
8. **Pitch**: *"For kids and older adults using laptops, the companion injects right into the page. It highlights dangerous terms (like OTP, BVN, password) in red, offers large fonts, reads text aloud, and declutters busy layouts."*

### Step 5: Presentation Hub (One-Click Scenarios)
1. Navigate to `http://localhost:3000/presentation`.
2. Show the judges the one-click Scenario cards (Scam Message, Healthcare Prescription, Voice Verification).
3. Click **Scenario 2 (Prescription)**: Show how a medical prescription document is instantly processed and translated into safe dosages without medical jargon.
4. **Pitch**: *"By running a presentation companion, presenters can showcase all user journeys in under 15 seconds without waiting for networks or APIs."*
