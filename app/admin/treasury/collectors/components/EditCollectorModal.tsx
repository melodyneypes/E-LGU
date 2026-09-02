"use client";

import React, { useState, useEffect } from "react";
import { useCollectors } from "./CollectorProvider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Edit, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { updateCollector } from "../actions";

export function EditCollectorModal() {
    const { isEditOpen, setIsEditOpen, editingCollector, themeColor, triggerRefresh, setCollectors } = useCollectors();

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [rfid, setRfid] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (editingCollector) {
            setName(editingCollector.name || "");
            setEmail(editingCollector.email || "");
            setRfid(editingCollector.rfid || "");
            setPassword("");
        }
    }, [editingCollector]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingCollector) return;

        if (!name.trim() || !email.trim()) {
            toast.error("Please fill in both name and email");
            return;
        }

        setLoading(true);
        try {
            const res = await updateCollector(editingCollector.id, {
                name,
                email,
                password: password || undefined,
                rfid: rfid || null,
            });

            if (res.success && res.data) {
                // Instant In-Place State Mutation
                setCollectors((prev) =>
                    prev.map((c) => (c.id === editingCollector.id ? (res.data as any) : c))
                );
                toast.success(`Collector "${name}" updated successfully!`);
                setIsEditOpen(false);
                triggerRefresh();
            } else {
                toast.error(res.error || "Failed to update collector");
            }
        } catch (err: any) {
            toast.error(err.message || "An unexpected error occurred");
        } finally {
            setLoading(false);
        }
    };

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
                                Edit Collector Profile
                            </DialogTitle>
                            <DialogDescription className="text-xs text-slate-500 font-medium italic">
                                Update credentials, RFID badge, or password.
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
                    <div className="space-y-1.5">
                        <Label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                            Full Name <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="h-10 text-xs bg-slate-50 dark:bg-[#1a202c] border-slate-200 dark:border-[#2a3040] rounded-xl font-medium"
                            required
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                            Email Address <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="h-10 text-xs bg-slate-50 dark:bg-[#1a202c] border-slate-200 dark:border-[#2a3040] rounded-xl font-medium"
                            required
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                            RFID Card UID
                        </Label>
                        <Input
                            value={rfid}
                            onChange={(e) => setRfid(e.target.value)}
                            placeholder="Enter RFID UID or leave blank"
                            className="h-10 text-xs bg-slate-50 dark:bg-[#1a202c] border-slate-200 dark:border-[#2a3040] rounded-xl font-medium uppercase font-mono"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                            Reset Password (Optional)
                        </Label>
                        <Input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Leave blank to keep existing password"
                            className="h-10 text-xs bg-slate-50 dark:bg-[#1a202c] border-slate-200 dark:border-[#2a3040] rounded-xl font-medium"
                        />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-[#2a3040]">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsEditOpen(false)}
                            className="h-10 px-4 rounded-xl text-xs font-bold border-slate-200 dark:border-[#2a3040]"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="h-10 px-6 rounded-xl text-xs font-black uppercase italic tracking-wider text-white shadow-lg flex items-center gap-2 cursor-pointer"
                            style={{ backgroundColor: themeColor }}
                        >
                            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                            <span>Update Profile</span>
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
