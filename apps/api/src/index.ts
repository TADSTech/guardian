import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { createHmac, timingSafeEqual } from "node:crypto";
import { runAnalysis, transcribeAudio } from "./analysis/engine";
import { guardianWhatsApp } from "./whatsapp/connection";
import { dbService } from "./database";
import type { AnalysisRequest } from "@guardian/contracts";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fastifyStatic from "@fastify/static";
import fs from "node:fs";

// Requests larger than this are rejected outright. Sized to comfortably fit
// a base64-encoded 5MB image (which inflates to ~6.7MB) plus JSON overhead.
const MAX_REQUEST_BYTES = 8 * 1024 * 1024;
const MAX_TEXT_LENGTH = 2000;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const fastify = Fastify({
  logger: {
    level: "info",
  },
  bodyLimit: MAX_REQUEST_BYTES,
});

// Configure CORS. Allowed web origins come from ALLOWED_ORIGINS (comma-separated),
// defaulting to the local dashboard dev server. Chrome extension requests are
// always allowed since their origin (chrome-extension://<id>) is only reachable
// by the installed extension itself, not by arbitrary websites.
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:3000,http://127.0.0.1:3000")
  .split(",")
  .map((origin) => origin.trim());

await fastify.register(cors, {
  origin: (origin, callback) => {
    const isBrowserlessRequest = !origin; // curl, WhatsApp webhooks, server-to-server calls
    const isAllowed = isBrowserlessRequest || origin.startsWith("chrome-extension://") || allowedOrigins.includes(origin);
    callback(isAllowed ? null : new Error("Not allowed by CORS"), isAllowed);
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
});

// Protects the OpenAI-backed analysis endpoints from being used to run up
// API costs or exhaust the daily quota.
await fastify.register(rateLimit, {
  max: 30,
  timeWindow: "1 minute",
  allowList: (request: any) => {
    const url = request.raw.url || "";
    return url.includes("/whatsapp/status") || url.includes("/health");
  }
} as any);

// Keep the raw request bytes around so the WhatsApp webhook can verify
// Meta's HMAC signature, which is computed over the exact bytes sent
// (re-serializing the parsed JSON would not reproduce the same signature).
fastify.addContentTypeParser("application/json", { parseAs: "buffer" }, (request, body, done) => {
  (request as any).rawBody = body;
  if (body.length === 0) {
    done(null, {});
    return;
  }
  try {
    done(null, JSON.parse(body.toString("utf8")));
  } catch (err) {
    done(err as Error, undefined);
  }
});

/**
 * Verifies Meta's `X-Hub-Signature-256` header against the raw webhook body.
 * Returns true when the signature is valid, or when no app secret is
 * configured (local/demo setups that don't use the Cloud API webhook).
 */
function isValidWhatsAppSignature(rawBody: Buffer, signatureHeader: string | undefined): boolean {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret) {
    fastify.log.warn("WHATSAPP_APP_SECRET is not set; skipping webhook signature verification");
    return true;
  }
  if (!signatureHeader) return false;

  const expected = "sha256=" + createHmac("sha256", appSecret).update(rawBody).digest("hex");
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(signatureHeader);
  if (expectedBuffer.length !== actualBuffer.length) return false;

  return timingSafeEqual(expectedBuffer, actualBuffer);
}

/**
 * Rejects analysis input that's too large to be a legitimate request:
 * base64-encoded images over MAX_IMAGE_BYTES, or plain text over
 * MAX_TEXT_LENGTH characters. Returns an error message, or null if valid.
 */
function validateAnalysisInput(input: { text?: string; url?: string; fileName?: string } | undefined): string | null {
  if (!input) return null;
  const text = input.text;
  if (!text) return null;

  if (text.startsWith("data:image/")) {
    const base64Data = text.split(",")[1] || "";
    const approxBytes = Math.floor((base64Data.length * 3) / 4);
    if (approxBytes > MAX_IMAGE_BYTES) {
      return `Image exceeds the ${MAX_IMAGE_BYTES / (1024 * 1024)}MB limit`;
    }
    return null;
  }

  if (text.length > MAX_TEXT_LENGTH) {
    return `Text exceeds the ${MAX_TEXT_LENGTH} character limit`;
  }
  return null;
}

/**
 * Downloads a voice note received via the WhatsApp Cloud API and transcribes
 * it with Whisper. Returns null if no OpenAI key/access token is configured,
 * or the media/mediaId is missing, or the download/transcription fails.
 */
async function transcribeCloudApiVoiceNote(mediaId: string | undefined): Promise<string | null> {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!process.env.OPENAI_API_KEY || !accessToken || !mediaId) return null;

  try {
    const mediaInfoRes = await fetch(`https://graph.facebook.com/v17.0/${mediaId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!mediaInfoRes.ok) throw new Error(`Failed to fetch media info: ${mediaInfoRes.status}`);
    const mediaInfo = await mediaInfoRes.json();

    const audioRes = await fetch(mediaInfo.url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!audioRes.ok) throw new Error(`Failed to download audio: ${audioRes.status}`);
    const audioBuffer = Buffer.from(await audioRes.arrayBuffer());

    return await transcribeAudio(audioBuffer, mediaInfo.mime_type || "audio/ogg");
  } catch (err) {
    fastify.log.error(err, "Failed to transcribe Cloud API voice note");
    return null;
  }
}

// Health check
fastify.get("/health", async () => {
  return { status: "ok", service: "guardian-api" };
});

// Analysis endpoints
fastify.post("/v1/analyze/scam", async (request, reply) => {
  try {
    const body = request.body as any;
    if (!body) {
      return reply.status(400).send({ error: "Missing request body" });
    }
    const validationError = validateAnalysisInput(body.input);
    if (validationError) {
      return reply.status(413).send({ error: validationError });
    }
    const result = await runAnalysis("scam", body.input || {}, body.fixtureKey);
    return result;
  } catch (err: any) {
    fastify.log.error(err, "Scam analysis endpoint error");
    return reply.status(500).send({ error: err.message || "Internal Server Error" });
  }
});

fastify.post("/v1/analyze/document", async (request, reply) => {
  try {
    const body = request.body as any;
    if (!body) {
      return reply.status(400).send({ error: "Missing request body" });
    }
    const validationError = validateAnalysisInput(body.input);
    if (validationError) {
      return reply.status(413).send({ error: validationError });
    }
    const result = await runAnalysis("document", body.input || {}, body.fixtureKey);
    return result;
  } catch (err: any) {
    fastify.log.error(err, "Document analysis endpoint error");
    return reply.status(500).send({ error: err.message || "Internal Server Error" });
  }
});

fastify.post("/v1/analyze/page", async (request, reply) => {
  try {
    const body = request.body as any;
    if (!body) {
      return reply.status(400).send({ error: "Missing request body" });
    }
    const validationError = validateAnalysisInput(body.input);
    if (validationError) {
      return reply.status(413).send({ error: validationError });
    }
    const result = await runAnalysis("page", body.input || {}, body.fixtureKey);
    return result;
  } catch (err: any) {
    fastify.log.error(err, "Page analysis endpoint error");
    return reply.status(500).send({ error: err.message || "Internal Server Error" });
  }
});

fastify.post("/v1/analyze/voice", async (request, reply) => {
  try {
    const body = request.body as any;
    if (!body || !body.input) {
      return reply.status(400).send({ error: "Missing request body" });
    }

    let text = body.input.text || "";
    let fixtureKey = body.fixtureKey;

    if (body.input.audio && body.input.audio.startsWith("data:audio/")) {
      try {
        const match = body.input.audio.match(/^data:(audio\/[a-zA-Z0-9-+.]+);base64,(.*)$/);
        if (match) {
          const mimeType = match[1];
          const base64Data = match[2];
          const buffer = Buffer.from(base64Data, "base64");
          
          // Transcribe the audio using the engine's transcribeAudio
          const transcript = await transcribeAudio(buffer, mimeType);
          if (transcript) {
            text = transcript;
          } else {
            // If transcription fails and no text is provided, use fixture
            if (!text) {
              fixtureKey = fixtureKey || "voice-otp";
            }
          }
        }
      } catch (err) {
        fastify.log.error(err, "Failed to transcribe uploaded audio");
        if (!text) {
          fixtureKey = fixtureKey || "voice-otp";
        }
      }
    }

    const validationError = validateAnalysisInput({ ...body.input, text });
    if (validationError) {
      return reply.status(413).send({ error: validationError });
    }

    const result = await runAnalysis("voice", { ...body.input, text }, fixtureKey);
    return result;
  } catch (err: any) {
    fastify.log.error(err, "Voice analysis endpoint error");
    return reply.status(500).send({ error: err.message || "Internal Server Error" });
  }
});

// Fetch recent analysis logs from SQLite
fastify.get("/v1/analyze/history", async () => {
  const records = dbService.listRecentAnalyses(10);
  return records.map(r => {
    try {
      const parsed = JSON.parse(r.result_json);
      return {
        id: r.id,
        type: r.kind === "scam" ? "Scam Scan" : r.kind === "document" ? "Document Explainer" : r.kind === "voice" ? "Voice Scan" : "Webpage Companion",
        excerpt: parsed.explanation || "",
        risk: r.risk_level === "low" ? "Safe" : r.risk_level === "medium" ? "High Risk" : "Critical",
        date: new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + " ago"
      };
    } catch {
      return {
        id: r.id,
        type: r.kind,
        excerpt: "Safety scan completed",
        risk: r.risk_level === "low" ? "Safe" : "High Risk",
        date: r.created_at
      };
    }
  });
});

// Save user feedback
fastify.post("/v1/feedback", async (request, reply) => {
  const { analysisId, rating, note } = (request.body || {}) as { analysisId: string; rating: number; note?: string };
  if (!analysisId || !rating) {
    return reply.status(400).send({ error: "Missing analysisId or rating" });
  }
  
  dbService.saveFeedback({
    id: crypto.randomUUID(),
    analysisId,
    rating,
    note
  });
  
  return { success: true, message: "Feedback saved" };
});


// WhatsApp Bot Management endpoints
fastify.get("/v1/whatsapp/status", async () => {
  return guardianWhatsApp.getStatus();
});

fastify.post("/v1/whatsapp/connect", async (request, reply) => {
  const { phoneNumber } = (request.body || {}) as { phoneNumber?: string };
  
  // Start the background WhatsApp bot connection asynchronously
  guardianWhatsApp.start(phoneNumber).catch(err => {
    fastify.log.error(err, "Failed starting WhatsApp connection");
  });

  return { success: true, message: "Connection started" };
});

fastify.post("/v1/whatsapp/disconnect", async () => {
  await guardianWhatsApp.logout();
  return { success: true, message: "Disconnected successfully" };
});

// WhatsApp Webhook Verification (Meta Cloud API)
fastify.get("/v1/webhooks/whatsapp", async (request, reply) => {
  const query = request.query as {
    "hub.mode"?: string;
    "hub.verify_token"?: string;
    "hub.challenge"?: string;
  };
  
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || "GUARDIAN_VERIFY_TOKEN";
  
  if (query["hub.mode"] === "subscribe" && query["hub.verify_token"] === verifyToken) {
    return query["hub.challenge"];
  }
  
  return reply.status(403).send({ error: "Verification failed" });
});

// WhatsApp Webhook message parser & analyzer (Meta Cloud API)
fastify.post("/v1/webhooks/whatsapp", async (request, reply) => {
  const signatureHeader = request.headers["x-hub-signature-256"] as string | undefined;
  const rawBody = (request as any).rawBody as Buffer;
  if (!isValidWhatsAppSignature(rawBody, signatureHeader)) {
    return reply.status(401).send({ error: "Invalid signature" });
  }

  const body = request.body as any;

  if (!body || body.object !== "whatsapp_business_account") {
    return reply.status(400).send({ error: "Invalid webhook payload" });
  }

  const entries = body.entry || [];
  for (const entry of entries) {
    const changes = entry.changes || [];
    for (const change of changes) {
      if (change.field !== "messages") continue;
      
      const value = change.value || {};
      const messages = value.messages || [];
      
      for (const msg of messages) {
        const msgId = msg.id;

        // Idempotency check, durable across restarts since it's backed by SQLite.
        if (dbService.hasProcessedWebhookMessage(msgId)) {
          continue;
        }

        // Each message gets its own try/catch: one malformed or failing
        // message shouldn't abort the rest of the batch or make Fastify
        // return a 500 that causes Meta to retry-storm the whole webhook.
        try {
          const senderPhone = msg.from;
          const msgType = msg.type;

          let textContent = "";
          let isImage = false;
          let isVoice = false;
          let isDocument = false;
          let voiceMediaId: string | undefined;

          if (msgType === "text") {
            textContent = msg.text?.body || "";
          } else if (msgType === "image") {
            isImage = true;
            textContent = msg.image?.caption || "";
          } else if (msgType === "audio") {
            isVoice = true;
            voiceMediaId = msg.audio?.id;
          } else if (msgType === "document") {
            isDocument = true;
            textContent = msg.document?.caption || msg.document?.filename || "";
          }

          let analysisResult;
          if (isImage) {
            const isPrescription = ["prescription", "doctor", "medical", "drug"].some(k => textContent.toLowerCase().includes(k));
            analysisResult = await runAnalysis(
              isPrescription ? "document" : "scam",
              { text: textContent, fileName: "cloud_image.jpg" },
              isPrescription ? "amoxicillin-prescription" : "bank-otp"
            );
          } else if (isVoice) {
            const transcript = await transcribeCloudApiVoiceNote(voiceMediaId);
            analysisResult = transcript
              ? await runAnalysis("voice", { text: transcript })
              : await runAnalysis("voice", { text: "Voice note" }, "voice-otp");
          } else if (isDocument) {
            const isPrescription = ["prescription", "doctor", "medical", "drug"].some(k => textContent.toLowerCase().includes(k));
            analysisResult = await runAnalysis(
              "document",
              { text: textContent, fileName: msg.document?.filename || "cloud_document" },
              isPrescription ? "amoxicillin-prescription" : undefined
            );
          } else if (textContent) {
            analysisResult = await runAnalysis("scam", { text: textContent });
          }
          // Otherwise (reactions, statuses, unsupported types with no
          // caption/text) there's nothing to analyze — skip silently rather
          // than running "scam" analysis on an empty string.

          if (analysisResult) {
            const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
            const phoneId = value.metadata?.phone_number_id;

            if (accessToken && phoneId) {
              const riskEmoji =
                analysisResult.riskLevel === "high" ? "🚨 *HIGH RISK*" :
                analysisResult.riskLevel === "medium" ? "⚠️ *MEDIUM RISK*" :
                "✅ *SAFE / LOW RISK*";

              const replyText = `🛡️ *GUARDIAN SAFETY ASSISTANT*

🔍 *Analysis Summary:*
${analysisResult.explanation}

📊 *Risk Level:* ${riskEmoji}

📋 *Evidence Detected:*
${analysisResult.evidence.map(e => `• ${e}`).join("\n")}

✅ *Safe Next Steps:*
${analysisResult.actions.map((a, i) => `${i + 1}️⃣ ${a}`).join("\n")}

⚠️ _Disclaimer: ${analysisResult.disclaimer || "Guardian is an automated helper. Please verify critical details."}_`;

              await fetch(`https://graph.facebook.com/v17.0/${phoneId}/messages`, {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${accessToken}`,
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({
                  messaging_product: "whatsapp",
                  to: senderPhone,
                  text: { body: replyText }
                })
              });
            }
          }

          // Only mark durably-processed once we've actually finished
          // successfully — otherwise a transient failure here would
          // permanently drop the message with no reply and no retry.
          dbService.markWebhookMessageProcessed(msgId);
        } catch (err) {
          fastify.log.error(err, `Failed to process WhatsApp webhook message ${msgId}`);
        }
      }
    }
  }

  return { success: true };
});

// Serve static frontend files
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webOutDir = path.resolve(__dirname, "../../../apps/web/out");

await fastify.register(fastifyStatic, {
  root: webOutDir,
  prefix: "/",
  wildcard: false,
});

// SPA Routing Fallback: serve index.html or specific clean URL page.html files
fastify.setNotFoundHandler((request, reply) => {
  const url = request.raw.url || "";
  if (url.startsWith("/v1") || url.startsWith("/health")) {
    return reply.status(404).send({ error: "Not found" });
  }

  const pathname = url.split("?")[0];
  const cleanPath = pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;

  if (cleanPath && cleanPath !== "/") {
    const htmlFilePath = path.join(webOutDir, `${cleanPath}.html`);
    if (fs.existsSync(htmlFilePath) && fs.statSync(htmlFilePath).isFile()) {
      return reply.sendFile(`${cleanPath}.html`);
    }
  }

  return reply.sendFile("index.html");
});

// Start the server
const port = parseInt(process.env.PORT || "5000", 10);
const host = "0.0.0.0";

try {
  await fastify.listen({ port, host });
  console.log(`🚀 Guardian Fastify Server is running on http://${host}:${port}`);
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
