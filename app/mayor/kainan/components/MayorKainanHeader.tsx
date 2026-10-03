"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { Utensils, ChevronDown, Moon, Sun, LogOut, ArrowLeft } from "lucide-react";
import { useTheme } from "next-themes";
import { BarangaySwitcher } from "@/app/admin/components/BarangaySwitcher";

interface MayorKainanHeaderProps {
    session: any;
    themeColor: string;
    activeBarangays: string[];
    selectedBarangay: string;
}

export function MayorKainanHeader({
    session,
    themeColor,
    activeBarangays,
    selectedBarangay,
}: MayorKainanHeaderProps) {
    const { theme, setTheme } = useTheme();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const initials = session?.user?.name
        ? session.user.name
              .split(" ")
              .map((n: string) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()
        : "MY";

    return (
        <header className="sticky top-0 z-50 bg-white/90 dark:bg-[#151b2b]/90 backdrop-blur-md border-b border-slate-200 dark:border-[#2a3040] px-6 py-4 transition-colors">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
                {/* Left: Brand Badge & Back Link */}
                <div className="flex items-center gap-4">
                    <Link
                        href="/mayor/dashboard"
                        prefetch={false}
                        className="p-2 rounded-2xl bg-slate-100 dark:bg-[#1e2330] hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition-colors"
                        title="Return to Mayor Dashboard"
                    >
                        <ArrowLeft size={18} />
                    </Link>

                    <div className="flex items-center gap-3">
                        <div
                            className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0"
                            style={{ backgroundColor: themeColor, boxShadow: `0 10px 15px -3px ${themeColor}44` }}
                        >
                            <Utensils className="w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="text-lg font-black uppercase italic tracking-tight text-slate-900 dark:text-white leading-tight">
                                Kainan & Culinary Hub
                            </h1>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">
                                E-LGU Executive Oversight & Food Directory
                            </p>
                        </div>
                    </div>
                </div>

                {/* Right: Controls & User Menu */}
                <div className="flex items-center gap-4">
                    <BarangaySwitcher
                        availableBarangays={activeBarangays}
                        currentBarangay={selectedBarangay}
                        themeColor={themeColor}
                    />

                    {/* Profile Dropdown */}
                    <div className="relative shrink-0" ref={dropdownRef}>
                        <button
                            onClick={() => setDropdownOpen(!dropdownOpen)}
                            className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-2xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors border border-slate-200 dark:border-[#2a3040]"
                        >
                            <div
                                className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black text-white shadow"
                                style={{ backgroundColor: themeColor }}
                            >
                                {initials}
                            </div>
                            <div className="text-left hidden sm:block">
                                <p className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-tight">
                                    {session?.user?.name || "Municipal Mayor"}
                                </p>
                                <p className="text-[10px] font-black uppercase tracking-wider text-emerald-500 leading-tight">
                                    Executive
                                </p>
                            </div>
                            <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`} />
                        </button>

                        {/* Profile Dropdown Menu */}
                        {dropdownOpen && (
                            <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-[#1e2330] border border-slate-200 dark:border-[#2a3040] rounded-2xl shadow-2xl overflow-hidden z-[100]">
                                <div className="px-4 py-3 border-b border-slate-100 dark:border-[#2a3040]">
                                    <p className="text-xs font-black uppercase text-slate-800 dark:text-slate-200 tracking-tight">
                                        {session?.user?.name || "Municipal Mayor"}
                                    </p>
                                    <p className="text-[10px] text-slate-400 truncate">{session?.user?.email}</p>
                                </div>

                                <div className="py-2 px-2 space-y-0.5">
                                    <button
                                        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors text-left"
                                    >
                                        {theme === "dark" ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} className="text-slate-500" />}
                                        <span className="font-medium">{theme === "dark" ? "Light mode" : "Dark mode"}</span>
                                    </button>
                                </div>

                                <div className="px-2 pb-2 border-t border-slate-100 dark:border-[#2a3040] pt-1">
                                    <button
                                        onClick={() => signOut({ callbackUrl: "/auth/login" })}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                                    >
                                        <LogOut size={15} />
                                        <span className="font-medium">Log out</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}
