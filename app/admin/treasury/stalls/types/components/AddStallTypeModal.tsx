"use client";

import React, { useState } from "react";
import { useStallTypes } from "./StallTypesProvider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tag } from "lucide-react";
import { createStallType } from "../actions";

export function AddStallTypeModal() {
    const { isAddOpen, setIsAddOpen, themeColor, triggerRefresh } = useStallTypes();

    const [code, setCode] = useState("");
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!code.trim() || !name.trim()) {
            alert("Please fill in both section code and section name");
            return;
        }

        setLoading(true);
        const res = await createStallType({
            code,
            name,
            description,
        });

        setLoading(false);
        if (res.success) {
            setIsAddOpen(false);
            setCode("");
            setName("");
            setDescription("");
            triggerRefresh();
        } else {
            alert(res.error || "Failed to create section");
        }
    };

    return (
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-white dark:bg-[#151b2b] border-slate-200 dark:border-[#2a3040] shadow-2xl rounded-3xl">
                <DialogHeader className="p-6 pb-4 border-b border-slate-100 dark:border-[#2a3040] flex flex-row items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl text-white shadow-md" style={{ backgroundColor: themeColor }}>
                            <Tag className="w-5 h-5" />
                        </div>
                        <div>
                            <DialogTitle className="text-xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight">
                                Add Market Section
                            </DialogTitle>
                            <DialogDescription className="text-xs text-slate-500 font-medium italic">
                                Create a new category / stall section.
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Section Code */}
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Section Code *</label>
                        <Input
                            required
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            placeholder="e.g. MEAT, FISH, DRY"
                            className="h-10 bg-slate-50 dark:bg-[#1a202c] border-slate-200 dark:border-[#2a3040] rounded-xl text-xs font-bold uppercase"
                        />
                    </div>

                    {/* Section Name */}
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Section Name *</label>
                        <Input
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Meat & Poultry Section"
                            className="h-10 bg-slate-50 dark:bg-[#1a202c] border-slate-200 dark:border-[#2a3040] rounded-xl text-xs font-bold"
                        />
                    </div>

                    {/* Description */}
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Description</label>
                        <Textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Optional category description..."
                            rows={3}
                            className="bg-slate-50 dark:bg-[#1a202c] border-slate-200 dark:border-[#2a3040] rounded-xl text-xs font-medium resize-none"
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-[#2a3040]">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setIsAddOpen(false)}
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
                            {loading ? "Saving..." : "Create Section"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
