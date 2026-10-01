"use client";

import React, { useState, useMemo, useTransition } from "react";
import {
    Bed,
    Search,
    Calendar,
    Building2,
    Plus,
    Eye,
    UserCheck,
    UserMinus,
    AlertCircle,
    X,
    Layers,
    Lock,
    ChevronRight,
    ChevronLeft
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { RHUBedData, FacilityType, BedStatus } from "./actions";
import {
    getRHUBeds,
    createRHUBed,
    admitPatientToBed,
    dischargePatientFromBed,
    updateBedStatus,
    initializeFacilityBeds
} from "./actions";

interface BedMonitoringClientProps {
    initialBeds: RHUBedData[];
    initialCenters: any[];
    currentUser?: any;
    matchedCenter?: any;
}

export default function BedMonitoringClient({
    initialBeds,
    initialCenters,
    currentUser: _currentUser,
    matchedCenter
}: BedMonitoringClientProps) {
    const [beds, setBeds] = useState<RHUBedData[]>(initialBeds);
    const [selectedCenterId, setSelectedCenterId] = useState<string>(matchedCenter ? matchedCenter.id : "ALL");
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    // Filters
    const [departmentFilter, setDepartmentFilter] = useState("ALL");
    const [bedTypeFilter, setBedTypeFilter] = useState("ALL");
    const [searchQuery, setSearchQuery] = useState("");
    const [dateFilter, setDateFilter] = useState("2026-06-25");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    // Modals
    const [selectedBed, setSelectedBed] = useState<RHUBedData | null>(null);
    const [isAddBedModalOpen, setIsAddBedModalOpen] = useState(false);
    const [isAdmitModalOpen, setIsAdmitModalOpen] = useState(false);
    const [isInitModalOpen, setIsInitModalOpen] = useState(false);
    const [isPending, startTransition] = useTransition();

    // Form states for Add Bed
    const [addBedFacilityType, setAddBedFacilityType] = useState<FacilityType>(matchedCenter ? "HEALTH_CENTER" : "RHU");
    const [addBedCenterId, setAddBedCenterId] = useState<string>(matchedCenter ? matchedCenter.id : "");
    const [newBedNumber, setNewBedNumber] = useState("");
    const [newBedType, setNewBedType] = useState("Medical");
    const [customBedType, setCustomBedType] = useState("");
    const [newBedDepartment, setNewBedDepartment] = useState("Internal Medicine");
    const [customDepartment, setCustomDepartment] = useState("");
    const [newBedNotes, setNewBedNotes] = useState("");

    // Form states for Admit Patient
    const [admitPatientName, setAdmitPatientName] = useState("");
    const [admitCaseDetails, setAdmitCaseDetails] = useState("");
    const [admitAge, setAdmitAge] = useState<number | "">("");
    const [admitGender, setAdmitGender] = useState("Male");
    const [admitContact, setAdmitContact] = useState("");
    const [admitPhysician, setAdmitPhysician] = useState("");
    const [admitNotes, setAdmitNotes] = useState("");

    // Form states for Discharge
    const [dischargeNotes, setDischargeNotes] = useState("");

    // Initialize facility form
    const [initFacilityType, setInitFacilityType] = useState<FacilityType>(matchedCenter ? "HEALTH_CENTER" : "RHU");
    const [initCenterId, setInitCenterId] = useState<string>(matchedCenter ? matchedCenter.id : "");
    const [initCount, setInitCount] = useState(50);
    const [initPrefix, setInitPrefix] = useState("RHU");

    const handleOpenAddBed = () => {
        if (matchedCenter) {
            setAddBedFacilityType("HEALTH_CENTER");
            setAddBedCenterId(matchedCenter.id);
            const cleanName = matchedCenter.name?.replace(/[^a-zA-Z]/g, "") || "BHC";
            const abbr = cleanName.slice(0, 5).toUpperCase();
            setNewBedNumber(`${abbr}-`);
            setIsAddBedModalOpen(true);
            return;
        }

        const defaultFac = selectedCenterId === "RHU" ? "RHU" : (selectedCenterId !== "ALL" ? "HEALTH_CENTER" : "RHU");
        setAddBedFacilityType(defaultFac);
        const centerId = selectedCenterId !== "ALL" && selectedCenterId !== "RHU" ? selectedCenterId : (initialCenters[0]?.id || "");
        setAddBedCenterId(centerId);
        if (defaultFac === "HEALTH_CENTER") {
            const centerObj = initialCenters.find(c => c.id === centerId);
            const cleanName = centerObj?.name?.replace(/[^a-zA-Z]/g, "") || "BHC";
            setNewBedNumber(`${cleanName.slice(0, 5).toUpperCase()}-`);
        } else {
            setNewBedNumber("RHU-");
        }
        setIsAddBedModalOpen(true);
    };

    const handleOpenInit = () => {
        if (matchedCenter) {
            setInitFacilityType("HEALTH_CENTER");
            setInitCenterId(matchedCenter.id);
            const cleanName = matchedCenter.name?.replace(/[^a-zA-Z]/g, "") || "BHC";
            setInitPrefix(cleanName.slice(0, 5).toUpperCase());
            setIsInitModalOpen(true);
            return;
        }

        const defaultFac = selectedCenterId === "RHU" ? "RHU" : (selectedCenterId !== "ALL" ? "HEALTH_CENTER" : "RHU");
        setInitFacilityType(defaultFac);
        const centerId = selectedCenterId !== "ALL" && selectedCenterId !== "RHU" ? selectedCenterId : (initialCenters[0]?.id || "");
        setInitCenterId(centerId);
        if (defaultFac === "HEALTH_CENTER") {
            const centerObj = initialCenters.find(c => c.id === centerId);
            const cleanName = centerObj?.name?.replace(/[^a-zA-Z]/g, "") || "BHC";
            setInitPrefix(cleanName.slice(0, 5).toUpperCase());
        } else {
            setInitPrefix("RHU");
        }
        setIsInitModalOpen(true);
    };

    // Refresh data
    const refreshBeds = async () => {
        startTransition(async () => {
            const res = await getRHUBeds({
                facilityType: "ALL"
            });
            if (res.success && res.data) {
                setBeds(res.data);
            }
        });
    };

    // Filter beds based on active filters and search
    const filteredBeds = useMemo(() => {
        return beds.filter((b) => {
            // Facility / Center filter
            if (selectedCenterId !== "ALL") {
                if (selectedCenterId === "RHU") {
                    if (b.facilityType !== "RHU") return false;
                } else if (b.healthCenterId !== selectedCenterId) {
                    return false;
                }
            }

            // Department filter
            if (departmentFilter !== "ALL") {
                const standardDepts = [
                    "internal medicine",
                    "surgery",
                    "pediatrics",
                    "ob-gyn",
                    "emergency",
                    "infectious disease"
                ];
                if (departmentFilter === "Others") {
                    if (standardDepts.includes(b.department.toLowerCase())) {
                        return false;
                    }
                } else if (b.department.toLowerCase() !== departmentFilter.toLowerCase()) {
                    return false;
                }
            }

            // Bed Type filter
            if (bedTypeFilter !== "ALL") {
                const standardTypes = [
                    "medical",
                    "surgical",
                    "pediatric",
                    "isolation",
                    "er",
                    "obstetrics"
                ];
                if (bedTypeFilter === "Others") {
                    if (standardTypes.includes(b.bedType.toLowerCase())) {
                        return false;
                    }
                } else if (b.bedType.toLowerCase() !== bedTypeFilter.toLowerCase()) {
                    return false;
                }
            }

            // Search query
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const num = b.bedNumber.toLowerCase();
                const pat = (b.patientName || "").toLowerCase();
                const cs = (b.caseDetails || "").toLowerCase();
                const dept = b.department.toLowerCase();
                if (!num.includes(q) && !pat.includes(q) && !cs.includes(q) && !dept.includes(q)) {
                    return false;
                }
            }

            return true;
        });
    }, [beds, selectedCenterId, departmentFilter, bedTypeFilter, searchQuery]);

    // Pagination
    const totalPages = Math.max(1, Math.ceil(filteredBeds.length / itemsPerPage));
    const paginatedBeds = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredBeds.slice(start, start + itemsPerPage);
    }, [filteredBeds, currentPage]);

    // Active facility beds (for overview stats and right sidebar)
    const facilityBeds = useMemo(() => {
        return beds.filter((b) => {
            if (selectedCenterId !== "ALL") {
                if (selectedCenterId === "RHU") return b.facilityType === "RHU";
                return b.healthCenterId === selectedCenterId;
            }
            return true;
        });
    }, [beds, selectedCenterId]);

    // Statistics
    const stats = useMemo(() => {
        const total = facilityBeds.length;
        const occupied = facilityBeds.filter((b) => b.status === "OCCUPIED").length;
        const available = facilityBeds.filter((b) => b.status === "AVAILABLE").length;
        const outOfService = facilityBeds.filter((b) => b.status === "OUT_OF_SERVICE").length;

        // Department breakdown
        const depts: Record<string, { total: number; occupied: number }> = {
            "Internal Medicine": { total: 0, occupied: 0 },
            "Surgery": { total: 0, occupied: 0 },
            "Pediatrics": { total: 0, occupied: 0 },
            "OB-GYN": { total: 0, occupied: 0 },
            "Emergency": { total: 0, occupied: 0 },
            "Infectious Disease": { total: 0, occupied: 0 },
            "Others": { total: 0, occupied: 0 },
        };

        const standardDepts = [
            "Internal Medicine",
            "Surgery",
            "Pediatrics",
            "OB-GYN",
            "Emergency",
            "Infectious Disease"
        ];

        for (const b of facilityBeds) {
            const matchedStd = standardDepts.find(
                (s) => s.toLowerCase() === (b.department || "").trim().toLowerCase()
            );
            const dName = matchedStd || "Others";
            if (!depts[dName]) {
                depts[dName] = { total: 0, occupied: 0 };
            }
            depts[dName].total++;
            if (b.status === "OCCUPIED") {
                depts[dName].occupied++;
            }
        }

        return {
            total,
            occupied,
            available,
            outOfService,
            departments: depts
        };
    }, [facilityBeds]);

    // Donut chart calculations
    const donutOccupiedRatio = stats.total > 0 ? (stats.occupied / stats.total) : 0;
    const donutAvailableRatio = stats.total > 0 ? (stats.available / stats.total) : 0;
    const circumference = 2 * Math.PI * 45; // radius 45 -> 282.74
    const strokeDashOccupied = donutOccupiedRatio * circumference;
    const strokeDashAvailable = donutAvailableRatio * circumference;
    const strokeDashOffsetAvailable = -strokeDashOccupied;

    // Handlers
    const handleCreateBed = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newBedNumber.trim()) {
            toast.error("Please enter a bed number (e.g. RHU-001)");
            return;
        }

        const finalDepartment = newBedDepartment === "Others"
            ? customDepartment.trim()
            : newBedDepartment;

        if (newBedDepartment === "Others" && !finalDepartment) {
            toast.error("Please specify the department name");
            return;
        }

        const finalBedType = newBedType === "Others"
            ? customBedType.trim()
            : newBedType;

        if (newBedType === "Others" && !finalBedType) {
            toast.error("Please specify the bed type");
            return;
        }

        let targetFacilityType = matchedCenter ? "HEALTH_CENTER" : addBedFacilityType;
        let targetCenterId = matchedCenter 
            ? matchedCenter.id 
            : (targetFacilityType === "HEALTH_CENTER" ? (addBedCenterId || null) : null);
        let targetCenterObj = initialCenters.find((c) => c.id === targetCenterId) || matchedCenter;
        let targetCenterName = matchedCenter 
            ? matchedCenter.name 
            : (targetFacilityType === "RHU" ? "RHU Mapandan" : (targetCenterObj?.name || "Health Center"));

        // Intelligent auto-assignment: If user added a bed under RHU Main, but the bed name explicitly specifies a health center (e.g., "LALAS" or center name)
        if (!matchedCenter && targetFacilityType === "RHU") {
            const lowerBed = newBedNumber.toLowerCase();
            const matchedHealthCenter = initialCenters.find((c) => {
                const cName = c.name.toLowerCase();
                const cCode = (c.code || "").toLowerCase();
                return (
                    (cName.includes("lalas") && lowerBed.includes("lalas")) ||
                    (cCode && lowerBed.includes(cCode)) ||
                    lowerBed.includes(cName)
                );
            });

            if (matchedHealthCenter) {
                targetFacilityType = "HEALTH_CENTER";
                targetCenterId = matchedHealthCenter.id;
                targetCenterObj = matchedHealthCenter;
                targetCenterName = matchedHealthCenter.name;
            }
        }

        startTransition(async () => {
            const res = await createRHUBed({
                bedNumber: newBedNumber.trim().toUpperCase(),
                bedType: finalBedType,
                department: finalDepartment,
                facilityType: targetFacilityType,
                healthCenterId: targetCenterId,
                healthCenterName: targetCenterName,
                notes: newBedNotes.trim() || null
            });

            if (res.success) {
                toast.success(`Bed ${newBedNumber} added to ${targetCenterName}`);
                setIsAddBedModalOpen(false);
                setNewBedNumber("");
                setNewBedNotes("");
                setCustomDepartment("");
                setCustomBedType("");
                setNewBedDepartment("Internal Medicine");
                setNewBedType("Medical");

                // Switch view to where the bed was added so user sees it right away!
                if (targetFacilityType === "HEALTH_CENTER") {
                    if (targetCenterId) {
                        setSelectedCenterId(targetCenterId);
                    }
                } else {
                    setSelectedCenterId("RHU");
                }

                await refreshBeds();
            } else {
                toast.error(res.error || "Failed to create bed");
            }
        });
    };

    const handleAdmitPatient = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedBed) return;
        if (!admitPatientName.trim()) {
            toast.error("Patient name is required");
            return;
        }
        if (!admitCaseDetails.trim()) {
            toast.error("Case / Diagnosis details are required");
            return;
        }

        startTransition(async () => {
            const res = await admitPatientToBed({
                bedId: selectedBed.id,
                patientName: admitPatientName.trim(),
                caseDetails: admitCaseDetails.trim(),
                patientAge: admitAge === "" ? null : Number(admitAge),
                patientGender: admitGender,
                patientContact: admitContact.trim() || null,
                attendingPhysician: admitPhysician.trim() || null,
                admissionDate: new Date(),
                notes: admitNotes.trim() || null
            });

            if (res.success) {
                toast.success(`Patient admitted to ${selectedBed.bedNumber}`);
                setIsAdmitModalOpen(false);
                setSelectedBed(null);
                setAdmitPatientName("");
                setAdmitCaseDetails("");
                setAdmitAge("");
                setAdmitContact("");
                setAdmitPhysician("");
                setAdmitNotes("");
                await refreshBeds();
            } else {
                toast.error(res.error || "Failed to admit patient");
            }
        });
    };

    const handleDischargePatient = async () => {
        if (!selectedBed) return;

        startTransition(async () => {
            const res = await dischargePatientFromBed(selectedBed.id, dischargeNotes.trim() || undefined);
            if (res.success) {
                toast.success(`Patient discharged from ${selectedBed.bedNumber}. Bed is now Available.`);
                setSelectedBed(null);
                setDischargeNotes("");
                await refreshBeds();
            } else {
                toast.error(res.error || "Failed to discharge patient");
            }
        });
    };

    const handleStatusChange = async (newStatus: BedStatus) => {
        if (!selectedBed) return;

        startTransition(async () => {
            const res = await updateBedStatus(selectedBed.id, newStatus);
            if (res.success) {
                toast.success(`Bed ${selectedBed.bedNumber} status updated to ${newStatus}`);
                setSelectedBed((prev) => prev ? { ...prev, status: newStatus } : null);
                await refreshBeds();
            } else {
                toast.error(res.error || "Failed to update bed status");
            }
        });
    };

    const handleInitializeFacility = async () => {
        const targetFacilityType = matchedCenter ? "HEALTH_CENTER" : initFacilityType;
        const targetCenterId = matchedCenter 
            ? matchedCenter.id 
            : (targetFacilityType === "HEALTH_CENTER" ? (initCenterId || null) : null);
        const centerObj = initialCenters.find((c) => c.id === targetCenterId) || matchedCenter;
        const targetCenterName = matchedCenter 
            ? matchedCenter.name 
            : (targetFacilityType === "RHU" ? "RHU Mapandan" : (centerObj?.name || "Health Center"));

        startTransition(async () => {
            const res = await initializeFacilityBeds({
                facilityType: targetFacilityType,
                healthCenterId: targetCenterId,
                healthCenterName: targetCenterName,
                bedCount: initCount,
                prefix: initPrefix.trim() || (targetFacilityType === "RHU" ? "RHU" : "BHC")
            });

            if (res.success) {
                toast.success(`Initialized ${res.count} beds for ${targetCenterName}`);
                setIsInitModalOpen(false);
                await refreshBeds();
            } else {
                toast.error(res.error || "Failed to initialize beds");
            }
        });
    };

    return (
        <div className="p-2 md:p-4 max-w-full mx-auto space-y-6 pb-20">
            {/* 2-Column Responsive Layout */}
            <div className="flex flex-col xl:flex-row items-start gap-6">
                {/* Main Content Area */}
                <div className="flex-1 min-w-0 w-full space-y-6">
                    {/* Header Banner */}
                    <div className="p-6 sm:p-7 rounded-3xl bg-[#091122] border border-[#162340] shadow-xl text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-4 min-w-0">
                            <div className="w-12 h-12 rounded-2xl bg-[#0f1b34] border border-blue-500/25 flex items-center justify-center text-slate-100 shrink-0 shadow-inner mt-0.5">
                                <Bed className="w-6 h-6 text-white" />
                            </div>
                            <div className="space-y-1 min-w-0">
                                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                                    RHU – Hospital Bed Monitoring
                                </h1>
                                <p className="text-xs sm:text-sm text-slate-400 font-medium leading-relaxed">
                                    Monitor real-time bed availability and occupancy across RHU and all health centers in Mapandan. Ensure efficient patient flow and better resource management.
                                </p>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                            <Button
                                onClick={handleOpenAddBed}
                                size="sm"
                                className="h-9 px-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold gap-1.5 shadow-sm shadow-blue-600/30 cursor-pointer"
                            >
                                <Plus className="w-4 h-4" />
                                <span>Add Bed</span>
                            </Button>
                        </div>
                    </div>

                    {/* Filter and Search Bar */}
                    <Card className="rounded-2xl border-slate-200 dark:border-[#162340] bg-white dark:bg-[#091122] shadow-sm dark:shadow-xl p-3.5 sm:p-4">
                        <CardContent className="p-0 flex flex-wrap items-end gap-3">
                            {/* Date Field */}
                            <div className="w-full sm:w-[145px] space-y-1">
                                <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Date</Label>
                                <div className="relative">
                                    <Calendar className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    <Input
                                        type="date"
                                        value={dateFilter}
                                        onChange={(e) => setDateFilter(e.target.value)}
                                        className="pl-8 h-9 text-xs rounded-xl bg-slate-50 dark:bg-[#0d1629] border-slate-200 dark:border-[#1c2c4d] text-slate-900 dark:text-white"
                                    />
                                </div>
                            </div>

                            {/* Department Filter */}
                            <div className="w-full sm:w-[155px] space-y-1">
                                <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Department</Label>
                                <Select
                                    value={departmentFilter}
                                    onValueChange={(val) => {
                                        setDepartmentFilter(val);
                                        setCurrentPage(1);
                                    }}
                                >
                                    <SelectTrigger className="h-9 text-xs rounded-xl bg-slate-50 dark:bg-[#0d1629] border-slate-200 dark:border-[#1c2c4d]">
                                        <SelectValue placeholder="All Departments" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL">All Departments</SelectItem>
                                        <SelectItem value="Internal Medicine">Internal Medicine</SelectItem>
                                        <SelectItem value="Surgery">Surgery</SelectItem>
                                        <SelectItem value="Pediatrics">Pediatrics</SelectItem>
                                        <SelectItem value="OB-GYN">OB-GYN</SelectItem>
                                        <SelectItem value="Emergency">Emergency</SelectItem>
                                        <SelectItem value="Infectious Disease">Infectious Disease</SelectItem>
                                        <SelectItem value="Others">Others</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Bed Type Filter */}
                            <div className="w-full sm:w-[145px] space-y-1">
                                <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Bed Type</Label>
                                <Select
                                    value={bedTypeFilter}
                                    onValueChange={(val) => {
                                        setBedTypeFilter(val);
                                        setCurrentPage(1);
                                    }}
                                >
                                    <SelectTrigger className="h-9 text-xs rounded-xl bg-slate-50 dark:bg-[#0d1629] border-slate-200 dark:border-[#1c2c4d]">
                                        <SelectValue placeholder="All Bed Types" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL">All Bed Types</SelectItem>
                                        <SelectItem value="Medical">Medical</SelectItem>
                                        <SelectItem value="Surgical">Surgical</SelectItem>
                                        <SelectItem value="Pediatric">Pediatric</SelectItem>
                                        <SelectItem value="Isolation">Isolation</SelectItem>
                                        <SelectItem value="ER">ER</SelectItem>
                                        <SelectItem value="Obstetrics">Obstetrics</SelectItem>
                                        <SelectItem value="Others">Others</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Center filter */}
                            <div className="w-full sm:w-[175px] space-y-1">
                                <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Health Center</Label>
                                <Select
                                    value={selectedCenterId}
                                    onValueChange={(val) => {
                                        setSelectedCenterId(val);
                                        setCurrentPage(1);
                                    }}
                                >
                                    <SelectTrigger className="h-9 text-xs rounded-xl bg-slate-50 dark:bg-[#0d1629] border-slate-200 dark:border-[#1c2c4d]">
                                        <SelectValue placeholder="All Facilities" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL">All Facilities</SelectItem>
                                        <SelectItem value="RHU">🏥 RHU Mapandan (Main)</SelectItem>
                                        {initialCenters.map((c) => (
                                            <SelectItem key={c.id} value={c.id}>
                                                🏢 {c.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Search Field with Icon Button */}
                            <div className="w-full sm:flex-1 min-w-[200px] space-y-1">
                                <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Search</Label>
                                <div className="flex items-center gap-1.5">
                                    <div className="relative flex-1">
                                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                        <Input
                                            placeholder="Search bed, patient..."
                                            value={searchQuery}
                                            onChange={(e) => {
                                                setSearchQuery(e.target.value);
                                                setCurrentPage(1);
                                            }}
                                            className="pl-8 pr-7 h-9 text-xs rounded-xl bg-slate-50 dark:bg-[#0d1629] border-slate-200 dark:border-[#1c2c4d] text-slate-900 dark:text-white"
                                        />
                                        {searchQuery && (
                                            <button
                                                type="button"
                                                onClick={() => setSearchQuery("")}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>

                                    <Button
                                        type="button"
                                        size="icon"
                                        onClick={() => setCurrentPage(1)}
                                        className="h-9 w-9 rounded-xl bg-[#ff0055] hover:bg-rose-600 text-white shadow-md shadow-[#ff0055]/30 cursor-pointer shrink-0"
                                        title="Search"
                                    >
                                        <Search className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Bed Overview Table Card */}
                    <div className="rounded-2xl border border-slate-200 dark:border-[#162340] bg-white dark:bg-[#091122] shadow-sm dark:shadow-xl overflow-hidden">
                        {/* Table Header Details */}
                        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-[#162340] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                                <Bed className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                                <div>
                                    <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                                        {selectedCenterId === "RHU"
                                            ? "RHU Main Facility Bed Overview"
                                            : selectedCenterId !== "ALL"
                                                ? `${initialCenters.find((c) => c.id === selectedCenterId)?.name || "Health Center"} Bed Overview`
                                                : "All Municipal Beds Overview"}
                                    </h3>
                                    <span className="text-[11px] text-slate-400">
                                        {selectedCenterId === "RHU"
                                            ? "Showing beds stationed at RHU Mapandan (Main Center)"
                                            : selectedCenterId !== "ALL"
                                                ? `Stationed at ${initialCenters.find((c) => c.id === selectedCenterId)?.name || "selected center"}`
                                                : "Showing beds across RHU Main and all Barangay Health Centers"}
                                    </span>
                                </div>
                            </div>
                            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-2 sm:gap-3 flex-wrap">
                                <span>Total Beds: <strong className="text-slate-900 dark:text-white">{stats.total}</strong></span>
                                <span className="opacity-40">|</span>
                                <span>Occupied: <strong className="text-rose-500">{stats.occupied}</strong></span>
                                <span className="opacity-40">|</span>
                                <span>Available: <strong className="text-emerald-500">{stats.available}</strong></span>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-slate-50/80 dark:bg-[#0d1629]/90 border-b border-slate-200 dark:border-[#162340]">
                                    <TableRow className="border-0">
                                        <TableHead className="font-bold text-xs text-slate-600 dark:text-slate-300 py-3.5">
                                            Bed No.
                                        </TableHead>
                                        <TableHead className="font-bold text-xs text-slate-600 dark:text-slate-300">
                                            Facility / Center
                                        </TableHead>
                                        <TableHead className="font-bold text-xs text-slate-600 dark:text-slate-300">
                                            Bed Type
                                        </TableHead>
                                        <TableHead className="font-bold text-xs text-slate-600 dark:text-slate-300">
                                            Department
                                        </TableHead>
                                        <TableHead className="font-bold text-xs text-slate-600 dark:text-slate-300">
                                            Patient Name / Case
                                        </TableHead>
                                        <TableHead className="font-bold text-xs text-slate-600 dark:text-slate-300 text-center">
                                            Status
                                        </TableHead>
                                        <TableHead className="font-bold text-xs text-slate-600 dark:text-slate-300 text-center">
                                            Actions
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody className="divide-y divide-slate-100 dark:divide-[#162340]">
                                    {paginatedBeds.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center py-12 text-slate-400">
                                                <Bed className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                                <p className="font-semibold text-sm">No beds configured or found</p>
                                                <p className="text-xs opacity-70 mt-1">
                                                    {facilityBeds.length === 0
                                                        ? `You can set up standard facility beds for ${selectedCenterId === "RHU" ? "RHU Mapandan" : (selectedCenterId !== "ALL" ? (initialCenters.find(c => c.id === selectedCenterId)?.name || "Health Center") : "your facility")} below.`
                                                        : "Try adjusting your department, type, or search filters."}
                                                </p>
                                                {facilityBeds.length === 0 && (
                                                    <Button
                                                        onClick={handleOpenInit}
                                                        size="sm"
                                                        className="mt-4 rounded-xl bg-[#ff0055] hover:bg-rose-600 text-white text-xs font-bold cursor-pointer"
                                                    >
                                                        Setup Initial Facility Beds
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        paginatedBeds.map((b) => {
                                            const isOccupied = b.status === "OCCUPIED";
                                            const isAvailable = b.status === "AVAILABLE";
                                            const isOutOfService = b.status === "OUT_OF_SERVICE";

                                            return (
                                                <TableRow
                                                    key={b.id}
                                                    className="hover:bg-slate-50/50 dark:hover:bg-[#0f1b34]/40 transition-colors"
                                                >
                                                    <TableCell className="py-3.5 font-bold text-xs text-slate-900 dark:text-white whitespace-nowrap">
                                                        <div className="flex flex-col">
                                                            <span className="tracking-wide font-extrabold text-slate-900 dark:text-white">{b.bedNumber}</span>
                                                            <span className="text-[10px] font-normal text-slate-400">
                                                                {b.facilityType === "RHU" ? "RHU Main" : (b.healthCenterName || "Health Center")}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-xs">
                                                        <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                                                            <Building2 className={cn(
                                                                "w-3.5 h-3.5 shrink-0",
                                                                b.facilityType === "RHU" ? "text-rose-500" : "text-blue-500"
                                                            )} />
                                                            <span className="truncate max-w-[150px] sm:max-w-[200px]" title={b.healthCenterName || (b.facilityType === "RHU" ? "RHU Mapandan" : "Health Center")}>
                                                                {b.healthCenterName || (b.facilityType === "RHU" ? "RHU Mapandan" : "Health Center")}
                                                            </span>
                                                        </div>
                                                        {b.notes && (
                                                            <span className="text-[10px] text-slate-400 block truncate max-w-[160px]" title={b.notes}>
                                                                {b.notes}
                                                            </span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-xs text-slate-700 dark:text-slate-300">
                                                        {b.bedType}
                                                    </TableCell>
                                                    <TableCell className="text-xs text-slate-700 dark:text-slate-300">
                                                        {b.department}
                                                    </TableCell>
                                                    <TableCell className="text-xs">
                                                        {b.patientName ? (
                                                            <div>
                                                                <span className="font-bold text-slate-900 dark:text-white block">
                                                                    {b.patientName}
                                                                </span>
                                                                {b.caseDetails && (
                                                                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                                                        ({b.caseDetails})
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className="text-slate-400 font-semibold">—</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        {isOccupied && (
                                                            <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-[#ff0055] text-white shadow-sm shadow-[#ff0055]/30">
                                                                Occupied
                                                            </span>
                                                        )}
                                                        {isAvailable && (
                                                            <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-[#00d084] text-white shadow-sm shadow-[#00d084]/30">
                                                                Available
                                                            </span>
                                                        )}
                                                        {isOutOfService && (
                                                            <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-blue-600 text-white shadow-sm shadow-blue-600/30">
                                                                Out of Service
                                                            </span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-center py-3.5">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => setSelectedBed(b)}
                                                            className="h-8 w-8 p-0 rounded-lg hover:bg-slate-100 dark:hover:bg-[#162340] text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                                                            title="View Bed Details & Patient Actions"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Pagination Bar */}
                        <div className="p-4 border-t border-slate-200 dark:border-[#162340] flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                            <div>
                                Showing {filteredBeds.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}–
                                {Math.min(currentPage * itemsPerPage, filteredBeds.length)} of {filteredBeds.length} beds
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                    className="h-8 w-8 p-0 rounded-lg"
                                >
                                    &lt;
                                </Button>
                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map((page) => (
                                    <Button
                                        key={page}
                                        size="sm"
                                        onClick={() => setCurrentPage(page)}
                                        className={cn(
                                            "h-8 w-8 p-0 rounded-lg text-xs font-bold",
                                            currentPage === page
                                                ? "bg-[#ff0055] text-white shadow-md shadow-[#ff0055]/30 hover:bg-rose-600"
                                                : "bg-slate-100 dark:bg-[#0d1629] text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#162340]"
                                        )}
                                    >
                                        {page}
                                    </Button>
                                ))}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={currentPage === totalPages}
                                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                    className="h-8 w-8 p-0 rounded-lg"
                                >
                                    &gt;
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Bed Summary, Availability by Dept, Notice Card OR Collapsed Mini Dock */}
                {isSidebarCollapsed ? (
                    /* Collapsed Mini-Dock */
                    <div className="w-14 shrink-0 flex flex-col items-center gap-3 p-2 rounded-2xl bg-white dark:bg-[#091122] border border-slate-200 dark:border-[#162340] shadow-sm dark:shadow-xl xl:sticky xl:top-4 transition-all duration-300">
                        {/* Expand Button */}
                        <button
                            type="button"
                            onClick={() => setIsSidebarCollapsed(false)}
                            className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-[#0d1629] hover:bg-slate-200 dark:hover:bg-[#162340] border border-slate-200 dark:border-[#1c2c4d] flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer shadow-sm"
                            title="Expand Bed Summary Panel"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>

                        {/* Bed Summary Icon Button */}
                        <button
                            type="button"
                            onClick={() => setIsSidebarCollapsed(false)}
                            className="relative w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/25 flex flex-col items-center justify-center text-blue-600 dark:text-blue-400 hover:scale-105 transition-transform cursor-pointer shadow-sm"
                            title={`${stats.total} Total Beds (${stats.available} Available, ${stats.occupied} Occupied)`}
                        >
                            <Bed className="w-4 h-4" />
                            <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-[#00d084] text-white text-[9px] font-black flex items-center justify-center shadow-sm">
                                {stats.available}
                            </span>
                        </button>

                        {stats.occupied > 0 && (
                            <button
                                type="button"
                                onClick={() => setIsSidebarCollapsed(false)}
                                className="relative w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/25 flex flex-col items-center justify-center text-[#ff0055] hover:scale-105 transition-transform cursor-pointer shadow-sm"
                                title={`${stats.occupied} Occupied Beds`}
                            >
                                <Layers className="w-4 h-4" />
                                <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-[#ff0055] text-white text-[9px] font-black flex items-center justify-center shadow-sm">
                                    {stats.occupied}
                                </span>
                            </button>
                        )}
                    </div>
                ) : (
                    /* Expanded Right Sidebar */
                    <div className="w-full xl:w-[350px] shrink-0 space-y-4 xl:sticky xl:top-4 transition-all duration-300">
                        {/* Bed Summary Card */}
                        <Card className="rounded-3xl border-slate-200 dark:border-[#162340] bg-white dark:bg-[#091122] shadow-sm dark:shadow-xl p-5 sm:p-6">
                            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-[#162340]">
                                <div className="flex items-center gap-2.5">
                                    <Bed className="w-5 h-5 text-slate-500" />
                                    <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                                        Bed Summary ({selectedCenterId === "RHU"
                                            ? "RHU Main"
                                            : (selectedCenterId !== "ALL"
                                                ? (initialCenters.find((c) => c.id === selectedCenterId)?.name || "Health Center")
                                                : "All Facilities")})
                                    </h3>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsSidebarCollapsed(true)}
                                    className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-[#0d1629] hover:bg-slate-200 dark:hover:bg-[#162340] border border-slate-200 dark:border-[#1c2c4d] flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-all cursor-pointer"
                                    title="Collapse side panel"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Donut Chart and Legend */}
                            <div className="py-6 flex flex-col items-center justify-center">
                                <div className="relative w-40 h-40 flex items-center justify-center">
                                    <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                                        {/* Background Track */}
                                        <circle
                                            cx="50"
                                            cy="50"
                                            r="45"
                                            fill="transparent"
                                            stroke="currentColor"
                                            strokeWidth="9"
                                            className="text-slate-100 dark:text-slate-800"
                                        />
                                        {/* Occupied Stroke (#ff0055) */}
                                        {stats.total > 0 && strokeDashOccupied > 0 && (
                                            <circle
                                                cx="50"
                                                cy="50"
                                                r="45"
                                                fill="transparent"
                                                stroke="#ff0055"
                                                strokeWidth="9"
                                                strokeDasharray={`${strokeDashOccupied} ${circumference}`}
                                                strokeDashoffset="0"
                                                strokeLinecap="round"
                                                className="transition-all duration-700 ease-out"
                                            />
                                        )}
                                        {/* Available Stroke (#00d084) */}
                                        {stats.total > 0 && strokeDashAvailable > 0 && (
                                            <circle
                                                cx="50"
                                                cy="50"
                                                r="45"
                                                fill="transparent"
                                                stroke="#00d084"
                                                strokeWidth="9"
                                                strokeDasharray={`${strokeDashAvailable} ${circumference}`}
                                                strokeDashoffset={strokeDashOffsetAvailable}
                                                strokeLinecap="round"
                                                className="transition-all duration-700 ease-out"
                                            />
                                        )}
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                                        <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                                            {stats.total}
                                        </span>
                                        <span className="text-[11px] font-bold text-slate-400">Total Beds</span>
                                    </div>
                                </div>

                                {/* Legend Breakdown */}
                                <div className="w-full space-y-2.5 mt-5 text-xs font-semibold">
                                    <div className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                        <div className="flex items-center gap-2">
                                            <span className="w-2.5 h-2.5 rounded-full bg-[#ff0055]" />
                                            <span className="text-slate-600 dark:text-slate-300">Occupied</span>
                                        </div>
                                        <span className="font-bold text-slate-900 dark:text-white">{stats.occupied}</span>
                                    </div>
                                    <div className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                        <div className="flex items-center gap-2">
                                            <span className="w-2.5 h-2.5 rounded-full bg-[#00d084]" />
                                            <span className="text-slate-600 dark:text-slate-300">Available</span>
                                        </div>
                                        <span className="font-bold text-slate-900 dark:text-white">{stats.available}</span>
                                    </div>
                                    <div className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                        <div className="flex items-center gap-2">
                                            <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                                            <span className="text-slate-600 dark:text-slate-300">Out of Service</span>
                                        </div>
                                        <span className="font-bold text-slate-900 dark:text-white">{stats.outOfService}</span>
                                    </div>
                                </div>
                            </div>
                        </Card>

                        {/* Bed Availability by Department */}
                        <Card className="rounded-3xl border-slate-200 dark:border-[#162340] bg-white dark:bg-[#091122] shadow-sm dark:shadow-xl p-5 sm:p-6">
                            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 dark:border-[#162340]">
                                <Layers className="w-5 h-5 text-slate-500" />
                                <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                                    Bed Availability by Department
                                </h3>
                            </div>

                            <div className="space-y-4 mt-5">
                                {Object.entries(stats.departments).map(([deptName, d]) => {
                                    const pct = d.total > 0 ? Math.round((d.occupied / d.total) * 100) : 0;
                                    return (
                                        <div key={deptName} className="space-y-1.5">
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="font-semibold text-slate-700 dark:text-slate-300">{deptName}</span>
                                                <span className="font-mono text-slate-400 font-bold">
                                                    {d.occupied} / {d.total}
                                                </span>
                                            </div>
                                            <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-[#162340] overflow-hidden">
                                                <div
                                                    className="h-full rounded-full bg-[#ff0055] transition-all duration-500"
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </Card>

                        {/* Estimated Only Notice */}
                        <Card className="rounded-2xl border-rose-500/25 bg-gradient-to-br from-rose-950/20 via-transparent to-transparent p-4 sm:p-5 shadow-sm">
                            <div className="flex items-start gap-3">
                                <div className="w-7 h-7 rounded-full bg-rose-500/20 text-rose-500 flex items-center justify-center shrink-0 mt-0.5">
                                    <AlertCircle className="w-4 h-4" />
                                </div>
                                <div className="space-y-1">
                                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-400 border border-rose-500/30">
                                        ESTIMATED ONLY
                                    </span>
                                    <p className="text-xs text-slate-400 font-medium leading-relaxed">
                                        Bed availability may change in real-time as patients are admitted or discharged.
                                    </p>
                                </div>
                            </div>
                        </Card>
                    </div>
                )}
            </div>

            {/* Bed Details Modal */}
            <Dialog open={!!selectedBed} onOpenChange={() => setSelectedBed(null)}>
                <DialogContent className="sm:max-w-[550px] rounded-2xl bg-white dark:bg-[#091122] border-slate-200 dark:border-[#162340]">
                    <DialogHeader>
                        <div className="flex items-center justify-between gap-2 pr-6">
                            <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                                <Bed className="w-5 h-5 text-blue-500" />
                                Bed Information: {selectedBed?.bedNumber}
                            </DialogTitle>
                            {selectedBed && (
                                <span className={cn(
                                    "px-2.5 py-0.5 rounded-full text-[11px] font-bold",
                                    selectedBed.status === "OCCUPIED" && "bg-rose-500/10 text-rose-500 border border-rose-500/20",
                                    selectedBed.status === "AVAILABLE" && "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20",
                                    selectedBed.status === "OUT_OF_SERVICE" && "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                                )}>
                                    {selectedBed.status}
                                </span>
                            )}
                        </div>
                        <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                            Department: {selectedBed?.department} | Type: {selectedBed?.bedType}
                        </DialogDescription>
                        {selectedBed && (
                            <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-[#162340]">
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-semibold border border-blue-500/20">
                                    <Building2 className="w-3.5 h-3.5" />
                                    <span>Facility: {selectedBed.healthCenterName || (selectedBed.facilityType === "RHU" ? "RHU Mapandan (Main)" : "Health Center")}</span>
                                </div>
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 text-xs font-semibold">
                                    <span>Department: {selectedBed.department}</span>
                                </div>
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 text-xs font-semibold">
                                    <span>Type: {selectedBed.bedType}</span>
                                </div>
                                {selectedBed.notes && (
                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/5 text-slate-500 text-xs">
                                        <span>Ward/Location: {selectedBed.notes}</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </DialogHeader>

                    {selectedBed && (
                        <div className="space-y-4 py-2">
                            {/* Current Occupant Details */}
                            {selectedBed.status === "OCCUPIED" && selectedBed.patientName ? (
                                <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <UserCheck className="w-4 h-4 text-rose-500" />
                                            <span className="font-bold text-sm text-slate-900 dark:text-white">
                                                {selectedBed.patientName}
                                            </span>
                                        </div>
                                        <span className="text-[11px] text-slate-400 font-mono">
                                            Admitted: {selectedBed.admissionDate ? new Date(selectedBed.admissionDate).toLocaleDateString() : "N/A"}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div>
                                            <span className="text-slate-400 block text-[11px]">Case / Diagnosis:</span>
                                            <span className="font-semibold text-rose-400">{selectedBed.caseDetails || "N/A"}</span>
                                        </div>
                                        <div>
                                            <span className="text-slate-400 block text-[11px]">Attending Physician:</span>
                                            <span className="font-semibold">{selectedBed.attendingPhysician || "Unassigned"}</span>
                                        </div>
                                        {selectedBed.patientAge && (
                                            <div>
                                                <span className="text-slate-400 block text-[11px]">Age & Gender:</span>
                                                <span className="font-semibold">{selectedBed.patientAge} yrs ({selectedBed.patientGender || "N/A"})</span>
                                            </div>
                                        )}
                                        {selectedBed.patientContact && (
                                            <div>
                                                <span className="text-slate-400 block text-[11px]">Emergency Contact:</span>
                                                <span className="font-semibold font-mono">{selectedBed.patientContact}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Discharge Section */}
                                    <div className="pt-2 border-t border-rose-500/20 flex flex-col gap-2">
                                        <Input
                                            placeholder="Optional discharge summary notes..."
                                            value={dischargeNotes}
                                            onChange={(e) => setDischargeNotes(e.target.value)}
                                            className="h-8 text-xs rounded-lg bg-slate-50 dark:bg-[#0d1629]"
                                        />
                                        <Button
                                            onClick={handleDischargePatient}
                                            disabled={isPending}
                                            className="h-8 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold gap-1.5 cursor-pointer"
                                        >
                                            <UserMinus className="w-3.5 h-3.5" />
                                            <span>Discharge Patient</span>
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex items-center justify-between">
                                    <div>
                                        <span className="text-emerald-500 font-bold text-sm block">Bed is Currently Available</span>
                                        <span className="text-xs text-slate-400">Ready for patient admission or reservation.</span>
                                    </div>
                                    <Button
                                        onClick={() => setIsAdmitModalOpen(true)}
                                        className="h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-1.5 cursor-pointer"
                                    >
                                        <UserCheck className="w-3.5 h-3.5" />
                                        <span>Admit Patient</span>
                                    </Button>
                                </div>
                            )}

                            {/* Status Change Controls */}
                            <div className="pt-2 border-t border-slate-100 dark:border-[#162340] flex items-center justify-between gap-2">
                                <span className="text-xs font-semibold text-slate-400">Quick Status:</span>
                                <div className="flex items-center gap-1.5">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleStatusChange("AVAILABLE")}
                                        disabled={selectedBed.status === "AVAILABLE" || isPending}
                                        className="h-7 text-[11px] rounded-lg cursor-pointer"
                                    >
                                        Mark Available
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleStatusChange("OUT_OF_SERVICE")}
                                        disabled={selectedBed.status === "OUT_OF_SERVICE" || isPending}
                                        className="h-7 text-[11px] rounded-lg text-blue-500 hover:text-blue-600 cursor-pointer"
                                    >
                                        Maintenance
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Admit Patient Modal */}
            <Dialog open={isAdmitModalOpen} onOpenChange={setIsAdmitModalOpen}>
                <DialogContent className="sm:max-w-[480px] rounded-2xl bg-white dark:bg-[#091122] border-slate-200 dark:border-[#162340]">
                    <DialogHeader>
                        <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                            <UserCheck className="w-5 h-5 text-emerald-500" />
                            Admit Patient to {selectedBed?.bedNumber}
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Assign an incoming or transferred patient to this bed.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleAdmitPatient} className="space-y-3.5 py-2">
                        <div>
                            <Label className="text-xs font-semibold">Patient Full Name *</Label>
                            <Input
                                placeholder="e.g. Juan Santos"
                                value={admitPatientName}
                                onChange={(e) => setAdmitPatientName(e.target.value)}
                                className="mt-1 h-9 text-xs rounded-xl"
                                required
                            />
                        </div>

                        <div>
                            <Label className="text-xs font-semibold">Case / Diagnosis *</Label>
                            <Input
                                placeholder="e.g. Pneumonia, Post-Op Recovery, Dengue Monitoring"
                                value={admitCaseDetails}
                                onChange={(e) => setAdmitCaseDetails(e.target.value)}
                                className="mt-1 h-9 text-xs rounded-xl"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label className="text-xs font-semibold">Age</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    max="125"
                                    placeholder="e.g. 45"
                                    value={admitAge}
                                    onChange={(e) => setAdmitAge(e.target.value === "" ? "" : Number(e.target.value))}
                                    className="mt-1 h-9 text-xs rounded-xl"
                                />
                            </div>
                            <div>
                                <Label className="text-xs font-semibold">Gender</Label>
                                <Select value={admitGender} onValueChange={setAdmitGender}>
                                    <SelectTrigger className="mt-1 h-9 text-xs rounded-xl">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Male">Male</SelectItem>
                                        <SelectItem value="Female">Female</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label className="text-xs font-semibold">Contact Number</Label>
                                <Input
                                    placeholder="0912..."
                                    value={admitContact}
                                    onChange={(e) => setAdmitContact(e.target.value)}
                                    className="mt-1 h-9 text-xs rounded-xl"
                                />
                            </div>
                            <div>
                                <Label className="text-xs font-semibold">Attending Physician</Label>
                                <Input
                                    placeholder="Dr. ..."
                                    value={admitPhysician}
                                    onChange={(e) => setAdmitPhysician(e.target.value)}
                                    className="mt-1 h-9 text-xs rounded-xl"
                                />
                            </div>
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsAdmitModalOpen(false)}
                                className="rounded-xl text-xs"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isPending}
                                className="bg-[#00d084] hover:bg-emerald-600 text-white rounded-xl text-xs font-bold cursor-pointer"
                            >
                                Confirm Admission
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Add Bed Modal */}
            <Dialog open={isAddBedModalOpen} onOpenChange={setIsAddBedModalOpen}>
                <DialogContent className="sm:max-w-[450px] rounded-2xl bg-white dark:bg-[#091122] border-slate-200 dark:border-[#162340]">
                    <DialogHeader>
                        <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                            <Plus className="w-5 h-5 text-blue-500" />
                            Add Hospital Bed
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Add a new bed to {matchedCenter ? matchedCenter.name : "the facility or health center"}.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleCreateBed} className="space-y-3 py-2">
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <Label className="text-xs font-semibold">Assigned Facility / Health Center *</Label>
                                {matchedCenter && (
                                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-500/20">
                                        <Lock className="w-2.5 h-2.5" /> Locked to your Center
                                    </span>
                                )}
                            </div>
                            {matchedCenter ? (
                                <div className="h-9 px-3 text-xs rounded-xl bg-slate-100 dark:bg-[#0d1629] border border-slate-200 dark:border-[#1c2c4d] flex items-center justify-between text-slate-800 dark:text-slate-200 font-medium">
                                    <span className="flex items-center gap-1.5 font-bold">
                                        🏢 {matchedCenter.name} {matchedCenter.barangay ? `(${matchedCenter.barangay})` : ""}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-mono">Center Account</span>
                                </div>
                            ) : (
                                <Select
                                    value={addBedFacilityType === "RHU" ? "RHU" : (addBedCenterId || "HEALTH_CENTER")}
                                    onValueChange={(val) => {
                                        if (val === "RHU") {
                                            setAddBedFacilityType("RHU");
                                            setAddBedCenterId("");
                                            if (!newBedNumber || newBedNumber.startsWith("BHC") || newBedNumber.includes("-")) {
                                                setNewBedNumber("RHU-");
                                            }
                                        } else {
                                            setAddBedFacilityType("HEALTH_CENTER");
                                            setAddBedCenterId(val);
                                            const selectedC = initialCenters.find((c) => c.id === val);
                                            const cleanName = selectedC?.name?.replace(/[^a-zA-Z]/g, "") || "BHC";
                                            const abbr = cleanName.slice(0, 5).toUpperCase();
                                            setNewBedNumber(`${abbr}-`);
                                        }
                                    }}
                                >
                                    <SelectTrigger className="mt-1 h-9 text-xs rounded-xl">
                                        <SelectValue placeholder="Select facility or health center" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="RHU">
                                            🏥 RHU Mapandan (Main Facility)
                                        </SelectItem>
                                        {initialCenters.map((c) => (
                                            <SelectItem key={c.id} value={c.id}>
                                                🏢 {c.name} {c.barangay ? `(${c.barangay})` : ""}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>

                        <div>
                            <Label className="text-xs font-semibold">Bed Number *</Label>
                            <Input
                                placeholder="e.g. RHU-009 or BHC-001"
                                value={newBedNumber}
                                onChange={(e) => setNewBedNumber(e.target.value)}
                                className="mt-1 h-9 text-xs rounded-xl font-mono uppercase"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label className="text-xs font-semibold">Bed Type</Label>
                                <Select value={newBedType} onValueChange={(val) => {
                                    setNewBedType(val);
                                    if (val !== "Others") setCustomBedType("");
                                }}>
                                    <SelectTrigger className="mt-1 h-9 text-xs rounded-xl">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Medical">Medical</SelectItem>
                                        <SelectItem value="Surgical">Surgical</SelectItem>
                                        <SelectItem value="Pediatric">Pediatric</SelectItem>
                                        <SelectItem value="Isolation">Isolation</SelectItem>
                                        <SelectItem value="ER">ER</SelectItem>
                                        <SelectItem value="Obstetrics">Obstetrics</SelectItem>
                                        <SelectItem value="Others">Others</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label className="text-xs font-semibold">Department</Label>
                                <Select value={newBedDepartment} onValueChange={(val) => {
                                    setNewBedDepartment(val);
                                    if (val !== "Others") setCustomDepartment("");
                                }}>
                                    <SelectTrigger className="mt-1 h-9 text-xs rounded-xl">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Internal Medicine">Internal Medicine</SelectItem>
                                        <SelectItem value="Surgery">Surgery</SelectItem>
                                        <SelectItem value="Pediatrics">Pediatrics</SelectItem>
                                        <SelectItem value="OB-GYN">OB-GYN</SelectItem>
                                        <SelectItem value="Emergency">Emergency</SelectItem>
                                        <SelectItem value="Infectious Disease">Infectious Disease</SelectItem>
                                        <SelectItem value="Others">Others</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {newBedDepartment === "Others" && (
                            <div className="space-y-1 animate-in fade-in slide-in-from-top-1 duration-200">
                                <Label className="text-xs font-semibold text-rose-500 dark:text-rose-400">
                                    Specify Department *
                                </Label>
                                <Input
                                    placeholder="e.g. Cardiology, Orthopedics, ENT, ICU Ward"
                                    value={customDepartment}
                                    onChange={(e) => setCustomDepartment(e.target.value)}
                                    className="h-9 text-xs rounded-xl border-rose-300 dark:border-rose-900/60 focus-visible:ring-rose-500 bg-rose-50/20 dark:bg-rose-950/10"
                                    required
                                    autoFocus
                                />
                                <p className="text-[11px] text-slate-400">
                                    Please enter the specific department name for this bed.
                                </p>
                            </div>
                        )}

                        {newBedType === "Others" && (
                            <div className="space-y-1 animate-in fade-in slide-in-from-top-1 duration-200">
                                <Label className="text-xs font-semibold text-rose-500 dark:text-rose-400">
                                    Specify Bed Type *
                                </Label>
                                <Input
                                    placeholder="e.g. ICU Bed, Bariatric, Bassinet, Stretcher"
                                    value={customBedType}
                                    onChange={(e) => setCustomBedType(e.target.value)}
                                    className="h-9 text-xs rounded-xl border-rose-300 dark:border-rose-900/60 focus-visible:ring-rose-500 bg-rose-50/20 dark:bg-rose-950/10"
                                    required
                                    autoFocus
                                />
                                <p className="text-[11px] text-slate-400">
                                    Please enter the specific bed type or classification.
                                </p>
                            </div>
                        )}

                        <div>
                            <Label className="text-xs font-semibold">Location / Remarks (Optional)</Label>
                            <Input
                                placeholder="e.g. Ward 2, Near Station"
                                value={newBedNotes}
                                onChange={(e) => setNewBedNotes(e.target.value)}
                                className="mt-1 h-9 text-xs rounded-xl"
                            />
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsAddBedModalOpen(false)}
                                className="rounded-xl text-xs"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isPending}
                                className="bg-[#ff0055] hover:bg-rose-600 text-white rounded-xl text-xs font-bold cursor-pointer"
                            >
                                Create Bed
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Setup Facility Capacity Modal */}
            <Dialog open={isInitModalOpen} onOpenChange={setIsInitModalOpen}>
                <DialogContent className="sm:max-w-[450px] rounded-2xl bg-white dark:bg-[#091122] border-slate-200 dark:border-[#162340]">
                    <DialogHeader>
                        <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                            <Bed className="w-5 h-5 text-blue-500" />
                            Setup Facility Beds
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Automatically create standard bed numbers (e.g. 50 beds from RHU-001 to RHU-050) distributed across departments.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 py-2">
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <Label className="text-xs font-semibold">Target Facility / Health Center *</Label>
                                {matchedCenter && (
                                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-500/20">
                                        <Lock className="w-2.5 h-2.5" /> Locked to your Center
                                    </span>
                                )}
                            </div>
                            {matchedCenter ? (
                                <div className="h-9 px-3 text-xs rounded-xl bg-slate-100 dark:bg-[#0d1629] border border-slate-200 dark:border-[#1c2c4d] flex items-center justify-between text-slate-800 dark:text-slate-200 font-medium">
                                    <span className="flex items-center gap-1.5 font-bold">
                                        🏢 {matchedCenter.name} {matchedCenter.barangay ? `(${matchedCenter.barangay})` : ""}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-mono">Center Account</span>
                                </div>
                            ) : (
                                <Select
                                    value={initFacilityType === "RHU" ? "RHU" : (initCenterId || "HEALTH_CENTER")}
                                    onValueChange={(val) => {
                                        if (val === "RHU") {
                                            setInitFacilityType("RHU");
                                            setInitCenterId("");
                                            setInitPrefix("RHU");
                                        } else {
                                            setInitFacilityType("HEALTH_CENTER");
                                            setInitCenterId(val);
                                            const selectedC = initialCenters.find((c) => c.id === val);
                                            const cleanName = selectedC?.name?.replace(/[^a-zA-Z]/g, "") || "BHC";
                                            const abbr = cleanName.slice(0, 5).toUpperCase();
                                            setInitPrefix(abbr);
                                        }
                                    }}
                                >
                                    <SelectTrigger className="mt-1 h-9 text-xs rounded-xl">
                                        <SelectValue placeholder="Select facility or health center" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="RHU">
                                            🏥 RHU Mapandan (Main Facility)
                                        </SelectItem>
                                        {initialCenters.map((c) => (
                                            <SelectItem key={c.id} value={c.id}>
                                                🏢 {c.name} {c.barangay ? `(${c.barangay})` : ""}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>

                        <div>
                            <Label className="text-xs font-semibold">Total Beds to Create</Label>
                            <Input
                                type="number"
                                min="1"
                                max="100"
                                value={initCount}
                                onChange={(e) => setInitCount(Number(e.target.value))}
                                className="mt-1 h-9 text-xs rounded-xl"
                            />
                        </div>
                        <div>
                            <Label className="text-xs font-semibold">Bed Code Prefix</Label>
                            <Input
                                placeholder="RHU"
                                value={initPrefix}
                                onChange={(e) => setInitPrefix(e.target.value)}
                                className="mt-1 h-9 text-xs rounded-xl font-mono uppercase"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsInitModalOpen(false)}
                            className="rounded-xl text-xs"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleInitializeFacility}
                            disabled={isPending}
                            className="bg-[#ff0055] hover:bg-rose-600 text-white rounded-xl text-xs font-bold cursor-pointer"
                        >
                            Initialize Beds
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
