"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap, LayersControl, GeoJSON } from "react-leaflet";
import { toast } from "sonner";
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

const DEFAULT_CENTER: [number, number] = [16.0250, 120.4450]; // Mapandan Town Center, Pangasinan

// Point-in-polygon check for Mapandan boundary coordinates [lng, lat]
function isPointInPolygon(pointLat: number, pointLng: number, vs: number[][]) {
    const x = pointLng, y = pointLat;
    let inside = false;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        const xi = vs[i][0], yi = vs[i][1];
        const xj = vs[j][0], yj = vs[j][1];
        const intersect = ((yi > y) !== (yj > y)) &&
            (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

function LocationMarker({ lat, lng, onChange, borderPolygon }: LocationPickerProps & { borderPolygon: number[][] | null }) {
    const map = useMap();

    // Auto-snap initial pin to Poblacion Mapandan if current pin is outside boundary
    useEffect(() => {
        if (lat && lng && borderPolygon && borderPolygon.length > 0) {
            const inside = isPointInPolygon(lat, lng, borderPolygon);
            if (!inside) {
                onChange(16.0250, 120.4450);
            }
        }
    }, [lat, lng, borderPolygon, onChange]);

    // If coordinates are updated from parent, center the map there at zoom 18 for building detail
    useEffect(() => {
        if (lat && lng && map) {
            const center = map.getCenter();
            const threshold = 0.00005;
            if (Math.abs(center.lat - lat) > threshold || Math.abs(center.lng - lng) > threshold || map.getZoom() < 17) {
                map.setView([lat, lng], 18);
            }
        }
    }, [lat, lng, map]);

    const handleCheckAndChange = (targetLat: number, targetLng: number) => {
        if (borderPolygon && borderPolygon.length > 0) {
            const inside = isPointInPolygon(targetLat, targetLng, borderPolygon);
            if (!inside) {
                toast.error("Location outside Mapandan! Please pin a location inside Mapandan municipal boundary only.");
                return;
            }
        }
        onChange(targetLat, targetLng);
    };

    useMapEvents({
        click(e) {
            handleCheckAndChange(e.latlng.lat, e.latlng.lng);
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
                    handleCheckAndChange(position.lat, position.lng);
                }
            }}
        />
    ) : null;
}

export default function LocationPicker({ lat, lng, onChange }: LocationPickerProps) {
    const initialCenter = lat && lng ? [lat, lng] : DEFAULT_CENTER;
    const [geoJsonData, setGeoJsonData] = useState<any>(null);
    const [borderPolygon, setBorderPolygon] = useState<number[][] | null>(null);

    useEffect(() => {
        const fetchBoundary = async () => {
            try {
                const res = await fetch(
                    "https://nominatim.openstreetmap.org/search?q=Mapandan,Pangasinan,Philippines&polygon_geojson=1&format=json"
                );
                const data = await res.json();
                if (data && data.length > 0 && data[0].geojson) {
                    const geojson = data[0].geojson;
                    const featureCollection = {
                        type: "FeatureCollection",
                        features: [
                            {
                                type: "Feature",
                                properties: { name: "Mapandan Municipality" },
                                geometry: geojson
                            }
                        ]
                    };
                    setGeoJsonData(featureCollection);
                    const ring = geojson.type === "Polygon" ? geojson.coordinates[0] : geojson.coordinates[0]?.[0];
                    if (Array.isArray(ring)) {
                        setBorderPolygon(ring);
                    }
                    return;
                }
            } catch (err) {
                console.warn("Failed to fetch official Nominatim boundary, using fallback local GeoJSON:", err);
            }

            try {
                const res = await fetch("/mapandan-border.json");
                const data = await res.json();
                setGeoJsonData(data);
                const coords = data?.features?.[0]?.geometry?.coordinates?.[0];
                if (Array.isArray(coords)) {
                    setBorderPolygon(coords);
                }
            } catch (err) {
                console.error("Failed to load local mapandan-border.json:", err);
            }
        };

        fetchBoundary();
    }, []);

    return (
        <div className="h-full w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 shadow-lg z-0 relative group">
            <MapContainer
                center={initialCenter as [number, number]}
                zoom={lat && lng ? 18 : 15}
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

                {/* Broken / Dashed Line Marking Mapandan Municipal Boundary */}
                {geoJsonData && (
                    <GeoJSON
                        data={geoJsonData}
                        style={{
                            color: "#e11d48",
                            weight: 2.5,
                            dashArray: "6, 8",
                            fillColor: "#f43f5e",
                            fillOpacity: 0.1
                        }}
                    />
                )}

                <LocationMarker lat={lat} lng={lng} onChange={onChange} borderPolygon={borderPolygon} />
            </MapContainer>
        </div>
    );
}
