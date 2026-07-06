"use client";

import React, { useState, useEffect } from "react";
import { Monitor, ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface CounterSelectorHeaderProps {
    themeColor?: string;
    userRole: string;
}

const COUNTER_OPTIONS = [
    "Counter 1",
    "Counter 2",
    "Counter 3",
    "Counter 4",
    "Window 1",
    "Window 2",
    "Window 3",
    "Desk A",
    "Desk B",
    "Desk C",
    "Engineering Desk 1"
];

export default function CounterSelectorHeader({
    themeColor = "#2563eb",
    userRole
}: CounterSelectorHeaderProps) {
    const [counterName, setCounterName] = useState<string | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [customValue, setCustomValue] = useState("");
    const dropdownRef = React.useRef<HTMLDivElement>(null);

    // Only enable counter selection for authorized staff roles
    const allowedRoles = ["ADMIN", "BARANGAY_ADMIN", "TREASURY_STAFF", "ADMIN_AIDE", "ENGINEER"];
    const isAuthorized = allowedRoles.includes(userRole);

    useEffect(() => {
        if (!isAuthorized) return;
        
        // Load initial counter name from localStorage
        const saved = localStorage.getItem("activeCounterName");
        if (saved) {
            setCounterName(saved);
        } else {
            // Auto prompt or keep null to show warning state
            setCounterName(null);
        }
    }, [isAuthorized]);

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    if (!isAuthorized) return null;

    const handleSelectCounter = (name: string) => {
        localStorage.setItem("activeCounterName", name);
        setCounterName(name);
        setIsOpen(false);

        // Dispatch storage event to notify other components instantly
        window.dispatchEvent(new Event("storage"));
    };

    const handleCustomSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (customValue.trim()) {
            handleSelectCounter(customValue.trim());
            setCustomValue("");
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-black uppercase tracking-wider transition-all",
                    counterName
                        ? "bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200"
                        : "bg-red-500/10 border-red-500/30 text-red-500 animate-pulse"
                )}
            >
                <Monitor className="w-3.5 h-3.5" />
                <span>{counterName ? counterName : "Set Counter"}</span>
                <ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {/* Dropdown Card */}
            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-[#1e2330] border border-slate-200 dark:border-[#2a3040] rounded-2xl shadow-2xl z-50 p-4 space-y-4">
                    <div className="space-y-1">
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                            Select active Counter
                        </h4>
                        <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">
                            For TV Queue Monitor
                        </p>
                    </div>

                    {/* Predefined List */}
                    <div className="max-h-48 overflow-y-auto pr-1 space-y-1 border-b border-slate-100 dark:border-white/5 pb-3">
                        {COUNTER_OPTIONS.map((opt) => {
                            const active = counterName === opt;
                            return (
                                <button
                                    key={opt}
                                    type="button"
                                    onClick={() => handleSelectCounter(opt)}
                                    className={cn(
                                        "w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs font-bold transition-all",
                                        active
                                            ? "bg-primary/10 text-primary dark:bg-white/10 dark:text-white"
                                            : "hover:bg-slate-50 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400"
                                    )}
                                >
                                    <span>{opt}</span>
                                    {active && <Check className="w-3.5 h-3.5 text-primary dark:text-white" style={{ color: themeColor }} />}
                                </button>
                            );
                        })}
                    </div>

                    {/* Custom Input */}
                    <form onSubmit={handleCustomSubmit} className="space-y-2">
                        <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                            Or Type Custom Counter Name
                        </label>
                        <div className="flex gap-1.5">
                            <input
                                type="text"
                                placeholder="e.g. Window 4"
                                value={customValue}
                                onChange={(e) => setCustomValue(e.target.value)}
                                className="flex-1 h-9 px-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:border-primary placeholder-slate-455"
                            />
                            <button
                                type="submit"
                                className="h-9 px-3 rounded-xl text-white text-[9px] font-black uppercase tracking-widest transition-all"
                                style={{ backgroundColor: themeColor }}
                            >
                                Set
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
