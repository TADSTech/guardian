document.addEventListener("DOMContentLoaded", () => {
  const statusDot = document.getElementById("status-dot");
  const statusMsg = document.getElementById("status-msg");
  const statusPanel = document.getElementById("status-panel");
  const threatsCount = document.getElementById("threats-count");
  const scanBtn = document.getElementById("scan-btn");

  // Simulate a quick scan delay
  setTimeout(() => {
    statusDot.style.backgroundColor = "#22c55e"; // green
    statusPanel.style.backgroundColor = "#f0fdf4";
    statusPanel.style.borderColor = "#bbf7d0";
    statusMsg.style.color = "#166534";
    statusMsg.textContent = "Page looks safe.";
    threatsCount.textContent = Math.floor(Math.random() * 5) + 1; // Fake count
  }, 800);

  scanBtn.addEventListener("click", async () => {
    statusMsg.textContent = "Re-scanning...";
    statusDot.style.backgroundColor = "#eab308"; // yellow
    
    // Ping content script to re-highlight
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0].id) {
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          function: () => {
            if (window.runGuardianScan) window.runGuardianScan();
          }
        });
      }
    });

    setTimeout(() => {
      statusDot.style.backgroundColor = "#22c55e"; 
      statusMsg.textContent = "Scan complete. See page for highlights.";
    }, 1000);
  });
});
