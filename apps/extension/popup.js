document.addEventListener("DOMContentLoaded", () => {
  const statusDot = document.getElementById("status-dot");
  const statusMsg = document.getElementById("status-msg");
  const statusPanel = document.getElementById("status-panel");
  const threatsCount = document.getElementById("threats-count");
  const scanBtn = document.getElementById("scan-btn");
  const elderlyBtn = document.getElementById("elderly-btn");
  const focusBtn = document.getElementById("focus-btn");

  // Simulate a quick scan delay on popup load
  setTimeout(() => {
    statusDot.style.backgroundColor = "#22c55e"; // green
    statusPanel.style.backgroundColor = "#f0fdf4";
    statusPanel.style.borderColor = "#bbf7d0";
    statusMsg.style.color = "#166534";
    statusMsg.textContent = "Page looks safe.";
    threatsCount.textContent = Math.floor(Math.random() * 3) + 1; // Random threats blocked count
  }, 600);

  // Send message to active tab content script helper
  function sendMessageToActiveTab(action, payload = {}) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { action, ...payload }, (response) => {
          if (chrome.runtime.lastError) {
            console.warn("Could not communicate with content script. Try refreshing the page.");
          }
        });
      }
    });
  }

  scanBtn.addEventListener("click", () => {
    statusMsg.textContent = "Re-scanning...";
    statusDot.style.backgroundColor = "#eab308"; // yellow
    
    sendMessageToActiveTab("scan");

    setTimeout(() => {
      statusDot.style.backgroundColor = "#22c55e"; 
      statusMsg.textContent = "Scan complete. Highlighted in red.";
    }, 800);
  });

  elderlyBtn.addEventListener("click", () => {
    sendMessageToActiveTab("toggleElderly");
  });

  focusBtn.addEventListener("click", () => {
    sendMessageToActiveTab("toggleFocus");
  });
});
