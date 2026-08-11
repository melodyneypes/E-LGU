"use client";

import React, { useState, useEffect } from "react";
import { useOtherFees } from "./OtherFeesProvider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Edit } from "lucide-react";
import { updateOtherFee } from "../actions";

export function EditOtherFeeModal() {
    const { isEditOpen, setIsEditOpen, editingFee, themeColor } = useOtherFees();

    const [code, setCode] = useState("");
    const [name, setName] = useState("");
    const [amount, setAmount] = useState("0");
    const [description, setDescription] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!editingFee) return;
        setCode(editingFee.code);
        setName(editingFee.name);
        setAmount(editingFee.amount.toString());
        setDescription(editingFee.description || "");
    }, [editingFee]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingFee || !code.trim() || !name.trim()) return;

        setLoading(true);
        const res = await updateOtherFee(editingFee.id, {
            code,
            name,
            amount: parseFloat(amount) || 0,
            description,
        });

        setLoading(false);
        if (res.success) {
            setIsEditOpen(false);
        } else {
            alert(res.error || "Failed to update fee");
        }
    };

    if (!editingFee) return null;

    return (
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-white dark:bg-[#151b2b] border-slate-200 dark:border-[#2a3040] shadow-2xl rounded-3xl">
                <DialogHeader className="p-6 pb-4 border-b border-slate-100 dark:border-[#2a3040] flex flex-row items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl text-white shadow-md" style={{ backgroundColor: themeColor }}>
                            <Edit className="w-5 h-5" />
                        </div>
                        <div>
                            <DialogTitle className="text-xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight">
                                Edit Fee ({editingFee.code})
                            </DialogTitle>
                            <DialogDescription className="text-xs text-slate-500 font-medium italic">
                                Update fee name, base amount, or description.
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Fee Code *</label>
                            <Input
                                required
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                className="h-10 bg-slate-50 dark:bg-[#1a202c] border-slate-200 dark:border-[#2a3040] rounded-xl text-xs font-bold uppercase"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Default Amount (₱) *</label>
                            <Input
                                type="number"
                                step="any"
                                required
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="h-10 bg-slate-50 dark:bg-[#1a202c] border-slate-200 dark:border-[#2a3040] rounded-xl text-xs font-bold"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Fee Name *</label>
                        <Input
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="h-10 bg-slate-50 dark:bg-[#1a202c] border-slate-200 dark:border-[#2a3040] rounded-xl text-xs font-bold"
                        />
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
                            className="rounded-xl text-xs font-black uppercase italic tracking-wider text-white px-5"
                        >
                            {loading ? "Updating..." : "Save Changes"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
