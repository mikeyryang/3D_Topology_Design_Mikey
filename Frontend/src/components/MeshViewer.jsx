import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { WS_BASE } from "../config";

const S = {
  container: {
    width: "100%",
    height: "100%",
    minHeight: "500px",
    position: "relative",
    background: "#0a0a0f",
    borderRadius: "8px",
    overflow: "hidden",
  },
  canvas: { width: "100%", height: "100%" },
  overlay: {
    position: "absolute",
    top: "12px",
    left: "12px",
    pointerEvents: "none",
  },
  badge: {
    background: "rgba(10,10,15,0.85)",
    border: "1px solid var(--forge-border, #2a2a3d)",
    borderRadius: "6px",
    padding: "8px 12px",
    marginBottom: "8px",
    fontFamily: "'Space Mono', monospace",
    fontSize: "11px",
    color: "var(--forge-accent, #00d4ff)",
  },
  statusDot: (color) => ({
    display: "inline-block",
    width: "7px", height: "7px",
    borderRadius: "50%",
    background: color,
    marginRight: "6px",
    verticalAlign: "middle",
  }),
  iterLabel: {
    fontFamily: "'Space Mono', monospace",
    fontSize: "11px",
    color: "var(--forge-muted, #6b6b8a)",
    position: "absolute",
    bottom: "12px",
    left: "12px",
    background: "rgba(10,10,15,0.85)",
    border: "1px solid var(--forge-border, #2a2a3d)",
    borderRadius: "6px",
    padding: "6px 10px",
    pointerEvents: "none",
  },
  controls: {
    position: "absolute",
    bottom: "12px",
    right: "12px",
    fontFamily: "'Space Mono', monospace",
    fontSize: "10px",
    color: "var(--forge-muted, #6b6b8a)",
    background: "rgba(10,10,15,0.85)",
    border: "1px solid var(--forge-border, #2a2a3d)",
    borderRadius: "6px",
    padding: "6px 10px",
    pointerEvents: "none",
  },
};

// Map density [0→1] to color: red → yellow → green
function densityToColor(d) {
  if (d < 0.5) {
    const t = d / 0.5;
    return new THREE.Color(1, t, 0);
  } else {
    const t = (d - 0.5) / 0.5;
    return new THREE.Color(1 - t, 1, 0);
  }
}

export default function MeshViewer({ jobId, config, onMeshLoaded, onComplete }) {
  const mountRef  = useRef(null);
  const sceneRef  = useRef(null);
  const meshesRef = useRef([]);   // array of THREE.Mesh per element
  const wsRef     = useRef(null);

  const [status, setStatus]   = useState("Connecting...");
  const [iter, setIter]       = useState(null);
  const [compliance, setComp] = useState(null);
  const [volume, setVol]      = useState(null);

  // ── Three.js setup ──────────────────────────────────────
  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x0a0a0f, 1);
    el.appendChild(renderer.domElement);

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, el.clientWidth / el.clientHeight, 0.001, 100);
    camera.position.set(1.5, 0.8, 1.2);

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(2, 3, 2);
    scene.add(dir);

    // Grid helper
    const grid = new THREE.GridHelper(3, 30, 0x2a2a3d, 0x1a1a26);
    grid.position.y = -0.15;
    scene.add(grid);

    // Orbit controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // Animation loop
    let animId;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Resize handler
    const onResize = () => {
      if (!el) return;
      camera.aspect = el.clientWidth / el.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(el.clientWidth, el.clientHeight);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, []);

  // ── WebSocket connection ─────────────────────────────────
  useEffect(() => {
    if (!jobId || !config || !sceneRef.current) return;

    const ws = new WebSocket(`${WS_BASE}/ws/optimize/${jobId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus("Connected — sending config...");
      ws.send(JSON.stringify(config));
    };

    ws.onmessage = (evt) => {
      const msg = JSON.parse(evt.data);

      if (msg.type === "status") {
        setStatus(msg.message);
      }

      if (msg.type === "mesh_info") {
        setStatus("Building 3D mesh...");
        buildMesh(msg.nodes, msg.elements);
        if (onMeshLoaded) onMeshLoaded({ nodes: msg.nodes, elements: msg.elements });
      }

      if (msg.type === "iteration") {
        setIter(msg.iteration);
        setComp(msg.compliance?.toExponential(3));
        setVol((msg.volume * 100).toFixed(1));

        if (msg.density) {
          updateColors(msg.density);
        }
      }

      if (msg.type === "complete") {
        setStatus("✓ Complete");
        updateColors(msg.density);
        if (onComplete) onComplete(msg);
      }

      if (msg.type === "error") {
        setStatus(`Error: ${msg.message}`);
      }
    };

    ws.onerror = () => setStatus("WebSocket error — is backend running?");
    ws.onclose = () => setStatus((s) => s.startsWith("✓") ? s : "Disconnected");

    return () => ws.close();
  }, [jobId, config]);

  // Build individual box meshes per element
  const buildMesh = (nodes, elements) => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Clear old meshes
    meshesRef.current.forEach((m) => scene.remove(m));
    meshesRef.current = [];

    const geo = new THREE.BoxGeometry(1, 1, 1);

    elements.forEach((elem, idx) => {
      // Compute element center from 8 node coords
      let cx = 0, cy = 0, cz = 0;
      elem.forEach((nid) => {
        cx += nodes[nid][0];
        cy += nodes[nid][1];
        cz += nodes[nid][2];
      });
      cx /= 8; cy /= 8; cz /= 8;

      // Compute element size from first two nodes
      const n0 = nodes[elem[0]];
      const n1 = nodes[elem[1]];
      const sx = Math.abs(n1[0] - n0[0]) || 0.05;
      const sy = Math.abs(nodes[elem[3]][1] - n0[1]) || 0.05;
      const sz = Math.abs(nodes[elem[4]][2] - n0[2]) || 0.05;

      const mat = new THREE.MeshLambertMaterial({
        color: new THREE.Color(0x00d4ff),
        transparent: true,
        opacity: 0.85,
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(cx, cy, cz);
      mesh.scale.set(sx * 0.92, sy * 0.92, sz * 0.92);
      scene.add(mesh);
      meshesRef.current.push(mesh);
    });

    setStatus("Optimizing...");
  };

  // Update element colors based on density array
  const updateColors = (density) => {
    meshesRef.current.forEach((mesh, idx) => {
      const d = density[idx] ?? 0;
      mesh.material.color = densityToColor(d);
      mesh.material.opacity = 0.15 + d * 0.85;
      mesh.visible = d > 0.05;
    });
  };

  const statusColor = status.startsWith("✓") ? "#00ff88"
    : status.startsWith("Error") || status.startsWith("Disconnected") ? "#ff6b35"
    : "#00d4ff";

  return (
    <div style={S.container} ref={mountRef}>
      {/* Status overlay */}
      <div style={S.overlay}>
        <div style={S.badge}>
          <span style={S.statusDot(statusColor)} />
          {status}
        </div>
      </div>

      {/* Iteration info */}
      {iter !== null && (
        <div style={S.iterLabel}>
          ITER {iter} &nbsp;|&nbsp; C: {compliance} &nbsp;|&nbsp; V: {volume}%
        </div>
      )}

      {/* Controls hint */}
      <div style={S.controls}>
        Drag to rotate · Scroll to zoom
      </div>
    </div>
  );
}
