"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap, LayersControl } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// --- BEST PRACTICE: LEAFLET ICON FIX ---
// Standard Leaflet markers sometimes break in Next.js builds.
// We use CDNs for the icons to ensure they always load correctly!
// @ts-expect-error: Bypassing Leaflet's missing _getIconUrl property for custom icon fixes
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface LocationPickerProps {
    lat: number | null;
    lng: number | null;
    onChange: (lat: number, lng: number) => void;
}

const DEFAULT_CENTER: [number, number] = [16.0287, 120.4022]; // Mapandan, Pangasinan

function LocationMarker({ lat, lng, onChange }: LocationPickerProps) {
    const map = useMap();

    // If coordinates are updated from parent, center the map there
    useEffect(() => {
        if (lat && lng && map) {
            const center = map.getCenter();
            const threshold = 0.0001; // approximately 11 meters
            if (Math.abs(center.lat - lat) > threshold || Math.abs(center.lng - lng) > threshold) {
                map.setView([lat, lng], map.getZoom());
            }
        }
    }, [lat, lng, map]);

    useMapEvents({
        click(e) {
            onChange(e.latlng.lat, e.latlng.lng);
        },
    });

    return lat && lng ? (
        <Marker 
            position={[lat, lng]} 
            draggable={true}
            eventHandlers={{
                dragend: (e) => {
                    const marker = e.target;
                    const position = marker.getLatLng();
                    onChange(position.lat, position.lng);
                }
            }}
        />
    ) : null;
}

export default function LocationPicker({ lat, lng, onChange }: LocationPickerProps) {
    const initialCenter = lat && lng ? [lat, lng] : DEFAULT_CENTER;

    return (
        <div className="h-[350px] w-full rounded-3xl overflow-hidden border-2 border-slate-100 dark:border-white/10 shadow-lg z-0 relative group">
            <MapContainer
                center={initialCenter as [number, number]}
                zoom={lat && lng ? 17 : 14}
                className="h-full w-full"
                scrollWheelZoom={true}
            >
                <LayersControl position="topright">
                    <LayersControl.BaseLayer checked name="Street View">
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                    </LayersControl.BaseLayer>
                    <LayersControl.BaseLayer name="Satellite View">
                        <TileLayer
                            attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EBP, and the GIS User Community'
                            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                        />
                    </LayersControl.BaseLayer>
                </LayersControl>
                <LocationMarker lat={lat} lng={lng} onChange={onChange} />
            </MapContainer>
        </div>
    );
}
