# Vent — Geothermal Intelligence & Resilience Engine

Physics-based geothermal site scoring and seismic resilience certification platform.

## Setup

### Prerequisites
- Node.js 18+
- Python 3.10+

### Backend
```bash
cd backend
pip install fastapi uvicorn pandas numpy
uvicorn main:app --reload
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env.local
# Add your Mapbox token to .env.local
npm run dev
```

### Mapbox Token
1. Create a free account at [mapbox.com](https://mapbox.com)
2. Copy your default public token from the dashboard
3. Paste it into `frontend/.env.local`:
```
NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_token_here
```

> The free Mapbox tier includes 50,000 map loads/month — no credit card required.
