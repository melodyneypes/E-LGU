"use client";

import { useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import { MapPin, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { lguMapCenter } from "@/lib/utils/lgu";

interface LocationPickerInnerProps {
    initialLat?: number;
    initialLng?: number;
    onSelect: (lat: number, lng: number) => void;
    onClose: () => void;
}

// Fix standard Leaflet markers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function LocationMarker({ position, setPosition }: { position: [number, number], setPosition: (pos: [number, number]) => void }) {
    useMapEvents({
        click(e) {
            setPosition([e.latlng.lat, e.latlng.lng]);
        },
    });

    return <Marker position={position} />;
}

export default function LocationPickerInner({ initialLat, initialLng, onSelect, onClose }: LocationPickerInnerProps) {
    const [position, setPosition] = useState<[number, number]>([initialLat ?? lguMapCenter[0], initialLng ?? lguMapCenter[1]]);

    return (
        <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
            <div className="relative rounded-2xl overflow-hidden border-2 border-slate-200 dark:border-[#2a3040] shadow-inner">
                <MapContainer
                    center={position}
                    zoom={15}
                    style={{ height: "400px", width: "100%", zIndex: 1 }}
                    scrollWheelZoom={true}
                >
                    <TileLayer
                        attribution="Tiles &copy; Esri"
                        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                    />
                    
                    <LocationMarker position={position} setPosition={setPosition} />
                </MapContainer>

                <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
                    <div className="bg-white/90 dark:bg-[#0f1117]/90 backdrop-blur-md p-3 rounded-xl shadow-xl border border-white/20">
                        <p className="text-[10px] font-black uppercase text-primary tracking-widest mb-1">Current Focus</p>
                        <div className="font-mono text-[10px] text-slate-600 dark:text-slate-400">
                            Lat: {position[0].toFixed(6)}<br/>
                            Lng: {position[1].toFixed(6)}
                        </div>
                    </div>
                </div>

                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] w-full px-8">
                   <div className="bg-primary/90 backdrop-blur-md text-white px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-2xl border border-white/20">
                      <MapPin className="w-3 h-3" /> Click anywhere on map to reposition pin
                   </div>
                </div>
            </div>

            <div className="flex gap-3">
                <Button 
                    variant="outline" 
                    onClick={onClose}
                    className="flex-1 h-12 rounded-xl border-slate-200 dark:border-[#2a3040] font-black uppercase tracking-widest text-xs"
                >
                    Cancel
                </Button>
                <Button 
                    onClick={() => onSelect(position[0], position[1])}
                    className="flex-1 h-12 rounded-xl bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest text-xs shadow-lg shadow-primary/20 gap-2"
                >
                    <CheckCircle2 className="w-4 h-4" /> Confirm Location
                </Button>
            </div>
        </div>
    );
}
