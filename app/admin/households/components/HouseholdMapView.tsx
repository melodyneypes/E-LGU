"use client";

import { useEffect, useState } from "react";
import { useHousehold } from "../providers/HouseholdProvider";
import dynamic from "next/dynamic";
import { Loader2, Users, AlertTriangle, Phone, ShieldCheck } from "lucide-react";

// Import react-leaflet dynamically to prevent SSR issues with the global window object
const MapContainer = dynamic(() => import("react-leaflet").then(mod => mod.MapContainer), { ssr: false, loading: () => <MapLoading /> });
const TileLayer = dynamic(() => import("react-leaflet").then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then(mod => mod.Popup), { ssr: false });
const MapClickTracker = dynamic(() => import("./MapClickTracker"), { ssr: false });
const MarkerClusterGroup = dynamic(() => import("react-leaflet-cluster"), { ssr: false });


function MapLoading() {
    return (
        <div className="w-full h-[600px] bg-slate-100 dark:bg-[#151b2b] rounded-2xl flex flex-col items-center justify-center border border-slate-200 dark:border-[#2a3040]">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
            <p className="text-slate-500 font-medium">Loading Map...</p>
        </div>
    );
}

export function HouseholdMapView() {
    const { households, searchQuery, selectedBarangay, selectedRiskLevel, viewMode } = useHousehold();
    const [mounted, setMounted] = useState(false);
    const [safeIcon, setSafeIcon] = useState<any>(null);
    const [riskIcon, setRiskIcon] = useState<any>(null);

    useEffect(() => {
        // Fetch Mapandan Border GeoJSON
        fetch('/mapandan-border.json')
            .then(res => res.json())
            .catch(err => console.error("Failed to load Mapandan border:", err));

        // We only require leaflet dynamically on the client side
        import("leaflet").then(L => {
            // Fix default icon path issues
            delete (L.Icon.Default.prototype as any)._getIconUrl;
            L.Icon.Default.mergeOptions({
                iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
                iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
                shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
            });

            // Create custom icons based on risk level
            const safe = new L.Icon({
                iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
                shadowUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-shadow.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowSize: [41, 41]
            });

            const risk = new L.Icon({
                iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
                shadowUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-shadow.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowSize: [41, 41]
            });

            setSafeIcon(safe);
            setRiskIcon(risk);
            setMounted(true);
        });
    }, []);

    // Do not render map if in list view or if not mounted (SSR check)
    if (!mounted || !safeIcon || !riskIcon || viewMode === "list") return <MapLoading />;

    // Filter logic: Only include households with valid coordinates for map plotting
    const filteredHouseholds = households.filter((h) => {
        const headStr = h.headOfFamily || "";
        const barangayStr = h.barangay || "";
        const matchesSearch = headStr.toLowerCase().includes(searchQuery.toLowerCase()) ||
            barangayStr.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesBarangay = selectedBarangay === "All" || h.barangay === selectedBarangay;
        const matchesRisk = selectedRiskLevel === "All" || h.riskLevel === selectedRiskLevel;
        const hasCoords = h.latitude !== null && h.longitude !== null;
        return matchesSearch && matchesBarangay && matchesRisk && hasCoords;
    });
 
    // Default center to Mapandan, Pangasinan if no data
    const centerLat = filteredHouseholds.length > 0 && filteredHouseholds[0].latitude !== null ? filteredHouseholds[0].latitude : 16.0264;
    const centerLng = filteredHouseholds.length > 0 && filteredHouseholds[0].longitude !== null ? filteredHouseholds[0].longitude : 120.4537;

    return (
        <div className="w-full bg-white dark:bg-[#151b2b] p-4 rounded-2xl border border-slate-200 dark:border-[#2a3040] shadow-sm relative z-0">
            {/* Adding leaflet and marker cluster CSS dynamically */}
            <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
            <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.4.1/dist/MarkerCluster.css" />
            <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.4.1/dist/MarkerCluster.Default.css" />

            {/* Custom styling override for marker clusters to match premium design system */}
            <style>{`
                .marker-cluster-small {
                    background-color: rgba(37, 99, 235, 0.2) !important;
                }
                .marker-cluster-small div {
                    background-color: rgba(37, 99, 235, 0.85) !important;
                    color: white !important;
                    font-weight: 800 !important;
                }
                .marker-cluster-medium {
                    background-color: rgba(59, 130, 246, 0.2) !important;
                }
                .marker-cluster-medium div {
                    background-color: rgba(59, 130, 246, 0.85) !important;
                    color: white !important;
                    font-weight: 800 !important;
                }
                .marker-cluster-large {
                    background-color: rgba(29, 78, 216, 0.2) !important;
                }
                .marker-cluster-large div {
                    background-color: rgba(29, 78, 216, 0.95) !important;
                    color: white !important;
                    font-weight: 800 !important;
                }
                .marker-cluster div {
                    text-align: center;
                    border-radius: 15px;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
                    font-family: inherit !important;
                }
            `}</style>

            <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-[#2a3040]">
                <MapContainer
                    center={[centerLat, centerLng] as [number, number]}
                    zoom={13}
                    style={{ height: '600px', width: '100%', zIndex: 0 }}
                >
                    <TileLayer
                        attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
                        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                    />

                    <MapClickTracker />

                    <MarkerClusterGroup
                        chunkedLoading
                        polygonOptions={{
                            fillColor: '#3b82f6',
                            color: '#3b82f6',
                            weight: 1,
                            opacity: 1,
                            fillOpacity: 0.1,
                        }}
                        maxClusterRadius={60}
                    >
                        {filteredHouseholds.map((h) => {
                            const isRisk = ["High Risk", "Flood Prone", "Landslide Prone"].includes(h.riskLevel);
                            const iconToUse = isRisk ? riskIcon : safeIcon;

                            return (
                                <Marker
                                    key={h.id}
                                    position={[h.latitude as number, h.longitude as number]}
                                    icon={iconToUse}
                                >
                                    <Popup className="custom-popup">
                                        <div className="p-1 min-w-[200px]">
                                            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100">
                                                {isRisk ? (
                                                    <AlertTriangle className="w-4 h-4 text-red-500" />
                                                ) : (
                                                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                                                )}
                                                <h3 className="font-bold text-slate-800 m-0">{h.headOfFamily}</h3>
                                            </div>

                                            <div className="space-y-1.5 text-sm mb-3">
                                                <div className="flex justify-between">
                                                    <span className="text-slate-500">Barangay:</span>
                                                    <span className="font-semibold text-slate-700">{h.barangay}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-slate-500">Household:</span>
                                                    <span className="font-semibold text-slate-700 flex items-center bg-slate-100 px-2 rounded-md">
                                                        <Users className="w-3 h-3 mr-1" /> {h.householdSize}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-slate-500">Risk Level:</span>
                                                    <span className={`font-semibold ${isRisk ? 'text-red-600' : 'text-emerald-600'}`}>{h.riskLevel}</span>
                                                </div>
                                                {h.contactNumber && (
                                                    <div className="flex justify-between items-center pt-1 border-t border-slate-100 mt-1">
                                                        <span className="text-slate-500"><Phone className="w-3 h-3" /></span>
                                                        <span className="font-semibold text-slate-700">{h.contactNumber}</span>
                                                    </div>
                                                )}
                                            </div>

                                            {h.specialSectors && (
                                                <div className="bg-purple-50 text-purple-700 text-xs px-2 py-1 rounded border border-purple-100 mb-2">
                                                    <strong>Notes:</strong> {h.specialSectors}
                                                </div>
                                            )}
                                        </div>
                                    </Popup>
                                </Marker>
                            );
                        })}
                    </MarkerClusterGroup>
                </MapContainer>
            </div>

            <div className="mt-4 flex gap-4 text-sm bg-slate-50 dark:bg-[#1a1f2e] p-3 rounded-xl border border-slate-100 dark:border-[#2a3040]">
                <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-blue-500 mr-2 shadow-sm"></div>
                    <span className="font-medium text-slate-600 dark:text-slate-300">Safe / Low Risk</span>
                </div>
                <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-red-500 mr-2 shadow-sm"></div>
                    <span className="font-medium text-slate-600 dark:text-slate-300">High Risk / Hazard Prone</span>
                </div>
            </div>
        </div>
    );
}
