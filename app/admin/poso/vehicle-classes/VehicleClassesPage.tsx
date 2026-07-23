"use client";

import React, { useState } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
    Car,
    Plus,
    Search,
    RefreshCw,
    Edit3,
    Truck,
    Shield,
    CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import {
    getVehicleClassifications,
    addVehicleClassification,
    updateVehicleClassification,
    toggleVehicleClassificationStatus,
} from "@/app/admin/poso/actions";

export interface VehicleClassItem {
    id: string;
    code: string;
    className: string;
    description: string | null;
    impoundFee: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

interface VehicleClassesPageProps {
    initialClassifications: VehicleClassItem[];
}

export default function VehicleClassesPage({ initialClassifications }: VehicleClassesPageProps) {
    const [classifications, setClassifications] = useState<VehicleClassItem[]>(initialClassifications);
    const [search, setSearch] = useState("");
    const [isPending, setIsPending] = useState(false);

    // Modal States
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<VehicleClassItem | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // Form fields
    const [addCode, setAddCode] = useState("");
    const [addClassName, setAddClassName] = useState("");
    const [addDescription, setAddDescription] = useState("");
    const [addImpoundFee, setAddImpoundFee] = useState("");

    const [editClassName, setEditClassName] = useState("");
    const [editDescription, setEditDescription] = useState("");
    const [editImpoundFee, setEditImpoundFee] = useState("");

    const refreshData = async () => {
        setIsPending(true);
        try {
            const res = await getVehicleClassifications(false);
            if (res.success && res.classifications) {
                setClassifications(res.classifications);
            }
        } catch {
            toast.error("Failed to refresh vehicle classifications.");
        } finally {
            setIsPending(false);
        }
    };

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearch(e.target.value);
    };

    const filteredList = classifications.filter((item) => {
        const query = search.toLowerCase().trim();
        if (!query) return true;
        return (
            item.code.toLowerCase().includes(query) ||
            item.className.toLowerCase().includes(query) ||
            (item.description && item.description.toLowerCase().includes(query))
        );
    });

    const handleOpenAdd = () => {
        setAddCode("");
        setAddClassName("");
        setAddDescription("");
        setAddImpoundFee("");
        setIsAddOpen(true);
    };

    const handleOpenEdit = (item: VehicleClassItem) => {
        setSelectedItem(item);
        setEditClassName(item.className);
        setEditDescription(item.description || "");
        setEditImpoundFee(item.impoundFee.toString());
        setIsEditOpen(true);
    };

    const handleAddSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!addCode || !addClassName) {
            toast.error("Code and Class Name are required.");
            return;
        }

        setSubmitting(true);
        try {
            const formData = new FormData();
            formData.append("code", addCode);
            formData.append("className", addClassName);
            formData.append("description", addDescription);
            formData.append("impoundFee", addImpoundFee || "0");

            const res = await addVehicleClassification(formData);
            if (res.success) {
                toast.success("Vehicle Classification added successfully!");
                setIsAddOpen(false);
                refreshData();
            } else {
                toast.error(res.error || "Failed to add classification.");
            }
        } catch {
            toast.error("An unexpected error occurred.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedItem || !editClassName) {
            toast.error("Class Name is required.");
            return;
        }

        setSubmitting(true);
        try {
            const formData = new FormData();
            formData.append("id", selectedItem.id);
            formData.append("className", editClassName);
            formData.append("description", editDescription);
            formData.append("impoundFee", editImpoundFee || "0");

            const res = await updateVehicleClassification(formData);
            if (res.success) {
                toast.success("Vehicle Classification updated successfully!");
                setIsEditOpen(false);
                refreshData();
            } else {
                toast.error(res.error || "Failed to update classification.");
            }
        } catch {
            toast.error("An unexpected error occurred.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleToggleStatus = async (item: VehicleClassItem) => {
        try {
            const res = await toggleVehicleClassificationStatus(item.id, !item.isActive);
            if (res.success) {
                toast.success(`Classification ${!item.isActive ? "activated" : "deactivated"}!`);
                setClassifications((prev) =>
                    prev.map((c) => (c.id === item.id ? { ...c, isActive: !item.isActive } : c))
                );
            } else {
                toast.error(res.error || "Failed to update status.");
            }
        } catch {
            toast.error("Failed to toggle status.");
        }
    };

    const activeCount = classifications.filter((c) => c.isActive).length;
    const avgFee = classifications.length > 0
        ? classifications.reduce((sum, c) => sum + c.impoundFee, 0) / classifications.length
        : 0;

    return (
        <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center space-x-3">
                        <div className="p-3 bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 rounded-2xl">
                            <Car className="w-8 h-8 stroke-[2]" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black uppercase tracking-tight text-slate-900 dark:text-white italic">
                                Vehicle Classifications
                            </h1>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium italic mt-0.5">
                                POSO Masterlist & Standard Impound Fine Schedule
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center space-x-3">
                    <Button
                        onClick={refreshData}
                        variant="outline"
                        disabled={isPending}
                        className="rounded-2xl border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 font-bold text-xs"
                    >
                        <RefreshCw className={`w-4 h-4 mr-2 ${isPending ? "animate-spin text-amber-500" : ""}`} />
                        Refresh
                    </Button>
                    <Button
                        onClick={handleOpenAdd}
                        className="bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-2xl text-xs shadow-lg shadow-amber-600/20"
                    >
                        <Plus className="w-4 h-4 mr-2" /> Add Vehicle Class
                    </Button>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-[#151b2b] p-6 rounded-3xl border border-slate-200 dark:border-[#2a3040] shadow-sm flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Vehicle Classes</span>
                        <p className="text-3xl font-black text-slate-900 dark:text-white italic mt-1">{classifications.length}</p>
                    </div>
                    <div className="p-3.5 bg-blue-500/10 text-blue-600 rounded-2xl">
                        <Truck className="w-6 h-6 stroke-[2]" />
                    </div>
                </div>

                <div className="bg-white dark:bg-[#151b2b] p-6 rounded-3xl border border-slate-200 dark:border-[#2a3040] shadow-sm flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Active Classifications</span>
                        <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400 italic mt-1">{activeCount}</p>
                    </div>
                    <div className="p-3.5 bg-emerald-500/10 text-emerald-600 rounded-2xl">
                        <CheckCircle2 className="w-6 h-6 stroke-[2]" />
                    </div>
                </div>

                <div className="bg-white dark:bg-[#151b2b] p-6 rounded-3xl border border-slate-200 dark:border-[#2a3040] shadow-sm flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Avg. Impound Fine</span>
                        <p className="text-3xl font-black text-amber-600 dark:text-amber-400 italic mt-1">
                            ₱ {avgFee.toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </p>
                    </div>
                    <div className="p-3.5 bg-amber-500/10 text-amber-600 rounded-2xl">
                        <Shield className="w-6 h-6 stroke-[2]" />
                    </div>
                </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="bg-white dark:bg-[#151b2b] p-6 rounded-3xl border border-slate-200 dark:border-[#2a3040] shadow-sm space-y-4">
                <div className="relative max-w-md">
                    <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                        value={search}
                        onChange={handleSearchChange}
                        placeholder="Search class code, name, or vehicle types..."
                        className="pl-11 h-12 rounded-2xl border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs font-semibold"
                    />
                </div>

                {/* Table */}
                <div className="overflow-x-auto border border-slate-200 dark:border-[#2a3040] rounded-2xl">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-100/70 dark:bg-[#1a1f2e] border-b border-slate-200 dark:border-[#2a3040]">
                                <TableHead className="w-[140px] font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100 h-14 pl-6">
                                    Class Code
                                </TableHead>
                                <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100">
                                    Vehicle Classification Name & Scope
                                </TableHead>
                                <TableHead className="text-right font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100 pr-6">
                                    Standard Impound Fee
                                </TableHead>
                                <TableHead className="text-center font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100">
                                    Active Status
                                </TableHead>
                                <TableHead className="text-right font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100 pr-6">
                                    Actions
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isPending ? (
                                Array.from({ length: 3 }).map((_, idx) => (
                                    <TableRow key={idx} className="border-b border-slate-100 dark:border-[#2a3040] animate-pulse">
                                        <TableCell className="pl-6 py-5">
                                            <div className="h-4 w-16 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="space-y-1">
                                                <div className="h-4 w-44 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
                                                <div className="h-3 w-32 bg-slate-100 dark:bg-slate-800/60 rounded-lg"></div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            <div className="h-4 w-20 bg-slate-200 dark:bg-slate-800 rounded-lg ml-auto"></div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="h-5 w-12 bg-slate-200 dark:bg-slate-800 rounded-full mx-auto"></div>
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            <div className="h-8 w-16 bg-slate-200 dark:bg-slate-800 rounded-xl ml-auto"></div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : filteredList.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-48 text-center text-slate-400 font-bold italic">
                                        No vehicle classifications found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredList.map((item) => (
                                    <TableRow key={item.id} className="border-b border-slate-100 dark:border-[#2a3040]">
                                        <TableCell className="pl-6 py-5 font-black text-xs text-amber-600 dark:text-amber-400 tracking-wider">
                                            {item.code}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col space-y-0.5">
                                                <span className="font-bold text-sm text-slate-900 dark:text-white uppercase italic">
                                                    {item.className}
                                                </span>
                                                <span className="text-xs text-slate-500 font-medium italic">
                                                    {item.description || "No specific vehicles detailed"}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right font-black text-sm text-amber-600 dark:text-amber-400 pr-6">
                                            ₱ {Number(item.impoundFee).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Switch
                                                checked={item.isActive}
                                                onCheckedChange={() => handleToggleStatus(item)}
                                            />
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            <Button
                                                onClick={() => handleOpenEdit(item)}
                                                variant="outline"
                                                size="sm"
                                                className="rounded-xl border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 font-bold text-xs"
                                            >
                                                <Edit3 className="w-3.5 h-3.5 mr-1" /> Edit
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* Add Classification Modal */}
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogContent className="sm:max-w-[540px] rounded-3xl border-slate-200 dark:border-white/10 bg-white dark:bg-[#151b2b] p-6">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black uppercase italic tracking-tight text-slate-900 dark:text-white">
                            Add Vehicle Classification
                        </DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleAddSubmit} className="space-y-4 pt-2">
                        <div className="space-y-1">
                            <Label className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase">Class Code (Unique)</Label>
                            <Input
                                value={addCode}
                                onChange={(e) => setAddCode(e.target.value)}
                                placeholder="e.g. CLASS_D"
                                className="rounded-xl font-mono text-xs uppercase"
                                required
                            />
                        </div>

                        <div className="space-y-1">
                            <Label className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase">Classification Name</Label>
                            <Input
                                value={addClassName}
                                onChange={(e) => setAddClassName(e.target.value)}
                                placeholder="e.g. Class D: Heavy Machinery & Farm Units"
                                className="rounded-xl text-xs"
                                required
                            />
                        </div>

                        <div className="space-y-1">
                            <Label className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase">Description / Sample Vehicles</Label>
                            <Textarea
                                value={addDescription}
                                onChange={(e) => setAddDescription(e.target.value)}
                                placeholder="Tractors, Harvesters, Excavators..."
                                className="rounded-xl text-xs min-h-[70px]"
                            />
                        </div>

                        <div className="space-y-1">
                            <Label className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase">Standard Impound Fee (₱)</Label>
                            <Input
                                type="number"
                                value={addImpoundFee}
                                onChange={(e) => setAddImpoundFee(e.target.value)}
                                placeholder="e.g. 7500"
                                className="rounded-xl text-xs font-bold text-amber-600"
                                required
                            />
                        </div>

                        <DialogFooter className="pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsAddOpen(false)}
                                className="rounded-xl text-xs font-bold"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={submitting}
                                className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold"
                            >
                                {submitting ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : null}
                                Save Classification
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Classification Modal */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="sm:max-w-[540px] rounded-3xl border-slate-200 dark:border-white/10 bg-white dark:bg-[#151b2b] p-6">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black uppercase italic tracking-tight text-slate-900 dark:text-white">
                            Edit {selectedItem?.code}
                        </DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleEditSubmit} className="space-y-4 pt-2">
                        <div className="space-y-1">
                            <Label className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase">Classification Name</Label>
                            <Input
                                value={editClassName}
                                onChange={(e) => setEditClassName(e.target.value)}
                                className="rounded-xl text-xs"
                                required
                            />
                        </div>

                        <div className="space-y-1">
                            <Label className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase">Description / Sample Vehicles</Label>
                            <Textarea
                                value={editDescription}
                                onChange={(e) => setEditDescription(e.target.value)}
                                className="rounded-xl text-xs min-h-[70px]"
                            />
                        </div>

                        <div className="space-y-1">
                            <Label className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase">Standard Impound Fee (₱)</Label>
                            <Input
                                type="number"
                                value={editImpoundFee}
                                onChange={(e) => setEditImpoundFee(e.target.value)}
                                className="rounded-xl text-xs font-bold text-amber-600"
                                required
                            />
                        </div>

                        <DialogFooter className="pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsEditOpen(false)}
                                className="rounded-xl text-xs font-bold"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={submitting}
                                className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold"
                            >
                                {submitting ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : null}
                                Save Changes
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
