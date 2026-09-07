"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Loader2, X } from "lucide-react";
import "leaflet/dist/leaflet.css";

const MapContainer = dynamic(() => import("react-leaflet").then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((m) => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then((m) => m.Marker), { ssr: false });
const Polyline = dynamic(() => import("react-leaflet").then((m) => m.Polyline), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then((m) => m.Popup), { ssr: false });
const Tooltip = dynamic(() => import("react-leaflet").then((m) => m.Tooltip), { ssr: false });

const MAPANDAN_CENTER: [number, number] = [16.0271, 120.4542];

interface PublicRoadMapProps {
    advisories: any[];
    selectedId: string | null;
    onSelectAdvisory: (id: string) => void;
    onClearSelection?: () => void;
}

function AutoFitMapBounds({ 
    advisories, 
    selectedId 
}: { 
    advisories: any[]; 
    selectedId: string | null; 
}) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useMap } = require("react-leaflet");
    const map = useMap();

    useEffect(() => {
        if (!map) return;

        // Invalidate map size to ensure all Leaflet tiles render completely on mount
        const timer = setTimeout(() => {
            map.invalidateSize();
        }, 250);

        if (selectedId) {
            const target = advisories.find((a) => a.id === selectedId);
            if (target?.startLocation?.lat && target?.startLocation?.lng) {
                map.flyTo([target.startLocation.lat, target.startLocation.lng], 16, { duration: 1.2 });
                return () => clearTimeout(timer);
            }
        }

        const points: [number, number][] = [];
        advisories.forEach((a) => {
            if (a.startLocation?.lat && a.startLocation?.lng) {
                points.push([a.startLocation.lat, a.startLocation.lng]);
            }
            if (a.endLocation?.lat && a.endLocation?.lng) {
                points.push([a.endLocation.lat, a.endLocation.lng]);
            }
        });

        if (points.length > 0) {
            map.fitBounds(points, { padding: [60, 60], maxZoom: 15 });
        } else {
            map.setView(MAPANDAN_CENTER, 14);
        }

        return () => clearTimeout(timer);
    }, [map, advisories, selectedId]);

    return null;
}

export default function PublicRoadMap({
    advisories,
    selectedId,
    onSelectAdvisory,
    onClearSelection,
}: PublicRoadMapProps) {
    const [mounted, setMounted] = useState(false);
    const [LInstance, setLInstance] = useState<any>(null);

    // Isolated focus mode: when selectedId is present, ONLY that specific road closure renders
    const visibleAdvisories = React.useMemo(() => {
        if (!selectedId) return advisories;
        return advisories.filter((a) => a.id === selectedId);
    }, [advisories, selectedId]);

    const activeSelectedAdvisory = React.useMemo(() => {
        if (!selectedId) return null;
        return advisories.find((a) => a.id === selectedId) || null;
    }, [advisories, selectedId]);

    useEffect(() => {
        setMounted(true);
        import("leaflet").then((L) => {
            delete (L.Icon.Default.prototype as any)._getIconUrl;
            L.Icon.Default.mergeOptions({
                iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
                iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
                shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
            });
            setLInstance(L);
        });
    }, []);

    if (!mounted || !LInstance) {
        return (
            <div className="w-full h-[580px] bg-slate-900 rounded-3xl flex flex-col items-center justify-center border border-slate-800">
                <Loader2 className="w-8 h-8 text-amber-500 animate-spin mb-3" />
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Loading Live Road Network...</p>
            </div>
        );
    }

    const createPinIcon = (color: string, label: string) => {
        return LInstance.divIcon({
            className: "custom-hazard-pin",
            html: `
                <div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%);">
                    <div style="background:${color};color:#ffffff;font-size:10px;font-weight:900;padding:2px 7px;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.5);border:1.5px solid #ffffff;white-space:nowrap;text-transform:uppercase;letter-spacing:0.5px;">
                        ${label}
                    </div>
                    <div style="width:14px;height:14px;background:${color};border:2px solid #ffffff;border-radius:50%;margin-top:2px;box-shadow:0 0 12px ${color};"></div>
                </div>
            `,
            iconSize: [0, 0],
            iconAnchor: [0, 0],
        });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "CLOSED":
                return "#ef4444";
            case "PARTIALLY_CLOSED":
                return "#f59e0b";
            case "DETOUR_ONLY":
                return "#8b5cf6";
            case "REOPENED":
                return "#10b981";
            default:
                return "#ef4444";
        }
    };

    return (
        <div className="relative w-full h-[580px] rounded-3xl overflow-hidden shadow-2xl z-0">
            <MapContainer
                center={MAPANDAN_CENTER}
                zoom={14}
                style={{ width: "100%", height: "100%" }}
                className="z-0"
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                />

                <AutoFitMapBounds 
                    advisories={visibleAdvisories} 
                    selectedId={selectedId} 
                />

                {visibleAdvisories.map((advisory) => {
                    const isSelected = selectedId === advisory.id;
                    const color = getStatusColor(advisory.status);

                    const polyCoords: [number, number][] = advisory.routeCoordinates && advisory.routeCoordinates.length > 0
                        ? advisory.routeCoordinates
                        : (advisory.startLocation && advisory.endLocation)
                            ? [[advisory.startLocation.lat, advisory.startLocation.lng], [advisory.endLocation.lat, advisory.endLocation.lng]]
                            : [];

                    return (
                        <React.Fragment key={advisory.id}>
                            {polyCoords.length >= 2 && (
                                <>
                                    {/* Black Underlay Casing for High Contrast */}
                                    <Polyline
                                        positions={polyCoords}
                                        pathOptions={{
                                            color: "#020617",
                                            weight: isSelected ? 12 : 9,
                                            opacity: 0.95,
                                            lineCap: "round",
                                            lineJoin: "round",
                                        }}
                                        eventHandlers={{
                                            click: () => onSelectAdvisory(advisory.id),
                                        }}
                                    />
                                    {/* Vibrant Foreground Color */}
                                    <Polyline
                                        positions={polyCoords}
                                        pathOptions={{
                                            color: color,
                                            weight: isSelected ? 8 : 5,
                                            opacity: 1,
                                            lineCap: "round",
                                            lineJoin: "round",
                                        }}
                                        eventHandlers={{
                                            click: () => onSelectAdvisory(advisory.id),
                                        }}
                                    />
                                </>
                            )}

                            {advisory.startLocation && (
                                <Marker
                                    position={[advisory.startLocation.lat, advisory.startLocation.lng]}
                                    icon={createPinIcon(color, "Point A")}
                                    eventHandlers={{
                                        click: () => onSelectAdvisory(advisory.id),
                                    }}
                                >
                                    <Tooltip permanent={false} direction="top" offset={[0, -10]}>
                                        <span className="font-bold text-xs">{advisory.title} (Start)</span>
                                    </Tooltip>
                                    <Popup>
                                        <div className="p-1 space-y-1 text-slate-900">
                                            <p className="font-black text-xs uppercase italic">{advisory.title}</p>
                                            <p className="text-[11px] text-slate-600 font-semibold">{advisory.roadName || advisory.barangay || "Mapandan"}</p>
                                            {advisory.detourAdvice && (
                                                <p className="text-[10px] text-blue-600 font-bold">Detour: {advisory.detourAdvice}</p>
                                            )}
                                        </div>
                                    </Popup>
                                </Marker>
                            )}

                            {advisory.endLocation && (
                                <Marker
                                    position={[advisory.endLocation.lat, advisory.endLocation.lng]}
                                    icon={createPinIcon(color, "Point B")}
                                    eventHandlers={{
                                        click: () => onSelectAdvisory(advisory.id),
                                    }}
                                >
                                    <Tooltip permanent={false} direction="top" offset={[0, -10]}>
                                        <span className="font-bold text-xs">{advisory.title} (End)</span>
                                    </Tooltip>
                                </Marker>
                            )}
                        </React.Fragment>
                    );
                })}
            </MapContainer>

            {/* Top-Right Floating Focus Control Badge */}
            {selectedId && activeSelectedAdvisory && (
                <div className="absolute top-4 right-4 z-[1000] flex items-center gap-2 animate-in fade-in zoom-in-95 duration-300">
                    <div className="bg-slate-900/95 backdrop-blur-xl px-3.5 py-2 rounded-2xl shadow-2xl flex items-center gap-2 text-xs">
                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                        <span className="font-black text-white uppercase italic tracking-tight truncate max-w-[200px]">
                            {activeSelectedAdvisory.title}
                        </span>
                        {onClearSelection && (
                            <button
                                type="button"
                                onClick={onClearSelection}
                                className="ml-1 p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                                title="Show All Roads"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Floating Map Legend */}
            <div className="absolute bottom-4 left-4 z-[1000] p-3 rounded-2xl bg-slate-900/95 backdrop-blur-md shadow-xl text-xs space-y-2 hidden sm:block">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Traffic Legend</p>
                <div className="flex flex-col gap-1.5 font-bold">
                    <div className="flex items-center gap-2 text-rose-400">
                        <span className="w-3 h-3 rounded-full bg-rose-500 shadow-sm" />
                        <span>Closed / Impassable</span>
                    </div>
                    <div className="flex items-center gap-2 text-amber-400">
                        <span className="w-3 h-3 rounded-full bg-amber-500 shadow-sm" />
                        <span>Partially Open / One-way</span>
                    </div>
                    <div className="flex items-center gap-2 text-purple-400">
                        <span className="w-3 h-3 rounded-full bg-purple-500 shadow-sm" />
                        <span>Detour Route Only</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
