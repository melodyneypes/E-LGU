"use client";

import React, { useState, useTransition } from "react";
import { toast } from "sonner";
import {
    Pill,
    Stethoscope,
    Plus,
    Search,
    Edit3,
    Trash2,
    AlertTriangle,
    Package,
    ArrowUpDown,
    Filter,
    Calendar,
    RefreshCw,
    Clock
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    createRHUInventoryItem,
    updateRHUInventoryItem,
    adjustRHUStockQuantity,
    deleteRHUInventoryItem,
    getRHUInventoryItems,
    RHUInventoryInput
} from "./actions";
import { cn } from "@/lib/utils";

interface RHUInventoryItemData {
    id: string;
    name: string;
    genericName?: string | null;
    brandName?: string | null;
    category: "MEDICINE" | "MEDICAL_SUPPLY";
    dosage?: string | null;
    unit: string;
    quantity: number;
    reorderLevel: number;
    expirationDate?: string | Date | null;
    batchNumber?: string | null;
    remarks?: string | null;
    createdAt?: string | Date;
    updatedAt?: string | Date;
}

interface RHUInventoryClientProps {
    initialItems: RHUInventoryItemData[];
}

function getExpirationStatus(expirationDate?: string | Date | null) {
    if (!expirationDate) return { status: "NONE", label: "N/A", days: null, badgeText: null };

    const exp = new Date(expirationDate);
    exp.setHours(23, 59, 59, 999);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffTime = exp.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const dateStr = new Date(expirationDate).toLocaleDateString("en-PH", {
        month: "short",
        day: "numeric",
        year: "numeric"
    });

    if (diffDays < 0) {
        return {
            status: "EXPIRED",
            label: dateStr,
            days: Math.abs(diffDays),
            badgeText: `Expired (${Math.abs(diffDays)}d ago)`
        };
    } else if (diffDays <= 30) {
        return {
            status: "EXPIRING_SOON",
            label: dateStr,
            days: diffDays,
            badgeText: diffDays === 0 ? "Expires Today" : `Expires in ${diffDays}d`
        };
    } else {
        return {
            status: "GOOD",
            label: dateStr,
            days: diffDays,
            badgeText: null
        };
    }
}

export default function RHUInventoryClient({ initialItems }: RHUInventoryClientProps) {
    const [items, setItems] = useState<RHUInventoryItemData[]>(initialItems);
    const [searchQuery, setSearchQuery] = useState("");
    const [categoryTab, setCategoryTab] = useState<"ALL" | "MEDICINE" | "MEDICAL_SUPPLY">("ALL");
    const [stockFilter, setStockFilter] = useState<"ALL" | "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK" | "EXPIRING_SOON" | "EXPIRED">("ALL");
    const [isPending, startTransition] = useTransition();

    // Modal states
    const [isItemModalOpen, setIsItemModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<RHUInventoryItemData | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
    const [isStockModalOpen, setIsStockModalOpen] = useState(false);
    const [stockAdjustItem, setStockAdjustItem] = useState<RHUInventoryItemData | null>(null);
    const [stockDelta, setStockDelta] = useState<number>(0);

    // Form state
    const [formData, setFormData] = useState<RHUInventoryInput>({
        name: "",
        genericName: "",
        brandName: "",
        category: "MEDICINE",
        dosage: "",
        unit: "pcs",
        quantity: 0,
        reorderLevel: 10,
        expirationDate: "",
        batchNumber: "",
        remarks: ""
    });
    const [formErrors, setFormErrors] = useState<{ name?: string; unit?: string; category?: string }>({});

    const refreshData = async () => {
        startTransition(async () => {
            const res = await getRHUInventoryItems({
                category: categoryTab,
                search: searchQuery,
                stockStatus: stockFilter
            });
            if (res.success && res.data) {
                setItems(res.data as any);
            }
        });
    };

    const handleOpenCreateModal = () => {
        setEditingItem(null);
        setFormErrors({});
        setFormData({
            name: "",
            genericName: "",
            brandName: "",
            category: categoryTab === "MEDICAL_SUPPLY" ? "MEDICAL_SUPPLY" : "MEDICINE",
            dosage: "",
            unit: "pcs",
            quantity: 0,
            reorderLevel: 10,
            expirationDate: "",
            batchNumber: "",
            remarks: ""
        });
        setIsItemModalOpen(true);
    };

    const handleOpenEditModal = (item: RHUInventoryItemData) => {
        setEditingItem(item);
        setFormErrors({});
        let expDateStr = "";
        if (item.expirationDate) {
            const d = new Date(item.expirationDate);
            expDateStr = d.toISOString().split("T")[0];
        }

        setFormData({
            name: item.name,
            genericName: item.genericName || "",
            brandName: item.brandName || "",
            category: item.category,
            dosage: item.dosage || "",
            unit: item.unit || "pcs",
            quantity: item.quantity,
            reorderLevel: item.reorderLevel,
            expirationDate: expDateStr,
            batchNumber: item.batchNumber || "",
            remarks: item.remarks || ""
        });
        setIsItemModalOpen(true);
    };

    const handleSaveItem = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const errors: { name?: string; unit?: string; category?: string } = {};
        if (!formData.name || !formData.name.trim()) {
            errors.name = "Item name is required";
        }
        if (!formData.unit || !formData.unit.trim()) {
            errors.unit = "Unit is required";
        }
        if (!formData.category) {
            errors.category = "Category is required";
        }

        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            return;
        }
        setFormErrors({});

        startTransition(async () => {
            if (editingItem) {
                const res = await updateRHUInventoryItem(editingItem.id, formData);
                if (res.success) {
                    toast.success("Inventory item updated successfully");
                    setIsItemModalOpen(false);
                    await refreshData();
                } else {
                    toast.error(res.error || "Failed to update item");
                }
            } else {
                const res = await createRHUInventoryItem(formData);
                if (res.success) {
                    toast.success("New inventory item created successfully");
                    setIsItemModalOpen(false);
                    await refreshData();
                } else {
                    toast.error(res.error || "Failed to create item");
                }
            }
        });
    };

    const handleConfirmDelete = async () => {
        if (!deletingItemId) return;

        startTransition(async () => {
            const res = await deleteRHUInventoryItem(deletingItemId);
            if (res.success) {
                toast.success("Item removed from inventory");
                setIsDeleteModalOpen(false);
                setDeletingItemId(null);
                await refreshData();
            } else {
                toast.error(res.error || "Failed to delete item");
            }
        });
    };

    const handleOpenStockModal = (item: RHUInventoryItemData) => {
        setStockAdjustItem(item);
        setStockDelta(0);
        setIsStockModalOpen(true);
    };

    const handleSaveStockAdjust = async () => {
        if (!stockAdjustItem || stockDelta === 0) return;

        startTransition(async () => {
            const res = await adjustRHUStockQuantity(stockAdjustItem.id, stockDelta);
            if (res.success) {
                toast.success(`Stock adjusted by ${stockDelta > 0 ? `+${stockDelta}` : stockDelta}`);
                setIsStockModalOpen(false);
                setStockAdjustItem(null);
                await refreshData();
            } else {
                toast.error(res.error || "Failed to adjust stock");
            }
        });
    };

    // Filtered items in memory
    const filteredItems = items.filter(item => {
        if (categoryTab !== "ALL" && item.category !== categoryTab) return false;
        
        const expInfo = getExpirationStatus(item.expirationDate);

        if (stockFilter === "OUT_OF_STOCK" && item.quantity > 0) return false;
        if (stockFilter === "LOW_STOCK" && (item.quantity <= 0 || item.quantity > item.reorderLevel)) return false;
        if (stockFilter === "IN_STOCK" && item.quantity <= item.reorderLevel) return false;
        if (stockFilter === "EXPIRING_SOON" && expInfo.status !== "EXPIRING_SOON") return false;
        if (stockFilter === "EXPIRED" && expInfo.status !== "EXPIRED") return false;

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            const nameMatch = item.name.toLowerCase().includes(q);
            const genericMatch = item.genericName?.toLowerCase().includes(q);
            const brandMatch = item.brandName?.toLowerCase().includes(q);
            const batchMatch = item.batchNumber?.toLowerCase().includes(q);
            return nameMatch || genericMatch || brandMatch || batchMatch;
        }

        return true;
    });

    // Counts for stats summary cards
    const totalItems = items.length;
    const totalMedicines = items.filter(i => i.category === "MEDICINE").length;
    const totalSupplies = items.filter(i => i.category === "MEDICAL_SUPPLY").length;
    const lowStockCount = items.filter(i => i.quantity <= i.reorderLevel).length;
    const expiringSoonCount = items.filter(i => getExpirationStatus(i.expirationDate).status === "EXPIRING_SOON").length;
    const expiredCount = items.filter(i => getExpirationStatus(i.expirationDate).status === "EXPIRED").length;

    return (
        <div className="p-2 md:p-4 max-w-full mx-auto space-y-6 pb-20">
            {/* Elegant Header Banner */}
            <div className="px-6 py-8 rounded-[1.5rem] border bg-gradient-to-r from-rose-500/10 via-rose-500/5 to-transparent border-rose-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter drop-shadow-sm text-rose-600 dark:text-rose-400 flex items-center gap-3">
                        <Package className="w-8 h-8 text-rose-500" />
                        RHU <span className="tracking-normal italic">Inventory</span>
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 font-black uppercase tracking-[0.2em] text-[10px] opacity-70">
                        Manage medicine supplies, medical inventory, stock levels, and expiration dates.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        onClick={refreshData}
                        variant="outline"
                        size="sm"
                        disabled={isPending}
                        className="rounded-xl border-rose-200 hover:bg-rose-50 dark:border-rose-900/40 dark:hover:bg-rose-950/30"
                    >
                        <RefreshCw className={`w-4 h-4 mr-2 ${isPending ? "animate-spin" : ""}`} />
                        Refresh
                    </Button>
                    <Button
                        onClick={handleOpenCreateModal}
                        className="bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/20 font-bold rounded-xl"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Add New Item
                    </Button>
                </div>
            </div>

            {/* Quick Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <Card className="border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-semibold text-slate-500">Total Items</CardTitle>
                        <Package className="w-4 h-4 text-slate-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-slate-800 dark:text-slate-100">{totalItems}</div>
                        <p className="text-xs text-slate-500 mt-1">Cataloged items</p>
                    </CardContent>
                </Card>

                <Card className="border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/30 dark:bg-emerald-950/20 backdrop-blur-md shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">Medicines</CardTitle>
                        <Pill className="w-4 h-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-emerald-700 dark:text-emerald-300">{totalMedicines}</div>
                        <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70 mt-1">Pharmaceutical stocks</p>
                    </CardContent>
                </Card>

                <Card className="border-blue-200 dark:border-blue-900/40 bg-blue-50/30 dark:bg-blue-950/20 backdrop-blur-md shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-semibold text-blue-600 dark:text-blue-400">Medical Supplies</CardTitle>
                        <Stethoscope className="w-4 h-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-blue-700 dark:text-blue-300">{totalSupplies}</div>
                        <p className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-1">Equipment & Consumables</p>
                    </CardContent>
                </Card>

                <Card className="border-amber-200 dark:border-amber-900/40 bg-amber-50/30 dark:bg-amber-950/20 backdrop-blur-md shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-semibold text-amber-600 dark:text-amber-400">Low / Out of Stock</CardTitle>
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-amber-700 dark:text-amber-300">{lowStockCount}</div>
                        <p className="text-xs text-amber-600/70 dark:text-amber-400/70 mt-1">Require reordering</p>
                    </CardContent>
                </Card>

                <Card className="border-rose-200 dark:border-rose-900/40 bg-rose-50/30 dark:bg-rose-950/20 backdrop-blur-md shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-semibold text-rose-600 dark:text-rose-400">Expiring / Expired</CardTitle>
                        <Clock className="w-4 h-4 text-rose-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-rose-700 dark:text-rose-300">{expiringSoonCount + expiredCount}</div>
                        <p className="text-xs text-rose-600/70 dark:text-rose-400/70 mt-1">
                            {expiredCount > 0 ? `${expiredCount} Expired, ${expiringSoonCount} Soon` : `${expiringSoonCount} Expiring within 30d`}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Filter and Search Bar */}
            <Card className="border-slate-200 dark:border-slate-800 shadow-sm py-0">
                <CardContent className="p-2 sm:p-2.5 px-3 md:px-4 flex flex-col md:flex-row gap-2.5 justify-between items-center">
                    {/* Category Tabs */}
                    <div className="flex bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl w-full md:w-auto">
                        <button
                            onClick={() => setCategoryTab("ALL")}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                categoryTab === "ALL"
                                    ? "bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-sm"
                                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                            }`}
                        >
                            All Items ({items.length})
                        </button>
                        <button
                            onClick={() => setCategoryTab("MEDICINE")}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                                categoryTab === "MEDICINE"
                                    ? "bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm"
                                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                            }`}
                        >
                            <Pill className="w-3.5 h-3.5" />
                            Medicines ({totalMedicines})
                        </button>
                        <button
                            onClick={() => setCategoryTab("MEDICAL_SUPPLY")}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                                categoryTab === "MEDICAL_SUPPLY"
                                    ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm"
                                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                            }`}
                        >
                            <Stethoscope className="w-3.5 h-3.5" />
                            Medical Supplies ({totalSupplies})
                        </button>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2.5 w-full md:w-auto">
                        {/* Stock & Expiration Filter Dropdown */}
                        <Select
                            value={stockFilter}
                            onValueChange={(val: any) => setStockFilter(val)}
                        >
                            <SelectTrigger className="w-full sm:w-[180px] h-9 rounded-lg text-xs">
                                <Filter className="w-3.5 h-3.5 mr-2 text-slate-400" />
                                <SelectValue placeholder="Stock / Expiration" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Items</SelectItem>
                                <SelectItem value="IN_STOCK">In Stock</SelectItem>
                                <SelectItem value="LOW_STOCK">Low Stock Alert</SelectItem>
                                <SelectItem value="OUT_OF_STOCK">Out of Stock</SelectItem>
                                <SelectItem value="EXPIRING_SOON">Expiring Soon (30d)</SelectItem>
                                <SelectItem value="EXPIRED">Already Expired</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* Search Input */}
                        <div className="relative w-full sm:w-[240px]">
                            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                            <Input
                                placeholder="Search by name, brand..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 h-9 text-xs rounded-lg"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Inventory Table */}
            <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-slate-50 dark:bg-slate-800/40">
                            <TableRow>
                                <TableHead className="font-bold text-xs">Item Name / Generic</TableHead>
                                <TableHead className="font-bold text-xs">Category</TableHead>
                                <TableHead className="font-bold text-xs">Dosage / Unit</TableHead>
                                <TableHead className="font-bold text-xs">Stock Quantity</TableHead>
                                <TableHead className="font-bold text-xs">Expiration Date</TableHead>
                                <TableHead className="font-bold text-xs text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredItems.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-12 text-slate-400">
                                        <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                        <p className="font-semibold text-sm">No inventory items found</p>
                                        <p className="text-xs opacity-70 mt-1">Try adjusting your filters or click &quot;Add New Item&quot;.</p>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredItems.map((item) => {
                                    const isOutOfStock = item.quantity <= 0;
                                    const isLowStock = item.quantity > 0 && item.quantity <= item.reorderLevel;
                                    const expInfo = getExpirationStatus(item.expirationDate);

                                    return (
                                        <TableRow key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                                            <TableCell>
                                                <div className="font-bold text-slate-800 dark:text-slate-100">
                                                    {item.name}
                                                </div>
                                                <div className="text-[11px] text-slate-400 space-x-2">
                                                    {item.genericName && <span>Generic: {item.genericName}</span>}
                                                    {item.brandName && <span>• Brand: {item.brandName}</span>}
                                                    {item.batchNumber && <span>• Batch: #{item.batchNumber}</span>}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {item.category === "MEDICINE" ? (
                                                    <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 gap-1 text-[10px]">
                                                        <Pill className="w-3 h-3" /> Medicine
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-500/10 gap-1 text-[10px]">
                                                        <Stethoscope className="w-3 h-3" /> Medical Supply
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-xs text-slate-600 dark:text-slate-300">
                                                {item.dosage ? `${item.dosage} / ${item.unit}` : item.unit}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-black text-sm">{item.quantity}</span>
                                                    <span className="text-xs text-slate-400">{item.unit}</span>

                                                    {isOutOfStock && (
                                                        <Badge variant="destructive" className="text-[9px] uppercase px-1.5 py-0.5">
                                                            Out of Stock
                                                        </Badge>
                                                    )}
                                                    {isLowStock && (
                                                        <Badge className="bg-amber-500 hover:bg-amber-600 text-white text-[9px] uppercase px-1.5 py-0.5">
                                                            Low Stock
                                                        </Badge>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-xs text-slate-600 dark:text-slate-300">
                                                {expInfo.status === "EXPIRED" ? (
                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-bold">
                                                            <Calendar className="w-3.5 h-3.5 text-rose-500" />
                                                            {expInfo.label}
                                                        </div>
                                                        <Badge variant="destructive" className="w-fit text-[9px] uppercase px-1.5 py-0.5 flex items-center gap-1">
                                                            <AlertTriangle className="w-3 h-3" /> {expInfo.badgeText}
                                                        </Badge>
                                                    </div>
                                                ) : expInfo.status === "EXPIRING_SOON" ? (
                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold">
                                                            <Calendar className="w-3.5 h-3.5 text-amber-500" />
                                                            {expInfo.label}
                                                        </div>
                                                        <Badge className="w-fit bg-amber-500 hover:bg-amber-600 text-white text-[9px] uppercase px-1.5 py-0.5 flex items-center gap-1">
                                                            <Clock className="w-3 h-3" /> {expInfo.badgeText}
                                                        </Badge>
                                                    </div>
                                                ) : expInfo.status === "GOOD" ? (
                                                    <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium">
                                                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                                        {expInfo.label}
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400">N/A</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button
                                                        onClick={() => handleOpenStockModal(item)}
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                                        title="Adjust Stock"
                                                    >
                                                        <ArrowUpDown className="w-3.5 h-3.5" />
                                                    </Button>
                                                    <Button
                                                        onClick={() => handleOpenEditModal(item)}
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 px-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800"
                                                        title="Edit Item"
                                                    >
                                                        <Edit3 className="w-3.5 h-3.5" />
                                                    </Button>
                                                    <Button
                                                        onClick={() => {
                                                            setDeletingItemId(item.id);
                                                            setIsDeleteModalOpen(true);
                                                        }}
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 px-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                                                        title="Delete Item"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>
            </Card>

            {/* Create / Edit Dialog */}
            <Dialog open={isItemModalOpen} onOpenChange={setIsItemModalOpen}>
                <DialogContent className="sm:max-w-[540px] rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold flex items-center gap-2 text-rose-600">
                            {editingItem ? <Edit3 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                            {editingItem ? "Edit Inventory Item" : "Add New Inventory Item"}
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Fill in medicine or medical supply details below.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSaveItem} className="space-y-4 py-2">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Category *</Label>
                                <Select
                                    value={formData.category}
                                    onValueChange={(val: any) => {
                                        setFormData(prev => ({ ...prev, category: val }));
                                        if (formErrors.category) setFormErrors(prev => ({ ...prev, category: undefined }));
                                    }}
                                >
                                    <SelectTrigger className={cn("rounded-xl text-xs", formErrors.category && "border-rose-500 ring-1 ring-rose-500/20")}>
                                        <SelectValue placeholder="Category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="MEDICINE">Medicine</SelectItem>
                                        <SelectItem value="MEDICAL_SUPPLY">Medical Supply</SelectItem>
                                    </SelectContent>
                                </Select>
                                {formErrors.category && (
                                    <p className="text-[11px] font-medium text-rose-500 mt-1">{formErrors.category}</p>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Item Name *</Label>
                                <Input
                                    placeholder="e.g. Paracetamol, Latex Gloves"
                                    value={formData.name}
                                    onChange={(e) => {
                                        setFormData(prev => ({ ...prev, name: e.target.value }));
                                        if (formErrors.name) setFormErrors(prev => ({ ...prev, name: undefined }));
                                    }}
                                    className={cn("rounded-xl text-xs", formErrors.name && "border-rose-500 focus-visible:ring-rose-500")}
                                />
                                {formErrors.name && (
                                    <p className="text-[11px] font-medium text-rose-500 mt-1">{formErrors.name}</p>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Generic Name</Label>
                                <Input
                                    placeholder="e.g. Paracetamol"
                                    value={formData.genericName || ""}
                                    onChange={(e) => setFormData(prev => ({ ...prev, genericName: e.target.value }))}
                                    className="rounded-xl text-xs"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Brand Name</Label>
                                <Input
                                    placeholder="e.g. Biogesic"
                                    value={formData.brandName || ""}
                                    onChange={(e) => setFormData(prev => ({ ...prev, brandName: e.target.value }))}
                                    className="rounded-xl text-xs"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Dosage</Label>
                                <Input
                                    placeholder="e.g. 500mg, 10ml"
                                    value={formData.dosage || ""}
                                    onChange={(e) => setFormData(prev => ({ ...prev, dosage: e.target.value }))}
                                    className="rounded-xl text-xs"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Unit *</Label>
                                <Input
                                    placeholder="pcs, box, bottle"
                                    value={formData.unit}
                                    onChange={(e) => {
                                        setFormData(prev => ({ ...prev, unit: e.target.value }));
                                        if (formErrors.unit) setFormErrors(prev => ({ ...prev, unit: undefined }));
                                    }}
                                    className={cn("rounded-xl text-xs", formErrors.unit && "border-rose-500 focus-visible:ring-rose-500")}
                                />
                                {formErrors.unit && (
                                    <p className="text-[11px] font-medium text-rose-500 mt-1">{formErrors.unit}</p>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Initial Quantity</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    value={formData.quantity}
                                    onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                                    className="rounded-xl text-xs"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Reorder Level</Label>
                                <Input
                                    type="number"
                                    min="1"
                                    value={formData.reorderLevel}
                                    onChange={(e) => setFormData(prev => ({ ...prev, reorderLevel: parseInt(e.target.value) || 10 }))}
                                    className="rounded-xl text-xs"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Expiration Date</Label>
                                <Input
                                    type="date"
                                    value={formData.expirationDate || ""}
                                    onChange={(e) => setFormData(prev => ({ ...prev, expirationDate: e.target.value }))}
                                    className="rounded-xl text-xs"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Batch No.</Label>
                                <Input
                                    placeholder="e.g. B-202607"
                                    value={formData.batchNumber || ""}
                                    onChange={(e) => setFormData(prev => ({ ...prev, batchNumber: e.target.value }))}
                                    className="rounded-xl text-xs"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Remarks / Storage Notes</Label>
                            <Input
                                placeholder="e.g. Store below 30°C, Keep dry"
                                value={formData.remarks || ""}
                                onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
                                className="rounded-xl text-xs"
                            />
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsItemModalOpen(false)}
                                className="rounded-xl text-xs"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isPending}
                                className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold"
                            >
                                {editingItem ? "Save Changes" : "Create Item"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Quick Stock Adjustment Dialog */}
            <Dialog open={isStockModalOpen} onOpenChange={setIsStockModalOpen}>
                <DialogContent className="sm:max-w-[460px] rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold text-rose-600 flex items-center gap-2">
                            <ArrowUpDown className="w-5 h-5" /> Adjust Stock Level
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            {stockAdjustItem?.name} (Current Stock: <span className="font-bold text-slate-800 dark:text-slate-200">{stockAdjustItem?.quantity} {stockAdjustItem?.unit}</span>)
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-5 py-3">
                        <div className="flex items-center justify-center gap-2 sm:gap-3">
                            <div className="flex gap-1">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setStockDelta(prev => prev - 10)}
                                    className="rounded-xl font-bold h-10 px-3 border-slate-300 dark:border-slate-700 hover:bg-rose-50 hover:border-rose-200 dark:hover:bg-rose-950/30"
                                >
                                    -10
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setStockDelta(prev => prev - 1)}
                                    className="rounded-xl font-bold h-10 px-3 border-slate-300 dark:border-slate-700 hover:bg-rose-50 hover:border-rose-200 dark:hover:bg-rose-950/30"
                                >
                                    -1
                                </Button>
                            </div>

                            <div className="text-center px-1">
                                <Input
                                    type="number"
                                    value={stockDelta}
                                    onChange={(e) => setStockDelta(parseInt(e.target.value) || 0)}
                                    className="w-20 text-center font-black text-lg h-10 rounded-xl border-rose-500/40 focus-visible:ring-rose-500"
                                />
                                <span className="text-[10px] font-medium text-slate-400 block mt-1">Adjustment</span>
                            </div>

                            <div className="flex gap-1">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setStockDelta(prev => prev + 1)}
                                    className="rounded-xl font-bold h-10 px-3 border-slate-300 dark:border-slate-700 hover:bg-rose-50 hover:border-rose-200 dark:hover:bg-rose-950/30"
                                >
                                    +1
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setStockDelta(prev => prev + 10)}
                                    className="rounded-xl font-bold h-10 px-3 border-slate-300 dark:border-slate-700 hover:bg-rose-50 hover:border-rose-200 dark:hover:bg-rose-950/30"
                                >
                                    +10
                                </Button>
                            </div>
                        </div>

                        {stockAdjustItem && (
                            <div className="text-center text-xs text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                                New Total Stock: <span className="font-black text-sm text-rose-600 dark:text-rose-400">{Math.max(0, stockAdjustItem.quantity + stockDelta)}</span> <span className="font-medium text-slate-400">{stockAdjustItem.unit}</span>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsStockModalOpen(false)}
                            className="rounded-xl text-xs"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={handleSaveStockAdjust}
                            disabled={isPending || stockDelta === 0}
                            className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-600/20"
                        >
                            Apply Stock Adjustment
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
                <DialogContent className="sm:max-w-[400px] rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold text-red-600 flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5" /> Confirm Deletion
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Are you sure you want to delete this inventory item? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsDeleteModalOpen(false)}
                            className="rounded-xl text-xs"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={handleConfirmDelete}
                            disabled={isPending}
                            className="bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold"
                        >
                            Delete Item
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
