"use client";

import { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { Loader2, Trash2, Plus } from "lucide-react";
import { useDisaster, DisasterZone } from "../providers/DisasterProvider";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { addDisasterZone, updateDisasterZone, deleteDisasterZone } from "../../actions";
import { toast } from "sonner";
import type { GeoJsonObject } from "geojson";
import lguConfig from "@/config/lgu.config.json";

// ─── Dynamic imports to prevent SSR issues ──────────────────────────────────
const MapContainer = dynamic(() => import("react-leaflet").then(m => m.MapContainer), { ssr: false, loading: () => <MapLoading /> });
const TileLayer    = dynamic(() => import("react-leaflet").then(m => m.TileLayer),    { ssr: false });
const Polygon      = dynamic(() => import("react-leaflet").then(m => m.Polygon),      { ssr: false });
const Marker       = dynamic(() => import("react-leaflet").then(m => m.Marker),       { ssr: false });
const Popup        = dynamic(() => import("react-leaflet").then(m => m.Popup),        { ssr: false });
const GeoJSON      = dynamic(() => import("react-leaflet").then(m => m.GeoJSON),      { ssr: false });

const MUNICIPAL_CENTER: [number, number] = [
    lguConfig.map.latitude ?? 0,
    lguConfig.map.longitude ?? 0,
];
const MUNICIPAL_ZOOM = 13;

// ─── MapController: fits map to municipal boundary on load ───────────────────────
function MapController({ border }: { border: GeoJsonObject | null }) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useMap } = require("react-leaflet");
    const map = useMap();

    useEffect(() => {
         
        if (!border || (border as any).type !== "Polygon") return;
         
        const latlngs = (border as any).coordinates[0].map(
            (c: [number, number]) => [c[1], c[0]] as [number, number]
        );
        map.fitBounds(latlngs, { padding: [50, 50] });
        // Prevent zooming out past the fitted view
        map.setMinZoom(map.getZoom() - 1);
    }, [border, map]);

    return null;
}

// ─── Loading skeleton ────────────────────────────────────────────────────────
function MapLoading() {
    return (
        <div className="w-full h-[700px] bg-slate-100 dark:bg-[#151b2b] rounded-2xl flex flex-col items-center justify-center border border-slate-200 dark:border-[#2a3040]">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
            <p className="text-slate-500 font-medium">Loading Map Workspace...</p>
        </div>
    );
}

// ─── Map style definitions ───────────────────────────────────────────────────
const MAP_STYLES = {
    satellite: {
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        attribution: "Tiles &copy; Esri",
    },
    streets: {
        url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    },
    dark: {
        url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        attribution: '&copy; OpenStreetMap contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    },
    terrain: {
        url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
        attribution: "Map data: &copy; OpenStreetMap contributors, SRTM | Map style: &copy; OpenTopoMap (CC-BY-SA)",
    },
} as const;

type MapStyleKey = keyof typeof MAP_STYLES;

// ─── Main Component ──────────────────────────────────────────────────────────
export function DisasterMapView() {
    const { zones, activeZoneId, setActiveZoneId, updateZone, removeZone } = useDisaster();
    const [municipalBorder, setMunicipalBorder] = useState<GeoJsonObject | null>(null);
    const [mounted,     setMounted]     = useState(false);
    const [iconsLoaded, setIconsLoaded] = useState(false);
    const [mapStyle,    setMapStyle]    = useState<MapStyleKey>("satellite");

    // Leaflet icon refs — created once after Leaflet loads
     
    const [handleIcon,  setHandleIcon]  = useState<any>(null);
     
    const [midIcon,     setMidIcon]     = useState<any>(null);

    useEffect(() => {
        setMounted(true);

        // ── Load municipal boundary from public folder ──────────────────────────
        fetch(lguConfig.map.boundaryFile)
            .then(res => res.json())
            .then(data => setMunicipalBorder(data))
            .catch(err => console.error("Failed to load municipal border:", err));

        // ── Bootstrap Leaflet icons (must run client-side) ─────────────────
        import("leaflet").then(L => {
            setHandleIcon(new L.DivIcon({
                className: "",
                html: `<div style="
                    background:#fff; border:2px solid #3b82f6;
                    width:12px; height:12px; border-radius:2px;
                    box-shadow:0 0 5px rgba(0,0,0,.25);
                "></div>`,
                iconSize:   [12, 12],
                iconAnchor: [6, 6],
            }));
            setMidIcon(new L.DivIcon({
                className: "",
                html: `<div style="
                    background:#fff; border:1.5px solid #3b82f6;
                    width:8px; height:8px; border-radius:50%; opacity:.7;
                "></div>`,
                iconSize:   [8, 8],
                iconAnchor: [4, 4],
            }));
            setIconsLoaded(true);
        });
    }, []);

    // ── Mask polygon: darkens everything OUTSIDE the municipality ─────────────────────
    const maskPositions = useMemo(() => {
         
        if (!municipalBorder || (municipalBorder as any).type !== "Polygon") return null;
        const outerWorld: [number, number][] = [
            [90, -180], [90, 180], [-90, 180], [-90, -180],
        ];
        // GeoJSON [lng, lat] → Leaflet [lat, lng]
         
        const municipalRing: [number, number][] = (municipalBorder as any).coordinates[0]
            .map((c: [number, number]) => [c[1], c[0]]);
        return [outerWorld, municipalRing];
    }, [municipalBorder]);

    if (!mounted || !iconsLoaded) return <MapLoading />;

    // ─── Handlers ────────────────────────────────────────────────────────────
    const handleVertexDrag = async (
        zone: DisasterZone,
        sIdx: number,
        vIdx: number,
        latlng: { lat: number; lng: number }
    ) => {
        const newShapes = zone.shapes.map((s, i) =>
            i === sIdx
                ? s.map((v, j) => j === vIdx ? [latlng.lat, latlng.lng] as [number, number] : v)
                : s
        );
        updateZone(zone.id, { shapes: newShapes });
        await updateDisasterZone(zone.id, { shapes: newShapes });
    };

    const handleMidPointDrag = async (
        zone: DisasterZone,
        sIdx: number,
        insertIdx: number,
        latlng: { lat: number; lng: number }
    ) => {
        const newShapes = zone.shapes.map((s, i) => {
            if (i !== sIdx) return s;
            const updated = [...s];
            updated.splice(insertIdx, 0, [latlng.lat, latlng.lng]);
            return updated as [number, number][];
        });
        updateZone(zone.id, { shapes: newShapes });
        await updateDisasterZone(zone.id, { shapes: newShapes });
        toast.success("New vertex added!");
    };

    const handleAddArea = async (zone: DisasterZone) => {
        // Default new shape placed at municipal center
        const [clat, clng] = MUNICIPAL_CENTER;
        const newShape: [number, number][] = [
            [clat + 0.005, clng - 0.005],
            [clat + 0.005, clng + 0.005],
            [clat - 0.005, clng + 0.005],
            [clat - 0.005, clng - 0.005],
        ];
        const newShapes = [...zone.shapes, newShape];
        updateZone(zone.id, { shapes: newShapes });
        await updateDisasterZone(zone.id, { shapes: newShapes });
        toast.success("New area added!");
    };

    const handleDelete = async (id: string) => {
        const result = await deleteDisasterZone(id);
        if (result.success) {
            removeZone(id);
            toast.success("Disaster zone removed.");
        } else {
            toast.error("Failed to delete zone.");
        }
    };

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="w-full bg-white dark:bg-[#151b2b] p-4 rounded-3xl border border-slate-200 dark:border-[#2a3040] shadow-xl relative z-0">
            <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />

            {/* Map Style Switcher */}
            <div className="absolute top-8 right-8 z-[1000] flex flex-col gap-2">
                {(Object.keys(MAP_STYLES) as MapStyleKey[]).map(style => (
                    <button
                        key={style}
                        onClick={() => setMapStyle(style)}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-tighter transition-all shadow-lg border-2 ${
                            mapStyle === style
                                ? "bg-blue-600 text-white border-blue-600 scale-105"
                                : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-transparent hover:border-blue-500/50"
                        }`}
                    >
                        {style}
                    </button>
                ))}
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-[#2a3040] h-[700px]">
                <MapContainer
                    center={MUNICIPAL_CENTER}
                    zoom={MUNICIPAL_ZOOM}
                    style={{ height: "100%", width: "100%", zIndex: 0 }}
                >
                    {/* Fits map to exact municipal boundary on load */}
                    <MapController border={municipalBorder} />

                    <TileLayer
                        attribution={MAP_STYLES[mapStyle].attribution}
                        url={MAP_STYLES[mapStyle].url}
                    />

                    {/* Municipal boundary outline */}
                    {municipalBorder && (
                        <GeoJSON
                            key={JSON.stringify(municipalBorder)} // force re-render on data change
                            data={municipalBorder}
                            style={{
                                color: "#3b82f6",
                                weight: 3,
                                opacity: 1,
                                fillOpacity: 0,
                            }}
                        />
                    )}

                    {/* Mask: dims everything outside the municipality */}
                    {maskPositions && (
                        <Polygon
                             
                            positions={maskPositions as any}
                            pathOptions={{
                                fillColor: "#0f172a",
                                fillOpacity: 0.65,
                                weight: 0,
                                color: "transparent",
                            }}
                        />
                    )}

                    {/* Disaster zones */}
                    {zones.map(zone => {
                        if (!zone.shapes || !Array.isArray(zone.shapes)) return null;
                        const isActive = activeZoneId === zone.id;

                        return zone.shapes.map((shape: [number, number][], sIdx: number) => (
                            <div key={`${zone.id}-s-${sIdx}`}>
                                <Polygon
                                    positions={shape}
                                    pathOptions={{
                                        color:       zone.riskColor,
                                        fillColor:   zone.typeColor,
                                        fillOpacity: 0.4,
                                        weight:      isActive ? 3 : 1,
                                    }}
                                    eventHandlers={{
                                        click: e => {
                                             
                                            (e as any).originalEvent.stopPropagation();
                                            setActiveZoneId(zone.id);
                                        },
                                    }}
                                >
                                    <Popup>
                                        <div className="p-3 min-w-[150px]">
                                            <p className="font-bold text-lg mb-1">{zone.type}</p>
                                            <p className="text-sm text-slate-500 mb-3">
                                                Risk:{" "}
                                                <span style={{ color: zone.riskColor }} className="font-bold">
                                                    {zone.riskLevel}
                                                </span>
                                            </p>
                                            <div className="flex flex-col gap-2">
                                                <button
                                                    onClick={() => handleAddArea(zone)}
                                                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-xs font-bold"
                                                >
                                                    <Plus className="w-3 h-3" /> Add Another Area
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(zone.id)}
                                                    className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-xs font-bold"
                                                >
                                                    <Trash2 className="w-3 h-3" /> Remove Disaster
                                                </button>
                                            </div>
                                        </div>
                                    </Popup>
                                </Polygon>

                                {/* Vertex & midpoint handles — only when zone is active */}
                                {isActive && handleIcon && midIcon && (
                                    <>
                                        {shape.map((coord, vIdx) => (
                                            <Marker
                                                key={`${zone.id}-v-${sIdx}-${vIdx}`}
                                                position={coord}
                                                icon={handleIcon}
                                                draggable
                                                eventHandlers={{
                                                    dragend: e => handleVertexDrag(zone, sIdx, vIdx, e.target.getLatLng()),
                                                }}
                                            />
                                        ))}

                                        {shape.map((coord, vIdx) => {
                                            const next = shape[(vIdx + 1) % shape.length];
                                            const mid: [number, number] = [
                                                (coord[0] + next[0]) / 2,
                                                (coord[1] + next[1]) / 2,
                                            ];
                                            return (
                                                <Marker
                                                    key={`${zone.id}-m-${sIdx}-${vIdx}`}
                                                    position={mid}
                                                    icon={midIcon}
                                                    draggable
                                                    eventHandlers={{
                                                        dragend: e => handleMidPointDrag(zone, sIdx, vIdx + 1, e.target.getLatLng()),
                                                    }}
                                                />
                                            );
                                        })}
                                    </>
                                )}
                            </div>
                        ));
                    })}
                </MapContainer>
            </div>
        </div>
    );
}
