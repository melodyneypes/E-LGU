"use client";

import React, { useState, useEffect } from "react";
import { Monitor, ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { useSafeSession } from "@/lib/hooks/useSafeSession";

interface CounterSelectorHeaderProps {
    themeColor?: string;
    userRole?: string;
    userDepartment?: string | null;
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
    userRole: propRole,
    userDepartment: propDept
}: CounterSelectorHeaderProps) {
    const sessionRes = useSafeSession();
    const session = sessionRes?.data;

    const userRole = propRole || (session?.user as any)?.role || "ADMIN";
    const userDepartment = propDept !== undefined ? propDept : ((session?.user as any)?.department || "RHU");
    const [counterName, setCounterName] = useState<string | null>(null);
    const [prompted, setPrompted] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [customValue, setCustomValue] = useState("");
    const dropdownRef = React.useRef<HTMLDivElement>(null);

    // Only enable counter selection for authorized staff roles
    const allowedRoles = ["ADMIN", "BARANGAY_ADMIN", "TREASURY_STAFF", "ADMIN_AIDE"];

    // Departments that MUST have counter/window selection
    const allowedDepartments = ["Treasury", "Registrar", "Civil Registry", "BPLO", "Engineer", "Engineering", "RHU", "Health", "Rural Health Unit"];

    const isLGU = userDepartment?.toUpperCase() === "LGU";

    const isAuthorized = allowedRoles.includes(userRole) && !isLGU && (
        (userDepartment && allowedDepartments.some(dept => userDepartment.toLowerCase().includes(dept.toLowerCase()))) ||
        (!userDepartment && userRole === "BARANGAY_ADMIN")
    );

    useEffect(() => {
        setIsMounted(true);
        if (!isAuthorized) return;

        // Load initial counter name from localStorage or default to Counter 1
        const saved = localStorage.getItem("activeCounterName");
        const effectiveCounter = saved || "Counter 1";
        setCounterName(effectiveCounter);
        if (!saved) {
            localStorage.setItem("activeCounterName", "Counter 1");
        }

        // Always treat as prompted if counterName exists or was previously set
        localStorage.setItem("counterSetPrompted", "true");
        sessionStorage.setItem("counterSetPrompted", "true");
        setPrompted(true);
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

    if (!isAuthorized || !isMounted) return null;

    const handleSelectCounter = (name: string) => {
        localStorage.setItem("activeCounterName", name);
        localStorage.setItem("counterSetPrompted", "true");
        sessionStorage.setItem("counterSetPrompted", "true");
        setCounterName(name);
        setIsOpen(false);
        setPrompted(true);

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

    const handleSkip = () => {
        localStorage.setItem("counterSetPrompted", "true");
        sessionStorage.setItem("counterSetPrompted", "true");
        setPrompted(true);
    };

    const isEnforcerOpen = isMounted && isAuthorized && counterName === null && !prompted;

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
                        <div className="flex items-center gap-1.5 w-full">
                            <input
                                type="text"
                                placeholder="e.g. Window 4"
                                value={customValue}
                                onChange={(e) => setCustomValue(e.target.value)}
                                className="flex-1 min-w-0 h-9 px-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:border-primary placeholder-slate-400"
                            />
                            <button
                                type="submit"
                                className="h-9 px-3 rounded-xl text-white text-[9px] font-black uppercase tracking-widest transition-all shrink-0 hover:brightness-110 active:scale-95"
                                style={{ backgroundColor: themeColor }}
                            >
                                Set
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Enforcer Modal Dialog */}
            <Dialog open={isEnforcerOpen} onOpenChange={() => { }}>
                <DialogContent
                    className="rounded-3xl max-w-md p-6 md:p-8 [&>button]:hidden shadow-2xl border border-slate-200 dark:border-white/10"
                    onPointerDownOutside={(e) => e.preventDefault()}
                    onEscapeKeyDown={(e) => e.preventDefault()}
                >
                    <DialogHeader className="space-y-2">
                        <DialogTitle className="text-xl md:text-2xl font-black uppercase italic tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                            <Monitor className="w-6 h-6 text-primary shrink-0" style={{ color: themeColor }} />
                            Assign Active Counter / Window
                        </DialogTitle>
                        <DialogDescription className="text-xs font-semibold text-slate-500 leading-relaxed">
                            Please type your active counter or window assignment below. This is required if you will call queue tickets so they are routed to your counter. If you are not assigned to a queue window (e.g., payment ledger only), you may skip this.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 mt-4">
                        <form onSubmit={handleCustomSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none block">
                                    Counter / Window Name
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. Window 1, Counter 2"
                                    value={customValue}
                                    onChange={(e) => setCustomValue(e.target.value)}
                                    className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:border-primary placeholder-slate-400"
                                />
                            </div>

                            <div className="flex flex-col sm:flex-row gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={handleSkip}
                                    className="flex-1 h-11 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-455 hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
                                >
                                    Skip Assignment
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 h-11 rounded-xl text-white text-[10px] font-black uppercase tracking-widest transition-all hover:brightness-95 active:scale-95"
                                    style={{ backgroundColor: themeColor }}
                                >
                                    Set Active Counter
                                </button>
                            </div>
                        </form>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
