"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { VentScoreResponse, WellsGeoJSON } from "@/lib/api";
import { fetchWellsGeoJSON, fetchVentScore } from "@/lib/api";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";
const HAS_TOKEN = MAPBOX_TOKEN && MAPBOX_TOKEN !== "YOUR_MAPBOX_TOKEN_HERE";

interface Props {
  onWellClick:  (score: VentScoreResponse) => void;
  savedIds?:    Set<string>;
  hasSavedBar?: boolean;
}

export default function VentMap({ onWellClick, savedIds, hasSavedBar }: Props) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map          = useRef<mapboxgl.Map | null>(null);
  const popup        = useRef<mapboxgl.Popup | null>(null);
  // Keep latest callback in a ref so map event listeners never go stale
  const onWellClickRef = useRef(onWellClick);
  useEffect(() => { onWellClickRef.current = onWellClick; });

  const [geojson,     setGeojson]     = useState<WellsGeoJSON | null>(null);
  const [mapReady,    setMapReady]    = useState(false);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [scoring,     setScoring]     = useState(false);

  // Step 1: fetch data immediately — independent of Mapbox
  useEffect(() => {
    fetchWellsGeoJSON()
      .then((d) => { setGeojson(d); setLoading(false); })
      .catch(() => {
        setError("API offline — run: cd backend && uvicorn main:app --reload");
        setLoading(false);
      });
  }, []);

  // Step 2: init Mapbox once — NO prop in deps, use ref for callback
  useEffect(() => {
    if (!mapContainer.current || map.current || !HAS_TOKEN) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;
    const m = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [-119.5, 37.5],
      zoom: 6,
      minZoom: 4,
      maxZoom: 16,
      attributionControl: false,
    });
    map.current = m;
    popup.current = new mapboxgl.Popup({ closeButton: false, closeOnClick: false, offset: 14 });

    m.on("load", () => setMapReady(true));

    m.on("mouseenter", "wells-click", (e) => {
      m.getCanvas().style.cursor = "pointer";
      const feat = e.features?.[0];
      if (!feat) return;
      const p = feat.properties as { wellName: string; county: string; heatScore: number; depthM: number | null };
      popup.current!
        .setLngLat((feat.geometry as GeoJSON.Point).coordinates as [number, number])
        .setHTML(`
          <div style="font-family:'JetBrains Mono',monospace;min-width:160px">
            <p style="font-weight:600;color:#fafafa;font-size:11px;margin-bottom:2px;letter-spacing:0.03em">${p.wellName}</p>
            <p style="color:#71717a;font-size:10px">${p.county}</p>
            <div style="display:flex;gap:10px;margin-top:5px;border-top:1px solid #27272a;padding-top:5px">
              <span style="color:#a1a1aa;font-size:10px">Heat <span style="color:#e4e4e7">${p.heatScore}</span></span>
              ${p.depthM ? `<span style="color:#a1a1aa;font-size:10px">${p.depthM} m</span>` : ""}
            </div>
            <p style="color:#3f3f46;font-size:9px;margin-top:4px;letter-spacing:0.08em;text-transform:uppercase">Click to analyse</p>
          </div>
        `)
        .addTo(m);
    });
    m.on("mouseleave", "wells-click", () => {
      m.getCanvas().style.cursor = "";
      popup.current!.remove();
    });

    m.on("click", "wells-click", async (e) => {
      const feat = e.features?.[0];
      if (!feat) return;
      popup.current!.remove();
      const p = feat.properties as { lat: number; lon: number };
      setScoring(true);
      try {
        const score = await fetchVentScore(p.lat, p.lon);
        onWellClickRef.current(score);   // use ref — no dep issue
      } catch { /* silent */ }
      finally { setScoring(false); }
    });

    // No cleanup that destroys map — intentional to avoid re-init on parent re-render
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Step 3: add layers once map AND data are both ready
  useEffect(() => {
    if (!mapReady || !geojson || !map.current) return;
    const m = map.current;
    if (m.getSource("wells")) {
      // Update data in place (e.g. after save highlights)
      (m.getSource("wells") as mapboxgl.GeoJSONSource).setData(geojson);
      return;
    }

    m.addSource("wells", { type: "geojson", data: geojson });

    // Heatmap layer (zoomed out)
    m.addLayer({
      id: "wells-heat",
      type: "heatmap",
      source: "wells",
      maxzoom: 9,
      paint: {
        "heatmap-weight":    ["interpolate", ["linear"], ["get", "heatScore"], 0, 0, 100, 1],
        "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 1, 9, 3],
        "heatmap-color": [
          "interpolate", ["linear"], ["heatmap-density"],
          0,   "rgba(14,18,26,0)",
          0.25,"rgba(20,184,166,0.3)",
          0.5, "rgba(249,115,22,0.6)",
          1,   "rgba(239,68,68,0.95)",
        ],
        "heatmap-radius":  ["interpolate", ["linear"], ["zoom"], 0, 2, 9, 24],
        "heatmap-opacity": ["interpolate", ["linear"], ["zoom"], 7, 1, 9, 0],
      },
    });

    // Circle markers (zoomed in)
    m.addLayer({
      id: "wells-circle",
      type: "circle",
      source: "wells",
      minzoom: 6,
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 6, 3, 12, 8],
        "circle-color": [
          "case",
          [">=", ["get", "heatScore"], 70], "#EF4444",
          [">=", ["get", "heatScore"], 45], "#F59E0B",
          "#22C55E",
        ],
        "circle-stroke-color": "#09090b",
        "circle-stroke-width": 1.5,
        "circle-opacity": 0.9,
      },
    });

    // Wide invisible hit-target layer
    m.addLayer({
      id: "wells-click",
      type: "circle",
      source: "wells",
      paint: { "circle-radius": 14, "circle-opacity": 0, "circle-stroke-opacity": 0 },
    });
  }, [mapReady, geojson]);

  // Fallback table when no Mapbox token
  const FallbackTable = () => {
    if (!geojson) return null;
    return (
      <div className="absolute inset-0 overflow-auto bg-z950 p-6 pt-20">
        <div className="max-w-3xl mx-auto">
          <div className="bg-z850 border border-sig-amber px-4 py-3 mb-5">
            <p className="text-sig-amber text-xs font-mono font-semibold">Mapbox token missing</p>
            <p className="text-z500 text-[10px] font-mono mt-1">
              Add your token to <code className="bg-z800 px-1">frontend/.env.local</code> and restart.
            </p>
          </div>
          <p className="text-z600 text-[10px] mb-2 font-mono tracking-wider uppercase">
            {geojson.features.length} wells — click any to analyse
          </p>
          <div className="space-y-px">
            {geojson.features.slice(0, 30).map((f) => (
              <button
                key={f.properties.wellName}
                onClick={async () => {
                  setScoring(true);
                  try { onWellClickRef.current(await fetchVentScore(f.properties.lat, f.properties.lon)); }
                  catch { /* silent */ }
                  finally { setScoring(false); }
                }}
                className="w-full flex items-center justify-between px-4 py-2.5 bg-z900 hover:bg-z850 border border-z800 text-left transition-colors"
              >
                <div>
                  <span className="text-z200 text-xs font-mono">{f.properties.wellName}</span>
                  <span className="text-z600 text-[10px] font-mono ml-3">{f.properties.county}</span>
                </div>
                <span className="text-z400 text-[10px] font-mono">Heat {f.properties.heatScore}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full h-full relative">
      <div ref={mapContainer} className={`w-full h-full ${!HAS_TOKEN ? "hidden" : ""}`} />
      {!HAS_TOKEN && !loading && <FallbackTable />}

      {(loading || scoring) && (
        <div className="absolute inset-0 flex items-center justify-center bg-z950/70 z-10 pointer-events-none">
          <div className="flex flex-col items-center gap-3 bg-z900 border border-z800 px-6 py-4">
            <div className="w-5 h-5 border border-z400 border-t-transparent animate-spin" />
            <p className="text-z500 text-[10px] font-mono tracking-wider uppercase">
              {loading ? "Loading geothermal data…" : "Calculating score…"}
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 bg-z900 border border-sig-red text-sig-red px-4 py-2.5 text-xs max-w-sm text-center font-mono">
          {error}
        </div>
      )}

      {!loading && !error && HAS_TOKEN && (
        <div className={`absolute left-1/2 -translate-x-1/2 bg-z900 border border-z800 text-z600 px-3 py-1.5 text-[10px] font-mono tracking-wider pointer-events-none z-10 uppercase ${hasSavedBar ? "bottom-14" : "bottom-6"}`}>
          Click any borehole to analyse structural integrity
        </div>
      )}
    </div>
  );
}
