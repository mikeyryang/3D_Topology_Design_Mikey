"""
TopoForge Backend — FastAPI
Wraps the FEM/SIMP topology optimization code with a REST + WebSocket API.
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional, List
import numpy as np
import asyncio
import uuid
import json
import os
import sys

# Add parent directory to path so we can import your existing files
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fem3d_numpy import HexFEMSolver3D
from simp_numpy import SIMPOptimizer

# ─────────────────────────────────────────────
# App Setup
# ─────────────────────────────────────────────
app = FastAPI(title="TopoForge API", version="1.0.0")

# Allow frontend (running on localhost:3000) to talk to backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Tighten this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory job store (use Redis/DB for production)
jobs = {}


# ─────────────────────────────────────────────
# Request / Response Models
# ─────────────────────────────────────────────

class MeshConfig(BaseModel):
    """Mesh parameters."""
    Lx: float = 1.0        # Length in X
    Ly: float = 0.2        # Length in Y
    Lz: float = 0.1        # Length in Z
    nx: int = 20           # Elements in X
    ny: int = 6            # Elements in Y
    nz: int = 4            # Elements in Z


class BoundaryCondition(BaseModel):
    """A fixed face boundary condition."""
    axis: int              # 0=X, 1=Y, 2=Z
    coord: float           # Coordinate value of the face
    tol: float = 1e-6


class LoadCondition(BaseModel):
    """A distributed or point load."""
    type: str              # "distributed" or "point"
    axis: int = 0          # Which axis defines the face (distributed) or ignored (point)
    coord: float = 1.0     # Face coordinate (distributed) or ignored (point)
    direction: int = 1     # 0=X, 1=Y, 2=Z
    magnitude: float = 1e4
    location: Optional[List[float]] = None  # [x, y, z] for point loads


class OptimizationConfig(BaseModel):
    """Full optimization job configuration."""
    mesh: MeshConfig
    boundary_conditions: List[BoundaryCondition]
    loads: List[LoadCondition]
    volume_fraction: float = 0.3
    penalty: float = 3.0
    filter_radius: float = 0.02
    n_iterations: int = 50
    initial_density: float = 0.3


class PresetName(BaseModel):
    name: str  # "cantilever", "bridge", "torsion"


# ─────────────────────────────────────────────
# Preset Templates
# ─────────────────────────────────────────────

PRESETS = {
    "cantilever": OptimizationConfig(
        mesh=MeshConfig(Lx=1.0, Ly=0.2, Lz=0.1, nx=20, ny=6, nz=4),
        boundary_conditions=[BoundaryCondition(axis=0, coord=0.0)],
        loads=[LoadCondition(type="distributed", axis=0, coord=1.0, direction=1, magnitude=1e4)],
        volume_fraction=0.3,
        n_iterations=50,
    ),
    "bridge": OptimizationConfig(
        mesh=MeshConfig(Lx=1.0, Ly=0.3, Lz=0.1, nx=20, ny=8, nz=4),
        boundary_conditions=[
            BoundaryCondition(axis=0, coord=0.0),
            BoundaryCondition(axis=0, coord=1.0),
        ],
        loads=[LoadCondition(type="distributed", axis=1, coord=0.3, direction=1, magnitude=-1e4)],
        volume_fraction=0.25,
        n_iterations=50,
    ),
    "drone_arm": OptimizationConfig(
        mesh=MeshConfig(Lx=0.5, Ly=0.05, Lz=0.05, nx=20, ny=4, nz=4),
        boundary_conditions=[BoundaryCondition(axis=0, coord=0.0)],
        loads=[LoadCondition(type="point", direction=1, magnitude=-500,
                             location=[0.5, 0.025, 0.025])],
        volume_fraction=0.2,
        n_iterations=60,
    ),
}


# ─────────────────────────────────────────────
# Helper: Build and run optimization
# ─────────────────────────────────────────────

async def run_optimization_job(job_id: str, config: OptimizationConfig, websocket: WebSocket):
    """
    Runs the FEM + SIMP optimization and streams progress over WebSocket.
    Each iteration sends a JSON message with current compliance, volume, and density.
    """
    try:
        jobs[job_id]["status"] = "running"

        # 1. Create FEM solver and mesh
        await websocket.send_json({"type": "status", "message": "Building mesh..."})
        fem = HexFEMSolver3D(E_mod=200e9, nu=0.3, penalty=config.penalty)
        m = config.mesh
        fem.set_mesh(Lx=m.Lx, Ly=m.Ly, Lz=m.Lz, nx=m.nx, ny=m.ny, nz=m.nz)

        await websocket.send_json({
            "type": "mesh_info",
            "n_nodes": int(fem.nodes_np.shape[0]),
            "n_elements": int(fem.n_elems),
            "nodes": fem.nodes_np.tolist(),
            "elements": fem.elems_t.tolist(),
        })

        # 2. Apply boundary conditions
        await websocket.send_json({"type": "status", "message": "Applying boundary conditions..."})
        for bc in config.boundary_conditions:
            fem.fix_face(axis=bc.axis, coord=bc.coord, tol=bc.tol)

        # 3. Apply loads
        for load in config.loads:
            if load.type == "distributed":
                fem.add_distributed_load(
                    axis=load.axis, coord=load.coord,
                    direction=load.direction, total=load.magnitude
                )
            elif load.type == "point" and load.location:
                fem.add_point_load(
                    location=load.location,
                    direction=load.direction,
                    magnitude=load.magnitude
                )

        # 4. Create optimizer
        optimizer = SIMPOptimizer(
            fem_solver=fem,
            initial_density=config.initial_density,
            volume_fraction=config.volume_fraction,
            penalty=config.penalty,
            filter_radius=config.filter_radius,
        )

        await websocket.send_json({"type": "status", "message": "Starting optimization..."})

        # 5. Run iterations manually so we can stream progress
        for iteration in range(config.n_iterations):
            # Check if job was cancelled
            if jobs[job_id].get("cancelled"):
                await websocket.send_json({"type": "cancelled"})
                return

            results = fem.solve(optimizer.density)
            compliance = float(results["compliance"])
            sensitivities = results["sensitivities"]

            density_new = optimizer.update_density(sensitivities)
            density_change = float(np.max(np.abs(density_new - optimizer.density)))
            optimizer.density = density_new

            volume = float(np.sum(optimizer.density) / optimizer.n_elem)

            optimizer.history["compliance"].append(compliance)
            optimizer.history["volume"].append(volume)
            optimizer.history["density_change"].append(density_change)
            optimizer.history["iteration"].append(iteration)

            # Stream iteration result
            await websocket.send_json({
                "type": "iteration",
                "iteration": iteration,
                "compliance": compliance,
                "volume": volume,
                "density_change": density_change,
                # Send density every 5 iterations to avoid overwhelming the client
                "density": optimizer.density.tolist() if iteration % 5 == 0 else None,
            })

            # Yield control so FastAPI can handle other requests
            await asyncio.sleep(0)

            # Early stopping
            if density_change < 1e-4 and iteration > 10:
                await websocket.send_json({"type": "status", "message": "Converged early!"})
                break

        # 6. Send final result
        jobs[job_id]["status"] = "complete"
        jobs[job_id]["density"] = optimizer.density.tolist()

        await websocket.send_json({
            "type": "complete",
            "density": optimizer.density.tolist(),
            "final_compliance": float(optimizer.history["compliance"][-1]),
            "final_volume": float(optimizer.history["volume"][-1]),
            "history": {
                "compliance": optimizer.history["compliance"],
                "volume": optimizer.history["volume"],
                "density_change": optimizer.history["density_change"],
            }
        })

    except Exception as e:
        jobs[job_id]["status"] = "error"
        await websocket.send_json({"type": "error", "message": str(e)})
        raise


# ─────────────────────────────────────────────
# REST Endpoints
# ─────────────────────────────────────────────

@app.get("/")
def root():
    return {"message": "TopoForge API is running!", "version": "1.0.0"}


@app.get("/api/presets")
def list_presets():
    """Return available preset templates."""
    return {"presets": list(PRESETS.keys())}


@app.get("/api/presets/{name}")
def get_preset(name: str):
    """Return a specific preset configuration."""
    if name not in PRESETS:
        raise HTTPException(status_code=404, detail=f"Preset '{name}' not found")
    return PRESETS[name].dict()


@app.post("/api/jobs")
def create_job():
    """Create a new optimization job and return a job_id."""
    job_id = str(uuid.uuid4())
    jobs[job_id] = {"status": "pending", "density": None}
    return {"job_id": job_id}


@app.get("/api/jobs/{job_id}")
def get_job_status(job_id: str):
    """Check the status of a job."""
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    job = jobs[job_id]
    return {
        "job_id": job_id,
        "status": job["status"],
        "has_result": job["density"] is not None,
    }


@app.delete("/api/jobs/{job_id}")
def cancel_job(job_id: str):
    """Cancel a running job."""
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    jobs[job_id]["cancelled"] = True
    return {"message": "Cancellation requested"}


# ─────────────────────────────────────────────
# WebSocket Endpoint (main optimization stream)
# ─────────────────────────────────────────────

@app.websocket("/ws/optimize/{job_id}")
async def websocket_optimize(websocket: WebSocket, job_id: str):
    """
    WebSocket endpoint for running optimization.

    Client sends: JSON config (OptimizationConfig)
    Server streams: iteration updates, final result

    Message types sent by server:
      - status:    { type, message }
      - mesh_info: { type, n_nodes, n_elements, nodes, elements }
      - iteration: { type, iteration, compliance, volume, density_change, density? }
      - complete:  { type, density, final_compliance, final_volume, history }
      - error:     { type, message }
      - cancelled: { type }
    """
    await websocket.accept()

    if job_id not in jobs:
        await websocket.send_json({"type": "error", "message": "Invalid job_id"})
        await websocket.close()
        return

    try:
        # Receive config from client
        data = await websocket.receive_text()
        config_dict = json.loads(data)
        config = OptimizationConfig(**config_dict)

        # Run optimization
        await run_optimization_job(job_id, config, websocket)

    except WebSocketDisconnect:
        jobs[job_id]["cancelled"] = True
        print(f"Client disconnected from job {job_id}")
    except Exception as e:
        await websocket.send_json({"type": "error", "message": str(e)})
    finally:
        await websocket.close()


# ─────────────────────────────────────────────
# Run with: uvicorn main:app --reload --port 8000
# ─────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)