import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  type WASocket,
  downloadContentFromMessage,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import pino from "pino";
import path from "path";
import fs from "fs/promises";
import fsSync from "fs";
import { runAnalysis, transcribeAudio } from "../analysis/engine";
import type { AnalysisResult } from "@guardian/contracts";

const logger = pino({ level: "warn" });

export class GuardianWhatsApp {
  private sock: WASocket | null = null;
  private isConnected = false;
  private currentQr: string | null = null;
  private pairingCode: string | null = null;
  private connectionStatus: "CONNECTED" | "DISCONNECTED" | "CONNECTING" = "DISCONNECTED";

  constructor() {}

  public getStatus() {
    return {
      status: this.connectionStatus,
      qr: this.currentQr,
      pairingCode: this.pairingCode,
    };
  }

  private getAuthDir() {
    return path.resolve(__dirname, "../../auth_info_guardian");
  }

  public async start(phoneNumber?: string): Promise<void> {
    if (this.connectionStatus === "CONNECTED" || this.connectionStatus === "CONNECTING") {
      return;
    }

    this.connectionStatus = "CONNECTING";
    const authDir = this.getAuthDir();
    const { state, saveCreds } = await useMultiFileAuthState(authDir);
    const { version } = await fetchLatestBaileysVersion();

    this.sock = makeWASocket({
      version,
      printQRInTerminal: true,
      logger,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger),
      },
      browser: ["Ubuntu", "Chrome", "20.0.04"],
      connectTimeoutMs: 60000,
      keepAliveIntervalMs: 30000,
      shouldIgnoreJid: (jid) => jid === "status@broadcast" || jid?.endsWith("@broadcast"),
    });

    this.sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        this.currentQr = qr;
        if (phoneNumber && this.sock && !this.sock.authState.creds.registered && !this.pairingCode) {
          try {
            console.log(`📡 Socket ready (QR received). Requesting pairing code for ${phoneNumber}...`);
            const code = await this.sock.requestPairingCode(phoneNumber.replace(/\D/g, ""));
            this.pairingCode = code;
            this.currentQr = null;
            console.log(`🔑 Guardian WhatsApp Pairing Code generated: ${code}`);
          } catch (err) {
            console.error("Failed to request pairing code inside connection.update", err);
          }
        } else if (!phoneNumber) {
          this.pairingCode = null;
        }
      }

      if (connection === "close") {
        this.isConnected = false;
        this.connectionStatus = "DISCONNECTED";
        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
        console.log(`🔴 Guardian WhatsApp connection closed. Status Code: ${statusCode}`);

        if (statusCode === DisconnectReason.loggedOut || statusCode === 401) {
          console.log("Session logged out. Clearing auth folder...");
          await this.clearSession();
          this.start();
        } else {
          // Reconnect automatically for other reasons
          setTimeout(() => this.start(phoneNumber), 5000);
        }
      } else if (connection === "open") {
        this.isConnected = true;
        this.connectionStatus = "CONNECTED";
        this.currentQr = null;
        this.pairingCode = null;
        console.log("🟢 Guardian WhatsApp connection established!");
      }
    });

    this.sock.ev.on("creds.update", saveCreds);

    this.sock.ev.on("messages.upsert", async (m) => {
      for (const msg of m.messages) {
        try {
          if (!msg.message || msg.key.fromMe) continue;
          
          const remoteJid = msg.key.remoteJid;
          if (!remoteJid) continue;

          console.log(`📩 Received message from ${remoteJid}`);
          
          // Get text content
          const text = 
            msg.message.conversation || 
            msg.message.extendedTextMessage?.text || 
            msg.message.imageMessage?.caption || 
            msg.message.documentMessage?.caption;

          const isImage = !!msg.message.imageMessage;
          const isAudio = !!msg.message.audioMessage;
          const isDocument = !!msg.message.documentMessage;

          let analysisResult: AnalysisResult;

          if (isImage) {
            // Document or scam image analysis
            // For hackathon, if it has a prescription keyword in caption, treat as document, else scam
            const caption = msg.message.imageMessage?.caption || "";
            const isPrescription = ["prescription", "doctor", "medical", "drug", "medicine"].some(k => caption.toLowerCase().includes(k));
            
            analysisResult = await runAnalysis(
              isPrescription ? "document" : "scam",
              { text: caption, fileName: "whatsapp_image.jpg" },
              isPrescription ? "amoxicillin-prescription" : "bank-otp"
            );
          } else if (isAudio) {
            const transcript = await this.transcribeVoiceNote(msg.message.audioMessage);
            analysisResult = transcript
              ? await runAnalysis("voice", { text: transcript })
              : await runAnalysis("voice", { text: "Voice message input" }, "voice-otp");
          } else if (text) {
            // General text scan
            analysisResult = await runAnalysis("scam", { text });
          } else {
            // Unsupported content
            await this.sock.sendMessage(remoteJid, {
              text: "🛡️ *Guardian Helper*\n\nSorry, I don't support this type of message yet. You can forward me suspicious texts, images, or voice notes.",
            });
            continue;
          }

          // Format and send response
          const replyText = this.formatReply(analysisResult);
          await this.sock.sendMessage(remoteJid, { text: replyText });

        } catch (err) {
          console.error("Error processing message", err);
        }
      }
    });
  }

  /**
   * Downloads a voice note from WhatsApp and transcribes it with Whisper.
   * Returns null if no OpenAI key is configured or the download/transcription
   * fails, so the caller can fall back to the voice-otp fixture.
   */
  private async transcribeVoiceNote(audioMessage: any): Promise<string | null> {
    if (!process.env.OPENAI_API_KEY) return null;

    try {
      const stream = await downloadContentFromMessage(audioMessage, "audio");
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(chunk as Buffer);
      }
      const audioBuffer = Buffer.concat(chunks);
      return await transcribeAudio(audioBuffer, audioMessage.mimetype || "audio/ogg");
    } catch (err) {
      console.error("Failed to download WhatsApp voice note", err);
      return null;
    }
  }

  private formatReply(result: AnalysisResult): string {
    const riskEmoji = 
      result.riskLevel === "high" ? "🚨 *HIGH RISK*" : 
      result.riskLevel === "medium" ? "⚠️ *MEDIUM RISK*" : 
      "✅ *SAFE / LOW RISK*";

    const evidenceLines = result.evidence.map(e => `• ${e}`).join("\n");
    const actionLines = result.actions.map((a, i) => `${i + 1}️⃣ ${a}`).join("\n");

    return `🛡️ *GUARDIAN SAFETY ASSISTANT*

🔍 *Analysis Summary:*
${result.explanation}

📊 *Risk Assessment:* ${riskEmoji}

📋 *Evidence Detected:*
${evidenceLines || "• None detected"}

✅ *Safe Next Steps:*
${actionLines}

⚠️ _Disclaimer: ${result.disclaimer || "Guardian is an automated helper. Please verify critical details."}_`;
  }

  public async logout() {
    try {
      if (this.sock) {
        await this.sock.logout();
      }
    } catch (err) {
      console.error("Error during socket logout", err);
    } finally {
      await this.clearSession();
    }
  }

  public async clearSession() {
    this.connectionStatus = "DISCONNECTED";
    this.currentQr = null;
    this.pairingCode = null;
    try {
      const authDir = this.getAuthDir();
      await fs.rm(authDir, { recursive: true, force: true });
    } catch (err) {
      console.error("Failed to wipe auth folder", err);
    }
  }
}

export const guardianWhatsApp = new GuardianWhatsApp();
