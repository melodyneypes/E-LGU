"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
    Truck, 
    Search, 
    Save, 
    RefreshCcw, 
    Info,
    Plus,
    Trash2
} from "lucide-react";
import { AddLogisticsModal } from "./components/AddLogisticsModal";
import { 
    getAllBarangayLogistics, 
    updateBarangayLogistics,
    deleteBarangayLogistics,
    getSystemSettingAction
} from "./actions/logistics.actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDeleteModal } from "@/components/shared/ConfirmDeleteModal";

export default function LogisticsManagementPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
    const [barangays, setBarangays] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [themeColor, setThemeColor] = useState("#2563eb");
    const [isAddOpen, setIsAddOpen] = useState(false);

    // Delete Modal State
    const [deleteModalConfig, setDeleteModalConfig] = useState<{
        isOpen: boolean;
        title: string;
        description: string;
        onConfirm: () => Promise<void>;
    }>({
        isOpen: false,
        title: "",
        description: "",
        onConfirm: async () => {},
    });
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDeleteNode = (brgy: any) => {
        setDeleteModalConfig({
            isOpen: true,
            title: "Delete Logistics Node",
            description: `Are you sure you want to permanently delete the delivery logistics node for Brgy. ${brgy.name}? Delivery fee and SLA settings will be removed.`,
            onConfirm: async () => {
                setIsDeleting(true);
                try {
                    const res = await deleteBarangayLogistics(brgy.id);
                    if (!res.success) throw new Error(res.error);
                    toast.success(`Deleted logistics node: Brgy. ${brgy.name}`);
                    setDeleteModalConfig(prev => ({ ...prev, isOpen: false }));
                    fetchLogistics();
                } catch (error: any) {
                    toast.error(error.message || "Failed to delete logistics node");
                } finally {
                    setIsDeleting(false);
                }
            }
        });
    };

    const fetchLogistics = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getAllBarangayLogistics();
            if (res.success) {
                setBarangays(res.data || []);
            } else {
                toast.error(res.error || "Failed to load logistics data");
            }
        } catch {
            toast.error("An error occurred while fetching logistics");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchLogistics();
        getSystemSettingAction("theme_color", "#2563eb").then(res => {
            if (res.success && res.data) setThemeColor(res.data);
        });
    }, [fetchLogistics]);

    const handleUpdate = async (brgy: any) => {
        setSaving(brgy.id);
        try {
            const res = await updateBarangayLogistics(brgy.id, {
                deliveryFee: Number(brgy.deliveryFee),
                isLogisticsActive: brgy.isLogisticsActive,
                estimatedDeliveryDays: Number(brgy.estimatedDeliveryDays)
            });
            if (res.success) {
                toast.success(`Updated Brgy. ${brgy.name} Logistics`);
            } else {
                toast.error(res.error || "Update failed");
            }
        } catch {
            toast.error("An error occurred during update");
        } finally {
            setSaving(null);
        }
    };

    const handleToggleActive = async (brgy: any, newStatus: boolean) => {
        // Optimistic UI Update
        updateLocalState(brgy.id, "isLogisticsActive", newStatus);
        try {
            const res = await updateBarangayLogistics(brgy.id, {
                deliveryFee: Number(brgy.deliveryFee),
                isLogisticsActive: newStatus,
                estimatedDeliveryDays: Number(brgy.estimatedDeliveryDays)
            });
            if (res.success) {
                toast.success(`Brgy. ${brgy.name} logistics ${newStatus ? "Activated" : "Deactivated"}`);
            } else {
                // Rollback on failure
                updateLocalState(brgy.id, "isLogisticsActive", !newStatus);
                toast.error(res.error || "Failed to update status");
            }
        } catch {
            updateLocalState(brgy.id, "isLogisticsActive", !newStatus);
            toast.error("An error occurred updating logistics status");
        }
    };

    const updateLocalState = (id: string, field: string, value: any) => {
        setBarangays(prev => prev.map(b => b.id === id ? { ...b, [field]: value } : b));
    };

    const filteredBarangays = barangays.filter(b => 
        b.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div 
            className="min-h-screen bg-[#f8fafd] dark:bg-[#0c111d] p-8 space-y-8 pb-20 transition-colors duration-500"
            style={{ "--theme_color": themeColor, "--primary-theme": themeColor } as React.CSSProperties}
        >
            {/* Page Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-primary rounded-2xl shadow-lg shadow-primary/20 text-white">
                            <Truck className="w-6 h-6" />
                        </div>
                        <h1 className="text-4xl font-black italic tracking-tighter uppercase text-slate-900 dark:text-white">
                            Logistics <span className="text-primary italic">Control Panel</span>
                        </h1>
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 italic ml-14">
                        Municipal Logistics & Delivery Fee Architecture
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                        <Input 
                            placeholder="Filter by Barangay..." 
                            className="pl-11 h-12 w-[300px] bg-white dark:bg-white/5 border-slate-200 dark:border-white/5 rounded-2xl shadow-sm focus:ring-primary/20 transition-all font-bold italic"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Button 
                        onClick={fetchLogistics}
                        variant="outline"
                        className="h-12 w-12 rounded-2xl border-slate-200 dark:border-white/5 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10"
                    >
                        <RefreshCcw className={cn("w-5 h-5", loading && "animate-spin")} />
                    </Button>
                    <Button
                        onClick={() => setIsAddOpen(true)}
                        className="bg-primary hover:bg-primary/95 text-white shadow-lg shadow-primary/20 h-12 px-6 rounded-2xl font-black uppercase tracking-widest text-xs italic transition-all duration-300 hover:scale-[1.02]"
                    >
                        <Plus className="w-4 h-4 mr-2" /> Add Node
                    </Button>
                </div>
            </header>

            {/* Logistics Grid */}
            <div className="space-y-4">
                <div className="flex items-center justify-between px-4">
                    <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 italic">Barangay Fulfillment Registry</h2>
                    <Badge variant="outline" className="text-[9px] font-black uppercase bg-primary/5 text-primary border-primary/20 italic">{filteredBarangays.length} Entries</Badge>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4">
                    {loading ? (
                        Array(9).fill(0).map((_, i) => (
                            <Skeleton key={i} className="h-32 rounded-3xl bg-slate-100 dark:bg-white/5" />
                        ))
                    ) : filteredBarangays.map((brgy) => (
                        <Card key={brgy.id} className="p-5 bg-white dark:bg-slate-950/50 border-slate-200 dark:border-white/5 shadow-xl rounded-[2rem] relative overflow-hidden group hover:border-primary/30 transition-all">
                            <div className="relative z-10 space-y-5">
                                {/* Header: Name & Switch */}
                                <div className="flex items-center justify-between gap-4">
                                    <div className="space-y-1">
                                        <p className="text-[8px] font-black uppercase text-primary italic tracking-widest leading-none">Node</p>
                                        <h3 className="text-lg font-black italic uppercase tracking-tighter text-slate-900 dark:text-white leading-none truncate max-w-[150px]">
                                            {brgy.name}
                                        </h3>
                                    </div>
                                    <div className="flex items-center gap-3 bg-slate-50 dark:bg-white/5 p-2 px-3 rounded-xl">
                                        <Switch 
                                            checked={brgy.isLogisticsActive} 
                                            onCheckedChange={(val) => handleToggleActive(brgy, val)}
                                            className="scale-75 data-[state=checked]:bg-primary cursor-pointer"
                                        />
                                        <span className="text-[8px] font-black uppercase italic text-slate-500 tracking-widest">
                                            {brgy.isLogisticsActive ? "Active" : "Off"}
                                        </span>
                                    </div>
                                </div>

                                {/* Controls */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-[8px] font-black uppercase tracking-widest text-slate-400 italic ml-1">Fee (₱)</Label>
                                        <Input 
                                            type="number"
                                            value={brgy.deliveryFee}
                                            onChange={(e) => updateLocalState(brgy.id, "deliveryFee", e.target.value)}
                                            className="h-9 bg-slate-50 dark:bg-black/20 border-transparent rounded-lg font-black italic text-sm tracking-tighter focus:bg-white dark:focus:bg-black/40 transition-all"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[8px] font-black uppercase tracking-widest text-slate-400 italic ml-1">SLA (Days)</Label>
                                        <Input 
                                            type="number"
                                            value={brgy.estimatedDeliveryDays}
                                            onChange={(e) => updateLocalState(brgy.id, "estimatedDeliveryDays", e.target.value)}
                                            className="h-9 bg-slate-50 dark:bg-black/20 border-transparent rounded-lg font-black italic text-sm tracking-tighter focus:bg-white dark:focus:bg-black/40 transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Button 
                                        onClick={() => handleUpdate(brgy)}
                                        disabled={saving === brgy.id}
                                        className="flex-1 text-white rounded-xl font-black italic uppercase text-[9px] tracking-widest shadow-lg transition-none h-9 gap-2 cursor-pointer"
                                        style={{ backgroundColor: themeColor }}
                                    >
                                        {saving === brgy.id ? (
                                            <RefreshCcw className="w-3 h-3 animate-spin" />
                                        ) : (
                                            <>
                                                <Save className="w-3 h-3" /> Update Node
                                            </>
                                        )}
                                    </Button>

                                    {/* Hide delete action temporarily */}
                                    {/* <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => handleDeleteNode(brgy)}
                                        className="h-9 w-9 p-0 rounded-xl border-red-200 dark:border-red-900/30 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600 transition-colors cursor-pointer shrink-0"
                                        title="Delete Logistics Node"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </Button> */}
                                </div>
                            </div>

                            {/* Minimal Background Decor */}
                            <div className="absolute -bottom-2 -right-2 opacity-[0.03] group-hover:opacity-10 transition-opacity">
                                <Truck className="w-20 h-20 rotate-12" />
                            </div>
                        </Card>
                    ))}
                </div>
            </div>

            {/* Instruction Card */}
            <div className="max-w-2xl mx-auto">
                <Card className="p-8 bg-slate-900 rounded-[2.5rem] text-white relative overflow-hidden group shadow-2xl">
                    <div className="relative z-10 flex items-start gap-6">
                        <div className="p-4 bg-primary rounded-2xl shadow-xl shadow-primary/20">
                            <Info className="w-6 h-6" />
                        </div>
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-primary italic">Admin Protocol</h4>
                                <h3 className="text-xl font-black italic uppercase tracking-tighter">Logistics Governance</h3>
                            </div>
                            <p className="text-[11px] opacity-60 leading-relaxed font-bold uppercase tracking-tight italic">
                                Changes made to these nodes will reflect instantly in the Treasury Evaluation phase. Ensure all fees are verified against municipal mandates before finalizing configurations.
                            </p>
                        </div>
                    </div>
                </Card>
            </div>

            <AddLogisticsModal
                isOpen={isAddOpen}
                onClose={() => setIsAddOpen(false)}
                onSuccess={() => {
                    setIsAddOpen(false);
                    fetchLogistics();
                }}
            />

            {/* Confirm Delete Modal */}
            <ConfirmDeleteModal
                isOpen={deleteModalConfig.isOpen}
                onClose={() => setDeleteModalConfig(prev => ({ ...prev, isOpen: false }))}
                onConfirm={deleteModalConfig.onConfirm}
                title={deleteModalConfig.title}
                description={deleteModalConfig.description}
                isLoading={isDeleting}
            />
        </div>
    );
}
