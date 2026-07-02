

const benefits = [
  ["01", "Spot the danger", "Guardian explains suspicious messages before a mistake becomes costly."],
  ["02", "Make sense of documents", "Prescriptions, results, and forms become clearer—with warnings kept visible."],
  ["03", "Use the web your way", "A browser companion can enlarge, simplify, and read a difficult page aloud."],
];

export default function HomePage() {
  return (
    <>
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <header className="site-header">
        <a className="brand" style={{ fontWeight: 900, textTransform: "uppercase", letterSpacing: "-0.05em", fontSize: "1.7rem" }} href="#top" aria-label="Guardian home">GUARDIAN</a>
        <nav aria-label="Main navigation"><a href="#how-it-works">How it works</a><a href="/login">Sign in</a></nav>
        <a className="header-cta" href="/login">Open app <span aria-hidden="true">→</span></a>
      </header>
      <main id="main-content" tabIndex={-1}>
        <section className="hero" id="top">
          <div className="eyebrow">A digital safety companion for everyday life</div>
          <h1>Clarity is a kind of <em>protection.</em></h1>
          <p className="hero-copy">Guardian helps people understand suspicious messages, difficult documents, and confusing webpages—in calm, simple language.</p>
          <div className="hero-actions"><a className="button primary" href="/login">Get started for free <span aria-hidden="true">→</span></a><span className="quiet-proof">Made for the moments you pause and wonder.</span></div>
          <div className="hero-card" aria-label="Example Guardian warning">
            <div className="message-meta"><span className="guardian-dot">✦</span> Guardian reviewed this</div>
            <p>“Your account will be closed today. Send your OTP now.”</p>
            <div className="risk-line"><strong>High risk</strong><span>Never share your OTP. Contact your bank using the number on your card.</span></div>
          </div>
        </section>
        <section className="principles" id="how-it-works" aria-labelledby="principles-title">
          <p className="section-kicker">Designed around dignity, not technical jargon</p>
          <h2 id="principles-title">Small, steady help—right when it matters.</h2>
          <div className="benefit-grid">{benefits.map(([number, title, text]) => <article className="benefit" key={number}><span>{number}</span><h3>{title}</h3><p>{text}</p></article>)}</div>
        </section>

      </main>
      <footer><span>Guardian · Hackathon prototype</span><span>Simple language. Safer decisions.</span></footer>
    </>
  );
}
