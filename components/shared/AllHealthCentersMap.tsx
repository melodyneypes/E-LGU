"use client";

import React, { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Building2, MapPin, CheckCircle2 } from "lucide-react";
import { renderToString } from "react-dom/server";
import { lguMapCenter } from "@/lib/utils/lgu";

interface CenterItem {
    id: string;
    name: string;
    location?: string;
    latitude?: number;
    longitude?: number;
    barangay?: string;
}

interface AllHealthCentersMapProps {
    centers: CenterItem[];
    selectedCenterId: string;
    onSelectCenter: (id: string) => void;
}

const getCenterIcon = (isSelected: boolean, centerName: string) => {
    return L.divIcon({
        className: `custom-center-marker-${isSelected ? "selected" : "normal"}`,
        html: renderToString(
            <div className="relative flex items-center justify-center cursor-pointer group">
                {isSelected && (
                    <div className="absolute w-12 h-12 bg-rose-500/30 rounded-full animate-ping" />
                )}
                <div
                    className={`relative px-3 py-1.5 rounded-2xl flex items-center gap-1.5 text-white font-black text-xs shadow-xl border-2 transition-all transform group-hover:scale-110 ${
                        isSelected
                            ? "bg-rose-600 border-white shadow-rose-600/50 scale-110 z-50"
                            : "bg-slate-900 dark:bg-slate-800 border-slate-700 hover:bg-rose-600 hover:border-white"
                    }`}
                >
                    <Building2 className={`w-3.5 h-3.5 ${isSelected ? "text-white" : "text-rose-400"}`} />
                    <span className="truncate max-w-[110px]">{centerName.replace(/Rural Health Unit|Main|Health Center|\(RHU\)/gi, "").trim() || centerName}</span>
                </div>
            </div>
        ),
        iconSize: [120, 36],
        iconAnchor: [60, 18],
    });
};

function ChangeView({ center }: { center: [number, number] }) {
    const map = useMap();
    useEffect(() => {
        map.setView(center, 14);
    }, [center, map]);
    return null;
}

export default function AllHealthCentersMap({ centers, selectedCenterId, onSelectCenter }: AllHealthCentersMapProps) {
    const processedCenters = centers.map((center) => {
        const lat = center.latitude ?? lguMapCenter[0];
        const lng = center.longitude ?? lguMapCenter[1];

        return {
            ...center,
            lat,
            lng
        };
    });

    const activeCenter = processedCenters.find((c) => c.id === selectedCenterId) || processedCenters[0] || {
        id: "main-rhu",
        name: "Main Rural Health Unit (RHU)",
        lat: lguMapCenter[0],
        lng: lguMapCenter[1]
    };

    const activePosition: [number, number] = [activeCenter.lat, activeCenter.lng];

    return (
        <div className="w-full h-[280px] md:h-[320px] rounded-2xl overflow-hidden relative border border-slate-800 shadow-2xl">
            <MapContainer
                center={activePosition}
                zoom={14}
                scrollWheelZoom={false}
                zoomControl={true}
                className="w-full h-full z-0"
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {processedCenters.map((center) => {
                    const isSelected = center.id === selectedCenterId;
                    const pos: [number, number] = [center.lat, center.lng];

                    return (
                        <Marker
                            key={center.id}
                            position={pos}
                            icon={getCenterIcon(isSelected, center.name)}
                            eventHandlers={{
                                click: () => onSelectCenter(center.id)
                            }}
                        >
                            <Popup className="custom-popup">
                                <div className="p-2 space-y-2 text-center min-w-[160px]">
                                    <div className="space-y-0.5">
                                        <p className="text-xs font-black uppercase text-slate-900 italic leading-tight">{center.name}</p>
                                        <p className="text-[9px] text-slate-500 font-semibold">{center.location || "Municipality of E-LGU"}</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => onSelectCenter(center.id)}
                                        className={`w-full py-1.5 px-3 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                                            isSelected
                                                ? "bg-rose-600 text-white shadow-md"
                                                : "bg-slate-900 text-white hover:bg-rose-600"
                                        }`}
                                    >
                                        {isSelected ? <CheckCircle2 className="w-3 h-3 text-white" /> : <MapPin className="w-3 h-3 text-rose-400" />}
                                        <span>{isSelected ? "Selected Facility" : "Select Facility"}</span>
                                    </button>
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}

                <ChangeView center={activePosition} />
            </MapContainer>

            <div className="absolute bottom-3 left-3 z-[1000] px-3 py-1.5 bg-slate-900/90 backdrop-blur-md rounded-xl border border-white/10 shadow-lg pointer-events-none">
                <p className="text-[8.5px] font-black uppercase tracking-widest text-slate-300 italic flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" /> Municipal Health Centers ({processedCenters.length} Locations)
                </p>
            </div>
        </div>
    );
}
