"use client";

import React, { useEffect, useState } from "react";
import * as turf from "@turf/turf";
import { toast } from "sonner";
import { MapPin, RotateCw } from "lucide-react";
import { Map, MapMarker, useMap } from "@/components/ui/map";

interface GeoJSONFeature {
    type: "Feature";
    geometry: GeoJSON.Geometry | null;
    properties?: Record<string, unknown> | null;
}

const MAPANDAN_CENTER: [number, number] = [120.4500, 16.0333]; // [longitude, latitude] for MapLibre

// Sub-component to manage layers, fit bounds, and controls using the map context
function MapContent({
    boundaryGeoJson,
    maskedGeoJson,
    userPosition,
    setUserPosition
}: {
    boundaryGeoJson: GeoJSONFeature | null;
    maskedGeoJson: GeoJSONFeature | null;
    userPosition: [number, number] | null;
    setUserPosition: (pos: [number, number]) => void;
}) {
    const { map, isLoaded } = useMap();
    const [locating, setLocating] = useState(false);

    // Auto-fit bounds when boundary is loaded
    useEffect(() => {
        if (!map || !isLoaded || !boundaryGeoJson) return;

        try {
            const bbox = turf.bbox(boundaryGeoJson as any);
            // MapLibre expects [minLng, minLat, maxLng, maxLat]
            map.fitBounds([bbox[0], bbox[1], bbox[2], bbox[3]], {
                padding: 40,
                duration: 1000
            });
        } catch (e) {
            console.error("Error fitting bounds", e);
        }
    }, [map, isLoaded, boundaryGeoJson]);

    // Manage boundary and mask layers dynamically
    useEffect(() => {
        if (!map || !isLoaded) return;

        const addLayers = () => {
            // Mask layer setup
            if (maskedGeoJson) {
                if (map.getSource("mask")) {
                    (map.getSource("mask") as any).setData(maskedGeoJson);
                } else {
                    map.addSource("mask", {
                        type: "geojson",
                        data: maskedGeoJson as any
                    });
                    map.addLayer({
                        id: "mask-layer",
                        type: "fill",
                        source: "mask",
                        paint: {
                            "fill-color": "#000000",
                            "fill-opacity": 0.45
                        }
                    });
                }
            }

            // Boundary line setup
            if (boundaryGeoJson) {
                if (map.getSource("boundary")) {
                    (map.getSource("boundary") as any).setData(boundaryGeoJson);
                } else {
                    map.addSource("boundary", {
                        type: "geojson",
                        data: boundaryGeoJson as any
                    });
                    
                    // Fill Layer for inner color
                    map.addLayer({
                        id: "boundary-fill",
                        type: "fill",
                        source: "boundary",
                        paint: {
                            "fill-color": "#1e40af",
                            "fill-opacity": 0.15
                        }
                    });

                    // Stroke/Border Layer
                    map.addLayer({
                        id: "boundary-stroke",
                        type: "line",
                        source: "boundary",
                        paint: {
                            "line-color": "#3b82f6",
                            "line-width": 3,
                            "line-dasharray": [2, 2]
                        }
                    });
                }
            }
        };

        if (map.isStyleLoaded()) {
            addLayers();
        } else {
            map.once("styledata", addLayers);
        }

        return () => {
            if (map && (map as any).style) {
                try {
                    if (map.getLayer("boundary-stroke")) map.removeLayer("boundary-stroke");
                    if (map.getLayer("boundary-fill")) map.removeLayer("boundary-fill");
                    if (map.getSource("boundary")) map.removeSource("boundary");
                    if (map.getLayer("mask-layer")) map.removeLayer("mask-layer");
                    if (map.getSource("mask")) map.removeSource("mask");
                } catch (e) {
                    console.warn("Map cleanup skipped:", e);
                }
            }
        };
    }, [map, isLoaded, boundaryGeoJson, maskedGeoJson]);

    const locateMe = () => {
        if (!map) return;
        setLocating(true);

        const options = { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 };

        const onSuccess = (position: GeolocationPosition) => {
            const { longitude, latitude } = position.coords;
            setUserPosition([longitude, latitude]);
            map.flyTo({
                center: [longitude, latitude],
                zoom: 15,
                essential: true
            });
            toast.success("Location found!");
            setLocating(false);
        };

        const onError = (error: GeolocationPositionError) => {
            console.warn(`Primary geolocation failed (Code ${error.code}): ${error.message}. Retrying with low accuracy...`);
            
            // Fallback to low accuracy
            navigator.geolocation.getCurrentPosition(
                onSuccess,
                (err2) => {
                    console.error("Secondary geolocation failed:", err2.message);
                    let readableMessage = "Please allow location access in your browser settings.";
                    if (err2.code === err2.TIMEOUT) {
                        readableMessage = "Request timed out. Please check your GPS signal.";
                    } else if (err2.code === err2.POSITION_UNAVAILABLE) {
                        readableMessage = "Location information is unavailable.";
                    }
                    toast.error(readableMessage);
                    setLocating(false);
                },
                { enableHighAccuracy: false, timeout: 15000 }
            );
        };

        navigator.geolocation.getCurrentPosition(onSuccess, onError, options);
    };

    return (
        <>
            {/* Geolocation Button overlay */}
            <div className="absolute top-6 right-6 z-10">
                <button
                    onClick={locateMe}
                    disabled={locating}
                    className="p-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 hover:scale-110 active:scale-95 transition-all text-blue-600 group disabled:opacity-50"
                    title="Locate me & show pin"
                >
                    {locating ? (
                        <RotateCw className="w-5 h-5 animate-spin text-blue-600" />
                    ) : (
                        <MapPin className="w-5 h-5 group-hover:scale-125 transition-transform" />
                    )}
                </button>
            </div>

            {/* Custom Pulsing User Marker */}
            {userPosition && (
                <MapMarker longitude={userPosition[0]} latitude={userPosition[1]}>
                    <div className="relative flex items-center justify-center cursor-pointer">
                        <div className="absolute w-8 h-8 bg-blue-500/40 rounded-full animate-ping"></div>
                        <div className="relative w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-[0_0_10px_rgba(37,99,235,0.8)]"></div>
                    </div>
                </MapMarker>
            )}
        </>
    );
}

export default function MapandanMap() {
    const [boundaryGeoJson, setBoundaryGeoJson] = useState<GeoJSONFeature | null>(null);
    const [maskedGeoJson, setMaskedGeoJson] = useState<GeoJSONFeature | null>(null);
    const [userPosition, setUserPosition] = useState<[number, number] | null>(null); // [longitude, latitude]

    useEffect(() => {
        const fetchRealBoundary = async () => {
            try {
                const response = await fetch(
                    "https://nominatim.openstreetmap.org/search?q=Mapandan,Pangasinan,Philippines&polygon_geojson=1&format=json"
                );
                const data = await response.json();

                if (data && data.length > 0) {
                    const geojson = data[0].geojson;
                    setBoundaryGeoJson(geojson);

                    try {
                        const feature = turf.feature(geojson);
                        const mask = turf.mask(feature as any);
                        setMaskedGeoJson(mask);
                    } catch (e) {
                        console.error("Turf masking error", e);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch Mapandan borders", error);
            }
        };

        fetchRealBoundary();
    }, []);

    return (
        <div className="w-full h-full relative z-0">
            <Map
                center={MAPANDAN_CENTER}
                zoom={12.5}
                className="w-full h-full rounded-3xl"
            >
                <MapContent
                    boundaryGeoJson={boundaryGeoJson}
                    maskedGeoJson={maskedGeoJson}
                    userPosition={userPosition}
                    setUserPosition={setUserPosition}
                />
            </Map>
        </div>
    );
}
