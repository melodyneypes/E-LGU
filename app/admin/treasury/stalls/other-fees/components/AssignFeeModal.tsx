"use client";

import React, { useState, useEffect } from "react";
import { useOtherFees } from "./OtherFeesProvider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Link as LinkIcon, Store } from "lucide-react";
import { assignFeeToStalls } from "../actions";

export function AssignFeeModal() {
    const { isAssignOpen, setIsAssignOpen, assigningFee, allStalls, themeColor } = useOtherFees();

    const [selectedStallIds, setSelectedStallIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!assigningFee || !assigningFee.stalls) return;
        const currentStallIds = assigningFee.stalls.map((s) => s.stallId);
        setSelectedStallIds(currentStallIds);
    }, [assigningFee]);

    const handleToggleStall = (stallId: string) => {
        setSelectedStallIds((prev) =>
            prev.includes(stallId) ? prev.filter((id) => id !== stallId) : [...prev, stallId]
        );
    };

    const handleSelectAll = () => {
        if (selectedStallIds.length === allStalls.length) {
            setSelectedStallIds([]);
        } else {
            setSelectedStallIds(allStalls.map((s) => s.id));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!assigningFee) return;

        setLoading(true);
        const res = await assignFeeToStalls(assigningFee.id, selectedStallIds);

        setLoading(false);
        if (res.success) {
            setIsAssignOpen(false);
        } else {
            alert(res.error || "Failed to assign fee to stalls");
        }
    };

    if (!assigningFee) return null;

    return (
        <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
            <DialogContent className="sm:max-w-lg p-0 overflow-hidden bg-white dark:bg-[#151b2b] border-slate-200 dark:border-[#2a3040] shadow-2xl rounded-3xl">
                <DialogHeader className="p-6 pb-4 border-b border-slate-100 dark:border-[#2a3040] flex flex-row items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl text-white shadow-md" style={{ backgroundColor: themeColor }}>
                            <LinkIcon className="w-5 h-5" />
                        </div>
                        <div>
                            <DialogTitle className="text-xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight">
                                Assign Fee ({assigningFee.name})
                            </DialogTitle>
                            <DialogDescription className="text-xs text-slate-500 font-medium italic">
                                Select stalls to attach this daily/monthly fee to.
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#2a3040] pb-3">
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                            Selected: {selectedStallIds.length} / {allStalls.length} stalls
                        </span>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleSelectAll}
                            className="text-xs font-black uppercase tracking-wider text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                        >
                            {selectedStallIds.length === allStalls.length ? "Deselect All" : "Select All Stalls"}
                        </Button>
                    </div>

                    {/* Stalls Checkbox Grid */}
                    <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-2 pr-2">
                        {allStalls.map((s) => (
                            <label
                                key={s.id}
                                className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 dark:border-[#2a3040] hover:bg-slate-50 dark:hover:bg-[#1a202c] transition-colors cursor-pointer"
                            >
                                <div className="flex items-center gap-3">
                                    <Checkbox
                                        checked={selectedStallIds.includes(s.id)}
                                        onCheckedChange={() => handleToggleStall(s.id)}
                                    />
                                    <div className="flex items-center gap-1.5 font-black text-xs text-slate-900 dark:text-white uppercase italic">
                                        <Store className="w-3.5 h-3.5 text-blue-500" />
                                        <span>Stall {s.stallNumber}</span>
                                    </div>
                                </div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                    {s.status}
                                </span>
                            </label>
                        ))}
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-[#2a3040]">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setIsAssignOpen(false)}
                            className="rounded-xl text-xs font-bold"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            style={{ backgroundColor: themeColor }}
                            className="rounded-xl text-xs font-black uppercase italic tracking-wider text-white px-5"
                        >
                            {loading ? "Saving..." : "Save Stall Assignments"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
