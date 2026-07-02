# Guardian Setup Guide

This guide describes how to install and run the Guardian ecosystem (Next.js Dashboard, Fastify API, Chrome Extension, and WhatsApp Bot) locally.

---

## 📋 Prerequisites
* [Bun](https://bun.sh) (v1.3+ recommended)
* Google Chrome (for sideloading the extension)

---

## 🚀 Running the Services

### 1. Installation
Install all monorepo workspace dependencies from the root directory:
```bash
bun install
```

### 2. Start Development Servers
Start both the **Next.js Dashboard** (port 3000) and the **Fastify Backend API** (port 5000) concurrently with:
```bash
bun run dev
```

---

## 🔌 Integrating components

### 🌐 Chrome Extension Sideloading
1. Extract the packaged zip file: `apps/web/public/guardian-extension-demo.zip`.
2. Open Chrome and navigate to `chrome://extensions`.
3. Toggle **"Developer mode"** in the top right.
4. Click **"Load unpacked"** and select the extracted folder.
5. Phishing-keyword highlighting runs automatically on every page. The floating green shield button (🛡️) and its accessibility panel only appear after you click the toolbar extension icon and press **"Scan Page Now"** in the popup.

### 💬 Connecting the WhatsApp Bot (Baileys client)
1. Open the Dashboard at `http://localhost:3000/dashboard`.
2. Go to the **Family Safety** tab.
3. Under the **WhatsApp Integration** card, enter a phone number (with country code, e.g. `+2348012345678`) and click **"Request Pairing Code"**.
4. The dashboard will display an 8-character pairing code (e.g. `ABCD-EFGH`).
5. Open WhatsApp on the parent's phone, go to **Linked Devices** -> **Link with Phone Number**, and enter the code.
6. The bot is now linked and will analyze any message forwarded to it!

### ☁️ WhatsApp Webhook Setup (Meta Cloud API)
If you want to receive webhook payloads from Meta:
1. Expose your port `5000` to the internet (e.g. via ngrok: `ngrok http 5000`).
2. Register the webhook URL in Meta App settings: `https://<your-ngrok-subdomain>.ngrok-free.app/v1/webhooks/whatsapp`.
3. Set the Verification Token to `GUARDIAN_VERIFY_TOKEN` (or customize via the `WHATSAPP_VERIFY_TOKEN` environment variable).
4. Set `WHATSAPP_APP_SECRET` to your Meta app's App Secret so incoming webhook payloads can be signature-verified. Without it, the API accepts webhook payloads without verifying `X-Hub-Signature-256` (fine for local development, not for a public deployment).

### 🔑 Dashboard sign-in

The dashboard's sign-in/create-account flow (`apps/web/app/login`) is demo-only: accounts are stored in the browser's `localStorage`, not on the server. There's no real backend authentication yet — don't rely on it to gate access to anything sensitive.
