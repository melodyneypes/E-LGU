"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, Search, Check, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export type DropdownOption = string | { label: string; value: string };

interface SearchableFilterDropdownProps {
    label?: string;
    value: string;
    options: DropdownOption[];
    onChange: (value: string) => void;
    themeColor?: string;
    placeholder?: string;
    triggerPlaceholder?: string;
    className?: string;
    triggerClassName?: string;
    hideAllOption?: boolean;
    fullWidth?: boolean;
}

export function SearchableFilterDropdown({
    label,
    value,
    options = [],
    onChange,
    themeColor = "var(--primary-theme, #2563eb)",
    placeholder = "Search...",
    triggerPlaceholder,
    className,
    triggerClassName,
    hideAllOption = false,
    fullWidth = false,
}: SearchableFilterDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const dropdownRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Normalize options to { label: string, value: string }
    const normalizedOptions = useMemo(() => {
        return options.map(opt => typeof opt === "string" ? { label: opt, value: opt } : opt);
    }, [options]);

    // Ensure "All" is at the top unless hideAllOption is true
    const formattedOptions = useMemo(() => {
        if (hideAllOption) {
            return normalizedOptions.filter(opt => opt.value.toLowerCase() !== "all");
        }
        const hasAll = normalizedOptions.some(opt => opt.value.toLowerCase() === "all");
        const rest = normalizedOptions.filter(opt => opt.value.toLowerCase() !== "all");
        return hasAll ? [{ label: "All", value: "All" }, ...rest] : normalizedOptions;
    }, [normalizedOptions, hideAllOption]);

    // Filtered options based on internal search query
    const filteredOptions = useMemo(() => {
        if (!searchQuery.trim()) return formattedOptions;
        const q = searchQuery.toLowerCase().trim();
        return formattedOptions.filter(opt =>
            opt.label.toLowerCase().includes(q) || opt.value.toLowerCase().includes(q)
        );
    }, [formattedOptions, searchQuery]);

    // Find current display label for selected value
    const selectedLabel = useMemo(() => {
        const found = normalizedOptions.find(opt => opt.value.toLowerCase() === (value || "").toLowerCase());
        return found ? found.label : value;
    }, [normalizedOptions, value]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen]);

    // Auto-focus search input when opened
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => {
                searchInputRef.current?.focus();
            }, 50);
        } else {
            setSearchQuery("");
        }
    }, [isOpen]);

    const isSelectedActive = value && value.toLowerCase() !== "all";

    return (
        <div className={cn("relative", fullWidth && "w-full", className)} ref={dropdownRef}>
            {/* Trigger Button */}
            <button
                type="button"
                onClick={() => setIsOpen(prev => !prev)}
                className={cn(
                    "flex items-center gap-2 h-9 px-3 rounded-xl border text-xs font-bold transition-all duration-200 cursor-pointer select-none",
                    fullWidth && "w-full justify-between",
                    isOpen
                        ? "bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-700 shadow-sm"
                        : isSelectedActive
                            ? "bg-slate-100/90 dark:bg-slate-950/90 border-slate-300 dark:border-slate-700/80 hover:border-slate-400 dark:hover:border-slate-600"
                            : "bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700",
                    triggerClassName
                )}
            >
                {label && (
                    <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest shrink-0">
                        {label}:
                    </span>
                )}
                <span 
                    className={cn(
                        "text-xs truncate",
                        !fullWidth && "max-w-[150px] sm:max-w-[180px]",
                        isSelectedActive ? "font-black" : "text-slate-800 dark:text-slate-300 font-bold"
                    )}
                    style={isSelectedActive && !triggerClassName ? { color: themeColor } : undefined}
                >
                    {selectedLabel || triggerPlaceholder || (hideAllOption ? "Select..." : "All")}
                </span>
                <ChevronDown
                    className={cn(
                        "w-3.5 h-3.5 text-slate-400 dark:text-slate-500 transition-transform duration-200 shrink-0 ml-auto",
                        isOpen && "rotate-180 text-slate-700 dark:text-slate-300"
                    )}
                />
            </button>

            {/* Dropdown Menu Popup */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 6, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.97 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className={cn(
                            "absolute left-0 top-[calc(100%+6px)] z-[130] rounded-2xl bg-white dark:bg-[#0d1222] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden p-2 flex flex-col backdrop-blur-xl",
                            fullWidth ? "w-full" : "w-[260px] sm:w-[290px]"
                        )}
                        style={{
                            boxShadow: "0 20px 50px -10px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)"
                        }}
                    >
                        {/* Embedded Search Input */}
                        <div className="relative mb-2 px-1 pt-1">
                            <Search className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={placeholder}
                                className="w-full h-8 pl-8 pr-7 bg-slate-50 dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800/90 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-slate-400 dark:focus:border-slate-700"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery("")}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300 p-0.5"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            )}
                        </div>

                        {/* Options List */}
                        <div className="max-h-56 overflow-y-auto space-y-0.5 pr-1 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800 scrollbar-track-transparent">
                            {filteredOptions.length === 0 ? (
                                <div className="p-4 text-center text-slate-400 dark:text-slate-500 text-xs font-medium italic">
                                    No matching {label ? `${label.toLowerCase()}s` : "results"}
                                </div>
                            ) : (
                                filteredOptions.map((option) => {
                                    const isSelected = option.value.toLowerCase() === (value || "").toLowerCase();
                                    return (
                                        <button
                                            key={option.value}
                                            type="button"
                                            onClick={() => {
                                                onChange(option.value);
                                                setIsOpen(false);
                                            }}
                                            className={cn(
                                                "w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all text-left group",
                                                isSelected
                                                    ? "bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm font-black"
                                                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/70 dark:hover:bg-slate-900/60"
                                            )}
                                        >
                                            <span 
                                                className="truncate pr-2"
                                                style={isSelected ? { color: themeColor } : undefined}
                                            >
                                                {option.label}
                                            </span>
                                            {isSelected && (
                                                <Check 
                                                    className="w-3.5 h-3.5 shrink-0" 
                                                    style={{ color: themeColor }} 
                                                />
                                            )}
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
