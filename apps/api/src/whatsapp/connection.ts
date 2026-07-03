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

const BASE_RECONNECT_DELAY_MS = 5000;
const MAX_RECONNECT_DELAY_MS = 60000;
const MAX_RECONNECT_ATTEMPTS = 10;

// Disconnect reasons where retrying with the existing session can't succeed
// (session is gone, another device took over, or we're blocked) — these
// need the user to explicitly reconnect from the dashboard, not a silent retry.
const NO_RETRY_DISCONNECT_REASONS = new Set<number>([
  DisconnectReason.forbidden,
  DisconnectReason.multideviceMismatch,
  DisconnectReason.connectionReplaced,
]);

export class GuardianWhatsApp {
  private sock: WASocket | null = null;
  private isConnected = false;
  private currentQr: string | null = null;
  private pairingCode: string | null = null;
  private connectionStatus: "CONNECTED" | "DISCONNECTED" | "CONNECTING" = "DISCONNECTED";
  // Set right before a user-initiated logout() so the connection.update
  // handler it triggers doesn't treat that as an unexpected disconnect and
  // immediately start a brand-new connection.
  private manualDisconnect = false;
  private reconnectAttempts = 0;
  // The number the bot was paired with — analysis results are delivered
  // here (as a "message yourself" DM) instead of back into the sender's
  // chat, so results land in one place regardless of who forwarded what.
  private ownerPhoneNumber: string | undefined;

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

  /**
   * The JID analysis results should be delivered to: the bot's own linked
   * account (once registered, Baileys knows this JID directly), or a JID
   * built from the phone number that was used to pair, before that.
   */
  private getOwnerJid(): string | null {
    const registeredJid = this.sock?.authState?.creds?.me?.id;
    if (registeredJid) return registeredJid;
    if (this.ownerPhoneNumber) return `${this.ownerPhoneNumber.replace(/\D/g, "")}@s.whatsapp.net`;
    return null;
  }

  public async start(phoneNumber?: string): Promise<void> {
    if (this.connectionStatus === "CONNECTED" || this.connectionStatus === "CONNECTING") {
      return;
    }

    if (phoneNumber) this.ownerPhoneNumber = phoneNumber;

    // A previous socket's event listeners would otherwise keep firing
    // (double-processing messages) alongside the new socket we're about to create.
    if (this.sock) {
      this.sock.ev.removeAllListeners("connection.update");
      this.sock.ev.removeAllListeners("creds.update");
      this.sock.ev.removeAllListeners("messages.upsert");
    }

    this.manualDisconnect = false;
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

        // The user clicked "Disconnect" — sock.logout() itself triggers this
        // same close event, so without this check we'd immediately start a
        // brand-new connection right after the user asked to stop.
        if (this.manualDisconnect) {
          console.log("Disconnect was user-initiated; not reconnecting.");
          return;
        }

        if (statusCode === DisconnectReason.loggedOut || statusCode === DisconnectReason.badSession) {
          console.log("Session invalid. Clearing auth folder — reconnecting needs a fresh pairing code from the dashboard.");
          await this.clearSession();
          return;
        }

        if (statusCode !== undefined && NO_RETRY_DISCONNECT_REASONS.has(statusCode)) {
          console.log(`Disconnect reason ${statusCode} needs manual reconnection; not retrying automatically.`);
          return;
        }

        if (statusCode === DisconnectReason.restartRequired) {
          // Expected partway through Baileys' own pairing/auth handshake — reconnect immediately.
          this.start(phoneNumber);
          return;
        }

        if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
          console.log(`Giving up after ${this.reconnectAttempts} reconnect attempts.`);
          return;
        }

        this.reconnectAttempts += 1;
        const delay = Math.min(BASE_RECONNECT_DELAY_MS * 2 ** (this.reconnectAttempts - 1), MAX_RECONNECT_DELAY_MS);
        console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
        setTimeout(() => this.start(phoneNumber), delay);
      } else if (connection === "open") {
        this.isConnected = true;
        this.connectionStatus = "CONNECTED";
        this.currentQr = null;
        this.pairingCode = null;
        this.reconnectAttempts = 0;
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

          // Guardian is for a sponsor <-> dependent 1:1 conversation. Without
          // this, adding the bot's number to any group chat would make it
          // analyze and reply to every message everyone in that group sends.
          if (remoteJid.endsWith("@g.us") || remoteJid.endsWith("@broadcast")) continue;

          // Reactions, read receipts, and other protocol-level updates arrive
          // as "messages" too but aren't something a user sent to be analyzed
          // — replying to them looks like the bot spamming for no reason.
          const isNonContentUpdate = !!(
            msg.message.reactionMessage ||
            msg.message.protocolMessage ||
            msg.message.senderKeyDistributionMessage ||
            msg.message.pollUpdateMessage
          );
          if (isNonContentUpdate) continue;

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
          } else if (isDocument) {
            // Forwarded documents (prescriptions, forms) are far more often
            // real documents than scam screenshots, so default to "document"
            // analysis rather than treating them like an image scam report.
            const documentMessage = msg.message.documentMessage;
            const caption = documentMessage?.caption || documentMessage?.fileName || "";
            const isPrescription = ["prescription", "doctor", "medical", "drug", "medicine"].some(k => caption.toLowerCase().includes(k));

            analysisResult = await runAnalysis(
              "document",
              { text: caption, fileName: documentMessage?.fileName || "whatsapp_document" },
              isPrescription ? "amoxicillin-prescription" : undefined
            );
          } else if (text) {
            // General text scan
            analysisResult = await runAnalysis("scam", { text });
          } else {
            // Unsupported content (stickers, contacts, locations, polls, etc.)
            const ownerJid = this.getOwnerJid();
            if (ownerJid) {
              await this.sock.sendMessage(ownerJid, {
                text: `🛡️ *Guardian Helper*\n\nReceived an unsupported message type from ${remoteJid}. You can forward suspicious texts, images, voice notes, or documents.`,
              });
            }
            continue;
          }

          // Results are delivered to the bot owner's own chat (a "message
          // yourself" DM), not back into whichever chat the content came
          // from — so results land in one place no matter who sent what.
          const ownerJid = this.getOwnerJid();
          if (!ownerJid) {
            console.warn("No owner JID known; cannot deliver analysis result. Was the bot paired with a phone number?");
            continue;
          }
          const replyText = this.formatReply(analysisResult, remoteJid);
          await this.sock.sendMessage(ownerJid, { text: replyText });

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

  private formatReply(result: AnalysisResult, senderJid: string): string {
    const riskEmoji =
      result.riskLevel === "high" ? "🚨 *HIGH RISK*" :
      result.riskLevel === "medium" ? "⚠️ *MEDIUM RISK*" :
      "✅ *SAFE / LOW RISK*";

    const evidenceLines = result.evidence.map(e => `• ${e}`).join("\n");
    const actionLines = result.actions.map((a, i) => `${i + 1}️⃣ ${a}`).join("\n");
    const senderNumber = senderJid.split("@")[0];

    return `🛡️ *GUARDIAN SAFETY ASSISTANT*

👤 *From:* ${senderNumber}

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
    this.manualDisconnect = true;
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
    this.reconnectAttempts = 0;
    try {
      const authDir = this.getAuthDir();
      await fs.rm(authDir, { recursive: true, force: true });
    } catch (err) {
      console.error("Failed to wipe auth folder", err);
    }
  }
}

export const guardianWhatsApp = new GuardianWhatsApp();
