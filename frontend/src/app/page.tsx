"use client";

import dynamic from "next/dynamic";
import { useState, useCallback, useEffect } from "react";
import type { VentScoreResponse, SimulationResponse, BusinessProfile, SavedLocation } from "@/lib/api";
import { DEFAULT_PROFILE } from "@/lib/api";
import { SiteDashboard } from "@/components/SiteDashboard";
import { CertModal } from "@/components/CertModal";
import { BusinessProfilePanel } from "@/components/BusinessProfile";
import { SavedLocations } from "@/components/SavedLocations";
import { CompareModal } from "@/components/CompareModal";
import { Header } from "@/components/Header";

const VentMap = dynamic(() => import("@/components/VentMap"), { ssr: false });

const LS_PROFILE = "vent_profile";
const LS_SAVED   = "vent_saved";

function loadProfile(): BusinessProfile {
  if (typeof window === "undefined") return DEFAULT_PROFILE;
  try { return JSON.parse(localStorage.getItem(LS_PROFILE) || "null") ?? DEFAULT_PROFILE; }
  catch { return DEFAULT_PROFILE; }
}
function loadSaved(): SavedLocation[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(LS_SAVED) || "[]"); }
  catch { return []; }
}

export default function Home() {
  const [profile,       setProfile]       = useState<BusinessProfile>(DEFAULT_PROFILE);
  const [saved,         setSaved]         = useState<SavedLocation[]>([]);
  const [selectedScore, setSelectedScore] = useState<VentScoreResponse | null>(null);
  const [certData,      setCertData]      = useState<SimulationResponse | null>(null);
  const [dashOpen,      setDashOpen]      = useState(false);
  const [certOpen,      setCertOpen]      = useState(false);
  const [settingsOpen,  setSettingsOpen]  = useState(false);
  const [compareOpen,   setCompareOpen]   = useState(false);

  useEffect(() => {
    setProfile(loadProfile());
    setSaved(loadSaved());
  }, []);

  function saveProfile(p: BusinessProfile) {
    setProfile(p);
    localStorage.setItem(LS_PROFILE, JSON.stringify(p));
  }

  function toggleSave() {
    if (!selectedScore) return;
    setSaved((prev) => {
      const exists = prev.some((s) => s.wellName === selectedScore.wellName);
      const next = exists
        ? prev.filter((s) => s.wellName !== selectedScore.wellName)
        : [...prev, { ...selectedScore, savedAt: new Date().toISOString() }];
      localStorage.setItem(LS_SAVED, JSON.stringify(next));
      return next;
    });
  }

  function removeFromSaved(wellName: string) {
    setSaved((prev) => {
      const next = prev.filter((s) => s.wellName !== wellName);
      localStorage.setItem(LS_SAVED, JSON.stringify(next));
      return next;
    });
  }

  const handleWellClick = useCallback((score: VentScoreResponse) => {
    setSelectedScore(score);
    setCertData(null);
    setDashOpen(true);
    setSettingsOpen(false);
  }, []);

  function handleCertify(sim: SimulationResponse) {
    setCertData(sim);
    setCertOpen(true);
  }

  function handleSelectSaved(s: SavedLocation) {
    setSelectedScore(s);
    setCertData(null);
    setDashOpen(true);
    setCompareOpen(false);
  }

  const isSaved = selectedScore ? saved.some((s) => s.wellName === selectedScore.wellName) : false;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-vent-bg">
      <Header onSettingsClick={() => setSettingsOpen((o) => !o)} />

      <VentMap onWellClick={handleWellClick} hasSavedBar={saved.length > 0} />

      {settingsOpen && (
        <BusinessProfilePanel profile={profile} onChange={saveProfile} onClose={() => setSettingsOpen(false)} />
      )}

      {dashOpen && selectedScore && (
        <SiteDashboard
          score={selectedScore}
          profile={profile}
          saved={isSaved}
          savedCount={saved.length}
          onClose={() => setDashOpen(false)}
          onCertify={handleCertify}
          onSave={toggleSave}
          onCompare={() => setCompareOpen(true)}
        />
      )}

      {certOpen && certData && selectedScore && (
        <CertModal sim={certData} score={selectedScore} profile={profile} onClose={() => setCertOpen(false)} />
      )}

      {/* Bottom bar — always visible when locations are saved */}
      <SavedLocations
        saved={saved}
        onRemove={removeFromSaved}
        onCompare={() => setCompareOpen(true)}
        onSelect={handleSelectSaved}
      />

      {compareOpen && (
        <CompareModal locations={saved} profile={profile} onClose={() => setCompareOpen(false)} onSelect={handleSelectSaved} />
      )}
    </div>
  );
}
