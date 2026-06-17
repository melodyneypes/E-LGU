"use client";

import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, GeoJSON, useMapEvents, useMap } from "react-leaflet";
import { MapPin, CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface GeoJSONData {
    type: "Feature" | "FeatureCollection" | "Point" | "MultiPoint" | "LineString" | "MultiLineString" | "Polygon" | "MultiPolygon" | "GeometryCollection";
    [key: string]: unknown;
}

interface LocationPickerInnerProps {
    initialLat?: number;
    initialLng?: number;
    value?: { lat: number; lng: number } | null;
    onSelect: (lat: number, lng: number) => void;
    onClose?: () => void;
    title?: string;
    compact?: boolean;
}

// Fixed standard Leaflet markers in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function MapResizer() {
    const map = useMap();
    useEffect(() => {
        const timer = setTimeout(() => {
            map.invalidateSize();
        }, 250);
        return () => clearTimeout(timer);
    }, [map]);
    return null;
}

function MapEvents({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
    useMapEvents({
        click(e) {
            onMapClick(e.latlng.lat, e.latlng.lng);
        },
    });
    return null;
}

export default function LocationPickerInner({
    initialLat = 16.1158,
    initialLng = 119.7997,
    value,
    onSelect,
    onClose,
    title = "Select Location",
    compact = false
}: LocationPickerInnerProps) {
    const [position, setPosition] = useState<[number, number] | null>(
        value ? [value.lat, value.lng] : (compact ? null : [initialLat, initialLng])
    );
    const [MapandanBorder, setMapandanBorder] = useState<GeoJSONData | null>(null);

    useEffect(() => {
        fetch("/mapandan-border.json")
            .then(res => res.json())
            .then(data => setMapandanBorder(data))
            .catch(err => console.error("Failed to load map borders:", err));
    }, []);

    // Sync state with parent value (allows clearing)
    useEffect(() => {
        if (value) {
            if (!position || position[0] !== value.lat || position[1] !== value.lng) {
                setPosition([value.lat, value.lng]);
            }
        } else if (value === null) {
            if (position !== null) {
                setPosition(null);
            }
        }
    }, [value, position]);

    // Store the latest onSelect callback in a ref to avoid infinite rendering loops
    // when onSelect is an inline function in the parent.
    const onSelectRef = useRef(onSelect);
    useEffect(() => {
        onSelectRef.current = onSelect;
    }, [onSelect]);

    if (compact) {
        return (
            <div className="relative w-full h-full rounded-2xl overflow-hidden border border-white/10 shadow-2xl [&_.leaflet-control-zoom]:max-md:hidden">
                <MapContainer
                    center={position || [initialLat, initialLng]}
                    zoom={15}
                    style={{ height: "100%", width: "100%", zIndex: 1 }}
                    scrollWheelZoom={true}
                >
                    <TileLayer
                        attribution="Tiles &copy; Esri"
                        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                    />

                    {MapandanBorder && (
                        <GeoJSON
                            data={MapandanBorder}
                            style={{
                                color: "#3b82f6",
                                weight: 2,
                                opacity: 0.6,
                                fillOpacity: 0.05
                            }}
                        />
                    )}

                    <MapEvents onMapClick={(lat, lng) => {
                        setPosition([lat, lng]);
                        if (compact) {
                            onSelectRef.current(lat, lng);
                        }
                    }} />
                    {position && <Marker position={position} />}
                    <MapResizer />
                </MapContainer>

                <div className="absolute top-2 right-2 z-[1000]">
                    <div className="bg-slate-950/80 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10">
                        <div className="font-mono text-[8px] text-slate-400">
                            {position ? `${position[0].toFixed(4)}, ${position[1].toFixed(4)}` : "No pin set"}
                        </div>
                    </div>
                </div>

                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-[1000] w-full px-4 text-center hidden md:block">
                    <div className="bg-primary/95 backdrop-blur-md text-white px-2 py-0.5 rounded-full text-[7px] md:text-[8px] font-black uppercase tracking-widest inline-flex items-center gap-1 border border-white/20 select-none">
                        <MapPin className="w-2 h-2 animate-pulse" /> Click map to pin
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between">
                <h4 className="text-sm font-black uppercase tracking-widest text-white italic">{title}</h4>
                {onClose && (
                    <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-white/10 rounded-full h-8 w-8">
                        <X className="w-4 h-4 text-slate-400" />
                    </Button>
                )}
            </div>

            <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl [&_.leaflet-control-zoom]:max-md:hidden">
                <MapContainer
                    center={position || [initialLat, initialLng]}
                    zoom={15}
                    style={{ height: "350px", width: "100%", zIndex: 1 }}
                    scrollWheelZoom={true}
                >
                    <TileLayer
                        attribution="Tiles &copy; Esri"
                        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                    />

                    {MapandanBorder && (
                        <GeoJSON
                            data={MapandanBorder}
                            style={{
                                color: "#3b82f6",
                                weight: 2,
                                opacity: 0.6,
                                fillOpacity: 0.05
                            }}
                        />
                    )}

                    <MapEvents onMapClick={(lat, lng) => {
                        setPosition([lat, lng]);
                        if (compact) {
                            onSelectRef.current(lat, lng);
                        }
                    }} />
                    {position && <Marker position={position} />}
                    <MapResizer />
                </MapContainer>

                <div className="absolute top-4 right-4 z-[1000]">
                    <div className="bg-slate-950/80 backdrop-blur-md p-2 rounded-lg border border-white/10">
                        <div className="font-mono text-[9px] text-slate-400">
                            {position ? `${position[0].toFixed(6)}, ${position[1].toFixed(6)}` : "No pin set"}
                        </div>
                    </div>
                </div>

                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] w-full px-8 hidden sm:block">
                    <div className="bg-primary/90 backdrop-blur-md text-white px-3 py-1.5 rounded-full text-[7px] sm:text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 border border-white/20">
                        <MapPin className="w-3 h-3" /> Click anywhere on map to reposition pin
                    </div>
                </div>
            </div>

            <div className="flex gap-3">
                <Button
                    onClick={() => position && onSelect(position[0], position[1])}
                    disabled={!position}
                    className="flex-1 py-4 h-auto bg-primary hover:opacity-90 text-white rounded-xl font-black uppercase tracking-widest text-[10px] italic shadow-xl shadow-primary/25 transition-all"
                >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-2" /> Confirm Location
                </Button>
            </div>
        </div>
    );
}
