import { useState, useEffect, useRef } from "react";
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
        </>
      )}
    </div>
  );
}
