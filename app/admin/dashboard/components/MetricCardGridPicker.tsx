"use client";

import React, { useState } from "react";
import { Grid, RotateCcw } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

interface MetricCardGridPickerProps {
    currentCols: number;
    currentRowSpan: number;
    onSelectSize: (cols: number, rowSpan: number) => void;
    onReset: () => void;
}

export function MetricCardGridPicker({
    currentCols,
    currentRowSpan,
    onSelectSize,
    onReset,
}: MetricCardGridPickerProps) {
    const [open, setOpen] = useState(false);
    const [hoverCols, setHoverCols] = useState<number | null>(null);
    const [hoverRows, setHoverRows] = useState<number | null>(null);

    const activeCols = hoverCols ?? currentCols;
    const activeRows = hoverRows ?? currentRowSpan;

    const handleCellClick = (cols: number, rows: number) => {
        onSelectSize(cols, rows);
        setOpen(false);
    };

    const handleReset = () => {
        setHoverCols(null);
        setHoverRows(null);
        onReset();
        setOpen(false);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-700/60 shadow-sm"
                    title="Card Grid Settings (Width & Height Matrix)"
                >
                    <Grid className="w-3.5 h-3.5" />
                </button>
            </PopoverTrigger>
            <PopoverContent
                align="end"
                className="w-72 p-4 bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040] shadow-2xl rounded-2xl font-sans"
            >
                <div className="space-y-3 select-none">
                    {/* Popover Header */}
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 italic">
                            <Grid className="w-4 h-4 text-emerald-500" />
                            <span>Grid Size</span>
                        </div>
                        <span className="text-[11px] font-mono font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-md border border-emerald-500/20">
                            {activeCols} × {activeRows}
                        </span>
                    </div>

                    {/* 12 Cols x 6 Rows Matrix Grid Picker */}
                    <div
                        className="grid grid-cols-12 gap-1 p-1 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200/60 dark:border-slate-800"
                        onMouseLeave={() => {
                            setHoverCols(null);
                            setHoverRows(null);
                        }}
                    >
                        {Array.from({ length: 6 }).map((_, rowIndex) => {
                            const r = rowIndex + 1;
                            return Array.from({ length: 12 }).map((_, colIndex) => {
                                const c = colIndex + 1;
                                const isSelected = c <= activeCols && r <= activeRows;

                                return (
                                    <div
                                        key={`${r}-${c}`}
                                        onMouseEnter={() => {
                                            setHoverCols(c);
                                            setHoverRows(r);
                                        }}
                                        onClick={() => handleCellClick(c, r)}
                                        className={`h-4 rounded-[3px] cursor-pointer transition-all duration-150 ${
                                            isSelected
                                                ? "bg-blue-600 dark:bg-blue-500 shadow-sm scale-[1.05]"
                                                : "bg-slate-200/70 dark:bg-slate-800/60 hover:bg-slate-300 dark:hover:bg-slate-700"
                                        }`}
                                    />
                                );
                            });
                        })}
                    </div>

                    <div className="text-[10px] font-medium text-slate-400 text-center italic">
                        Hover to preview, click to apply span
                    </div>

                    {/* Reset Button */}
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleReset}
                        className="w-full h-8 text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl uppercase tracking-wider italic flex items-center justify-center gap-1.5 mt-1"
                    >
                        <RotateCcw className="w-3 h-3" /> Reset to Auto-Scale
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
}
