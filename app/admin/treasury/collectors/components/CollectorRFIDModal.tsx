"use client";

import React, { useState, useEffect } from "react";
import { useCollectors } from "./CollectorProvider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard, Loader2, X, CheckCircle2, Ban } from "lucide-react";
import { toast } from "sonner";
import { bindCollectorRFID } from "../actions";

export function CollectorRFIDModal() {
    const { isRfidOpen, setIsRfidOpen, rfidCollector, setRfidCollector, themeColor, triggerRefresh, setCollectors } = useCollectors();

    const [rfidValue, setRfidValue] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (rfidCollector) {
            setRfidValue(rfidCollector.rfid || "");
        }
    }, [rfidCollector]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!rfidCollector) return;

        setLoading(true);
        try {
            const res = await bindCollectorRFID(rfidCollector.id, rfidValue);
            if (res.success && res.data) {
                setCollectors((prev) =>
                    prev.map((c) => (c.id === rfidCollector.id ? (res.data as any) : c))
                );
                toast.success("RFID badge updated successfully!");
                setIsRfidOpen(false);
                setRfidCollector(null);
                triggerRefresh();
            } else {
                toast.error(res.error || "Failed to update RFID");
            }
        } catch (err: any) {
            toast.error(err.message || "An error occurred");
        } finally {
            setLoading(false);
        }
    };

    const handleUnlink = async () => {
        if (!rfidCollector) return;
        if (confirm("Are you sure you want to unlink this RFID card?")) {
            setLoading(true);
            try {
                const res = await bindCollectorRFID(rfidCollector.id, null);
                if (res.success && res.data) {
                    setCollectors((prev) =>
                        prev.map((c) => (c.id === rfidCollector.id ? (res.data as any) : c))
                    );
                    toast.success("RFID badge unlinked!");
                    setIsRfidOpen(false);
                    setRfidCollector(null);
                    triggerRefresh();
                } else {
                    toast.error(res.error || "Failed to unlink RFID");
                }
            } catch (err: any) {
                toast.error(err.message || "An error occurred");
            } finally {
                setLoading(false);
            }
        }
    };

    if (!rfidCollector) return null;

    return (
        <Dialog open={isRfidOpen} onOpenChange={setIsRfidOpen}>
            <DialogContent showCloseButton={false} className="sm:max-w-md p-0 overflow-hidden bg-white dark:bg-[#151b2b] border-slate-200 dark:border-[#2a3040] shadow-2xl rounded-3xl">
                <DialogHeader className="p-6 pb-4 border-b border-slate-100 dark:border-[#2a3040] flex flex-row items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl text-white shadow-md" style={{ backgroundColor: themeColor }}>
                            <CreditCard className="w-5 h-5" />
                        </div>
                        <div>
                            <DialogTitle className="text-xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight">
                                RFID Badge Binding
                            </DialogTitle>
                            <DialogDescription className="text-xs text-slate-500 font-medium italic">
                                Assign or update contactless RFID card UID.
                            </DialogDescription>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => setIsRfidOpen(false)}
                        className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </DialogHeader>

                <form onSubmit={handleSave} className="p-6 space-y-4">
                    <div className="p-3 bg-slate-50 dark:bg-[#1a202c] rounded-2xl border border-slate-200 dark:border-[#2a3040]">
                        <p className="text-[10px] uppercase font-bold text-slate-400">Target Collector</p>
                        <p className="text-sm font-black text-slate-900 dark:text-white uppercase italic">{rfidCollector.name}</p>
                        <p className="text-xs text-slate-500">{rfidCollector.email}</p>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                            RFID Card UID / Serial Number
                        </Label>
                        <Input
                            value={rfidValue}
                            onChange={(e) => setRfidValue(e.target.value)}
                            placeholder="Tap card on reader or enter UID..."
                            className="h-10 text-xs bg-slate-50 dark:bg-[#1a202c] border-slate-200 dark:border-[#2a3040] rounded-xl font-mono uppercase font-bold"
                            autoFocus
                        />
                        <p className="text-[10px] text-slate-400 italic">
                            This UID will authenticate handheld ticket machines in the market.
                        </p>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-[#2a3040]">
                        {rfidCollector.rfid ? (
                            <Button
                                type="button"
                                variant="ghost"
                                disabled={loading}
                                onClick={handleUnlink}
                                className="h-10 px-3 rounded-xl text-xs text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 font-bold"
                            >
                                <Ban className="w-3.5 h-3.5 mr-1" /> Unlink Card
                            </Button>
                        ) : <div />}

                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsRfidOpen(false)}
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
                                <span>Save Badge</span>
                            </Button>
                        </div>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
