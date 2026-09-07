 
"use client";

import React, { useState, useMemo } from "react";
import {
    Download, Plus, Trash2, Calendar,
    TrendingUp, DollarSign, Clock, Users, FileText,
    MapPin, Globe, LayoutDashboard, History, CloudLightning, Pencil,
    Layers, Info, X, Loader2
} from "lucide-react";
import {
    XAxis, YAxis, CartesianGrid,
    Tooltip as RechartsTooltip, ResponsiveContainer,
    AreaChart, Area
} from "recharts";
import { format } from "date-fns";
import { motion } from "framer-motion";
import {
    addMassSchedule, updateMassSchedule, deleteMassSchedule,
    updateChurchInfo, saveChurchCollection, deleteCollectionEntry
} from "./actions";
import { toast } from "sonner";
import { BarangaySwitcher } from "../components/BarangaySwitcher";
import { ConfirmDeleteModal } from "@/components/shared/ConfirmDeleteModal";

interface ChurchClientProps {
    initialInfo: any;
    initialSchedules: any[];
    initialCollections: any[];
    isAdmin?: boolean;
    availableBarangays?: string[];
    currentBarangay?: string;
}

export default function ChurchClient({
    initialInfo, initialSchedules, initialCollections,
    isAdmin, availableBarangays = [], currentBarangay
}: ChurchClientProps) {
    const [info, setInfo] = useState(initialInfo);
    const [schedules, setSchedules] = useState(initialSchedules);
    const [collections, setCollections] = useState(initialCollections);
    const [activeTab, setActiveTab] = useState<"dashboard" | "collections" | "schedule" | "settings">("dashboard");

    // Modal states
    const [isCollectionModalOpen, setIsCollectionModalOpen] = useState(false);
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    const [isEditInfoOpen, setIsEditInfoOpen] = useState(false);
    const [flyerFile, setFlyerFile] = useState<File | null>(null);
    const [isFlyerRemoved, setIsFlyerRemoved] = useState(false);

    const [isLoading, setIsLoading] = useState(false);

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

    // Collection Form State
    const [colForm, setColForm] = useState<{
        date: string;
        sundayMassJson: { time: string; amount: string }[];
        secondBasket: string | number;
        weekdays: string | number;
        envelopes: string | number;
        donationsJson: { name: string; amount: string }[];
    }>({
        date: format(new Date(), "yyyy-MM-dd"),
        sundayMassJson: [{ time: "6:00 AM", amount: "" }],
        secondBasket: "",
        weekdays: "",
        envelopes: "",
        donationsJson: [{ name: "", amount: "" }]
    });

    // Schedule Form State
    const [schForm, setSchForm] = useState<{
        id: string;
        day: string;
        time: string;
        language: string;
        type: string;
        date: string;
        prio: string | number;
        description: string;
    }>({
        id: "",
        day: "Sunday",
        time: "",
        language: "",
        type: "",
        date: "",
        prio: "",
        description: ""
    });

    const [editingCollection, setEditingCollection] = useState<any | null>(null);
    const [editingSchedule, setEditingSchedule] = useState<any | null>(null);

    // Clean Modal Open/Close Helpers
    const handleOpenAddSchedule = () => {
        setEditingSchedule(null);
        setSchForm({
            id: "",
            day: "Sunday",
            time: "",
            language: "",
            type: "",
            date: "",
            prio: "",
            description: ""
        });
        setIsScheduleModalOpen(true);
    };

    const handleCloseScheduleModal = () => {
        setIsScheduleModalOpen(false);
        setEditingSchedule(null);
        setSchForm({
            id: "",
            day: "Sunday",
            time: "",
            language: "",
            type: "",
            date: "",
            prio: "",
            description: ""
        });
    };

    const handleOpenAddCollection = () => {
        setEditingCollection(null);
        setColForm({
            date: format(new Date(), "yyyy-MM-dd"),
            sundayMassJson: [{ time: "6:00 AM", amount: "" }],
            secondBasket: "",
            weekdays: "",
            envelopes: "",
            donationsJson: [{ name: "", amount: "" }]
        });
        setIsCollectionModalOpen(true);
    };

    const handleCloseCollectionModal = () => {
        setIsCollectionModalOpen(false);
        setEditingCollection(null);
        setColForm({
            date: format(new Date(), "yyyy-MM-dd"),
            sundayMassJson: [{ time: "6:00 AM", amount: "" }],
            secondBasket: "",
            weekdays: "",
            envelopes: "",
            donationsJson: [{ name: "", amount: "" }]
        });
    };

    // Early return after all hooks
    if (!info) return null;

    // Graph Data Transformation
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const chartData = useMemo(() => {
        return [...collections].reverse().map(c => ({
            name: format(new Date(c.date), "MMM dd"),
            total: c.totalAmount,
            sunday: (c.sundayMassJson as any[])?.reduce((sum, item) => sum + Number(item.amount || 0), 0) || 0,
            donations: (c.donationsJson as any[])?.reduce((sum, item) => sum + Number(item.amount || 0), 0) || 0,
        }));
    }, [collections]);

    // Financial Analysis
    const totalDonationsAllTime = collections.reduce((sum, c) => sum + c.totalAmount, 0);
    const avgMonthly = totalDonationsAllTime / (collections.length || 1);

    // eslint-disable-next-line react-hooks/rules-of-hooks
    const groupedSchedules = useMemo(() => {
        const result: { day: string, slots: any[], isPriority: boolean }[] = [];

        schedules.forEach(s => {
            const isPriority = (s.prio || 0) > 0;
            const dayKey = s.date ? format(new Date(s.date), "MMMM dd, yyyy") : s.day;

            const existing = result.find(g => g.day === dayKey && g.isPriority === isPriority);
            if (existing) {
                existing.slots.push(s);
            } else {
                result.push({ day: dayKey, slots: [s], isPriority });
            }
        });

        result.forEach(g => {
            g.slots.sort((a, b) => (b.prio || 0) - (a.prio || 0));
        });

        const dayOrder = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

        return result.sort((a, b) => {
            // Priority First
            if (a.isPriority && !b.isPriority) return -1;
            if (!a.isPriority && b.isPriority) return 1;

            const idxA = dayOrder.indexOf(a.day);
            const idxB = dayOrder.indexOf(b.day);

            if (idxA !== -1 && idxB !== -1) {
                return idxA - idxB;
            }
            if (idxA !== -1) return -1;
            if (idxB !== -1) return 1;
            return 0;
        });
    }, [schedules]);

    const handleSaveCollection = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const cleanedSunday = colForm.sundayMassJson.filter(item => item.amount !== "");
            const cleanedDonations = colForm.donationsJson.filter(item => item.name !== "" && item.amount !== "");

            const payload = {
                ...colForm,
                churchInfoId: info.id,
                id: editingCollection?.id,
                sundayMassJson: cleanedSunday.map(i => ({ ...i, amount: Number(i.amount) })),
                donationsJson: cleanedDonations.map(i => ({ ...i, amount: Number(i.amount) })),
                secondBasket: Number(colForm.secondBasket),
                weekdays: Number(colForm.weekdays),
                envelopes: Number(colForm.envelopes)
            };

            const res = await saveChurchCollection(payload);

            if (!res.success) {
                toast.error(res.error || "Failed to save collection.");
                return;
            }

            const savedItem = res.data || res.collection;
            if (editingCollection) {
                setCollections(prev => prev.map(c => c.id === savedItem.id ? savedItem : c));
                toast.success("Collection record updated!");
            } else {
                setCollections(prev => [savedItem, ...prev]);
                toast.success("Collection record saved!");
            }
            setIsCollectionModalOpen(false);
            setEditingCollection(null);
            setColForm({
                date: format(new Date(), "yyyy-MM-dd"),
                sundayMassJson: [{ time: "6:00 AM", amount: "" }],
                secondBasket: "",
                weekdays: "",
                envelopes: "",
                donationsJson: [{ name: "", amount: "" }]
            });
        } catch {
            toast.error("Failed to save collection.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddOrUpdateSchedule = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            if (editingSchedule) {
                const res = await updateMassSchedule(editingSchedule.id, schForm);
                if (!res.success) {
                    toast.error(res.error || "Failed to update schedule.");
                    return;
                }
                const updated = res.data || res.schedule;
                setSchedules(prev => prev.map(s => s.id === updated.id ? updated : s));
                toast.success("Schedule updated!");
            } else {
                const res = await addMassSchedule({ ...schForm, churchInfoId: info.id });
                if (!res.success) {
                    toast.error(res.error || "Failed to add schedule.");
                    return;
                }
                const created = res.data || res.schedule;
                setSchedules(prev => [...prev, created]);
                toast.success("Schedule added!");
            }
            setIsScheduleModalOpen(false);
            setEditingSchedule(null);
            setSchForm({ id: "", day: "Sunday", time: "", language: "Ilocano", type: "Mass", date: "", prio: "", description: "" });
        } catch {
            toast.error("Failed to save schedule.");
        } finally {
            setIsLoading(false);
        }
    };

    const _handleDeleteSchedule = (id: string, label: string) => {
        setDeleteModalConfig({
            isOpen: true,
            title: "Delete Mass Schedule",
            description: `Are you sure you want to remove the mass schedule "${label}"?`,
            onConfirm: async () => {
                setIsDeleting(true);
                try {
                    const res = await deleteMassSchedule(id);
                    if (!res.success) throw new Error(res.error);
                    setSchedules(prev => prev.filter(s => s.id !== id));
                    toast.success("Schedule removed.");
                    setDeleteModalConfig(prev => ({ ...prev, isOpen: false }));
                } catch (error: any) {
                    toast.error(error.message || "Delete failed.");
                } finally {
                    setIsDeleting(false);
                }
            }
        });
    };

    const _handleDeleteCollection = (id: string, dateStr: string) => {
        setDeleteModalConfig({
            isOpen: true,
            title: "Delete Financial Record",
            description: `Are you sure you want to delete the financial collection record for "${dateStr}"?`,
            onConfirm: async () => {
                setIsDeleting(true);
                try {
                    const res = await deleteCollectionEntry(id);
                    if (!res.success) throw new Error(res.error);
                    setCollections(prev => prev.filter(c => c.id !== id));
                    toast.success("Record deleted.");
                    setDeleteModalConfig(prev => ({ ...prev, isOpen: false }));
                } catch (error: any) {
                    toast.error(error.message || "Delete failed.");
                } finally {
                    setIsDeleting(false);
                }
            }
        });
    };

    const handleUpdateInfo = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const formData = new FormData();
            formData.append("name", info.name);
            formData.append("address", info.address);
            formData.append("locationUrl", info.locationUrl || "");
            if (info.latitude) formData.append("latitude", info.latitude.toString());
            if (info.longitude) formData.append("longitude", info.longitude.toString());
            formData.append("flyerRemoved", isFlyerRemoved ? "true" : "false");
            
            if (info.flyerUrl && !isFlyerRemoved) {
                formData.append("flyerUrl", info.flyerUrl);
            }

            if (flyerFile) {
                formData.append("flyerFile", flyerFile);
            }

            const res = await updateChurchInfo(info.id, formData);
            if (!res.success) {
                toast.error(res.error || "Failed to update church info.");
                return;
            }
            const updated = res.data || res.churchInfo;
            setInfo(updated);
            setFlyerFile(null);
            setIsFlyerRemoved(false);
            setIsEditInfoOpen(false);
            toast.success("Church details updated.");
        } catch {
            toast.error("Failed to update info.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 bg-slate-50/50 dark:bg-transparent min-h-screen">
            {/* Premium Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic flex items-center">
                        {info.barangay ? (
                            <>
                                <MapPin className="mr-3 w-10 h-10" style={{ color: 'var(--primary-theme)' }} />
                                {info.barangay} Sector Records
                            </>
                        ) : (
                            <>
                                <Globe className="mr-3 w-10 h-10" style={{ color: 'var(--primary-theme)' }} />
                                Mapandan Main Parish Hub
                            </>
                        )}
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium italic">
                        {info.barangay ? `Administrative transparency for local ${info.barangay} parish works.` : "Centralized administrative ledger and global schedules for Mapandan Parish."}
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {isAdmin && (
                        <BarangaySwitcher
                            availableBarangays={availableBarangays}
                            currentBarangay={currentBarangay}
                            themeColor="#2563eb"
                        />
                    )}
                    <button
                        onClick={handleOpenAddCollection}
                        className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-2xl font-black shadow-lg shadow-emerald-500/30 transition-all select-none cursor-pointer uppercase text-xs"
                    >
                        <Plus size={18} />
                        <span>Log Collection</span>
                    </button>
                    <button
                        onClick={handleOpenAddSchedule}
                        className="flex items-center space-x-2 bg-primary hover:bg-primary/90 text-white px-5 py-3 rounded-2xl font-black shadow-lg shadow-primary/30 transition-all select-none cursor-pointer uppercase text-xs"
                    >
                        <Calendar size={18} />
                        <span>Add Schedule</span>
                    </button>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center space-x-1 bg-white dark:bg-[#151b2b] p-1.5 rounded-[2rem] border border-slate-200 dark:border-[#2a3040] w-fit shadow-xl">
                {[
                    { id: "dashboard", label: "Financial Data", icon: LayoutDashboard },
                    { id: "collections", label: "History Log", icon: History },
                    { id: "schedule", label: "Mass Schedule", icon: Clock },
                    { id: "settings", label: "Basics & Flyers", icon: FileText }
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center space-x-2 px-6 py-3 rounded-[1.5rem] text-sm font-bold transition-all ${activeTab === tab.id
                            ? "bg-blue-600 text-white shadow-lg"
                            : "text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/5"
                            }`}
                    >
                        <tab.icon size={16} />
                        <span>{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* Content Area */}
            {activeTab === "dashboard" && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Summary Cards */}
                    <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white dark:bg-[#151b2b] p-8 rounded-[2.5rem] border border-slate-200 dark:border-[#2a3040] shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-6">
                                <TrendingUp className="text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <h3 className="text-slate-500 dark:text-slate-400 text-xs font-black uppercase tracking-widest mb-1 italic">Monthly Average</h3>
                            <p className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter italic">₱{avgMonthly.toLocaleString()}</p>
                        </div>

                        <div className="bg-white dark:bg-[#151b2b] p-8 rounded-[2.5rem] border border-slate-200 dark:border-[#2a3040] shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-500/10 rounded-2xl flex items-center justify-center mb-6">
                                <DollarSign className="text-blue-600 dark:text-blue-400" />
                            </div>
                            <h3 className="text-slate-500 dark:text-slate-400 text-xs font-black uppercase tracking-widest mb-1 italic">Latest Collection</h3>
                            <p className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter italic">₱{(collections[0]?.totalAmount || 0).toLocaleString()}</p>
                        </div>

                        <div className="bg-white dark:bg-[#151b2b] p-8 rounded-[2.5rem] border border-slate-200 dark:border-[#2a3040] shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-slate-500/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-500/10 rounded-2xl flex items-center justify-center mb-6">
                                <Users className="text-slate-600 dark:text-slate-400" />
                            </div>
                            <h3 className="text-slate-500 dark:text-slate-400 text-xs font-black uppercase tracking-widest mb-1 italic">Records Collected</h3>
                            <p className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter italic">{collections.length} Weeks</p>
                        </div>
                    </div>

                    {/* Chart Section */}
                    <div className="lg:col-span-3 bg-white dark:bg-[#151b2b] p-8 rounded-[3rem] border border-slate-200 dark:border-[#2a3040] shadow-2xl shadow-blue-500/5 ring-1 ring-slate-200 dark:ring-white/5">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight">Donation Trends</h3>
                            <div className="flex items-center space-x-4">
                                <div className="flex items-center space-x-2">
                                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Sunday Masses</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Donations</span>
                                </div>
                            </div>
                        </div>
                        <div className="h-[400px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorDonations" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f033" />
                                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} fontWeight="bold" />
                                    <YAxis stroke="#94a3b8" fontSize={10} fontWeight="bold" />
                                    <RechartsTooltip
                                        contentStyle={{ backgroundColor: "#0f172a", borderRadius: "1rem", border: "1px solid #1e293b" }}
                                        itemStyle={{ color: "#fff", fontWeight: "bold" }}
                                    />
                                    <Area type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
                                    <Area type="monotone" dataKey="donations" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorDonations)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === "collections" && (
                <div className="bg-white dark:bg-[#151b2b] rounded-[3rem] border border-slate-200 dark:border-[#2a3040] shadow-2xl overflow-hidden shadow-blue-500/5 ring-1 ring-slate-200 dark:ring-white/5">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-[#2a3040] bg-slate-50/50 dark:bg-[#1a2133]">
                                    <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Log Date</th>
                                    <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Sunday Masses</th>
                                    <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Others (Envelopes, etc)</th>
                                    <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Total Amount</th>
                                    <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-[#2a3040]">
                                {collections.map(c => (
                                    <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors group">
                                        <td className="p-6">
                                            <div className="font-black text-slate-900 dark:text-white uppercase italic tracking-tighter text-lg">{format(new Date(c.date), "MMM dd, yyyy")}</div>
                                            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Logged at {format(new Date(c.createdAt), "HH:mm")}</div>
                                        </td>
                                        <td className="p-6">
                                            <div className="flex flex-wrap gap-2 text-xs">
                                                {(c.sundayMassJson as any[])?.map((m, i) => (
                                                    <span key={i} className="px-2 py-1 rounded-lg bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 font-bold">
                                                        {m.time}: ₱{m.amount.toLocaleString()}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            <div className="space-y-1 text-xs font-medium text-slate-500">
                                                <p>Basket 2: <span className="text-slate-900 dark:text-slate-300 font-bold">₱{c.secondBasket.toLocaleString()}</span></p>
                                                <p>Weekdays: <span className="text-slate-900 dark:text-slate-300 font-bold">₱{c.weekdays.toLocaleString()}</span></p>
                                                <p>Envelopes: <span className="text-slate-900 dark:text-slate-300 font-bold">₱{c.envelopes.toLocaleString()}</span></p>
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 tracking-tighter italic">₱{c.totalAmount.toLocaleString()}</div>
                                        </td>
                                        <td className="p-6 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => {
                                                        setEditingCollection(c);
                                                        setColForm({
                                                            date: format(new Date(c.date), "yyyy-MM-dd"),
                                                            sundayMassJson: (c.sundayMassJson as any[]).map(s => ({ ...s, amount: s.amount.toString() })),
                                                            secondBasket: c.secondBasket,
                                                            weekdays: c.weekdays,
                                                            envelopes: c.envelopes,
                                                            donationsJson: (c.donationsJson as any[]).map(d => ({ ...d, amount: d.amount.toString() }))
                                                        });
                                                        setIsCollectionModalOpen(true);
                                                    }}
                                                    className="p-3 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-2xl transition-colors"
                                                >
                                                    <Pencil size={18} />
                                                </button>
                                                {/* Hide delete action temporarily */}
                                                {/* <button 
                                                    onClick={() => handleDeleteCollection(c.id, format(new Date(c.date), "MMM dd, yyyy"))} 
                                                    className="p-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-2xl transition-colors cursor-pointer"
                                                >
                                                    <Trash2 size={18} />
                                                </button> */}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === "schedule" && (
                <div className="space-y-12">
                    <div className="bg-white dark:bg-[#0f1117] rounded-[3.5rem] border border-slate-200 dark:border-white/5 shadow-2xl overflow-hidden p-10 ring-1 ring-slate-200 dark:ring-white/5">
                        <div className="flex items-center justify-between mb-10">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-500/10">
                                    <Clock className="w-5 h-5 text-blue-500" />
                                </div>
                                <h3 className="text-2xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white"> Timetable</h3>
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Management Mode</span>
                        </div>

                        <div className="space-y-6 max-h-[750px] overflow-y-auto custom-scrollbar pr-2 pb-6">
                            {groupedSchedules.map((group, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, y: 10 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                    className={`rounded-[2.5rem] border overflow-hidden ${group.isPriority ? 'bg-slate-900 border-white/10 ring-2 ring-amber-500/20' : 'bg-slate-50 dark:bg-white/5 border-slate-100 dark:border-white/5'}`}
                                >
                                    <div className={`${group.isPriority ? 'bg-white/5' : 'bg-slate-100 dark:bg-white/5'} px-8 py-4 flex items-center justify-between border-b border-white/5`}>
                                        <div className="flex items-center gap-2">
                                            <Calendar className={`w-4 h-4 ${group.isPriority ? 'text-amber-500' : 'text-blue-500'}`} />
                                            <span className={`text-[10px] font-black uppercase italic tracking-widest ${group.isPriority ? 'text-amber-500' : 'text-slate-900 dark:text-white'}`}>
                                                {group.day} {group.isPriority ? '• Highlight' : ''}
                                            </span>
                                        </div>
                                        <span className={`text-[9px] font-black uppercase tracking-widest italic ${group.isPriority ? 'text-white/30' : 'text-slate-400'}`}>
                                            ECCLESIASTICAL ORDER
                                        </span>
                                    </div>
                                    <div className="p-8 space-y-6">
                                        {group.slots.map((s, sIdx) => {
                                            const isPriority = (s.prio || 0) > 0;
                                            return (
                                                <div key={sIdx} className={`relative pl-8 border-l-2 last:border-0 pb-4 ${isPriority ? 'border-amber-500/50' : 'border-blue-500/20'}`}>
                                                    <div className={`absolute top-0 left-[-5px] w-2.5 h-2.5 rounded-full ${isPriority ? 'bg-amber-500 scale-125 shadow-[0_0_15px_rgba(245,158,11,0.5)]' : 'bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.5)]'}`} />
                                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                                        <div className="space-y-2 flex-1">
                                                            <div className="flex items-center gap-3">
                                                                <p className={`text-4xl font-black tracking-tighter uppercase italic leading-none ${group.isPriority ? 'text-white' : 'text-slate-900 dark:text-white'}`}>{s.time}</p>
                                                            </div>
                                                            {s.description && (
                                                                <div className="flex items-start gap-2 opacity-90">
                                                                    <Info className="w-3.5 h-3.5 text-blue-500 mt-1 shrink-0" />
                                                                    <p className={`text-xs italic font-medium leading-relaxed ${group.isPriority ? 'text-slate-400' : 'text-slate-500 dark:text-slate-400'}`}>{s.description}</p>
                                                                </div>
                                                            )}
                                                            <div className="flex items-center gap-3 mt-4">
                                                                <span className="px-3 py-1.5 rounded-xl bg-slate-950/50 text-[9px] font-black text-blue-400 uppercase tracking-widest italic border border-blue-500/20">{s.language || "English"}</span>
                                                                <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest italic border ${group.isPriority ? 'bg-white/10 border-white/20 text-white/50' : 'bg-white/50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400'}`}>{s.type || "Holy Mass"}</span>
                                                            </div>
                                                        </div>

                                                        {/* Management Actions */}
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={() => {
                                                                    setEditingSchedule(s);
                                                                    setSchForm({
                                                                        id: s.id,
                                                                        day: s.day,
                                                                        time: s.time,
                                                                        language: s.language || "",
                                                                        type: s.type || "",
                                                                        prio: s.prio || 0,
                                                                        date: s.date ? format(new Date(s.date), "yyyy-MM-dd") : "",
                                                                        description: s.description || ""
                                                                    });
                                                                    setIsScheduleModalOpen(true);
                                                                }}
                                                                className="w-12 h-12 flex items-center justify-center text-blue-500 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-blue-600 hover:text-white rounded-[1.2rem] transition-all shadow-sm group/btn cursor-pointer"
                                                                title="Edit Slot"
                                                            >
                                                                <Pencil size={18} className="group-hover/btn:scale-110 transition-transform" />
                                                            </button>
                                                            {/* Hide delete action temporarily */}
                                                            {/* <button
                                                                onClick={() => handleDeleteSchedule(s.id, `${s.day} ${s.time}`)}
                                                                className="w-12 h-12 flex items-center justify-center text-red-500 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-red-600 hover:text-white rounded-[1.2rem] transition-all shadow-sm group/btn cursor-pointer"
                                                                title="Delete Slot"
                                                            >
                                                                <Trash2 size={18} className="group-hover/btn:scale-110 transition-transform" />
                                                            </button> */}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === "settings" && (
                <div className="max-w-4xl space-y-8">
                    <div className="bg-white dark:bg-[#151b2b] p-10 rounded-[3rem] border border-slate-200 dark:border-[#2a3040] shadow-2xl relative overflow-hidden ring-1 ring-slate-200 dark:ring-white/5">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight">Parish Identity</h3>
                            <button onClick={() => setIsEditInfoOpen(true)} className="px-6 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-950 rounded-xl text-sm font-black uppercase italic tracking-tighter transition-all">Edit Basics</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                            <div className="space-y-6">
                                <div>
                                    <p className="text-xs font-black uppercase tracking-widest text-slate-500 italic mb-1">Official Church Name</p>
                                    <p className="text-xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight">{info.name}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-black uppercase tracking-widest text-slate-500 italic mb-1">Physical Address</p>
                                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 font-medium italic">
                                        <MapPin size={16} />
                                        <span>{info.address}</span>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-xs font-black uppercase tracking-widest text-slate-500 italic mb-1">Interactive Map Link</p>
                                    <div className="flex items-center gap-2 text-blue-600 font-bold italic truncate">
                                        <Globe size={16} />
                                        <span className="truncate">{info.locationUrl || "Not set"}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="p-8 bg-blue-50 dark:bg-blue-500/5 rounded-[2rem] border border-blue-100 dark:border-blue-500/20 flex flex-col items-center justify-center text-center space-y-4">
                                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-500/10 rounded-3xl flex items-center justify-center">
                                    <FileText className="text-blue-600 dark:text-blue-400 w-8 h-8" />
                                </div>
                                <div className="space-y-1">
                                    <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase italic tracking-tight">Active Mass Flyer</h4>
                                    <p className="text-xs text-slate-500 font-medium italic">All users can download this PDF in the landing page.</p>
                                </div>
                                {info.flyerUrl ? (
                                    <a href={info.flyerUrl} target="_blank" className="flex items-center gap-2 text-blue-600 font-black uppercase italic text-sm hover:underline">
                                        <Download size={16} />
                                        <span>Download PDF</span>
                                    </a>
                                ) : (
                                    <p className="text-amber-600 text-xs font-bold uppercase tracking-widest italic">No Flyer Uploaded</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODALS */}

            {/* Collection Logger Modal */}
            {isCollectionModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200" onClick={handleCloseCollectionModal}>
                    <div className="bg-white dark:bg-[#151b2b] rounded-[3rem] border border-slate-200 dark:border-[#2a3040] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="p-10 border-b border-slate-200 dark:border-[#2a3040] flex justify-between items-start">
                            <div>
                                <h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white">
                                    {editingCollection ? "Edit Financial Entry" : "Log Financial Record"}
                                </h2>
                                <p className="text-slate-500 text-sm font-medium italic mt-1">
                                    {editingCollection ? `Updating record for ${format(new Date(editingCollection.date), "MMMM dd")}` : "Add Sunday masses, donations, and other parish income."}
                                </p>
                            </div>
                            <button onClick={handleCloseCollectionModal} className="p-3 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors text-slate-400 cursor-pointer">
                                <Plus className="rotate-45" size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleSaveCollection} className="p-10 max-h-[70vh] overflow-y-auto custom-scrollbar space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 italic">Record Date</label>
                                    <input
                                        required
                                        type="date"
                                        value={colForm.date}
                                        onChange={e => setColForm({ ...colForm, date: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-[#1e2330] border border-slate-200 dark:border-[#2a3040] rounded-2xl px-5 py-4 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                            </div>

                            {/* Sunday Mass Rows */}
                            <div className="space-y-4">
                                <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest italic">Sunday Mass Collections (per Time Slot)</p>
                                {colForm.sundayMassJson.map((slot, idx) => (
                                    <div key={idx} className="flex gap-4">
                                        <input
                                            placeholder="Time (e.g. 6AM)"
                                            value={slot.time}
                                            onChange={e => {
                                                const news = [...colForm.sundayMassJson];
                                                news[idx].time = e.target.value;
                                                setColForm({ ...colForm, sundayMassJson: news });
                                            }}
                                            className="flex-1 bg-slate-50 dark:bg-[#1e2330] border border-slate-200 dark:border-[#2a3040] rounded-xl px-4 py-3 text-sm font-bold"
                                        />
                                        <input
                                            type="number"
                                            placeholder="Amount"
                                            value={slot.amount}
                                            onChange={e => {
                                                const news = [...colForm.sundayMassJson];
                                                news[idx].amount = e.target.value;
                                                setColForm({ ...colForm, sundayMassJson: news });
                                            }}
                                            className="w-32 bg-slate-50 dark:bg-[#1e2330] border border-slate-200 dark:border-[#2a3040] rounded-xl px-4 py-3 text-sm font-bold"
                                        />
                                        {idx > 0 && (
                                            <button type="button" onClick={() => {
                                                setColForm({ ...colForm, sundayMassJson: colForm.sundayMassJson.filter((_, i) => i !== idx) });
                                            }} className="p-2 text-red-500 cursor-pointer"><Trash2 size={16} /></button>
                                        )}
                                    </div>
                                ))}
                                <button type="button" onClick={() => setColForm({ ...colForm, sundayMassJson: [...colForm.sundayMassJson, { time: "", amount: "" }] })} className="text-[10px] font-black text-blue-500 uppercase italic hover:underline cursor-pointer">+ Add Time Slot</button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 italic">Basket 2</label>
                                    <input 
                                        type="number" 
                                        placeholder="0"
                                        value={colForm.secondBasket} 
                                        onChange={e => setColForm({ ...colForm, secondBasket: e.target.value })} 
                                        className="w-full bg-slate-50 dark:bg-[#1e2330] border border-slate-200 dark:border-[#2a3040] rounded-xl px-4 py-3 text-sm font-bold" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 italic">Weekdays</label>
                                    <input 
                                        type="number" 
                                        placeholder="0"
                                        value={colForm.weekdays} 
                                        onChange={e => setColForm({ ...colForm, weekdays: e.target.value })} 
                                        className="w-full bg-slate-50 dark:bg-[#1e2330] border border-slate-200 dark:border-[#2a3040] rounded-xl px-4 py-3 text-sm font-bold" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 italic">Envelopes</label>
                                    <input 
                                        type="number" 
                                        placeholder="0"
                                        value={colForm.envelopes} 
                                        onChange={e => setColForm({ ...colForm, envelopes: e.target.value })} 
                                        className="w-full bg-slate-50 dark:bg-[#1e2330] border border-slate-200 dark:border-[#2a3040] rounded-xl px-4 py-3 text-sm font-bold" 
                                    />
                                </div>
                            </div>

                            {/* Donations Rows */}
                            <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-[#2a3040]">
                                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest italic">Specific Donations (Name and Amount)</p>
                                {colForm.donationsJson.map((d, idx) => (
                                    <div key={idx} className="flex gap-4">
                                        <input
                                            placeholder="Donor Name"
                                            value={d.name}
                                            onChange={e => {
                                                const news = [...colForm.donationsJson];
                                                news[idx].name = e.target.value;
                                                setColForm({ ...colForm, donationsJson: news });
                                            }}
                                            className="flex-1 bg-slate-50 dark:bg-[#1e2330] border border-slate-200 dark:border-[#2a3040] rounded-xl px-4 py-3 text-sm font-bold"
                                        />
                                        <input
                                            type="number"
                                            placeholder="Amount"
                                            value={d.amount}
                                            onChange={e => {
                                                const news = [...colForm.donationsJson];
                                                news[idx].amount = e.target.value;
                                                setColForm({ ...colForm, donationsJson: news });
                                            }}
                                            className="w-32 bg-slate-50 dark:bg-[#1e2330] border border-slate-200 dark:border-[#2a3040] rounded-xl px-4 py-3 text-sm font-bold"
                                        />
                                        {idx > 0 && (
                                            <button type="button" onClick={() => {
                                                setColForm({ ...colForm, donationsJson: colForm.donationsJson.filter((_, i) => i !== idx) });
                                            }} className="p-2 text-red-500 cursor-pointer"><Trash2 size={16} /></button>
                                        )}
                                    </div>
                                ))}
                                <button type="button" onClick={() => setColForm({ ...colForm, donationsJson: [...colForm.donationsJson, { name: "", amount: "" }] })} className="text-[10px] font-black text-emerald-500 uppercase italic hover:underline cursor-pointer">+ Add Donation</button>
                            </div>

                            <div className="flex items-center justify-end space-x-4 pt-10">
                                <button type="button" onClick={handleCloseCollectionModal} disabled={isLoading} className="px-8 py-4 rounded-2xl text-sm font-black text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors uppercase italic cursor-pointer disabled:opacity-50">Cancel</button>
                                <button type="submit" disabled={isLoading} className="px-8 py-4 rounded-2xl text-sm font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl shadow-emerald-500/30 transition-all disabled:opacity-75 uppercase italic cursor-pointer flex items-center justify-center gap-2">
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span>Saving Ledger...</span>
                                        </>
                                    ) : (
                                        <span>{editingCollection ? "Update Historical Entry" : "Post to Transparency Ledger"}</span>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Schedule Modal */}
            {isScheduleModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200" onClick={handleCloseScheduleModal}>
                    <div className="bg-white dark:bg-[#151b2b] rounded-[3rem] border border-slate-200 dark:border-[#2a3040] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="p-10 border-b border-slate-200 dark:border-[#2a3040] flex justify-between items-start">
                            <h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white">
                                {editingSchedule ? "Edit Schedule Slot" : "Add Mass Schedule"}
                            </h2>
                            <button onClick={handleCloseScheduleModal} className="p-3 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors text-slate-400 cursor-pointer">
                                <Plus className="rotate-45" size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleAddOrUpdateSchedule} className="p-10 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 italic flex items-center gap-1">
                                        <Calendar size={10} /> Specific Date (Optional)
                                    </label>
                                    <div className="relative flex items-center">
                                        <input 
                                            type="date" 
                                            value={schForm.date} 
                                            onChange={e => setSchForm({ ...schForm, date: e.target.value })} 
                                            className="w-full bg-slate-50 dark:bg-[#1e2330] border border-slate-200 dark:border-[#2a3040] rounded-xl px-4 py-3 font-bold text-xs pr-8" 
                                        />
                                        {schForm.date && (
                                            <button
                                                type="button"
                                                onClick={() => setSchForm({ ...schForm, date: "" })}
                                                className="absolute right-2 p-1.5 rounded-full hover:bg-red-500/10 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                                                title="Clear specific date"
                                            >
                                                <X size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 italic flex items-center gap-1">
                                        <Layers size={10} /> Priority (Higher = Top)
                                    </label>
                                    <input 
                                        type="number" 
                                        placeholder="0"
                                        value={schForm.prio} 
                                        onChange={e => setSchForm({ ...schForm, prio: e.target.value })} 
                                        className="w-full bg-slate-50 dark:bg-[#1e2330] border border-slate-200 dark:border-[#2a3040] rounded-xl px-4 py-3 font-bold text-xs" 
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 italic">Standard Day of Week</label>
                                <div className="relative">
                                    <select 
                                        value={schForm.day} 
                                        onChange={e => setSchForm({ ...schForm, day: e.target.value })} 
                                        className="w-full appearance-none bg-slate-50 dark:bg-[#1e2330] border border-slate-200 dark:border-[#2a3040] rounded-xl px-4 py-3 font-bold text-sm text-slate-900 dark:text-white cursor-pointer focus:ring-2 focus:ring-blue-500 outline-none transition-all pr-10"
                                    >
                                        {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map(d => (
                                            <option key={d} value={d} className="bg-white dark:bg-[#151b2b] text-slate-900 dark:text-white font-bold py-2">
                                                {d}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"></path>
                                        </svg>
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 italic">Time Slot</label>
                                    <input 
                                        required 
                                        placeholder="e.g. 6:00 AM" 
                                        value={schForm.time} 
                                        onChange={e => setSchForm({ ...schForm, time: e.target.value })} 
                                        className="w-full bg-slate-50 dark:bg-[#1e2330] border border-slate-200 dark:border-[#2a3040] rounded-xl px-4 py-3 font-bold text-sm text-slate-900 dark:text-white placeholder:text-slate-400 placeholder:font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 italic">Language</label>
                                    <input 
                                        placeholder="e.g. Ilocano / English / Tagalog" 
                                        value={schForm.language} 
                                        onChange={e => setSchForm({ ...schForm, language: e.target.value })} 
                                        className="w-full bg-slate-50 dark:bg-[#1e2330] border border-slate-200 dark:border-[#2a3040] rounded-xl px-4 py-3 font-bold text-sm text-slate-900 dark:text-white placeholder:text-slate-400 placeholder:font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 italic">Service Type</label>
                                <input 
                                    placeholder="e.g. Mass / Novena / Baptism / Confession" 
                                    value={schForm.type} 
                                    onChange={e => setSchForm({ ...schForm, type: e.target.value })} 
                                    className="w-full bg-slate-50 dark:bg-[#1e2330] border border-slate-200 dark:border-[#2a3040] rounded-xl px-4 py-3 font-bold text-sm text-slate-900 dark:text-white placeholder:text-slate-400 placeholder:font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 italic flex items-center gap-1">
                                    <Info size={10} /> Description
                                </label>
                                <textarea
                                    value={schForm.description}
                                    onChange={e => setSchForm({ ...schForm, description: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-[#1e2330] border border-slate-200 dark:border-[#2a3040] rounded-xl px-4 py-3 font-medium text-sm text-slate-900 dark:text-white placeholder:text-slate-400 placeholder:font-medium italic h-24 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    placeholder="e.g. Feast of the Holy Rosary / Healing Mass"
                                />
                            </div>
                            <div className="flex items-center justify-end space-x-4 pt-6">
                                <button type="button" onClick={handleCloseScheduleModal} disabled={isLoading} className="px-8 py-4 rounded-2xl text-sm font-black text-slate-500 uppercase italic cursor-pointer disabled:opacity-50">Cancel</button>
                                <button type="submit" disabled={isLoading} className="px-8 py-4 rounded-2xl text-sm font-black bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-500/30 transition-all disabled:opacity-75 uppercase italic cursor-pointer flex items-center justify-center gap-2">
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span>Saving Slot...</span>
                                        </>
                                    ) : (
                                        <span>{editingSchedule ? "Update Slot" : "Save Slot"}</span>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Info Edit Modal */}
            {isEditInfoOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200" onClick={() => setIsEditInfoOpen(false)}>
                    <div className="bg-white dark:bg-[#151b2b] rounded-[3rem] border border-slate-200 dark:border-[#2a3040] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="p-10 border-b border-slate-200 dark:border-[#2a3040] flex justify-between items-start">
                            <h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white">
                                Church Identity
                            </h2>
                            <button onClick={() => setIsEditInfoOpen(false)} className="p-3 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors text-slate-400">
                                <Plus className="rotate-45" size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleUpdateInfo} className="p-10 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 italic">Parish Name</label>
                                <input value={info.name} onChange={e => setInfo({ ...info, name: e.target.value })} className="w-full bg-slate-50 dark:bg-[#1e2330] border border-slate-200 dark:border-[#2a3040] rounded-xl px-4 py-3 font-bold" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 italic">Official Address</label>
                                <input value={info.address} onChange={e => setInfo({ ...info, address: e.target.value })} className="w-full bg-slate-50 dark:bg-[#1e2330] border border-slate-200 dark:border-[#2a3040] rounded-xl px-4 py-3 font-bold" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 italic">Map Link / Location URL (Google Maps)</label>
                                <input
                                    value={info.locationUrl || ""}
                                    onChange={e => {
                                        const url = e.target.value;
                                        // Attempt to extract latitude and longitude from common Google Maps URL formats
                                        const locationMatch = url.match(/@([-0-9.]+),([-0-9.]+)/) ||
                                            url.match(/query=([-0-9.]+),([-0-9.]+)/) ||
                                            url.match(/ll=([-0-9.]+),([-0-9.]+)/) ||
                                            url.match(/lat=([-0-9.]+)&lng=([-0-9.]+)/);

                                        const stateUpdate: any = { ...info, locationUrl: url };
                                        if (locationMatch && locationMatch.length >= 3) {
                                            stateUpdate.latitude = parseFloat(locationMatch[1]);
                                            stateUpdate.longitude = parseFloat(locationMatch[2]);
                                        }
                                        setInfo(stateUpdate);
                                    }}
                                    className="w-full bg-slate-50 dark:bg-[#1e2330] border border-slate-200 dark:border-[#2a3040] rounded-xl px-4 py-3 font-bold"
                                    placeholder="Paste Google Maps link here"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 italic">Latitude</label>
                                    <input type="number" step="any" value={info.latitude || ""} onChange={e => setInfo({ ...info, latitude: e.target.value ? parseFloat(e.target.value) : undefined })} className="w-full bg-slate-50 dark:bg-[#1e2330] border border-slate-200 dark:border-[#2a3040] rounded-xl px-4 py-3 font-bold" placeholder="e.g. 16.0354" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 italic">Longitude</label>
                                    <input type="number" step="any" value={info.longitude || ""} onChange={e => setInfo({ ...info, longitude: e.target.value ? parseFloat(e.target.value) : undefined })} className="w-full bg-slate-50 dark:bg-[#1e2330] border border-slate-200 dark:border-[#2a3040] rounded-xl px-4 py-3 font-bold" placeholder="e.g. 120.4431" />
                                </div>
                            </div>
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Current / Uploaded Flyer</label>
                                    {(info.flyerUrl || flyerFile) && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setFlyerFile(null);
                                                setIsFlyerRemoved(true);
                                                setInfo({ ...info, flyerUrl: "" });
                                            }}
                                            className="text-[10px] font-bold text-red-500 hover:text-red-600 flex items-center gap-1 cursor-pointer transition-colors"
                                        >
                                            <X size={12} /> Remove Flyer
                                        </button>
                                    )}
                                </div>
                                <div className="relative group">
                                    <input
                                        type="file"
                                        accept="application/pdf,image/*"
                                        onChange={e => {
                                            setIsFlyerRemoved(false);
                                            setFlyerFile(e.target.files?.[0] || null);
                                        }}
                                        className="w-full bg-slate-50 dark:bg-[#1e2330] border border-dashed border-slate-300 dark:border-[#2a3040] rounded-xl px-4 py-8 text-sm font-bold text-slate-500 cursor-pointer file:hidden text-center hover:border-blue-500 transition-all"
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        {flyerFile ? (
                                            <div className="flex items-center gap-2 text-blue-600">
                                                <FileText size={18} />
                                                <span className="truncate max-w-[200px]">{flyerFile.name}</span>
                                            </div>
                                        ) : info.flyerUrl && !isFlyerRemoved ? (
                                            <div className="flex items-center gap-2 text-emerald-600 font-bold">
                                                <FileText size={18} />
                                                <span className="truncate max-w-[200px]">Flyer Attached (Click to replace)</span>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center gap-1 opacity-50">
                                                <CloudLightning size={24} className="mb-1" />
                                                <span>Click to select PDF or image flyer</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center justify-end space-x-4 pt-6">
                                <button type="button" onClick={() => setIsEditInfoOpen(false)} className="px-8 py-4 rounded-2xl text-sm font-black text-slate-500 uppercase italic cursor-pointer">Cancel</button>
                                <button type="submit" disabled={isLoading} className="px-8 py-4 rounded-2xl text-sm font-black bg-blue-600 text-white shadow-xl shadow-blue-500/30 transition-all uppercase italic cursor-pointer">
                                    {isLoading ? "Updating..." : "Update Parish Info"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* 7. CONFIRM DELETE MODAL */}
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
