import { useEffect, useRef, useState } from "react";

// ─── Global styles ────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Space+Grotesk:wght@400;500;600;700&display=swap');

  .lp * { box-sizing: border-box; }

  @keyframes lp-fade-up {
    from { opacity: 0; transform: translateY(32px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes lp-fade-in {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes lp-line-grow {
    from { width: 0; }
    to   { width: 48px; }
  }
  @keyframes lp-cursor {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0; }
  }

  .lp-visible {
    animation: lp-fade-up 0.7s cubic-bezier(0.16,1,0.3,1) both;
  }
  .lp-visible-fade {
    animation: lp-fade-in 0.6s ease both;
  }

  .lp-btn-primary {
    display: inline-flex; align-items: center; gap: 10px;
    padding: 14px 32px;
    background: #e8e8f0; color: #0a0a0f;
    border: none; border-radius: 4px;
    font-family: 'Space Grotesk', sans-serif;
    font-size: 14px; font-weight: 600; letter-spacing: 0.02em;
    cursor: pointer; transition: all 0.2s ease;
    text-decoration: none;
  }
  .lp-btn-primary:hover {
    background: #ffffff;
    transform: translateY(-1px);
    box-shadow: 0 8px 24px rgba(232,232,240,0.15);
  }

  .lp-btn-ghost {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 14px 32px;
    background: transparent; color: #6b6b8a;
    border: 1px solid #2a2a3d; border-radius: 4px;
    font-family: 'Space Grotesk', sans-serif;
    font-size: 14px; font-weight: 500;
    cursor: pointer; transition: all 0.2s ease;
  }
  .lp-btn-ghost:hover {
    border-color: #6b6b8a; color: #e8e8f0;
  }

  .lp-preset:hover .lp-preset-inner {
    border-color: rgba(232,232,240,0.15) !important;
    transform: translateY(-2px);
  }
  .lp-preset:hover .lp-preset-num {
    color: #e8e8f0 !important;
  }

  .lp-img-panel {
    transition: transform 0.4s ease, box-shadow 0.4s ease;
  }
  .lp-img-panel:hover {
    transform: scale(1.02);
    box-shadow: 0 24px 64px rgba(0,0,0,0.5) !important;
  }

  .lp-contact-input {
    width: 100%; padding: 12px 16px;
    background: #12121a; border: 1px solid #2a2a3d;
    border-radius: 4px; color: #e8e8f0;
    font-family: 'Inter', sans-serif; font-size: 14px;
    outline: none; transition: border-color 0.2s;
    margin-bottom: 12px;
  }
  .lp-contact-input:focus { border-color: #6b6b8a; }
  .lp-contact-input::placeholder { color: #3a3a52; }

  .lp-nav-link {
    font-family: 'Inter', sans-serif; font-size: 13px;
    color: #6b6b8a; text-decoration: none;
    transition: color 0.2s; cursor: pointer;
    background: none; border: none; padding: 0;
  }
  .lp-nav-link:hover { color: #e8e8f0; }

  .lp-tag {
    display: inline-block;
    padding: 4px 10px;
    background: rgba(232,232,240,0.06);
    border: 1px solid rgba(232,232,240,0.1);
    border-radius: 2px;
    font-family: 'Space Grotesk', sans-serif;
    font-size: 10px; font-weight: 600;
    letter-spacing: 0.12em; text-transform: uppercase;
    color: #6b6b8a;
  }
`;

// ─── Intersection Observer hook for scroll animations ─────────
function useReveal(threshold = 0.15) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible];
}

// ─── Image placeholder component ──────────────────────────────
function ImgPanel({ label, sublabel, accent = "#2a2a3d", ratio = "56.25%", src }) {
  return (
    <div className="lp-img-panel" style={{
      position: "relative", width: "100%", paddingBottom: ratio,
      background: "#12121a", borderRadius: "8px",
      border: "1px solid #1e1e2e", overflow: "hidden",
      boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
    }}>
      {src ? (
        <img src={src} alt={label} style={{
          position: "absolute", inset: 0, width: "100%", height: "100%",
          objectFit: "cover",
        }} />
      ) : (
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: "12px",
          background: `radial-gradient(ellipse at center, ${accent}18 0%, transparent 65%)`,
        }}>
          {/* Subtle cross-hair graphic */}
          <div style={{ position: "relative", width: "40px", height: "40px" }}>
            <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: "1px", background: "#2a2a3d" }} />
            <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: "1px", background: "#2a2a3d" }} />
            <div style={{
              position: "absolute", top: "50%", left: "50%",
              transform: "translate(-50%,-50%)",
              width: "8px", height: "8px", borderRadius: "50%",
              background: accent, opacity: 0.6,
            }} />
          </div>
          <span style={{ fontFamily: "monospace", fontSize: "11px", color: "#3a3a52", letterSpacing: "0.1em" }}>
            {label}
          </span>
          {sublabel && (
            <span style={{ fontFamily: "monospace", fontSize: "10px", color: "#2a2a3d" }}>
              {sublabel}
            </span>
          )}
        </div>
      )}
      {/* Corner markers */}
      {[["0","0"],["0","auto"],["auto","0"],["auto","auto"]].map(([t,b],i) => (
        <div key={i} style={{
          position: "absolute",
          top: t === "0" ? "8px" : "auto",
          bottom: b === "auto" ? "8px" : "auto",
          left: i < 2 ? "8px" : "auto",
          right: i >= 2 ? "8px" : "auto",
          width: "10px", height: "10px",
          borderTop: t === "0" ? `1px solid #2a2a3d` : "none",
          borderBottom: b === "auto" ? `1px solid #2a2a3d` : "none",
          borderLeft: i < 2 ? `1px solid #2a2a3d` : "none",
          borderRight: i >= 2 ? `1px solid #2a2a3d` : "none",
        }} />
      ))}
    </div>
  );
}

// ─── Section wrapper with reveal animation ────────────────────
function Section({ children, delay = 0, style = {} }) {
  const [ref, visible] = useReveal();
  return (
    <div ref={ref} className={visible ? "lp-visible" : ""} style={{
      opacity: 0,
      animationDelay: `${delay}ms`,
      ...style,
    }}>
      {children}
    </div>
  );
}

// ─── Divider ──────────────────────────────────────────────────
function Divider() {
  return <div style={{ borderTop: "1px solid #1a1a26", margin: "0 40px" }} />;
}

// ─── Main Component ───────────────────────────────────────────
export default function LandingPage({ onStart }) {
  const [email, setEmail]     = useState("");
  const [name, setName]       = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent]       = useState(false);

  const handleContact = async (e) => {
    e.preventDefault();
    const res = await fetch("https://formspree.io/f/xvzvngek", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message }),
    });
    if (res.ok) setSent(true);
};

  return (
    <div className="lp" style={{
      background: "#0a0a0f", color: "#e8e8f0",
      fontFamily: "'Inter', sans-serif",
    }}>
      <style>{CSS}</style>

      {/* ══════════════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════════════ */}
      <section style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        justifyContent: "center", padding: "80px 64px 60px",
        maxWidth: "1280px", margin: "0 auto",
        position: "relative",
      }}>
        {/* Vertical rule */}
        <div style={{
          position: "absolute", left: "64px", top: 0, bottom: 0,
          width: "1px", background: "linear-gradient(to bottom, transparent, #2a2a3d 20%, #2a2a3d 80%, transparent)",
        }} />

        <div style={{ paddingLeft: "32px" }}>
          <div className="lp-visible" style={{ animationDelay: "0ms", marginBottom: "32px" }}>
            <span className="lp-tag">V 1.0 — Hackathon Build</span>
          </div>

          <h1 className="lp-visible" style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: "clamp(52px, 7vw, 96px)",
            fontWeight: "700", lineHeight: "0.95",
            letterSpacing: "-0.03em", marginBottom: "32px",
            animationDelay: "80ms",
          }}>
            Structure<br />
            <span style={{ color: "#3a3a52" }}>through</span><br />
            <span style={{
              background: "linear-gradient(90deg, #e8e8f0, #6b6b8a)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>Optimization.</span>
          </h1>

          <p className="lp-visible" style={{
            fontSize: "17px", color: "#6b6b8a", maxWidth: "480px",
            lineHeight: "1.75", marginBottom: "40px", animationDelay: "160ms",
          }}>
            TopoForge is a browser-based interface for 3D topology optimization.
            Define boundary conditions, apply loads, and watch the SIMP algorithm
            sculpt an efficient structure in real time.
          </p>

          <div className="lp-visible" style={{
            display: "flex", gap: "12px", animationDelay: "240ms",
          }}>
            <button className="lp-btn-primary" onClick={onStart}>
              Open App
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M1 7h12M8 2l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <button className="lp-btn-ghost" onClick={() => document.getElementById('lp-gallery')?.scrollIntoView({ behavior: 'smooth' })}>
              See Examples
            </button>
          </div>
        </div>

        {/* Scroll indicator */}
        <div style={{
          position: "absolute", bottom: "32px", left: "64px",
          display: "flex", alignItems: "center", gap: "12px",
        }}>
          <div style={{ width: "1px", height: "40px", background: "linear-gradient(to bottom, #2a2a3d, transparent)" }} />
          <span style={{ fontFamily: "monospace", fontSize: "10px", color: "#3a3a52", letterSpacing: "0.15em" }}>
            SCROLL
          </span>
        </div>
      </section>

      <Divider />

      {/* ══════════════════════════════════════════════════════
          STATS ROW
      ══════════════════════════════════════════════════════ */}
      <section style={{ padding: "48px 64px", maxWidth: "1280px", margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0" }}>
          {[
            { val: "93%",   label: "Stiffness improvement" },
            { val: "3",     label: "Preset templates" },
            { val: "480",   label: "Mesh elements" },
            { val: "0",     label: "Lines of code needed" },
          ].map((s, i) => (
            <Section key={s.label} delay={i * 60} style={{
              padding: "32px 24px",
              borderLeft: i === 0 ? "none" : "1px solid #1a1a26",
            }}>
              <div style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: "40px", fontWeight: "700",
                color: "#e8e8f0", marginBottom: "8px", letterSpacing: "-0.02em",
              }}>
                {s.val}
              </div>
              <div style={{ fontSize: "13px", color: "#3a3a52" }}>{s.label}</div>
            </Section>
          ))}
        </div>
      </section>

      <Divider />

      {/* ══════════════════════════════════════════════════════
          GALLERY / IMAGE PANELS
      ══════════════════════════════════════════════════════ */}
      <section id="lp-gallery" style={{ padding: "80px 64px", maxWidth: "1280px", margin: "0 auto" }}>
        <Section style={{ marginBottom: "48px" }}>
          <span className="lp-tag" style={{ marginBottom: "16px", display: "inline-block" }}>Gallery</span>
          <h2 style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: "36px", fontWeight: "700",
            letterSpacing: "-0.02em", color: "#e8e8f0",
          }}>
            Results in the wild
          </h2>
        </Section>

        {/* Large feature panel */}
        <Section style={{ marginBottom: "16px" }}>
          <ImgPanel
            src="/app-demo-1.png"
            label="SIMP OPTIMIZED DESIGN"
            accent="#00d4ff"
            ratio="52%"
          />
        </Section>

        {/* Three smaller panels */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "16px" }}>
          {[
            { label: "CANTILEVER RESULT", accent: "#00d4ff", src: "/demo-4.png" },
            { label: "BRIDGE TOPOLOGY",   accent: "#00ff88", src: "/demo-5.png" },
            { label: "DRONE ARM",         accent: "#ff6b35", src: "/demo-6.png" }, 
          ].map((p, i) => (
            <Section key={p.label} delay={i * 80}>
             <ImgPanel label={p.label} src={p.src} sublabel="800 × 600" accent={p.accent} ratio="66%" />
            </Section>
          ))}
        </div>

        {/* Two wide panels */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          {[
            { label: "CONVERGENCE CHART",    accent: "#6b6b8a", src: "/app-demo-2.png" },
            { label: "DENSITY DISTRIBUTION", accent: "#6b6b8a", src: "/app-demo-3.png" },
          ].map((p, i) => (
            <Section key={p.label} delay={i * 80}>
              <ImgPanel label={p.label} src={p.src} sublabel="1200 × 600" accent={p.accent} ratio="50%" />
            </Section>
          ))}
        </div>

        <Section style={{ marginTop: "16px", textAlign: "right" }}>
          <p style={{ fontSize: "12px", color: "#3a3a52", fontFamily: "monospace" }}>
          </p>
        </Section>
      </section>

      <Divider />

      {/* ══════════════════════════════════════════════════════
          HOW IT WORKS
      ══════════════════════════════════════════════════════ */}
      <section style={{ padding: "80px 64px", maxWidth: "1280px", margin: "0 auto" }}>
        <Section style={{ marginBottom: "56px" }}>
          <span className="lp-tag" style={{ marginBottom: "16px", display: "inline-block" }}>Process</span>
          <h2 style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: "36px", fontWeight: "700",
            letterSpacing: "-0.02em", color: "#e8e8f0",
          }}>
            Three steps to an optimized structure
          </h2>
        </Section>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "40px" }}>
          {[
            {
              n: "01",
              title: "Configure",
              body: "Select a preset or define your own mesh dimensions, boundary conditions, and load cases using the guided wizard.",
              icon: "◈",
            },
            {
              n: "02",
              title: "Optimize",
              body: "The SIMP algorithm iteratively redistributes material density, minimizing compliance while enforcing a volume fraction constraint.",
              icon: "◎",
            },
            {
              n: "03",
              title: "Analyze",
              body: "Inspect the live 3D result, review convergence charts, and examine the density distribution to understand the final structure.",
              icon: "◉",
            },
          ].map((s, i) => (
            <Section key={s.n} delay={i * 100}>
              <div style={{
                fontFamily: "monospace", fontSize: "11px", color: "#3a3a52",
                letterSpacing: "0.1em", marginBottom: "20px",
              }}>
                {s.n}
              </div>
              <div style={{ fontSize: "24px", marginBottom: "16px", color: "#6b6b8a" }}>{s.icon}</div>
              <h3 style={{
                fontFamily: "'Space Grotesk', sans-serif", fontSize: "20px",
                fontWeight: "600", color: "#e8e8f0", marginBottom: "12px",
              }}>
                {s.title}
              </h3>
              <p style={{ fontSize: "14px", color: "#6b6b8a", lineHeight: "1.7" }}>
                {s.body}
              </p>
            </Section>
          ))}
        </div>
      </section>

      <Divider />

      {/* ══════════════════════════════════════════════════════
          PRESETS
      ══════════════════════════════════════════════════════ */}
      <section style={{ padding: "80px 64px", maxWidth: "1280px", margin: "0 auto" }}>
        <Section style={{ marginBottom: "56px" }}>
          <span className="lp-tag" style={{ marginBottom: "16px", display: "inline-block" }}>Templates</span>
          <h2 style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: "36px", fontWeight: "700",
            letterSpacing: "-0.02em", color: "#e8e8f0",
          }}>
            Start from a preset
          </h2>
        </Section>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1px", background: "#1a1a26" }}>
          {[
            { n:"01", name: "Cantilever Beam",  desc: "Fixed left face, distributed downward load on the free right end. Discovers the I-beam principle autonomously.", tag: "480 elements" },
            { n:"02", name: "Bridge Structure", desc: "Pinned at both ends with a central downward load. Produces elegant arch-like load paths.", tag: "640 elements" },
            { n:"03", name: "Drone Arm",        desc: "Fixed at the base hub with a point load at the motor tip. Optimizes for minimum mass.", tag: "320 elements" },
          ].map((p, i) => (
            <Section key={p.n} delay={i * 80} style={{ background: "#0a0a0f" }}>
              <div className="lp-preset" onClick={onStart} style={{ cursor: "pointer", padding: "32px" }}>
                <div className="lp-preset-inner" style={{ transition: "all 0.25s" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
                    <span className="lp-preset-num lp-tag" style={{ transition: "color 0.2s" }}>{p.n}</span>
                    <span style={{ fontSize: "11px", color: "#3a3a52", fontFamily: "monospace" }}>{p.tag}</span>
                  </div>
                  <h3 style={{
                    fontFamily: "'Space Grotesk', sans-serif", fontSize: "20px",
                    fontWeight: "600", color: "#e8e8f0", marginBottom: "12px",
                  }}>
                    {p.name}
                  </h3>
                  <p style={{ fontSize: "13px", color: "#6b6b8a", lineHeight: "1.7", marginBottom: "24px" }}>
                    {p.desc}
                  </p>
                  <div style={{
                    display: "flex", alignItems: "center", gap: "8px",
                    fontSize: "12px", color: "#3a3a52", fontFamily: "monospace",
                  }}>
                    <span>Select preset</span>
                    <span>→</span>
                  </div>
                </div>
              </div>
            </Section>
          ))}
        </div>

        <Section style={{ marginTop: "32px", textAlign: "center" }}>
          <button className="lp-btn-primary" onClick={onStart}>
            Launch App →
          </button>
        </Section>
      </section>

      <Divider />

      {/* ══════════════════════════════════════════════════════
          TECH STACK
      ══════════════════════════════════════════════════════ */}
      <section style={{ padding: "64px 64px", maxWidth: "1280px", margin: "0 auto" }}>
        <Section style={{ marginBottom: "32px" }}>
          <span className="lp-tag">Built with</span>
        </Section>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {["React 18","Three.js","FastAPI","NumPy","WebSockets","SIMP Algorithm","Hex8 FEM","Recharts"].map(t => (
            <span key={t} style={{
              padding: "8px 16px", background: "#12121a",
              border: "1px solid #1e1e2e", borderRadius: "4px",
              fontSize: "13px", color: "#6b6b8a", fontFamily: "monospace",
            }}>
              {t}
            </span>
          ))}
        </div>
      </section>

      <Divider />

      {/* ══════════════════════════════════════════════════════
          CONTACT
      ══════════════════════════════════════════════════════ */}
      <section id="lp-contact" style={{ padding: "80px 64px", maxWidth: "1280px", margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "80px", alignItems: "start" }}>

          {/* Left — info */}
          <Section>
            <span className="lp-tag" style={{ marginBottom: "24px", display: "inline-block" }}>Contact</span>
            <h2 style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: "36px", fontWeight: "700",
              letterSpacing: "-0.02em", color: "#e8e8f0",
              marginBottom: "20px", lineHeight: "1.1",
            }}>
              Get in touch
            </h2>
            <p style={{ fontSize: "15px", color: "#6b6b8a", lineHeight: "1.75", marginBottom: "40px" }}>
              Interested in topology optimization, computational design, or this project?
              Reach out — always happy to connect.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {[
                { label: "Project",  val: "NYU Hack3D Hackathon 2026" },
                { label: "Stack",    val: "Python · React · Three.js" },
                { label: "GitHub",   val: "github.com/3D_Topology_Design_Mikey" },
              ].map(r => (
                <div key={r.label} style={{ display: "flex", gap: "24px" }}>
                  <span style={{ fontFamily: "monospace", fontSize: "11px", color: "#3a3a52", width: "56px", flexShrink: 0, paddingTop: "2px" }}>
                    {r.label}
                  </span>
                  <span style={{ fontSize: "13px", color: "#6b6b8a" }}>{r.val}</span>
                </div>
              ))}
            </div>
          </Section>

          {/* Right — form */}
          <Section delay={100}>
            {sent ? (
              <div style={{
                padding: "40px", background: "#12121a",
                border: "1px solid #1e1e2e", borderRadius: "8px",
                textAlign: "center",
              }}>
                <div style={{ fontSize: "32px", marginBottom: "16px" }}>✓</div>
                <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "16px", color: "#e8e8f0" }}>
                  Message sent
                </p>
                <p style={{ fontSize: "13px", color: "#6b6b8a", marginTop: "8px" }}>
                  We'll get back to you soon.
                </p>
              </div>
            ) : (
              <form onSubmit={handleContact} style={{
                padding: "32px", background: "#12121a",
                border: "1px solid #1e1e2e", borderRadius: "8px",
              }}>
                <input className="lp-contact-input" placeholder="Your name"
                       value={name} onChange={e => setName(e.target.value)} required />
                <input className="lp-contact-input" placeholder="Email address" type="email"
                       value={email} onChange={e => setEmail(e.target.value)} required />
                <textarea className="lp-contact-input" placeholder="Your message"
                          value={message} onChange={e => setMessage(e.target.value)}
                          rows={5} required
                          style={{ resize: "vertical", fontFamily: "inherit" }} />
                <button type="submit" className="lp-btn-primary" style={{ width: "100%", justifyContent: "center" }}>
                  Send Message
                </button>
              </form>
            )}
          </Section>
        </div>
      </section>

      <Divider />

      {/* ══════════════════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════════════════ */}
      <footer style={{ padding: "32px 64px", maxWidth: "1280px", margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: "700", fontSize: "14px", color: "#3a3a52", letterSpacing: "0.05em" }}>
          TOPOFORGE
        </span>
        <div style={{ display: "flex", gap: "24px" }}>
          <button className="lp-nav-link" onClick={onStart}>App</button>
          <button className="lp-nav-link" onClick={() => document.getElementById('lp-gallery')?.scrollIntoView({ behavior: 'smooth' })}>Gallery</button>
          <button className="lp-nav-link" onClick={() => document.getElementById('lp-contact')?.scrollIntoView({ behavior: 'smooth' })}>Contact</button>
        </div>
        <span style={{ fontFamily: "monospace", fontSize: "11px", color: "#3a3a52" }}>
          © 2026 — Built at CMU Hackathon
        </span>
      </footer>

    </div>
  );
}
