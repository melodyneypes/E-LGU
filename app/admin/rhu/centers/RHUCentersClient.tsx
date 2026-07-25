"use client";

import React, { useState, useTransition } from "react";
import {
    Building2,
    Plus,
    Search,
    MapPin,
    Clock,
    Phone,
    UserCheck,
    Edit,
    Trash2,
    CheckCircle2,
    AlertTriangle,
    Hospital,
    ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";
import {
    createRHUHealthCenter,
    updateRHUHealthCenter,
    deleteRHUHealthCenter,
    RHUHealthCenterInput,
    getRHUHealthCenters
} from "./actions";

const LocationPicker = dynamic(() => import("@/components/LocationPicker"), {
    ssr: false,
    loading: () => (
        <div className="h-[220px] w-full rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse flex items-center justify-center text-xs text-slate-400 font-bold">
            Loading Mapandan Map...
        </div>
    )
});

const MAPANDAN_BARANGAYS = [
    "Poblacion",
    "Coral",
    "Torres",
    "Lupa",
    "Amansagan",
    "Aserda",
    "Baloling",
    "Golden",
    "Nilombot",
    "Pias",
    "Primicias",
    "Santa Maria",
    "Nilombot East",
    "Nilombot West"
];

interface RHUCentersClientProps {
    initialCenters: any[];
}

export default function RHUCentersClient({ initialCenters }: RHUCentersClientProps) {
    const [centers, setCenters] = useState<any[]>(initialCenters);
    const [isPending, startTransition] = useTransition();

    // Filters
    const [searchQuery, setSearchQuery] = useState("");
    const [barangayFilter, setBarangayFilter] = useState("ALL");
    const [statusFilter, setStatusFilter] = useState("ALL");

    // Modal States
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [editingCenter, setEditingCenter] = useState<any | null>(null);
    const [deleteCenterTarget, setDeleteCenterTarget] = useState<any | null>(null);

    // Form fields
    const [formData, setFormData] = useState<RHUHealthCenterInput>({
        name: "",
        code: "",
        location: "",
        latitude: 16.0250,
        longitude: 120.4450,
        barangay: "Poblacion",
        contactNumber: "",
        operatingHours: "Mon-Fri 8:00 AM - 5:00 PM",
        headPersonnel: "",
        servicesOffered: "",
        status: "ACTIVE",
        remarks: ""
    });

    // Form Validation State
    const [errors, setErrors] = useState<Record<string, string>>({});

    const refreshData = async () => {
        const res = await getRHUHealthCenters({
            search: searchQuery,
            barangay: barangayFilter,
            status: statusFilter
        });
        if (res.success && res.data) {
            setCenters(res.data);
        }
    };

    // Filter logic
    const filteredCenters = centers.filter(c => {
        const matchesSearch =
            !searchQuery.trim() ||
            c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (c.code && c.code.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (c.location && c.location.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (c.headPersonnel && c.headPersonnel.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesBarangay = barangayFilter === "ALL" || c.barangay === barangayFilter;
        const matchesStatus = statusFilter === "ALL" || c.status === statusFilter;

        return matchesSearch && matchesBarangay && matchesStatus;
    });

    // Metrics
    const totalCentersCount = centers.length;
    const activeCentersCount = centers.filter(c => c.status === "ACTIVE").length;
    const barangaysCoveredCount = new Set(centers.map(c => c.barangay).filter(Boolean)).size;

    const handleOpenCreateModal = () => {
        setEditingCenter(null);
        setFormData({
            name: "",
            code: "",
            location: "",
            latitude: 16.0250,
            longitude: 120.4450,
            barangay: "Poblacion",
            contactNumber: "",
            operatingHours: "Mon-Fri 8:00 AM - 5:00 PM",
            headPersonnel: "",
            servicesOffered: "General Consultation, Vaccination, Prenatal Care",
            status: "ACTIVE",
            remarks: ""
        });
        setErrors({});
        setIsFormModalOpen(true);
    };

    const handleOpenEditModal = (center: any) => {
        setEditingCenter(center);
        setFormData({
            name: center.name || "",
            code: center.code || "",
            location: center.location || "",
            latitude: center.latitude || 16.0250,
            longitude: center.longitude || 120.4450,
            barangay: center.barangay || "Poblacion",
            contactNumber: center.contactNumber || "",
            operatingHours: center.operatingHours || "Mon-Fri 8:00 AM - 5:00 PM",
            headPersonnel: center.headPersonnel || "",
            servicesOffered: center.servicesOffered || "",
            status: center.status || "ACTIVE",
            remarks: center.remarks || ""
        });
        setErrors({});
        setIsFormModalOpen(true);
    };

    const handleMapLocationSelect = async (lat: number, lng: number) => {
        setFormData(prev => ({
            ...prev,
            latitude: lat,
            longitude: lng
        }));

        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
            const data = await res.json();

            if (data && data.address) {
                const addr = data.address;
                const fullText = JSON.stringify(addr).toLowerCase() + " " + (data.display_name || "").toLowerCase();

                const matchedBarangay = MAPANDAN_BARANGAYS.find(b =>
                    fullText.includes(b.toLowerCase())
                );

                const buildingName = addr.amenity || addr.building || addr.hospital || addr.clinic || "";
                const road = addr.road || addr.street || addr.neighbourhood || "";
                const formattedLocation = [
                    buildingName || road,
                    matchedBarangay ? `Barangay ${matchedBarangay}` : "",
                    "Mapandan, Pangasinan"
                ].filter(Boolean).join(", ");

                setFormData(prev => ({
                    ...prev,
                    name: prev.name || buildingName || prev.name,
                    location: formattedLocation || prev.location || `${data.display_name}`,
                    barangay: matchedBarangay || prev.barangay,
                    code: prev.code ? prev.code : (matchedBarangay ? `BHS-${matchedBarangay.toUpperCase().replace(/\s+/g, '')}` : prev.code)
                }));

                if (errors.location) setErrors(prev => ({ ...prev, location: "" }));

                if (matchedBarangay) {
                    toast.success(`Building terrain pinned for Barangay ${matchedBarangay}`);
                } else {
                    toast.success("Building terrain location pinned & address auto-filled");
                }
            }
        } catch (err) {
            console.warn("Reverse geocoding error:", err);
        }
    };

    const handleSearchAndPinBuilding = async () => {
        if (!formData.name || !formData.name.trim()) {
            toast.error("Please enter a Health Center Name first to search on the map.");
            return;
        }

        const query = formData.name.trim();
        toast.info(`Searching building terrain for: "${query}"...`);

        try {
            const searchUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(`${query}, Mapandan, Pangasinan`)}&format=json&limit=1`;
            const res = await fetch(searchUrl);
            const data = await res.json();

            if (data && data.length > 0) {
                const targetLat = parseFloat(data[0].lat);
                const targetLng = parseFloat(data[0].lon);

                await handleMapLocationSelect(targetLat, targetLng);
                toast.success(`Found building! Map zoomed to high-detail building terrain.`);
            } else {
                toast.warning(`Building "${query}" not indexed on map. Click on the map terrain to pin its exact location!`);
            }
        } catch (err) {
            console.warn("Building search failed:", err);
        }
    };

    const validateForm = () => {
        const newErrors: Record<string, string> = {};
        if (!formData.name || !formData.name.trim()) {
            newErrors.name = "Health Center name is required";
        }
        if (!formData.location || !formData.location.trim()) {
            newErrors.location = "Location address is required";
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmitForm = (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;

        startTransition(async () => {
            if (editingCenter) {
                const res = await updateRHUHealthCenter(editingCenter.id, formData);
                if (res.success) {
                    toast.success("Health center updated successfully!");
                    setIsFormModalOpen(false);
                    await refreshData();
                } else {
                    toast.error(res.error || "Failed to update health center");
                }
            } else {
                const res = await createRHUHealthCenter(formData);
                if (res.success) {
                    toast.success("Health center added successfully!");
                    setIsFormModalOpen(false);
                    await refreshData();
                } else {
                    toast.error(res.error || "Failed to add health center");
                }
            }
        });
    };

    const handleDelete = (center: any) => {
        startTransition(async () => {
            const res = await deleteRHUHealthCenter(center.id);
            if (res.success) {
                toast.success(`Health center "${center.name}" deleted.`);
                setDeleteCenterTarget(null);
                await refreshData();
            } else {
                toast.error(res.error || "Failed to delete health center");
            }
        });
    };

    return (
        <div className="space-y-6">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm">
                <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2.5 bg-rose-500/10 text-rose-500 rounded-2xl">
                            <Building2 className="w-6 h-6" />
                        </div>
                        <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
                            Health Centers & Stations
                        </h1>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium pl-11">
                        Manage municipal health centers, barangay health sub-stations, locations, and services across Mapandan.
                    </p>
                </div>

                <Button
                    onClick={handleOpenCreateModal}
                    className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl h-11 px-5 shadow-lg shadow-rose-600/20 shrink-0 flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" /> Add Health Center
                </Button>
            </div>

            {/* Metric Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="rounded-2xl border-slate-200 dark:border-white/10 shadow-sm bg-white dark:bg-slate-900">
                    <CardContent className="p-5 flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Centers</p>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white">{totalCentersCount}</h3>
                        </div>
                        <div className="p-3 bg-rose-50 dark:bg-rose-950/30 text-rose-600 rounded-2xl">
                            <Hospital className="w-5 h-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl border-slate-200 dark:border-white/10 shadow-sm bg-white dark:bg-slate-900">
                    <CardContent className="p-5 flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Active Stations</p>
                            <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{activeCentersCount}</h3>
                        </div>
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 rounded-2xl">
                            <CheckCircle2 className="w-5 h-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl border-slate-200 dark:border-white/10 shadow-sm bg-white dark:bg-slate-900">
                    <CardContent className="p-5 flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Barangays Covered</p>
                            <h3 className="text-2xl font-black text-blue-600 dark:text-blue-400">{barangaysCoveredCount}</h3>
                        </div>
                        <div className="p-3 bg-blue-50 dark:bg-blue-950/30 text-blue-600 rounded-2xl">
                            <MapPin className="w-5 h-5" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filter & Search Toolbar */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
                <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                        type="text"
                        placeholder="Search center name, code, barangay, address..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 h-10 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
                    />
                </div>

                <div className="flex items-center gap-2">
                    <Select value={barangayFilter} onValueChange={setBarangayFilter}>
                        <SelectTrigger className="h-10 text-xs w-[160px] rounded-xl bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
                            <SelectValue placeholder="Barangay" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">All Barangays</SelectItem>
                            {MAPANDAN_BARANGAYS.map(b => (
                                <SelectItem key={b} value={b}>{b}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="h-10 text-xs w-[150px] rounded-xl bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">All Status</SelectItem>
                            <SelectItem value="ACTIVE">Active</SelectItem>
                            <SelectItem value="INACTIVE">Inactive</SelectItem>
                            <SelectItem value="UNDER_RENOVATION">Under Renovation</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Health Center Cards Grid */}
            {filteredCenters.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredCenters.map((center) => (
                        <Card
                            key={center.id}
                            className="rounded-2xl border-slate-200 dark:border-white/10 shadow-sm hover:shadow-md transition-all overflow-hidden bg-white dark:bg-slate-900 flex flex-col justify-between"
                        >
                            <CardContent className="p-5 space-y-4">
                                {/* Header badge + title */}
                                <div className="flex items-start justify-between gap-3">
                                    <div className="space-y-1">
                                        {center.code && (
                                            <span className="inline-block px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                                                {center.code}
                                            </span>
                                        )}
                                        <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                                            {center.name}
                                        </h3>
                                    </div>

                                    <span
                                        className={cn(
                                            "px-2.5 py-0.5 text-[10px] font-black uppercase rounded-full shrink-0",
                                            center.status === "ACTIVE"
                                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                                : center.status === "UNDER_RENOVATION"
                                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                                                : "bg-slate-200 dark:bg-slate-800 text-slate-500"
                                        )}
                                    >
                                        {center.status.replace("_", " ")}
                                    </span>
                                </div>

                                {/* Details List */}
                                <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                                    <a
                                        href={center.latitude && center.longitude ? `https://www.google.com/maps?q=${center.latitude},${center.longitude}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${center.name}, ${center.location}`)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        title="Click to view exact pinned location on Google Maps"
                                        className="flex items-start gap-2 text-slate-700 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 transition-colors group cursor-pointer"
                                    >
                                        <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                                        <span className="font-medium underline decoration-rose-400/40 group-hover:decoration-rose-500 underline-offset-2 flex items-center gap-1">
                                            {center.location}
                                            <ExternalLink className="w-3 h-3 text-rose-500 inline shrink-0 opacity-80 group-hover:opacity-100" />
                                        </span>
                                    </a>

                                    {center.operatingHours && (
                                        <div className="flex items-center gap-2">
                                            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                            <span>{center.operatingHours}</span>
                                        </div>
                                    )}

                                    {center.contactNumber && (
                                        <div className="flex items-center gap-2">
                                            <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                            <span>{center.contactNumber}</span>
                                        </div>
                                    )}

                                    {center.headPersonnel && (
                                        <div className="flex items-center gap-2">
                                            <UserCheck className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                            <span className="font-semibold text-slate-800 dark:text-slate-200">{center.headPersonnel}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Services Offered Chips */}
                                {center.servicesOffered && (
                                    <div className="pt-2 border-t border-slate-100 dark:border-white/5 space-y-1.5">
                                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Services Offered</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {center.servicesOffered.split(",").map((svc: string, i: number) => (
                                                <span
                                                    key={i}
                                                    className="px-2 py-0.5 text-[10px] font-medium rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                                                >
                                                    {svc.trim()}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </CardContent>

                            {/* Action Buttons Footer */}
                            <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-white/5 flex items-center justify-between gap-2">
                                <a
                                    href={center.latitude && center.longitude ? `https://www.google.com/maps?q=${center.latitude},${center.longitude}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${center.name}, ${center.location}`)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-3 h-8 text-xs font-bold rounded-lg text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-all"
                                >
                                    <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                    Google Maps
                                </a>

                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleOpenEditModal(center)}
                                        className="h-8 px-3 text-xs font-semibold rounded-lg hover:border-rose-400 hover:text-rose-600"
                                    >
                                        <Edit className="w-3.5 h-3.5 mr-1" /> Edit
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setDeleteCenterTarget(center)}
                                        className="h-8 px-3 text-xs font-semibold rounded-lg text-rose-600 border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                    >
                                        <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            ) : (
                <Card className="rounded-2xl border-slate-200 dark:border-white/10 p-12 text-center bg-white dark:bg-slate-900">
                    <Hospital className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                    <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">No Health Centers Found</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                        No center matches your search filters. Click below to add a new health center.
                    </p>
                    <Button
                        onClick={handleOpenCreateModal}
                        className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl h-10 px-4"
                    >
                        <Plus className="w-4 h-4 mr-1.5" /> Add Health Center
                    </Button>
                </Card>
            )}

            {/* Add / Edit Health Center Modal */}
            <Dialog open={isFormModalOpen} onOpenChange={setIsFormModalOpen}>
                <DialogContent className="sm:max-w-[840px] max-h-[92vh] overflow-y-auto rounded-3xl p-6">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                            <Building2 className="w-5 h-5 text-rose-500" />
                            {editingCenter ? "Edit Health Center" : "Add New Health Center"}
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            {editingCenter
                                ? "Update center details, head personnel, and operating hours."
                                : "Register a new health center or barangay health station in Mapandan."}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmitForm} className="space-y-4 py-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                            {/* LEFT COLUMN: Form Fields */}
                            <div className="space-y-4">
                                {/* Center Name */}
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                            Health Center Name <span className="text-rose-500">*</span>
                                        </Label>
                                        {formData.name && (
                                            <button
                                                type="button"
                                                onClick={handleSearchAndPinBuilding}
                                                className="text-[10px] font-bold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1"
                                            >
                                                <Search className="w-3 h-3 text-rose-500" /> Auto-Find Building ↗
                                            </button>
                                        )}
                                    </div>
                                    <Input
                                        type="text"
                                        placeholder="e.g., Mapandan Community Hospital or Lalas Medical Clinic"
                                        value={formData.name}
                                        onChange={(e) => {
                                            setFormData({ ...formData, name: e.target.value });
                                            if (errors.name) setErrors({ ...errors, name: "" });
                                        }}
                                        className={cn(
                                            "h-10 text-xs rounded-xl",
                                            errors.name ? "border-red-500 focus-visible:ring-red-500" : ""
                                        )}
                                    />
                                    {errors.name && (
                                        <p className="text-[10px] text-red-500 font-medium">{errors.name}</p>
                                    )}
                                </div>

                                {/* Code & Barangay Row */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Center Code</Label>
                                        <Input
                                            type="text"
                                            placeholder="e.g., BHS-CORAL"
                                            value={formData.code}
                                            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                            className="h-10 text-xs rounded-xl"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Barangay</Label>
                                        <Select
                                            value={formData.barangay || "Poblacion"}
                                            onValueChange={(val) => setFormData({ ...formData, barangay: val })}
                                        >
                                            <SelectTrigger className="h-10 text-xs rounded-xl">
                                                <SelectValue placeholder="Select Barangay" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {MAPANDAN_BARANGAYS.map(b => (
                                                    <SelectItem key={b} value={b}>{b}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {/* Address Location */}
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                            Address Location <span className="text-rose-500">*</span>
                                        </Label>
                                        {formData.location && (
                                            <a
                                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${formData.name ? formData.name + ', ' : ''}${formData.location}`)}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                                            >
                                                <MapPin className="w-3 h-3 text-emerald-500" /> Test Google Maps ↗
                                            </a>
                                        )}
                                    </div>
                                    <Input
                                        type="text"
                                        placeholder="e.g., Barangay Hall Complex, Coral, Mapandan, Pangasinan"
                                        value={formData.location}
                                        onChange={(e) => {
                                            setFormData({ ...formData, location: e.target.value });
                                            if (errors.location) setErrors({ ...errors, location: "" });
                                        }}
                                        className={cn(
                                            "h-10 text-xs rounded-xl",
                                            errors.location ? "border-red-500 focus-visible:ring-red-500" : ""
                                        )}
                                    />
                                    {errors.location && (
                                        <p className="text-[10px] text-red-500 font-medium">{errors.location}</p>
                                    )}
                                </div>

                                {/* Head Personnel & Contact Number Row */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Head Staff / Officer</Label>
                                        <Input
                                            type="text"
                                            placeholder="e.g., Nurse Elena Garcia"
                                            value={formData.headPersonnel}
                                            onChange={(e) => setFormData({ ...formData, headPersonnel: e.target.value })}
                                            className="h-10 text-xs rounded-xl"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Contact Hotline</Label>
                                        <Input
                                            type="text"
                                            placeholder="e.g., (075) 555-0102"
                                            value={formData.contactNumber}
                                            onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                                            className="h-10 text-xs rounded-xl"
                                        />
                                    </div>
                                </div>

                                {/* Operating Hours & Status */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Operating Hours</Label>
                                        <Input
                                            type="text"
                                            placeholder="e.g., Mon-Fri 8:00 AM - 5:00 PM"
                                            value={formData.operatingHours}
                                            onChange={(e) => setFormData({ ...formData, operatingHours: e.target.value })}
                                            className="h-10 text-xs rounded-xl"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Operational Status</Label>
                                        <Select
                                            value={formData.status || "ACTIVE"}
                                            onValueChange={(val) => setFormData({ ...formData, status: val })}
                                        >
                                            <SelectTrigger className="h-10 text-xs rounded-xl">
                                                <SelectValue placeholder="Status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="ACTIVE">Active</SelectItem>
                                                <SelectItem value="INACTIVE">Inactive</SelectItem>
                                                <SelectItem value="UNDER_RENOVATION">Under Renovation</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {/* Services Offered */}
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Services Offered (Comma Separated)</Label>
                                    <Input
                                        type="text"
                                        placeholder="e.g., General Consultation, Vaccination, Prenatal Care"
                                        value={formData.servicesOffered}
                                        onChange={(e) => setFormData({ ...formData, servicesOffered: e.target.value })}
                                        className="h-10 text-xs rounded-xl"
                                    />
                                </div>
                            </div>

                            {/* RIGHT COLUMN: Mapandan Interactive Map Pin */}
                            <div className="space-y-2 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/60">
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                        <MapPin className="w-4 h-4 text-rose-500" /> Pin Location (Mapandan)
                                    </Label>
                                    {formData.latitude && formData.longitude && (
                                        <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                                            {formData.latitude.toFixed(5)}, {formData.longitude.toFixed(5)}
                                        </span>
                                    )}
                                </div>

                                <div className="h-[360px] w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 relative z-0 shadow-inner">
                                    <LocationPicker
                                        lat={formData.latitude || 16.0250}
                                        lng={formData.longitude || 120.4450}
                                        onChange={(lat, lng) => handleMapLocationSelect(lat, lng)}
                                    />
                                </div>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium italic">
                                    📍 Click anywhere on the map or drag the pin marker to specify the exact health center position in Mapandan.
                                </p>
                            </div>
                        </div>

                        <DialogFooter className="pt-3 gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsFormModalOpen(false)}
                                disabled={isPending}
                                className="rounded-xl text-xs h-9"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isPending}
                                className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs h-9 font-bold px-5"
                            >
                                {isPending ? "Saving..." : editingCenter ? "Update Center" : "Save Center"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Modal */}
            <Dialog open={!!deleteCenterTarget} onOpenChange={(open) => !open && setDeleteCenterTarget(null)}>
                <DialogContent className="sm:max-w-[400px] rounded-2xl p-6">
                    <DialogHeader className="space-y-2">
                        <DialogTitle className="text-base font-bold text-rose-600 flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-rose-500" />
                            Delete Health Center
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-600 dark:text-slate-300">
                            Are you sure you want to delete <strong>{deleteCenterTarget?.name}</strong>? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>

                    <DialogFooter className="gap-2 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setDeleteCenterTarget(null)}
                            disabled={isPending}
                            className="rounded-xl text-xs h-9"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={() => handleDelete(deleteCenterTarget)}
                            disabled={isPending}
                            className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs h-9 font-bold px-4"
                        >
                            {isPending ? "Deleting..." : "Delete Center"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
