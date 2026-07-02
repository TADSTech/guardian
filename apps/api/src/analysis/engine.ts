import type { AnalysisKind, AnalysisResult, RiskLevel } from "@guardian/contracts";
import { dbService } from "../database";

export const FIXTURE_RESULTS: Record<string, AnalysisResult> = {
  "bank-otp": {
    kind: "scam",
    riskLevel: "high",
    riskScore: 95,
    explanation: "This message is a classic phishing scam. It creates a false sense of urgency (claiming your account will be suspended today) and asks you to share your One-Time Password (OTP) or click a link. Legitimate banks will never ask you to send your OTP or passwords.",
    evidence: [
      "Asks for sensitive credentials (OTP/Password)",
      "Uses urgent language ('closed today')",
      "Sent from an unofficial/unknown number"
    ],
    actions: [
      "Do NOT click any links in the message.",
      "Do NOT share your OTP, PIN, or password with anyone.",
      "Delete the message immediately.",
      "Contact your bank directly using the phone number printed on the back of your debit card to verify."
    ],
    disclaimer: "Guardian is an automated helper. Please verify with your financial institution."
  },
  "amoxicillin-prescription": {
    kind: "document",
    riskLevel: "low",
    riskScore: 10,
    explanation: "This prescription is for Amoxicillin, an antibiotic used to treat bacterial infections. It specifies a dosage of 500mg, to be taken three (3) times daily. Please ensure you complete the full course of antibiotics as prescribed by your doctor, even if you feel better.",
    evidence: [
      "Identified medication: Amoxicillin 500mg",
      "Indicated schedule: 3 times daily",
      "Document appears to be a legitimate doctor's prescription"
    ],
    actions: [
      "Take the medication exactly as directed by your healthcare provider.",
      "Complete the full course of antibiotics to prevent resistance.",
      "Consult a pharmacist or doctor if you experience side effects like rash, swelling, or severe diarrhea."
    ],
    disclaimer: "This summary is for informational purposes only. Do not make medical decisions without consulting a qualified clinician."
  },
  "voice-otp": {
    kind: "voice",
    riskLevel: "high",
    riskScore: 90,
    explanation: "The voice message is asking you to read back or send a verification code (OTP). This is a common tactic used by fraudsters to hijack your accounts (like WhatsApp or bank apps). Legitimate companies will never call or send voice notes asking you to share your OTP.",
    evidence: [
      "Voice request asks for verification code/OTP",
      "Urgent tone or suspicious sender identity"
    ],
    actions: [
      "Do NOT share the OTP or any verification codes.",
      "Hang up or ignore the message.",
      "Enable two-step verification (2FA) on your WhatsApp and banking apps."
    ],
    disclaimer: "Guardian is an automated helper. Keep your credentials private."
  }
};

/**
 * Heuristics-based local fallback when OpenAI API is not configured.
 */
export function analyzeLocalHeuristic(text: string, kind: AnalysisKind): AnalysisResult {
  const normalized = text.toLowerCase();
  
  if (kind === "scam" || kind === "page") {
    const hasPhishingKeywords = ["bvn", "otp", "password", "pin", "verify", "suspend", "prize", "winner", "account", "bank", "transfer", "50,000", "naira", "card"].some(kw => normalized.includes(kw));
    const hasUrgentKeywords = ["urgent", "today", "immediately", "now", "critical", "blocked"].some(kw => normalized.includes(kw));
    
    if (hasPhishingKeywords && hasUrgentKeywords) {
      return {
        kind,
        riskLevel: "high",
        riskScore: 85,
        explanation: "Guardian has detected multiple high-risk indicators. The text asks for sensitive verification codes or banking terms, combined with urgent demands. This is highly likely to be a scam.",
        evidence: ["Contains banking/verification keywords", "Creates extreme urgency"],
        actions: [
          "Do not share any codes or credentials.",
          "Do not click any links in this text.",
          "Verify the sender's identity independently."
        ],
        disclaimer: "Guardian is an automated assistant. Stay vigilant."
      };
    } else if (hasPhishingKeywords) {
      return {
        kind,
        riskLevel: "medium",
        riskScore: 50,
        explanation: "This text contains terms commonly associated with account settings or security questions. While it may be legitimate, treat it with caution.",
        evidence: ["Contains sensitive terms (account, verify, or prize)"],
        actions: [
          "Be careful before clicking links.",
          "Do not enter personal passwords or pins."
        ],
        disclaimer: "Guardian is an automated assistant."
      };
    }
  } else if (kind === "document") {
    const isMedical = ["mg", "tablet", "capsule", "dose", "prescription", "take", "daily", "doctor"].some(kw => normalized.includes(kw));
    if (isMedical) {
      return {
        kind,
        riskLevel: "low",
        riskScore: 15,
        explanation: `This document contains medical terms and instructions. Guardian suggests reviewing them carefully. It appears to be: "${text.slice(0, 100)}..."`,
        evidence: ["Contains medical dosage terms"],
        actions: [
          "Consult with your doctor or pharmacist to confirm dosage.",
          "Keep prescriptions in a safe place."
        ],
        disclaimer: "This summary is for information only. Refer to a licensed medical doctor for decisions."
      };
    }
  }

  return {
    kind,
    riskLevel: "low",
    riskScore: 5,
    explanation: "Guardian found no obvious scam indicators or urgent warnings in this text. It seems safe for general reading.",
    evidence: ["No phishing keywords detected", "No urgent tone found"],
    actions: ["No immediate actions required."],
    disclaimer: "Guardian helper check complete."
  };
}

/**
 * Perform Live OpenAI Analysis
 */
async function analyzeOpenAI(
  apiKey: string,
  kind: AnalysisKind,
  input: { text?: string; url?: string; fileName?: string }
): Promise<AnalysisResult> {
  const textToAnalyze = input.text || input.url || input.fileName || "";
  const isImageBase64 = textToAnalyze.startsWith("data:image/");

  const systemPrompt = `You are Guardian, an empathetic, calm, and digital safety assistant for vulnerable people in Nigeria. 
You explain digital safety risks (phishing, bank scams, urgent alerts) or translate confusing documents (like medical prescriptions and forms) into very simple language.
Keep sentences short and direct. Avoid technical jargon entirely. Deliver explanations in clear, simple English.
If analyzing a healthcare document or medical prescription, explicitly remind the user to consult a doctor, and state that this is for informational purposes only.

You MUST format your output as a JSON object matching this schema:
{
  "kind": "${kind}",
  "riskLevel": "low" | "medium" | "high",
  "riskScore": number (0 to 100),
  "explanation": "A gentle, plain explanation under 3 sentences describing what the input is and why it might be risky.",
  "evidence": ["First specific warning sign", "Second warning sign"],
  "actions": ["Step-by-step simple action 1", "Step-by-step simple action 2"],
  "disclaimer": "Standard context-appropriate disclaimer."
}`;

  let userContent: any = textToAnalyze;
  if (isImageBase64) {
    userContent = [
      { type: "text", text: "Analyze this image for safety or document details." },
      { type: "image_url", image_url: { url: textToAnalyze } }
    ];
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent }
        ],
        temperature: 0.2
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API returned status ${response.status}`);
    }

    const data = await response.json();
    const resultText = data.choices[0]?.message?.content;
    if (!resultText) throw new Error("Empty response from OpenAI");

    return JSON.parse(resultText) as AnalysisResult;
  } catch (err) {
    console.error("OpenAI analysis failed, falling back to local heuristics", err);
    return analyzeLocalHeuristic(isImageBase64 ? "Uploaded Image" : textToAnalyze, kind);
  }
}

/**
 * Main analysis function. Falls back to fixtures if fixtureKey matches,
 * then to OpenAI if apiKey is set, otherwise to local heuristics.
 */
export async function runAnalysis(
  kind: AnalysisKind,
  input: { text?: string; url?: string; fileName?: string },
  fixtureKey?: string
): Promise<AnalysisResult> {
  let result: AnalysisResult;

  // 1. Check if it's a known fixture
  if (fixtureKey && FIXTURE_RESULTS[fixtureKey]) {
    result = FIXTURE_RESULTS[fixtureKey];
  } else {
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      // 2. Live OpenAI Analysis
      result = await analyzeOpenAI(apiKey, kind, input);
    } else {
      // 3. Local Heuristic Fallback
      const textToAnalyze = input.text || input.url || input.fileName || "";
      result = analyzeLocalHeuristic(textToAnalyze, kind);
    }
  }

  // Save the result to SQLite database
  const analysisId = crypto.randomUUID();
  try {
    dbService.saveAnalysis({
      id: analysisId,
      kind: result.kind,
      fixture_key: fixtureKey || undefined,
      risk_level: result.riskLevel || "medium",
      result_json: JSON.stringify(result)
    });
  } catch (dbErr) {
    console.error("Failed to save analysis to SQLite database", dbErr);
  }

  return result;
}
