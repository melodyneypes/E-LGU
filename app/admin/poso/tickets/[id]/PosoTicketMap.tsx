"use client";

import React, { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin } from "lucide-react";
import { renderToString } from "react-dom/server";

const createViolationIcon = (themeColor?: string) => {
    const color = themeColor || "#f43f5e";
    return L.divIcon({
        className: "custom-poso-marker",
        html: renderToString(
            <div className="relative flex flex-col items-center justify-center -translate-y-full">
                <MapPin 
                    className="w-9 h-9 drop-shadow-[0_4px_6px_rgba(0,0,0,0.3)] filter" 
                    style={{ color: color, fill: color }}
                />
            </div>
        ),
        iconSize: [36, 36],
        iconAnchor: [18, 36],
    });
};

function ChangeView({ center }: { center: [number, number] }) {
    const map = useMap();
    useEffect(() => {
        map.setView(center, 16);
        // Ensure tile container invalidates and adapts cleanly on render/resize
        const timeout = setTimeout(() => {
            map.invalidateSize();
        }, 200);
        return () => clearTimeout(timeout);
    }, [center, map]);
    return null;
}

export default function PosoTicketMap({ 
    lat, 
    lng, 
    locationName,
    violatorName,
    ticketNo,
    themeColor 
}: { 
    lat: number; 
    lng: number; 
    locationName?: string;
    violatorName?: string;
    ticketNo?: string;
    themeColor?: string;
}) {
    const position: [number, number] = [lat, lng];
    const markerIcon = createViolationIcon(themeColor);

    return (
        <div className="w-full h-full min-h-[260px] sm:min-h-[300px] md:min-h-[340px] rounded-2xl overflow-hidden relative border border-slate-200 dark:border-white/10 shadow-inner group">
            <MapContainer 
                center={position} 
                zoom={16} 
                scrollWheelZoom={false}
                zoomControl={true}
                className="w-full h-full min-h-[260px] sm:min-h-[300px] md:min-h-[340px] z-0"
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={position} icon={markerIcon}>
                    <Popup className="custom-popup">
                        <div className="p-1.5 space-y-1">
                            <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest leading-tight">
                                Citation #{ticketNo || "N/A"}
                            </p>
                            {violatorName && (
                                <p className="text-xs font-bold text-slate-800 uppercase">
                                    {violatorName}
                                </p>
                            )}
                            {locationName && (
                                <p className="text-[10px] font-semibold text-slate-600">
                                    {locationName}
                                </p>
                            )}
                        </div>
                    </Popup>
                </Marker>
                <ChangeView center={position} />
            </MapContainer>
        </div>
    );
}
