"use client";

import React, { useState, useTransition, useEffect } from "react";
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
    Clock,
    ChevronDown,
    ChevronUp,
    Truck,
    Boxes,
    CheckCircle2,
    Hospital,
    ShieldAlert
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
    receiveRHUStockBatch,
    adjustRHUBatchQuantity,
    deleteRHUInventoryBatch,
    updateRHUInventoryBatch,
    RHUInventoryInput,
    RHUStockBatchInput,
    RHUBatchData
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
    batches?: RHUBatchData[];
}

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
    healthCenterId?: string | null;
    healthCenterName?: string | null;
    createdAt?: string | Date;
    updatedAt?: string | Date;
    batches?: RHUBatchData[];
}

interface RHUInventoryClientProps {
    initialItems: RHUInventoryItemData[];
    initialCenters?: any[];
    currentUser?: any;
    matchedCenter?: any;
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
    } else if (diffDays <= 60) {
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

export default function RHUInventoryClient({ initialItems, initialCenters = [], currentUser, matchedCenter }: RHUInventoryClientProps) {
    const [items, setItems] = useState<RHUInventoryItemData[]>(initialItems);
    const [centers] = useState<any[]>(initialCenters);
    const [searchQuery, setSearchQuery] = useState("");
    const [categoryTab, setCategoryTab] = useState<"ALL" | "MEDICINE" | "MEDICAL_SUPPLY">("ALL");
    const [stockFilter, setStockFilter] = useState<"ALL" | "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK" | "EXPIRING_SOON" | "EXPIRED">("ALL");

    const role = currentUser?.role || "";
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const department = (currentUser?.department || "").toUpperCase();
    const userEmail = (currentUser?.email || "").toLowerCase();
    const userName = (currentUser?.name || "").toLowerCase();

    const userMatchedCenter = matchedCenter || (
        currentUser && centers.length > 0 ? centers.find((c: any) => {
            const cName = (c.name || "").toLowerCase();
            return (
                (c.accountEmail && c.accountEmail.toLowerCase() === userEmail) ||
                (userEmail.includes("lalas") && cName.includes("lalas")) ||
                (userName.includes("lalas") && cName.includes("lalas")) ||
                (userEmail.includes("main") && cName.includes("main"))
            );
        }) : null
    );

    // Center Admin accounts (e.g. Lalas Medical Clinic) are center scoped and manage inventory in their own center
    const isCenterScopedUser = !!userMatchedCenter;

    // Staff and Doctor accounts have read-only access to inventory. Only RHU Pharmacy, RHU Admin, RHU Center Admin, or Pharmacy accounts can edit.
    const isStaff = role === "RHU_STAFF" || role === "RHU_DOCTOR" || role === "ADMIN_AIDE";
    const canManageInventory = !isStaff && (
        role === "ADMIN" ||
        role === "RHU_ADMIN" ||
        role === "RHU_PHARMACY" ||
        role === "RHU_CENTER_ADMIN" ||
        userEmail.includes("pharmacy")
    );

    const defaultCenterId = userMatchedCenter ? userMatchedCenter.id : "ALL";
    const [centerFilter, setCenterFilter] = useState<string>(defaultCenterId);
    const [isPending, startTransition] = useTransition();

    // Accordion expanded rows
    const [expandedItemIds, setExpandedItemIds] = useState<string[]>([]);

    // Master Item Modal states
    const [isItemModalOpen, setIsItemModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<RHUInventoryItemData | null>(null);

    // Stock In / Batch Delivery Modal states
    const [isStockInModalOpen, setIsStockInModalOpen] = useState(false);
    const [stockInFormData, setStockInFormData] = useState<RHUStockBatchInput>({
        itemId: "",
        batchNumber: "",
        expirationDate: "",
        quantity: 0,
        remarks: "",
        healthCenterId: userMatchedCenter ? userMatchedCenter.id : null
    });
    const [stockInFormErrors, setStockInFormErrors] = useState<{ itemId?: string; batchNumber?: string; quantity?: string; expirationDate?: string }>({});

    // Adjust Stock Modal states
    const [isStockModalOpen, setIsStockModalOpen] = useState(false);
    const [stockAdjustItem, setStockAdjustItem] = useState<RHUInventoryItemData | null>(null);
    const [stockDelta, setStockDelta] = useState<number>(0);

    // Delete Modal states
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
    const [deletingItemName, setDeletingItemName] = useState<string>("");

    const [isDeleteBatchModalOpen, setIsDeleteBatchModalOpen] = useState(false);
    const [deletingBatchId, setDeletingBatchId] = useState<string | null>(null);
    const [deletingBatchNo, setDeletingBatchNo] = useState<string>("");

    // Batch Stock Adjustment Popup Modal states
    const [isBatchAdjustModalOpen, setIsBatchAdjustModalOpen] = useState(false);
    const [batchAdjustTarget, setBatchAdjustTarget] = useState<{
        batchId: string;
        batchNumber: string;
        itemName: string;
        unit: string;
        currentQuantity: number;
    } | null>(null);
    const [batchAdjustAmount, setBatchAdjustAmount] = useState<number>(0);

    const handleOpenBatchAdjustModal = (
        batchId: string,
        batchNumber: string,
        itemName: string,
        unit: string,
        currentQuantity: number
    ) => {
        setBatchAdjustTarget({
            batchId,
            batchNumber,
            itemName,
            unit,
            currentQuantity
        });
        setBatchAdjustAmount(currentQuantity);
        setIsBatchAdjustModalOpen(true);
    };

    // Form state for Master Item
    const [formData, setFormData] = useState<RHUInventoryInput>({
        name: "",
        genericName: "",
        brandName: "",
        category: "",
        dosage: "",
        unit: "",
        quantity: 0,
        reorderLevel: 10,
        expirationDate: "",
        batchNumber: "",
        remarks: "",
        healthCenterId: userMatchedCenter ? userMatchedCenter.id : null
    });
    const [formErrors, setFormErrors] = useState<{ name?: string; unit?: string; category?: string }>({});

    const toggleExpandRow = (itemId: string) => {
        setExpandedItemIds(prev =>
            prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
        );
    };

    const refreshData = async () => {
        startTransition(async () => {
            const res = await getRHUInventoryItems({
                category: categoryTab,
                search: searchQuery,
                stockStatus: stockFilter,
                healthCenterId: centerFilter
            });
            if (res.success && res.data) {
                setItems(res.data as any);
            }
        });
    };

    const [isSyncing, setIsSyncing] = useState(false);

    // Realtime background auto-update polling (every 5 seconds)
    useEffect(() => {
        const performSilentSync = async () => {
            if (document.visibilityState === "hidden") return;
            setIsSyncing(true);
            try {
                const res = await getRHUInventoryItems({
                    category: categoryTab,
                    search: searchQuery,
                    stockStatus: stockFilter,
                    healthCenterId: centerFilter
                });
                if (res.success && res.data) {
                    setItems(res.data as any);
                }
            } catch (err) {
                console.warn("[Realtime Inventory Sync Warning]:", err);
            } finally {
                setIsSyncing(false);
            }
        };

        const intervalId = setInterval(performSilentSync, 5000);

        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible") {
                performSilentSync();
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            clearInterval(intervalId);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, [categoryTab, searchQuery, stockFilter, centerFilter]);

    const handleOpenCreateModal = () => {
        setEditingItem(null);
        setFormErrors({});
        setFormData({
            name: "",
            genericName: "",
            brandName: "",
            category: "",
            dosage: "",
            unit: "",
            quantity: 0,
            reorderLevel: 10,
            expirationDate: "",
            batchNumber: "",
            remarks: "",
            healthCenterId: userMatchedCenter ? userMatchedCenter.id : null
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
            unit: item.unit || "",
            quantity: item.quantity,
            reorderLevel: item.reorderLevel,
            expirationDate: expDateStr,
            batchNumber: item.batchNumber || "",
            remarks: item.remarks || "",
            healthCenterId: item.healthCenterId || (userMatchedCenter ? userMatchedCenter.id : null)
        });
        setIsItemModalOpen(true);
    };

    const handleOpenStockInModal = (item?: RHUInventoryItemData) => {
        const defaultItemId = item ? item.id : (items.length > 0 ? items[0].id : "");
        setStockInFormErrors({});
        setStockInFormData({
            itemId: defaultItemId,
            batchNumber: `BAT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
            expirationDate: "",
            quantity: 0,
            remarks: "",
            healthCenterId: item?.healthCenterId || (userMatchedCenter ? userMatchedCenter.id : null)
        });
        setIsStockInModalOpen(true);
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
                    toast.success("Master catalog item updated");
                    setIsItemModalOpen(false);
                    await refreshData();
                } else {
                    setFormErrors({ name: res.error || "Failed to update item" });
                }
            } else {
                const res = await createRHUInventoryItem(formData);
                if (res.success) {
                    toast.success("Master item added to catalog");
                    setIsItemModalOpen(false);
                    await refreshData();
                } else {
                    setFormErrors({ name: res.error || "Failed to create item" });
                }
            }
        });
    };

    const handleSaveStockInBatch = async (e: React.FormEvent) => {
        e.preventDefault();

        const errors: { itemId?: string; batchNumber?: string; quantity?: string; expirationDate?: string } = {};
        if (!stockInFormData.itemId) {
            errors.itemId = "Please select an item";
        }
        if (!stockInFormData.batchNumber || !stockInFormData.batchNumber.trim()) {
            errors.batchNumber = "Batch number is required";
        }
        if (!stockInFormData.quantity || stockInFormData.quantity <= 0) {
            errors.quantity = "Quantity must be greater than 0";
        }
        if (!stockInFormData.expirationDate || !stockInFormData.expirationDate.trim()) {
            errors.expirationDate = "Expiration date is required for batch tracking";
        } else {
            const exp = new Date(stockInFormData.expirationDate);
            exp.setHours(23, 59, 59, 999);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (exp.getTime() < today.getTime()) {
                errors.expirationDate = "Cannot add an expired product to stock";
            }
        }

        if (Object.keys(errors).length > 0) {
            setStockInFormErrors(errors);
            return;
        }
        setStockInFormErrors({});

        startTransition(async () => {
            const res = await receiveRHUStockBatch(stockInFormData);
            if (res.success) {
                toast.success(`Batch #${stockInFormData.batchNumber} logged successfully!`);
                setIsStockInModalOpen(false);
                setExpandedItemIds(prev =>
                    prev.includes(stockInFormData.itemId) ? prev : [...prev, stockInFormData.itemId]
                );
                await refreshData();
            } else {
                if (res.error?.toLowerCase().includes("expired")) {
                    setStockInFormErrors({ expirationDate: res.error });
                }
                toast.error(res.error || "Failed to log stock batch");
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
                setDeletingItemName("");
                await refreshData();
            } else {
                toast.error(res.error || "Failed to delete item");
            }
        });
    };

    const handleOpenDeleteBatchModal = (batchId: string, batchNumber: string) => {
        setDeletingBatchId(batchId);
        setDeletingBatchNo(batchNumber);
        setIsDeleteBatchModalOpen(true);
    };

    const handleConfirmDeleteBatch = async () => {
        if (!deletingBatchId) return;

        startTransition(async () => {
            const res = await deleteRHUInventoryBatch(deletingBatchId);
            if (res.success) {
                toast.success(`Batch #${deletingBatchNo} removed`);
                setIsDeleteBatchModalOpen(false);
                setDeletingBatchId(null);
                setDeletingBatchNo("");
                await refreshData();
            } else {
                toast.error(res.error || "Failed to delete batch");
            }
        });
    };

    const handleBatchCenterChange = async (batchId: string, batchNumber: string, newCenterId: string) => {
        const targetCenterId = newCenterId === "ALL" ? null : newCenterId;
        const centerObj = centers.find((c: any) => c.id === newCenterId);
        const centerName = newCenterId === "ALL" ? "Central RHU Depot" : (centerObj?.name || "Selected Center");
        startTransition(async () => {
            const res = await updateRHUInventoryBatch(batchId, { healthCenterId: targetCenterId });
            if (res.success) {
                toast.success(`Batch #${batchNumber} reallocated to ${centerName}`);
                await refreshData();
            } else {
                toast.error(res.error || "Failed to reallocate batch");
            }
        });
    };

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _handleAdjustBatchQty = async (batchId: string, delta: number) => {
        startTransition(async () => {
            const res = await adjustRHUBatchQuantity(batchId, delta);
            if (res.success) {
                toast.success(`Batch quantity updated`);
                await refreshData();
            } else {
                toast.error(res.error || "Failed to adjust batch stock");
            }
        });
    };

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _handleOpenStockModal = (item: RHUInventoryItemData) => {
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

    // Center-scoped items processing (calculates stock, FEFO expiry, and batch list for the target health center)
    const centerScopedItems = React.useMemo(() => {
        return items.map(item => {
            const rawBatches = item.batches || [];
            if (centerFilter === "ALL") {
                return item;
            }
            const filteredBatches = rawBatches.filter(b => b.healthCenterId === centerFilter);
            const totalQty = filteredBatches.reduce((sum, b) => sum + (b.quantity || 0), 0);

            const activeExp = filteredBatches
                .filter(b => (b.quantity || 0) > 0 && b.expirationDate)
                .sort((a, b) => new Date(a.expirationDate!).getTime() - new Date(b.expirationDate!).getTime());

            let earliestExp = null;
            if (activeExp.length > 0) {
                earliestExp = activeExp[0].expirationDate;
            } else if (filteredBatches.length > 0) {
                earliestExp = filteredBatches[0].expirationDate;
            }

            return {
                ...item,
                quantity: totalQty,
                expirationDate: earliestExp,
                batches: filteredBatches
            };
        });
    }, [items, centerFilter]);

    // Filtered items in memory based on category, stock status, search, and scoped center
    const filteredItems = centerScopedItems.filter(item => {
        if (categoryTab !== "ALL" && item.category !== categoryTab) return false;

        if (centerFilter !== "ALL") {
            const matchesItemCenter = (item as any).healthCenterId === centerFilter;
            const hasBatchesForCenter = item.batches && item.batches.length > 0;
            if (!matchesItemCenter && !hasBatchesForCenter) return false;
        }

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
            const hasMatchingBatch = item.batches?.some(b => b.batchNumber.toLowerCase().includes(q));
            const centerMatch = (item as any).healthCenterName?.toLowerCase().includes(q);
            return nameMatch || genericMatch || brandMatch || batchMatch || hasMatchingBatch || centerMatch;
        }

        return true;
    });

    // Overview Stats calculated per center scope
    const totalItems = centerScopedItems.length;
    const totalMedicines = centerScopedItems.filter(i => i.category === "MEDICINE").length;
    const totalSupplies = centerScopedItems.filter(i => i.category === "MEDICAL_SUPPLY").length;
    const lowStockCount = centerScopedItems.filter(i => i.quantity > 0 && i.quantity <= i.reorderLevel).length;
    const outOfStockCount = centerScopedItems.filter(i => i.quantity <= 0).length;
    const expiringSoonCount = centerScopedItems.filter(i => getExpirationStatus(i.expirationDate).status === "EXPIRING_SOON").length;
    const expiredCount = centerScopedItems.filter(i => getExpirationStatus(i.expirationDate).status === "EXPIRED").length;

    return (
        <div className="p-2 md:p-4 max-w-full mx-auto space-y-6 pb-20">
            {/* Header Banner */}
            <div className="px-6 py-8 rounded-[1.5rem] border bg-gradient-to-r from-rose-500/10 via-rose-500/5 to-transparent border-rose-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter drop-shadow-sm text-rose-600 dark:text-rose-400 flex items-center gap-3">
                        <Package className="w-8 h-8 text-rose-500" />
                        RHU <span className="tracking-normal italic">Inventory & Pharmacy</span>
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 font-black uppercase tracking-[0.2em] text-[10px] opacity-70">
                        Manage medicine catalog, multi-batch delivery shipments, health center allocations, stock levels, and FEFO expiration dates.
                    </p>
                </div>
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 shrink-0">


                    <Button
                        onClick={refreshData}
                        variant="outline"
                        size="sm"
                        disabled={isPending || isSyncing}
                        className="rounded-xl border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold h-10 px-3.5"
                    >
                        <RefreshCw className={`w-4 h-4 mr-2 ${isPending || isSyncing ? "animate-spin" : ""}`} />
                        Refresh
                    </Button>
                    {!canManageInventory && (
                        <div className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 font-semibold text-xs h-10">
                            <ShieldAlert className="w-4 h-4 text-amber-500" />
                            Read-Only Staff Access
                        </div>
                    )}
                    {canManageInventory && (
                        <>
                            <Button
                                onClick={() => handleOpenStockInModal()}
                                variant="outline"
                                size="sm"
                                className="rounded-xl border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 font-bold h-10 px-3.5"
                            >
                                <Truck className="w-4 h-4 mr-2 text-emerald-500" />
                                + Stock In
                            </Button>
                            <Button
                                onClick={handleOpenCreateModal}
                                size="sm"
                                className="bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/20 font-bold rounded-xl h-10 px-4"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                + Add Master Item
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* Top Inventory Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
                <Card className="border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-semibold text-slate-500 dark:text-slate-400">Total Items</CardTitle>
                        <Package className="w-4 h-4 text-slate-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black">{totalItems}</div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Cataloged items</p>
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
                        <div className="text-2xl font-black text-amber-700 dark:text-amber-300">
                            {lowStockCount + outOfStockCount}
                        </div>
                        <p className="text-xs text-amber-600/70 dark:text-amber-400/70 mt-1">
                            {outOfStockCount === 0 && lowStockCount === 0
                                ? "Stock levels healthy"
                                : `${outOfStockCount} Out of Stock${lowStockCount > 0 ? `, ${lowStockCount} Low Stock` : ''}`}
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-rose-200 dark:border-rose-900/40 bg-rose-50/30 dark:bg-rose-950/20 backdrop-blur-md shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-semibold text-rose-600 dark:text-rose-400">Expiring / Expired</CardTitle>
                        <Calendar className="w-4 h-4 text-rose-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-rose-700 dark:text-rose-300">
                            {expiringSoonCount + expiredCount}
                        </div>
                        <p className="text-xs text-rose-600/70 dark:text-rose-400/70 mt-1">
                            {expiredCount === 0 && expiringSoonCount === 0
                                ? "No expiration alerts"
                                : `${expiredCount} Expired${expiringSoonCount > 0 ? `, ${expiringSoonCount} Expiring Soon` : ''}`}
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
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${categoryTab === "ALL"
                                    ? "bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-sm"
                                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                                }`}
                        >
                            All Items ({items.length})
                        </button>
                        <button
                            onClick={() => setCategoryTab("MEDICINE")}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${categoryTab === "MEDICINE"
                                    ? "bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm"
                                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                                }`}
                        >
                            <Pill className="w-3.5 h-3.5" />
                            Medicines ({totalMedicines})
                        </button>
                        <button
                            onClick={() => setCategoryTab("MEDICAL_SUPPLY")}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${categoryTab === "MEDICAL_SUPPLY"
                                    ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm"
                                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                                }`}
                        >
                            <Stethoscope className="w-3.5 h-3.5" />
                            Medical Supplies ({totalSupplies})
                        </button>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2.5 w-full md:w-auto">
                        {/* Health Center Filter Dropdown or Locked Badge */}
                        {isCenterScopedUser ? (
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-500/10 dark:bg-rose-950/40 border border-rose-500/20 rounded-lg text-xs font-bold text-rose-500 shrink-0 h-9">
                                <Hospital className="w-3.5 h-3.5" />
                                <span>{userMatchedCenter.name}</span>
                            </div>
                        ) : (
                            <Select
                                value={centerFilter}
                                onValueChange={(val: string) => setCenterFilter(val)}
                            >
                                <SelectTrigger className="w-full sm:w-[200px] h-9 rounded-lg text-xs font-semibold">
                                    <Hospital className="w-3.5 h-3.5 mr-2 text-rose-500" />
                                    <SelectValue placeholder="Health Center" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">All Health Centers</SelectItem>
                                    {centers.map((c: any) => (
                                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}

                        {/* Stock & Expiration Filter Dropdown */}
                        <Select
                            value={stockFilter}
                            onValueChange={(val: any) => setStockFilter(val)}
                        >
                            <SelectTrigger className="w-full sm:w-[170px] h-9 rounded-lg text-xs">
                                <Filter className="w-3.5 h-3.5 mr-2 text-slate-400" />
                                <SelectValue placeholder="Stock / Expiration" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Stock Status</SelectItem>
                                <SelectItem value="IN_STOCK">In Stock</SelectItem>
                                <SelectItem value="LOW_STOCK">Low Stock Alert</SelectItem>
                                <SelectItem value="OUT_OF_STOCK">Out of Stock</SelectItem>
                                <SelectItem value="EXPIRING_SOON">Expiring Soon (60d)</SelectItem>
                                <SelectItem value="EXPIRED">Already Expired</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* Search Input */}
                        <div className="relative w-full sm:w-[220px]">
                            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                            <Input
                                placeholder="Search by name, brand, center..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 h-9 text-xs rounded-lg"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Inventory Table with FEFO Multi-Batch Drawer */}
            <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-slate-50 dark:bg-slate-800/40">
                            <TableRow>
                                <TableHead className="w-8"></TableHead>
                                <TableHead className="font-bold text-xs">Item Name / Generic</TableHead>
                                <TableHead className="font-bold text-xs">Category</TableHead>
                                <TableHead className="font-bold text-xs">Dosage / Unit</TableHead>
                                <TableHead className="font-bold text-xs">Total Stock</TableHead>
                                <TableHead className="font-bold text-xs">FEFO Earliest Expiry</TableHead>
                                <TableHead className="font-bold text-xs text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredItems.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-12 text-slate-400">
                                        <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                        <p className="font-semibold text-sm">No inventory items found</p>
                                        <p className="text-xs opacity-70 mt-1">Try adjusting your filters or click &quot;Add Master Item&quot;.</p>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredItems.map((item) => {
                                    const isOutOfStock = item.quantity <= 0;
                                    const isLowStock = item.quantity > 0 && item.quantity <= item.reorderLevel;
                                    const expInfo = getExpirationStatus(item.expirationDate);
                                    const isExpanded = expandedItemIds.includes(item.id);
                                    const batchList = item.batches || [];

                                    return (
                                        <React.Fragment key={item.id}>
                                            <TableRow className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                                                <TableCell className="pr-0">
                                                    <Button
                                                        onClick={() => toggleExpandRow(item.id)}
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-7 w-7 p-0 text-slate-400 hover:text-slate-700"
                                                        title="Toggle Batches Breakdown"
                                                    >
                                                        {isExpanded ? (
                                                            <ChevronUp className="w-4 h-4" />
                                                        ) : (
                                                            <ChevronDown className="w-4 h-4" />
                                                        )}
                                                    </Button>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                                        {item.name}
                                                        {batchList.length > 0 && (
                                                            <Badge variant="outline" className="text-[9px] bg-slate-100 dark:bg-slate-800 font-medium">
                                                                {batchList.length} {batchList.length === 1 ? 'batch' : 'batches'}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-1.5 mt-0.5">
                                                        {item.genericName && <span>Generic: {item.genericName}</span>}
                                                        {item.brandName && <span>• Brand: {item.brandName}</span>}
                                                        {item.batchNumber && <span>• Latest Batch: #{item.batchNumber}</span>}
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
                                                            <Badge className="bg-red-600 text-white font-black text-[10px] uppercase px-2 py-0.5 border border-red-500 shadow-sm">
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
                                                    {canManageInventory ? (
                                                        <div className="flex items-center justify-end gap-1">
                                                            <Button
                                                                onClick={() => handleOpenStockInModal(item)}
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-8 px-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                                                                title="Receive Delivery Stock In"
                                                            >
                                                                <Truck className="w-3.5 h-3.5 mr-1" />
                                                                <span className="text-xs font-semibold hidden sm:inline">Stock In</span>
                                                            </Button>
                                                            <Button
                                                                onClick={() => handleOpenEditModal(item)}
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-8 px-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800"
                                                                title="Edit Item Catalog"
                                                            >
                                                                <Edit3 className="w-3.5 h-3.5" />
                                                            </Button>
                                                            <Button
                                                                onClick={() => {
                                                                    setDeletingItemId(item.id);
                                                                    setDeletingItemName(item.name);
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
                                                    ) : (
                                                        <span className="text-xs text-slate-400 font-medium italic">Read-only</span>
                                                    )}
                                                </TableCell>
                                            </TableRow>

                                            {/* FEFO Batches Drawer */}
                                            {isExpanded && (
                                                <TableRow className="bg-slate-50/80 dark:bg-slate-900/40">
                                                    <TableCell colSpan={7} className="p-4 pl-10">
                                                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-inner space-y-3">
                                                            <div className="flex items-center justify-between border-b pb-2">
                                                                <h4 className="text-xs font-black uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-2">
                                                                    <Boxes className="w-4 h-4 text-rose-500" />
                                                                    Batch Shipments & FEFO Priority Breakdown ({item.name})
                                                                </h4>
                                                                {canManageInventory && (
                                                                    <Button
                                                                        onClick={() => handleOpenStockInModal(item)}
                                                                        size="sm"
                                                                        className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-2.5"
                                                                    >
                                                                        <Plus className="w-3 h-3 mr-1" /> Add Batch Delivery
                                                                    </Button>
                                                                )}
                                                            </div>

                                                            {batchList.length === 0 ? (
                                                                <div className="text-xs text-slate-400 italic py-3 text-center">
                                                                    No specific batch deliveries logged yet. Click &quot;Add Batch Delivery&quot; to log shipments.
                                                                </div>
                                                            ) : (
                                                                <div className="overflow-x-auto">
                                                                    <Table>
                                                                        <TableHeader>
                                                                            <TableRow className="border-b text-[11px]">
                                                                                <TableHead className="h-7 text-[10px] font-bold">FEFO Order</TableHead>
                                                                                <TableHead className="h-7 text-[10px] font-bold">Batch / Lot No.</TableHead>
                                                                                <TableHead className="h-7 text-[10px] font-bold">Target Health Center / Depot</TableHead>
                                                                                <TableHead className="h-7 text-[10px] font-bold">Current Stock</TableHead>
                                                                                <TableHead className="h-7 text-[10px] font-bold">Expiration Date</TableHead>
                                                                                <TableHead className="h-7 text-[10px] font-bold text-right">Actions</TableHead>
                                                                            </TableRow>
                                                                        </TableHeader>
                                                                        <TableBody>
                                                                            {(() => {
                                                                                // Separate active non-expired batches vs expired / zero-stock batches
                                                                                const sortedBatches = [...batchList].sort((a, b) => {
                                                                                    const aExp = getExpirationStatus(a.expirationDate);
                                                                                    const bExp = getExpirationStatus(b.expirationDate);
                                                                                    const aIsExpired = aExp.status === "EXPIRED";
                                                                                    const bIsExpired = bExp.status === "EXPIRED";

                                                                                    if (!aIsExpired && bIsExpired) return -1;
                                                                                    if (aIsExpired && !bIsExpired) return 1;

                                                                                    const aTime = a.expirationDate ? new Date(a.expirationDate).getTime() : Infinity;
                                                                                    const bTime = b.expirationDate ? new Date(b.expirationDate).getTime() : Infinity;
                                                                                    return aTime - bTime;
                                                                                });

                                                                                // Find the first valid non-expired batch with quantity > 0 for FEFO P1
                                                                                const fefoP1BatchId = sortedBatches.find(b => {
                                                                                    const exp = getExpirationStatus(b.expirationDate);
                                                                                    return exp.status !== "EXPIRED" && (b.quantity || 0) > 0;
                                                                                })?.id;

                                                                                let nonExpiredPriorityIndex = 0;

                                                                                return sortedBatches.map((batch, bIndex) => {
                                                                                    const batchExpInfo = getExpirationStatus(batch.expirationDate);
                                                                                    const isExpired = batchExpInfo.status === "EXPIRED";
                                                                                    const isFefoTarget = !isExpired && batch.id === fefoP1BatchId;

                                                                                    if (!isExpired) {
                                                                                        nonExpiredPriorityIndex++;
                                                                                    }

                                                                                    return (
                                                                                        <TableRow key={batch.id || bIndex} className={cn("text-xs", isFefoTarget && "bg-emerald-500/5", isExpired && "bg-rose-500/5 opacity-80")}>
                                                                                            <TableCell className="py-2">
                                                                                                {isExpired ? (
                                                                                                    <Badge variant="destructive" className="text-[9px] uppercase font-bold px-2 py-0.5 gap-1">
                                                                                                        <AlertTriangle className="w-3 h-3" /> Expired (Do Not Dispense)
                                                                                                    </Badge>
                                                                                                ) : isFefoTarget ? (
                                                                                                    <Badge className="bg-emerald-600 text-white text-[9px] uppercase font-bold px-2 py-0.5 gap-1">
                                                                                                        <CheckCircle2 className="w-3 h-3" /> Dispense First (FEFO P1)
                                                                                                    </Badge>
                                                                                                ) : (
                                                                                                    <span className="text-slate-400 font-mono text-[10px]">Priority #{nonExpiredPriorityIndex}</span>
                                                                                                )}
                                                                                            </TableCell>
                                                                                            <TableCell className="font-mono font-bold text-slate-800 dark:text-slate-200 py-2">
                                                                                                #{batch.batchNumber}
                                                                                            </TableCell>
                                                                                            <TableCell className="py-2">
                                                                                                {canManageInventory && !isCenterScopedUser ? (
                                                                                                    <Select
                                                                                                        value={batch.healthCenterId || "ALL"}
                                                                                                        onValueChange={(val) => handleBatchCenterChange(batch.id, batch.batchNumber, val)}
                                                                                                    >
                                                                                                        <SelectTrigger className="h-7 text-[11px] rounded-lg border-rose-500/30 text-rose-600 dark:text-rose-400 bg-rose-500/5 hover:bg-rose-500/10 font-semibold gap-1 px-2.5 shadow-none focus:ring-1 focus:ring-rose-500 max-w-[210px]">
                                                                                                            <Hospital className="w-3 h-3 text-rose-500 shrink-0" />
                                                                                                            <SelectValue placeholder="Central Inventory (All Centers)" />
                                                                                                        </SelectTrigger>
                                                                                                        <SelectContent>
                                                                                                            <SelectItem value="ALL">Central Inventory (All Centers)</SelectItem>
                                                                                                            {centers.map((c: any) => (
                                                                                                                <SelectItem key={c.id} value={c.id}>
                                                                                                                    {c.name} ({c.barangay})
                                                                                                                </SelectItem>
                                                                                                            ))}
                                                                                                        </SelectContent>
                                                                                                    </Select>
                                                                                                ) : (
                                                                                                    <Badge variant="outline" className="text-[10px] border-rose-500/20 text-rose-600 dark:text-rose-400 bg-rose-500/5 gap-1 font-semibold">
                                                                                                        <Hospital className="w-3 h-3" />
                                                                                                        {batch.healthCenterName || (batch.healthCenterId ? centers.find((c: any) => c.id === batch.healthCenterId)?.name : "Central RHU Depot")}
                                                                                                    </Badge>
                                                                                                )}
                                                                                            </TableCell>
                                                                                            <TableCell className="py-2 font-black">
                                                                                                {batch.quantity} <span className="text-[10px] font-normal text-slate-400">{item.unit}</span>
                                                                                            </TableCell>
                                                                                            <TableCell className="py-2">
                                                                                                {batchExpInfo.status === "EXPIRED" ? (
                                                                                                    <span className="text-rose-600 font-bold">{batchExpInfo.label} (Expired)</span>
                                                                                                ) : batchExpInfo.status === "EXPIRING_SOON" ? (
                                                                                                    <span className="text-amber-600 font-bold">{batchExpInfo.label} ({batchExpInfo.badgeText})</span>
                                                                                                ) : (
                                                                                                    <span>{batchExpInfo.label}</span>
                                                                                                )}
                                                                                            </TableCell>
                                                                                            <TableCell className="text-right py-2 space-x-1">
                                                                                                {canManageInventory ? (
                                                                                                    <>
                                                                                                        <Button
                                                                                                            onClick={() => handleOpenBatchAdjustModal(
                                                                                                                batch.id,
                                                                                                                batch.batchNumber,
                                                                                                                item.name,
                                                                                                                item.unit,
                                                                                                                batch.quantity
                                                                                                            )}
                                                                                                            variant="outline"
                                                                                                            size="sm"
                                                                                                            className="h-7 px-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 border-rose-200 dark:border-rose-800/60 gap-1.5"
                                                                                                            title="Adjust batch stock quantity"
                                                                                                        >
                                                                                                            <ArrowUpDown className="w-3.5 h-3.5" />
                                                                                                            Adjust Stock
                                                                                                        </Button>
                                                                                                        <Button
                                                                                                            onClick={() => handleOpenDeleteBatchModal(batch.id, batch.batchNumber)}
                                                                                                            variant="ghost"
                                                                                                            size="sm"
                                                                                                            className="h-6 px-1.5 text-rose-500 hover:text-rose-700"
                                                                                                            title="Delete Batch"
                                                                                                        >
                                                                                                            <Trash2 className="w-3 h-3" />
                                                                                                        </Button>
                                                                                                    </>
                                                                                                ) : (
                                                                                                    <span className="text-[11px] text-slate-400 italic">Read-only</span>
                                                                                                )}
                                                                                            </TableCell>
                                                                                        </TableRow>
                                                                                    );
                                                                                });
                                                                            })()}
                                                                        </TableBody>
                                                                    </Table>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </React.Fragment>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>
            </Card>

            {/* Master Item Dialog (Catalog Only) */}
            <Dialog open={isItemModalOpen} onOpenChange={setIsItemModalOpen}>
                <DialogContent className="sm:max-w-[540px] rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold flex items-center gap-2 text-rose-600">
                            {editingItem ? <Edit3 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                            {editingItem ? "Edit Master Catalog Item" : "Add Master Inventory Item (Catalog)"}
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Define item master metadata. Delivery batch numbers and expiration dates are logged separately per shipment.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSaveItem} className="space-y-4 py-2">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Category *</Label>
                                <Select
                                    value={formData.category || ""}
                                    onValueChange={(val: any) => setFormData({ ...formData, category: val })}
                                >
                                    <SelectTrigger className={cn("h-9 text-xs rounded-xl", formErrors.category && "border-red-500 focus:ring-red-500")}>
                                        <SelectValue placeholder="Select Category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="MEDICINE">Medicine</SelectItem>
                                        <SelectItem value="MEDICAL_SUPPLY">Medical Supply</SelectItem>
                                    </SelectContent>
                                </Select>
                                {formErrors.category && <p className="text-[10px] text-red-500 font-medium">{formErrors.category}</p>}
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Unit of Measure *</Label>
                                <Input
                                    placeholder="e.g. pcs, tablets, boxes, bottles"
                                    value={formData.unit}
                                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                    className={cn("h-9 text-xs rounded-xl", formErrors.unit && "border-red-500 focus-visible:ring-red-500")}
                                />
                                {formErrors.unit && <p className="text-[10px] text-red-500 font-medium">{formErrors.unit}</p>}
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Item Name *</Label>
                            <Input
                                placeholder="e.g. Paracetamol, Amoxicillin, Surgical Gloves"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className={cn("h-9 text-xs rounded-xl", formErrors.name && "border-red-500 focus-visible:ring-red-500")}
                            />
                            {formErrors.name && <p className="text-[10px] text-red-500 font-medium">{formErrors.name}</p>}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Generic Name (Optional)</Label>
                                <Input
                                    placeholder="e.g. Acetaminophen"
                                    value={formData.genericName || ""}
                                    onChange={(e) => setFormData({ ...formData, genericName: e.target.value })}
                                    className="h-9 text-xs rounded-xl"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Brand Name (Optional)</Label>
                                <Input
                                    placeholder="e.g. Biogesic"
                                    value={formData.brandName || ""}
                                    onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
                                    className="h-9 text-xs rounded-xl"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Dosage / Formulation</Label>
                                <Input
                                    placeholder="e.g. 500mg, 250mg/5ml, Large"
                                    value={formData.dosage || ""}
                                    onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                                    className="h-9 text-xs rounded-xl"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Reorder Threshold Alert</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    placeholder="10"
                                    value={formData.reorderLevel}
                                    onChange={(e) => setFormData({ ...formData, reorderLevel: parseInt(e.target.value) || 0 })}
                                    className="h-9 text-xs rounded-xl"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Remarks / Storage Notes</Label>
                            <Input
                                placeholder="e.g. Store below 30°C, Protect from light"
                                value={formData.remarks || ""}
                                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                                className="h-9 text-xs rounded-xl"
                            />
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsItemModalOpen(false)}
                                className="rounded-xl text-xs h-9"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isPending}
                                className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs h-9 font-bold"
                            >
                                {isPending ? "Saving..." : editingItem ? "Update Item" : "Create Master Item"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Stock In / Receive Delivery Batch Dialog */}
            <Dialog open={isStockInModalOpen} onOpenChange={setIsStockInModalOpen}>
                <DialogContent className="sm:max-w-[500px] rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold flex items-center gap-2 text-emerald-600">
                            <Truck className="w-5 h-5 text-emerald-600" />
                            Receive Stock Delivery (Stock In)
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Log a new delivery shipment with batch number, target health center, and expiration date for FEFO tracking.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSaveStockInBatch} className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Select Inventory Item *</Label>
                            <Select
                                value={stockInFormData.itemId}
                                onValueChange={(val) => setStockInFormData({ ...stockInFormData, itemId: val })}
                            >
                                <SelectTrigger className={cn("h-9 text-xs rounded-xl", stockInFormErrors.itemId && "border-red-500 focus:ring-red-500")}>
                                    <SelectValue placeholder="Choose item" />
                                </SelectTrigger>
                                <SelectContent>
                                    {items.map((i) => (
                                        <SelectItem key={i.id} value={i.id}>
                                            {i.name} {i.dosage ? `(${i.dosage})` : ''} - [{i.category}]
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {stockInFormErrors.itemId && <p className="text-[10px] text-red-500 font-medium">{stockInFormErrors.itemId}</p>}
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Target Health Center / Depot</Label>
                            {isCenterScopedUser ? (
                                <div className="flex items-center gap-2 px-3 py-2 bg-rose-500/10 dark:bg-rose-950/40 border border-rose-500/20 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400">
                                    <Hospital className="w-4 h-4 text-rose-500 shrink-0" />
                                    <span>{userMatchedCenter?.name || "Your Health Center"}</span>
                                </div>
                            ) : (
                                <Select
                                    value={stockInFormData.healthCenterId || "ALL"}
                                    onValueChange={(val) => setStockInFormData({ ...stockInFormData, healthCenterId: val === "ALL" ? null : val })}
                                >
                                    <SelectTrigger className="h-9 text-xs rounded-xl">
                                        <SelectValue placeholder="Central RHU Depot (All Centers)" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL">Central RHU Depot (All Centers)</SelectItem>
                                        {centers.map((c: any) => (
                                            <SelectItem key={c.id} value={c.id}>{c.name} ({c.barangay})</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Batch / Lot Number *</Label>
                                <Input
                                    placeholder="e.g. LOT-2027A-01"
                                    value={stockInFormData.batchNumber}
                                    onChange={(e) => setStockInFormData({ ...stockInFormData, batchNumber: e.target.value })}
                                    className={cn("h-9 text-xs rounded-xl font-mono", stockInFormErrors.batchNumber && "border-red-500 focus-visible:ring-red-500")}
                                />
                                {stockInFormErrors.batchNumber && <p className="text-[10px] text-red-500 font-medium">{stockInFormErrors.batchNumber}</p>}
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Quantity Received *</Label>
                                <Input
                                    type="number"
                                    min="1"
                                    placeholder="e.g. 100"
                                    value={stockInFormData.quantity || ""}
                                    onChange={(e) => setStockInFormData({ ...stockInFormData, quantity: parseInt(e.target.value) || 0 })}
                                    className={cn("h-9 text-xs rounded-xl font-bold", stockInFormErrors.quantity && "border-red-500 focus-visible:ring-red-500")}
                                />
                                {stockInFormErrors.quantity && <p className="text-[10px] text-red-500 font-medium">{stockInFormErrors.quantity}</p>}
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Expiration Date *</Label>
                            <Input
                                type="date"
                                min={new Date().toISOString().split("T")[0]}
                                value={stockInFormData.expirationDate || ""}
                                onChange={(e) => setStockInFormData({ ...stockInFormData, expirationDate: e.target.value })}
                                className={cn("h-9 text-xs rounded-xl", stockInFormErrors.expirationDate && "border-red-500 focus-visible:ring-red-500")}
                            />
                            {stockInFormErrors.expirationDate && <p className="text-[10px] text-red-500 font-medium">{stockInFormErrors.expirationDate}</p>}
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsStockInModalOpen(false)}
                                className="rounded-xl text-xs h-9"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isPending}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs h-9 font-bold"
                            >
                                {isPending ? "Logging Shipment..." : "Log Stock In Batch"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Quick Adjust Stock Dialog */}
            <Dialog open={isStockModalOpen} onOpenChange={setIsStockModalOpen}>
                <DialogContent className="sm:max-w-[400px] rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold flex items-center gap-2 text-rose-600">
                            <ArrowUpDown className="w-5 h-5" /> Adjust Total Stock
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Adjust overall quantity on hand for &quot;{stockAdjustItem?.name}&quot;.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-3">
                        <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl flex items-center justify-between text-xs">
                            <span className="text-slate-500">Current Stock:</span>
                            <span className="font-bold text-sm">{stockAdjustItem?.quantity} {stockAdjustItem?.unit}</span>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Stock Adjustment (+ / -)</Label>
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setStockDelta(-10)}
                                    className="h-9 px-3 text-xs"
                                >
                                    -10
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setStockDelta(-1)}
                                    className="h-9 px-3 text-xs"
                                >
                                    -1
                                </Button>
                                <Input
                                    type="number"
                                    value={stockDelta}
                                    onChange={(e) => setStockDelta(parseInt(e.target.value) || 0)}
                                    className="h-9 text-center text-xs font-bold rounded-xl"
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setStockDelta(1)}
                                    className="h-9 px-3 text-xs"
                                >
                                    +1
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setStockDelta(10)}
                                    className="h-9 px-3 text-xs"
                                >
                                    +10
                                </Button>
                            </div>
                        </div>

                        <div className="bg-rose-50 dark:bg-rose-950/30 p-3 rounded-xl flex items-center justify-between text-xs border border-rose-200 dark:border-rose-900/40">
                            <span className="text-rose-700 dark:text-rose-300 font-semibold">New Total Stock:</span>
                            <span className="font-black text-sm text-rose-700 dark:text-rose-300">
                                {Math.max(0, (stockAdjustItem?.quantity || 0) + stockDelta)} {stockAdjustItem?.unit}
                            </span>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsStockModalOpen(false)}
                            className="rounded-xl text-xs h-9"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={handleSaveStockAdjust}
                            disabled={isPending || stockDelta === 0}
                            className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs h-9 font-bold"
                        >
                            Save Adjustment
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Confirm Delete Item Dialog */}
            <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
                <DialogContent className="sm:max-w-[420px] rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold flex items-center gap-2 text-red-600">
                            <AlertTriangle className="w-5 h-5 text-red-500" /> Confirm Item Deletion
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Are you sure you want to remove <strong className="text-slate-900 dark:text-slate-100">&quot;{deletingItemName}&quot;</strong> and all its linked batch shipments from the RHU inventory? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>

                    <DialogFooter className="pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsDeleteModalOpen(false)}
                            className="rounded-xl text-xs h-9"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={handleConfirmDelete}
                            disabled={isPending}
                            className="bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs h-9 font-bold"
                        >
                            {isPending ? "Deleting..." : "Delete Item"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Confirm Delete Batch Dialog */}
            <Dialog open={isDeleteBatchModalOpen} onOpenChange={setIsDeleteBatchModalOpen}>
                <DialogContent className="sm:max-w-[420px] rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold flex items-center gap-2 text-red-600">
                            <AlertTriangle className="w-5 h-5 text-red-500" /> Confirm Batch Deletion
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Are you sure you want to delete Batch <strong className="text-slate-900 dark:text-slate-100">#{deletingBatchNo}</strong>? The batch stock will be removed and total stock recalculation will occur immediately.
                        </DialogDescription>
                    </DialogHeader>

                    <DialogFooter className="pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsDeleteBatchModalOpen(false)}
                            className="rounded-xl text-xs h-9"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={handleConfirmDeleteBatch}
                            disabled={isPending}
                            className="bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs h-9 font-bold"
                        >
                            {isPending ? "Deleting..." : "Delete Batch"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Batch Stock Adjustment Modal Popup */}
            <Dialog open={isBatchAdjustModalOpen} onOpenChange={setIsBatchAdjustModalOpen}>
                <DialogContent className="sm:max-w-[400px] rounded-2xl p-6">
                    <DialogHeader className="space-y-1">
                        <DialogTitle className="text-base font-bold flex items-center gap-2 text-rose-600 dark:text-rose-400">
                            <ArrowUpDown className="w-4 h-4 text-rose-500" />
                            Adjust Batch Stock
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            {batchAdjustTarget && (
                                <>
                                    {batchAdjustTarget.itemName} • Batch <strong className="text-slate-900 dark:text-slate-100">#{batchAdjustTarget.batchNumber}</strong>
                                </>
                            )}
                        </DialogDescription>
                    </DialogHeader>

                    {batchAdjustTarget && (
                        <div className="space-y-4 py-3">
                            {/* Input Field with -10 and +10 Quick Step Buttons */}
                            <div className="space-y-2">
                                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                    Current Stock Quantity ({batchAdjustTarget.unit})
                                </Label>
                                <div className="flex items-center gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-11 px-3.5 font-bold text-xs shrink-0 rounded-xl hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30"
                                        onClick={() => setBatchAdjustAmount(prev => Math.max(0, prev - 10))}
                                    >
                                        -10
                                    </Button>
                                    <Input
                                        type="number"
                                        min={0}
                                        value={batchAdjustAmount}
                                        onChange={(e) => setBatchAdjustAmount(Math.max(0, parseInt(e.target.value) || 0))}
                                        className="h-11 text-center text-base font-black rounded-xl border-2 focus-visible:ring-rose-500"
                                        placeholder="Current Stock..."
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-11 px-3.5 font-bold text-xs shrink-0 rounded-xl hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950/30"
                                        onClick={() => setBatchAdjustAmount(prev => prev + 10)}
                                    >
                                        +10
                                    </Button>
                                </div>
                            </div>

                            {/* Stock Delta Summary */}
                            {(() => {
                                const diff = batchAdjustAmount - batchAdjustTarget.currentQuantity;
                                return (
                                    <div className="bg-slate-100 dark:bg-slate-800/80 p-3 rounded-xl flex items-center justify-between text-xs border border-slate-200 dark:border-slate-700">
                                        <span className="text-slate-500 font-medium">Initial: {batchAdjustTarget.currentQuantity.toLocaleString()} {batchAdjustTarget.unit}</span>
                                        <span className={cn(
                                            "font-bold text-xs px-2 py-0.5 rounded-md",
                                            diff > 0 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
                                                diff < 0 ? "bg-rose-500/10 text-rose-600 dark:text-rose-400" : "bg-slate-200 dark:bg-slate-700 text-slate-500"
                                        )}>
                                            {diff > 0 ? `+${diff.toLocaleString()}` : diff < 0 ? diff.toLocaleString() : "No Change"}
                                        </span>
                                    </div>
                                );
                            })()}
                        </div>
                    )}

                    <DialogFooter className="gap-2 sm:gap-0 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsBatchAdjustModalOpen(false)}
                            disabled={isPending}
                            className="rounded-xl text-xs h-9"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={() => {
                                if (!batchAdjustTarget) return;
                                const delta = batchAdjustAmount - batchAdjustTarget.currentQuantity;

                                startTransition(async () => {
                                    const res = await adjustRHUBatchQuantity(batchAdjustTarget.batchId, delta);
                                    if (res.success) {
                                        toast.success(`Batch #${batchAdjustTarget.batchNumber} stock updated!`);
                                        setIsBatchAdjustModalOpen(false);
                                        await refreshData();
                                    } else {
                                        toast.error(res.error || "Failed to adjust batch stock");
                                    }
                                });
                            }}
                            disabled={isPending}
                            className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs h-9 font-bold px-5"
                        >
                            {isPending ? "Saving..." : "Save Stock"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
