"use client";

import React, { useState, useTransition, useRef } from "react";
import { toast } from "sonner";
import {
    Activity,
    Boxes,
    ShoppingCart,
    Truck,
    RotateCcw,
    Wrench,
    FileText,
    FileSpreadsheet,
    Printer,
    Plus,
    Search,
    QrCode,
    CheckCircle2,
    AlertTriangle,
    XCircle,
    Building2,
    DoorClosed,
    User,
    Trash2,
    Edit3,
    ClipboardCheck,
    Download,
    ChevronLeft,
    ChevronRight,
    Eye,
    Calendar,
    Clock
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { useSystemTheme } from "@/components/providers/ThemeProvider";
import { cn } from "@/lib/utils";
import { getRoomsForFacility } from "./constants";
import {
    saveMedicalAsset,
    verifyLegacyAsset,
    deleteMedicalAsset,
    fileDefectRepairRequest,
    resolveEquipmentRepair,
    createEquipmentPO,
    intakePOToStockroom,
    createEquipmentRO,
    dispatchStockTransfer,
    receiveStockTransfer,
    resolveStockReturnTicket,
    getRHUEquipmentData
} from "./actions";
import { exportCOAPDF, exportCOAExcel } from "./components/COAReportExporter";

interface EquipmentClientProps {
    initialAssets: any[];
    initialStockroomAssets?: any[];
    initialPOs: any[];
    initialROs: any[];
    initialSOs: any[];
    initialReturns: any[];
    initialCenters?: any[];
    matchedCenter?: any | null;
    isReadOnly?: boolean;
}

type TabType = "LEDGER" | "PO" | "RO" | "SO" | "RETURNS" | "MAINTENANCE" | "REPORTS";

export default function EquipmentClient({
    initialAssets,
    initialStockroomAssets = [],
    initialPOs,
    initialROs,
    initialSOs,
    initialReturns,
    initialCenters = [],
    matchedCenter = null,
    isReadOnly = false
}: EquipmentClientProps) {
    let themeColor = "#0284c7";
    try {
        const sys = useSystemTheme();
        if (sys?.themeColor) themeColor = sys.themeColor;
    } catch {}

    const [activeTab, setActiveTab] = useState<TabType>("LEDGER");
    const [isPending, startTransition] = useTransition();
    const tabsContainerRef = useRef<HTMLDivElement>(null);

    const scrollTabs = (direction: "left" | "right") => {
        if (tabsContainerRef.current) {
            const scrollAmount = direction === "left" ? -260 : 260;
            tabsContainerRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
        }
    };

    // Data State
    const [assets, setAssets] = useState<any[]>(initialAssets);
    const [stockroomAssets, setStockroomAssets] = useState<any[]>(
        initialStockroomAssets && initialStockroomAssets.length > 0
            ? initialStockroomAssets
            : initialAssets.filter(a => a.currentStatus === "IN_STOCKROOM")
    );
    const [pos, setPos] = useState<any[]>(initialPOs);
    const [ros, setRos] = useState<any[]>(initialROs);
    const [sos, setSos] = useState<any[]>(initialSOs);
    const [returns, setReturns] = useState<any[]>(initialReturns);

    // Dynamic Registered Facilities from DB
    const registeredCenters = (initialCenters && initialCenters.length > 0)
        ? initialCenters
        : [{ id: "main-rhu", name: "Main Rural Health Unit (RHU)", barangay: "Poblacion" }];

    const facilityNames: string[] = registeredCenters.map((c: any) => c.name);
    const nonMainFacilities: string[] = registeredCenters
        .filter((c: any) => !c.name.toLowerCase().includes("main"))
        .map((c: any) => c.name);

    // Filters
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedFacility, setSelectedFacility] = useState<string>(matchedCenter ? matchedCenter.name : "ALL");
    const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
    const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(15);

    // Modals
    const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
    const [editingAsset, setEditingAsset] = useState<any | null>(null);
    const [isPOModalOpen, setIsPOModalOpen] = useState(false);
    const [isROModalOpen, setIsROModalOpen] = useState(false);
    const [isSOModalOpen, setIsSOModalOpen] = useState(false);
    const [isIntakeModalOpen, setIsIntakeModalOpen] = useState(false);
    const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
    const [isRepairModalOpen, setIsRepairModalOpen] = useState(false);
    const [isResolveRepairModalOpen, setIsResolveRepairModalOpen] = useState(false);
    const [isQRModalOpen, setIsQRModalOpen] = useState(false);

    // Delete Confirmation Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [assetToDelete, setAssetToDelete] = useState<any | null>(null);

    // Return Ticket Resolution Modal State
    const [isResolveTicketModalOpen, setIsResolveTicketModalOpen] = useState(false);
    const [ticketToResolve, setTicketToResolve] = useState<any | null>(null);
    const [ticketResolutionNotes, setTicketResolutionNotes] = useState("");
    const [ticketResolutionType, setTicketResolutionType] = useState<"REPLACED_RESOLVED" | "WRITTEN_OFF">("REPLACED_RESOLVED");

    // Active Selection for Modals
    const [activePO, setActivePO] = useState<any | null>(null);
    const [activeSO, setActiveSO] = useState<any | null>(null);
    const [activeAsset, setActiveAsset] = useState<any | null>(null);

    // Asset Form State
    const [assetForm, setAssetForm] = useState({
        equipmentName: "",
        brand: "",
        serialNo: "",
        unitCost: "",
        currentFacility: "Main Rural Health Unit (RHU)",
        assignedRoom: "Central Stockroom",
        accountablePerson: "",
        accountableEmployeeId: "",
        acquisitionSource: "STOCKROOM_ISSUANCE"
    });
    const [assetPhotoFile, setAssetPhotoFile] = useState<File | null>(null);
    const [isCustomRoom, setIsCustomRoom] = useState(false);
    const [customRoomName, setCustomRoomName] = useState("");

    // Purchase Order Form State
    const [poVendor, setPoVendor] = useState("");
    const [poContact, setPoContact] = useState("");
    const [poNotes, setPoNotes] = useState("");
    const [poItems, setPoItems] = useState<Array<{ equipmentName: string; brand: string; quantity: number | string; unitCost: number | string }>>([
        { equipmentName: "", brand: "", quantity: 1, unitCost: "" }
    ]);

    // Request Order Form State
    const [roFacility, setRoFacility] = useState(matchedCenter ? matchedCenter.name : (nonMainFacilities[0] || "BHS Nilombot"));
    const [roRoom, setRoRoom] = useState("Treatment & Examination Room");
    const [isCustomRoRoom, setIsCustomRoRoom] = useState(false);
    const [customRoRoomName, setCustomRoRoomName] = useState("");
    const [roRequestedBy, setRoRequestedBy] = useState("");
    const [roJustification, setRoJustification] = useState("");
    const [roItems, setRoItems] = useState<Array<{ equipmentName: string; quantity: number; estimatedUnitCost: number; urgency: string }>>([
        { equipmentName: "", quantity: 1, estimatedUnitCost: 0, urgency: "NORMAL" }
    ]);

    // SO Form State
    const [soTargetFacility, setSoTargetFacility] = useState("BHS Nilombot");
    const [soTargetRoom, setSoTargetRoom] = useState("Treatment & Examination Room");
    const [soDispatchedBy, setSoDispatchedBy] = useState("RHU Supply Officer");
    const [soNotes, setSoNotes] = useState("");
    const [selectedStockAssetIds, setSelectedStockAssetIds] = useState<string[]>([]);
    const [linkedRoNumber, setLinkedRoNumber] = useState<string>("");

    // Receiving Form State
    const [receivingBy, setReceivingBy] = useState("");
    const [isFullAcceptance, setIsFullAcceptance] = useState(true);
    const [actualReceivedCount, setActualReceivedCount] = useState(0);
    const [missingCount, setMissingCount] = useState(0);
    const [defectiveCount, setDefectiveCount] = useState(0);
    const [receivingDiscrepancyNotes, setReceivingDiscrepancyNotes] = useState("");

    // Repair Form State
    const [repairIssueNotes, setRepairIssueNotes] = useState("");
    const [repairResolutionNotes, setRepairResolutionNotes] = useState("");

    // Signatories for COA Reports (Empty initial state with placeholders)
    const [sigSupplyOfficer, setSigSupplyOfficer] = useState("");
    const [sigMHO, setSigMHO] = useState("");
    const [sigAuditor, setSigAuditor] = useState("");

    // Filtered Assets
    const filteredAssets = assets.filter(a => {
        const matchesSearch = 
            a.equipmentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            a.assetTagNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (a.brand && a.brand.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (a.serialNo && a.serialNo.toLowerCase().includes(searchQuery.toLowerCase())) ||
            a.accountablePerson.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (a.documentReference && a.documentReference.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesFacility = selectedFacility === "ALL" || a.currentFacility === selectedFacility;
        const matchesStatus = selectedStatus === "ALL" || a.currentStatus === selectedStatus;
        const matchesCategory = selectedCategory === "ALL" || a.category === selectedCategory;

        return matchesSearch && matchesFacility && matchesStatus && matchesCategory;
    });

    const totalPages = Math.max(1, Math.ceil(filteredAssets.length / pageSize));
    const paginatedAssets = filteredAssets.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    // Counts
    const inStockroomCount = stockroomAssets.length;
    const deployedCount = assets.filter(a => a.currentStatus === "DEPLOYED_SERVICEABLE").length;
    const defectiveCountTotal = assets.filter(a => a.currentStatus === "DEFECTIVE_FOR_REPAIR").length;
    const pendingVerificationCount = assets.filter(a => a.currentStatus === "PENDING_VERIFICATION").length;
    const ppeCount = assets.filter(a => a.category === "PPE").length;
    const semiCount = assets.filter(a => a.category === "SEMI_EXPENDABLE").length;

    // Status Badge Helpers
    const getStatusBadge = (status: string) => {
        switch (status) {
            case "DEPLOYED_SERVICEABLE":
                return <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-bold">SERVICEABLE</Badge>;
            case "IN_STOCKROOM":
                return <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 font-bold">IN STOCKROOM</Badge>;
            case "DEFECTIVE_FOR_REPAIR":
                return <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 font-bold animate-pulse">DEFECTIVE (REPAIR)</Badge>;
            case "STOCK_RETURN_DISCREPANCY":
                return <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 font-bold">DISCREPANCY RETURN</Badge>;
            case "PENDING_VERIFICATION":
                return <Badge className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 font-bold">PENDING APPROVAL</Badge>;
            case "SO_DISPATCHED":
                return <Badge className="bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20 font-bold">IN TRANSIT</Badge>;
            case "UNSERVICEABLE_FOR_CONDEMNATION":
                return <Badge className="bg-red-600 text-white font-bold">CONDEMNATION (IIRUP)</Badge>;
            case "CONDEMNED_DISPOSED":
                return <Badge className="bg-slate-500 text-white font-bold">DISPOSED</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    // -------------------------------------------------------------------------
    // HANDLERS
    // -------------------------------------------------------------------------

    const handleOpenAddAsset = (isLegacy = false) => {
        setEditingAsset(null);
        setAssetPhotoFile(null);
        const defaultFac = matchedCenter
            ? matchedCenter.name
            : (isLegacy ? "BHS Pias" : "Main Rural Health Unit (RHU)");
        const defaultRooms = getRoomsForFacility(defaultFac);
        const defaultRoom = defaultRooms.includes("Central Stockroom")
            ? (isLegacy ? "Treatment & Examination Room" : "Central Stockroom")
            : (defaultRooms[0] || "Treatment & Examination Room");

        setAssetForm({
            equipmentName: "",
            brand: "",
            serialNo: "",
            unitCost: "",
            currentFacility: defaultFac,
            assignedRoom: defaultRoom,
            accountablePerson: "",
            accountableEmployeeId: "",
            acquisitionSource: isLegacy ? "LEGACY_BHS_EXISTING" : "STOCKROOM_ISSUANCE"
        });
        setIsCustomRoom(false);
        setCustomRoomName("");
        setIsAssetModalOpen(true);
    };

    const handleOpenEditAsset = (asset: any) => {
        setEditingAsset(asset);
        setAssetPhotoFile(null);
        const standardRooms = getRoomsForFacility(asset.currentFacility);
        const isCustom = Boolean(asset.assignedRoom && !standardRooms.includes(asset.assignedRoom));
        setIsCustomRoom(isCustom);
        setCustomRoomName(isCustom ? asset.assignedRoom : "");

        setAssetForm({
            equipmentName: asset.equipmentName,
            brand: asset.brand || "",
            serialNo: asset.serialNo || "",
            unitCost: String(asset.unitCost || 0),
            currentFacility: asset.currentFacility,
            assignedRoom: asset.assignedRoom,
            accountablePerson: asset.accountablePerson || "",
            accountableEmployeeId: asset.accountableEmployeeId || "",
            acquisitionSource: asset.acquisitionSource || "STOCKROOM_ISSUANCE"
        });
        setIsAssetModalOpen(true);
    };

    const handleSaveAsset = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!assetForm.equipmentName.trim()) {
            toast.error("Equipment Name is required.");
            return;
        }

        const finalRoom = (isCustomRoom ? customRoomName.trim() : assetForm.assignedRoom) || "Consultation Area";

        const formData = new FormData();
        if (editingAsset?.id) formData.append("id", editingAsset.id);
        formData.append("equipmentName", assetForm.equipmentName);
        formData.append("brand", assetForm.brand);
        formData.append("serialNo", assetForm.serialNo);
        formData.append("unitCost", assetForm.unitCost || "0");
        formData.append("currentFacility", assetForm.currentFacility);
        formData.append("assignedRoom", finalRoom);
        formData.append("accountablePerson", assetForm.accountablePerson);
        formData.append("accountableEmployeeId", assetForm.accountableEmployeeId);
        formData.append("acquisitionSource", assetForm.acquisitionSource);
        if (assetPhotoFile) formData.append("photoFile", assetPhotoFile);

        startTransition(async () => {
            const res = await saveMedicalAsset(formData);
            if (res.success && res.asset) {
                toast.success(editingAsset ? "Asset updated successfully!" : "Asset registered successfully!");
                setIsAssetModalOpen(false);
                if (editingAsset) {
                    setAssets(prev => prev.map(a => a.id === res.asset.id ? res.asset : a));
                } else {
                    setAssets(prev => [res.asset, ...prev]);
                }
            } else {
                toast.error(res.error || "Failed to save asset");
            }
        });
    };

    const handleVerifyAsset = async (assetId: string) => {
        startTransition(async () => {
            const res = await verifyLegacyAsset(assetId);
            if (res.success && res.asset) {
                toast.success("Asset verified and approved into official master ledger!");
                setAssets(prev => prev.map(a => a.id === assetId ? res.asset : a));
            } else {
                toast.error(res.error || "Verification failed");
            }
        });
    };

    const handleConfirmDeleteAsset = async () => {
        if (!assetToDelete) return;
        startTransition(async () => {
            const res = await deleteMedicalAsset(assetToDelete.id);
            if (res.success) {
                toast.success(`Asset "${assetToDelete.equipmentName}" deleted successfully.`);
                setAssets(prev => prev.filter(a => a.id !== assetToDelete.id));
                setIsDeleteModalOpen(false);
                setAssetToDelete(null);
            } else {
                toast.error(res.error || "Failed to delete asset");
            }
        });
    };

    // Purchase Order Handlers
    const handleAddPOItem = () => {
        setPoItems(prev => [...prev, { equipmentName: "", brand: "", quantity: 1, unitCost: "" }]);
    };

    const handleCreatePO = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!poVendor.trim() || poItems.some(i => !i.equipmentName.trim())) {
            toast.error("Please provide Vendor Name and valid items.");
            return;
        }

        startTransition(async () => {
            const res = await createEquipmentPO({
                vendorName: poVendor,
                vendorContact: poContact,
                notes: poNotes,
                items: poItems.map(i => ({
                    equipmentName: i.equipmentName,
                    brand: i.brand,
                    quantity: Number(i.quantity) || 1,
                    unitCost: Number(i.unitCost) || 0
                }))
            });

            if (res.success && res.po) {
                toast.success(`Purchase Order ${res.po.poNumber} created!`);
                setPos(prev => [res.po, ...prev]);
                setIsPOModalOpen(false);
                setPoVendor("");
                setPoContact("");
                setPoNotes("");
                setPoItems([{ equipmentName: "", brand: "", quantity: 1, unitCost: "" }]);
            } else {
                toast.error(res.error || "Failed to create PO");
            }
        });
    };

    const handleConfirmIntake = async () => {
        if (!activePO) return;
        startTransition(async () => {
            const res = await intakePOToStockroom(activePO.id, activePO.items.map((i: any) => ({ itemId: i.id, receivedQty: i.quantity })));
            if (res.success && res.po) {
                toast.success(`Encoded ${res.newAssetCount || ""} units for ${res.po.poNumber} into Central Stockroom!`);
                setPos(prev => prev.map(p => p.id === res.po.id ? res.po : p));
                setIsIntakeModalOpen(false);
                const fresh = await getRHUEquipmentData("ALL");
                if (fresh.success && fresh.assets) {
                    setAssets(fresh.assets);
                }
            } else {
                toast.error(res.error || "Failed to intake PO items");
            }
        });
    };

    // Request Order Handlers
    const handleCreateRO = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!roFacility || !roRequestedBy.trim() || roItems.some(i => !i.equipmentName.trim())) {
            toast.error("Please provide requesting facility, nurse name, and valid items.");
            return;
        }

        startTransition(async () => {
            const res = await createEquipmentRO({
                requestingFacility: roFacility,
                requestedRoom: roRoom,
                requestedBy: roRequestedBy,
                justification: roJustification,
                items: roItems
            });

            if (res.success && res.ro) {
                toast.success(`Request Order ${res.ro.roNumber} filed successfully!`);
                setRos(prev => [res.ro, ...prev]);
                setIsROModalOpen(false);
                setRoRequestedBy("");
                setRoJustification("");
                setRoItems([{ equipmentName: "", quantity: 1, estimatedUnitCost: 0, urgency: "NORMAL" }]);
            } else {
                toast.error(res.error || "Failed to file RO");
            }
        });
    };

    // Stock Transfer Handlers
    const handleDispatchSO = async (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedStockAssetIds.length === 0) {
            toast.error("Please select at least one item from the stockroom to dispatch.");
            return;
        }

        startTransition(async () => {
            const res = await dispatchStockTransfer({
                linkedRoNumber: linkedRoNumber || undefined,
                targetFacility: soTargetFacility,
                targetRoom: soTargetRoom,
                dispatchedBy: soDispatchedBy,
                notes: soNotes,
                selectedAssetIds: selectedStockAssetIds
            });

            if (res.success && res.so) {
                toast.success(`Stock Transfer ${res.so.soNumber} dispatched!`);
                setSos(prev => [res.so, ...prev]);
                setStockroomAssets(prev => prev.filter(a => !selectedStockAssetIds.includes(a.id)));
                setSelectedStockAssetIds([]);
                setLinkedRoNumber("");
                setIsSOModalOpen(false);
                if (linkedRoNumber) {
                    setRos(prev => prev.map(r => r.roNumber === linkedRoNumber ? { ...r, status: "CONVERTED_TO_SO" } : r));
                }
            } else {
                toast.error(res.error || "Dispatch failed");
            }
        });
    };

    // Receiving Handlers
    const handleConfirmReceiving = async () => {
        if (!activeSO || !receivingBy.trim()) {
            toast.error("Please enter the receiving nurse/midwife name.");
            return;
        }

        startTransition(async () => {
            const res = await receiveStockTransfer({
                soId: activeSO.id,
                acceptedFull: isFullAcceptance,
                receivedBy: receivingBy,
                actualReceivedCount,
                missingCount,
                defectiveCount,
                reasonNotes: receivingDiscrepancyNotes
            });

            if (res.success) {
                toast.success(isFullAcceptance ? "Shipment received and deployed!" : "Discrepancy return ticket logged!");
                setIsReceiveModalOpen(false);
            } else {
                toast.error(res.error || "Receiving submission failed");
            }
        });
    };

    // Repair Handlers
    const handleFileRepair = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeAsset || !repairIssueNotes.trim()) {
            toast.error("Please provide issue details.");
            return;
        }

        const formData = new FormData();
        formData.append("assetId", activeAsset.id);
        formData.append("defectDetails", repairIssueNotes);

        startTransition(async () => {
            const res = await fileDefectRepairRequest(formData);
            if (res.success && res.asset) {
                toast.success(`Repair ticket filed for ${res.asset.assetTagNo}!`);
                setAssets(prev => prev.map(a => a.id === res.asset.id ? res.asset : a));
                setIsRepairModalOpen(false);
                setRepairIssueNotes("");
            } else {
                toast.error(res.error || "Failed to file repair");
            }
        });
    };

    const handleResolveRepair = async (isRepaired: boolean) => {
        if (!activeAsset) return;
        startTransition(async () => {
            const res = await resolveEquipmentRepair(activeAsset.id, isRepaired, repairResolutionNotes);
            if (res.success && res.asset) {
                toast.success(isRepaired ? "Asset repaired and returned to active duty!" : "Asset marked for COA Condemnation (IIRUP).");
                setAssets(prev => prev.map(a => a.id === res.asset.id ? res.asset : a));
                setIsResolveRepairModalOpen(false);
                setRepairResolutionNotes("");
            } else {
                toast.error(res.error || "Resolution failed");
            }
        });
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-20">
            {/* Top Header Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 p-6 md:p-8 shadow-sm transition-colors duration-200">
                <div 
                    className="absolute top-0 right-0 w-80 h-80 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20 opacity-10 dark:opacity-20"
                    style={{ backgroundColor: themeColor }}
                />
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2 max-w-2xl">
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 dark:bg-sky-500/10 border border-sky-200 dark:border-sky-500/20 text-sky-700 dark:text-sky-400 text-xs font-black uppercase tracking-wider">
                                <Activity className="w-3.5 h-3.5" />
                                RHU Asset Lifecycle &amp; COA Compliance
                            </div>
                            {matchedCenter && (
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-black uppercase tracking-wider">
                                    <Building2 className="w-3.5 h-3.5" />
                                    BHS Local Inventory: {matchedCenter.name}
                                </div>
                            )}
                        </div>
                        <h1 className="text-2xl md:text-3xl font-black italic tracking-tight uppercase text-slate-900 dark:text-white">
                            {matchedCenter ? `${matchedCenter.name} Equipment Dashboard` : "Medical Equipment & Stockroom Monitoring"}
                        </h1>
                        <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 font-medium">
                            {matchedCenter 
                                ? `Facility-scoped equipment ledger for ${matchedCenter.name}. File requisitions (RO), conduct receiving inspections, track local room placements, and log repair tickets.`
                                : "Granular room-by-room physical equipment tracking, purchase intakes, BHS requisitions, stock transfers, discrepancy returns, and COA Physical Count reports."}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                        {isReadOnly ? (
                            <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-50 dark:bg-amber-500/20 border border-amber-200 dark:border-amber-400/30 text-amber-700 dark:text-amber-300 text-xs font-black uppercase tracking-wider shadow-sm">
                                <Eye className="w-4 h-4 text-amber-500" />
                                Read-Only Access
                            </div>
                        ) : matchedCenter ? (
                            <Button
                                onClick={() => handleOpenAddAsset(true)}
                                className="h-11 px-5 rounded-2xl font-black text-xs uppercase tracking-wider text-white shadow-lg transition-all hover:scale-105"
                                style={{ backgroundColor: themeColor }}
                            >
                                <Plus className="w-4 h-4 mr-1.5" /> Register Local Asset
                            </Button>
                        ) : (
                            <>
                                <Button
                                    onClick={() => handleOpenAddAsset(false)}
                                    className="h-11 px-4 rounded-2xl font-black text-xs uppercase tracking-wider text-white shadow-lg transition-all hover:scale-105"
                                    style={{ backgroundColor: themeColor }}
                                >
                                    <Plus className="w-4 h-4 mr-1.5" /> Register Asset
                                </Button>
                                <Button
                                    onClick={() => handleOpenAddAsset(true)}
                                    variant="outline"
                                    className="h-11 px-4 rounded-2xl font-bold text-xs uppercase border-slate-200 dark:border-white/20 bg-slate-50 dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/20 text-slate-700 dark:text-white"
                                >
                                    <Building2 className="w-4 h-4 mr-1.5" /> BHS Legacy / Donation
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-[#161a24] p-4 text-center">
                    <span className="text-[10px] font-black uppercase text-slate-400 block">Total Assets</span>
                    <span className="text-2xl font-black text-slate-900 dark:text-white">{assets.length}</span>
                </Card>
                <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-[#161a24] p-4 text-center">
                    <span className="text-[10px] font-black uppercase text-slate-400 block">In Stockroom</span>
                    <span className="text-2xl font-black text-blue-600">{inStockroomCount}</span>
                </Card>
                <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-[#161a24] p-4 text-center">
                    <span className="text-[10px] font-black uppercase text-slate-400 block">Deployed (BHS)</span>
                    <span className="text-2xl font-black text-emerald-600">{deployedCount}</span>
                </Card>
                <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-[#161a24] p-4 text-center">
                    <span className="text-[10px] font-black uppercase text-slate-400 block">PPE (&gt; ₱50k)</span>
                    <span className="text-2xl font-black text-indigo-600">{ppeCount}</span>
                </Card>
                <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-[#161a24] p-4 text-center">
                    <span className="text-[10px] font-black uppercase text-slate-400 block">
                        {pendingVerificationCount > 0 ? "Pending Approval" : "Semi-Expendable"}
                    </span>
                    <span className={cn("text-2xl font-black", pendingVerificationCount > 0 ? "text-purple-600 animate-pulse" : "text-teal-600")}>
                        {pendingVerificationCount > 0 ? pendingVerificationCount : semiCount}
                    </span>
                </Card>
                <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-[#161a24] p-4 text-center">
                    <span className="text-[10px] font-black uppercase text-slate-400 block">Defective / Return</span>
                    <span className="text-2xl font-black text-rose-600">{defectiveCountTotal + returns.filter(r => r.status === "OPEN_INVESTIGATION").length}</span>
                </Card>
            </div>

            {/* Sub-Navigation Tabs with Scroll Arrows */}
            <div className="relative flex items-center group/tabs">
                {/* Left Scroll Arrow */}
                <button
                    type="button"
                    onClick={() => scrollTabs("left")}
                    aria-label="Scroll tabs left"
                    className="absolute -left-2 sm:-left-3.5 z-20 h-9 w-9 rounded-full bg-white dark:bg-[#1a202c] border border-slate-200 dark:border-slate-700 shadow-md text-slate-700 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white hover:scale-110 active:scale-95 transition-all cursor-pointer flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-800"
                    title="Slide Left"
                >
                    <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
                </button>

                {/* Scrollable Tabs Container */}
                <div
                    ref={tabsContainerRef}
                    className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-100 dark:bg-[#161a24] border border-slate-200 dark:border-slate-800 overflow-x-auto scrollbar-none scroll-smooth w-full px-8 sm:px-9"
                >
                    {[
                        { id: "LEDGER", label: "Master Ledger & Rooms", icon: Boxes },
                        { id: "PO", label: `Dispense (${pos.length})`, icon: ShoppingCart },
                        { id: "RO", label: `Requisitions (${ros.length})`, icon: ClipboardCheck },
                        { id: "SO", label: `Stock Transfers (${sos.length})`, icon: Truck },
                        { id: "RETURNS", label: `Receiving & Returns (${returns.length})`, icon: RotateCcw },
                        { id: "MAINTENANCE", label: `Defects & IIRUP (${defectiveCountTotal})`, icon: Wrench },
                        { id: "REPORTS", label: "COA Audit Reports", icon: FileSpreadsheet },
                    ].map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveTab(tab.id as TabType)}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer",
                                    isActive
                                        ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm scale-102"
                                        : "text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50"
                                )}
                                style={isActive ? { borderBottom: `2px solid ${themeColor}` } : {}}
                            >
                                <Icon className="w-4 h-4 shrink-0" style={isActive ? { color: themeColor } : {}} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Right Scroll Arrow */}
                <button
                    type="button"
                    onClick={() => scrollTabs("right")}
                    aria-label="Scroll tabs right"
                    className="absolute -right-2 sm:-right-3.5 z-20 h-9 w-9 rounded-full bg-white dark:bg-[#1a202c] border border-slate-200 dark:border-slate-700 shadow-md text-slate-700 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white hover:scale-110 active:scale-95 transition-all cursor-pointer flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-800"
                    title="Slide Right"
                >
                    <ChevronRight className="w-5 h-5 stroke-[2.5]" />
                </button>
            </div>

            {/* ========================================================================= */}
            {/* TAB 1: MASTER LEDGER & ROOMS */}
            {/* ========================================================================= */}
            {activeTab === "LEDGER" && (
                <div className="space-y-4">
                    {/* Filters Bar */}
                    <div className="flex flex-col md:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-[#161a24] border border-slate-200 dark:border-slate-800 shadow-sm">
                        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                            <div className="relative min-w-[240px] flex-1">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <Input
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    placeholder="Search property #, name, brand, custodian..."
                                    className="h-10 pl-9 rounded-xl text-xs bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10"
                                />
                            </div>

                            {matchedCenter ? (
                                <div className="h-10 px-3.5 rounded-xl text-xs font-bold bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300 flex items-center gap-1.5">
                                    <Building2 className="w-3.5 h-3.5 text-sky-500" />
                                    {matchedCenter.name}
                                </div>
                            ) : (
                                <Select value={selectedFacility} onValueChange={(val) => { setSelectedFacility(val); setCurrentPage(1); }}>
                                    <SelectTrigger className="h-10 w-[200px] rounded-xl text-xs font-bold bg-slate-50 dark:bg-white/5">
                                        <SelectValue placeholder="All Facilities" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl bg-white dark:bg-[#161820]">
                                        <SelectItem value="ALL" className="text-xs font-bold">All Registered Centers ({facilityNames.length})</SelectItem>
                                        {facilityNames.map((f: string) => (
                                            <SelectItem key={f} value={f} className="text-xs font-bold">{f}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}

                            <Select value={selectedStatus} onValueChange={(val) => { setSelectedStatus(val); setCurrentPage(1); }}>
                                <SelectTrigger className="h-10 w-[170px] rounded-xl text-xs font-bold bg-slate-50 dark:bg-white/5">
                                    <SelectValue placeholder="All Statuses" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl bg-white dark:bg-[#161820]">
                                    <SelectItem value="ALL" className="text-xs font-bold">All Statuses</SelectItem>
                                    <SelectItem value="IN_STOCKROOM" className="text-xs">In Stockroom</SelectItem>
                                    <SelectItem value="DEPLOYED_SERVICEABLE" className="text-xs">Deployed (BHS)</SelectItem>
                                    <SelectItem value="DEFECTIVE_FOR_REPAIR" className="text-xs">Defective / Repair</SelectItem>
                                    <SelectItem value="PENDING_VERIFICATION" className="text-xs">Pending Approval</SelectItem>
                                    <SelectItem value="CONDEMNED_FOR_DISPOSAL" className="text-xs">Condemned</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select value={selectedCategory} onValueChange={(val) => { setSelectedCategory(val); setCurrentPage(1); }}>
                                <SelectTrigger className="h-10 w-[140px] rounded-xl text-xs font-bold bg-slate-50 dark:bg-white/5">
                                    <SelectValue placeholder="COA Class" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl bg-white dark:bg-[#161820]">
                                    <SelectItem value="ALL" className="text-xs font-bold">All COA Class</SelectItem>
                                    <SelectItem value="PPE" className="text-xs font-bold">PPE (&gt; ₱50k)</SelectItem>
                                    <SelectItem value="SEMI_EXPENDABLE" className="text-xs font-bold">Semi-Expendable</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Asset Table */}
                    <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-[#161a24] overflow-hidden shadow-sm">
                        <Table>
                            <TableHeader className="bg-slate-50 dark:bg-white/5">
                                <TableRow>
                                    <TableHead className="text-[10px] font-black uppercase">Asset Tag / QR</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase">Equipment Name & Brand</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase">Location (Facility / Room)</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase">Custodian</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase">COA Class & Ref</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase">Unit Value</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase">Status</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedAssets.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="py-12 text-center text-slate-400 font-bold text-xs uppercase">
                                            No medical equipment found matching your filter criteria.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    paginatedAssets.map(asset => (
                                        <TableRow key={asset.id} className="hover:bg-slate-50 dark:hover:bg-white/5">
                                            <TableCell className="font-mono font-bold text-xs">
                                                <button
                                                    onClick={() => { setActiveAsset(asset); setIsQRModalOpen(true); }}
                                                    className="flex items-center gap-1.5 text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
                                                >
                                                    <QrCode className="w-3.5 h-3.5" />
                                                    {asset.assetTagNo}
                                                </button>
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-bold text-xs text-slate-900 dark:text-white">
                                                    {asset.equipmentName}
                                                </div>
                                                <div className="text-[10px] text-slate-400 font-medium">
                                                    Brand: {asset.brand || "N/A"} • SN: {asset.serialNo || "NONE"}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-bold text-xs text-slate-800 dark:text-slate-200">
                                                    {asset.currentFacility}
                                                </div>
                                                <div className="text-[10px] text-slate-400 flex items-center gap-1">
                                                    <DoorClosed className="w-3 h-3 text-slate-400" />
                                                    {asset.assignedRoom}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                                <div className="flex items-center gap-1">
                                                    <User className="w-3.5 h-3.5 text-slate-400" />
                                                    {asset.accountablePerson || "Unassigned"}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant="outline"
                                                    className={cn(
                                                        "font-mono text-[10px] font-bold uppercase",
                                                        asset.category === "PPE"
                                                            ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200"
                                                            : "bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border-teal-200"
                                                    )}
                                                >
                                                    {asset.category === "PPE" ? "PPE (> ₱50k)" : "SEMI-EXPENDABLE"}
                                                </Badge>
                                                <span className="block text-[9px] font-mono text-slate-400 mt-0.5">{asset.documentReference}</span>
                                            </TableCell>
                                            <TableCell className="font-mono text-xs">
                                                <div className="font-bold text-slate-900 dark:text-white">
                                                    ₱{(Number(asset.unitCost) || 0).toLocaleString()}
                                                </div>
                                                {Number(asset.quantity) > 1 && (
                                                    <span className="inline-block text-[10px] font-bold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40 px-1.5 py-0.5 rounded-md mt-0.5">
                                                        Qty: {(Number(asset.quantity) || 1).toLocaleString()} pcs
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {getStatusBadge(asset.currentStatus)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    {/* QR and Inspection Modal button (Accessible to all) */}
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => { setActiveAsset(asset); setIsQRModalOpen(true); }}
                                                        className="h-7 w-7 p-0 rounded-lg text-sky-600 hover:text-sky-700 hover:bg-sky-50 dark:hover:bg-sky-950/40 cursor-pointer"
                                                        title="View Property Tag / QR"
                                                    >
                                                        <QrCode className="w-3.5 h-3.5" />
                                                    </Button>

                                                    {!isReadOnly && (
                                                        <>
                                                            {asset.currentStatus === "PENDING_VERIFICATION" && (
                                                                <Button
                                                                    size="sm"
                                                                    onClick={() => handleVerifyAsset(asset.id)}
                                                                    className="h-7 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] uppercase cursor-pointer"
                                                                >
                                                                    <CheckCircle2 className="w-3 h-3 mr-1" /> Approve
                                                                </Button>
                                                            )}

                                                            {asset.currentStatus === "DEPLOYED_SERVICEABLE" && (
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() => { setActiveAsset(asset); setIsRepairModalOpen(true); }}
                                                                    className="h-7 px-2 rounded-lg text-amber-600 border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950 font-bold text-[10px] uppercase cursor-pointer"
                                                                    title="Report Defect"
                                                                >
                                                                    <Wrench className="w-3 h-3" />
                                                                </Button>
                                                            )}

                                                            {asset.currentStatus === "DEFECTIVE_FOR_REPAIR" && (
                                                                <Button
                                                                    size="sm"
                                                                    onClick={() => { setActiveAsset(asset); setIsResolveRepairModalOpen(true); }}
                                                                    className="h-7 px-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] uppercase cursor-pointer"
                                                                    title="Resolve Repair"
                                                                >
                                                                    Resolve
                                                                </Button>
                                                            )}

                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => handleOpenEditAsset(asset)}
                                                                className="h-7 w-7 p-0 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-white cursor-pointer"
                                                                title="Edit Asset"
                                                            >
                                                                <Edit3 className="w-3.5 h-3.5" />
                                                            </Button>
                                                        </>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>

                        {/* Master Ledger Pagination Bar */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-white/2 text-xs">
                            <div className="text-slate-500 dark:text-slate-400 font-semibold">
                                Showing <span className="font-bold text-slate-900 dark:text-white">{filteredAssets.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}</span> to{" "}
                                <span className="font-bold text-slate-900 dark:text-white">{Math.min(currentPage * pageSize, filteredAssets.length)}</span> of{" "}
                                <span className="font-bold text-slate-900 dark:text-white">{filteredAssets.length}</span> assets
                            </div>

                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1.5 mr-2">
                                    <span className="text-[11px] text-slate-400 font-medium">Per page:</span>
                                    <select
                                        value={pageSize}
                                        onChange={(e) => {
                                            setPageSize(Number(e.target.value));
                                            setCurrentPage(1);
                                        }}
                                        className="h-8 px-2 rounded-lg bg-white dark:bg-[#161820] border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200"
                                    >
                                        <option value={10}>10</option>
                                        <option value={15}>15</option>
                                        <option value={25}>25</option>
                                        <option value={50}>50</option>
                                        <option value={100}>100</option>
                                    </select>
                                </div>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    className="h-8 px-3 text-xs font-bold rounded-lg cursor-pointer disabled:opacity-40"
                                >
                                    Previous
                                </Button>

                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 px-1.5 font-mono">
                                    {currentPage} / {totalPages}
                                </span>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={currentPage >= totalPages}
                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                    className="h-8 px-3 text-xs font-bold rounded-lg cursor-pointer disabled:opacity-40"
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 2: PURCHASE ORDERS (PO) */}
            {/* ========================================================================= */}
            {activeTab === "PO" && (
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-[#161a24] border border-slate-200 dark:border-slate-800 shadow-sm">
                        <div>
                            <h3 className="text-sm font-black uppercase text-slate-900 dark:text-white flex items-center gap-2">
                                <ShoppingCart className="w-4 h-4 text-sky-500" />
                                Procurement Purchase Orders ({pos.length})
                            </h3>
                            <p className="text-xs text-slate-400">Generate POs for supplier transmittal, print PDF, and intake arrived goods to Central Stockroom.</p>
                        </div>
                        {!isReadOnly && (
                            <Button
                                onClick={() => setIsPOModalOpen(true)}
                                className="h-10 px-4 rounded-xl font-bold text-xs uppercase text-white shadow-md cursor-pointer shrink-0 transition-transform hover:scale-105"
                                style={{ backgroundColor: themeColor }}
                            >
                                <Plus className="w-4 h-4 mr-1.5" /> Create Purchase Order
                            </Button>
                        )}
                    </div>

                    <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-[#161a24] overflow-hidden shadow-sm">
                        <Table>
                            <TableHeader className="bg-slate-50 dark:bg-white/5">
                                <TableRow>
                                    <TableHead className="text-[10px] font-black uppercase">PO Number & Date</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase">Vendor / Supplier</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase">Ordered Line Items</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase">Total Units</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase">Total Amount</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase">Status</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {pos.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-40 text-center text-slate-400 font-bold text-xs uppercase">
                                            No purchase orders logged yet. Click &quot;Create Purchase Order&quot; to begin.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    pos.map(po => {
                                        const totalUnits = po.items?.reduce((sum: number, item: any) => sum + (Number(item.quantity) || 0), 0) || 0;
                                        const isIntakeDone = po.status === "DELIVERED_INTAKE";

                                        return (
                                            <TableRow key={po.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                                                <TableCell className="align-top py-3.5">
                                                    <span className="font-mono font-black text-xs text-sky-600 dark:text-sky-400 block">
                                                        {po.poNumber}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                                                        <Calendar className="w-3 h-3" />
                                                        {new Date(po.createdAt).toLocaleDateString()}
                                                    </span>
                                                </TableCell>

                                                <TableCell className="align-top py-3.5">
                                                    <span className="font-bold text-xs text-slate-900 dark:text-white block">
                                                        {po.vendorName}
                                                    </span>
                                                    {po.vendorContact && (
                                                        <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                                                            {po.vendorContact}
                                                        </span>
                                                    )}
                                                </TableCell>

                                                <TableCell className="align-top py-3.5 max-w-xs">
                                                    <div className="space-y-1">
                                                        {po.items?.map((item: any) => (
                                                            <div key={item.id} className="text-xs text-slate-700 dark:text-slate-300 flex items-center justify-between gap-3">
                                                                <span className="truncate">• {item.equipmentName}</span>
                                                                <span className="font-mono text-[11px] text-slate-500 font-bold shrink-0">
                                                                    {item.quantity}x @ ₱{(item.unitCost || 0).toLocaleString()}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </TableCell>

                                                <TableCell className="align-top py-3.5">
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold font-mono bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                                                        {totalUnits} pcs
                                                    </span>
                                                </TableCell>

                                                <TableCell className="align-top py-3.5">
                                                    <span className="font-mono font-black text-xs text-emerald-600 dark:text-emerald-400">
                                                        ₱{(po.totalAmount || 0).toLocaleString()}
                                                    </span>
                                                </TableCell>

                                                <TableCell className="align-top py-3.5">
                                                    {isIntakeDone ? (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase">
                                                            <CheckCircle2 className="w-3 h-3" /> Intake Completed
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-[10px] font-black uppercase">
                                                            <Clock className="w-3 h-3" /> PO Issued (Pending Intake)
                                                        </span>
                                                    )}
                                                </TableCell>

                                                <TableCell className="align-top py-3.5 text-right">
                                                    {!isReadOnly && !isIntakeDone ? (
                                                        <Button
                                                            size="sm"
                                                            onClick={() => { setActivePO(po); setIsIntakeModalOpen(true); }}
                                                            className="h-8 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase shadow-sm cursor-pointer"
                                                        >
                                                            <Boxes className="w-3.5 h-3.5 mr-1.5" /> Confirm Intake
                                                        </Button>
                                                    ) : (
                                                        <span className="text-[10px] text-slate-400 font-bold uppercase">
                                                            {isIntakeDone ? "Stockroom Stored" : "—"}
                                                        </span>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </Card>
                </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 3: REQUISITIONS (RO) */}
            {/* ========================================================================= */}
            {activeTab === "RO" && (
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-[#161a24] border border-slate-200 dark:border-slate-800 shadow-sm">
                        <div>
                            <h3 className="text-sm font-black uppercase text-slate-900 dark:text-white flex items-center gap-2">
                                <ClipboardCheck className="w-4 h-4 text-sky-500" />
                                Barangay Health Station Request Orders (RO) ({ros.length})
                            </h3>
                            <p className="text-xs text-slate-400">Requisitions submitted by BHS nurses/midwives awaiting RHU Stock Transfer dispatch.</p>
                        </div>
                        {!isReadOnly && (
                            <Button
                                onClick={() => setIsROModalOpen(true)}
                                className="h-10 px-4 rounded-xl font-bold text-xs uppercase text-white shadow-md cursor-pointer shrink-0 transition-transform hover:scale-105"
                                style={{ backgroundColor: themeColor }}
                            >
                                <Plus className="w-4 h-4 mr-1.5" /> Create Request Order (RO)
                            </Button>
                        )}
                    </div>

                    <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-[#161a24] overflow-hidden shadow-sm">
                        <Table>
                            <TableHeader className="bg-slate-50 dark:bg-white/5">
                                <TableRow>
                                    <TableHead className="text-[10px] font-black uppercase">RO Number &amp; Date</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase">Requesting Center &amp; Room</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase">Requested Items &amp; Urgency</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase">Requested By &amp; Need</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase">Status</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {ros.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-40 text-center text-slate-400 font-bold text-xs uppercase">
                                            No active request orders from Barangay Health Stations. Click &quot;Create Request Order (RO)&quot; to begin.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    ros.map(ro => {
                                        const isConverted = ro.status === "CONVERTED_TO_SO";

                                        return (
                                            <TableRow key={ro.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                                                <TableCell className="align-top py-3.5">
                                                    <span className="font-mono font-black text-xs text-sky-600 dark:text-sky-400 block">
                                                        {ro.roNumber}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                                                        <Calendar className="w-3 h-3" />
                                                        {new Date(ro.createdAt).toLocaleDateString()}
                                                    </span>
                                                </TableCell>

                                                <TableCell className="align-top py-3.5">
                                                    <span className="font-bold text-xs text-slate-900 dark:text-white block">
                                                        {ro.requestingFacility}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 block mt-0.5">
                                                        Room: {ro.requestedRoom}
                                                    </span>
                                                </TableCell>

                                                <TableCell className="align-top py-3.5 max-w-xs">
                                                    <div className="space-y-1">
                                                        {ro.items?.map((item: any) => (
                                                            <div key={item.id} className="text-xs text-slate-700 dark:text-slate-300 flex items-center justify-between gap-3">
                                                                <span className="truncate">• {item.equipmentName} ({item.quantity}x)</span>
                                                                <Badge variant="outline" className={cn(
                                                                    "text-[9px] font-bold shrink-0",
                                                                    item.urgency === "HIGH" ? "border-rose-500/40 text-rose-600 bg-rose-500/10" : "border-slate-200"
                                                                )}>
                                                                    {item.urgency || "NORMAL"}
                                                                </Badge>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </TableCell>

                                                <TableCell className="align-top py-3.5 max-w-xs">
                                                    <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block">
                                                        {ro.requestedBy}
                                                    </span>
                                                    {ro.justification && (
                                                        <p className="text-[11px] text-slate-500 italic mt-0.5 truncate max-w-xs" title={ro.justification}>
                                                            &ldquo;{ro.justification}&rdquo;
                                                        </p>
                                                    )}
                                                </TableCell>

                                                <TableCell className="align-top py-3.5">
                                                    {isConverted ? (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase">
                                                            <CheckCircle2 className="w-3 h-3" /> Dispatched (SO)
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase">
                                                            <Clock className="w-3 h-3" /> Submitted (Pending SO)
                                                        </span>
                                                    )}
                                                </TableCell>

                                                <TableCell className="align-top py-3.5 text-right">
                                                    {!isReadOnly && !isConverted ? (
                                                        <Button
                                                            size="sm"
                                                            onClick={() => {
                                                                setLinkedRoNumber(ro.roNumber);
                                                                setSoTargetFacility(ro.requestingFacility);
                                                                setSoTargetRoom(ro.requestedRoom);
                                                                setIsSOModalOpen(true);
                                                            }}
                                                            className="h-8 px-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs uppercase shadow-sm cursor-pointer"
                                                        >
                                                            <Truck className="w-3.5 h-3.5 mr-1.5" /> Convert to SO
                                                        </Button>
                                                    ) : (
                                                        <span className="text-[10px] text-slate-400 font-bold uppercase">
                                                            {isConverted ? "Transferred" : "—"}
                                                        </span>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </Card>
                </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 4: STOCK TRANSFERS (SO) */}
            {/* ========================================================================= */}
            {activeTab === "SO" && (
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-[#161a24] border border-slate-200 dark:border-slate-800 shadow-sm">
                        <div>
                            <h3 className="text-sm font-black uppercase text-slate-900 dark:text-white flex items-center gap-2">
                                <Truck className="w-4 h-4 text-sky-500" />
                                Stock Transfers / Orders (SO) ({sos.length})
                            </h3>
                            <p className="text-xs text-slate-400">Dispatches from Main RHU Central Stockroom to Barangay Health Stations with auto-deduction and PAR/ICS generation.</p>
                        </div>
                        {!isReadOnly && (
                            <Button
                                onClick={() => {
                                    setLinkedRoNumber("");
                                    setIsSOModalOpen(true);
                                }}
                                className="h-10 px-4 rounded-xl font-bold text-xs uppercase text-white shadow-md cursor-pointer shrink-0 transition-transform hover:scale-105"
                                style={{ backgroundColor: themeColor }}
                            >
                                <Truck className="w-4 h-4 mr-1.5" /> Dispatch Direct SO
                            </Button>
                        )}
                    </div>

                    <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-[#161a24] overflow-hidden shadow-sm">
                        <Table>
                            <TableHeader className="bg-slate-50 dark:bg-white/5">
                                <TableRow>
                                    <TableHead className="text-[10px] font-black uppercase">SO Number &amp; Date</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase">Destination Facility &amp; Room</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase">Dispatched Equipment</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase">Linked RO / Doc Ref</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase">Status</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sos.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-40 text-center text-slate-400 font-bold text-xs uppercase">
                                            No stock transfers recorded yet.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    sos.map(so => {
                                        const isDispatched = so.status === "DISPATCHED";

                                        return (
                                            <TableRow key={so.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                                                <TableCell className="align-top py-3.5">
                                                    <span className="font-mono font-black text-xs text-sky-600 dark:text-sky-400 block">
                                                        {so.soNumber}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                                                        <Calendar className="w-3 h-3" />
                                                        {new Date(so.dispatchedAt || so.createdAt).toLocaleDateString()}
                                                    </span>
                                                </TableCell>

                                                <TableCell className="align-top py-3.5">
                                                    <span className="font-bold text-xs text-slate-900 dark:text-white block">
                                                        {so.targetFacility}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 block mt-0.5">
                                                        Room: {so.targetRoom} • By: {so.dispatchedBy}
                                                    </span>
                                                </TableCell>

                                                <TableCell className="align-top py-3.5 max-w-xs">
                                                    <div className="space-y-1">
                                                        {so.items?.map((item: any) => (
                                                            <div key={item.id} className="text-xs text-slate-700 dark:text-slate-300 flex items-center justify-between gap-3">
                                                                <span className="truncate">• {item.equipmentName} {item.brand ? `(${item.brand})` : ""}</span>
                                                                <span className="font-mono text-[11px] text-slate-500 font-bold shrink-0">
                                                                    ₱{(item.unitCost || 0).toLocaleString()}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </TableCell>

                                                <TableCell className="align-top py-3.5">
                                                    <Badge variant="outline" className="font-mono text-[10px] font-bold block w-fit">
                                                        {so.linkedRoNumber || so.documentReference || "Direct Dispatch"}
                                                    </Badge>
                                                </TableCell>

                                                <TableCell className="align-top py-3.5">
                                                    {so.status === "ACCEPTED_FULL" ? (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase">
                                                            <CheckCircle2 className="w-3 h-3" /> Accepted Full
                                                        </span>
                                                    ) : so.status === "ACCEPTED_WITH_RETURN" ? (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-[10px] font-black uppercase">
                                                            <AlertTriangle className="w-3 h-3" /> Accepted w/ Return
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400 text-[10px] font-black uppercase">
                                                            <Truck className="w-3 h-3" /> In Transit
                                                        </span>
                                                    )}
                                                </TableCell>

                                                <TableCell className="align-top py-3.5 text-right">
                                                    {!isReadOnly && isDispatched ? (
                                                        <Button
                                                            size="sm"
                                                            onClick={() => {
                                                                setActiveSO(so);
                                                                setReceivingBy("BHS Midwife");
                                                                setActualReceivedCount(so.items?.length || 1);
                                                                setMissingCount(0);
                                                                setDefectiveCount(0);
                                                                setIsReceiveModalOpen(true);
                                                            }}
                                                            className="h-8 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase shadow-sm cursor-pointer"
                                                        >
                                                            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Receiving Inspection
                                                        </Button>
                                                    ) : (
                                                        <span className="text-[10px] text-slate-400 font-bold uppercase">
                                                            {!isDispatched ? "Received & Pinned" : "—"}
                                                        </span>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </Card>
                </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 5: RECEIVING & STOCK RETURNS */}
            {/* ========================================================================= */}
            {activeTab === "RETURNS" && (
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-[#161a24] border border-slate-200 dark:border-slate-800 shadow-sm">
                        <div>
                            <h3 className="text-sm font-black uppercase text-slate-900 dark:text-white flex items-center gap-2">
                                <RotateCcw className="w-4 h-4 text-rose-500" />
                                Stock Return / Discrepancy Investigation Tickets ({returns.length})
                            </h3>
                            <p className="text-xs text-slate-400">Items flagged as missing, damaged, or defective during BHS shipment receiving.</p>
                        </div>
                    </div>

                    <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-[#161a24] overflow-hidden shadow-sm">
                        <Table>
                            <TableHeader className="bg-slate-50 dark:bg-white/5">
                                <TableRow>
                                    <TableHead className="text-[10px] font-black uppercase">Ticket # &amp; Date</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase">Facility &amp; SO Ref</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase">Discrepancy Breakdown</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase">Damage / Reason Narrative</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase">Status</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {returns.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-40 text-center text-slate-400 font-bold text-xs uppercase">
                                            No discrepancy return tickets logged. All shipments verified cleanly.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    returns.map(ticket => {
                                        const isOpen = ticket.status === "OPEN_INVESTIGATION";

                                        return (
                                            <TableRow key={ticket.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                                                <TableCell className="align-top py-3.5">
                                                    <span className="font-mono font-black text-xs text-rose-600 dark:text-rose-400 block">
                                                        {ticket.ticketNumber}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                                                        <Calendar className="w-3 h-3" />
                                                        {new Date(ticket.createdAt).toLocaleDateString()}
                                                    </span>
                                                </TableCell>

                                                <TableCell className="align-top py-3.5">
                                                    <span className="font-bold text-xs text-slate-900 dark:text-white block">
                                                        {ticket.bhsFacility}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                                                        SO: {ticket.soNumber}
                                                    </span>
                                                </TableCell>

                                                <TableCell className="align-top py-3.5">
                                                    <div className="space-y-0.5 text-xs font-bold">
                                                        <span className="text-rose-600 block">Missing: {ticket.missingQuantity || 0} pcs</span>
                                                        <span className="text-amber-600 block">Defective: {ticket.defectiveQuantity || 0} pcs</span>
                                                        <span className="text-[10px] text-slate-400 block font-normal">By: {ticket.returnedBy}</span>
                                                    </div>
                                                </TableCell>

                                                <TableCell className="align-top py-3.5 max-w-xs">
                                                    <p className="text-xs text-slate-600 dark:text-slate-300 italic">
                                                        &ldquo;{ticket.reasonNotes || "No notes provided"}&rdquo;
                                                    </p>
                                                </TableCell>

                                                <TableCell className="align-top py-3.5">
                                                    {isOpen ? (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-[10px] font-black uppercase animate-pulse">
                                                            <AlertTriangle className="w-3 h-3" /> Open Investigation
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase">
                                                            <CheckCircle2 className="w-3 h-3" /> Replaced &amp; Resolved
                                                        </span>
                                                    )}
                                                </TableCell>

                                                <TableCell className="align-top py-3.5 text-right">
                                                    {!isReadOnly && isOpen ? (
                                                        <Button
                                                            size="sm"
                                                            onClick={() => {
                                                                setTicketToResolve(ticket);
                                                                setTicketResolutionNotes("Replaced with brand new unit from Central Stockroom.");
                                                                setTicketResolutionType("REPLACED_RESOLVED");
                                                                setIsResolveTicketModalOpen(true);
                                                            }}
                                                            className="h-8 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase shadow-sm cursor-pointer"
                                                        >
                                                            <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Resolve &amp; Replace
                                                        </Button>
                                                    ) : (
                                                        <span className="text-[10px] text-slate-400 font-bold uppercase">
                                                            {!isOpen ? "Resolved" : "—"}
                                                        </span>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </Card>
                </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 6: MAINTENANCE & CONDEMNATION */}
            {/* ========================================================================= */}
            {activeTab === "MAINTENANCE" && (
                <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-white dark:bg-[#161a24] border border-slate-200 dark:border-slate-800">
                        <h3 className="text-sm font-black uppercase text-slate-900 dark:text-white">Defect Tickets &amp; COA Condemnation Queue (IIRUP)</h3>
                        <p className="text-xs text-slate-400">Track equipment undergoing repairs and unrepairable units awaiting COA audit write-off.</p>
                    </div>

                    <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-[#161a24] overflow-hidden">
                        <Table>
                            <TableHeader className="bg-slate-50 dark:bg-white/5">
                                <TableRow>
                                    <TableHead className="text-[10px] font-black uppercase">Asset Tag</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase">Equipment Name</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase">Facility / Room</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase">Defect Details</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase">Status</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {assets.filter(a => a.currentStatus === "DEFECTIVE_FOR_REPAIR" || a.currentStatus === "UNSERVICEABLE_FOR_CONDEMNATION").length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="py-12 text-center text-slate-400 font-bold text-xs uppercase">
                                            No equipment currently logged under repair or condemnation.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    assets.filter(a => a.currentStatus === "DEFECTIVE_FOR_REPAIR" || a.currentStatus === "UNSERVICEABLE_FOR_CONDEMNATION").map(asset => (
                                        <TableRow key={asset.id}>
                                            <TableCell className="font-mono font-bold text-xs">{asset.assetTagNo}</TableCell>
                                            <TableCell className="font-bold text-xs">{asset.equipmentName}</TableCell>
                                            <TableCell className="text-xs">{asset.currentFacility} ({asset.assignedRoom})</TableCell>
                                            <TableCell className="text-xs text-amber-600 font-semibold">{asset.defectDetails || "Under inspection"}</TableCell>
                                            <TableCell>{getStatusBadge(asset.currentStatus)}</TableCell>
                                            <TableCell className="text-right">
                                                {!isReadOnly && asset.currentStatus === "DEFECTIVE_FOR_REPAIR" && (
                                                    <Button
                                                        size="sm"
                                                        onClick={() => { setActiveAsset(asset); setIsResolveRepairModalOpen(true); }}
                                                        className="h-7 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] uppercase"
                                                    >
                                                        Resolve Ticket
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </Card>
                </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 7: COA AUDIT REPORTS */}
            {/* ========================================================================= */}
            {activeTab === "REPORTS" && (
                <div className="space-y-6">
                    <div className="p-4 rounded-2xl bg-white dark:bg-[#161a24] border border-slate-200 dark:border-slate-800">
                        <h3 className="text-sm font-black uppercase text-slate-900 dark:text-white">COA Physical Count Inspection &amp; Audit Reports</h3>
                        <p className="text-xs text-slate-400">Generate formatted PDF count sheets with official signature blocks, Excel ledgers, and clipboard checklists.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card className="p-6 rounded-3xl border-slate-200 dark:border-slate-800 bg-white dark:bg-[#161a24] space-y-4">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-black">
                                <FileText className="w-6 h-6" />
                            </div>
                            <div>
                                <h4 className="font-black text-sm uppercase">RPCPPE Report (PDF)</h4>
                                <p className="text-xs text-slate-400 mt-1">Property, Plant and Equipment valued &gt; ₱50,000.00 (PAR). Includes official 3-signature blocks.</p>
                            </div>
                            <Button
                                onClick={() => exportCOAPDF(assets.filter(a => a.category === "PPE"), {
                                    reportType: "RPCPPE",
                                    signatorySupplyOfficer: sigSupplyOfficer,
                                    signatoryMHO: sigMHO,
                                    signatoryAuditor: sigAuditor
                                })}
                                className="w-full h-11 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider"
                            >
                                <Download className="w-4 h-4 mr-2" /> Export RPCPPE (PDF)
                            </Button>
                        </Card>

                        <Card className="p-6 rounded-3xl border-slate-200 dark:border-slate-800 bg-white dark:bg-[#161a24] space-y-4">
                            <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-600 flex items-center justify-center font-black">
                                <FileText className="w-6 h-6" />
                            </div>
                            <div>
                                <h4 className="font-black text-sm uppercase">RPCSP Report (PDF)</h4>
                                <p className="text-xs text-slate-400 mt-1">Semi-Expendable Properties valued ₱50,000.00 &amp; below (ICS). Includes official signature lines.</p>
                            </div>
                            <Button
                                onClick={() => exportCOAPDF(assets.filter(a => a.category === "SEMI_EXPENDABLE"), {
                                    reportType: "RPCSP",
                                    signatorySupplyOfficer: sigSupplyOfficer,
                                    signatoryMHO: sigMHO,
                                    signatoryAuditor: sigAuditor
                                })}
                                className="w-full h-11 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-black text-xs uppercase tracking-wider"
                            >
                                <Download className="w-4 h-4 mr-2" /> Export RPCSP (PDF)
                            </Button>
                        </Card>

                        <Card className="p-6 rounded-3xl border-slate-200 dark:border-slate-800 bg-white dark:bg-[#161a24] space-y-4">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-black">
                                <FileSpreadsheet className="w-6 h-6" />
                            </div>
                            <div>
                                <h4 className="font-black text-sm uppercase">Excel Ledger (.xlsx)</h4>
                                <p className="text-xs text-slate-400 mt-1">Full multi-column spreadsheet of all assets across all 16 health centers for accounting audits.</p>
                            </div>
                            <Button
                                onClick={() => exportCOAExcel(assets)}
                                className="w-full h-11 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider"
                            >
                                <Download className="w-4 h-4 mr-2" /> Export Excel (.XLSX)
                            </Button>
                        </Card>
                    </div>

                    {/* Signatories Configuration */}
                    <Card className="p-6 rounded-3xl border-slate-200 dark:border-slate-800 bg-white dark:bg-[#161a24] space-y-4">
                        <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">Report Signatory Names</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="space-y-1">
                                <Label className="text-[10px] font-bold uppercase text-slate-400">Supply Officer</Label>
                                <Input
                                    value={sigSupplyOfficer}
                                    onChange={(e) => setSigSupplyOfficer(e.target.value)}
                                    placeholder="e.g. JUAN DELA CRUZ"
                                    className="h-10 rounded-xl text-xs font-bold"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] font-bold uppercase text-slate-400">Municipal Health Officer (MHO)</Label>
                                <Input
                                    value={sigMHO}
                                    onChange={(e) => setSigMHO(e.target.value)}
                                    placeholder="e.g. DR. MARIA SANTOS, MD"
                                    className="h-10 rounded-xl text-xs font-bold"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] font-bold uppercase text-slate-400">COA Resident Auditor</Label>
                                <Input
                                    value={sigAuditor}
                                    onChange={(e) => setSigAuditor(e.target.value)}
                                    placeholder="e.g. COA AUDIT TEAM"
                                    className="h-10 rounded-xl text-xs font-bold"
                                />
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {/* ========================================================================= */}
            {/* MODAL: ADD / EDIT ASSET */}
            {/* ========================================================================= */}
            <Dialog open={isAssetModalOpen} onOpenChange={setIsAssetModalOpen}>
                <DialogContent className="sm:max-w-[560px] max-h-[88vh] overflow-y-auto overflow-x-hidden rounded-3xl bg-white dark:bg-[#161820] p-6">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black italic uppercase">
                            {editingAsset ? "Edit Medical Asset" : "Register Medical Equipment"}
                        </DialogTitle>
                        <DialogDescription className="text-xs font-bold uppercase text-slate-400">
                            Physical equipment location, room assignment, custodian, and property classification.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSaveAsset} className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase text-slate-400">Equipment Name *</Label>
                            <Input
                                value={assetForm.equipmentName}
                                onChange={(e) => setAssetForm({ ...assetForm, equipmentName: e.target.value })}
                                placeholder="e.g. Automated External Defibrillator (AED), BP Apparatus"
                                className="h-11 rounded-xl text-xs font-bold"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase text-slate-400">Brand / Model</Label>
                                <Input
                                    value={assetForm.brand}
                                    onChange={(e) => setAssetForm({ ...assetForm, brand: e.target.value })}
                                    placeholder="e.g. Philips HeartStart"
                                    className="h-11 rounded-xl text-xs font-bold"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase text-slate-400">Serial Number</Label>
                                <Input
                                    value={assetForm.serialNo}
                                    onChange={(e) => setAssetForm({ ...assetForm, serialNo: e.target.value })}
                                    placeholder="e.g. SN-987412"
                                    className="h-11 rounded-xl text-xs font-bold font-mono"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase text-slate-400">Unit Cost (₱ PHP) *</Label>
                                <Input
                                    type="number"
                                    value={assetForm.unitCost}
                                    onChange={(e) => setAssetForm({ ...assetForm, unitCost: e.target.value })}
                                    placeholder="e.g. 65000"
                                    className="h-11 rounded-xl text-xs font-bold font-mono"
                                    required
                                />
                                <span className="text-[9px] font-semibold text-slate-400">
                                    {Number(assetForm.unitCost || 0) > 50000 ? "→ Auto-classified as PPE (PAR Form)" : "→ Auto-classified as Semi-Expendable (ICS Form)"}
                                </span>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase text-slate-400">Acquisition Source</Label>
                                <Select
                                    value={assetForm.acquisitionSource}
                                    onValueChange={(val) => setAssetForm({ ...assetForm, acquisitionSource: val })}
                                >
                                    <SelectTrigger className="h-11 rounded-xl text-xs font-bold">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl bg-white dark:bg-[#161820]">
                                        <SelectItem value="STOCKROOM_ISSUANCE" className="text-xs font-bold">RHU Central Stockroom Issuance</SelectItem>
                                        <SelectItem value="LEGACY_BHS_EXISTING" className="text-xs font-bold">Pre-existing BHS Equipment</SelectItem>
                                        <SelectItem value="DIRECT_DONATION" className="text-xs font-bold">Direct Turn-over / NGO Donation</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase text-slate-400">Health Facility Location</Label>
                                {matchedCenter ? (
                                    <div className="h-11 px-3 rounded-xl text-xs font-bold bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-between text-slate-700 dark:text-slate-300">
                                        <div className="flex items-center gap-1.5 truncate">
                                            <Building2 className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                                            <span className="truncate">{matchedCenter.name}</span>
                                        </div>
                                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider shrink-0">Assigned</span>
                                    </div>
                                ) : (
                                    <Select
                                        value={assetForm.currentFacility}
                                        onValueChange={(val) => {
                                            const rooms = getRoomsForFacility(val);
                                            setIsCustomRoom(false);
                                            setCustomRoomName("");
                                            setAssetForm({ ...assetForm, currentFacility: val, assignedRoom: rooms[0] || "Consultation Room" });
                                        }}
                                    >
                                        <SelectTrigger className="h-11 rounded-xl text-xs font-bold truncate">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl bg-white dark:bg-[#161820] max-h-56">
                                            {facilityNames.map((f: string) => (
                                                <SelectItem key={f} value={f} className="text-xs font-bold">{f}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase text-slate-400">Specific Room Placement</Label>
                                <Select
                                    value={isCustomRoom ? "OTHER" : assetForm.assignedRoom}
                                    onValueChange={(val) => {
                                        if (val === "OTHER") {
                                            setIsCustomRoom(true);
                                            setAssetForm({ ...assetForm, assignedRoom: customRoomName.trim() || "" });
                                        } else {
                                            setIsCustomRoom(false);
                                            setCustomRoomName("");
                                            setAssetForm({ ...assetForm, assignedRoom: val });
                                        }
                                    }}
                                >
                                    <SelectTrigger className="h-11 rounded-xl text-xs font-bold truncate">
                                        <SelectValue placeholder="Select specific room (e.g. Treatment Room)" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl bg-white dark:bg-[#161820]">
                                        {getRoomsForFacility(assetForm.currentFacility).map(r => (
                                            <SelectItem key={r} value={r} className="text-xs font-bold">{r}</SelectItem>
                                        ))}
                                        <SelectItem value="OTHER" className="text-xs font-bold text-sky-600 dark:text-sky-400">
                                            + Other (Specify Custom Room / Area...)
                                        </SelectItem>
                                    </SelectContent>
                                </Select>

                                {isCustomRoom && (
                                    <div className="pt-1.5 animate-in fade-in-50 duration-200">
                                        <Input
                                            value={customRoomName}
                                            onChange={(e) => {
                                                setCustomRoomName(e.target.value);
                                                setAssetForm({ ...assetForm, assignedRoom: e.target.value });
                                            }}
                                            placeholder="Enter custom room / area name (e.g. Isolation Ward, Ambulance Bay)..."
                                            className="h-11 rounded-xl text-xs font-bold border-sky-400/50 focus:border-sky-500 bg-sky-50/50 dark:bg-sky-950/20"
                                            required
                                            autoFocus
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase text-slate-400">Accountable Custodian (Nurse/Midwife)</Label>
                                <Input
                                    value={assetForm.accountablePerson}
                                    onChange={(e) => setAssetForm({ ...assetForm, accountablePerson: e.target.value })}
                                    placeholder="e.g. Maria Dela Cruz, RN"
                                    className="h-11 rounded-xl text-xs font-bold"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase text-slate-400">Custodian Employee ID</Label>
                                <Input
                                    value={assetForm.accountableEmployeeId}
                                    onChange={(e) => setAssetForm({ ...assetForm, accountableEmployeeId: e.target.value })}
                                    placeholder="e.g. EMP-2026-042"
                                    className="h-11 rounded-xl text-xs font-bold font-mono"
                                />
                            </div>
                        </div>

                        <DialogFooter className="pt-3 border-t">
                            <Button type="button" variant="outline" onClick={() => setIsAssetModalOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={isPending} className="bg-sky-600 text-white font-bold">
                                {isPending ? "Saving..." : editingAsset ? "Update Asset" : "Register Asset"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ========================================================================= */}
            {/* MODAL: CREATE PURCHASE ORDER */}
            {/* ========================================================================= */}
            <Dialog open={isPOModalOpen} onOpenChange={setIsPOModalOpen}>
                <DialogContent className="sm:max-w-[600px] max-h-[88vh] overflow-y-auto rounded-3xl bg-white dark:bg-[#161820] p-6">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black italic uppercase">Create Purchase Order (PO)</DialogTitle>
                        <DialogDescription className="text-xs font-bold uppercase text-slate-400">
                            Procurement order for medical equipment and supplies from vendor.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleCreatePO} className="space-y-4 py-2">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase text-slate-400">Vendor / Supplier Name *</Label>
                                <Input
                                    value={poVendor}
                                    onChange={(e) => setPoVendor(e.target.value)}
                                    placeholder="e.g. Metro Pharma & MedSupply Co."
                                    className="h-11 rounded-xl text-xs font-bold"
                                    required
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase text-slate-400">Vendor Contact / Phone</Label>
                                <Input
                                    value={poContact}
                                    onChange={(e) => setPoContact(e.target.value)}
                                    placeholder="e.g. 0917-123-4567"
                                    className="h-11 rounded-xl text-xs font-bold"
                                />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <div>
                                    <Label className="text-[10px] font-black uppercase text-slate-400">PO Line Items ({poItems.length})</Label>
                                    <span className="text-[10px] text-slate-400 block">Specify equipment, quantities, and unit purchase costs</span>
                                </div>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={handleAddPOItem}
                                    className="h-8 px-3 text-xs font-bold text-sky-600 dark:text-sky-400 border-sky-500/30 hover:bg-sky-500/10 rounded-xl"
                                >
                                    + Add Another Item
                                </Button>
                            </div>

                            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                                {poItems.map((item, idx) => {
                                    const qty = Number(item.quantity) || 0;
                                    const unitPrice = Number(item.unitCost) || 0;
                                    const itemSubtotal = qty * unitPrice;

                                    return (
                                        <div key={idx} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 space-y-2.5 shadow-xs">
                                            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-white/5">
                                                <div className="flex items-center gap-2">
                                                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 text-[10px] font-black">
                                                        {idx + 1}
                                                    </span>
                                                    <span className="text-xs font-black uppercase text-slate-700 dark:text-slate-300">
                                                        {item.equipmentName.trim() || `Item #${idx + 1}`}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-[11px] font-bold font-mono text-emerald-600 dark:text-emerald-400">
                                                        Subtotal: ₱{itemSubtotal.toLocaleString()}
                                                    </span>
                                                    {poItems.length > 1 && (
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => setPoItems(prev => prev.filter((_, i) => i !== idx))}
                                                            className="h-6 w-6 p-0 text-slate-400 hover:text-rose-600 rounded-lg"
                                                            title="Remove Item"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                                                <div className="sm:col-span-4 space-y-1">
                                                    <Label className="text-[9px] font-black uppercase text-slate-400">Equipment Name *</Label>
                                                    <Input
                                                        value={item.equipmentName}
                                                        onChange={(e) => {
                                                            const copy = [...poItems];
                                                            copy[idx].equipmentName = e.target.value;
                                                            setPoItems(copy);
                                                        }}
                                                        placeholder="e.g. Nebulizer Machine"
                                                        className="h-10 text-xs font-bold rounded-xl"
                                                        required
                                                    />
                                                </div>
                                                <div className="sm:col-span-3 space-y-1">
                                                    <Label className="text-[9px] font-black uppercase text-slate-400">Brand / Model</Label>
                                                    <Input
                                                        value={item.brand}
                                                        onChange={(e) => {
                                                            const copy = [...poItems];
                                                            copy[idx].brand = e.target.value;
                                                            setPoItems(copy);
                                                        }}
                                                        placeholder="e.g. Omron NE-C28"
                                                        className="h-10 text-xs rounded-xl"
                                                    />
                                                </div>
                                                <div className="sm:col-span-2 space-y-1">
                                                    <Label className="text-[9px] font-black uppercase text-slate-400">Quantity</Label>
                                                    <div className="relative">
                                                        <Input
                                                            type="number"
                                                            min={1}
                                                            value={item.quantity}
                                                            onChange={(e) => {
                                                                const copy = [...poItems];
                                                                copy[idx].quantity = e.target.value === "" ? "" : Number(e.target.value);
                                                                setPoItems(copy);
                                                            }}
                                                            placeholder="1"
                                                            className="h-10 text-xs font-bold font-mono rounded-xl pr-8"
                                                            required
                                                        />
                                                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold pointer-events-none">
                                                            pcs
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="sm:col-span-3 space-y-1">
                                                    <Label className="text-[9px] font-black uppercase text-slate-400">Unit Cost (PHP)</Label>
                                                    <div className="relative">
                                                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                                                            ₱
                                                        </span>
                                                        <Input
                                                            type="number"
                                                            min={0}
                                                            value={item.unitCost}
                                                            onChange={(e) => {
                                                                const copy = [...poItems];
                                                                copy[idx].unitCost = e.target.value;
                                                                setPoItems(copy);
                                                            }}
                                                            placeholder="e.g. 3850"
                                                            className="h-10 text-xs font-mono font-bold rounded-xl pl-6"
                                                            required
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Live PO Total Summary */}
                            <div className="p-3 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex justify-between items-center text-xs">
                                <span className="font-bold text-slate-700 dark:text-slate-200 uppercase text-[10px] tracking-wider">
                                    Grand Total ({poItems.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0)} Units):
                                </span>
                                <span className="font-mono font-black text-sm text-sky-600 dark:text-sky-400">
                                    ₱{poItems.reduce((acc, i) => acc + (Number(i.quantity) || 1) * (Number(i.unitCost) || 0), 0).toLocaleString()}
                                </span>
                            </div>
                        </div>

                        <DialogFooter className="pt-3 border-t">
                            <Button type="button" variant="outline" onClick={() => setIsPOModalOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={isPending} className="bg-sky-600 hover:bg-sky-700 text-white font-bold">
                                {isPending ? "Generating PO..." : "Save Purchase Order"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ========================================================================= */}
            {/* MODAL: CONFIRM STOCKROOM INTAKE */}
            {/* ========================================================================= */}
            <Dialog open={isIntakeModalOpen} onOpenChange={setIsIntakeModalOpen}>
                <DialogContent className="sm:max-w-[500px] rounded-3xl bg-white dark:bg-[#161820] p-6">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black italic uppercase">Confirm Central Stockroom Intake</DialogTitle>
                        <DialogDescription className="text-xs font-bold uppercase text-slate-400">
                            Inspect arrived goods against PO {activePO?.poNumber} and encode units into RHU stockroom.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-3 space-y-3">
                        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border text-xs space-y-1">
                            <span className="text-[10px] font-black uppercase text-slate-400">Items to Encode:</span>
                            {activePO?.items?.map((item: any) => (
                                <div key={item.id} className="flex justify-between font-bold">
                                    <span>{item.equipmentName}</span>
                                    <span className="text-emerald-600">{item.quantity} Units</span>
                                </div>
                            ))}
                        </div>
                        <p className="text-xs text-slate-500">
                            Clicking Confirm will generate unique Property Numbers (Asset Tags) and assign them status <b>IN_STOCKROOM</b> in the Main RHU Central Stockroom.
                        </p>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsIntakeModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleConfirmIntake} disabled={isPending} className="bg-emerald-600 text-white font-bold">
                            {isPending ? "Encoding..." : "Confirm & Encode Intake"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ========================================================================= */}
            {/* MODAL: DISPATCH STOCK TRANSFER (SO) */}
            {/* ========================================================================= */}
            <Dialog open={isSOModalOpen} onOpenChange={setIsSOModalOpen}>
                <DialogContent className="sm:max-w-[580px] max-h-[88vh] overflow-y-auto rounded-3xl bg-white dark:bg-[#161820] p-6">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black italic uppercase">Dispatch Stock Transfer (SO)</DialogTitle>
                        <DialogDescription className="text-xs font-bold uppercase text-slate-400">
                            Transfer items from Central Stockroom to destination Barangay Health Station.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleDispatchSO} className="space-y-4 py-2">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase text-slate-400">Destination BHS Center *</Label>
                                <Select
                                    value={soTargetFacility}
                                    onValueChange={(val) => setSoTargetFacility(val)}
                                >
                                    <SelectTrigger className="h-11 rounded-xl text-xs font-bold truncate">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl bg-white dark:bg-[#161820]">
                                        {(nonMainFacilities.length > 0 ? nonMainFacilities : facilityNames).map((f: string) => (
                                            <SelectItem key={f} value={f} className="text-xs font-bold">{f}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase text-slate-400">Target Room</Label>
                                <Input
                                    value={soTargetRoom}
                                    onChange={(e) => setSoTargetRoom(e.target.value)}
                                    placeholder="e.g. Treatment Room"
                                    className="h-11 rounded-xl text-xs font-bold"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-400">
                                Select Assets from Central Stockroom ({stockroomAssets.length} Available) *
                            </Label>
                            <div className="max-h-48 overflow-y-auto space-y-1.5 p-2 rounded-xl bg-slate-50 dark:bg-white/5 border">
                                {stockroomAssets.length === 0 ? (
                                    <div className="py-4 text-center text-xs text-slate-400 font-bold">
                                        No items currently available in Central Stockroom.
                                    </div>
                                ) : (
                                    stockroomAssets.map(asset => {
                                        const isSelected = selectedStockAssetIds.includes(asset.id);
                                        return (
                                            <div
                                                key={asset.id}
                                                onClick={() => {
                                                    if (isSelected) {
                                                        setSelectedStockAssetIds(prev => prev.filter(id => id !== asset.id));
                                                    } else {
                                                        setSelectedStockAssetIds(prev => [...prev, asset.id]);
                                                    }
                                                }}
                                                className={cn(
                                                    "flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer transition-all",
                                                    isSelected ? "bg-sky-50 dark:bg-sky-950/40 border-sky-500 font-bold" : "hover:bg-slate-100"
                                                )}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <input type="checkbox" checked={isSelected} readOnly className="rounded" />
                                                    <div>
                                                        <span>{asset.equipmentName}</span>
                                                        <span className="text-[10px] text-slate-400 ml-2 font-mono">({asset.assetTagNo})</span>
                                                    </div>
                                                </div>
                                                <span className="font-mono">₱{(asset.unitCost || 0).toLocaleString()}</span>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase text-slate-400">Dispatched By</Label>
                                <Input
                                    value={soDispatchedBy}
                                    onChange={(e) => setSoDispatchedBy(e.target.value)}
                                    placeholder="e.g. RHU Supply Officer"
                                    className="h-10 rounded-xl text-xs font-bold"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase text-slate-400">Transfer Remarks / Notes</Label>
                                <Input
                                    value={soNotes}
                                    onChange={(e) => setSoNotes(e.target.value)}
                                    placeholder="e.g. Routine quarterly replenishment"
                                    className="h-10 rounded-xl text-xs"
                                />
                            </div>
                        </div>

                        <DialogFooter className="pt-3 border-t">
                            <Button type="button" variant="outline" onClick={() => setIsSOModalOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={isPending || selectedStockAssetIds.length === 0} className="bg-sky-600 text-white font-bold">
                                {isPending ? "Dispatching..." : `Dispatch ${selectedStockAssetIds.length} Items`}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ========================================================================= */}
            {/* MODAL: BHS RECEIVING INSPECTION */}
            {/* ========================================================================= */}
            <Dialog open={isReceiveModalOpen} onOpenChange={setIsReceiveModalOpen}>
                <DialogContent className="sm:max-w-[500px] rounded-3xl bg-white dark:bg-[#161820] p-6">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black italic uppercase">BHS Receiving Inspection</DialogTitle>
                        <DialogDescription className="text-xs font-bold uppercase text-slate-400">
                            Verify shipment package for SO {activeSO?.soNumber}.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase text-slate-400">Receiving Nurse / Midwife Name *</Label>
                            <Input
                                value={receivingBy}
                                onChange={(e) => setReceivingBy(e.target.value)}
                                placeholder="e.g. Maria Dela Cruz, RM"
                                className="h-11 rounded-xl text-xs font-bold"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => setIsFullAcceptance(true)}
                                className={cn(
                                    "p-3 rounded-2xl border text-center font-bold text-xs transition-all cursor-pointer",
                                    isFullAcceptance ? "bg-emerald-500/15 border-emerald-500 text-emerald-600" : "bg-slate-50 dark:bg-white/5 text-slate-400"
                                )}
                            >
                                <CheckCircle2 className="w-5 h-5 mx-auto mb-1" />
                                100% Match (Accept Full)
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsFullAcceptance(false)}
                                className={cn(
                                    "p-3 rounded-2xl border text-center font-bold text-xs transition-all cursor-pointer",
                                    !isFullAcceptance ? "bg-rose-500/15 border-rose-500 text-rose-600" : "bg-slate-50 dark:bg-white/5 text-slate-400"
                                )}
                            >
                                <AlertTriangle className="w-5 h-5 mx-auto mb-1" />
                                Discrepancy / Return
                            </button>
                        </div>

                        {!isFullAcceptance && (
                            <div className="space-y-3 p-3 rounded-2xl bg-rose-50/30 dark:bg-rose-950/20 border border-rose-200 text-xs">
                                <div className="grid grid-cols-3 gap-2">
                                    <div>
                                        <Label className="text-[9px] font-black uppercase text-slate-400">Actual Received</Label>
                                        <Input
                                            type="number"
                                            value={actualReceivedCount}
                                            onChange={(e) => setActualReceivedCount(Number(e.target.value))}
                                            className="h-9 text-xs font-bold"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-[9px] font-black uppercase text-slate-400">Missing Items</Label>
                                        <Input
                                            type="number"
                                            value={missingCount}
                                            onChange={(e) => setMissingCount(Number(e.target.value))}
                                            className="h-9 text-xs font-bold text-rose-600"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-[9px] font-black uppercase text-slate-400">Defective</Label>
                                        <Input
                                            type="number"
                                            value={defectiveCount}
                                            onChange={(e) => setDefectiveCount(Number(e.target.value))}
                                            className="h-9 text-xs font-bold text-rose-600"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[9px] font-black uppercase text-slate-400">Discrepancy / Damage Narrative</Label>
                                    <Textarea
                                        value={receivingDiscrepancyNotes}
                                        onChange={(e) => setReceivingDiscrepancyNotes(e.target.value)}
                                        placeholder="Describe missing items, physical carton damage, broken gauge, etc."
                                        className="h-16 text-xs rounded-xl"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsReceiveModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleConfirmReceiving} disabled={isPending} className="bg-emerald-600 text-white font-bold">
                            {isPending ? "Submitting..." : isFullAcceptance ? "Accept Full Shipment" : "Accept with Return Ticket"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ========================================================================= */}
            {/* MODAL: REPORT REPAIR / DEFECT */}
            {/* ========================================================================= */}
            <Dialog open={isRepairModalOpen} onOpenChange={setIsRepairModalOpen}>
                <DialogContent className="sm:max-w-[460px] rounded-3xl bg-white dark:bg-[#161820] p-6">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black italic uppercase">File Defect &amp; Repair Request</DialogTitle>
                        <DialogDescription className="text-xs font-bold uppercase text-slate-400">
                            Flag malfunctioning equipment on {activeAsset?.equipmentName} ({activeAsset?.assetTagNo}).
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleFileRepair} className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase text-slate-400">Malfunction / Defect Description *</Label>
                            <Textarea
                                value={repairIssueNotes}
                                onChange={(e) => setRepairIssueNotes(e.target.value)}
                                placeholder="e.g. Inaccurate digital reading, battery not charging, torn tubing..."
                                className="h-24 text-xs rounded-xl"
                                required
                            />
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsRepairModalOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={isPending} className="bg-amber-600 text-white font-bold">
                                {isPending ? "Filing..." : "Submit Repair Ticket"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ========================================================================= */}
            {/* MODAL: RESOLVE REPAIR */}
            {/* ========================================================================= */}
            <Dialog open={isResolveRepairModalOpen} onOpenChange={setIsResolveRepairModalOpen}>
                <DialogContent className="sm:max-w-[480px] rounded-3xl bg-white dark:bg-[#161820] p-6">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black italic uppercase">Resolve Repair Ticket</DialogTitle>
                        <DialogDescription className="text-xs font-bold uppercase text-slate-400">
                            Update maintenance outcome for {activeAsset?.equipmentName} ({activeAsset?.assetTagNo}).
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase text-slate-400">Technician Repair Notes</Label>
                            <Textarea
                                value={repairResolutionNotes}
                                onChange={(e) => setRepairResolutionNotes(e.target.value)}
                                placeholder="e.g. Replaced internal battery, recalibrated sensor, certified functional."
                                className="h-20 text-xs rounded-xl"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-2">
                            <Button
                                onClick={() => handleResolveRepair(true)}
                                disabled={isPending}
                                className="h-11 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase"
                            >
                                <CheckCircle2 className="w-4 h-4 mr-1.5" /> Repaired (Active)
                            </Button>
                            <Button
                                onClick={() => handleResolveRepair(false)}
                                disabled={isPending}
                                className="h-11 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs uppercase"
                            >
                                <XCircle className="w-4 h-4 mr-1.5" /> Unrepairable (Condemn)
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ========================================================================= */}
            {/* MODAL: QR & ASSET PROPERTY TAG */}
            {/* ========================================================================= */}
            <Dialog open={isQRModalOpen} onOpenChange={setIsQRModalOpen}>
                <DialogContent className="sm:max-w-[420px] rounded-3xl bg-white dark:bg-[#161820] p-6 text-center">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-black uppercase">Official Property Tag</DialogTitle>
                        <DialogDescription className="text-xs text-slate-400">Municipality of Mapandan • Rural Health Unit</DialogDescription>
                    </DialogHeader>

                    <div className="p-6 rounded-2xl bg-slate-50 dark:bg-black/40 border space-y-3 my-2">
                        <div className="w-24 h-24 mx-auto rounded-xl bg-white p-2 border flex items-center justify-center shadow-inner">
                            <QrCode className="w-20 h-20 text-slate-900" />
                        </div>
                        <div>
                            <span className="font-mono font-black text-sm text-sky-600 block">{activeAsset?.assetTagNo}</span>
                            <h4 className="font-bold text-sm text-slate-900 dark:text-white">{activeAsset?.equipmentName}</h4>
                            <p className="text-[10px] text-slate-400 mt-0.5">{activeAsset?.currentFacility} • {activeAsset?.assignedRoom}</p>
                        </div>
                        <div className="pt-2 border-t text-[10px] font-mono text-slate-500 flex justify-between">
                            <span>REF: {activeAsset?.documentReference || "N/A"}</span>
                            <span>VAL: ₱{(activeAsset?.unitCost || 0).toLocaleString()}</span>
                        </div>
                    </div>

                    <DialogFooter className="sm:justify-center">
                        <Button onClick={() => window.print()} variant="outline" className="rounded-xl font-bold text-xs">
                            <Printer className="w-3.5 h-3.5 mr-1.5" /> Print Tag Sticker
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ========================================================================= */}
            {/* MODAL: CREATE REQUEST ORDER (RO) */}
            {/* ========================================================================= */}
            <Dialog open={isROModalOpen} onOpenChange={setIsROModalOpen}>
                <DialogContent className="sm:max-w-[560px] max-h-[88vh] overflow-y-auto rounded-3xl bg-white dark:bg-[#161820] p-6">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black italic uppercase">Create BHS Request Order (RO)</DialogTitle>
                        <DialogDescription className="text-xs font-bold uppercase text-slate-400">
                            Requisition for medical equipment or clinic supplies from Main RHU.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleCreateRO} className="space-y-4 py-2">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase text-slate-400">Requesting Facility *</Label>
                                {matchedCenter ? (
                                    <div className="h-11 px-3 rounded-xl text-xs font-bold bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-between text-slate-700 dark:text-slate-300">
                                        <div className="flex items-center gap-1.5 truncate">
                                            <Building2 className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                                            <span className="truncate">{matchedCenter.name}</span>
                                        </div>
                                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider shrink-0">Your Clinic</span>
                                    </div>
                                ) : (
                                    <Select
                                        value={roFacility}
                                        onValueChange={(val) => setRoFacility(val)}
                                    >
                                        <SelectTrigger className="h-11 rounded-xl text-xs font-bold truncate">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl bg-white dark:bg-[#161820]">
                                            {(nonMainFacilities.length > 0 ? nonMainFacilities : facilityNames).map((f: string) => (
                                                <SelectItem key={f} value={f} className="text-xs font-bold">{f}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase text-slate-400">Target Room</Label>
                                <Select
                                    value={isCustomRoRoom ? "OTHER" : roRoom}
                                    onValueChange={(val) => {
                                        if (val === "OTHER") {
                                            setIsCustomRoRoom(true);
                                            setRoRoom(customRoRoomName.trim() || "");
                                        } else {
                                            setIsCustomRoRoom(false);
                                            setCustomRoRoomName("");
                                            setRoRoom(val);
                                        }
                                    }}
                                >
                                    <SelectTrigger className="h-11 rounded-xl text-xs font-bold truncate">
                                        <SelectValue placeholder="Select room placement" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl bg-white dark:bg-[#161820]">
                                        {getRoomsForFacility(matchedCenter ? matchedCenter.name : roFacility).map(r => (
                                            <SelectItem key={r} value={r} className="text-xs font-bold">{r}</SelectItem>
                                        ))}
                                        <SelectItem value="OTHER" className="text-xs font-bold text-sky-600 dark:text-sky-400">
                                            + Other (Specify Custom Room...)
                                        </SelectItem>
                                    </SelectContent>
                                </Select>

                                {isCustomRoRoom && (
                                    <div className="pt-1.5 animate-in fade-in-50 duration-200">
                                        <Input
                                            value={customRoRoomName}
                                            onChange={(e) => {
                                                setCustomRoRoomName(e.target.value);
                                                setRoRoom(e.target.value);
                                            }}
                                            placeholder="Enter custom target room name..."
                                            className="h-11 rounded-xl text-xs font-bold border-sky-400/50 focus:border-sky-500 bg-sky-50/50 dark:bg-sky-950/20"
                                            required
                                            autoFocus
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase text-slate-400">Requesting Nurse / Midwife Name *</Label>
                            <Input
                                value={roRequestedBy}
                                onChange={(e) => setRoRequestedBy(e.target.value)}
                                placeholder="e.g. Maria Dela Cruz, RM"
                                className="h-11 rounded-xl text-xs font-bold"
                                required
                            />
                        </div>

                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <div>
                                    <Label className="text-[10px] font-black uppercase text-slate-400">Requested Items ({roItems.length})</Label>
                                    <span className="text-[10px] text-slate-400 block">List items and priority level needed for this clinic</span>
                                </div>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setRoItems(prev => [...prev, { equipmentName: "", quantity: 1, estimatedUnitCost: 0, urgency: "NORMAL" }])}
                                    className="h-8 px-3 text-xs font-bold text-sky-600 dark:text-sky-400 border-sky-500/30 hover:bg-sky-500/10 rounded-xl"
                                >
                                    + Add Item
                                </Button>
                            </div>

                            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                                {roItems.map((item, idx) => (
                                    <div key={idx} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 space-y-2.5 shadow-xs">
                                        <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-white/5">
                                            <div className="flex items-center gap-2">
                                                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 text-[10px] font-black">
                                                    {idx + 1}
                                                </span>
                                                <span className="text-xs font-black uppercase text-slate-700 dark:text-slate-300">
                                                    {item.equipmentName.trim() || `Requisition Item #${idx + 1}`}
                                                </span>
                                            </div>
                                            {roItems.length > 1 && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setRoItems(prev => prev.filter((_, i) => i !== idx))}
                                                    className="h-6 w-6 p-0 text-slate-400 hover:text-rose-600 rounded-lg"
                                                    title="Remove Item"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                                            <div className="sm:col-span-6 space-y-1">
                                                <Label className="text-[9px] font-black uppercase text-slate-400">Equipment / Supply Description *</Label>
                                                <Input
                                                    value={item.equipmentName}
                                                    onChange={(e) => {
                                                        const copy = [...roItems];
                                                        copy[idx].equipmentName = e.target.value;
                                                        setRoItems(copy);
                                                    }}
                                                    placeholder="e.g. Suction Machine, Digital BP"
                                                    className="h-10 text-xs font-bold rounded-xl"
                                                    required
                                                />
                                            </div>
                                            <div className="sm:col-span-3 space-y-1">
                                                <Label className="text-[9px] font-black uppercase text-slate-400">Quantity</Label>
                                                <div className="relative">
                                                    <Input
                                                        type="number"
                                                        min={1}
                                                        value={item.quantity}
                                                        onChange={(e) => {
                                                            const copy = [...roItems];
                                                            copy[idx].quantity = Math.max(1, Number(e.target.value));
                                                            setRoItems(copy);
                                                        }}
                                                        placeholder="Qty"
                                                        className="h-10 text-xs font-bold font-mono rounded-xl pr-8"
                                                        required
                                                    />
                                                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold pointer-events-none">
                                                        pcs
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="sm:col-span-3 space-y-1">
                                                <Label className="text-[9px] font-black uppercase text-slate-400">Priority Level</Label>
                                                <Select
                                                    value={item.urgency || "NORMAL"}
                                                    onValueChange={(val) => {
                                                        const copy = [...roItems];
                                                        copy[idx].urgency = val;
                                                        setRoItems(copy);
                                                    }}
                                                >
                                                    <SelectTrigger className="h-10 text-xs font-bold rounded-xl">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent className="rounded-xl bg-white dark:bg-[#161820]">
                                                        <SelectItem value="NORMAL" className="text-xs">Normal</SelectItem>
                                                        <SelectItem value="HIGH" className="text-xs text-amber-600 font-bold">High Priority</SelectItem>
                                                        <SelectItem value="URGENT" className="text-xs text-rose-600 font-black">Urgent / Critical</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase text-slate-400">Justification / Clinical Need</Label>
                            <Textarea
                                value={roJustification}
                                onChange={(e) => setRoJustification(e.target.value)}
                                placeholder="Explain why equipment or stock is required at this health station."
                                className="h-16 text-xs rounded-xl"
                            />
                        </div>

                        <DialogFooter className="pt-3 border-t">
                            <Button type="button" variant="outline" onClick={() => setIsROModalOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={isPending} className="bg-sky-600 text-white font-bold">
                                {isPending ? "Submitting..." : "Submit Request Order"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ========================================================================= */}
            {/* MODAL: DELETE CONFIRMATION DIALOG */}
            {/* ========================================================================= */}
            <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
                <DialogContent className="sm:max-w-[460px] rounded-3xl bg-white dark:bg-[#161820] p-6 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-600 border border-rose-500/20 flex items-center justify-center mx-auto mb-2 shadow-inner">
                        <AlertTriangle className="w-7 h-7" />
                    </div>

                    <DialogHeader className="space-y-1">
                        <DialogTitle className="text-xl font-black italic uppercase text-slate-900 dark:text-white">
                            Delete Medical Equipment?
                        </DialogTitle>
                        <DialogDescription className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                            This action cannot be undone. The equipment record will be permanently deleted from the RHU master ledger.
                        </DialogDescription>
                    </DialogHeader>

                    {assetToDelete && (
                        <div className="my-3 p-4 rounded-2xl bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 text-left space-y-2 text-xs">
                            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-white/5">
                                <span className="font-mono font-black text-sky-600 dark:text-sky-400">
                                    {assetToDelete.assetTagNo}
                                </span>
                                <Badge variant="outline" className="font-mono text-[10px]">
                                    ₱{(assetToDelete.unitCost || 0).toLocaleString()}
                                </Badge>
                            </div>
                            <div>
                                <div className="font-black text-slate-900 dark:text-white">
                                    {assetToDelete.equipmentName}
                                </div>
                                <div className="text-[11px] text-slate-400">
                                    Brand: {assetToDelete.brand || "N/A"} • SN: {assetToDelete.serialNo || "NONE"}
                                </div>
                            </div>
                            <div className="text-[11px] text-slate-500 pt-1 flex items-center gap-1">
                                <Building2 className="w-3 h-3 text-slate-400" />
                                {assetToDelete.currentFacility} ({assetToDelete.assignedRoom})
                            </div>
                        </div>
                    )}

                    <DialogFooter className="grid grid-cols-2 gap-2.5 sm:space-x-0 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                setIsDeleteModalOpen(false);
                                setAssetToDelete(null);
                            }}
                            className="h-11 rounded-2xl font-bold text-xs uppercase"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={handleConfirmDeleteAsset}
                            disabled={isPending}
                            className="h-11 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-rose-600/20"
                        >
                            {isPending ? "Deleting..." : "Yes, Delete Asset"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ========================================================================= */}
            {/* MODAL: RESOLVE RETURN TICKET DIALOG */}
            {/* ========================================================================= */}
            <Dialog open={isResolveTicketModalOpen} onOpenChange={setIsResolveTicketModalOpen}>
                <DialogContent className="sm:max-w-[480px] rounded-3xl bg-white dark:bg-[#161820] p-6">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black italic uppercase">
                            Resolve Discrepancy Ticket
                        </DialogTitle>
                        <DialogDescription className="text-xs font-bold uppercase text-slate-400">
                            Ticket #{ticketToResolve?.ticketNumber} • {ticketToResolve?.bhsFacility}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase text-slate-400">Resolution Type</Label>
                            <Select
                                value={ticketResolutionType}
                                onValueChange={(val: any) => setTicketResolutionType(val)}
                            >
                                <SelectTrigger className="h-11 rounded-xl text-xs font-bold">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl bg-white dark:bg-[#161820]">
                                    <SelectItem value="REPLACED_RESOLVED" className="text-xs font-bold text-emerald-600">Replaced &amp; Resolved (From Central Stock)</SelectItem>
                                    <SelectItem value="WRITTEN_OFF" className="text-xs font-bold text-slate-600">Written Off (Accounting Adjustment)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase text-slate-400">Resolution Notes / Action Taken</Label>
                            <Textarea
                                value={ticketResolutionNotes}
                                onChange={(e) => setTicketResolutionNotes(e.target.value)}
                                placeholder="Explain replacement unit dispatched or investigation findings..."
                                className="h-24 text-xs rounded-xl"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                setIsResolveTicketModalOpen(false);
                                setTicketToResolve(null);
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={() => {
                                if (!ticketToResolve) return;
                                startTransition(async () => {
                                    const res = await resolveStockReturnTicket(ticketToResolve.id, ticketResolutionType, ticketResolutionNotes);
                                    if (res.success && res.ticket) {
                                        toast.success("Return ticket resolved successfully!");
                                        setReturns(prev => prev.map(r => r.id === ticketToResolve.id ? res.ticket : r));
                                        setIsResolveTicketModalOpen(false);
                                        setTicketToResolve(null);
                                    } else {
                                        toast.error(res.error || "Failed to resolve ticket");
                                    }
                                });
                            }}
                            disabled={isPending}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase"
                        >
                            {isPending ? "Resolving..." : "Confirm Resolution"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
