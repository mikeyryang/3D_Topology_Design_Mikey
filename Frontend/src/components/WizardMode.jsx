import { useState } from "react";

const S = {
  page: {
    padding: "24px",
    color: "var(--forge-text, #e8e8f0)",
    fontFamily: "'DM Sans', sans-serif",
    minHeight: "80vh",
  },
  title: {
    fontFamily: "'Space Mono', monospace",
    fontSize: "13px",
    letterSpacing: "0.2em",
    color: "var(--forge-accent, #00d4ff)",
    marginBottom: "8px",
    textTransform: "uppercase",
  },
  heading: {
    fontSize: "28px",
    fontWeight: "700",
    marginBottom: "32px",
    color: "var(--forge-text, #e8e8f0)",
  },
  section: {
    marginBottom: "32px",
  },
  sectionLabel: {
    fontFamily: "'Space Mono', monospace",
    fontSize: "11px",
    letterSpacing: "0.15em",
    color: "var(--forge-muted, #6b6b8a)",
    textTransform: "uppercase",
    marginBottom: "12px",
  },
  presetGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "12px",
    marginBottom: "8px",
  },
  presetCard: (active) => ({
    background: active ? "rgba(0,212,255,0.1)" : "var(--forge-card, #1a1a26)",
    border: `1px solid ${active ? "var(--forge-accent, #00d4ff)" : "var(--forge-border, #2a2a3d)"}`,
    borderRadius: "8px",
    padding: "16px",
    cursor: "pointer",
    transition: "all 0.2s",
    boxShadow: active ? "0 0 16px rgba(0,212,255,0.15)" : "none",
  }),
  presetIcon: {
    fontSize: "28px",
    marginBottom: "8px",
  },
  presetName: (active) => ({
    fontFamily: "'Space Mono', monospace",
    fontSize: "12px",
    color: active ? "var(--forge-accent, #00d4ff)" : "var(--forge-text, #e8e8f0)",
    marginBottom: "4px",
  }),
  presetDesc: {
    fontSize: "12px",
    color: "var(--forge-muted, #6b6b8a)",
  },
  sliderRow: {
    marginBottom: "20px",
  },
  sliderLabel: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "8px",
    fontSize: "14px",
  },
  sliderName: {
    color: "var(--forge-text, #e8e8f0)",
  },
  sliderValue: {
    fontFamily: "'Space Mono', monospace",
    color: "var(--forge-accent, #00d4ff)",
    fontSize: "13px",
  },
  slider: {
    width: "100%",
    accentColor: "var(--forge-accent, #00d4ff)",
    cursor: "pointer",
  },
  sliderDesc: {
    fontSize: "11px",
    color: "var(--forge-muted, #6b6b8a)",
    marginTop: "4px",
  },
  infoBox: {
    background: "var(--forge-card, #1a1a26)",
    border: "1px solid var(--forge-border, #2a2a3d)",
    borderRadius: "8px",
    padding: "16px",
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "16px",
    marginBottom: "24px",
  },
  infoItem: {
    textAlign: "center",
  },
  infoVal: {
    fontFamily: "'Space Mono', monospace",
    fontSize: "18px",
    color: "var(--forge-green, #00ff88)",
    display: "block",
  },
  infoLabel: {
    fontSize: "11px",
    color: "var(--forge-muted, #6b6b8a)",
    textTransform: "uppercase",
    letterSpacing: "0.1em",
  },
  runBtn: {
    width: "100%",
    padding: "16px",
    background: "var(--forge-accent, #00d4ff)",
    color: "#0a0a0f",
    border: "none",
    borderRadius: "8px",
    fontFamily: "'Space Mono', monospace",
    fontSize: "14px",
    fontWeight: "700",
    letterSpacing: "0.15em",
    textTransform: "uppercase",
    cursor: "pointer",
    transition: "opacity 0.2s",
  },
};

const PRESETS = {
  cantilever: {
    icon: "▬",
    name: "Cantilever Beam",
    desc: "Fixed left, downward load on right",
    mesh: { Lx: 1.0, Ly: 0.2, Lz: 0.1, nx: 20, ny: 6, nz: 4 },
    boundary_conditions: [{ axis: 0, coord: 0.0, tol: 1e-6 }],
    loads: [{ type: "distributed", axis: 0, coord: 1.0, direction: 1, magnitude: 1e4 }],
  },
  bridge: {
    icon: "⌒",
    name: "Bridge Structure",
    desc: "Fixed both ends, load on top center",
    mesh: { Lx: 1.0, Ly: 0.3, Lz: 0.1, nx: 20, ny: 8, nz: 4 },
    boundary_conditions: [
      { axis: 0, coord: 0.0, tol: 1e-6 },
      { axis: 0, coord: 1.0, tol: 1e-6 },
    ],
    loads: [{ type: "distributed", axis: 1, coord: 0.3, direction: 1, magnitude: -1e4 }],
  },
  drone_arm: {
    icon: "✛",
    name: "Drone Arm",
    desc: "Fixed base, point load at tip",
    mesh: { Lx: 0.5, Ly: 0.05, Lz: 0.05, nx: 20, ny: 4, nz: 4 },
    boundary_conditions: [{ axis: 0, coord: 0.0, tol: 1e-6 }],
    loads: [{ type: "point", direction: 1, magnitude: -500, location: [0.5, 0.025, 0.025] }],
  },
};

export default function WizardMode({ onSubmit }) {
  const [preset, setPreset]         = useState("cantilever");
  const [volumeFrac, setVolumeFrac] = useState(0.3);
  const [iterations, setIterations] = useState(50);
  const [penalty, setPenalty]       = useState(3.0);

  const p = PRESETS[preset];
  const m = p.mesh;
  const nElements = m.nx * m.ny * m.nz;
  const nNodes    = (m.nx + 1) * (m.ny + 1) * (m.nz + 1);
  const estTime   = Math.round(iterations * nElements * 0.0015);

  const handleRun = () => {
    const config = {
      mesh: p.mesh,
      boundary_conditions: p.boundary_conditions,
      loads: p.loads,
      volume_fraction: volumeFrac,
      penalty,
      filter_radius: 0.02,
      n_iterations: iterations,
      initial_density: volumeFrac,
    };
    onSubmit(config);
  };

  return (
    <div style={S.page}>
      <p style={S.title}>Setup</p>
      <h2 style={S.heading}>Configure Your Structure</h2>

      {/* Step 1 — Preset */}
      <div style={S.section}>
        <p style={S.sectionLabel}>Step 1 — Choose a Preset</p>
        <div style={S.presetGrid}>
          {Object.entries(PRESETS).map(([key, val]) => (
            <div key={key}
                 style={S.presetCard(preset === key)}
                 onClick={() => setPreset(key)}>
              <div style={S.presetIcon}>{val.icon}</div>
              <div style={S.presetName(preset === key)}>{val.name}</div>
              <div style={S.presetDesc}>{val.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Step 2 — Parameters */}
      <div style={S.section}>
        <p style={S.sectionLabel}>Step 2 — Adjust Parameters</p>

        <div style={S.sliderRow}>
          <div style={S.sliderLabel}>
            <span style={S.sliderName}>Volume Fraction</span>
            <span style={S.sliderValue}>{(volumeFrac * 100).toFixed(0)}%</span>
          </div>
          <input type="range" min="0.1" max="0.6" step="0.05"
                 value={volumeFrac} onChange={e => setVolumeFrac(+e.target.value)}
                 style={S.slider} />
          <div style={S.sliderDesc}>
            How much material to keep — lower = more aggressive removal
          </div>
        </div>

        <div style={S.sliderRow}>
          <div style={S.sliderLabel}>
            <span style={S.sliderName}>Iterations</span>
            <span style={S.sliderValue}>{iterations}</span>
          </div>
          <input type="range" min="10" max="100" step="10"
                 value={iterations} onChange={e => setIterations(+e.target.value)}
                 style={S.slider} />
          <div style={S.sliderDesc}>
            More iterations = better convergence but slower
          </div>
        </div>

        <div style={S.sliderRow}>
          <div style={S.sliderLabel}>
            <span style={S.sliderName}>SIMP Penalty</span>
            <span style={S.sliderValue}>{penalty.toFixed(1)}</span>
          </div>
          <input type="range" min="1.0" max="5.0" step="0.5"
                 value={penalty} onChange={e => setPenalty(+e.target.value)}
                 style={S.slider} />
          <div style={S.sliderDesc}>
            Higher = sharper black/white result, lower = more gradual
          </div>
        </div>
      </div>

      {/* Step 3 — Summary */}
      <div style={S.section}>
        <p style={S.sectionLabel}>Step 3 — Review & Run</p>
        <div style={S.infoBox}>
          <div style={S.infoItem}>
            <span style={S.infoVal}>{nElements}</span>
            <span style={S.infoLabel}>Elements</span>
          </div>
          <div style={S.infoItem}>
            <span style={S.infoVal}>{nNodes}</span>
            <span style={S.infoLabel}>Nodes</span>
          </div>
          <div style={S.infoItem}>
            <span style={S.infoVal}>~{estTime}s</span>
            <span style={S.infoLabel}>Est. Time</span>
          </div>
        </div>
        <button style={S.runBtn} onClick={handleRun}>
          ▶ &nbsp; Run Optimization
        </button>
      </div>
    </div>
  );
}
