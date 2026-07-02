(function () {
  if (window.guardianInitialized) {
    return;
  }
  window.guardianInitialized = true;

  console.log("🛡️ Guardian Safety extension injected!");

  // 1. Inject Styles
  const styleEl = document.createElement("style");
  styleEl.textContent = `
    /* Phishing highlights */
    .guardian-highlight {
      background-color: #fee2e2 !important;
      color: #991b1b !important;
      padding: 2px 4px !important;
      border-radius: 4px !important;
      border: 1px solid #f87171 !important;
      font-weight: bold !important;
      cursor: help !important;
      text-decoration: underline dotted #ef4444 !important;
    }

    /* Injected Floating Button */
    #guardian-float-btn {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background-color: #064e3b;
      color: #ffffff;
      border: 2px solid #fff;
      box-shadow: 0 4px 14px rgba(0,0,0,0.18);
      cursor: pointer;
      z-index: 2147483640;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 24px;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    #guardian-float-btn:hover {
      transform: scale(1.1);
      background-color: #047857;
    }

    /* Accessibility Panel */
    #guardian-overlay-panel {
      position: fixed;
      bottom: 96px;
      right: 24px;
      width: 320px;
      max-height: 480px;
      background-color: #fffcf5;
      color: #102a22;
      border: 1px solid #d7dfd6;
      border-radius: 16px;
      box-shadow: 0 10px 25px rgba(23,53,43,0.15);
      z-index: 2147483641;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: none;
      flex-direction: column;
      overflow: hidden;
      animation: guardianFadeIn 0.2s ease-out;
    }
    @keyframes guardianFadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .guardian-panel-header {
      background-color: #064e3b;
      color: white;
      padding: 12px 16px;
      font-weight: bold;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 15px;
    }
    .guardian-panel-close {
      cursor: pointer;
      font-size: 18px;
      font-weight: normal;
    }
    .guardian-panel-body {
      padding: 16px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .guardian-control-btn {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid #d7dfd6;
      border-radius: 8px;
      background-color: #ffffff;
      color: #102a22;
      font-weight: 600;
      text-align: left;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      transition: all 0.2s;
    }
    .guardian-control-btn:hover {
      background-color: #f4f6f3;
      border-color: #087449;
    }
    .guardian-control-btn.active {
      background-color: #dcefe3;
      border-color: #087449;
      color: #064e3b;
    }
    .guardian-status-box {
      margin-top: 8px;
      padding: 10px;
      background-color: #fff;
      border: 1px solid #d7dfd6;
      border-radius: 8px;
      font-size: 13px;
    }

    /* Elderly Mode styles (applied globally) */
    body.guardian-elderly-active, body.guardian-elderly-active * {
      font-size: 110% !important;
      line-height: 1.65 !important;
      color: #000000 !important;
      background-color: #ffffff !important;
      letter-spacing: 0.02em !important;
    }

    /* Focus Mode styles */
    body.guardian-focus-active aside, 
    body.guardian-focus-active nav, 
    body.guardian-focus-active footer, 
    body.guardian-focus-active header, 
    body.guardian-focus-active iframe, 
    body.guardian-focus-active [class*="sidebar"], 
    body.guardian-focus-active [class*="ad"],
    body.guardian-focus-active [id*="ad"] {
      display: none !important;
      opacity: 0 !important;
    }
  `;
  document.head.appendChild(styleEl);

  // 2. State
  let elderlyMode = false;
  let focusMode = false;
  let synth = window.speechSynthesis;
  let currentUtterance = null;

  // 3. Phishing word scan
  function runPhishingScan() {
    const keywords = [
      "bvn", "otp", "password", "urgent transfer", "account suspended", 
      "claim your prize", "verify your account", "win 50,000", "send 1000"
    ];
    const regex = new RegExp(`\\b(${keywords.join("|")})\\b`, "gi");

    function walk(node) {
      if (node.nodeType === 3) { // Text node
        const val = node.nodeValue;
        if (regex.test(val)) {
          const span = document.createElement("span");
          span.innerHTML = val.replace(regex, `<span class="guardian-highlight" title="Guardian Alert: Phishing term">$1</span>`);
          node.parentNode.replaceChild(span, node);
        }
      } else if (node.nodeType === 1 && node.nodeName !== "SCRIPT" && node.nodeName !== "STYLE" && node.nodeName !== "TEXTAREA" && !node.getAttribute('data-guardian-scanned')) {
        node.setAttribute('data-guardian-scanned', 'true');
        for (let i = 0; i < node.childNodes.length; i++) {
          walk(node.childNodes[i]);
        }
      }
    }
    walk(document.body);
  }

  // 4. Accessibility Overlay Creation
  function createOverlay() {
    // Floating circular button
    const btn = document.createElement("button");
    btn.id = "guardian-float-btn";
    btn.innerHTML = "🛡️";
    btn.title = "Guardian Accessibility Companion";
    document.body.appendChild(btn);

    // Sidebar panel
    const panel = document.createElement("div");
    panel.id = "guardian-overlay-panel";
    panel.innerHTML = `
      <div class="guardian-panel-header">
        <span>🛡️ Guardian Companion</span>
        <span class="guardian-panel-close" id="guardian-close-btn">✕</span>
      </div>
      <div class="guardian-panel-body">
        <button class="guardian-control-btn" id="elderly-toggle-btn">
          👵 <span>Elderly Mode (Large Text)</span>
        </button>
        <button class="guardian-control-btn" id="focus-toggle-btn">
          🔍 <span>Focus Mode (Hide Ads/Bars)</span>
        </button>
        <button class="guardian-control-btn" id="read-aloud-btn">
          🔊 <span>Read Page Aloud</span>
        </button>
        <button class="guardian-control-btn" id="simplify-page-btn">
          📝 <span>Simplify Content</span>
        </button>
        <div class="guardian-status-box" id="guardian-status-content">
          <strong>Security Scan:</strong> Safe next steps are active.
        </div>
      </div>
    `;
    document.body.appendChild(panel);

    // Event Handlers
    btn.addEventListener("click", () => {
      const isVisible = panel.style.display === "flex";
      panel.style.display = isVisible ? "none" : "flex";
    });

    document.getElementById("guardian-close-btn").addEventListener("click", () => {
      panel.style.display = "none";
    });

    const elderlyBtn = document.getElementById("elderly-toggle-btn");
    elderlyBtn.addEventListener("click", () => {
      elderlyMode = !elderlyMode;
      document.body.classList.toggle("guardian-elderly-active", elderlyMode);
      elderlyBtn.classList.toggle("active", elderlyMode);
    });

    const focusBtn = document.getElementById("focus-toggle-btn");
    focusBtn.addEventListener("click", () => {
      focusMode = !focusMode;
      document.body.classList.toggle("guardian-focus-active", focusMode);
      focusBtn.classList.toggle("active", focusMode);
    });

    const readBtn = document.getElementById("read-aloud-btn");
    readBtn.addEventListener("click", () => {
      if (synth.speaking) {
        synth.cancel();
        readBtn.classList.remove("active");
        readBtn.querySelector("span").textContent = "Read Page Aloud";
      } else {
        const selectedText = window.getSelection().toString() || document.body.innerText.slice(0, 1000);
        currentUtterance = new SpeechSynthesisUtterance(selectedText);
        currentUtterance.onend = () => {
          readBtn.classList.remove("active");
          readBtn.querySelector("span").textContent = "Read Page Aloud";
        };
        synth.speak(currentUtterance);
        readBtn.classList.add("active");
        readBtn.querySelector("span").textContent = "Stop Reading";
      }
    });

    const simplifyBtn = document.getElementById("simplify-page-btn");
    simplifyBtn.addEventListener("click", async () => {
      const statusBox = document.getElementById("guardian-status-content");
      statusBox.innerHTML = `<strong>Simplifying...</strong> Please wait.`;
      
      const pageText = window.getSelection().toString() || document.body.innerText.slice(0, 500);

      try {
        const res = await fetch("http://localhost:5000/v1/analyze/page", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind: "page",
            input: { text: pageText }
          })
        });
        if (res.ok) {
          const data = await res.json();
          statusBox.innerHTML = `
            <strong>Simplified version:</strong><br/>
            ${data.explanation}<br/>
            <strong style="color: #dc2626; display: block; margin-top: 6px;">Actions:</strong>
            ${data.actions.map(a => `• ${a}`).join("<br/>")}
          `;
        } else {
          throw new Error();
        }
      } catch (err) {
        statusBox.innerHTML = `
          <strong>Simplified version:</strong><br/>
          This page contains account setup and security prompts. Keep your passwords and banking codes private. Do not click links unless verified.
        `;
      }
    });
  }

  // Initialize
  runPhishingScan();
  createOverlay();

  // Listen to messages from popup.js
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "scan") {
      runPhishingScan();
      sendResponse({ status: "done" });
    } else if (message.action === "toggleElderly") {
      elderlyMode = !elderlyMode;
      document.body.classList.toggle("guardian-elderly-active", elderlyMode);
      sendResponse({ elderlyMode });
    } else if (message.action === "toggleFocus") {
      focusMode = !focusMode;
      document.body.classList.toggle("guardian-focus-active", focusMode);
      sendResponse({ focusMode });
    }
  });

})();
