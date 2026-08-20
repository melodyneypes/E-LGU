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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
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
    ChevronLeft,
    ChevronRight,
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
    initialTotalCount?: number;
    initialActiveCount?: number;
    initialTotalAll?: number;
}

export default function VehicleClassesPage({
    initialClassifications,
    initialTotalCount = 0,
    initialActiveCount = 0,
    initialTotalAll = 0,
}: VehicleClassesPageProps) {
    const [classifications, setClassifications] = useState<VehicleClassItem[]>(initialClassifications);
    const [totalCount, setTotalCount] = useState(initialTotalCount || initialClassifications.length);
    const [activeCount, setActiveCount] = useState(initialActiveCount);
    const [totalAll, setTotalAll] = useState(initialTotalAll || initialClassifications.length);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState<number>(10);
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

    React.useEffect(() => {
        setClassifications(initialClassifications);
        setTotalCount(initialTotalCount || initialClassifications.length);
        setActiveCount(initialActiveCount);
        setTotalAll(initialTotalAll || initialClassifications.length);
    }, [initialClassifications, initialTotalCount, initialActiveCount, initialTotalAll]);

    const fetchData = React.useCallback(
        async (p: number, s: string, customLimit?: number) => {
            setIsPending(true);
            try {
                const limitToUse = customLimit !== undefined ? customLimit : pageSize;
                const res = await getVehicleClassifications({
                    page: p,
                    limit: limitToUse,
                    search: s,
                    onlyActive: false,
                });
                if (res.success && res.classifications) {
                    setClassifications(res.classifications);
                    setTotalCount(res.totalCount || 0);
                    if (res.activeCount !== undefined) setActiveCount(res.activeCount);
                    if (res.totalAll !== undefined) setTotalAll(res.totalAll);
                }
            } catch {
                toast.error("Failed to load vehicle classifications.");
            } finally {
                setIsPending(false);
            }
        },
        [pageSize]
    );

    const searchTimerRef = React.useRef<NodeJS.Timeout | null>(null);

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setSearch(val);
        setPage(1);

        if (searchTimerRef.current) {
            clearTimeout(searchTimerRef.current);
        }

        searchTimerRef.current = setTimeout(() => {
            fetchData(1, val, pageSize);
        }, 400);
    };

    const handlePageChange = (newPage: number) => {
        setPage(newPage);
        fetchData(newPage, search, pageSize);
    };

    const handlePageSizeChange = (newSizeStr: string) => {
        const newSize = parseInt(newSizeStr, 10) || 10;
        setPageSize(newSize);
        setPage(1);
        fetchData(1, search, newSize);
    };

    const refreshData = () => {
        fetchData(page, search, pageSize);
    };

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
                fetchData(page, search, pageSize);
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
                fetchData(page, search, pageSize);
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
                setActiveCount((prev) => (!item.isActive ? prev + 1 : Math.max(0, prev - 1)));
            } else {
                toast.error(res.error || "Failed to update status.");
            }
        } catch {
            toast.error("Failed to toggle status.");
        }
    };

    const avgFee = classifications.length > 0
        ? classifications.reduce((sum, c) => sum + c.impoundFee, 0) / classifications.length
        : 0;

    const totalPages = Math.ceil(totalCount / pageSize) || 1;

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
                        <p className="text-3xl font-black text-slate-900 dark:text-white italic mt-1">{totalAll}</p>
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

            {/* Main Table Card */}
            <div className="bg-white dark:bg-[#151b2b] rounded-3xl border border-slate-200 dark:border-[#2a3040] overflow-hidden shadow-xl ring-1 ring-slate-200 dark:ring-white/5 relative">
                {/* Search & Filter Bar */}
                <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-[#2a3040]">
                    <div className="relative flex-1 max-w-md group">
                        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-amber-500 transition-colors" />
                        <Input
                            value={search}
                            onChange={handleSearchChange}
                            placeholder="Search class code, name, or vehicle types..."
                            className="pl-10 h-11 bg-slate-50 dark:bg-[#1a1f2e] border-slate-200 dark:border-[#2a3040] focus:ring-2 focus:ring-amber-500/20 font-medium italic"
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50/50 dark:bg-[#1a1f2e] border-y border-slate-200 dark:border-[#2a3040]">
                                <TableHead className="w-[140px] font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100 h-14 pl-8">
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
                                <TableHead className="text-right font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100 pr-8">
                                    Actions
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isPending ? (
                                Array.from({ length: Math.min(pageSize, 5) }).map((_, idx) => (
                                    <TableRow key={idx} className="border-b border-slate-100 dark:border-[#2a3040] animate-pulse">
                                        <TableCell className="pl-8 py-5">
                                            <div className="h-4 w-16 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="space-y-1.5">
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
                                        <TableCell className="text-right pr-8">
                                            <div className="h-8 w-16 bg-slate-200 dark:bg-slate-800 rounded-xl ml-auto"></div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : classifications.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-48 text-center text-slate-400 font-bold italic">
                                        No vehicle classifications found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                classifications.map((item) => (
                                    <TableRow key={item.id} className="border-b border-slate-100 dark:border-[#2a3040] hover:bg-amber-50/20 dark:hover:bg-amber-950/10 transition-colors">
                                        <TableCell className="pl-8 py-5 font-black text-xs text-amber-600 dark:text-amber-400 tracking-wider">
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
                                        <TableCell className="text-right pr-8">
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

                {/* Pagination Controls */}
                <div className="p-6 border-t border-slate-200 dark:border-[#2a3040] flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-4">
                        <p className="text-xs font-bold text-slate-500">
                            Showing {classifications.length > 0 ? (page - 1) * pageSize + 1 : 0} to{" "}
                            {Math.min(page * pageSize, totalCount)} of {totalCount} classifications
                        </p>

                        <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-slate-500">Rows per page:</span>
                            <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
                                <SelectTrigger className="w-[85px] h-8 text-xs font-bold bg-slate-50 dark:bg-[#1a1f2e] border-slate-200 dark:border-[#2a3040] rounded-xl">
                                    <SelectValue placeholder="10" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="10">10</SelectItem>
                                    <SelectItem value="20">20</SelectItem>
                                    <SelectItem value="50">50</SelectItem>
                                    <SelectItem value="100">100</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page === 1 || isPending}
                            onClick={() => handlePageChange(page - 1)}
                            className="h-9 px-3 font-bold text-xs rounded-xl"
                        >
                            <ChevronLeft className="w-4 h-4 mr-1" /> Prev
                        </Button>
                        <span className="text-xs font-black px-3 py-1 bg-slate-100 dark:bg-[#1a1f2e] rounded-xl border border-slate-200 dark:border-[#2a3040]">
                            Page {page} of {totalPages}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page >= totalPages || isPending}
                            onClick={() => handlePageChange(page + 1)}
                            className="h-9 px-3 font-bold text-xs rounded-xl"
                        >
                            Next <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                    </div>
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
