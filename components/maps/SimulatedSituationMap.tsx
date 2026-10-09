"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  Building2,
  HeartPulse,
  MapPinned,
  Navigation2,
  Pause,
  Play,
  ShieldAlert,
  Store,
  Truck,
  Waves,
} from "lucide-react";
import { cn } from "@/lib/utils";

type LocationCategory = "facility" | "response" | "risk";
type MapFilter = "ALL" | LocationCategory;

interface SampleLocation {
  id: string;
  name: string;
  detail: string;
  category: LocationCategory;
  x: number;
  y: number;
  barangay: string;
  icon: typeof Building2;
}

const locations: SampleLocation[] = [
  {
    id: "municipal-hall",
    name: "Municipal Hall",
    detail: "Government facility · sample location",
    category: "facility",
    x: 49,
    y: 48,
    barangay: "Barangay 1",
    icon: Building2,
  },
  {
    id: "public-market",
    name: "Public Market",
    detail: "Market stalls · sample cluster",
    category: "facility",
    x: 28,
    y: 34,
    barangay: "Barangay 1",
    icon: Store,
  },
  {
    id: "cemetery",
    name: "Municipal Cemetery",
    detail: "Community landmark · sample location",
    category: "facility",
    x: 78,
    y: 69,
    barangay: "Barangay 2",
    icon: MapPinned,
  },
  {
    id: "health-center",
    name: "Rural Health Unit",
    detail: "Health facility · sample location",
    category: "facility",
    x: 70,
    y: 34,
    barangay: "Barangay 2",
    icon: HeartPulse,
  },
  {
    id: "evacuation-center",
    name: "Evacuation Center",
    detail: "Emergency facility · sample location",
    category: "facility",
    x: 22,
    y: 72,
    barangay: "Barangay 1",
    icon: Building2,
  },
  {
    id: "flood-watch",
    name: "Flood Watch Zone",
    detail: "Situation overlay · sample zone",
    category: "risk",
    x: 88,
    y: 44,
    barangay: "Barangay 2",
    icon: Waves,
  },
];

const responseRoutes = [
  [
    { x: 37, y: 68 },
    { x: 42, y: 60 },
    { x: 48, y: 52 },
    { x: 55, y: 43 },
    { x: 62, y: 38 },
    { x: 70, y: 34 },
  ],
  [
    { x: 64, y: 74 },
    { x: 60, y: 65 },
    { x: 55, y: 56 },
    { x: 49, y: 48 },
    { x: 40, y: 42 },
    { x: 28, y: 34 },
  ],
];

const filterOptions: { value: MapFilter; label: string }[] = [
  { value: "ALL", label: "All pins" },
  { value: "facility", label: "Facilities" },
  { value: "response", label: "GPS demo" },
  { value: "risk", label: "Situation zones" },
];

export function SimulatedSituationMap() {
  const [filter, setFilter] = useState<MapFilter>("ALL");
  const [selectedLocation, setSelectedLocation] = useState<SampleLocation | null>(null);
  const [isSimulationRunning, setIsSimulationRunning] = useState(true);
  const [routeStep, setRouteStep] = useState(0);

  useEffect(() => {
    if (!isSimulationRunning) return;
    const timer = window.setInterval(() => {
      setRouteStep((step) => (step + 1) % responseRoutes[0].length);
    }, 2200);
    return () => window.clearInterval(timer);
  }, [isSimulationRunning]);

  const showFacilities = filter === "ALL" || filter === "facility";
  const showVehicles = filter === "ALL" || filter === "response";
  const showRisks = filter === "ALL" || filter === "risk";

  return (
    <section
      aria-labelledby="mayor-situation-map-title"
      className="mb-8 overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl dark:border-[#2a3040] dark:bg-[#151b2b]"
    >
      <div className="flex flex-col gap-4 border-b border-slate-100 p-5 dark:border-[#2a3040] sm:flex-row sm:items-center sm:justify-between sm:p-7">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Activity className="h-5 w-5 text-cyan-500" />
            <h2 id="mayor-situation-map-title" className="text-xl font-black uppercase italic tracking-tight text-slate-900 dark:text-white">
              Community Situation Map
            </h2>
            <span className="rounded-full border border-amber-300 bg-amber-100 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
              Demo simulation
            </span>
          </div>
          <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            Sample facilities, market stalls, cemetery, risk area, and simulated response units
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {filterOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={filter === option.value}
              onClick={() => setFilter(option.value)}
              className={cn(
                "rounded-xl border px-3 py-2 text-[9px] font-black uppercase tracking-wider transition-colors",
                filter === option.value
                  ? "border-cyan-500 bg-cyan-500 text-slate-950"
                  : "border-slate-200 bg-slate-50 text-slate-500 hover:border-cyan-400 hover:text-cyan-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
              )}
            >
              {option.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setIsSimulationRunning((running) => !running)}
            aria-label={isSimulationRunning ? "Pause simulated GPS" : "Start simulated GPS"}
            className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-[9px] font-black uppercase tracking-wider text-slate-600 hover:border-cyan-400 dark:border-white/10 dark:text-slate-300"
          >
            {isSimulationRunning ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            {isSimulationRunning ? "Pause" : "Resume"}
          </button>
        </div>
      </div>

      <div className="p-4 sm:p-7">
        <div className="relative isolate aspect-[1.35/1] min-h-[330px] overflow-hidden rounded-[1.5rem] border border-slate-700 bg-[#0b1624] sm:aspect-[2.2/1] sm:min-h-[390px]">
          <svg
            aria-hidden="true"
            className="absolute inset-0 h-full w-full"
            viewBox="0 0 1000 500"
            preserveAspectRatio="xMidYMid slice"
          >
            <defs>
              <pattern id="situation-grid" width="44" height="44" patternUnits="userSpaceOnUse">
                <path d="M 44 0 L 0 0 0 44" fill="none" stroke="#93c5fd" strokeOpacity="0.07" strokeWidth="1" />
              </pattern>
              <pattern id="risk-hatch" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
                <rect width="12" height="12" fill="#f97316" fillOpacity="0.09" />
                <line x1="0" y1="0" x2="0" y2="12" stroke="#fb923c" strokeOpacity="0.28" strokeWidth="3" />
              </pattern>
            </defs>
            <rect width="1000" height="500" fill="#0b1624" />
            <rect width="1000" height="500" fill="url(#situation-grid)" />

            <path d="M40 95 C180 135 225 70 360 125 S590 185 735 105 890 80 980 115" fill="none" stroke="#164e63" strokeOpacity="0.55" strokeWidth="52" />
            <path d="M30 365 C170 305 250 392 390 335 S610 260 735 350 900 400 995 335" fill="none" stroke="#164e63" strokeOpacity="0.55" strokeWidth="62" />
            <path d="M200 20 C245 115 305 155 355 250 S430 380 470 490" fill="none" stroke="#164e63" strokeOpacity="0.48" strokeWidth="42" />
            <path d="M710 5 C665 100 620 170 650 260 S735 380 790 495" fill="none" stroke="#164e63" strokeOpacity="0.48" strokeWidth="42" />

            <path d="M40 95 C180 135 225 70 360 125 S590 185 735 105 890 80 980 115" fill="none" stroke="#67e8f9" strokeOpacity="0.68" strokeWidth="2" strokeDasharray="11 8" />
            <path d="M30 365 C170 305 250 392 390 335 S610 260 735 350 900 400 995 335" fill="none" stroke="#67e8f9" strokeOpacity="0.62" strokeWidth="2" strokeDasharray="11 8" />
            <path d="M200 20 C245 115 305 155 355 250 S430 380 470 490" fill="none" stroke="#67e8f9" strokeOpacity="0.48" strokeWidth="2" strokeDasharray="9 9" />
            <path d="M710 5 C665 100 620 170 650 260 S735 380 790 495" fill="none" stroke="#67e8f9" strokeOpacity="0.48" strokeWidth="2" strokeDasharray="9 9" />

            <path d="M760 160 C824 138 913 163 948 220 L928 286 C866 314 783 288 749 240 Z" fill="url(#risk-hatch)" stroke="#fb923c" strokeOpacity="0.75" strokeWidth="2" strokeDasharray="8 6" />
            <path d="M80 220 C132 188 185 193 229 219 L216 277 C161 294 108 282 72 253 Z" fill="#22c55e" fillOpacity="0.07" stroke="#4ade80" strokeOpacity="0.25" strokeWidth="1" />

            <text x="493" y="102" fill="#bae6fd" fillOpacity="0.36" fontSize="14" fontWeight="800" letterSpacing="4">BARANGAY 1</text>
            <text x="741" y="395" fill="#bae6fd" fillOpacity="0.36" fontSize="14" fontWeight="800" letterSpacing="4">BARANGAY 2</text>
            <text x="36" y="475" fill="#94a3b8" fillOpacity="0.6" fontSize="10" fontWeight="700" letterSpacing="2">ILLUSTRATIVE GRID · NOT TO SCALE</text>
          </svg>

          <div className="absolute left-3 top-3 z-10 flex items-center gap-2 rounded-xl border border-amber-300/30 bg-slate-950/85 px-3 py-2 text-[9px] font-black uppercase tracking-wider text-amber-200 shadow-lg backdrop-blur sm:left-5 sm:top-5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-60" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-400" />
            </span>
            GPS simulation · not live
          </div>

          {showRisks && (
            <div className="absolute right-[7%] top-[36%] z-10 flex items-center gap-1.5 rounded-lg border border-orange-400/50 bg-slate-950/85 px-2 py-1.5 text-[8px] font-black uppercase tracking-wide text-orange-200 shadow-lg">
              <ShieldAlert className="h-3.5 w-3.5" />
              Flood watch · sample
            </div>
          )}

          {showFacilities && locations.filter((location) => location.category === "facility").map((location) => {
            const Icon = location.icon;
            const isSelected = selectedLocation?.id === location.id;
            return (
              <button
                key={location.id}
                type="button"
                aria-label={`${location.name}, ${location.barangay}, sample location`}
                aria-pressed={isSelected}
                onClick={() => setSelectedLocation(isSelected ? null : location)}
                className="group absolute z-20 -translate-x-1/2 -translate-y-1/2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                style={{ left: `${location.x}%`, top: `${location.y}%` }}
              >
                <span className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border-2 border-white shadow-lg transition-transform group-hover:scale-110 sm:h-10 sm:w-10",
                  location.id === "public-market" ? "bg-emerald-500 text-white" :
                  location.id === "cemetery" ? "bg-violet-500 text-white" :
                  location.id === "health-center" ? "bg-rose-500 text-white" :
                  "bg-blue-500 text-white",
                  isSelected && "scale-125 ring-4 ring-white/30"
                )}>
                  <Icon className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
                </span>
                <span className="mt-1 block max-w-24 truncate rounded-md bg-slate-950/90 px-1.5 py-1 text-[7px] font-black uppercase tracking-wide text-white shadow sm:max-w-32 sm:text-[8px]">
                  {location.name}
                </span>
              </button>
            );
          })}

          {showVehicles && responseRoutes.map((route, index) => {
            const position = route[routeStep];
            const isRescue = index === 0;
            return (
              <div
                key={isRescue ? "rescue-unit" : "poso-patrol"}
                className="absolute z-30 -translate-x-1/2 -translate-y-1/2 transition-[left,top] duration-[1800ms] ease-in-out"
                style={{ left: `${position.x}%`, top: `${position.y}%` }}
              >
                <span className={cn(
                  "relative flex h-8 w-8 items-center justify-center rounded-xl border-2 border-white text-white shadow-xl sm:h-9 sm:w-9",
                  isRescue ? "bg-cyan-500" : "bg-amber-500"
                )}>
                  <span className={cn(
                    "absolute -inset-1 animate-ping rounded-xl opacity-25",
                    isRescue ? "bg-cyan-400" : "bg-amber-400"
                  )} />
                  {isRescue ? <Truck className="relative h-4 w-4" /> : <Navigation2 className="relative h-4 w-4" />}
                </span>
                <span className="absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded bg-slate-950/90 px-1.5 py-1 text-[7px] font-black uppercase tracking-wide text-white sm:text-[8px]">
                  {isRescue ? "Rescue 01 · SIM" : "POSO 01 · SIM"}
                </span>
              </div>
            );
          })}

          <div className="absolute bottom-3 right-3 z-10 flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950/85 px-3 py-2 text-[8px] font-bold uppercase tracking-wide text-slate-300 shadow-lg backdrop-blur sm:bottom-5 sm:right-5">
            <span className={cn("h-2 w-2 rounded-full", isSimulationRunning ? "animate-pulse bg-cyan-400" : "bg-slate-500")} />
            {isSimulationRunning ? "Simulated units moving" : "Simulation paused"}
          </div>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="flex flex-wrap gap-2">
            <LegendItem color="bg-emerald-500" label="Market" />
            <LegendItem color="bg-violet-500" label="Cemetery" />
            <LegendItem color="bg-blue-500" label="Municipal facilities" />
            <LegendItem color="bg-cyan-500" label="Rescue GPS · simulated" />
            <LegendItem color="bg-amber-500" label="POSO GPS · simulated" />
            <LegendItem color="bg-orange-500" label="Sample situation zone" />
          </div>
          <p className="rounded-xl border border-amber-300/40 bg-amber-50 px-3 py-2 text-[9px] font-bold leading-relaxed text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/5 dark:text-amber-200">
            Demo only: all pins, zones, routes, and GPS movement are illustrative—not verified coordinates or live tracking.
          </p>
        </div>

        {selectedLocation && (
          <div className="mt-4 flex items-center gap-3 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4">
            <MapPinned className="h-5 w-5 shrink-0 text-cyan-500" />
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-slate-900 dark:text-white">{selectedLocation.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {selectedLocation.detail} · {selectedLocation.barangay}
              </p>
            </div>
            <span className="ml-auto shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-[8px] font-black uppercase text-amber-900 dark:bg-amber-500/10 dark:text-amber-300">
              Sample
            </span>
          </div>
        )}
      </div>
    </section>
  );
}

export function SampleMapPreview() {
  const samplePins = [
    { label: "Public Market", x: 29, y: 37, color: "bg-emerald-500", icon: Store },
    { label: "Municipal Hall", x: 51, y: 51, color: "bg-blue-500", icon: Building2 },
    { label: "Cemetery", x: 76, y: 68, color: "bg-violet-500", icon: MapPinned },
  ];

  return (
    <div
      aria-label="Illustrative sample map showing a public market, municipal hall, and cemetery"
      className="relative isolate h-[350px] overflow-hidden rounded-[2rem] border border-slate-700 bg-[#0b1624] shadow-2xl md:h-[500px]"
    >
      <svg
        aria-hidden="true"
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1000 600"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <pattern id="sample-map-grid" width="46" height="46" patternUnits="userSpaceOnUse">
            <path d="M 46 0 L 0 0 0 46" fill="none" stroke="#93c5fd" strokeOpacity="0.08" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="1000" height="600" fill="#0b1624" />
        <rect width="1000" height="600" fill="url(#sample-map-grid)" />
        <path d="M-20 130 C160 190 260 80 420 150 S700 240 1020 100" fill="none" stroke="#164e63" strokeOpacity="0.55" strokeWidth="54" />
        <path d="M-20 440 C180 365 290 500 470 405 S770 330 1020 445" fill="none" stroke="#164e63" strokeOpacity="0.55" strokeWidth="64" />
        <path d="M230 -20 C280 110 355 205 390 310 S470 500 520 620" fill="none" stroke="#164e63" strokeOpacity="0.5" strokeWidth="44" />
        <path d="M760 -20 C690 130 650 220 700 335 S800 500 850 620" fill="none" stroke="#164e63" strokeOpacity="0.5" strokeWidth="44" />
        <path d="M-20 130 C160 190 260 80 420 150 S700 240 1020 100" fill="none" stroke="#67e8f9" strokeOpacity="0.62" strokeWidth="2" strokeDasharray="10 9" />
        <path d="M-20 440 C180 365 290 500 470 405 S770 330 1020 445" fill="none" stroke="#67e8f9" strokeOpacity="0.55" strokeWidth="2" strokeDasharray="10 9" />
        <text x="472" y="112" fill="#bae6fd" fillOpacity="0.35" fontSize="17" fontWeight="800" letterSpacing="4">BARANGAY 1</text>
        <text x="740" y="505" fill="#bae6fd" fillOpacity="0.35" fontSize="17" fontWeight="800" letterSpacing="4">BARANGAY 2</text>
        <text x="32" y="565" fill="#94a3b8" fillOpacity="0.65" fontSize="12" fontWeight="700" letterSpacing="2">ILLUSTRATIVE SAMPLE · NOT TO SCALE</text>
      </svg>

      <div className="absolute left-4 top-4 z-10 rounded-xl border border-amber-300/30 bg-slate-950/85 px-3 py-2 text-[9px] font-black uppercase tracking-wider text-amber-200 shadow-lg backdrop-blur">
        Sample map · illustrative only
      </div>

      {samplePins.map(({ label, x, y, color, icon: Icon }) => (
        <div
          key={label}
          className="absolute z-10 -translate-x-1/2 -translate-y-1/2 text-center"
          style={{ left: `${x}%`, top: `${y}%` }}
        >
          <span className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full border-2 border-white ${color} text-white shadow-lg`}>
            <Icon className="h-4 w-4" />
          </span>
          <span className="mt-1 block whitespace-nowrap rounded-md bg-slate-950/90 px-2 py-1 text-[8px] font-black uppercase tracking-wide text-white shadow">
            {label}
          </span>
        </div>
      ))}

      <div className="absolute bottom-4 right-4 z-10 rounded-xl border border-white/10 bg-slate-950/85 px-3 py-2 text-[8px] font-bold uppercase tracking-wide text-slate-300 shadow-lg backdrop-blur">
        Sample pins · no live GPS
      </div>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[9px] font-bold text-slate-600 dark:border-white/10 dark:text-slate-300">
      <span className={cn("h-2 w-2 rounded-full", color)} />
      {label}
    </span>
  );
}
