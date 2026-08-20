"use client";

import dynamic from "next/dynamic";
import { Activity } from "lucide-react";

const Map = dynamic(() => import("./PosoTicketMap"), { 
    ssr: false,
    loading: () => (
        <div className="w-full h-full min-h-[260px] sm:min-h-[300px] md:min-h-[340px] bg-slate-100 dark:bg-white/5 rounded-2xl flex flex-col items-center justify-center gap-3 animate-pulse border border-slate-200 dark:border-white/10">
            <Activity className="w-6 h-6 text-rose-500 animate-spin" />
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Rendering GPS Map...</p>
        </div>
    )
});

export default function PosoTicketMapWrapper({ 
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
    return (
        <Map 
            lat={lat} 
            lng={lng} 
            locationName={locationName} 
            violatorName={violatorName} 
            ticketNo={ticketNo} 
            themeColor={themeColor} 
        />
    );
}
