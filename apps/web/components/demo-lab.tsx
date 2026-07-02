"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const demos = {
  scam: { label: "Scam detector", prompt: "A prize message asks for my bank details.", title: "This looks like a scam.", risk: "High risk · 92%", body: "The message creates urgency, promises a prize, and asks for private information. Real banks and legitimate companies do not need your OTP or card details to send you money.", advice: "Do not reply or click the link. Delete the message, then contact the company through its official number if you are unsure." },
  document: { label: "Document explainer", prompt: "What does this prescription mean?", title: "Here is the simple version.", risk: "Important information", body: "This prescription says to take Amoxicillin 500mg three times a day after meals, for seven days. It is an antibiotic used for some bacterial infections.", advice: "Do not stop early because you feel better. If you have a rash, breathing difficulty, or severe diarrhoea, contact a clinician urgently." },
  voice: { label: "Voice assistant", prompt: "Play a voice note asking: “What does this message mean?”", title: "I can explain it for you.", risk: "Voice note · transcribed", body: "The message is asking you to send a one-time password. Do not send it. Nobody from your bank should ask for that password over a call or message.", advice: "If you already shared it, contact your bank immediately using a trusted phone number." },
} as const;

type DemoKey = keyof typeof demos;

export function DemoLab() {
  const [active, setActive] = useState<DemoKey>("scam");
  const [shown, setShown] = useState(false);
  const demo = demos[active];
  const choose = (key: DemoKey) => { setActive(key); setShown(false); };
  return <div className="demo-lab">
    <div className="demo-tabs" role="tablist" aria-label="Guardian demos">
      {(Object.keys(demos) as DemoKey[]).map((key) => <button key={key} role="tab" aria-selected={active === key} className={active === key ? "selected" : ""} onClick={() => choose(key)}>{demos[key].label}</button>)}
    </div>
    <div className="demo-workspace">
      <div className="example-card"><span className="example-label">Prepared example</span><div className="example-icon" aria-hidden="true">{active === "scam" ? "!" : active === "document" ? "▤" : "◖"}</div><p>{demo.prompt}</p><button className="button primary" onClick={() => setShown(true)}>Ask Guardian <span aria-hidden="true">→</span></button></div>
      <div className="answer-card" aria-live="polite">
        <AnimatePresence mode="wait">
          {shown ? (
            <motion.div key="result" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.4, ease: "easeOut" }}>
              <span className="answer-label">Guardian’s explanation</span>
              <h3>{demo.title}</h3>
              <span className="result-badge">{demo.risk}</span>
              <p>{demo.body}</p>
              <div className="next-step"><strong>What to do now</strong><p>{demo.advice}</p></div>
            </motion.div>
          ) : (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="answer-empty">
              <span aria-hidden="true">✦</span>
              <h3>Ready when you are.</h3>
              <p>Pick an example and ask Guardian for a clear explanation.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  </div>;
}
