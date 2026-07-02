import Fastify from "fastify";
import cors from "@fastify/cors";
import { runAnalysis } from "./analysis/engine";
import { guardianWhatsApp } from "./whatsapp/connection";
import { dbService } from "./database";
import type { AnalysisRequest } from "@guardian/contracts";

const fastify = Fastify({
  logger: {
    level: "info",
  },
});

// Configure CORS
await fastify.register(cors, {
  origin: true, // Allow all origins for the hackathon demo, or configure specifically
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
});

// Health check
fastify.get("/health", async () => {
  return { status: "ok", service: "guardian-api" };
});

// Analysis endpoints
fastify.post("/v1/analyze/scam", async (request, reply) => {
  const body = request.body as AnalysisRequest;
  if (!body) {
    return reply.status(400).send({ error: "Missing request body" });
  }
  const result = await runAnalysis("scam", body.input, body.fixtureKey);
  return result;
});

fastify.post("/v1/analyze/document", async (request, reply) => {
  const body = request.body as AnalysisRequest;
  if (!body) {
    return reply.status(400).send({ error: "Missing request body" });
  }
  const result = await runAnalysis("document", body.input, body.fixtureKey);
  return result;
});

fastify.post("/v1/analyze/page", async (request, reply) => {
  const body = request.body as AnalysisRequest;
  if (!body) {
    return reply.status(400).send({ error: "Missing request body" });
  }
  const result = await runAnalysis("page", body.input, body.fixtureKey);
  return result;
});

fastify.post("/v1/analyze/voice", async (request, reply) => {
  const body = request.body as AnalysisRequest;
  if (!body) {
    return reply.status(400).send({ error: "Missing request body" });
  }
  const result = await runAnalysis("voice", body.input, body.fixtureKey);
  return result;
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

const processedMessageIds = new Set<string>();

// WhatsApp Webhook message parser & analyzer (Meta Cloud API)
fastify.post("/v1/webhooks/whatsapp", async (request, reply) => {
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
        
        // Idempotency check
        if (processedMessageIds.has(msgId)) {
          continue;
        }
        processedMessageIds.add(msgId);
        if (processedMessageIds.size > 1000) {
          const first = processedMessageIds.values().next().value;
          if (first) processedMessageIds.delete(first);
        }

        const senderPhone = msg.from;
        const msgType = msg.type;
        
        let textContent = "";
        let isImage = false;
        let isVoice = false;

        if (msgType === "text") {
          textContent = msg.text?.body || "";
        } else if (msgType === "image") {
          isImage = true;
          textContent = msg.image?.caption || "";
        } else if (msgType === "audio") {
          isVoice = true;
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
          analysisResult = await runAnalysis("voice", { text: "Voice note" }, "voice-otp");
        } else {
          analysisResult = await runAnalysis("scam", { text: textContent });
        }

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

          try {
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
          } catch (err) {
            fastify.log.error(err, "Failed to send Cloud API response");
          }
        }
      }
    }
  }

  return { success: true };
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
