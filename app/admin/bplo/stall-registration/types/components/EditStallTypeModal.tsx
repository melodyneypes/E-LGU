"use client";

import React, { useState, useEffect } from "react";
import { useStallTypes } from "./StallTypesProvider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Edit, X, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { updateStallType } from "../actions/stall-types.actions";

export function EditStallTypeModal() {
    const { isEditOpen, setIsEditOpen, editingStallType, themeColor, triggerRefresh } = useStallTypes();

    const [code, setCode] = useState("");
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [isActive, setIsActive] = useState(true);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!editingStallType) return;
        setCode(editingStallType.code);
        setName(editingStallType.name);
        setDescription(editingStallType.description || "");
        setIsActive(editingStallType.isActive !== false);
    }, [editingStallType]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingStallType || !code.trim() || !name.trim()) return;

        setLoading(true);
        try {
            const res = await updateStallType(editingStallType.id, {
                code,
                name,
                description,
                isActive,
            });

            if (res.success) {
                toast.success("Market section updated successfully!");
                setIsEditOpen(false);
                triggerRefresh();
            } else {
                toast.error(res.error || "Failed to update section");
            }
        } catch (err: any) {
            toast.error(err.message || "Failed to update section");
        } finally {
            setLoading(false);
        }
    };

    if (!editingStallType) return null;

    return (
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogContent showCloseButton={false} className="sm:max-w-md p-0 overflow-hidden bg-white dark:bg-[#151b2b] border-slate-200 dark:border-[#2a3040] shadow-2xl rounded-3xl">
                <DialogHeader className="p-6 pb-4 border-b border-slate-100 dark:border-[#2a3040] flex flex-row items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl text-white shadow-md" style={{ backgroundColor: themeColor }}>
                            <Edit className="w-5 h-5" />
                        </div>
                        <div>
                            <DialogTitle className="text-xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight">
                                Edit Section ({editingStallType.code})
                            </DialogTitle>
                            <DialogDescription className="text-xs text-slate-500 font-medium italic">
                                Update category name, code, status, or description.
                            </DialogDescription>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => setIsEditOpen(false)}
                        className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Section Code *</label>
                        <Input
                            required
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            className="h-10 bg-slate-50 dark:bg-[#1a202c] border-slate-200 dark:border-[#2a3040] rounded-xl text-xs font-bold uppercase"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Section Name *</label>
                        <Input
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="h-10 bg-slate-50 dark:bg-[#1a202c] border-slate-200 dark:border-[#2a3040] rounded-xl text-xs font-bold"
                        />
                    </div>

                    {/* Section Active Status Toggle */}
                    <div className="p-3 bg-slate-50 dark:bg-[#1a202c] border border-slate-200 dark:border-[#2a3040] rounded-2xl flex items-center justify-between">
                        <div>
                            <div className="text-xs font-bold text-slate-900 dark:text-white">Active Status</div>
                            <div className="text-[10px] text-slate-400 font-medium">Inactive sections cannot be assigned to new stalls.</div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsActive((prev) => !prev)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-colors cursor-pointer border ${
                                isActive
                                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-400"
                                    : "bg-slate-200 text-slate-500 border-slate-300 dark:bg-slate-800 dark:text-slate-400"
                            }`}
                        >
                            {isActive ? "Active" : "Inactive"}
                        </button>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Description</label>
                        <Textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            className="bg-slate-50 dark:bg-[#1a202c] border-slate-200 dark:border-[#2a3040] rounded-xl text-xs font-medium resize-none"
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-[#2a3040]">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setIsEditOpen(false)}
                            className="rounded-xl text-xs font-bold"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            style={{ backgroundColor: themeColor }}
                            className="rounded-xl text-xs font-black uppercase italic tracking-wider text-white px-5 flex items-center gap-2 cursor-pointer"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            <span>{loading ? "Updating..." : "Save Changes"}</span>
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
