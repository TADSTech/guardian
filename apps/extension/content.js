function runGuardianScan() {
  const phishingKeywords = [
    "bvn", "otp", "password", "urgent transfer", "account suspended", 
    "claim your prize", "verify your account", "win 50,000", "send 1000"
  ];

  const regex = new RegExp(`\\b(${phishingKeywords.join("|")})\\b`, "gi");

  // A simple function to walk text nodes and highlight them.
  function highlightTextNodes(node) {
    if (node.nodeType === 3) { // Text node
      const match = node.nodeValue.match(regex);
      if (match) {
        const span = document.createElement("span");
        span.innerHTML = node.nodeValue.replace(regex, `<span style="background-color: #fecaca; color: #991b1b; padding: 2px 4px; border-radius: 4px; border: 1px solid #ef4444; font-weight: bold; cursor: help;" title="Guardian Alert: This phrase is commonly used in phishing scams.">$1</span>`);
        node.parentNode.replaceChild(span, node);
      }
    } else if (node.nodeType === 1 && node.nodeName !== "SCRIPT" && node.nodeName !== "STYLE" && !node.getAttribute('data-guardian-scanned')) {
      node.setAttribute('data-guardian-scanned', 'true');
      for (let i = 0; i < node.childNodes.length; i++) {
        highlightTextNodes(node.childNodes[i]);
      }
    }
  }

  highlightTextNodes(document.body);
}

// Make it available globally for the popup to trigger
window.runGuardianScan = runGuardianScan;

// Run on initial load
runGuardianScan();
