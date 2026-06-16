"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

interface LocationPickerProps {
    initialLat?: number;
    initialLng?: number;
    value?: { lat: number; lng: number } | null;
    onSelect: (lat: number, lng: number) => void;
    onClose?: () => void;
    title?: string;
    compact?: boolean;
}

function MapLoading() {
    return (
        <div className="w-full h-[350px] bg-slate-100 dark:bg-slate-900 rounded-2xl flex flex-col items-center justify-center border border-slate-200 dark:border-white/10">
            <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
            <p className="text-slate-500 font-medium">Loading Picker Map...</p>
        </div>
    );
}

// Dynamically import the real Leaflet component, turning off SSR
const LocationPickerInner = dynamic(
    () => import("./LocationPickerInner"),
    {
        ssr: false,
        loading: () => <MapLoading />
    }
);

export default function LocationPicker(props: LocationPickerProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return <MapLoading />;

    return <LocationPickerInner {...props} />;
}
