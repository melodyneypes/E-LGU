"use client";

import React, { useState } from "react";
import { X, Truck, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { createBarangayLogistics } from "../actions/logistics.actions";
import { toast } from "sonner";

interface AddLogisticsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function AddLogisticsModal({ isOpen, onClose, onSuccess }: AddLogisticsModalProps) {
    const [name, setName] = useState("");
    const [deliveryFee, setDeliveryFee] = useState("");
    const [estimatedDeliveryDays, setEstimatedDeliveryDays] = useState("");
    const [isLogisticsActive, setIsLogisticsActive] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            toast.error("Please enter a Barangay name.");
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await createBarangayLogistics(name.trim(), {
                deliveryFee: deliveryFee === "" ? 50 : Number(deliveryFee),
                isLogisticsActive,
                estimatedDeliveryDays: estimatedDeliveryDays === "" ? 3 : Number(estimatedDeliveryDays)
            });

            if (res.success) {
                toast.success(`Successfully added logistics node: Brgy. ${name}`);
                onSuccess();
                handleReset();
                onClose();
            } else {
                toast.error(res.error || "Failed to create logistics node");
            }
        } catch {
            toast.error("An error occurred during submission");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReset = () => {
        setName("");
        setDeliveryFee("");
        setEstimatedDeliveryDays("");
        setIsLogisticsActive(true);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div 
                className="bg-white dark:bg-[#151b2b] rounded-[3rem] border border-slate-200 dark:border-[#2a3040] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-8 border-b border-slate-100 dark:border-[#2a3040] flex justify-between items-start">
                    <div>
                        <h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white flex items-center gap-2">
                            <Truck className="w-7 h-7 text-primary animate-bounce" /> Add Node
                        </h2>
                        <p className="text-slate-500 text-xs font-medium italic mt-1">Register a new Barangay logistics hub with delivery configurations.</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors text-slate-400">
                        <X size={20} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    {/* Barangay Name */}
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">Barangay Name</Label>
                        <Input
                            required
                            placeholder="e.g. Poblacion"
                            className="h-12 bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-[#2a3040] rounded-xl font-bold italic"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>

                    {/* Delivery Fee & SLA days */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">Delivery Fee (₱)</Label>
                            <Input
                                type="number"
                                placeholder="50"
                                className="h-12 bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-[#2a3040] rounded-xl font-bold italic"
                                value={deliveryFee}
                                onChange={(e) => setDeliveryFee(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">SLA (Days)</Label>
                            <Input
                                type="number"
                                placeholder="3"
                                className="h-12 bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-[#2a3040] rounded-xl font-bold italic"
                                value={estimatedDeliveryDays}
                                onChange={(e) => setEstimatedDeliveryDays(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Active State Switch */}
                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-black/20 rounded-2xl border border-slate-100 dark:border-[#2a3040]">
                        <div>
                            <p className="text-xs font-black uppercase tracking-tight italic text-slate-900 dark:text-white">Active Status</p>
                            <p className="text-[9px] font-bold text-slate-400">Permit logistics nodes to operate immediately.</p>
                        </div>
                        <Switch
                            checked={isLogisticsActive}
                            onCheckedChange={setIsLogisticsActive}
                            className="data-[state=checked]:bg-primary"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end space-x-4 pt-6 border-t border-slate-100 dark:border-[#2a3040]">
                        <button 
                            type="button" 
                            onClick={onClose} 
                            className="px-6 py-3 rounded-xl text-xs font-black text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors uppercase italic"
                        >
                            Cancel
                        </button>
                        <Button 
                            type="submit" 
                            disabled={isSubmitting} 
                            className="px-6 py-3 rounded-xl text-xs font-black bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/20 transition-all disabled:opacity-50 uppercase italic"
                        >
                            {isSubmitting ? (
                                <span className="flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...</span>
                            ) : (
                                <span className="flex items-center gap-2"><Save className="w-3.5 h-3.5" /> Save Node</span>
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
