"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { Hotel, ChevronDown, Moon, Sun, LogOut, ArrowLeft, Building2 } from "lucide-react";
import { useTheme } from "next-themes";

interface CaptainTuluyanHeaderProps {
    session: any;
    themeColor: string;
    managedBarangay?: string;
}

export function CaptainTuluyanHeader({
    session,
    themeColor,
    managedBarangay = "{{BARANGAY_NAME}}",
}: CaptainTuluyanHeaderProps) {
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
        : "PB";

    return (
        <header className="sticky top-0 z-50 bg-white/90 dark:bg-[#151b2b]/90 backdrop-blur-md border-b border-slate-200 dark:border-[#2a3040] px-6 py-4 transition-colors">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
                {/* Left: Brand Badge & Back Link */}
                <div className="flex items-center gap-4">
                    <Link
                        href="/captain/dashboard"
                        prefetch={false}
                        className="p-2 rounded-2xl bg-slate-100 dark:bg-[#1e2330] hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition-colors"
                        title="Return to Captain Dashboard"
                    >
                        <ArrowLeft size={18} />
                    </Link>

                    <div className="flex items-center gap-3">
                        <div
                            className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0"
                            style={{ backgroundColor: themeColor, boxShadow: `0 10px 15px -3px ${themeColor}44` }}
                        >
                            <Hotel className="w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="text-lg font-black uppercase italic tracking-tight text-slate-900 dark:text-white leading-tight">
                                Tuluyan & Accommodations
                            </h1>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">
                                Barangay {managedBarangay} Lodging & Stay Directory
                            </p>
                        </div>
                    </div>
                </div>

                {/* Right: Barangay Badge & User Menu */}
                <div className="flex items-center gap-4">
                    {/* Fixed Barangay Jurisdiction Badge for Captain */}
                    <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400">
                        <Building2 className="w-4 h-4 shrink-0" />
                        <span className="text-xs font-black uppercase tracking-wider">
                            Brgy. {managedBarangay}
                        </span>
                    </div>

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
                                    {session?.user?.name || "Punong Barangay"}
                                </p>
                                <p className="text-[10px] font-black uppercase tracking-wider text-indigo-500 leading-tight">
                                    Punong Barangay
                                </p>
                            </div>
                            <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`} />
                        </button>

                        {/* Profile Dropdown Menu */}
                        {dropdownOpen && (
                            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#1e2330] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#2a3040] py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                                <div className="px-4 py-2.5 border-b border-slate-100 dark:border-[#2a3040]">
                                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                                        {session?.user?.name}
                                    </p>
                                    <p className="text-[10px] text-slate-400 truncate">
                                        {session?.user?.email}
                                    </p>
                                </div>

                                <div className="p-1">
                                    <button
                                        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl transition-colors"
                                    >
                                        {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
                                        Toggle Theme
                                    </button>

                                    <button
                                        onClick={() => signOut({ callbackUrl: "/auth/login" })}
                                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-colors"
                                    >
                                        <LogOut size={14} />
                                        Sign Out
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
