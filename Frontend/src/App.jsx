import { useState } from "react";
import WizardMode from "./components/WizardMode";
import MeshViewer from "./components/MeshViewer";
import ResultsViewer from "./components/ResultsViewer";

const globalStyle = `
  :root {
    --forge-bg:      #0a0a0f;
    --forge-surface: #12121a;
    --forge-card:    #1a1a26;
    --forge-border:  #2a2a3d;
    --forge-accent:  #00d4ff;
    --forge-green:   #00ff88;
    --forge-orange:  #ff6b35;
    --forge-text:    #e8e8f0;
    --forge-muted:   #6b6b8a;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0a0a0f; color: #e8e8f0; font-family: 'Segoe UI', sans-serif; }
  input[type=range] { accent-color: #00d4ff; cursor: pointer; width: 100%; }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
`;

const S = {
  app:   { minHeight: "100vh", background: "#0a0a0f", color: "#e8e8f0" },
  nav:   {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "0 32px", height: "60px", borderBottom: "1px solid #2a2a3d",
    background: "rgba(10,10,15,0.95)", position: "sticky", top: 0, zIndex: 100,
  },
  logoBtn: {
    display: "flex", alignItems: "center", gap: "12px",
    background: "none", border: "none", cursor: "pointer", color: "#e8e8f0",
  },
  logoBox: {
    width: "32px", height: "32px", background: "#00d4ff", borderRadius: "6px",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "monospace", fontWeight: "700", fontSize: "13px", color: "#0a0a0f",
  },
  logoText: { fontFamily: "monospace", fontWeight: "700", fontSize: "16px", letterSpacing: "0.15em" },
  breadcrumb: { display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", fontFamily: "monospace" },
  crumb: (a) => ({ color: a ? "#00d4ff" : "#6b6b8a", fontWeight: a ? "700" : "400" }),
  arrow: { color: "#2a2a3d" },
  liveDot: { display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", fontFamily: "monospace", color: "#6b6b8a" },
  dot: { width: "7px", height: "7px", borderRadius: "50%", background: "#00ff88", animation: "pulse 2s ease-in-out infinite" },
  main: { padding: "24px 32px" },
  split: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", height: "calc(100vh - 108px)" },
  panel: { background: "#1a1a26", border: "1px solid #2a2a3d", borderRadius: "12px", overflow: "hidden" },

  landing: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "85vh", textAlign: "center", padding: "40px" },
  eyebrow: { fontFamily: "monospace", fontSize: "12px", letterSpacing: "0.3em", color: "#00d4ff", textTransform: "uppercase", marginBottom: "16px" },
  h1: { fontFamily: "monospace", fontSize: "60px", fontWeight: "700", lineHeight: "1.1", marginBottom: "20px" },
  accent: { color: "#00d4ff" },
  subtitle: { fontSize: "18px", color: "#6b6b8a", maxWidth: "480px", lineHeight: "1.7", marginBottom: "40px" },
  pillRow: { display: "flex", flexWrap: "wrap", gap: "10px", justifyContent: "center", marginBottom: "40px" },
  pill: { padding: "8px 18px", border: "1px solid #2a2a3d", borderRadius: "999px", fontSize: "13px", color: "#6b6b8a" },
  ctaBtn: {
    padding: "16px 48px", background: "#00d4ff", color: "#0a0a0f",
    border: "none", borderRadius: "8px", fontFamily: "monospace",
    fontSize: "14px", fontWeight: "700", letterSpacing: "0.15em",
    textTransform: "uppercase", cursor: "pointer", marginBottom: "48px",
  },
  presetRow: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", maxWidth: "560px", width: "100%" },
  presetCard: {
    background: "#1a1a26", border: "1px solid #2a2a3d", borderRadius: "10px",
    padding: "20px 16px", cursor: "pointer", textAlign: "center",
  },
  pIcon: { fontSize: "32px", marginBottom: "10px" },
  pName: { fontFamily: "monospace", fontSize: "11px", color: "#00d4ff", marginBottom: "4px" },
  pDesc: { fontSize: "11px", color: "#6b6b8a" },
};

export default function App() {
  const [page, setPage]       = useState("landing");
  const [config, setConfig]   = useState(null);
  const [jobId, setJobId]     = useState(null);
  const [results, setResults] = useState(null);

  const handleStartOptimization = async (cfg) => {
    setConfig(cfg);
    try {
      const res  = await fetch("http://localhost:8000/api/jobs", { method: "POST" });
      const data = await res.json();
      setJobId(data.job_id);
      setPage("optimizing");
    } catch {
      alert("Cannot connect to backend — run: uvicorn main:app --reload --port 8000");
    }
  };

  const handleComplete = (r) => { setResults(r); setPage("results"); };

  const handleReset = () => {
    setPage("landing"); setConfig(null);
    setJobId(null); setResults(null);
  };

  return (
    <>
      <style>{globalStyle}</style>
      <div style={S.app}>

        {/* NAV */}
        <nav style={S.nav}>
          <button style={S.logoBtn} onClick={handleReset}>
            <div style={S.logoBox}>TF</div>
            <span style={S.logoText}>TOPOFORGE</span>
          </button>

          <div style={S.breadcrumb}>
            <span style={S.crumb(page==="landing"||page==="wizard")}>Setup</span>
            <span style={S.arrow}>→</span>
            <span style={S.crumb(page==="optimizing")}>Optimize</span>
            <span style={S.arrow}>→</span>
            <span style={S.crumb(page==="results")}>Results</span>
          </div>

          <div style={S.liveDot}>
            <div style={S.dot} />
            BACKEND LIVE
          </div>
        </nav>

        {/* PAGES */}
        <main style={S.main}>
          {page === "landing"  && <LandingPage onStart={() => setPage("wizard")} />}
          {page === "wizard"   && <WizardMode onSubmit={handleStartOptimization} />}

          {(page === "optimizing" || page === "results") && (
            <div style={S.split}>
              <div style={S.panel}>
                <MeshViewer
                  jobId={jobId}
                  config={config}
                  onComplete={handleComplete}
                />
              </div>
              <div style={{ ...S.panel, overflowY: "auto" }}>
                <ResultsViewer
                  results={results}
                  isOptimizing={page==="optimizing"}
                />
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}

function LandingPage({ onStart }) {
  return (
    <div style={S.landing}>
      <p style={S.eyebrow}>3D Structural Optimization</p>
      <h1 style={S.h1}>TOPO<span style={S.accent}>FORGE</span></h1>
      <p style={S.subtitle}>
        Design material-efficient 3D structures using SIMP topology optimization. No code required.
      </p>
      <div style={S.pillRow}>
        {["⬡ Live 3D Viewer","⚡ Real-time Optimization","🎯 Guided Wizard","📐 SIMP Algorithm"]
          .map(f => <span key={f} style={S.pill}>{f}</span>)}
      </div>
      <button style={S.ctaBtn} onClick={onStart}>Start Designing →</button>
      <div style={S.presetRow}>
        {[
          { icon:"▬", name:"Cantilever Beam",  desc:"Fixed + tip load" },
          { icon:"⌒", name:"Bridge Structure", desc:"Dual support + load" },
          { icon:"✛", name:"Drone Arm",        desc:"Lightweight tip load" },
        ].map(p => (
          <div key={p.name} style={S.presetCard} onClick={onStart}>
            <div style={S.pIcon}>{p.icon}</div>
            <div style={S.pName}>{p.name}</div>
            <div style={S.pDesc}>{p.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}