"use client";

import React, { useState, useEffect, useCallback, useTransition, useRef } from "react";
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
    Clock,
    RefreshCw,
    ChevronDown,
    ChevronUp,
    History,
    Package,
    ExternalLink
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
import { supabase } from "@/lib/supabase";

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
    isGlobalAdmin?: boolean;
    canDispatchSO?: boolean;
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
    isReadOnly = false,
    isGlobalAdmin = false,
    canDispatchSO = false
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
    const [selectedFacility, setSelectedFacility] = useState<string>("ALL");
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
    const [isViewPOModalOpen, setIsViewPOModalOpen] = useState(false);
    const [viewingPO, setViewingPO] = useState<any | null>(null);
    const [poHistoryGroup, setPoHistoryGroup] = useState<any | null>(null);
    const [isPOHistoryModalOpen, setIsPOHistoryModalOpen] = useState(false);
    const [expandedGroupKeys, setExpandedGroupKeys] = useState<Record<string, boolean>>({});

    const toggleExpandGroup = (key: string) => {
        setExpandedGroupKeys(prev => ({ ...prev, [key]: !prev[key] }));
    };

    // Intake Inspection & Discrepancy State
    const [intakeItems, setIntakeItems] = useState<Array<{
        itemId: string;
        equipmentName: string;
        brand?: string;
        orderedQty: number;
        alreadyReceived: number;
        acceptedQty: number | string;
        damagedQty: number | string;
        missingQty: number | string;
        unitCost: number;
    }>>([]);
    const [intakeInspectionNotes, setIntakeInspectionNotes] = useState("");
    const [isIntakeDiscrepancyMode, setIsIntakeDiscrepancyMode] = useState(false);

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
    const [poLinkedRoNumber, setPoLinkedRoNumber] = useState<string>("");
    const [poItems, setPoItems] = useState<Array<{ equipmentName: string; brand: string; quantity: number | string; unitCost: number | string }>>([
        { equipmentName: "", brand: "", quantity: "", unitCost: "" }
    ]);

    // Request Order Form State
    const [roFacility, setRoFacility] = useState(matchedCenter ? matchedCenter.name : (nonMainFacilities[0] || "BHS Nilombot"));
    const [roRoom, setRoRoom] = useState("Treatment & Examination Room");
    const [isCustomRoRoom, setIsCustomRoRoom] = useState(false);
    const [customRoRoomName, setCustomRoRoomName] = useState("");
    const [roRequestedBy, setRoRequestedBy] = useState("");
    const [roJustification, setRoJustification] = useState("");
    const [roItems, setRoItems] = useState<Array<{ equipmentName: string; quantity: number | string; estimatedUnitCost: number; urgency: string }>>([
        { equipmentName: "", quantity: "", estimatedUnitCost: 0, urgency: "NORMAL" }
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
    const [actualReceivedCount, setActualReceivedCount] = useState<number | string>("");
    const [missingCount, setMissingCount] = useState<number | string>("");
    const [defectiveCount, setDefectiveCount] = useState<number | string>("");
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
            (a.poReferenceNo && a.poReferenceNo.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (a.documentReference && a.documentReference.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesFacility = selectedFacility === "ALL" || a.currentFacility === selectedFacility;
        const matchesStatus = selectedStatus === "ALL" || a.currentStatus === selectedStatus;
        const matchesCategory = selectedCategory === "ALL" || a.category === selectedCategory;

        return matchesSearch && matchesFacility && matchesStatus && matchesCategory;
    });

    // Consolidated Assets Grouping (De-duplicates same equipment in same location/status into single row with total stock & PO history)
    const consolidatedAssets = React.useMemo(() => {
        const groupMap = new Map<string, any[]>();

        filteredAssets.forEach(a => {
            const normName = (a.equipmentName || "").toLowerCase().trim();
            const normFacility = (a.currentFacility || "").trim();
            const normRoom = (a.assignedRoom || "").trim();
            const normStatus = (a.currentStatus || "").trim();
            const key = `${normName}:::${normFacility}:::${normRoom}:::${normStatus}`;

            if (!groupMap.has(key)) {
                groupMap.set(key, []);
            }
            groupMap.get(key)!.push(a);
        });

        const groups: Array<{
            groupKey: string;
            equipmentName: string;
            primaryAsset: any;
            batches: any[];
            totalQuantity: number;
            totalAvailableQty: number;
            currentFacility: string;
            assignedRoom: string;
            accountablePerson: string;
            category: string;
            currentStatus: string;
            minUnitCost: number;
            maxUnitCost: number;
            totalStockValue: number;
            hasMultipleBatches: boolean;
            poNumbers: string[];
            brandSummary: string;
            distinctTags: string[];
        }> = [];

        groupMap.forEach((batches, groupKey) => {
            batches.sort((x, y) => new Date(y.createdAt || 0).getTime() - new Date(x.createdAt || 0).getTime());
            const primaryAsset = batches[0];

            let totalQuantity = 0;
            let totalAvailableQty = 0;
            let totalStockValue = 0;
            let minUnitCost = Infinity;
            let maxUnitCost = -Infinity;
            const poNumbersSet = new Set<string>();
            const brandsSet = new Set<string>();
            const tags: string[] = [];

            batches.forEach(b => {
                const qty = Number(b.quantity) || 1;
                const avail = Number(b.availableQty ?? b.quantity) || 1;
                const cost = Number(b.unitCost) || 0;

                totalQuantity += qty;
                totalAvailableQty += avail;
                totalStockValue += avail * cost;

                if (cost < minUnitCost) minUnitCost = cost;
                if (cost > maxUnitCost) maxUnitCost = cost;

                if (b.poReferenceNo) poNumbersSet.add(b.poReferenceNo);
                if (b.brand && b.brand.trim() && b.brand.toLowerCase() !== "n/a" && b.brand.toLowerCase() !== "none") {
                    brandsSet.add(b.brand.trim());
                }
                if (b.assetTagNo) tags.push(b.assetTagNo);
            });

            if (minUnitCost === Infinity) minUnitCost = 0;
            if (maxUnitCost === -Infinity) maxUnitCost = 0;

            const brandsArr = Array.from(brandsSet);
            const brandSummary = brandsArr.length > 1
                ? `${brandsArr.slice(0, 2).join(", ")} (${brandsArr.length} brands)`
                : brandsArr[0] || primaryAsset.brand || "N/A";

            groups.push({
                groupKey,
                equipmentName: primaryAsset.equipmentName,
                primaryAsset,
                batches,
                totalQuantity,
                totalAvailableQty,
                currentFacility: primaryAsset.currentFacility,
                assignedRoom: primaryAsset.assignedRoom,
                accountablePerson: primaryAsset.accountablePerson,
                category: primaryAsset.category,
                currentStatus: primaryAsset.currentStatus,
                minUnitCost,
                maxUnitCost,
                totalStockValue,
                hasMultipleBatches: batches.length > 1,
                poNumbers: Array.from(poNumbersSet),
                brandSummary,
                distinctTags: tags
            });
        });

        return groups;
    }, [filteredAssets]);

    const totalPages = Math.max(1, Math.ceil(consolidatedAssets.length / pageSize));
    const paginatedAssets = consolidatedAssets.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    // Counts
    const totalPhysicalUnits = assets.reduce((sum, a) => sum + (Number(a.quantity) || 1), 0);
    const inStockroomUnits = stockroomAssets.reduce((sum, a) => sum + (Number(a.availableQty ?? a.quantity) || 1), 0);
    const inStockroomCount = stockroomAssets.length;
    const deployedCount = assets.filter(a => a.currentStatus === "DEPLOYED_SERVICEABLE").length;
    const deployedUnits = assets
        .filter(a => a.currentStatus === "DEPLOYED_SERVICEABLE")
        .reduce((sum, a) => sum + (Number(a.quantity) || 1), 0);
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
    // REALTIME UPDATES & SYNC ENGINE
    // -------------------------------------------------------------------------
    const [isRefreshing, setIsRefreshing] = useState(false);

    const refreshEquipmentData = useCallback(async (silent = true) => {
        if (!silent) setIsRefreshing(true);
        try {
            const fresh = await getRHUEquipmentData("ALL");
            if (fresh.success) {
                if (fresh.assets) setAssets(fresh.assets);
                if (fresh.stockroomAssets) setStockroomAssets(fresh.stockroomAssets);
                if (fresh.pos) setPos(fresh.pos);
                if (fresh.ros) setRos(fresh.ros);
                if (fresh.sos) setSos(fresh.sos);
                if (fresh.returns) setReturns(fresh.returns);
            }
        } catch (err) {
            console.warn("Failed to refresh equipment data in realtime:", err);
        } finally {
            if (!silent) setIsRefreshing(false);
        }
    }, []);

    // Realtime Subscriptions via Supabase WebSockets + Adaptive Polling + Window Focus
    useEffect(() => {
        let debounceTimer: NodeJS.Timeout | null = null;
        const triggerRefresh = () => {
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                refreshEquipmentData(true);
            }, 300);
        };

        let channel: any = null;
        if (supabase) {
            channel = supabase
                .channel("rhu-equipment-realtime-sync")
                .on("postgres_changes", { event: "*", schema: "public", table: "MedicalAsset" }, triggerRefresh)
                .on("postgres_changes", { event: "*", schema: "public", table: "EquipmentPurchaseOrder" }, triggerRefresh)
                .on("postgres_changes", { event: "*", schema: "public", table: "EquipmentPOItem" }, triggerRefresh)
                .on("postgres_changes", { event: "*", schema: "public", table: "EquipmentRequestOrder" }, triggerRefresh)
                .on("postgres_changes", { event: "*", schema: "public", table: "EquipmentROItem" }, triggerRefresh)
                .on("postgres_changes", { event: "*", schema: "public", table: "EquipmentStockTransfer" }, triggerRefresh)
                .on("postgres_changes", { event: "*", schema: "public", table: "EquipmentSOItem" }, triggerRefresh)
                .on("postgres_changes", { event: "*", schema: "public", table: "EquipmentStockReturnTicket" }, triggerRefresh)
                .on("postgres_changes", { event: "*", schema: "public", table: "EquipmentRepairLog" }, triggerRefresh)
                .subscribe((status: string, err?: any) => {
                    if (err) console.warn("Supabase Realtime equipment subscription notice:", err);
                });
        }

        const handleFocus = () => triggerRefresh();
        window.addEventListener("focus", handleFocus);

        const interval = setInterval(() => {
            if (typeof document !== "undefined" && document.visibilityState === "visible") {
                refreshEquipmentData(true);
            }
        }, 8000);

        return () => {
            if (debounceTimer) clearTimeout(debounceTimer);
            window.removeEventListener("focus", handleFocus);
            clearInterval(interval);
            if (channel && supabase) {
                supabase.removeChannel(channel);
            }
        };
    }, [refreshEquipmentData]);

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
                refreshEquipmentData(true);
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
                refreshEquipmentData(true);
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
                refreshEquipmentData(true);
            } else {
                toast.error(res.error || "Failed to delete asset");
            }
        });
    };

    // Purchase Order Handlers
    const handleAddPOItem = () => {
        setPoItems(prev => [...prev, { equipmentName: "", brand: "", quantity: "", unitCost: "" }]);
    };

    const handleProcureFromRO = (ro: any, shortageItems?: Array<{ equipmentName: string; quantity: number; estimatedUnitCost?: number }>) => {
        const sourceItems = shortageItems && shortageItems.length > 0 ? shortageItems : ro.items;
        const prefilledItems = (sourceItems && sourceItems.length > 0)
            ? sourceItems.map((i: any) => ({
                equipmentName: i.equipmentName || "",
                brand: "",
                quantity: Number(i.quantity) || 1,
                unitCost: Number(i.estimatedUnitCost) || ""
            }))
            : [{ equipmentName: "", brand: "", quantity: "", unitCost: "" }];

        setPoItems(prefilledItems);
        setPoVendor("");
        setPoContact("");
        setPoNotes(shortageItems && shortageItems.length > 0
            ? `Procurement for Requisition ${ro.roNumber} shortage (${ro.requestingFacility} - Room: ${ro.requestedRoom || "General"})`
            : `Procurement for Requisition ${ro.roNumber} (${ro.requestingFacility} - Room: ${ro.requestedRoom || "General"})`
        );
        setPoLinkedRoNumber(ro.roNumber);
        setIsPOModalOpen(true);
    };

    const handleCreatePO = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!poVendor.trim() || poItems.some(i => !i.equipmentName.trim())) {
            toast.error("Please provide Vendor Name and valid items.");
            return;
        }

        if (poItems.some(i => !i.quantity || Number(i.quantity) <= 0)) {
            toast.error("Please enter a valid quantity for all items.");
            return;
        }

        startTransition(async () => {
            const res = await createEquipmentPO({
                vendorName: poVendor,
                vendorContact: poContact,
                notes: poNotes,
                linkedRoNumber: poLinkedRoNumber || undefined,
                items: poItems.map(i => ({
                    equipmentName: i.equipmentName,
                    brand: i.brand,
                    quantity: Number(i.quantity) || 1,
                    unitCost: Number(i.unitCost) || 0
                }))
            });

            if (res.success && res.po) {
                toast.success(
                    poLinkedRoNumber 
                        ? `Purchase Order ${res.po.poNumber} created & linked to ${poLinkedRoNumber}!`
                        : `Purchase Order ${res.po.poNumber} created!`
                );
                setPos(prev => [res.po, ...prev]);
                setIsPOModalOpen(false);
                setPoVendor("");
                setPoContact("");
                setPoNotes("");
                setPoLinkedRoNumber("");
                setPoItems([{ equipmentName: "", brand: "", quantity: "", unitCost: "" }]);
                refreshEquipmentData(true);
            } else {
                toast.error(res.error || "Failed to create PO");
            }
        });
    };

    const handleOpenIntakeModal = (po: any) => {
        setActivePO(po);
        const items = (po.items || []).map((item: any) => {
            const ordered = Number(item.quantity) || 1;
            const alreadyReceived = Number(item.receivedQty) || 0;

            return {
                itemId: item.id,
                equipmentName: item.equipmentName,
                brand: item.brand,
                orderedQty: ordered,
                alreadyReceived,
                acceptedQty: "",
                damagedQty: "",
                missingQty: "",
                unitCost: Number(item.unitCost) || 0
            };
        });
        setIntakeItems(items);
        setIntakeInspectionNotes(po.inspectionNotes || "");
        setIsIntakeDiscrepancyMode(false);
        setIsIntakeModalOpen(true);
    };

    const handleConfirmIntake = async () => {
        if (!activePO) return;

        const payload = intakeItems.map(i => {
            const remaining = Math.max(0, i.orderedQty - i.alreadyReceived);
            const damaged = i.damagedQty === "" ? 0 : Math.max(0, Number(i.damagedQty) || 0);
            const missing = i.missingQty === "" ? 0 : Math.max(0, Number(i.missingQty) || 0);

            let accepted = 0;
            if (!isIntakeDiscrepancyMode) {
                accepted = remaining;
            } else if (i.acceptedQty !== "") {
                accepted = Math.max(0, Number(i.acceptedQty) || 0);
            } else {
                accepted = Math.max(0, remaining - damaged - missing);
            }

            return {
                itemId: i.itemId,
                receivedQty: accepted,
                damagedQty: damaged,
                missingQty: missing
            };
        });

        const totalAccepted = payload.reduce((sum, i) => sum + i.receivedQty, 0);
        const totalDamaged = payload.reduce((sum, i) => sum + (i.damagedQty || 0), 0);
        const totalMissing = payload.reduce((sum, i) => sum + (i.missingQty || 0), 0);

        if (totalAccepted === 0 && totalDamaged === 0 && totalMissing === 0) {
            toast.error("Please specify valid quantities to intake or report.");
            return;
        }

        if ((totalDamaged > 0 || totalMissing > 0) && !intakeInspectionNotes.trim()) {
            toast.error("Please provide Inspection & Discrepancy notes explaining the damaged or missing items.");
            return;
        }

        startTransition(async () => {
            const res = await intakePOToStockroom(activePO.id, payload, intakeInspectionNotes);
            if (res.success && res.po) {
                const damagedCount = res.damagedCount ?? 0;
                const missingCount = res.missingCount ?? 0;
                if (damagedCount > 0 || missingCount > 0) {
                    toast.warning(
                        `Intake recorded with discrepancies: ${res.newAssetCount} good units encoded to Central Stockroom, ${damagedCount} rejected as damaged (RTV).`
                    );
                } else {
                    toast.success(`Encoded ${res.newAssetCount || ""} units for ${res.po.poNumber} into Central Stockroom!`);
                }
                setPos(prev => prev.map(p => p.id === res.po.id ? res.po : p));
                setIsIntakeModalOpen(false);
                refreshEquipmentData(true);
            } else {
                toast.error(res.error || "Failed to intake PO items");
            }
        });
    };

    // Request Order Handlers
    const handleCreateRO = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!roFacility || !roRequestedBy.trim() || roItems.some(i => !i.equipmentName.trim() || !i.quantity || Number(i.quantity) <= 0)) {
            toast.error("Please provide requesting facility, nurse name, valid items, and quantities.");
            return;
        }

        startTransition(async () => {
            const res = await createEquipmentRO({
                requestingFacility: roFacility,
                requestedRoom: roRoom,
                requestedBy: roRequestedBy,
                justification: roJustification,
                items: roItems.map(i => ({
                    equipmentName: i.equipmentName,
                    quantity: Number(i.quantity) || 1,
                    estimatedUnitCost: Number(i.estimatedUnitCost) || 0,
                    urgency: i.urgency
                }))
            });

            if (res.success && res.ro) {
                toast.success(`Request Order ${res.ro.roNumber} filed successfully!`);
                setRos(prev => [res.ro, ...prev]);
                setIsROModalOpen(false);
                setRoRequestedBy("");
                setRoJustification("");
                setRoItems([{ equipmentName: "", quantity: "", estimatedUnitCost: 0, urgency: "NORMAL" }]);
                refreshEquipmentData(true);
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
                refreshEquipmentData(true);
            } else {
                toast.error(res.error || "Dispatch failed");
            }
        });
    };

    // Receiving Handlers
    const handleConfirmReceiving = async () => {
        if (!activeSO) return;
        if (!receivingBy.trim()) {
            toast.error("Please enter the receiving nurse / midwife name.");
            return;
        }

        const expectedTotal = activeSO.items?.reduce((sum: number, item: any) => sum + (Number(item.quantity) || 1), 0) || activeSO.items?.length || 1;

        if (!isFullAcceptance) {
            if (!receivingDiscrepancyNotes.trim()) {
                toast.error("Please describe the discrepancy or damage reason for the return ticket.");
                return;
            }
        }

        startTransition(async () => {
            const res = await receiveStockTransfer({
                soId: activeSO.id,
                acceptedFull: isFullAcceptance,
                receivedBy: receivingBy.trim(),
                actualReceivedCount: isFullAcceptance
                    ? expectedTotal
                    : (actualReceivedCount === "" ? 0 : Math.max(0, Number(actualReceivedCount) || 0)),
                missingCount: isFullAcceptance ? 0 : (missingCount === "" ? 0 : Math.max(0, Number(missingCount) || 0)),
                defectiveCount: isFullAcceptance ? 0 : (defectiveCount === "" ? 0 : Math.max(0, Number(defectiveCount) || 0)),
                reasonNotes: receivingDiscrepancyNotes.trim()
            });

            if (res.success) {
                toast.success(isFullAcceptance ? "Shipment received and deployed!" : "Discrepancy return ticket logged!");
                setIsReceiveModalOpen(false);
                refreshEquipmentData(true);
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
                refreshEquipmentData(true);
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
                refreshEquipmentData(true);
            } else {
                toast.error(res.error || "Resolution failed");
            }
        });
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-20">
            {/* Top Header Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 p-6 md:p-7 shadow-xs transition-colors duration-200">
                <div 
                    className="absolute top-0 right-0 w-80 h-80 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20 opacity-10 dark:opacity-20"
                    style={{ backgroundColor: themeColor }}
                />
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
                    <div className="space-y-2 max-w-2xl">
                        {/* Streamlined pill badges */}
                        <div className="flex items-center gap-2 flex-wrap">
                            {matchedCenter ? (
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/25 text-purple-600 dark:text-purple-400 text-[11px] font-black uppercase tracking-wider">
                                    <Building2 className="w-3 h-3" />
                                    {matchedCenter.name}
                                </div>
                            ) : (
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/25 text-sky-600 dark:text-sky-400 text-[11px] font-black uppercase tracking-wider">
                                    <Activity className="w-3 h-3" />
                                    RHU Asset Management
                                </div>
                            )}

                            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 text-[11px] font-black uppercase tracking-wider">
                                <span className="relative flex h-1.5 w-1.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                                </span>
                                Live Sync
                            </div>

                            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-slate-500 dark:text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                                COA Compliant
                            </div>
                        </div>

                        {/* Heading */}
                        <h1 className="text-xl md:text-2xl lg:text-3xl font-black italic tracking-tight uppercase text-slate-900 dark:text-white leading-tight">
                            {matchedCenter ? `${matchedCenter.name} Equipment Ledger` : "Medical Equipment & Stockroom Monitoring"}
                        </h1>

                        {/* Description */}
                        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-xl">
                            {matchedCenter 
                                ? "Facility equipment ledger. File requisitions (RO), conduct receiving inspections, track room placements, and log repairs."
                                : "Granular room-by-room physical equipment tracking, purchase intakes, BHS requisitions, stock transfers, and COA audit reports."}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => refreshEquipmentData(false)}
                            disabled={isRefreshing}
                            className="h-10 px-3.5 rounded-2xl border-slate-200 dark:border-white/20 bg-slate-50 dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/20 text-slate-700 dark:text-white font-bold text-xs uppercase cursor-pointer"
                            title="Sync Latest Realtime Data"
                        >
                            <RefreshCw className={cn("w-3.5 h-3.5 mr-1.5", isRefreshing && "animate-spin text-sky-500")} />
                            {isRefreshing ? "Syncing..." : "Sync"}
                        </Button>
                        {isReadOnly ? (
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-amber-50 dark:bg-amber-500/20 border border-amber-200 dark:border-amber-400/30 text-amber-700 dark:text-amber-300 text-xs font-black uppercase tracking-wider shadow-sm">
                                <Eye className="w-4 h-4 text-amber-500" />
                                Read-Only Access
                            </div>
                        ) : matchedCenter ? (
                            <Button
                                onClick={() => handleOpenAddAsset(true)}
                                className="h-10 px-5 rounded-2xl font-black text-xs uppercase tracking-wider text-white shadow-md transition-all hover:scale-105"
                                style={{ backgroundColor: themeColor }}
                            >
                                <Plus className="w-4 h-4 mr-1.5" /> Register Local Asset
                            </Button>
                        ) : (
                            <>
                                <Button
                                    onClick={() => handleOpenAddAsset(false)}
                                    className="h-10 px-4 rounded-2xl font-black text-xs uppercase tracking-wider text-white shadow-md transition-all hover:scale-105"
                                    style={{ backgroundColor: themeColor }}
                                >
                                    <Plus className="w-4 h-4 mr-1.5" /> Register Asset
                                </Button>
                                <Button
                                    onClick={() => handleOpenAddAsset(true)}
                                    variant="outline"
                                    className="h-10 px-4 rounded-2xl font-bold text-xs uppercase border-slate-200 dark:border-white/20 bg-slate-50 dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/20 text-slate-700 dark:text-white"
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
                    <span className="text-[10px] font-black uppercase text-slate-400 block">Total Units</span>
                    <span className="text-2xl font-black text-slate-900 dark:text-white">{totalPhysicalUnits}</span>
                    <span className="text-[9px] text-slate-400 block mt-0.5 font-medium">
                        {consolidatedAssets.length} unique equipment
                    </span>
                </Card>
                <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-[#161a24] p-4 text-center">
                    <span className="text-[10px] font-black uppercase text-slate-400 block">In Stockroom</span>
                    <span className="text-2xl font-black text-blue-600">{inStockroomUnits}</span>
                    <span className="text-[9px] text-slate-400 block mt-0.5 font-medium">
                        {inStockroomCount} {inStockroomCount === 1 ? "batch" : "batches"}
                    </span>
                </Card>
                <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-[#161a24] p-4 text-center">
                    <span className="text-[10px] font-black uppercase text-slate-400 block">Deployed (BHS)</span>
                    <span className="text-2xl font-black text-emerald-600">{deployedUnits}</span>
                    <span className="text-[9px] text-slate-400 block mt-0.5 font-medium">
                        {deployedCount} deployed records
                    </span>
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
                        { id: "PO", label: `Purchase Orders (${pos.length})`, icon: ShoppingCart },
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
                                <div className="flex flex-wrap items-center gap-1.5">
                                    <div className="inline-flex rounded-xl p-0.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                                        <button
                                            type="button"
                                            onClick={() => { setSelectedFacility("ALL"); setCurrentPage(1); }}
                                            className={cn(
                                                "px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                                                selectedFacility === "ALL"
                                                    ? "bg-white dark:bg-[#161820] text-sky-600 dark:text-sky-400 shadow-xs"
                                                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                                            )}
                                        >
                                            🌐 All Facilities ({assets.length})
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { setSelectedFacility(matchedCenter.name); setCurrentPage(1); }}
                                            className={cn(
                                                "px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1",
                                                selectedFacility === matchedCenter.name
                                                    ? "bg-white dark:bg-[#161820] text-sky-600 dark:text-sky-400 shadow-xs"
                                                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                                            )}
                                        >
                                            <Building2 className="w-3 h-3 text-sky-500" />
                                            <span>{matchedCenter.name}</span>
                                        </button>
                                    </div>
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
                                    <TableHead className="text-[10px] font-black uppercase">Equipment Name &amp; Brand</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase">Location (Facility / Room)</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase">Custodian</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase">COA Class &amp; Ref</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase">Current Stock &amp; Value</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase">Status</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedAssets.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="py-12 text-center text-slate-400 font-bold text-xs uppercase">
                                            {matchedCenter && selectedFacility === matchedCenter.name ? (
                                                <div className="space-y-3 max-w-md mx-auto py-2">
                                                    <div className="w-12 h-12 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center mx-auto">
                                                        <Building2 className="w-6 h-6" />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <div className="text-xs font-black text-slate-800 dark:text-slate-200">
                                                            No Equipment Assigned to {matchedCenter.name} Yet
                                                        </div>
                                                        <p className="text-[11px] text-slate-400 font-normal normal-case">
                                                            Newly intaken equipment is currently stored in Central Stockroom ({stockroomAssets.reduce((sum, a) => sum + (Number(a.availableQty ?? a.quantity) || 1), 0)} units ready). Switch to &ldquo;All Facilities&rdquo; to view the Master Ledger, or submit a Request Order (RO) to request items.
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center justify-center gap-2 pt-1">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => setSelectedFacility("ALL")}
                                                            className="h-8 text-xs font-bold rounded-xl cursor-pointer"
                                                        >
                                                            🌐 View All Facilities ({assets.length})
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            onClick={() => {
                                                                setActiveTab("RO");
                                                                setIsROModalOpen(true);
                                                            }}
                                                            className="h-8 text-xs font-bold rounded-xl bg-sky-600 hover:bg-sky-700 text-white cursor-pointer"
                                                        >
                                                            <ClipboardCheck className="w-3.5 h-3.5 mr-1" />
                                                            Create Request Order (RO)
                                                        </Button>
                                                    </div>
                                                </div>
                                            ) : (
                                                "No medical equipment found matching your filter criteria."
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    paginatedAssets.map(group => {
                                        const isExpanded = Boolean(expandedGroupKeys[group.groupKey]);
                                        const hasMultiple = group.hasMultipleBatches;
                                        const primary = group.primaryAsset;

                                        return (
                                            <React.Fragment key={group.groupKey}>
                                                <TableRow className={cn("hover:bg-slate-50 dark:hover:bg-white/5 transition-colors", isExpanded && "bg-sky-50/40 dark:bg-sky-950/20")}>
                                                    <TableCell className="font-mono text-xs align-top py-3.5">
                                                        <div className="flex items-center gap-1.5 font-bold">
                                                            <button
                                                                onClick={() => { setActiveAsset(primary); setIsQRModalOpen(true); }}
                                                                className="flex items-center gap-1 text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
                                                                title="View Primary Tag / QR"
                                                            >
                                                                <QrCode className="w-3.5 h-3.5 shrink-0" />
                                                                <span>{primary.assetTagNo}</span>
                                                            </button>
                                                        </div>

                                                        {/* Multi-Batch / PO History Dropdown Toggle */}
                                                        {hasMultiple ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => toggleExpandGroup(group.groupKey)}
                                                                className={cn(
                                                                    "inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md mt-1.5 cursor-pointer transition-all border",
                                                                    isExpanded
                                                                        ? "bg-sky-500 text-white border-sky-500 shadow-xs"
                                                                        : "bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800 hover:bg-sky-100"
                                                                )}
                                                            >
                                                                <Boxes className="w-3 h-3 shrink-0" />
                                                                <span>{group.batches.length} PO Batches</span>
                                                                {isExpanded ? <ChevronUp className="w-3 h-3 shrink-0" /> : <ChevronDown className="w-3 h-3 shrink-0" />}
                                                            </button>
                                                        ) : primary.poReferenceNo ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => toggleExpandGroup(group.groupKey)}
                                                                className="inline-flex items-center gap-1 text-[9px] font-mono text-slate-500 hover:text-sky-600 mt-1 cursor-pointer"
                                                                title="Click to view PO history"
                                                            >
                                                                <ShoppingCart className="w-2.5 h-2.5" />
                                                                <span>{primary.poReferenceNo}</span>
                                                                {isExpanded ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
                                                            </button>
                                                        ) : null}
                                                    </TableCell>

                                                    <TableCell className="align-top py-3.5">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-xs text-slate-900 dark:text-white">
                                                                {group.equipmentName}
                                                            </span>
                                                            {hasMultiple && (
                                                                <Badge variant="outline" className="text-[9px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 shrink-0">
                                                                    Consolidated
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                                                            Brand: {group.brandSummary} • SN: {hasMultiple ? `${group.batches.length} Batch Records` : (primary.serialNo || "NONE")}
                                                        </div>
                                                    </TableCell>

                                                    <TableCell className="align-top py-3.5">
                                                        <div className="font-bold text-xs text-slate-800 dark:text-slate-200">
                                                            {group.currentFacility}
                                                        </div>
                                                        <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                                                            <DoorClosed className="w-3 h-3 text-slate-400" />
                                                            {group.assignedRoom}
                                                        </div>
                                                    </TableCell>

                                                    <TableCell className="align-top py-3.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                                                        <div className="flex items-center gap-1">
                                                            <User className="w-3.5 h-3.5 text-slate-400" />
                                                            {group.accountablePerson || "RHU Supply Custodian"}
                                                        </div>
                                                    </TableCell>

                                                    <TableCell className="align-top py-3.5">
                                                        <Badge
                                                            variant="outline"
                                                            className={cn(
                                                                "font-mono text-[10px] font-bold uppercase",
                                                                group.category === "PPE"
                                                                    ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200"
                                                                    : "bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border-teal-200"
                                                            )}
                                                        >
                                                            {group.category === "PPE" ? "PPE (> ₱50k)" : "SEMI-EXPENDABLE"}
                                                        </Badge>
                                                        <span className="block text-[9px] font-mono text-slate-400 mt-0.5">
                                                            {hasMultiple ? `${group.batches.length} References` : primary.documentReference}
                                                        </span>
                                                    </TableCell>

                                                    <TableCell className="align-top py-3.5 font-mono text-xs">
                                                        {/* Current Stock Tag */}
                                                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md font-bold text-xs bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300/40 dark:border-emerald-700/40">
                                                            <Package className="w-3 h-3 text-emerald-500 shrink-0" />
                                                            <span>{group.totalAvailableQty} pcs in stock</span>
                                                        </div>

                                                        {/* Unit Cost / Valuation */}
                                                        <div className="mt-1 font-bold text-slate-900 dark:text-white">
                                                            {group.minUnitCost === group.maxUnitCost ? (
                                                                `₱${group.minUnitCost.toLocaleString()}`
                                                            ) : (
                                                                <span title={`Batches range from ₱${group.minUnitCost.toLocaleString()} to ₱${group.maxUnitCost.toLocaleString()}`}>
                                                                    ₱{group.minUnitCost.toLocaleString()} – ₱{group.maxUnitCost.toLocaleString()}
                                                                </span>
                                                            )}
                                                        </div>
                                                        {hasMultiple && group.totalStockValue > 0 && (
                                                            <div className="text-[10px] text-slate-400">
                                                                Total: ₱{group.totalStockValue.toLocaleString()}
                                                            </div>
                                                        )}
                                                    </TableCell>

                                                    <TableCell className="align-top py-3.5">
                                                        {getStatusBadge(group.currentStatus)}
                                                    </TableCell>

                                                    <TableCell className="align-top py-3.5 text-right">
                                                        <div className="flex items-center justify-end gap-1">
                                                            {/* PO History Dropdown Button */}
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => toggleExpandGroup(group.groupKey)}
                                                                className={cn(
                                                                    "h-7 px-2 rounded-lg text-xs font-bold gap-1 cursor-pointer transition-all",
                                                                    isExpanded
                                                                        ? "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300"
                                                                        : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10"
                                                                )}
                                                                title="View Purchase Order History"
                                                            >
                                                                <History className="w-3.5 h-3.5 text-sky-500" />
                                                                <span className="text-[10px] font-bold hidden xl:inline">PO History</span>
                                                                {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                                            </Button>

                                                            {/* Primary Tag QR Modal */}
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => { setActiveAsset(primary); setIsQRModalOpen(true); }}
                                                                className="h-7 w-7 p-0 rounded-lg text-sky-600 hover:text-sky-700 hover:bg-sky-50 dark:hover:bg-sky-950/40 cursor-pointer"
                                                                title="View Property Tag / QR"
                                                            >
                                                                <QrCode className="w-3.5 h-3.5" />
                                                            </Button>

                                                            {!isReadOnly && (
                                                                <>
                                                                    {group.currentStatus === "PENDING_VERIFICATION" && (
                                                                        <Button
                                                                            size="sm"
                                                                            onClick={() => handleVerifyAsset(primary.id)}
                                                                            className="h-7 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] uppercase cursor-pointer"
                                                                        >
                                                                            <CheckCircle2 className="w-3 h-3 mr-1" /> Approve
                                                                        </Button>
                                                                    )}

                                                                    {group.currentStatus === "DEPLOYED_SERVICEABLE" && (
                                                                        <Button
                                                                            size="sm"
                                                                            variant="outline"
                                                                            onClick={() => { setActiveAsset(primary); setIsRepairModalOpen(true); }}
                                                                            className="h-7 px-2 rounded-lg text-amber-600 border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950 font-bold text-[10px] uppercase cursor-pointer"
                                                                            title="Report Defect"
                                                                        >
                                                                            <Wrench className="w-3 h-3" />
                                                                        </Button>
                                                                    )}

                                                                    {group.currentStatus === "DEFECTIVE_FOR_REPAIR" && (
                                                                        <Button
                                                                            size="sm"
                                                                            onClick={() => { setActiveAsset(primary); setIsResolveRepairModalOpen(true); }}
                                                                            className="h-7 px-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] uppercase cursor-pointer"
                                                                            title="Resolve Repair"
                                                                        >
                                                                            Resolve
                                                                        </Button>
                                                                    )}

                                                                    {(!matchedCenter || primary.currentFacility === matchedCenter.name) && (
                                                                        <Button
                                                                            size="sm"
                                                                            variant="ghost"
                                                                            onClick={() => handleOpenEditAsset(primary)}
                                                                            className="h-7 w-7 p-0 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-white cursor-pointer"
                                                                            title="Edit Asset"
                                                                        >
                                                                            <Edit3 className="w-3.5 h-3.5" />
                                                                        </Button>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>

                                                {/* EXPANDABLE INLINE PURCHASE ORDER HISTORY */}
                                                {isExpanded && (
                                                    <TableRow className="bg-slate-50/70 dark:bg-white/[0.02] border-b border-slate-200 dark:border-slate-800 animate-in fade-in-50 duration-200">
                                                        <TableCell colSpan={8} className="p-0">
                                                            <div className="p-4 sm:p-5 border-l-4 border-l-sky-500 bg-sky-500/5 dark:bg-sky-950/20 space-y-3">
                                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="w-7 h-7 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold">
                                                                            <History className="w-4 h-4" />
                                                                        </div>
                                                                        <div>
                                                                            <h4 className="text-xs font-black uppercase text-slate-900 dark:text-white flex items-center gap-2">
                                                                                Purchase Order Intake History — {group.equipmentName}
                                                                                <Badge variant="outline" className="text-[10px] font-mono">
                                                                                    {group.batches.length} {group.batches.length === 1 ? "Batch" : "Batches"}
                                                                                </Badge>
                                                                            </h4>
                                                                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                                                                Procurement intake audit breakdown for this equipment. Total stock available: <b>{group.totalAvailableQty} pcs</b>.
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        onClick={() => {
                                                                            setPoHistoryGroup(group);
                                                                            setIsPOHistoryModalOpen(true);
                                                                        }}
                                                                        className="h-7 text-[10px] font-bold text-sky-600 dark:text-sky-400 border-sky-300 dark:border-sky-800 hover:bg-sky-50 dark:hover:bg-sky-950/40 rounded-lg cursor-pointer shrink-0"
                                                                    >
                                                                        <ExternalLink className="w-3 h-3 mr-1" />
                                                                        Full Audit Dialog
                                                                    </Button>
                                                                </div>

                                                                {/* Batches Table */}
                                                                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#161a24] shadow-xs">
                                                                    <table className="w-full text-left text-xs">
                                                                        <thead className="bg-slate-100/70 dark:bg-white/5 text-[9px] font-black uppercase text-slate-500 dark:text-slate-400 border-b border-slate-200/60 dark:border-white/5">
                                                                            <tr>
                                                                                <th className="py-2.5 px-3">Batch / PO #</th>
                                                                                <th className="py-2.5 px-3">Property Tag / QR</th>
                                                                                <th className="py-2.5 px-3">COA Doc Ref</th>
                                                                                <th className="py-2.5 px-3">Brand &amp; Serial</th>
                                                                                <th className="py-2.5 px-3">Intake Date</th>
                                                                                <th className="py-2.5 px-3 text-right">Unit Value</th>
                                                                                <th className="py-2.5 px-3 text-center">Batch Stock</th>
                                                                                <th className="py-2.5 px-3 text-right">Subtotal</th>
                                                                                <th className="py-2.5 px-3 text-right">Actions</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                                                            {group.batches.map((batch: any, bIdx: number) => {
                                                                                const bAvail = Number(batch.availableQty ?? batch.quantity) || 1;
                                                                                const bCost = Number(batch.unitCost) || 0;
                                                                                const bSubtotal = bAvail * bCost;

                                                                                return (
                                                                                    <tr key={batch.id} className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors">
                                                                                        <td className="py-2.5 px-3">
                                                                                            <div className="font-mono font-bold text-xs text-sky-600 dark:text-sky-400 flex items-center gap-1.5">
                                                                                                <ShoppingCart className="w-3 h-3 text-slate-400" />
                                                                                                {batch.poReferenceNo || `Manual Entry #${bIdx + 1}`}
                                                                                            </div>
                                                                                            <span className="text-[10px] text-slate-400 block">
                                                                                                Batch #{group.batches.length - bIdx}
                                                                                            </span>
                                                                                        </td>
                                                                                        <td className="py-2.5 px-3">
                                                                                            <button
                                                                                                type="button"
                                                                                                onClick={() => { setActiveAsset(batch); setIsQRModalOpen(true); }}
                                                                                                className="flex items-center gap-1 font-mono font-bold text-xs text-slate-800 dark:text-slate-200 hover:text-sky-600 dark:hover:text-sky-400 hover:underline cursor-pointer"
                                                                                            >
                                                                                                <QrCode className="w-3.5 h-3.5 text-sky-500" />
                                                                                                {batch.assetTagNo}
                                                                                            </button>
                                                                                        </td>
                                                                                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                                                                                            {batch.documentReference || "—"}
                                                                                        </td>
                                                                                        <td className="py-2.5 px-3">
                                                                                            <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                                                                                                {batch.brand || "N/A"}
                                                                                            </span>
                                                                                            <span className="text-[10px] text-slate-400 block font-mono">
                                                                                                SN: {batch.serialNo || "NONE"}
                                                                                            </span>
                                                                                        </td>
                                                                                        <td className="py-2.5 px-3 text-[11px] text-slate-500">
                                                                                            {batch.createdAt ? new Date(batch.createdAt).toLocaleDateString() : "—"}
                                                                                        </td>
                                                                                        <td className="py-2.5 px-3 font-mono font-semibold text-right text-slate-700 dark:text-slate-300">
                                                                                            ₱{bCost.toLocaleString()}
                                                                                        </td>
                                                                                        <td className="py-2.5 px-3 text-center">
                                                                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold font-mono bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/50">
                                                                                                {bAvail} pcs
                                                                                            </span>
                                                                                        </td>
                                                                                        <td className="py-2.5 px-3 font-mono font-bold text-right text-slate-900 dark:text-white">
                                                                                            ₱{bSubtotal.toLocaleString()}
                                                                                        </td>
                                                                                        <td className="py-2.5 px-3 text-right">
                                                                                            <div className="flex items-center justify-end gap-1">
                                                                                                <Button
                                                                                                    size="sm"
                                                                                                    variant="ghost"
                                                                                                    onClick={() => { setActiveAsset(batch); setIsQRModalOpen(true); }}
                                                                                                    className="h-6 w-6 p-0 rounded hover:bg-slate-100 dark:hover:bg-white/10 text-sky-600"
                                                                                                    title="View QR Code"
                                                                                                >
                                                                                                    <QrCode className="w-3 h-3" />
                                                                                                </Button>
                                                                                                {!isReadOnly && (
                                                                                                    <Button
                                                                                                        size="sm"
                                                                                                        variant="ghost"
                                                                                                        onClick={() => handleOpenEditAsset(batch)}
                                                                                                        className="h-6 w-6 p-0 rounded hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-slate-700"
                                                                                                        title="Edit Batch Asset"
                                                                                                    >
                                                                                                        <Edit3 className="w-3 h-3" />
                                                                                                    </Button>
                                                                                                )}
                                                                                            </div>
                                                                                        </td>
                                                                                    </tr>
                                                                                );
                                                                            })}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
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

                        {/* Master Ledger Pagination Bar */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-white/2 text-xs">
                            <div className="text-slate-500 dark:text-slate-400 font-semibold">
                                Showing <span className="font-bold text-slate-900 dark:text-white">{consolidatedAssets.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}</span> to{" "}
                                <span className="font-bold text-slate-900 dark:text-white">{Math.min(currentPage * pageSize, consolidatedAssets.length)}</span> of{" "}
                                <span className="font-bold text-slate-900 dark:text-white">{consolidatedAssets.length}</span> unique equipment
                                {filteredAssets.length !== consolidatedAssets.length && (
                                    <span className="text-slate-400 ml-1">
                                        ({filteredAssets.reduce((sum, a) => sum + (Number(a.quantity) || 1), 0)} total units across {filteredAssets.length} PO batches)
                                    </span>
                                )}
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
                        {isGlobalAdmin && (
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
                                        const totalDamagedCount = po.items?.reduce((sum: number, item: any) => sum + (Number(item.damagedQty) || 0), 0) || 0;
                                        const totalMissingCount = po.items?.reduce((sum: number, item: any) => sum + (Number(item.missingQty) || 0), 0) || 0;
                                        const isIntakeDone = po.status === "DELIVERED_INTAKE" || po.status === "PARTIAL_INTAKE_DISCREPANCY" || po.status === "INTAKE_COMPLETED_DISCREPANCY";
                                        const isDiscrepancy = po.status === "PARTIAL_INTAKE_DISCREPANCY" || po.status === "INTAKE_COMPLETED_DISCREPANCY" || totalDamagedCount > 0 || totalMissingCount > 0;

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
                                                    <div className="space-y-2">
                                                        {po.items?.map((item: any) => {
                                                            const received = Number(item.receivedQty) || 0;
                                                            const damaged = Number(item.damagedQty) || 0;
                                                            const missing = Number(item.missingQty) || 0;
                                                            const hasIntake = isIntakeDone && (received > 0 || damaged > 0 || missing > 0);

                                                            return (
                                                                <div key={item.id} className="text-xs space-y-1">
                                                                    <div className="text-slate-700 dark:text-slate-300 flex items-center justify-between gap-3">
                                                                        <span className="truncate font-semibold">• {item.equipmentName}</span>
                                                                        <span className="font-mono text-[11px] text-slate-500 font-bold shrink-0">
                                                                            {item.quantity}x @ ₱{(item.unitCost || 0).toLocaleString()}
                                                                        </span>
                                                                    </div>

                                                                    {/* Visual Intake Breakdown */}
                                                                    {hasIntake && (
                                                                        <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono pl-2">
                                                                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
                                                                                <CheckCircle2 className="w-2.5 h-2.5" /> {received} Good
                                                                            </span>
                                                                            {damaged > 0 && (
                                                                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-600 dark:text-rose-400 font-black border border-rose-500/30">
                                                                                    <AlertTriangle className="w-2.5 h-2.5" /> {damaged} Damaged
                                                                                </span>
                                                                            )}
                                                                            {missing > 0 && (
                                                                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/30">
                                                                                    <Clock className="w-2.5 h-2.5" /> {missing} Missing
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
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
                                                        isDiscrepancy ? (
                                                            <div className="space-y-1">
                                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-[10px] font-black uppercase">
                                                                    <AlertTriangle className="w-3 h-3" /> Intake Done ({totalDamagedCount > 0 ? `${totalDamagedCount} Damaged` : ""}{totalMissingCount > 0 ? `${totalDamagedCount > 0 ? ", " : ""}${totalMissingCount} Missing` : ""})
                                                                </span>
                                                                {po.inspectionNotes && (
                                                                    <p className="text-[10px] text-slate-500 italic max-w-xs truncate" title={po.inspectionNotes}>
                                                                        &ldquo;{po.inspectionNotes}&rdquo;
                                                                    </p>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase">
                                                                <CheckCircle2 className="w-3 h-3" /> 100% Good &amp; Stored
                                                            </span>
                                                        )
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-sky-500/15 border border-sky-500/30 text-sky-600 dark:text-sky-400 text-[10px] font-black uppercase">
                                                            <Clock className="w-3 h-3" /> PO Issued (Pending Intake)
                                                        </span>
                                                    )}
                                                </TableCell>

                                                <TableCell className="align-top py-3.5 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {isIntakeDone && (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => {
                                                                    setViewingPO(po);
                                                                    setIsViewPOModalOpen(true);
                                                                }}
                                                                className="h-8 px-2.5 rounded-xl border-slate-300 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 font-bold text-xs cursor-pointer text-slate-700 dark:text-slate-200"
                                                                title="View Inspection & Intake Details"
                                                            >
                                                                <Eye className="w-3.5 h-3.5 mr-1 text-sky-500" />
                                                                View Details
                                                            </Button>
                                                        )}

                                                        {isGlobalAdmin && !isIntakeDone ? (
                                                            <Button
                                                                size="sm"
                                                                onClick={() => handleOpenIntakeModal(po)}
                                                                className="h-8 px-3 rounded-xl font-bold text-xs uppercase shadow-sm cursor-pointer transition-all bg-emerald-600 hover:bg-emerald-700 text-white"
                                                            >
                                                                <Boxes className="w-3.5 h-3.5 mr-1.5" />
                                                                Confirm Intake
                                                            </Button>
                                                        ) : (
                                                            <span className="text-[10px] text-slate-400 font-bold uppercase shrink-0">
                                                                Stockroom Stored
                                                            </span>
                                                        )}
                                                    </div>
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
                                        const isPoOrdered = ro.status === "PO_ORDERED" || Boolean(ro.linkedPoNumber);

                                        // Live stock availability in Central Stockroom for this RO
                                        const itemsWithStock = ro.items?.map((item: any) => {
                                            const matchingStock = stockroomAssets.filter((a: any) =>
                                                a.equipmentName?.toLowerCase().trim() === item.equipmentName?.toLowerCase().trim()
                                            );
                                            const availableCount = matchingStock.reduce((sum: number, a: any) => sum + (Number(a.availableQty ?? a.quantity) || 1), 0);
                                            const requestedQty = Number(item.quantity) || 1;
                                            return {
                                                ...item,
                                                availableCount,
                                                isFullyInStock: availableCount >= requestedQty,
                                                isPartiallyInStock: availableCount > 0 && availableCount < requestedQty,
                                                isOutOfStock: availableCount === 0
                                            };
                                        }) || [];

                                        const hasSufficientStock = itemsWithStock.length > 0 && itemsWithStock.every((i: any) => i.isFullyInStock);

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
                                                    <div className="space-y-1.5">
                                                        {itemsWithStock.map((item: any) => (
                                                            <div key={item.id} className="p-2 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5 space-y-1">
                                                                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between gap-2">
                                                                    <span className="truncate">• {item.equipmentName} ({item.quantity}x)</span>
                                                                    <Badge variant="outline" className={cn(
                                                                        "text-[9px] font-black shrink-0 uppercase",
                                                                        item.urgency === "HIGH" ? "border-rose-500/40 text-rose-600 bg-rose-500/10" : "border-slate-200 text-slate-500"
                                                                    )}>
                                                                        {item.urgency || "NORMAL"}
                                                                    </Badge>
                                                                </div>
                                                                <div className="flex items-center gap-1.5 text-[10px] font-bold">
                                                                    {item.isFullyInStock ? (
                                                                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                                            In Stock ({item.availableCount} in stockroom)
                                                                        </span>
                                                                    ) : item.isPartiallyInStock ? (
                                                                        <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                                                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                                                            Stock Not Enough ({item.availableCount}/{item.quantity} available — Short of {item.quantity - item.availableCount})
                                                                        </span>
                                                                    ) : (
                                                                        <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400">
                                                                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                                                            No Stock (0 in stockroom)
                                                                        </span>
                                                                    )}
                                                                </div>
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
                                                    ) : isPoOrdered ? (
                                                        <div className="space-y-1">
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-600 dark:text-purple-400 text-[10px] font-black uppercase">
                                                                <ShoppingCart className="w-3 h-3" /> PO Ordered
                                                            </span>
                                                            {ro.linkedPoNumber && (
                                                                <span className="text-[10px] font-mono text-purple-600 dark:text-purple-400 font-bold block">
                                                                    {ro.linkedPoNumber}
                                                                </span>
                                                            )}
                                                        </div>
                                                    ) : hasSufficientStock ? (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase">
                                                            <CheckCircle2 className="w-3 h-3" /> Stock Ready for SO
                                                        </span>
                                                    ) : (
                                                        <div className="space-y-1">
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase">
                                                                <Clock className="w-3 h-3" /> Submitted (Pending SO)
                                                            </span>
                                                            <span className="text-[9px] font-bold text-rose-500 flex items-center gap-1 block">
                                                                <AlertTriangle className="w-3 h-3" /> Needs Procurement (PO)
                                                            </span>
                                                        </div>
                                                    )}
                                                </TableCell>

                                                <TableCell className="align-top py-3.5 text-right">
                                                    {isGlobalAdmin && !isConverted ? (
                                                        <div className="flex flex-col items-end gap-1.5">
                                                            <Button
                                                                size="sm"
                                                                onClick={() => {
                                                                    setLinkedRoNumber(ro.roNumber);
                                                                    setSoTargetFacility(ro.requestingFacility);
                                                                    setSoTargetRoom(ro.requestedRoom);
                                                                    setSelectedStockAssetIds([]);
                                                                    setIsSOModalOpen(true);
                                                                }}
                                                                className={cn(
                                                                    "h-8 px-3 rounded-xl font-bold text-xs uppercase shadow-sm cursor-pointer transition-all",
                                                                    hasSufficientStock
                                                                        ? "bg-sky-600 hover:bg-sky-700 text-white"
                                                                        : "bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-white/10 dark:hover:bg-white/15 dark:text-slate-200"
                                                                )}
                                                            >
                                                                <Truck className="w-3.5 h-3.5 mr-1.5" /> Convert to SO
                                                            </Button>

                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => handleProcureFromRO(ro)}
                                                                className="h-7 px-2.5 rounded-xl border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 font-bold text-[10px] uppercase shadow-xs cursor-pointer"
                                                                title="Generate a Purchase Order (PO) to procure this equipment from supplier"
                                                            >
                                                                <ShoppingCart className="w-3 h-3 mr-1" />
                                                                {isPoOrdered ? "Add PO / Reorder" : "Procure via PO"}
                                                            </Button>
                                                        </div>
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
                        {(isGlobalAdmin || canDispatchSO) && (
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
                                                                setReceivingBy("");
                                                                setIsFullAcceptance(true);
                                                                setActualReceivedCount("");
                                                                setMissingCount("");
                                                                setDefectiveCount("");
                                                                setReceivingDiscrepancyNotes("");
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
                            <div className="space-y-1.5 min-w-0">
                                <Label className="text-[10px] font-black uppercase text-slate-400">Brand / Model</Label>
                                <Input
                                    value={assetForm.brand}
                                    onChange={(e) => setAssetForm({ ...assetForm, brand: e.target.value })}
                                    placeholder="e.g. Philips HeartStart"
                                    className="h-11 rounded-xl text-xs font-bold"
                                />
                            </div>
                            <div className="space-y-1.5 min-w-0">
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
                            <div className="space-y-1.5 min-w-0">
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

                            <div className="space-y-1.5 min-w-0">
                                <Label className="text-[10px] font-black uppercase text-slate-400">Acquisition Source</Label>
                                <Select
                                    value={assetForm.acquisitionSource}
                                    onValueChange={(val) => setAssetForm({ ...assetForm, acquisitionSource: val })}
                                >
                                    <SelectTrigger className="h-11 w-full min-w-0 rounded-xl text-xs font-bold [&>span]:truncate">
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
                            <div className="space-y-1.5 min-w-0">
                                <Label className="text-[10px] font-black uppercase text-slate-400">Health Facility Location</Label>
                                {matchedCenter ? (
                                    <div className="h-11 px-3 rounded-xl text-xs font-bold bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-between text-slate-700 dark:text-slate-300 min-w-0">
                                        <div className="flex items-center gap-1.5 truncate min-w-0">
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
                                        <SelectTrigger className="h-11 w-full min-w-0 rounded-xl text-xs font-bold truncate [&>span]:truncate">
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

                            <div className="space-y-1.5 min-w-0">
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
                                    <SelectTrigger className="h-11 w-full min-w-0 rounded-xl text-xs font-bold truncate [&>span]:truncate">
                                        <SelectValue placeholder="Select specific room..." />
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
                            <div className="space-y-1.5 min-w-0">
                                <Label className="text-[10px] font-black uppercase text-slate-400">Accountable Custodian (Nurse/Midwife)</Label>
                                <Input
                                    value={assetForm.accountablePerson}
                                    onChange={(e) => setAssetForm({ ...assetForm, accountablePerson: e.target.value })}
                                    placeholder="e.g. Maria Dela Cruz, RN"
                                    className="h-11 rounded-xl text-xs font-bold"
                                />
                            </div>
                            <div className="space-y-1.5 min-w-0">
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
            <Dialog open={isPOModalOpen} onOpenChange={(open) => {
                setIsPOModalOpen(open);
                if (!open) setPoLinkedRoNumber("");
            }}>
                <DialogContent className="sm:max-w-[600px] max-h-[88vh] overflow-y-auto rounded-3xl bg-white dark:bg-[#161820] p-6">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black italic uppercase">Create Purchase Order (PO)</DialogTitle>
                        <DialogDescription className="text-xs font-bold uppercase text-slate-400">
                            Procurement order for medical equipment and supplies from vendor.
                        </DialogDescription>
                    </DialogHeader>

                    {poLinkedRoNumber && (
                        <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2.5">
                                <span className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
                                    <ShoppingCart className="w-4 h-4" />
                                </span>
                                <div>
                                    <span className="font-bold text-amber-700 dark:text-amber-300 block">
                                        Linked to Requisition: {poLinkedRoNumber}
                                    </span>
                                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                                        Line items pre-populated from health station request.
                                    </span>
                                </div>
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setPoLinkedRoNumber("")}
                                className="h-7 text-[10px] font-bold text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg cursor-pointer"
                            >
                                Unlink
                            </Button>
                        </div>
                    )}

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
                                                            placeholder="e.g. 1"
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
                                    ₱{poItems.reduce((acc, i) => acc + (Number(i.quantity) || 0) * (Number(i.unitCost) || 0), 0).toLocaleString()}
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
            {/* MODAL: CONFIRM STOCKROOM INTAKE & DELIVERY INSPECTION */}
            {/* ========================================================================= */}
            <Dialog open={isIntakeModalOpen} onOpenChange={setIsIntakeModalOpen}>
                <DialogContent className="sm:max-w-[620px] max-h-[88vh] overflow-y-auto rounded-3xl bg-white dark:bg-[#161820] p-6">
                    <DialogHeader>
                        <div className="flex items-center justify-between">
                            <DialogTitle className="text-xl font-black italic uppercase">
                                Central Stockroom Intake & Inspection
                            </DialogTitle>
                            {activePO?.poNumber && (
                                <Badge variant="outline" className="font-mono text-xs text-sky-600 border-sky-500/30">
                                    {activePO.poNumber}
                                </Badge>
                            )}
                        </div>
                        <DialogDescription className="text-xs font-bold uppercase text-slate-400">
                            Inspect arrived delivery from <b>{activePO?.vendorName || "Vendor"}</b>. Encode good units into stockroom and log damages or shortages.
                        </DialogDescription>
                    </DialogHeader>

                    {/* Mode Toggle: 100% Good vs Discrepancy / Damage */}
                    <div className="p-1 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 grid grid-cols-2 gap-1 text-xs font-bold my-1">
                        <button
                            type="button"
                            onClick={() => {
                                setIsIntakeDiscrepancyMode(false);
                                setIntakeItems(prev => prev.map(item => ({
                                    ...item,
                                    acceptedQty: "",
                                    damagedQty: "",
                                    missingQty: ""
                                })));
                            }}
                            className={cn(
                                "py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                                !isIntakeDiscrepancyMode
                                    ? "bg-white dark:bg-[#161820] shadow-sm text-emerald-600 dark:text-emerald-400 font-black"
                                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                            )}
                        >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>100% Good &amp; Complete</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setIsIntakeDiscrepancyMode(true);
                                setIntakeItems(prev => prev.map(item => ({
                                    ...item,
                                    acceptedQty: "",
                                    damagedQty: "",
                                    missingQty: ""
                                })));
                            }}
                            className={cn(
                                "py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                                isIntakeDiscrepancyMode
                                    ? "bg-amber-500 text-white shadow-sm font-black"
                                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                            )}
                        >
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>Damaged / Shortage / Discrepancy</span>
                        </button>
                    </div>

                    <div className="space-y-3 py-1">
                        {intakeItems.map((item, idx) => {
                            const ordered = Number(item.orderedQty) || 1;
                            const already = Number(item.alreadyReceived) || 0;
                            const remaining = Math.max(0, ordered - already);

                            return (
                                <div key={item.itemId} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 space-y-2.5">
                                    <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-white/5 pb-2">
                                        <div>
                                            <span className="font-bold text-xs text-slate-800 dark:text-slate-100 block">
                                                {item.equipmentName} {item.brand ? `(${item.brand})` : ""}
                                            </span>
                                            <span className="text-[10px] text-slate-400">
                                                Ordered: {ordered} pcs {already > 0 ? `• Already Stored: ${already} pcs` : ""}
                                            </span>
                                        </div>
                                        <Badge variant="outline" className="text-[10px] font-mono font-bold text-sky-600 border-sky-500/30">
                                            Balance: {remaining} pcs
                                        </Badge>
                                    </div>

                                    {!isIntakeDiscrepancyMode ? (
                                        <div className="flex items-center justify-between text-xs py-1">
                                            <span className="text-slate-500 text-[11px]">
                                                Encoding full remaining balance into Central Stockroom:
                                            </span>
                                            <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                                                {remaining} Units
                                            </span>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-3 gap-2.5 pt-1">
                                            {/* Accepted Good */}
                                            <div className="space-y-1">
                                                <Label className="text-[9px] font-black uppercase text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                                    <CheckCircle2 className="w-3 h-3" /> Accepted (Good)
                                                </Label>
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    max={remaining}
                                                    value={item.acceptedQty}
                                                    placeholder={String(Math.max(0, remaining - (Number(item.damagedQty) || 0) - (Number(item.missingQty) || 0)))}
                                                    onChange={(e) => {
                                                        const copy = [...intakeItems];
                                                        copy[idx].acceptedQty = e.target.value === "" ? "" : Number(e.target.value);
                                                        setIntakeItems(copy);
                                                    }}
                                                    className="h-10 text-xs font-bold font-mono border-emerald-500/30 focus:border-emerald-500 bg-emerald-500/5 rounded-xl placeholder:text-slate-400/60"
                                                />
                                                <span className="text-[9px] text-slate-400 block leading-tight">
                                                    Enters Stockroom
                                                </span>
                                            </div>

                                            {/* Damaged / Defective */}
                                            <div className="space-y-1">
                                                <Label className="text-[9px] font-black uppercase text-rose-600 dark:text-rose-400 flex items-center gap-1">
                                                    <AlertTriangle className="w-3 h-3" /> Damaged (RTV)
                                                </Label>
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    max={remaining}
                                                    value={item.damagedQty}
                                                    placeholder="0"
                                                    onChange={(e) => {
                                                        const copy = [...intakeItems];
                                                        copy[idx].damagedQty = e.target.value === "" ? "" : Number(e.target.value);
                                                        setIntakeItems(copy);
                                                    }}
                                                    className="h-10 text-xs font-bold font-mono border-rose-500/30 focus:border-rose-500 bg-rose-500/5 rounded-xl text-rose-600 dark:text-rose-400 placeholder:text-slate-400/60"
                                                />
                                                <span className="text-[9px] text-slate-400 block leading-tight">
                                                    Return to Supplier
                                                </span>
                                            </div>

                                            {/* Shortage / Missing */}
                                            <div className="space-y-1">
                                                <Label className="text-[9px] font-black uppercase text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                                    <Clock className="w-3 h-3" /> Shortage / Missing
                                                </Label>
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    max={remaining}
                                                    value={item.missingQty}
                                                    placeholder="0"
                                                    onChange={(e) => {
                                                        const copy = [...intakeItems];
                                                        copy[idx].missingQty = e.target.value === "" ? "" : Number(e.target.value);
                                                        setIntakeItems(copy);
                                                    }}
                                                    className="h-10 text-xs font-bold font-mono border-amber-500/30 focus:border-amber-500 bg-amber-500/5 rounded-xl text-amber-600 dark:text-amber-400 placeholder:text-slate-400/60"
                                                />
                                                <span className="text-[9px] text-slate-400 block leading-tight">
                                                    Undelivered units
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {/* Discrepancy Notes field */}
                        {isIntakeDiscrepancyMode && (
                            <div className="space-y-1.5 pt-1 animate-in fade-in-50">
                                <Label className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1">
                                    <FileText className="w-3.5 h-3.5 text-amber-500" />
                                    Inspection Findings &amp; Discrepancy Report *
                                </Label>
                                <Textarea
                                    value={intakeInspectionNotes}
                                    onChange={(e) => setIntakeInspectionNotes(e.target.value)}
                                    placeholder="e.g. 2 units arrived with damaged outer housing / failed power-on test. Supplier notified on Delivery Receipt (DR) for warranty replacement."
                                    className="text-xs rounded-xl min-h-[70px] resize-none"
                                    required
                                />
                                <span className="text-[10px] text-slate-400 block">
                                    Document defect descriptions for COA compliance and supplier accountability.
                                </span>
                            </div>
                        )}

                        <div className="p-3 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-[11px] text-slate-600 dark:text-slate-300">
                            💡 <b>Asset Tag Generation:</b> Only accepted serviceable units generate official Property Numbers (<code>PROP-{new Date().getFullYear()}-RHU-...</code>) with status <b>IN_STOCKROOM</b>. Damaged units are excluded from usable inventory and flagged for vendor replacement.
                        </div>
                    </div>

                    <DialogFooter className="pt-2 border-t">
                        <Button variant="outline" onClick={() => setIsIntakeModalOpen(false)}>Cancel</Button>
                        <Button
                            onClick={handleConfirmIntake}
                            disabled={isPending}
                            className={cn(
                                "font-bold text-white shadow-md cursor-pointer",
                                isIntakeDiscrepancyMode ? "bg-amber-600 hover:bg-amber-700" : "bg-emerald-600 hover:bg-emerald-700"
                            )}
                        >
                            {isPending
                                ? "Encoding Assets..."
                                : isIntakeDiscrepancyMode
                                    ? "Confirm Intake & Record Discrepancy"
                                    : "Confirm & Encode Full Intake"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ========================================================================= */}
            {/* MODAL: VIEW INTAKE & INSPECTION REPORT */}
            {/* ========================================================================= */}
            <Dialog open={isViewPOModalOpen} onOpenChange={setIsViewPOModalOpen}>
                <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-[#161820] p-6">
                    {viewingPO && (() => {
                        const totalOrdered = viewingPO.items?.reduce((acc: number, i: any) => acc + (Number(i.quantity) || 0), 0) || 0;
                        const totalReceived = viewingPO.items?.reduce((acc: number, i: any) => acc + (Number(i.receivedQty) || 0), 0) || 0;
                        const totalDamaged = viewingPO.items?.reduce((acc: number, i: any) => acc + (Number(i.damagedQty) || 0), 0) || 0;
                        const totalMissing = viewingPO.items?.reduce((acc: number, i: any) => acc + (Number(i.missingQty) || 0), 0) || 0;
                        const acceptedValue = viewingPO.items?.reduce((acc: number, i: any) => acc + (Number(i.receivedQty) || 0) * (Number(i.unitCost) || 0), 0) || 0;
                        const damagedValue = viewingPO.items?.reduce((acc: number, i: any) => acc + (Number(i.damagedQty) || 0) * (Number(i.unitCost) || 0), 0) || 0;
                        const hasDiscrepancy = totalDamaged > 0 || totalMissing > 0 || Boolean(viewingPO.inspectionNotes);

                        return (
                            <>
                                <DialogHeader>
                                    <div className="flex items-center justify-between">
                                        <DialogTitle className="text-xl font-black italic uppercase">
                                            Delivery &amp; Inspection Report
                                        </DialogTitle>
                                        <Badge variant="outline" className="font-mono text-xs text-sky-600 border-sky-500/30">
                                            {viewingPO.poNumber}
                                        </Badge>
                                    </div>
                                    <DialogDescription className="text-xs font-bold uppercase text-slate-400">
                                        Vendor: <b>{viewingPO.vendorName}</b> {viewingPO.vendorContact ? `(${viewingPO.vendorContact})` : ""} • Order Date: {new Date(viewingPO.createdAt).toLocaleDateString()}
                                    </DialogDescription>
                                </DialogHeader>

                                <div className="space-y-4 py-2">
                                    {/* Status Banner */}
                                    {hasDiscrepancy ? (
                                        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-1.5">
                                            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold text-xs uppercase">
                                                <AlertTriangle className="w-4 h-4 shrink-0" />
                                                <span>Inspection Discrepancies Recorded — Damaged / Shortage Flagged</span>
                                            </div>
                                            {viewingPO.inspectionNotes && (
                                                <p className="text-xs text-slate-700 dark:text-slate-300 italic bg-white/60 dark:bg-black/30 p-2.5 rounded-xl border border-amber-500/20">
                                                    &ldquo;{viewingPO.inspectionNotes}&rdquo;
                                                </p>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-xs uppercase">
                                            <CheckCircle2 className="w-4 h-4" />
                                            <span>100% Serviceable Delivery — All Units Accepted into Central Stockroom</span>
                                        </div>
                                    )}

                                    {/* 3 Metric Cards */}
                                    <div className="grid grid-cols-3 gap-2.5">
                                        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-center">
                                            <span className="text-[9px] font-black uppercase text-slate-400 block">Total Ordered</span>
                                            <span className="text-lg font-mono font-black text-slate-900 dark:text-white">{totalOrdered} pcs</span>
                                            <span className="text-[10px] font-mono text-slate-500 block">₱{(viewingPO.totalAmount || 0).toLocaleString()}</span>
                                        </div>
                                        <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                                            <span className="text-[9px] font-black uppercase text-emerald-600 dark:text-emerald-400 block">Accepted (Good)</span>
                                            <span className="text-lg font-mono font-black text-emerald-600 dark:text-emerald-400">{totalReceived} pcs</span>
                                            <span className="text-[10px] font-mono text-emerald-600/70 dark:text-emerald-400/70 block">₱{acceptedValue.toLocaleString()} in Stock</span>
                                        </div>
                                        <div className={cn(
                                            "p-3 rounded-2xl border text-center",
                                            totalDamaged > 0 ? "bg-rose-500/10 border-rose-500/30" : "bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10"
                                        )}>
                                            <span className={cn(
                                                "text-[9px] font-black uppercase block",
                                                totalDamaged > 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-400"
                                            )}>
                                                Damaged (RTV)
                                            </span>
                                            <span className={cn(
                                                "text-lg font-mono font-black",
                                                totalDamaged > 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-400"
                                            )}>
                                                {totalDamaged} pcs
                                            </span>
                                            <span className="text-[10px] font-mono text-slate-400 block">
                                                {totalMissing > 0 ? `+ ${totalMissing} Missing` : (totalDamaged > 0 ? `₱${damagedValue.toLocaleString()} Rejected` : "Return to Vendor")}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Line Item Breakdown Table */}
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-slate-400">
                                            Itemized Intake Breakdown
                                        </Label>
                                        <div className="rounded-2xl border overflow-hidden">
                                            <Table>
                                                <TableHeader className="bg-slate-50 dark:bg-white/5">
                                                    <TableRow>
                                                        <TableHead className="text-[10px] font-black uppercase">Item</TableHead>
                                                        <TableHead className="text-[10px] font-black uppercase text-center">Ordered</TableHead>
                                                        <TableHead className="text-[10px] font-black uppercase text-center text-emerald-600">Accepted</TableHead>
                                                        <TableHead className="text-[10px] font-black uppercase text-center text-rose-600">Damaged</TableHead>
                                                        <TableHead className="text-[10px] font-black uppercase text-center text-amber-600">Missing</TableHead>
                                                        <TableHead className="text-[10px] font-black uppercase text-right">Unit Price</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {viewingPO.items?.map((item: any) => (
                                                        <TableRow key={item.id}>
                                                            <TableCell className="py-2.5">
                                                                <span className="font-bold text-xs text-slate-900 dark:text-white block">
                                                                    {item.equipmentName}
                                                                </span>
                                                                {item.brand && (
                                                                    <span className="text-[10px] text-slate-400 font-mono block">
                                                                        {item.brand}
                                                                    </span>
                                                                )}
                                                            </TableCell>
                                                            <TableCell className="py-2.5 text-center font-mono font-bold text-xs">
                                                                {item.quantity}
                                                            </TableCell>
                                                            <TableCell className="py-2.5 text-center font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400">
                                                                {item.receivedQty || 0}
                                                            </TableCell>
                                                            <TableCell className="py-2.5 text-center font-mono font-bold text-xs text-rose-600 dark:text-rose-400">
                                                                {item.damagedQty || 0}
                                                            </TableCell>
                                                            <TableCell className="py-2.5 text-center font-mono font-bold text-xs text-amber-600 dark:text-amber-400">
                                                                {item.missingQty || 0}
                                                            </TableCell>
                                                            <TableCell className="py-2.5 text-right font-mono font-bold text-xs">
                                                                ₱{(item.unitCost || 0).toLocaleString()}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </div>

                                    <div className="p-3 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-[11px] text-slate-600 dark:text-slate-300">
                                        💡 <b>COA Audit Reference:</b> Only accepted units ({totalReceived} pcs) have been encoded into active Central Stockroom inventory. Rejected damaged units ({totalDamaged} pcs) are flagged as Return-To-Vendor (RTV) and are excluded from usable health facility property.
                                    </div>
                                </div>

                                <DialogFooter className="pt-2 border-t flex justify-between sm:justify-between items-center">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => window.print()}
                                        className="h-9 px-3 rounded-xl font-bold text-xs"
                                    >
                                        <Printer className="w-3.5 h-3.5 mr-1.5" /> Print Summary
                                    </Button>
                                    <Button
                                        type="button"
                                        onClick={() => setIsViewPOModalOpen(false)}
                                        className="h-9 px-4 rounded-xl font-bold text-xs bg-slate-900 dark:bg-white text-white dark:text-slate-900"
                                    >
                                        Close
                                    </Button>
                                </DialogFooter>
                            </>
                        );
                    })()}
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
                            <div className="space-y-1.5 min-w-0">
                                <Label className="text-[10px] font-black uppercase text-slate-400">Destination BHS Center *</Label>
                                <Select
                                    value={soTargetFacility}
                                    onValueChange={(val) => setSoTargetFacility(val)}
                                >
                                    <SelectTrigger className="h-11 w-full min-w-0 rounded-xl text-xs font-bold truncate [&>span]:truncate">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl bg-white dark:bg-[#161820]">
                                        {(nonMainFacilities.length > 0 ? nonMainFacilities : facilityNames).map((f: string) => (
                                            <SelectItem key={f} value={f} className="text-xs font-bold">{f}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5 min-w-0">
                                <Label className="text-[10px] font-black uppercase text-slate-400">Target Room</Label>
                                <Input
                                    value={soTargetRoom}
                                    onChange={(e) => setSoTargetRoom(e.target.value)}
                                    placeholder="e.g. Treatment Room"
                                    className="h-11 rounded-xl text-xs font-bold"
                                />
                            </div>
                        </div>

                        {linkedRoNumber && (() => {
                            const matchedRo = ros.find(r => r.roNumber === linkedRoNumber);
                            if (!matchedRo) return null;

                            const itemStockAnalysis = matchedRo.items?.map((item: any) => {
                                const matchingStock = stockroomAssets.filter((a: any) =>
                                    a.equipmentName?.toLowerCase().trim() === item.equipmentName?.toLowerCase().trim()
                                );
                                const availableCount = matchingStock.reduce((sum: number, a: any) => sum + (Number(a.availableQty ?? a.quantity) || 1), 0);
                                const requestedQty = Number(item.quantity) || 1;
                                const shortage = Math.max(0, requestedQty - availableCount);

                                return {
                                    ...item,
                                    availableCount,
                                    requestedQty,
                                    shortage,
                                    isFull: availableCount >= requestedQty,
                                    isPartial: availableCount > 0 && availableCount < requestedQty,
                                    isZero: availableCount === 0
                                };
                            }) || [];

                            const totalRequested = itemStockAnalysis.reduce((sum: number, i: any) => sum + i.requestedQty, 0);
                            const totalAvailable = itemStockAnalysis.reduce((sum: number, i: any) => sum + i.availableCount, 0);
                            const totalShortage = itemStockAnalysis.reduce((sum: number, i: any) => sum + i.shortage, 0);

                            const allFull = itemStockAnalysis.length > 0 && itemStockAnalysis.every((i: any) => i.isFull);
                            const allZero = itemStockAnalysis.length > 0 && itemStockAnalysis.every((i: any) => i.isZero);
                            const isPartial = !allFull && !allZero;

                            const shortageItemsToProcure = itemStockAnalysis
                                .filter((i: any) => i.shortage > 0)
                                .map((i: any) => ({
                                    equipmentName: i.equipmentName,
                                    quantity: i.shortage,
                                    estimatedUnitCost: i.estimatedUnitCost || 0
                                }));

                            return (
                                <div className={cn(
                                    "p-3.5 rounded-2xl border text-xs space-y-2.5 transition-all",
                                    allFull
                                        ? "bg-emerald-500/10 border-emerald-500/30"
                                        : isPartial
                                            ? "bg-amber-500/10 border-amber-500/30"
                                            : "bg-rose-500/10 border-rose-500/30"
                                )}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5 font-black text-xs">
                                            {allFull ? (
                                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                            ) : isPartial ? (
                                                <AlertTriangle className="w-4 h-4 text-amber-500" />
                                            ) : (
                                                <XCircle className="w-4 h-4 text-rose-500" />
                                            )}
                                            <span>Fulfilling RO: {matchedRo.roNumber}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {allFull ? (
                                                <Badge className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-black text-[10px] uppercase">
                                                    ✓ Full Stock in Main RHU
                                                </Badge>
                                            ) : isPartial ? (
                                                <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30 font-black text-[10px] uppercase">
                                                    ⚠️ Stock Not Enough ({totalAvailable}/{totalRequested})
                                                </Badge>
                                            ) : (
                                                <Badge className="bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/30 font-black text-[10px] uppercase">
                                                    ❌ No Stock in Main RHU
                                                </Badge>
                                            )}
                                        </div>
                                    </div>

                                    {/* Detailed breakdown per item */}
                                    <div className="space-y-1.5 pt-1 border-t border-slate-200/60 dark:border-white/5">
                                        {itemStockAnalysis.map((item: any, idx: number) => (
                                            <div key={idx} className="flex items-center justify-between text-[11px]">
                                                <span className="font-semibold text-slate-700 dark:text-slate-200">
                                                    {item.equipmentName}: Requested <b>{item.requestedQty} pcs</b>
                                                </span>
                                                <div className="flex items-center gap-2 font-mono">
                                                    {item.isFull ? (
                                                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                                            {item.availableCount} in Stockroom (Ready)
                                                        </span>
                                                    ) : item.isPartial ? (
                                                        <span className="text-amber-600 dark:text-amber-400 font-bold">
                                                            Only {item.availableCount} in Stockroom (Short of {item.shortage} pcs)
                                                        </span>
                                                    ) : (
                                                        <span className="text-rose-600 dark:text-rose-400 font-bold">
                                                            0 in Stockroom (Out of Stock)
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Action button if there is shortage */}
                                    {(isPartial || allZero) && (
                                        <div className="pt-2 border-t border-slate-200/60 dark:border-white/5 flex items-center justify-between gap-3 text-[11px]">
                                            <span className="text-slate-600 dark:text-slate-400 leading-tight">
                                                {isPartial
                                                    ? `Dispatch the ${totalAvailable} available units now, or procure the missing ${totalShortage} units.`
                                                    : `Cannot dispatch 0 units. Procure ${totalRequested} units from vendor.`}
                                            </span>
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                onClick={() => {
                                                    setIsSOModalOpen(false);
                                                    handleProcureFromRO(matchedRo, isPartial ? shortageItemsToProcure : undefined);
                                                }}
                                                className={cn(
                                                    "h-7 px-2.5 text-[10px] font-bold rounded-xl cursor-pointer shrink-0 shadow-xs",
                                                    isPartial
                                                        ? "border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10"
                                                        : "border-rose-500/40 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10"
                                                )}
                                            >
                                                <ShoppingCart className="w-3 h-3 mr-1" />
                                                {isPartial ? `Procure Shortage (${totalShortage} pcs) via PO` : `Create PO for ${totalRequested} pcs`}
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            );
                        })()}

                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-400">
                                Select Assets from Central Stockroom ({stockroomAssets.length} Available) *
                            </Label>
                            <div className="max-h-56 overflow-y-auto space-y-1.5 p-2 rounded-xl bg-slate-50 dark:bg-white/5 border">
                                {stockroomAssets.length === 0 ? (
                                    <div className="py-6 px-4 text-center space-y-3">
                                        <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 mx-auto">
                                            <AlertTriangle className="w-5 h-5" />
                                        </div>
                                        <div className="space-y-1">
                                            <h4 className="text-xs font-black uppercase text-slate-800 dark:text-slate-200">
                                                No Stock Available in Central Stockroom
                                            </h4>
                                            <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                                                {linkedRoNumber
                                                    ? `Requisition ${linkedRoNumber} cannot be dispatched because the Central Stockroom has 0 available units. Generate a Purchase Order (PO) to procure this equipment.`
                                                    : "Central Stockroom has 0 available items. Create a Purchase Order or register newly acquired units."
                                                }
                                            </p>
                                        </div>
                                        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                                            {linkedRoNumber ? (
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    onClick={() => {
                                                        const matchedRo = ros.find(r => r.roNumber === linkedRoNumber);
                                                        setIsSOModalOpen(false);
                                                        if (matchedRo) {
                                                            handleProcureFromRO(matchedRo);
                                                        } else {
                                                            setIsPOModalOpen(true);
                                                        }
                                                    }}
                                                    className="h-8 px-3 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-xs cursor-pointer"
                                                >
                                                    <ShoppingCart className="w-3.5 h-3.5 mr-1.5" />
                                                    Procure via Purchase Order (PO)
                                                </Button>
                                            ) : (
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    onClick={() => {
                                                        setIsSOModalOpen(false);
                                                        setIsPOModalOpen(true);
                                                    }}
                                                    className="h-8 px-3 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-xs cursor-pointer"
                                                >
                                                    <ShoppingCart className="w-3.5 h-3.5 mr-1.5" />
                                                    Create Purchase Order
                                                </Button>
                                            )}
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                onClick={() => {
                                                    setIsSOModalOpen(false);
                                                    setIsAssetModalOpen(true);
                                                }}
                                                className="h-8 px-3 text-xs font-bold rounded-xl cursor-pointer"
                                            >
                                                <Plus className="w-3.5 h-3.5 mr-1.5" />
                                                Register Asset Directly
                                            </Button>
                                        </div>
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
                                                        <span className="font-semibold">{asset.equipmentName}</span>
                                                        <span className="text-[10px] text-slate-400 ml-1.5 font-mono">({asset.assetTagNo})</span>
                                                        <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 ml-1.5 font-mono">
                                                            ({asset.availableQty ?? asset.quantity} pcs)
                                                        </span>
                                                        {asset.poReferenceNo && (
                                                            <span className="text-[9px] text-slate-400 ml-1 font-mono">[{asset.poReferenceNo}]</span>
                                                        )}
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
                <DialogContent className="sm:max-w-[480px] rounded-3xl bg-white dark:bg-[#161820] p-6 shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black italic uppercase">BHS Receiving Inspection</DialogTitle>
                        <DialogDescription className="text-xs font-bold uppercase text-slate-400">
                            Verify shipment package for {activeSO?.soNumber?.startsWith("SO-") ? activeSO.soNumber : `SO-${activeSO?.soNumber}`}.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase text-slate-400">Receiving Nurse / Midwife Name *</Label>
                            <Input
                                value={receivingBy}
                                onChange={(e) => setReceivingBy(e.target.value)}
                                placeholder="e.g. Maria Dela Cruz, RM"
                                autoComplete="off"
                                className="h-11 rounded-xl text-xs font-bold"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-2.5">
                            <button
                                type="button"
                                onClick={() => setIsFullAcceptance(true)}
                                className={cn(
                                    "p-3 rounded-2xl border text-center font-bold text-xs transition-all cursor-pointer flex flex-col items-center justify-center gap-1",
                                    isFullAcceptance
                                        ? "bg-emerald-500/15 border-emerald-500 text-emerald-600 dark:text-emerald-400 shadow-sm"
                                        : "bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                )}
                            >
                                <CheckCircle2 className="w-5 h-5" />
                                <span>100% Match (Accept Full)</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setIsFullAcceptance(false)}
                                className={cn(
                                    "p-3 rounded-2xl border text-center font-bold text-xs transition-all cursor-pointer flex flex-col items-center justify-center gap-1",
                                    !isFullAcceptance
                                        ? "bg-rose-500/15 border-rose-500 text-rose-600 dark:text-rose-400 shadow-sm"
                                        : "bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                )}
                            >
                                <AlertTriangle className="w-5 h-5" />
                                <span>Discrepancy / Return</span>
                            </button>
                        </div>

                        {!isFullAcceptance && (
                            <div className="space-y-3 p-3.5 rounded-2xl bg-rose-50/40 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-900/40 text-xs animate-in fade-in duration-150">
                                <div className="grid grid-cols-3 gap-2">
                                    <div>
                                        <Label className="text-[9px] font-black uppercase text-slate-400">Actual Received</Label>
                                        <Input
                                            type="number"
                                            min={0}
                                            value={actualReceivedCount}
                                            placeholder={String(activeSO?.items?.length || 1)}
                                            onChange={(e) => setActualReceivedCount(e.target.value === "" ? "" : Number(e.target.value))}
                                            className="h-9 text-xs font-bold"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-[9px] font-black uppercase text-slate-400">Missing Items</Label>
                                        <Input
                                            type="number"
                                            min={0}
                                            value={missingCount}
                                            placeholder="0"
                                            onChange={(e) => setMissingCount(e.target.value === "" ? "" : Number(e.target.value))}
                                            className="h-9 text-xs font-bold"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-[9px] font-black uppercase text-slate-400">Defective</Label>
                                        <Input
                                            type="number"
                                            min={0}
                                            value={defectiveCount}
                                            placeholder="0"
                                            onChange={(e) => setDefectiveCount(e.target.value === "" ? "" : Number(e.target.value))}
                                            className="h-9 text-xs font-bold"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <Label className="text-[9px] font-black uppercase text-slate-400">Discrepancy / Damage Narrative</Label>
                                    <Textarea
                                        value={receivingDiscrepancyNotes}
                                        onChange={(e) => setReceivingDiscrepancyNotes(e.target.value)}
                                        placeholder="Describe missing items, physical carton damage, broken gauge, etc."
                                        className="h-16 text-xs rounded-xl resize-none"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="pt-2">
                        <Button variant="outline" onClick={() => setIsReceiveModalOpen(false)}>Cancel</Button>
                        <Button
                            onClick={handleConfirmReceiving}
                            disabled={isPending || !receivingBy.trim()}
                            className={cn(
                                "font-bold text-xs text-white cursor-pointer",
                                isFullAcceptance ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
                            )}
                        >
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
                            <div className="space-y-1.5 min-w-0">
                                <Label className="text-[10px] font-black uppercase text-slate-400">Requesting Facility *</Label>
                                {matchedCenter ? (
                                    <div className="h-11 px-3 rounded-xl text-xs font-bold bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-between text-slate-700 dark:text-slate-300 min-w-0">
                                        <div className="flex items-center gap-1.5 truncate min-w-0">
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
                                        <SelectTrigger className="h-11 w-full min-w-0 rounded-xl text-xs font-bold truncate [&>span]:truncate">
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

                            <div className="space-y-1.5 min-w-0">
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
                                    <SelectTrigger className="h-11 w-full min-w-0 rounded-xl text-xs font-bold truncate [&>span]:truncate">
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
                                    onClick={() => setRoItems(prev => [...prev, { equipmentName: "", quantity: "", estimatedUnitCost: 0, urgency: "NORMAL" }])}
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
                                                            copy[idx].quantity = e.target.value === "" ? "" : Number(e.target.value);
                                                            setRoItems(copy);
                                                        }}
                                                        placeholder="e.g. 1"
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
                                        refreshEquipmentData(true);
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

            {/* ========================================================================= */}
            {/* MODAL: PURCHASE ORDER INTAKE HISTORY AUDIT DIALOG */}
            {/* ========================================================================= */}
            <Dialog open={isPOHistoryModalOpen} onOpenChange={setIsPOHistoryModalOpen}>
                <DialogContent className="sm:max-w-[750px] max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-[#161820] p-6">
                    {poHistoryGroup && (
                        <>
                            <DialogHeader>
                                <div className="flex items-center justify-between">
                                    <DialogTitle className="text-xl font-black italic uppercase flex items-center gap-2">
                                        <History className="w-5 h-5 text-sky-500" />
                                        Purchase Order Intake History
                                    </DialogTitle>
                                    <Badge variant="outline" className="font-mono text-xs text-sky-600 border-sky-500/30">
                                        {poHistoryGroup.batches.length} {poHistoryGroup.batches.length === 1 ? "Batch" : "Batches"}
                                    </Badge>
                                </div>
                                <DialogDescription className="text-xs font-bold uppercase text-slate-400">
                                    Equipment: <b className="text-slate-700 dark:text-slate-200">{poHistoryGroup.equipmentName}</b> • Location: {poHistoryGroup.currentFacility} ({poHistoryGroup.assignedRoom})
                                </DialogDescription>
                            </DialogHeader>

                            {/* Summary Metrics */}
                            <div className="grid grid-cols-3 gap-3 my-2">
                                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border text-center">
                                    <span className="text-[10px] font-black uppercase text-slate-400 block">Total Current Stock</span>
                                    <span className="text-xl font-black text-emerald-600">{poHistoryGroup.totalAvailableQty} pcs</span>
                                </div>
                                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border text-center">
                                    <span className="text-[10px] font-black uppercase text-slate-400 block">Total Batches</span>
                                    <span className="text-xl font-black text-sky-600">{poHistoryGroup.batches.length}</span>
                                </div>
                                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border text-center">
                                    <span className="text-[10px] font-black uppercase text-slate-400 block">Total Stock Value</span>
                                    <span className="text-xl font-black text-slate-900 dark:text-white">₱{poHistoryGroup.totalStockValue.toLocaleString()}</span>
                                </div>
                            </div>

                            {/* Batches Detailed List */}
                            <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
                                {poHistoryGroup.batches.map((batch: any, idx: number) => {
                                    const bAvail = Number(batch.availableQty ?? batch.quantity) || 1;
                                    const bCost = Number(batch.unitCost) || 0;
                                    const bTotal = bAvail * bCost;

                                    return (
                                        <div key={batch.id} className="p-3.5 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] space-y-2">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Badge className="bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20 font-mono font-bold text-xs">
                                                        {batch.poReferenceNo || `Intake Batch #${poHistoryGroup.batches.length - idx}`}
                                                    </Badge>
                                                    <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                                                        {batch.assetTagNo}
                                                    </span>
                                                </div>
                                                <span className="text-xs font-mono text-slate-400">
                                                    {batch.createdAt ? new Date(batch.createdAt).toLocaleDateString() : ""}
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1 border-t border-slate-200/60 dark:border-white/5">
                                                <div>
                                                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Quantity</span>
                                                    <span className="font-mono font-bold text-emerald-600">{bAvail} pcs</span>
                                                </div>
                                                <div>
                                                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Unit Cost</span>
                                                    <span className="font-mono font-semibold">₱{bCost.toLocaleString()}</span>
                                                </div>
                                                <div>
                                                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Batch Total</span>
                                                    <span className="font-mono font-bold">₱{bTotal.toLocaleString()}</span>
                                                </div>
                                                <div>
                                                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Document Ref</span>
                                                    <span className="font-mono text-[11px] text-slate-600 dark:text-slate-300">{batch.documentReference || "—"}</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                                                <span>Brand: <b>{batch.brand || "N/A"}</b> • Serial: <span className="font-mono">{batch.serialNo || "NONE"}</span></span>
                                                <div className="flex items-center gap-1.5">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => {
                                                            setIsPOHistoryModalOpen(false);
                                                            setActiveAsset(batch);
                                                            setIsQRModalOpen(true);
                                                        }}
                                                        className="h-6 text-[10px] font-bold text-sky-600 px-2 cursor-pointer"
                                                    >
                                                        <QrCode className="w-3 h-3 mr-1" /> View Tag &amp; QR
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <DialogFooter className="pt-2 border-t">
                                <Button variant="outline" onClick={() => setIsPOHistoryModalOpen(false)}>Close</Button>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
