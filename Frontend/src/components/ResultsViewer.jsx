import { useState, useEffect, useRef } from "react";

const AI_CSS = `
  .ai-panel { transition: all 0.3s ease; }
  .ai-key-input {
    width: 100%; padding: 10px 14px;
    background: #0a0a0f; border: 1px solid #2a2a3d;
    border-radius: 4px; color: #e8e8f0;
    font-family: monospace; font-size: 13px;
    outline: none; transition: border-color 0.2s;
  }
  .ai-key-input:focus { border-color: #6b6b8a; }
  .ai-key-input::placeholder { color: #3a3a52; }
  .ai-analyze-btn {
    padding: 10px 20px;
    background: #e8e8f0; color: #0a0a0f;
    border: none; border-radius: 4px;
    font-family: monospace; font-size: 12px;
    font-weight: 700; letter-spacing: 0.08em;
    cursor: pointer; transition: all 0.2s;
    white-space: nowrap; flex-shrink: 0;
  }
  .ai-analyze-btn:hover { background: #ffffff; transform: translateY(-1px); }
  .ai-analyze-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
  @keyframes ai-thinking {
    0%, 100% { opacity: 0.3; }
    50% { opacity: 1; }
  }
  .ai-dot { animation: ai-thinking 1.2s ease-in-out infinite; }
  .ai-dot:nth-child(2) { animation-delay: 0.2s; }
  .ai-dot:nth-child(3) { animation-delay: 0.4s; }
`;

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine
} from "recharts";

const S = {
  container: {
    padding: "20px",
    color: "var(--forge-text, #e8e8f0)",
    fontFamily: "'DM Sans', sans-serif",
    height: "100%",
  },
  title: {
    fontFamily: "'Space Mono', monospace",
    fontSize: "11px",
    letterSpacing: "0.15em",
    color: "var(--forge-muted, #6b6b8a)",
    textTransform: "uppercase",
    marginBottom: "16px",
  },
  statsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "10px",
    marginBottom: "24px",
  },
  statCard: (color) => ({
    background: "var(--forge-card, #1a1a26)",
    border: `1px solid ${color}33`,
    borderRadius: "8px",
    padding: "12px",
    textAlign: "center",
  }),
  statVal: (color) => ({
    fontFamily: "'Space Mono', monospace",
    fontSize: "20px",
    color,
    display: "block",
    marginBottom: "4px",
  }),
  statLabel: {
    fontSize: "10px",
    color: "var(--forge-muted, #6b6b8a)",
    textTransform: "uppercase",
    letterSpacing: "0.1em",
  },
  chartSection: {
    marginBottom: "24px",
  },
  chartLabel: {
    fontFamily: "'Space Mono', monospace",
    fontSize: "11px",
    color: "var(--forge-muted, #6b6b8a)",
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    marginBottom: "8px",
  },
  waitBox: {
    background: "var(--forge-card, #1a1a26)",
    border: "1px solid var(--forge-border, #2a2a3d)",
    borderRadius: "8px",
    padding: "40px",
    textAlign: "center",
    color: "var(--forge-muted, #6b6b8a)",
  },
  pulsingDot: {
    width: "12px", height: "12px",
    borderRadius: "50%",
    background: "var(--forge-accent, #00d4ff)",
    margin: "0 auto 16px",
    animation: "pulse 1.5s ease-in-out infinite",
  },
  finalBox: {
    background: "rgba(0,255,136,0.05)",
    border: "1px solid var(--forge-green, #00ff88)",
    borderRadius: "8px",
    padding: "16px",
    marginBottom: "24px",
  },
  finalTitle: {
    fontFamily: "'Space Mono', monospace",
    fontSize: "12px",
    color: "var(--forge-green, #00ff88)",
    marginBottom: "12px",
    letterSpacing: "0.1em",
  },
  finalRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "13px",
    marginBottom: "6px",
  },
  finalKey: { color: "var(--forge-muted, #6b6b8a)" },
  finalVal: {
    fontFamily: "'Space Mono', monospace",
    color: "var(--forge-text, #e8e8f0)",
  },
  densityBar: {
    marginBottom: "16px",
  },
  barLabel: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "12px",
    marginBottom: "4px",
    color: "var(--forge-muted, #6b6b8a)",
  },
  barTrack: {
    height: "8px",
    background: "var(--forge-border, #2a2a3d)",
    borderRadius: "4px",
    overflow: "hidden",
  },
  barFill: (pct, color) => ({
    height: "100%",
    width: `${pct}%`,
    background: color,
    borderRadius: "4px",
    transition: "width 0.5s ease",
  }),
};

// Custom tooltip for recharts
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#12121a",
      border: "1px solid #2a2a3d",
      borderRadius: "6px",
      padding: "8px 12px",
      fontFamily: "'Space Mono', monospace",
      fontSize: "11px",
      color: "#e8e8f0",
    }}>
      <div>Iter {label}</div>
      {payload.map((p) => (
        <div key={p.name} style={{ color: p.color }}>
          {p.name}: {typeof p.value === "number" ? p.value.toExponential(3) : p.value}
        </div>
      ))}
    </div>
  );
};

// ─── AI Analysis Panel ────────────────────────────────────────
function AIAnalysisPanel({ results, improvement, solid, medium, void_, total }) {
  const [apiKey, setApiKey]     = useState(sessionStorage.getItem("tf_api_key") || "");
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [open, setOpen]         = useState(false);

  const saveKey = (val) => {
    setApiKey(val);
    sessionStorage.setItem("tf_api_key", val);
  };

  const handleAnalyze = async () => {
    if (!apiKey.trim()) { setError("Please enter your Anthropic API key."); return; }
    setLoading(true); setError(null); setAnalysis(null);

    try {
      const res = await fetch("http://localhost:8000/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preset: "cantilever",
          compliance: results.final_compliance,
          volume: results.final_volume,
          improvement: parseFloat(improvement) || 0,
          solid_pct: (solid / total) * 100,
          transition_pct: (medium / total) * 100,
          void_pct: (void_ / total) * 100,
          total_elements: total,
          iterations_run: results.history?.compliance?.length || 0,
          api_key: apiKey.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Analysis failed");
      setAnalysis(data.analysis);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ai-panel" style={{
      background: "#0a0a0f", border: "1px solid #2a2a3d",
      borderRadius: "8px", marginTop: "20px", overflow: "hidden",
    }}>
      <style>{AI_CSS}</style>

      {/* Header toggle */}
      <button onClick={() => setOpen(o => !o)} style={{
        width: "100%", padding: "14px 16px",
        background: "none", border: "none", cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        color: "#e8e8f0",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "16px" }}>🤖</span>
          <span style={{ fontFamily: "monospace", fontSize: "12px", letterSpacing: "0.1em", color: "#e8e8f0" }}>
            AI ANALYSIS
          </span>
          <span style={{
            padding: "2px 8px", background: "rgba(0,212,255,0.1)",
            border: "1px solid rgba(0,212,255,0.2)", borderRadius: "3px",
            fontFamily: "monospace", fontSize: "10px", color: "#00d4ff",
          }}>
            BYOK
          </span>
        </div>
        <span style={{ color: "#6b6b8a", fontSize: "12px" }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div style={{ padding: "0 16px 16px" }}>

          {/* Key disclaimer */}
          <p style={{
            fontSize: "11px", color: "#3a3a52", fontFamily: "monospace",
            marginBottom: "12px", lineHeight: "1.5",
          }}>
            Your key is used only for this request and never stored on our servers.
            It clears automatically when you close this tab.
            Get a key at <span style={{ color: "#6b6b8a" }}>console.anthropic.com</span>
          </p>

          {/* Key input + button row */}
          <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
            <input
              className="ai-key-input"
              type="password"
              placeholder="sk-ant-..."
              value={apiKey}
              onChange={e => saveKey(e.target.value)}
            />
            <button
              className="ai-analyze-btn"
              onClick={handleAnalyze}
              disabled={loading || !apiKey.trim()}
            >
              {loading ? "Analyzing..." : "Analyze →"}
            </button>
          </div>

          {/* Loading state */}
          {loading && (
            <div style={{
              display: "flex", alignItems: "center", gap: "6px",
              padding: "16px", background: "#12121a", borderRadius: "6px",
              marginBottom: "12px",
            }}>
              <span className="ai-dot" style={{ width: 6, height: 6, borderRadius: "50%", background: "#00d4ff", display: "inline-block" }} />
              <span className="ai-dot" style={{ width: 6, height: 6, borderRadius: "50%", background: "#00d4ff", display: "inline-block" }} />
              <span className="ai-dot" style={{ width: 6, height: 6, borderRadius: "50%", background: "#00d4ff", display: "inline-block" }} />
              <span style={{ fontFamily: "monospace", fontSize: "12px", color: "#6b6b8a", marginLeft: "8px" }}>
                Analyzing your structure...
              </span>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{
              padding: "12px", background: "rgba(255,107,53,0.08)",
              border: "1px solid rgba(255,107,53,0.2)", borderRadius: "6px",
              fontFamily: "monospace", fontSize: "12px", color: "#ff6b35",
              marginBottom: "12px",
            }}>
              ⚠ {error}
            </div>
          )}

          {/* Analysis result */}
          {analysis && (
            <div style={{
              padding: "16px", background: "#12121a",
              border: "1px solid #1e1e2e", borderRadius: "6px",
            }}>
              {/* Render markdown-style bold text */}
              {analysis.split("\n").map((line, i) => {
                if (!line.trim()) return <div key={i} style={{ height: "8px" }} />;
                const isBold = line.startsWith("**") && line.includes("**");
                const isBullet = line.startsWith("- ") || line.startsWith("• ");
                const text = line.replace(/\*\*/g, "");

                if (isBold && line.endsWith("**")) return (
                  <p key={i} style={{
                    fontFamily: "monospace", fontSize: "11px",
                    color: "#00d4ff", letterSpacing: "0.05em",
                    marginBottom: "8px", marginTop: i > 0 ? "16px" : 0,
                  }}>
                    {text}
                  </p>
                );
                if (isBullet) return (
                  <div key={i} style={{
                    display: "flex", gap: "8px", marginBottom: "6px",
                  }}>
                    <span style={{ color: "#00ff88", flexShrink: 0, marginTop: "2px" }}>▸</span>
                    <span style={{ fontSize: "13px", color: "#e8e8f0", lineHeight: "1.6" }}>
                      {text.replace(/^[-•]\s/, "")}
                    </span>
                  </div>
                );
                return (
                  <p key={i} style={{
                    fontSize: "13px", color: "#6b6b8a",
                    lineHeight: "1.7", marginBottom: "4px",
                  }}>
                    {text}
                  </p>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ResultsViewer({ results, isOptimizing }) {
  const [history, setHistory] = useState([]);
  const wsRef = useRef(null);

  // Listen for iteration events from MeshViewer via window events
  useEffect(() => {
    const handler = (e) => {
      setHistory((prev) => [...prev, e.detail]);
    };
    window.addEventListener("topoforge:iteration", handler);
    return () => window.removeEventListener("topoforge:iteration", handler);
  }, []);

  // When results arrive, populate history from final data
  useEffect(() => {
    if (results?.history) {
      const h = results.history.compliance.map((c, i) => ({
        iteration: results.history.iteration?.[i] ?? i,
        compliance: c,
        volume: results.history.volume?.[i] * 100,
      }));
      setHistory(h);
    }
  }, [results]);

  const lastPoint  = history[history.length - 1] ?? null;
  const firstComp  = history[0]?.compliance ?? 1;
  const improvement = lastPoint
    ? ((1 - lastPoint.compliance / firstComp) * 100).toFixed(1)
    : null;

  // Density analysis from results
  const density   = results?.density ?? [];
  const solid     = density.filter((d) => d > 0.9).length;
  const medium    = density.filter((d) => d > 0.3 && d <= 0.9).length;
  const void_     = density.filter((d) => d <= 0.3).length;
  const total     = density.length || 1;

  if (!isOptimizing && !results) {
    return (
      <div style={S.container}>
        <p style={S.title}>Results</p>
        <div style={S.waitBox}>
          <div style={{ fontSize: "32px", marginBottom: "12px" }}>📊</div>
          <div>Results will appear here once optimization starts</div>
        </div>
      </div>
    );
  }

  return (
    <div style={S.container}>
      <p style={S.title}>Live Results</p>

      {/* Stats row */}
      <div style={S.statsRow}>
        <div style={S.statCard("#00d4ff")}>
          <span style={S.statVal("#00d4ff")}>
            {lastPoint ? lastPoint.compliance.toExponential(2) : "—"}
          </span>
          <span style={S.statLabel}>Compliance</span>
        </div>
        <div style={S.statCard("#00ff88")}>
          <span style={S.statVal("#00ff88")}>
            {lastPoint ? `${lastPoint.volume?.toFixed(1)}%` : "—"}
          </span>
          <span style={S.statLabel}>Volume Used</span>
        </div>
        <div style={S.statCard("#ff6b35")}>
          <span style={S.statVal("#ff6b35")}>
            {improvement ? `${improvement}%` : "—"}
          </span>
          <span style={S.statLabel}>Improvement</span>
        </div>
      </div>

      {/* Compliance chart */}
      <div style={S.chartSection}>
        <p style={S.chartLabel}>Compliance (lower = stiffer)</p>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={history}>
            <CartesianGrid stroke="#2a2a3d" strokeDasharray="3 3" />
            <XAxis dataKey="iteration" stroke="#6b6b8a" tick={{ fontSize: 10, fontFamily: "Space Mono" }} />
            <YAxis stroke="#6b6b8a" tick={{ fontSize: 10, fontFamily: "Space Mono" }}
                   tickFormatter={(v) => v.toExponential(1)} />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="compliance" name="C"
                  stroke="#00d4ff" strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Volume chart */}
      <div style={S.chartSection}>
        <p style={S.chartLabel}>Volume Fraction (%)</p>
        <ResponsiveContainer width="100%" height={120}>
          <LineChart data={history}>
            <CartesianGrid stroke="#2a2a3d" strokeDasharray="3 3" />
            <XAxis dataKey="iteration" stroke="#6b6b8a" tick={{ fontSize: 10, fontFamily: "Space Mono" }} />
            <YAxis stroke="#6b6b8a" tick={{ fontSize: 10, fontFamily: "Space Mono" }}
                   domain={["auto", "auto"]} tickFormatter={(v) => `${v.toFixed(0)}%`} />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="volume" name="V%"
                  stroke="#00ff88" strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Final summary — only when done */}
      {results && (
        <>
          <div style={S.finalBox}>
            <p style={S.finalTitle}>✓ OPTIMIZATION COMPLETE</p>
            <div style={S.finalRow}>
              <span style={S.finalKey}>Final Compliance</span>
              <span style={S.finalVal}>{results.final_compliance?.toExponential(4)}</span>
            </div>
            <div style={S.finalRow}>
              <span style={S.finalKey}>Final Volume</span>
              <span style={S.finalVal}>{(results.final_volume * 100).toFixed(2)}%</span>
            </div>
            <div style={S.finalRow}>
              <span style={S.finalKey}>Stiffness Improvement</span>
              <span style={S.finalVal}>{improvement}%</span>
            </div>
            <div style={S.finalRow}>
              <span style={S.finalKey}>Total Elements</span>
              <span style={S.finalVal}>{total}</span>
            </div>
          </div>

          {/* Density breakdown bars */}
          <p style={S.chartLabel}>Density Distribution</p>
          <div style={S.densityBar}>
            <div style={S.barLabel}>
              <span>Solid (ρ &gt; 0.9)</span>
              <span>{solid} elements ({((solid/total)*100).toFixed(1)}%)</span>
            </div>
            <div style={S.barTrack}>
              <div style={S.barFill((solid/total)*100, "#00ff88")} />
            </div>
          </div>
          <div style={S.densityBar}>
            <div style={S.barLabel}>
              <span>Transition (0.3–0.9)</span>
              <span>{medium} elements ({((medium/total)*100).toFixed(1)}%)</span>
            </div>
            <div style={S.barTrack}>
              <div style={S.barFill((medium/total)*100, "#00d4ff")} />
            </div>
          </div>
          <div style={S.densityBar}>
            <div style={S.barLabel}>
              <span>Void (ρ ≤ 0.3)</span>
              <span>{void_} elements ({((void_/total)*100).toFixed(1)}%)</span>
            </div>
            <div style={S.barTrack}>
              <div style={S.barFill((void_/total)*100, "#ff6b35")} />
            </div>
          </div>

          {/* AI Analysis Panel */}
          <AIAnalysisPanel
            results={results}
            improvement={improvement}
            solid={solid}
            medium={medium}
            void_={void_}
            total={total}
          />
        </>
      )}
    </div>
  );
}
