import type { AnalysisResult } from "@guardian/contracts";

export type DemoFixture = {
  id: "bank-otp" | "amoxicillin-prescription" | "voice-otp";
  kind: "scam" | "document" | "voice";
  title: string;
  prompt: string;
  mediaLabel: string;
  result: AnalysisResult;
};

// Single source of truth for prepared demo results. Both apps/api (as the
// real API's fixture responses) and apps/web (as the presentation page's
// offline fallback, and the landing page demo lab's prepared examples) read
// from here, so the two can't silently drift apart the way they used to.
export const demoFixtures: DemoFixture[] = [
  {
    id: "bank-otp",
    kind: "scam",
    title: "Urgent prize message",
    prompt: "A prize message asks for my bank details.",
    mediaLabel: "Scam screenshot",
    result: {
      kind: "scam",
      riskLevel: "high",
      riskScore: 95,
      explanation: "This message is a classic phishing scam. It creates a false sense of urgency (claiming your account will be suspended today) and asks you to share your One-Time Password (OTP) or click a link. Legitimate banks will never ask you to send your OTP or passwords.",
      evidence: [
        "Asks for sensitive credentials (OTP/Password)",
        "Uses urgent language ('closed today')",
        "Sent from an unofficial/unknown number",
      ],
      actions: [
        "Do NOT click any links in the message.",
        "Do NOT share your OTP, PIN, or password with anyone.",
        "Delete the message immediately.",
        "Contact your bank directly using the phone number printed on the back of your debit card to verify.",
      ],
      disclaimer: "Guardian is an automated helper. Please verify with your financial institution.",
    },
  },
  {
    id: "amoxicillin-prescription",
    kind: "document",
    title: "Prescription",
    prompt: "What does this prescription mean?",
    mediaLabel: "Prescription image",
    result: {
      kind: "document",
      riskLevel: "low",
      riskScore: 10,
      explanation: "This prescription is for Amoxicillin, an antibiotic used to treat bacterial infections. It specifies a dosage of 500mg, to be taken three (3) times daily. Please ensure you complete the full course of antibiotics as prescribed by your doctor, even if you feel better.",
      evidence: [
        "Identified medication: Amoxicillin 500mg",
        "Indicated schedule: 3 times daily",
        "Document appears to be a legitimate doctor's prescription",
      ],
      actions: [
        "Take the medication exactly as directed by your healthcare provider.",
        "Complete the full course of antibiotics to prevent resistance.",
        "Consult a pharmacist or doctor if you experience side effects like rash, swelling, or severe diarrhea.",
      ],
      disclaimer: "This summary is for informational purposes only. Do not make medical decisions without consulting a qualified clinician.",
    },
  },
  {
    id: "voice-otp",
    kind: "voice",
    title: "OTP voice note",
    prompt: "What does this message mean?",
    mediaLabel: "Voice note",
    result: {
      kind: "voice",
      riskLevel: "high",
      riskScore: 90,
      explanation: "The voice message is asking you to read back or send a verification code (OTP). This is a common tactic used by fraudsters to hijack your accounts (like WhatsApp or bank apps). Legitimate companies will never call or send voice notes asking you to share your OTP.",
      evidence: [
        "Voice request asks for verification code/OTP",
        "Urgent tone or suspicious sender identity",
      ],
      actions: [
        "Do NOT share the OTP or any verification codes.",
        "Hang up or ignore the message.",
        "Enable two-step verification (2FA) on your WhatsApp and banking apps.",
      ],
      disclaimer: "Guardian is an automated helper. Keep your credentials private.",
    },
  },
];
