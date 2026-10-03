"use client";

import React, { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Building2 } from "lucide-react";
import { renderToString } from "react-dom/server";
import { lguMapCenter } from "@/lib/utils/lgu";

const healthCenterIcon = L.divIcon({
    className: "custom-health-marker",
    html: renderToString(
        <div className="relative flex items-center justify-center">
            <div className="absolute w-12 h-12 bg-rose-500/30 rounded-full animate-ping" />
            <div className="relative w-10 h-10 bg-rose-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-rose-600/40 border-2 border-white">
                <Building2 className="w-5 h-5" />
            </div>
        </div>
    ),
    iconSize: [48, 48],
    iconAnchor: [24, 24],
});

function ChangeView({ center }: { center: [number, number] }) {
    const map = useMap();
    useEffect(() => {
        map.setView(center, 15);
    }, [center, map]);
    return null;
}

interface HealthCenterMapProps {
    centerName: string;
    lat?: number;
    lng?: number;
}

export default function HealthCenterMap({ centerName, lat, lng }: HealthCenterMapProps) {
    const finalLat = lat ?? lguMapCenter[0];
    const finalLng = lng ?? lguMapCenter[1];
    const position: [number, number] = [finalLat, finalLng];

    return (
        <div className="w-full h-52 md:h-64 rounded-2xl overflow-hidden relative border border-slate-200 dark:border-white/10 shadow-lg">
            <MapContainer
                center={position}
                zoom={15}
                scrollWheelZoom={false}
                zoomControl={true}
                className="w-full h-full z-0"
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={position} icon={healthCenterIcon}>
                    <Popup className="custom-popup">
                        <div className="p-1 space-y-1">
                            <p className="text-[11px] font-black uppercase tracking-wider text-rose-600 leading-tight">{centerName}</p>
                            <p className="text-[9px] text-slate-500 font-semibold italic">Municipality of E-LGU</p>
                        </div>
                    </Popup>
                </Marker>
                <ChangeView center={position} />
            </MapContainer>

            <div className="absolute bottom-3 left-3 z-[1000] px-3 py-1.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-xl border border-slate-200 dark:border-white/10 shadow-md pointer-events-none">
                <p className="text-[8.5px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 italic flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" /> GIS Interactive Map View
                </p>
            </div>
        </div>
    );
}
