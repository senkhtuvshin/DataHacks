"""
Vent FastAPI backend — exposes scoring, simulation, and GeoJSON endpoints.
"""

from __future__ import annotations

import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from vent_processor import VentProcessor

# ── Paths ──────────────────────────────────────────────────────────────────
DATA_DIR = Path(os.getenv("VENT_DATA_DIR", Path(__file__).parent / "data"))
GEO_CSV     = DATA_DIR / "California_Geothermal_Lite.csv"
SCRIPPS_CSV = DATA_DIR / "Scripps_Physics_Sample.csv"

# ── App ────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Vent — Geothermal Intelligence & Resilience Engine",
    version="1.0.0",
    description="Physics-based Structural Integrity Score and Resilience Certification for geothermal developers.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Single shared processor (loads data once on first request)
_processor: VentProcessor | None = None


def get_processor() -> VentProcessor:
    global _processor
    if _processor is None:
        if not GEO_CSV.exists():
            raise HTTPException(
                status_code=503,
                detail=f"Data file not found: {GEO_CSV}. "
                       "Copy California_Geothermal_Lite.csv into backend/data/",
            )
        if not SCRIPPS_CSV.exists():
            raise HTTPException(
                status_code=503,
                detail=f"Data file not found: {SCRIPPS_CSV}. "
                       "Copy Scripps_Physics_Sample.csv into backend/data/",
            )
        _processor = VentProcessor(GEO_CSV, SCRIPPS_CSV)
    return _processor


# ── Request / Response models ──────────────────────────────────────────────

class SimulationRequest(BaseModel):
    lat: float = Field(..., ge=32.0, le=43.0, description="Latitude (WGS84)")
    lon: float = Field(..., ge=-126.0, le=-114.0, description="Longitude (WGS84)")
    material: Literal["steel", "titanium", "composite"] = "steel"
    pipe_depth_m: float = Field(500.0, ge=10.0, le=5000.0, description="Pipe installation depth in metres")


class VentScoreResponse(BaseModel):
    wellName: str
    lat: float
    lon: float
    county: str
    depthM: float | None
    distanceKm: float
    heatScore: float
    pgvMs: float
    stabilityScore: float
    ventScore: float
    riskLevel: str
    scrippsSImId: str
    timestamp: str


class SimulationResponse(BaseModel):
    material: str
    materialLabel: str
    depthM: float
    pgvMs: float
    seismicStressMpa: float
    yieldStrengthMpa: float
    safetyFactor: float
    certified: bool
    status: str
    ventScore: float
    lat: float
    lon: float
    scrippsSImId: str
    timestamp: str


# ── Endpoints ──────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "service": "vent-api"}


@app.get("/wells/geojson", summary="GeoJSON of all California borehole sites")
def wells_geojson():
    proc = get_processor()
    return proc.wells_geojson()


@app.get("/score", response_model=VentScoreResponse, summary="Vent Structural Integrity Score")
def score(
    lat: float = Query(..., ge=32.0, le=43.0),
    lon: float = Query(..., ge=-126.0, le=-114.0),
):
    """
    Returns the Vent Score for the nearest borehole to the supplied coordinates.
    Score = (HeatScore × 0.6) + (StabilityScore × 0.4)
    """
    proc = get_processor()
    try:
        result = proc.calculate_vent_score(lat, lon)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    return VentScoreResponse(
        wellName       = result.well_name,
        lat            = result.lat,
        lon            = result.lon,
        county         = result.county,
        depthM         = result.depth_m,
        distanceKm     = result.distance_km,
        heatScore      = result.heat_score,
        pgvMs          = result.pgv_ms,
        stabilityScore = result.stability_score,
        ventScore      = result.vent_score,
        riskLevel      = result.risk_level,
        scrippsSImId   = result.scripps_sim_id,
        timestamp      = datetime.now(timezone.utc).isoformat(),
    )


@app.post("/simulate", response_model=SimulationResponse, summary="Resilience Simulation")
def simulate(body: SimulationRequest):
    """
    Module B — runs a physics-based resilience simulation for the chosen pipe
    material and installation depth at the given coordinates.
    Returns APPROVED / REJECTED certification status.
    """
    proc = get_processor()
    try:
        result = proc.run_resilience_simulation(
            lat          = body.lat,
            lon          = body.lon,
            material     = body.material,
            pipe_depth_m = body.pipe_depth_m,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    sim_id = proc._scripps_sim_id(body.lat, body.lon)
    return SimulationResponse(
        material          = result.material,
        materialLabel     = result.material_label,
        depthM            = result.depth_m,
        pgvMs             = result.pgv_ms,
        seismicStressMpa  = result.seismic_stress_mpa,
        yieldStrengthMpa  = result.yield_strength_mpa,
        safetyFactor      = result.safety_factor,
        certified         = result.certified,
        status            = result.status,
        ventScore         = result.vent_score,
        lat               = result.lat,
        lon               = result.lon,
        scrippsSImId      = sim_id,
        timestamp         = datetime.now(timezone.utc).isoformat(),
    )
