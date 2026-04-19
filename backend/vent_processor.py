"""
VentProcessor — Core scoring engine for Vent Geothermal Intelligence Platform.

Data sources:
  - California_Geothermal_Lite.csv  (SMU borehole data, WGS84 coords, depth in metres)
  - Scripps_Physics_Sample.csv      (Rekoske et al. 2025 PGV grid, m/s)
    Grid assumed to cover lat [32.5, 42.5], lon [-125.0, -114.0] at
    1000 (lat) × 3600 (lon) cells. Row 0 of the CSV = column index header.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import pandas as pd

# ── Spatial bounds for the Scripps PGV raster ──────────────────────────────
SCRIPPS_LAT_MIN = 32.5
SCRIPPS_LAT_MAX = 42.5
SCRIPPS_LON_MIN = -125.0
SCRIPPS_LON_MAX = -114.0

# Grid dimensions (rows/cols of actual data, excluding the header row)
SCRIPPS_NROWS = 1000
SCRIPPS_NCOLS = 3600

# PGV threshold for "High Risk" classification (m/s)
PGV_HIGH_RISK_THRESHOLD = 0.10   # realistic for this dataset (max ≈ 0.25 m/s)
PGV_REJECT_THRESHOLD    = 0.05   # reject certification below this stability

# Material yield strengths (MPa) and density factors for stress simulation
MATERIAL_PROPERTIES = {
    # yield_strength_mpa: at surface temp; E_gpa: Young's modulus
    "steel":     {"yield_strength_mpa": 250, "E_gpa": 200, "label": "Carbon Steel"},
    "titanium":  {"yield_strength_mpa": 880, "E_gpa": 114, "label": "Grade-5 Titanium"},
    "composite": {"yield_strength_mpa": 400, "E_gpa":  70, "label": "Carbon Composite"},
}

# Seismic stress model: σ = E · PGV / Vs  (elastic wave stress, Achenbach 1973)
# Vs ≈ 800 m/s (shallow crustal shear-wave velocity)
# For steel at PGV=0.10 m/s: σ = 200,000 * 0.10 / 800 = 25 MPa
# Depth penalty: thermal softening reduces yield strength ~0.3 MPa/m below 500 m
VS_SHEAR = 800.0  # m/s
# Required safety factor for geothermal certification (conservative: 3×)
REQUIRED_SAFETY_FACTOR = 3.0


# ── Dataclasses ────────────────────────────────────────────────────────────

@dataclass
class WellResult:
    well_name: str
    lat: float
    lon: float
    county: str
    depth_m: float | None
    distance_km: float
    heat_score: float          # 0–100
    pgv_ms: float
    stability_score: float     # 0–100
    vent_score: float          # 0–100
    risk_level: str            # LOW / MODERATE / HIGH
    scripps_sim_id: str


@dataclass
class SimulationResult:
    material: str
    material_label: str
    depth_m: float
    pgv_ms: float
    seismic_stress_mpa: float
    yield_strength_mpa: float
    safety_factor: float
    certified: bool
    status: str                # APPROVED / REJECTED
    vent_score: float
    lat: float
    lon: float


# ── VentProcessor ──────────────────────────────────────────────────────────

class VentProcessor:
    """
    Loads geothermal borehole data and Scripps PGV raster, then answers
    structural-integrity scoring and resilience certification queries.
    """

    def __init__(self, geo_csv: str | Path, scripps_csv: str | Path) -> None:
        self.geo_csv    = Path(geo_csv)
        self.scripps_csv = Path(scripps_csv)
        self._wells: pd.DataFrame | None = None
        self._pgv_grid: np.ndarray | None = None

    # ── Lazy loaders ──────────────────────────────────────────────────────

    @property
    def wells(self) -> pd.DataFrame:
        if self._wells is None:
            self._wells = self._load_wells()
        return self._wells

    @property
    def pgv_grid(self) -> np.ndarray:
        if self._pgv_grid is None:
            self._pgv_grid = self._load_pgv_grid()
        return self._pgv_grid

    def _load_wells(self) -> pd.DataFrame:
        cols = [
            "WellName", "LatDegreeWGS84", "LongDegreeWGS84",
            "DrillerTotalDepth", "County", "State", "Field",
            "SpudDate", "FormationTD", "Notes",
        ]
        df = pd.read_csv(self.geo_csv, usecols=lambda c: c in cols)
        df = df.dropna(subset=["LatDegreeWGS84", "LongDegreeWGS84"])
        df["LatDegreeWGS84"]  = pd.to_numeric(df["LatDegreeWGS84"],  errors="coerce")
        df["LongDegreeWGS84"] = pd.to_numeric(df["LongDegreeWGS84"], errors="coerce")
        df = df.dropna(subset=["LatDegreeWGS84", "LongDegreeWGS84"])
        return df.reset_index(drop=True)

    def _load_pgv_grid(self) -> np.ndarray:
        """Load the Scripps PGV raster. Row 0 is a column-index header; skip it."""
        raw = pd.read_csv(self.scripps_csv, header=None, skiprows=1)
        grid = raw.values.astype(np.float32)   # shape: (1000, 3600)
        return grid

    # ── Spatial helpers ───────────────────────────────────────────────────

    @staticmethod
    def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        R = 6371.0
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = math.sin(dlat / 2) ** 2 + (
            math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
            math.sin(dlon / 2) ** 2
        )
        return R * 2 * math.asin(math.sqrt(a))

    def _pgv_at(self, lat: float, lon: float) -> float:
        """Bilinear-interpolated PGV value (m/s) at an arbitrary coordinate."""
        lat_frac = (lat - SCRIPPS_LAT_MIN) / (SCRIPPS_LAT_MAX - SCRIPPS_LAT_MIN)
        lon_frac = (lon - SCRIPPS_LON_MIN) / (SCRIPPS_LON_MAX - SCRIPPS_LON_MIN)

        # Clamp to grid
        lat_frac = max(0.0, min(1.0, lat_frac))
        lon_frac = max(0.0, min(1.0, lon_frac))

        # Grid increases in lat from bottom row → invert
        row_f = (1.0 - lat_frac) * (SCRIPPS_NROWS - 1)
        col_f = lon_frac * (SCRIPPS_NCOLS - 1)

        r0, c0 = int(row_f), int(col_f)
        r1 = min(r0 + 1, SCRIPPS_NROWS - 1)
        c1 = min(c0 + 1, SCRIPPS_NCOLS - 1)
        dr, dc = row_f - r0, col_f - c0

        g = self.pgv_grid
        return float(
            g[r0, c0] * (1 - dr) * (1 - dc) +
            g[r0, c1] * (1 - dr) * dc +
            g[r1, c0] * dr       * (1 - dc) +
            g[r1, c1] * dr       * dc
        )

    def _scripps_sim_id(self, lat: float, lon: float) -> str:
        """Generate a deterministic simulation ID from grid coordinates."""
        lat_frac = (lat - SCRIPPS_LAT_MIN) / (SCRIPPS_LAT_MAX - SCRIPPS_LAT_MIN)
        lon_frac = (lon - SCRIPPS_LON_MIN) / (SCRIPPS_LON_MAX - SCRIPPS_LON_MIN)
        row = int((1.0 - max(0, min(1, lat_frac))) * (SCRIPPS_NROWS - 1))
        col = int(max(0, min(1, lon_frac)) * (SCRIPPS_NCOLS - 1))
        return f"RKE2025-{row:04d}-{col:04d}"

    # ── Scoring logic ─────────────────────────────────────────────────────

    @staticmethod
    def _heat_score(depth_m: float | None) -> float:
        """Normalise borehole depth to a 0–100 heat potential score."""
        if depth_m is None or depth_m <= 0:
            return 20.0
        # Sigmoid-ish normalisation: 3000 m → 95, 1000 m → 65, 200 m → 35
        return min(100.0, 20.0 + (depth_m / 3500.0) * 80.0)

    @staticmethod
    def _stability_score(pgv: float) -> float:
        """Convert PGV (m/s) to a 0–100 stability score (higher = more stable)."""
        # Dataset range: 0 – ~0.25 m/s.  Linear inversion capped at 0.20 m/s.
        return max(0.0, min(100.0, 100.0 - (pgv / 0.20) * 100.0))

    @staticmethod
    def _risk_level(pgv: float) -> str:
        if pgv >= PGV_HIGH_RISK_THRESHOLD:
            return "HIGH"
        if pgv >= 0.05:
            return "MODERATE"
        return "LOW"

    # ── Public API ────────────────────────────────────────────────────────

    def find_nearest_well(self, lat: float, lon: float) -> pd.Series:
        """Return the DataFrame row of the closest borehole."""
        wells = self.wells
        dists = wells.apply(
            lambda r: self._haversine_km(lat, lon, r["LatDegreeWGS84"], r["LongDegreeWGS84"]),
            axis=1,
        )
        return wells.iloc[dists.idxmin()], float(dists.min())

    def calculate_vent_score(self, lat: float, lon: float) -> WellResult:
        """
        Core scoring function.

        Returns a WellResult with heat score, stability score,
        combined Vent score (heat×0.6 + stability×0.4), and risk level.
        """
        well, dist_km = self.find_nearest_well(lat, lon)

        depth_m = (
            float(well["DrillerTotalDepth"])
            if pd.notna(well.get("DrillerTotalDepth")) else None
        )
        pgv      = self._pgv_at(lat, lon)
        heat_s   = self._heat_score(depth_m)
        stab_s   = self._stability_score(pgv)
        score    = (heat_s * 0.6) + (stab_s * 0.4)

        return WellResult(
            well_name    = str(well.get("WellName", "Unknown")),
            lat          = float(well["LatDegreeWGS84"]),
            lon          = float(well["LongDegreeWGS84"]),
            county       = str(well.get("County", "")),
            depth_m      = depth_m,
            distance_km  = round(dist_km, 2),
            heat_score   = round(heat_s, 1),
            pgv_ms       = round(pgv, 5),
            stability_score = round(stab_s, 1),
            vent_score   = round(score, 1),
            risk_level   = self._risk_level(pgv),
            scripps_sim_id = self._scripps_sim_id(lat, lon),
        )

    def run_resilience_simulation(
        self,
        lat: float,
        lon: float,
        material: str,
        pipe_depth_m: float,
    ) -> SimulationResult:
        """
        Module B — Resilience Simulator.

        Computes seismic stress on the pipe (simplified shear-wave impedance
        model) and compares against the material's yield strength.
        """
        material_key = material.lower()
        if material_key not in MATERIAL_PROPERTIES:
            raise ValueError(f"Unknown material '{material}'. Choose from {list(MATERIAL_PROPERTIES)}")

        props = MATERIAL_PROPERTIES[material_key]
        pgv   = self._pgv_at(lat, lon)

        # Elastic wave stress: σ = E · PGV / Vs  (MPa)
        seismic_stress_mpa = (props["E_gpa"] * 1000.0 * pgv) / VS_SHEAR

        # Depth amplification: borehole stress concentrations increase ~12% per 500m
        depth_factor = 1.0 + (pipe_depth_m / 500.0) * 0.12
        seismic_stress_mpa *= depth_factor

        # Thermal yield degradation: >500m depth, geothermal heat reduces yield strength
        # Steel loses ~0.4 MPa/m; titanium ~0.15 MPa/m; composite ~0.25 MPa/m
        thermal_rate = {"steel": 0.40, "titanium": 0.15, "composite": 0.25}.get(material_key, 0.30)
        thermal_penalty = max(0.0, (pipe_depth_m - 500.0) * thermal_rate)
        thermally_destroyed = thermal_penalty >= props["yield_strength_mpa"]
        effective_yield = max(10.0, props["yield_strength_mpa"] - thermal_penalty)

        safety_factor = effective_yield / max(seismic_stress_mpa, 1e-6)
        certified = (safety_factor >= REQUIRED_SAFETY_FACTOR) and not thermally_destroyed

        # Hard reject on High Risk PGV regardless of material
        if pgv >= PGV_HIGH_RISK_THRESHOLD:
            certified = False

        well_result = self.calculate_vent_score(lat, lon)

        return SimulationResult(
            material           = material_key,
            material_label     = props["label"],
            depth_m            = pipe_depth_m,
            pgv_ms             = round(pgv, 5),
            seismic_stress_mpa = round(seismic_stress_mpa, 4),
            yield_strength_mpa = round(effective_yield, 1),
            safety_factor      = round(safety_factor, 2),
            certified          = certified,
            status             = "APPROVED" if certified else "REJECTED",
            vent_score         = well_result.vent_score,
            lat                = lat,
            lon                = lon,
        )

    def wells_geojson(self) -> dict:
        """Return all wells as a GeoJSON FeatureCollection for the frontend map."""
        features = []
        for _, row in self.wells.iterrows():
            depth = float(row["DrillerTotalDepth"]) if pd.notna(row.get("DrillerTotalDepth")) else None
            heat  = self._heat_score(depth)
            features.append({
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [float(row["LongDegreeWGS84"]), float(row["LatDegreeWGS84"])],
                },
                "properties": {
                    "wellName": str(row.get("WellName", "")),
                    "county":   str(row.get("County", "")),
                    "depthM":   depth,
                    "heatScore": round(heat, 1),
                    "lat": float(row["LatDegreeWGS84"]),
                    "lon": float(row["LongDegreeWGS84"]),
                },
            })
        return {"type": "FeatureCollection", "features": features}
