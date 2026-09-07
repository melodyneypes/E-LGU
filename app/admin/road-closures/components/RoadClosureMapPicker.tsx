"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Loader2, RotateCcw } from "lucide-react";
import "leaflet/dist/leaflet.css";

// Dynamic imports to prevent Next.js SSR document is not defined errors
const MapContainer = dynamic(() => import("react-leaflet").then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((m) => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then((m) => m.Marker), { ssr: false });
const Polyline = dynamic(() => import("react-leaflet").then((m) => m.Polyline), { ssr: false });
const Tooltip = dynamic(() => import("react-leaflet").then((m) => m.Tooltip), { ssr: false });

export interface PointLocation {
    lat: number;
    lng: number;
    address?: string;
}

interface RoadClosureMapPickerProps {
    startLocation: PointLocation | null;
    endLocation: PointLocation | null;
    routeCoordinates?: [number, number][] | null;
    onChange: (
        start: PointLocation | null,
        end: PointLocation | null,
        routeCoords?: [number, number][] | null
    ) => void;
}

const MAPANDAN_CENTER: [number, number] = [16.0271, 120.4542];

// Client child component for map events & dynamic icons
function MapEventListener({
    onPointSelect,
}: {
    onPointSelect: (lat: number, lng: number) => void;
}) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useMapEvents } = require("react-leaflet");

    useMapEvents({
        click(e: any) {
            onPointSelect(e.latlng.lat, e.latlng.lng);
        },
    });

    return null;
}

export function RoadClosureMapPicker({
    startLocation,
    endLocation,
    routeCoordinates,
    onChange,
}: RoadClosureMapPickerProps) {
    const [mounted, setMounted] = useState(false);
    const [activeMode, setActiveMode] = useState<"start" | "end" | "done">("start");
    const [LInstance, setLInstance] = useState<any>(null);
    const [isSnapping, setIsSnapping] = useState(false);
    const [snappedCoords, setSnappedCoords] = useState<[number, number][]>([]);

    useEffect(() => {
        setMounted(true);
        import("leaflet").then((L) => {
            // Fix standard leaflet icons
            delete (L.Icon.Default.prototype as any)._getIconUrl;
            L.Icon.Default.mergeOptions({
                iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
                iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
                shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
            });
            setLInstance(L);
        });
    }, []);

    useEffect(() => {
        if (!startLocation) {
            setActiveMode("start");
            setSnappedCoords([]);
        } else if (!endLocation) {
            setActiveMode("end");
            setSnappedCoords([]);
        } else {
            setActiveMode("done");
        }
    }, [startLocation, endLocation]);

    // OSRM Snap Routing Engine
    useEffect(() => {
        if (routeCoordinates && routeCoordinates.length > 0) {
            setSnappedCoords(routeCoordinates);
            return;
        }

        if (!startLocation || !endLocation) {
            setSnappedCoords([]);
            return;
        }

        let isCancelled = false;

        async function fetchSnappedRoute() {
            setIsSnapping(true);
            try {
                // Query OSRM routing service: coordinates in format {lng},{lat};{lng},{lat}
                const url = `https://router.project-osrm.org/route/v1/driving/${startLocation!.lng},${startLocation!.lat};${endLocation!.lng},${endLocation!.lat}?overview=full&geometries=geojson`;
                const res = await fetch(url);
                const data = await res.json();

                if (!isCancelled && data && data.routes && data.routes.length > 0) {
                    const geometry = data.routes[0].geometry;
                    // GeoJSON coordinates are [lng, lat], Leaflet polyline expects [lat, lng]
                    const latLngs: [number, number][] = geometry.coordinates.map(
                        (coord: [number, number]) => [coord[1], coord[0]] as [number, number]
                    );

                    setSnappedCoords(latLngs);
                    onChange(startLocation, endLocation, latLngs);
                }
            } catch (err) {
                console.warn("[OSRM Snapper] Fallback to direct coordinates:", err);
                if (!isCancelled) {
                    const fallback: [number, number][] = [
                        [startLocation!.lat, startLocation!.lng],
                        [endLocation!.lat, endLocation!.lng],
                    ];
                    setSnappedCoords(fallback);
                    onChange(startLocation, endLocation, fallback);
                }
            } finally {
                if (!isCancelled) {
                    setIsSnapping(false);
                }
            }
        }

        fetchSnappedRoute();

        return () => {
            isCancelled = true;
        };
    }, [startLocation?.lat, startLocation?.lng, endLocation?.lat, endLocation?.lng]);

    const handlePointSelect = (lat: number, lng: number) => {
        if (!startLocation || activeMode === "start") {
            onChange({ lat, lng }, endLocation, null);
            setActiveMode("end");
        } else if (!endLocation || activeMode === "end") {
            onChange(startLocation, { lat, lng }, null);
            setActiveMode("done");
        } else {
            // Both are already set, clicking resets to start
            onChange({ lat, lng }, null, null);
            setActiveMode("end");
        }
    };

    const handleReset = (e: React.MouseEvent) => {
        e.preventDefault();
        onChange(null, null, null);
        setSnappedCoords([]);
        setActiveMode("start");
    };

    // Custom colored div icons
    const startIcon = LInstance ? LInstance.divIcon({
        className: "custom-pin-start",
        html: `<div style="background-color: #16a34a; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 12px; border: 2px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.3);">A</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
    }) : undefined;

    const endIcon = LInstance ? LInstance.divIcon({
        className: "custom-pin-end",
        html: `<div style="background-color: #dc2626; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 12px; border: 2px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.3);">B</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
    }) : undefined;

    const midIcon = LInstance ? LInstance.divIcon({
        className: "custom-pin-closed",
        html: `<div style="background-color: #f59e0b; color: #1e293b; padding: 3px 8px; border-radius: 9999px; font-weight: 800; font-size: 10px; border: 2px solid white; box-shadow: 0 4px 8px rgba(0,0,0,0.3); display: flex; align-items: center; gap: 4px; white-space: nowrap;">⚠️ ROAD CLOSED</div>`,
        iconSize: [90, 24],
        iconAnchor: [45, 12],
    }) : undefined;

    if (!mounted || !LInstance) {
        return (
            <div className="w-full h-80 bg-slate-100 dark:bg-slate-900/50 rounded-2xl flex flex-col items-center justify-center border border-slate-200 dark:border-white/10">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-2" />
                <p className="text-xs text-slate-500 font-semibold">Loading Mapandan Road Map...</p>
            </div>
        );
    }

    const polylinePositions: [number, number][] = (startLocation && endLocation)
        ? [[startLocation.lat, startLocation.lng], [endLocation.lat, endLocation.lng]]
        : [];

    const midPoint: [number, number] | null = (startLocation && endLocation)
        ? [(startLocation.lat + endLocation.lat) / 2, (startLocation.lng + endLocation.lng) / 2]
        : null;

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold">
                    <span className="text-slate-500 font-bold uppercase tracking-wider">
                        Status:
                    </span>
                    {activeMode === "start" && (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                            Click Road Start (Point A)
                        </span>
                    )}
                    {activeMode === "end" && (
                        <span className="text-rose-600 dark:text-rose-400 font-bold">
                            Click Road End (Point B)
                        </span>
                    )}
                    {activeMode === "done" && (
                        <span className="text-amber-600 dark:text-amber-400 font-bold">
                            Road Segment Selected
                        </span>
                    )}
                </div>

                {(startLocation || endLocation) && (
                    <button
                        type="button"
                        onClick={handleReset}
                        className="text-xs text-rose-500 hover:text-rose-600 flex items-center gap-1 font-semibold hover:underline"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Reset Pins
                    </button>
                )}
            </div>

            <div className="relative w-full h-[440px] rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 shadow-inner z-0">
                <MapContainer
                    center={startLocation ? [startLocation.lat, startLocation.lng] : MAPANDAN_CENTER}
                    zoom={14}
                    style={{ width: "100%", height: "100%" }}
                    className="z-0"
                >
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    />

                    <MapEventListener
                        onPointSelect={handlePointSelect}
                    />

                    {startLocation && startIcon && (
                        <Marker
                            position={[startLocation.lat, startLocation.lng]}
                            icon={startIcon}
                            draggable={true}
                            eventHandlers={{
                                dragend: (e: any) => {
                                    const pos = e.target.getLatLng();
                                    onChange({ lat: pos.lat, lng: pos.lng }, endLocation);
                                },
                            }}
                        >
                            <Tooltip permanent direction="top" offset={[0, -10]}>
                                <span className="font-bold text-xs">Start (Point A)</span>
                            </Tooltip>
                        </Marker>
                    )}

                    {endLocation && endIcon && (
                        <Marker
                            position={[endLocation.lat, endLocation.lng]}
                            icon={endIcon}
                            draggable={true}
                            eventHandlers={{
                                dragend: (e: any) => {
                                    const pos = e.target.getLatLng();
                                    onChange(startLocation, { lat: pos.lat, lng: pos.lng });
                                },
                            }}
                        >
                            <Tooltip permanent direction="top" offset={[0, -10]}>
                                <span className="font-bold text-xs">End (Point B)</span>
                            </Tooltip>
                        </Marker>
                    )}

                    {((snappedCoords && snappedCoords.length > 0) || polylinePositions.length === 2) && (
                        <>
                            {/* Outer Glow / Striped Hazard line */}
                            <Polyline
                                positions={snappedCoords.length > 0 ? snappedCoords : polylinePositions}
                                pathOptions={{
                                    color: "#ef4444",
                                    weight: 8,
                                    opacity: 0.85,
                                    dashArray: "10, 10",
                                }}
                            />
                            {/* Inner Solid Warning Line */}
                            <Polyline
                                positions={snappedCoords.length > 0 ? snappedCoords : polylinePositions}
                                pathOptions={{
                                    color: "#b91c1c",
                                    weight: 4,
                                    opacity: 1,
                                }}
                            />
                        </>
                    )}

                    {midPoint && midIcon && (
                        <Marker position={midPoint} icon={midIcon} />
                    )}
                </MapContainer>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono px-1">
                <div>
                    <span className="font-bold text-slate-700 dark:text-slate-300">Point A: </span>
                    {startLocation ? `${startLocation.lat.toFixed(5)}, ${startLocation.lng.toFixed(5)}` : "Not set"}
                </div>
                <div>
                    <span className="font-bold text-slate-700 dark:text-slate-300">Point B: </span>
                    {endLocation ? `${endLocation.lat.toFixed(5)}, ${endLocation.lng.toFixed(5)}` : "Not set"}
                </div>
            </div>
        </div>
    );
}
