# Vent — Geothermal Intelligence & Resilience Engine

Physics-based Structural Integrity Score and Resilience Certification for geothermal developers.

---

## Architecture

```
vent/
├── backend/                  # Python / FastAPI scoring engine
│   ├── vent_processor.py     # VentProcessor class (Module A + B)
│   ├── main.py               # FastAPI REST API
│   ├── requirements.txt
│   └── data/                 # Symlinks to your CSV files
│       ├── California_Geothermal_Lite.csv
│       └── Scripps_Physics_Sample.csv
└── frontend/                 # Next.js 14 + Tailwind + Mapbox
    ├── src/app/              # Next.js App Router
    ├── src/components/
    │   ├── VentMap.tsx       # Mapbox map with 1525 borehole markers
    │   ├── SiteDashboard.tsx # Slide-over panel (Module A score + Module B sim)
    │   └── CertModal.tsx     # Bank-grade Resilience Certificate (Module C)
    └── src/lib/api.ts        # Typed API client
```

---

## Quick Start

### 1. Backend

```bash
cd backend

# Create virtualenv
python3 -m venv .venv && source .venv/bin/activate

# Install deps
pip install -r requirements.txt

# Data files (already symlinked if you ran setup, otherwise copy):
# cp ~/Downloads/California_Geothermal_Lite.csv data/
# cp ~/Downloads/Scripps_Physics_Sample.csv      data/

# Run API
uvicorn main:app --reload --port 8000
```

API docs at: http://localhost:8000/docs

### 2. Frontend

```bash
cd frontend

# Install deps
npm install

# Set your Mapbox token
# Edit .env.local and replace YOUR_MAPBOX_TOKEN_HERE
# Get one free at: https://account.mapbox.com/

# Start dev server
npm run dev
```

App at: http://localhost:3000

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/wells/geojson` | GeoJSON of all 1 525 California boreholes |
| GET | `/score?lat=&lon=` | Vent Structural Integrity Score |
| POST | `/simulate` | Resilience simulation → APPROVED/REJECTED |

### Score response

```json
{
  "wellName": "CA-00771",
  "county": "Lake County",
  "depthM": 2195.0,
  "heatScore": 70.2,
  "pgvMs": 0.01326,
  "stabilityScore": 93.4,
  "ventScore": 79.5,
  "riskLevel": "LOW",
  "scrippsSImId": "RKE2025-0114-0069"
}
```

### Simulate request

```json
{
  "lat": 38.763,
  "lon": -122.694,
  "material": "titanium",
  "pipe_depth_m": 1500
}
```

---

## Scoring Formula

```
VentScore = (HeatScore × 0.6) + (StabilityScore × 0.4)
```

**Heat Score** (0–100): Normalised from `DrillerTotalDepth`. Deeper = higher geothermal potential.

**Stability Score** (0–100): Derived from Scripps PGV. Lower PGV = higher stability.
`Stability = 100 - (PGV / 0.20) × 100`

---

## Resilience Simulation Physics

Based on elastic wave stress theory (Achenbach 1973):

```
σ_seismic = E × PGV / Vs
```

- `E` = Young's modulus of pipe material
- `PGV` = Peak Ground Velocity from Scripps raster (m/s)
- `Vs` = 800 m/s (crustal shear-wave velocity)

**Depth penalties:**
- Stress amplification: +12% per 500m depth
- Thermal yield degradation (geothermal heat):
  - Steel: −0.40 MPa/m below 500m
  - Composite: −0.25 MPa/m below 500m
  - Titanium: −0.15 MPa/m below 500m

**Certification criteria:**
- Safety factor = effective_yield / σ_seismic ≥ 3.0×
- PGV < 0.10 m/s (HIGH seismic risk → hard reject)
- Material not thermally destroyed at depth

---

## Data Sources

| File | Source |
|------|--------|
| `California_Geothermal_Lite.csv` | SMU Geothermal Lab — 1 525 CA boreholes (WGS84) |
| `Scripps_Physics_Sample.csv` | Rekoske et al. 2025, Scripps Institution of Oceanography — PGV raster, 1000×3600 grid, lat [32.5–42.5], lon [−125–−114] |
| `data_index.xlsx` | Site-to-region manifest |
