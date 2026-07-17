"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { MapPin, ChevronDown } from "lucide-react";

interface BarangaySwitcherProps {
    availableBarangays: string[];
    currentBarangay?: string;
    themeColor?: string;
}

export function BarangaySwitcher({ availableBarangays = [], currentBarangay, themeColor = "#2563eb" }: BarangaySwitcherProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const onSelect = (barangay: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (barangay) {
            params.set("barangay", barangay);
        } else {
            params.delete("barangay");
        }
        router.push(`${pathname}?${params.toString()}`);
    };

    return (
        <div className="relative flex items-center group">
            <div className="bg-white dark:bg-[#1e2330] border border-slate-200 dark:border-[#2a3040] rounded-2xl px-5 py-2.5 flex items-center gap-3 shadow-xl hover:border-primary/50 transition-all cursor-pointer ring-1 ring-slate-200 dark:ring-white/5 group-hover:shadow-primary/10 transition-shadow duration-300">
                <MapPin size={16} className="text-primary" style={{ color: themeColor }} />
                <div className="flex flex-col text-left">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 italic leading-none mb-1">Viewing Context</p>
                    <div className="flex items-center gap-1">
                        <select 
                            value={currentBarangay || ""} 
                            onChange={(e) => onSelect(e.target.value)}
                            className="bg-transparent border-none outline-none text-xs font-black uppercase italic tracking-tighter text-slate-900 dark:text-white cursor-pointer pr-6 appearance-none leading-none"
                            style={{ minWidth: "140px" }}
                        >
                            <option value="" className="text-slate-900 dark:text-white bg-white dark:bg-[#1e2330]">Mapandan</option>
                            {availableBarangays.map(b => (
                                <option key={b} value={b} className="text-slate-900 dark:text-white bg-white dark:bg-[#1e2330]">{b}</option>
                            ))}
                        </select>
                        <ChevronDown size={12} className="text-slate-400 group-hover:text-primary transition-colors -ml-4 pointer-events-none" />
                    </div>
                </div>
            </div>
        </div>
    );
}
