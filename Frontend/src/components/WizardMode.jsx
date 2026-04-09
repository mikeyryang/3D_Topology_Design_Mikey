import { useState } from "react";

const CSS = `
  .wz-preset:hover { border-color: rgba(232,232,240,0.2) !important; }
  .wz-preset.active {
    border-color: #00d4ff !important;
    background: rgba(0,212,255,0.06) !important;
  }
  .wz-preset.active .wz-preset-name { color: #00d4ff !important; }

  .wz-adj:hover { background: rgba(232,232,240,0.08) !important; color: #e8e8f0 !important; }

  .wz-run:hover {
    background: #00eeff !important;
    box-shadow: 0 0 40px rgba(0,212,255,0.3) !important;
    transform: translateY(-1px);
  }

  .wz-slider {
    -webkit-appearance: none;
    width: 100%; height: 2px;
    background: #2a2a3d;
    border-radius: 2px; outline: none; cursor: pointer;
  }
  .wz-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 16px; height: 16px;
    border-radius: 50%;
    background: #00d4ff;
    cursor: pointer;
    box-shadow: 0 0 8px rgba(0,212,255,0.5);
    transition: transform 0.15s;
  }
  .wz-slider::-webkit-slider-thumb:hover { transform: scale(1.2); }
  .wz-slider::-moz-range-thumb {
    width: 16px; height: 16px;
    border-radius: 50%; border: none;
    background: #00d4ff; cursor: pointer;
  }
`;

const PRESETS = {
  cantilever: {
    icon: "▬",
    name: "Cantilever Beam",
    tag: "Most Common",
    desc: "Fixed left face with a distributed downward load on the free right end. The optimizer autonomously discovers the I-beam principle.",
    details: ["Fixed: left face (x=0)", "Load: distributed, right face", "Direction: −Y (downward)"],
    mesh: { Lx: 1.0, Ly: 0.2, Lz: 0.1, nx: 10, ny: 4, nz: 3 },
    boundary_conditions: [{ axis: 0, coord: 0.0, tol: 1e-6 }],
    loads: [{ type: "distributed", axis: 0, coord: 1.0, direction: 1, magnitude: 1e4 }],
    color: "#00d4ff",
  },
  bridge: {
    icon: "⌒",
    name: "Bridge Structure",
    tag: "Symmetric",
    desc: "Pinned at both ends with a distributed load on the top center. Produces elegant arch-like load paths similar to real bridges.",
    details: ["Fixed: both ends (x=0, x=1)", "Load: distributed, top center", "Direction: −Y (downward)"],
    mesh: { Lx: 1.0, Ly: 0.3, Lz: 0.1, nx: 10, ny: 5, nz: 3 },
    boundary_conditions: [
      { axis: 0, coord: 0.0, tol: 1e-6 },
      { axis: 0, coord: 1.0, tol: 1e-6 },
    ],
    loads: [{ type: "distributed", axis: 1, coord: 0.3, direction: 1, magnitude: -1e4 }],
    color: "#00ff88",
  },
  drone_arm: {
    icon: "✛",
    name: "Drone Arm",
    tag: "Lightweight",
    desc: "Fixed at the base hub with a point load at the motor tip. Minimizes mass while maintaining stiffness — critical for flight.",
    details: ["Fixed: base hub (x=0)", "Load: point load at tip", "Direction: −Y (downward)"],
    mesh: { Lx: 0.5, Ly: 0.05, Lz: 0.05, nx: 10, ny: 3, nz: 3 },
    boundary_conditions: [{ axis: 0, coord: 0.0, tol: 1e-6 }],
    loads: [{ type: "point", direction: 1, magnitude: -500, location: [0.5, 0.025, 0.025] }],
    color: "#ff6b35",
  },
};

// Precise slider with +/- buttons
function PreciseSlider({ label, value, min, max, step, unit = "", desc, onChange }) {
  const pct = ((value - min) / (max - min)) * 100;

  const decrement = () => onChange(Math.max(min, +(value - step).toFixed(10)));
  const increment = () => onChange(Math.min(max, +(value + step).toFixed(10)));

  return (
    <div style={{ marginBottom: "28px" }}>
      {/* Label row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <span style={{ fontSize: "13px", color: "#e8e8f0", fontWeight: "500" }}>{label}</span>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {/* Decrement */}
          <button className="wz-adj" onClick={decrement} style={{
            width: "28px", height: "28px", borderRadius: "4px",
            background: "#1a1a26", border: "1px solid #2a2a3d",
            color: "#6b6b8a", fontSize: "16px", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.15s", lineHeight: 1,
          }}>−</button>

          {/* Value display */}
          <div style={{
            minWidth: "72px", textAlign: "center",
            fontFamily: "monospace", fontSize: "14px",
            color: "#00d4ff", fontWeight: "700",
            background: "#12121a", border: "1px solid #2a2a3d",
            borderRadius: "4px", padding: "4px 10px",
          }}>
            {unit === "%" ? `${(value * 100).toFixed(0)}%`
              : unit === "x" ? `${value.toFixed(1)}`
              : value}
          </div>

          {/* Increment */}
          <button className="wz-adj" onClick={increment} style={{
            width: "28px", height: "28px", borderRadius: "4px",
            background: "#1a1a26", border: "1px solid #2a2a3d",
            color: "#6b6b8a", fontSize: "16px", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.15s", lineHeight: 1,
          }}>+</button>
        </div>
      </div>

      {/* Slider track with fill */}
      <div style={{ position: "relative", marginBottom: "8px" }}>
        <div style={{
          position: "absolute", top: "50%", left: 0,
          width: `${pct}%`, height: "2px",
          background: "linear-gradient(90deg, #00d4ff, #00ff88)",
          transform: "translateY(-50%)", borderRadius: "2px",
          pointerEvents: "none", zIndex: 1,
        }} />
        <input
          type="range" className="wz-slider"
          min={min} max={max} step={step} value={value}
          onChange={e => onChange(+e.target.value)}
          style={{ position: "relative", zIndex: 2, background: "transparent" }}
        />
      </div>

      {/* Min/max labels + desc */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "11px", color: "#3a3a52", fontFamily: "monospace" }}>
          {unit === "%" ? `${(min * 100).toFixed(0)}%` : min}
        </span>
        <span style={{ fontSize: "11px", color: "#3a3a52", textAlign: "center", flex: 1, padding: "0 16px" }}>
          {desc}
        </span>
        <span style={{ fontSize: "11px", color: "#3a3a52", fontFamily: "monospace" }}>
          {unit === "%" ? `${(max * 100).toFixed(0)}%` : max}
        </span>
      </div>
    </div>
  );
}

export default function WizardMode({ onSubmit }) {
  const [preset, setPreset]         = useState("cantilever");
  const [volumeFrac, setVolumeFrac] = useState(0.30);
  const [iterations, setIterations] = useState(50);
  const [penalty, setPenalty]       = useState(3.0);

  const p = PRESETS[preset];
  const m = p.mesh;
  const nElements = m.nx * m.ny * m.nz;
  const nNodes    = (m.nx + 1) * (m.ny + 1) * (m.nz + 1);
  const estSec    = Math.round(iterations * nElements * 0.0015);

  const handleRun = () => {
    onSubmit({
      mesh: p.mesh,
      boundary_conditions: p.boundary_conditions,
      loads: p.loads,
      volume_fraction: volumeFrac,
      penalty,
      filter_radius: 0.02,
      n_iterations: iterations,
      initial_density: volumeFrac,
    });
  };

  return (
    <>
      <style>{CSS}</style>
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gridTemplateRows: "auto 1fr",
        gap: "24px",
        height: "calc(100vh - 108px)",
        color: "#e8e8f0",
        fontFamily: "'Segoe UI', sans-serif",
      }}>

        {/* ── TOP LEFT: Header ── */}
        <div style={{ gridColumn: "1 / 3", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ fontFamily: "monospace", fontSize: "11px", letterSpacing: "0.2em", color: "#6b6b8a", textTransform: "uppercase", marginBottom: "6px" }}>
              Setup → Configure
            </p>
            <h2 style={{ fontFamily: "monospace", fontSize: "24px", fontWeight: "700", color: "#e8e8f0" }}>
              Design Your Structure
            </h2>
          </div>
          {/* Live mesh stats */}
          <div style={{ display: "flex", gap: "24px" }}>
            {[
              { val: nElements, label: "Elements" },
              { val: nNodes,    label: "Nodes" },
              { val: `~${estSec}s`, label: "Est. Time" },
            ].map(s => (
              <div key={s.label} style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "monospace", fontSize: "20px", fontWeight: "700", color: "#00ff88" }}>{s.val}</div>
                <div style={{ fontSize: "11px", color: "#3a3a52", textTransform: "uppercase", letterSpacing: "0.1em" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── BOTTOM LEFT: Preset selector ── */}
        <div style={{
          background: "#12121a", border: "1px solid #1e1e2e",
          borderRadius: "12px", padding: "28px",
          display: "flex", flexDirection: "column", gap: "12px",
          overflowY: "auto",
        }}>
          <p style={{ fontFamily: "monospace", fontSize: "10px", letterSpacing: "0.15em", color: "#3a3a52", textTransform: "uppercase", marginBottom: "4px" }}>
            Step 1 — Choose a Preset
          </p>

          {Object.entries(PRESETS).map(([key, val]) => (
            <div
              key={key}
              className={`wz-preset${preset === key ? " active" : ""}`}
              onClick={() => setPreset(key)}
              style={{
                background: "#1a1a26", border: "1px solid #2a2a3d",
                borderRadius: "8px", padding: "20px",
                cursor: "pointer", transition: "all 0.2s",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: "16px" }}>
                <div style={{ fontSize: "28px", flexShrink: 0 }}>{val.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                    <span className="wz-preset-name" style={{
                      fontFamily: "monospace", fontSize: "13px", fontWeight: "700",
                      color: preset === key ? val.color : "#e8e8f0",
                      transition: "color 0.2s",
                    }}>
                      {val.name}
                    </span>
                    <span style={{
                      padding: "2px 8px", borderRadius: "3px", fontSize: "10px",
                      fontFamily: "monospace", letterSpacing: "0.08em",
                      background: `${val.color}18`, border: `1px solid ${val.color}33`,
                      color: val.color,
                    }}>
                      {val.tag}
                    </span>
                  </div>
                  <p style={{ fontSize: "12px", color: "#6b6b8a", lineHeight: "1.6", marginBottom: "12px" }}>
                    {val.desc}
                  </p>
                  {/* BC details */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    {val.details.map(d => (
                      <div key={d} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div style={{ width: "4px", height: "4px", borderRadius: "50%", background: val.color, flexShrink: 0 }} />
                        <span style={{ fontFamily: "monospace", fontSize: "11px", color: "#3a3a52" }}>{d}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── BOTTOM RIGHT: Parameters + Run ── */}
        <div style={{
          display: "flex", flexDirection: "column", gap: "16px",
        }}>
          {/* Parameters panel */}
          <div style={{
            background: "#12121a", border: "1px solid #1e1e2e",
            borderRadius: "12px", padding: "28px", flex: 1,
          }}>
            <p style={{ fontFamily: "monospace", fontSize: "10px", letterSpacing: "0.15em", color: "#3a3a52", textTransform: "uppercase", marginBottom: "24px" }}>
              Step 2 — Adjust Parameters
            </p>

            <PreciseSlider
              label="Volume Fraction"
              value={volumeFrac} min={0.10} max={0.60} step={0.01} unit="%"
              desc="How much material to keep"
              onChange={setVolumeFrac}
            />
            <PreciseSlider
              label="Iterations"
              value={iterations} min={10} max={100} step={1}
              desc="More = better convergence, slower"
              onChange={setIterations}
            />
            <PreciseSlider
              label="SIMP Penalty"
              value={penalty} min={1.0} max={5.0} step={0.1} unit="x"
              desc="Higher = sharper black/white result"
              onChange={setPenalty}
            />

            {/* Mesh info */}
            <div style={{
              borderTop: "1px solid #1e1e2e", paddingTop: "20px", marginTop: "4px",
              display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px",
            }}>
              {[
                { label: "Mesh Size",   val: `${m.nx}×${m.ny}×${m.nz}` },
                { label: "Dimensions",  val: `${m.Lx}×${m.Ly}×${m.Lz}m` },
                { label: "Algorithm",   val: "SIMP + OC" },
              ].map(s => (
                <div key={s.label} style={{
                  background: "#1a1a26", border: "1px solid #2a2a3d",
                  borderRadius: "6px", padding: "10px 12px",
                }}>
                  <div style={{ fontFamily: "monospace", fontSize: "12px", color: "#e8e8f0", marginBottom: "2px" }}>
                    {s.val}
                  </div>
                  <div style={{ fontSize: "10px", color: "#3a3a52", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Run button */}
          <button className="wz-run" onClick={handleRun} style={{
            width: "100%", padding: "20px",
            background: "#00d4ff", color: "#0a0a0f",
            border: "none", borderRadius: "12px",
            fontFamily: "monospace", fontSize: "15px", fontWeight: "700",
            letterSpacing: "0.15em", textTransform: "uppercase",
            cursor: "pointer", transition: "all 0.2s",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "12px",
          }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M3 2.5l10 5.5-10 5.5V2.5z"/>
            </svg>
            Run Optimization
            <span style={{ opacity: 0.6, fontSize: "12px" }}>({nElements} elements · ~{estSec}s)</span>
          </button>
        </div>

      </div>
    </>
  );
}
