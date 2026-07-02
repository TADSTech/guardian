"use client";

import { useEffect, useRef } from "react";
import { ArrowRight, Shield, HeartHandshake, Eye, Sparkles } from "lucide-react";
import gsap from "gsap";

const benefits = [
  {
    number: "01",
    title: "Intercept Phishing Scams",
    text: "Guardian intercepts fraudulent messages (like fake bank OTP demands) on WhatsApp and notifies family sponsors in real-time."
  },
  {
    number: "02",
    title: "Simplify Prescriptions",
    text: "Physical healthcare scripts and digital forms are translated into calm, clear, local dialects with safety boundaries kept visible."
  },
  {
    number: "03",
    title: "Companion Extension",
    text: "A lightweight Chrome extension lets dependents click to enlarge text, remove visual clutter, and read webpages aloud."
  }
];

export default function HomePage() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".hero-eyebrow", { opacity: 0, y: 15, duration: 0.8, ease: "power3.out" });
      gsap.from(".hero-title", { opacity: 0, y: 30, duration: 1, delay: 0.2, ease: "power3.out" });
      gsap.from(".hero-copy", { opacity: 0, y: 20, duration: 1, delay: 0.4, ease: "power3.out" });
      gsap.from(".hero-actions", { opacity: 0, y: 15, duration: 0.8, delay: 0.5, ease: "power3.out" });
      gsap.from(".hero-card", { opacity: 0, x: 50, rotation: 8, duration: 1.2, delay: 0.6, ease: "power3.out" });
      gsap.from(".benefit", { opacity: 0, y: 30, stagger: 0.2, duration: 0.8, delay: 0.8, ease: "power3.out" });
    }, containerRef);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className="min-h-screen flex flex-col bg-[#fcfaf3] text-[#102a22]">
      <a className="skip-link" href="#main-content">Skip to main content</a>
      
      <header className="site-header">
        <a className="brand" style={{ fontWeight: 900, textTransform: "uppercase", letterSpacing: "-0.05em", fontSize: "1.7rem", display: "flex", alignItems: "center", gap: "8px" }} href="#top" aria-label="Guardian home">
          <Shield className="w-6 h-6 text-[#087449]" /> GUARDIAN
        </a>
        <nav aria-label="Main navigation">
          <a href="#how-it-works" className="hover:text-[#087449] transition-colors">How it works</a>
          <a href="/login" className="hover:text-[#087449] transition-colors">Sign in</a>
        </nav>
        <a className="header-cta hover:text-[#087449] hover:border-[#087449] transition-colors" href="/login">
          Open app <span aria-hidden="true">→</span>
        </a>
      </header>

      <main id="main-content" tabIndex={-1} className="flex-1">
        <section className="hero" id="top">
          <div className="eyebrow hero-eyebrow">A digital safety net for the ones you love</div>
          <h1 className="hero-title">Protect the parents who protected you.</h1>
          <p className="hero-copy">
            Guardian stands between vulnerable family members and online threats—translating scam texts, urgent alerts, and physical medical prescriptions into calm, localized safety reports.
          </p>
          <div className="hero-actions">
            <a className="button primary" href="/login">
              Get started for free <ArrowRight className="w-4 h-4 ml-1" />
            </a>
            <span className="quiet-proof">No app installation required for dependents.</span>
          </div>
          
          <div className="hero-card border border-[#d7dfd6]" aria-label="Example Guardian warning">
            <div className="message-meta flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#087449]" /> Guardian reviewed this
            </div>
            <p className="font-serif italic text-lg my-3">“Your bank account will be suspended today. Send your OTP now.”</p>
            <div className="risk-line border-l-4 border-[#a42922] pl-3">
              <strong className="text-[#a42922] uppercase tracking-wider text-xs">High risk phishing</strong>
              <span className="text-sm text-gray-600 block mt-1">Never share your verification code. Delete this message.</span>
            </div>
          </div>
        </section>

        <section className="principles" id="how-it-works" aria-labelledby="principles-title">
          <p className="section-kicker">Designed around dignity, not technical jargon</p>
          <h2 id="principles-title">Small, steady protection—right when it matters.</h2>
          <div className="benefit-grid">
            {benefits.map((b) => (
              <article className="benefit" key={b.number}>
                <span className="text-xs font-bold uppercase tracking-wider">{b.number}</span>
                <h3 className="text-xl font-serif mt-2 mb-3">{b.title}</h3>
                <p className="text-sm leading-relaxed">{b.text}</p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="bg-white border-t border-[#d7dfd6] py-8">
        <div className="max-w-[1240px] mx-auto px-8 flex flex-col sm:flex-row justify-between text-xs text-gray-400 gap-4">
          <span>Guardian · Hackathon prototype</span>
          <span>Simple language. Safe decisions.</span>
        </div>
      </footer>
    </div>
  );
}
