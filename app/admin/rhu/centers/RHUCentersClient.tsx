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
    ExternalLink,
    Stethoscope,
    Users,
    Mail,
    Calendar,
    Briefcase,
    BadgeCheck,
    ShieldCheck,
    Activity,
    Eye,
    X
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
    getRHUHealthCenters,
    createRHUMedicalPersonnel,
    updateRHUMedicalPersonnel,
    deleteRHUMedicalPersonnel,
    getRHUMedicalPersonnel,
    RHUMedicalPersonnelInput,
    MedicalPersonnelRole
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

export const STANDARD_HEALTH_SERVICES = [
    "General Consultation",
    "Vaccination & Immunization",
    "Maternal & Child Health",
    "Prenatal & Postnatal Care",
    "Dental Services",
    "Tooth Extraction",
    "Animal Bite Care",
    "Laboratory & Diagnostics",
    "BP & Diabetes Screening",
    "First Aid & Emergency Care",
    "Family Planning",
    "Nutrition & Wellness Counseling"
];

function formatPHPhoneNumber(value: string): string {
    const clean = value.replace(/\D/g, "");
    if (clean.startsWith("09")) {
        // Mobile format: 0917-123-4567
        const digits = clean.slice(0, 11);
        if (digits.length <= 4) return digits;
        if (digits.length <= 7) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
        return `${digits.slice(0, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`;
    } else if (clean.startsWith("0")) {
        // Landline format: 075-123-4567
        const digits = clean.slice(0, 10);
        if (digits.length <= 3) return digits;
        if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
        return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    // Short codes or other formats: just raw digits up to 11 digits max
    return clean.slice(0, 11);
}

interface RHUCentersClientProps {
    initialCenters: any[];
    initialPersonnel: any[];
    currentUser?: any;
    isCenterAdmin?: boolean;
    matchedCenter?: any;
    allActiveCentersCount?: number;
}

export default function RHUCentersClient({
    initialCenters,
    initialPersonnel,
    currentUser,
    isCenterAdmin = false,
    matchedCenter,
    allActiveCentersCount = 0
}: RHUCentersClientProps) {
    const [activeTab, setActiveTab] = useState<"centers" | "personnel">("centers");
    const [centers, setCenters] = useState<any[]>(initialCenters);
    const [allActiveCount, setAllActiveCount] = useState(allActiveCentersCount);
    const [personnelList, setPersonnelList] = useState<any[]>(initialPersonnel);
    const [isPending, startTransition] = useTransition();

    // Health Centers Filters
    const [searchQuery, setSearchQuery] = useState("");
    const [barangayFilter, setBarangayFilter] = useState("ALL");
    const [statusFilter, setStatusFilter] = useState("ALL");

    // Personnel Filters
    const [personnelSearch, setPersonnelSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState<string>("ALL");
    const [personnelCenterFilter, setPersonnelCenterFilter] = useState<string>("ALL");

    // Center Form Modal States
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [editingCenter, setEditingCenter] = useState<any | null>(null);
    const [deleteCenterTarget, setDeleteCenterTarget] = useState<any | null>(null);

    // Center Form Data
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
        remarks: "",
        accountEmail: "",
        accountPassword: "",
        userId: null,
        pharmacyEmail: "",
        pharmacyPassword: "",
        pharmacyUserId: null
    });

    const [centerErrors, setCenterErrors] = useState<Record<string, string>>({});

    // Personnel Form Modal States
    const [isPersonnelModalOpen, setIsPersonnelModalOpen] = useState(false);
    const [editingPersonnel, setEditingPersonnel] = useState<any | null>(null);
    const [deletePersonnelTarget, setDeletePersonnelTarget] = useState<any | null>(null);

    // Personnel Form Data
    const [personnelData, setPersonnelData] = useState<RHUMedicalPersonnelInput>({
        name: "",
        role: "DOCTOR",
        specialization: "",
        licenseNumber: "",
        contactNumber: "",
        email: "",
        schedule: "Mon-Fri 8:00 AM - 5:00 PM",
        assignedServices: "",
        status: "ACTIVE",
        healthCenterId: "NONE"
    });

    const [personnelErrors, setPersonnelErrors] = useState<Record<string, string>>({});

    const refreshData = async () => {
        const [cRes, pRes, unfilteredRes] = await Promise.all([
            getRHUHealthCenters({
                search: searchQuery,
                barangay: barangayFilter,
                status: statusFilter
            }),
            getRHUMedicalPersonnel({
                search: personnelSearch,
                role: roleFilter,
                healthCenterId: personnelCenterFilter
            }),
            getRHUHealthCenters()
        ]);

        let fetchedCenters = cRes.success && cRes.data ? cRes.data : [];
        let fetchedPersonnel = pRes.success && pRes.data ? pRes.data : [];

        if (unfilteredRes.success && unfilteredRes.data) {
            const count = unfilteredRes.data.filter((c: any) => (c.status || "ACTIVE").toUpperCase() === "ACTIVE").length;
            setAllActiveCount(count);
        }

        if ((isCenterAdmin || matchedCenter) && currentUser) {
            const activeMatchedCenter = matchedCenter || fetchedCenters.find((c: any) =>
                (c.userId && String(c.userId) === String(currentUser.id)) ||
                (c.accountEmail && currentUser.email && String(c.accountEmail).toLowerCase() === String(currentUser.email).toLowerCase()) ||
                (currentUser.email && String(currentUser.email).toLowerCase().includes("lalas") && String(c.name).toLowerCase().includes("lalas")) ||
                (currentUser.email && String(currentUser.email).toLowerCase().includes("main") && String(c.name).toLowerCase().includes("main"))
            );
            if (activeMatchedCenter) {
                fetchedCenters = fetchedCenters.filter((c: any) => c.id === activeMatchedCenter.id);
                fetchedPersonnel = fetchedPersonnel.filter((p: any) => p.healthCenterId === activeMatchedCenter.id);
            } else if (currentUser.managedBarangay) {
                fetchedCenters = fetchedCenters.filter((c: any) => c.barangay === currentUser.managedBarangay);
                const validCenterIds = new Set(fetchedCenters.map((c: any) => c.id));
                fetchedPersonnel = fetchedPersonnel.filter((p: any) => validCenterIds.has(p.healthCenterId));
            }
        }

        setCenters(fetchedCenters);
        setPersonnelList(fetchedPersonnel);
    };

    // Filter Logic for Health Centers
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

    // Filter Logic for Personnel
    const filteredPersonnel = personnelList.filter(p => {
        const matchesSearch =
            !personnelSearch.trim() ||
            p.name.toLowerCase().includes(personnelSearch.toLowerCase()) ||
            (p.specialization && p.specialization.toLowerCase().includes(personnelSearch.toLowerCase())) ||
            (p.licenseNumber && p.licenseNumber.toLowerCase().includes(personnelSearch.toLowerCase())) ||
            (p.assignedServices && p.assignedServices.toLowerCase().includes(personnelSearch.toLowerCase()));

        const matchesRole = roleFilter === "ALL" || p.role === roleFilter;
        const matchesCenter =
            personnelCenterFilter === "ALL" ||
            (personnelCenterFilter === "UNASSIGNED" ? !p.healthCenterId : p.healthCenterId === personnelCenterFilter);

        return matchesSearch && matchesRole && matchesCenter;
    });

    // Metrics
    const totalCentersCount = centers.length;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const activeCentersCount = centers.filter(c => (c.status || "ACTIVE").toUpperCase() === "ACTIVE").length;

    const totalDoctorsCount = personnelList.filter(p => p.role === "DOCTOR").length;
    const totalNursesCount = personnelList.filter(p => p.role === "NURSE").length;
    const totalMidwivesCount = personnelList.filter(p => p.role === "MIDWIFE").length;
    const totalDentistsCount = personnelList.filter(p => p.role === "DENTIST").length;
    const totalPersonnelCount = personnelList.length;

    // Center Management Authorization (Only RHU_CENTER_ADMIN and RHU/Global ADMIN can modify, RHU_STAFF can only view)
    const userRole = (currentUser?.role || "").toUpperCase();
    const canManageCenter = userRole === "ADMIN" || userRole === "RHU_ADMIN" || userRole === "RHU_CENTER_ADMIN";

    // Center Modal Controls
    const handleOpenCreateCenterModal = () => {
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
            remarks: "",
            accountEmail: "",
            accountPassword: "",
            userId: null,
            pharmacyEmail: "",
            pharmacyPassword: "",
            pharmacyUserId: null
        });
        setCenterErrors({});
        setIsFormModalOpen(true);
    };

    const handleOpenEditCenterModal = (center: any) => {
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
            remarks: center.remarks || "",
            accountEmail: center.accountEmail || "",
            accountPassword: "",
            userId: center.userId || null,
            pharmacyEmail: center.pharmacyEmail || "",
            pharmacyPassword: "",
            pharmacyUserId: center.pharmacyUserId || null
        });
        setCenterErrors({});
        setIsFormModalOpen(true);
    };

    // Personnel Modal Controls
    const handleOpenCreatePersonnelModal = (preselectedCenterId?: string) => {
        setEditingPersonnel(null);
        setPersonnelData({
            name: "",
            role: "DOCTOR",
            specialization: "",
            licenseNumber: "",
            contactNumber: "",
            email: "",
            schedule: "Mon-Fri 8:00 AM - 5:00 PM",
            assignedServices: "General Consultation",
            status: "ACTIVE",
            healthCenterId: preselectedCenterId || (centers[0]?.id || "NONE"),
            accountEmail: "",
            accountPassword: ""
        });
        setPersonnelErrors({});
        setIsPersonnelModalOpen(true);
    };

    const handleOpenEditPersonnelModal = (p: any) => {
        setEditingPersonnel(p);
        setPersonnelData({
            name: p.name || "",
            role: p.role || "DOCTOR",
            specialization: p.specialization || "",
            licenseNumber: p.licenseNumber || "",
            contactNumber: p.contactNumber || "",
            email: p.email || "",
            schedule: p.schedule || "Mon-Fri 8:00 AM - 5:00 PM",
            assignedServices: p.assignedServices || "",
            status: p.status || "ACTIVE",
            healthCenterId: p.healthCenterId || "NONE",
            accountEmail: p.accountEmail || "",
            accountPassword: ""
        });
        setPersonnelErrors({});
        setIsPersonnelModalOpen(true);
    };

    // Location Auto Pinning
    const handleMapLocationSelect = async (lat: number, lng: number) => {
        setFormData(prev => ({ ...prev, latitude: lat, longitude: lng }));
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
            const data = await res.json();
            if (data && data.address) {
                const addr = data.address;
                const fullText = JSON.stringify(addr).toLowerCase() + " " + (data.display_name || "").toLowerCase();
                const matchedBarangay = MAPANDAN_BARANGAYS.find(b => fullText.includes(b.toLowerCase()));
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

                if (centerErrors.location) setCenterErrors(prev => ({ ...prev, location: "" }));
                toast.success(matchedBarangay ? `Building terrain pinned for Barangay ${matchedBarangay}` : "Building location pinned");
            }
        } catch (err) {
            console.warn("Reverse geocoding error:", err);
        }
    };

    const handleSearchAndPinBuilding = async () => {
        if (!formData.name || !formData.name.trim()) {
            toast.error("Please enter a Health Center Name first to search on map.");
            return;
        }
        const query = formData.name.trim();
        toast.info(`Searching building terrain for: "${query}"...`);
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(`${query}, Mapandan, Pangasinan`)}&format=json&limit=1`);
            const data = await res.json();
            if (data && data.length > 0) {
                const targetLat = parseFloat(data[0].lat);
                const targetLng = parseFloat(data[0].lon);
                await handleMapLocationSelect(targetLat, targetLng);
                toast.success(`Found building! Map zoomed to terrain.`);
            } else {
                toast.warning(`Building "${query}" not indexed on map. Click terrain to pin location.`);
            }
        } catch (err) {
            console.warn("Building search failed:", err);
        }
    };

    // Validations
    const validateCenterForm = () => {
        const errs: Record<string, string> = {};
        if (!formData.name || !formData.name.trim()) errs.name = "Health Center name is required";
        if (!formData.location || !formData.location.trim()) errs.location = "Location address is required";

        // Validate Contact Hotline
        if (formData.contactNumber && formData.contactNumber.trim()) {
            const clean = formData.contactNumber.replace(/\D/g, "");
            if (clean.startsWith("09")) {
                if (clean.length !== 11) {
                    errs.contactNumber = "Philippine mobile numbers must be exactly 11 digits (starts with 09)";
                }
            } else if (clean.startsWith("0")) {
                if (clean.length !== 10) {
                    errs.contactNumber = "Philippine landline numbers must be exactly 10 digits (starts with 0)";
                }
            } else {
                if (clean.length < 3 || clean.length > 8) {
                    errs.contactNumber = "Please enter a valid hotline number (e.g., 5-digit short code or 10-digit landline)";
                }
            }
        }

        // Validate Admin Account Password
        if (formData.accountEmail && formData.accountEmail.trim()) {
            const isNewInput = !editingCenter || 
                               !editingCenter.accountEmail || 
                               formData.accountEmail.trim().toLowerCase() !== editingCenter.accountEmail.trim().toLowerCase();
                               
            if (isNewInput) {
                if (!formData.accountPassword || !formData.accountPassword.trim()) {
                    errs.accountPassword = "Password is required for new admin accounts";
                } else if (formData.accountPassword.trim().length < 6) {
                    errs.accountPassword = "Password must be at least 6 characters long";
                }
            }
        }

        setCenterErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const validatePersonnelForm = () => {
        const errs: Record<string, string> = {};
        if (!personnelData.name || !personnelData.name.trim()) errs.name = "Personnel full name is required";
        if (!personnelData.role) errs.role = "Medical role selection is required";

        // Validate Personnel Phone Number
        if (personnelData.contactNumber && personnelData.contactNumber.trim()) {
            const clean = personnelData.contactNumber.replace(/\D/g, "");
            if (clean.startsWith("09")) {
                if (clean.length !== 11) {
                    errs.contactNumber = "Philippine mobile numbers must be exactly 11 digits (starts with 09)";
                }
            } else if (clean.startsWith("0")) {
                if (clean.length !== 10) {
                    errs.contactNumber = "Philippine landline numbers must be exactly 10 digits (starts with 0)";
                }
            } else {
                if (clean.length < 3 || clean.length > 8) {
                    errs.contactNumber = "Please enter a valid phone number (e.g. 11 digits starts with 09)";
                }
            }
        }

        setPersonnelErrors(errs);
        return Object.keys(errs).length === 0;
    };

    // Form Submissions
    const handleSubmitCenterForm = (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateCenterForm()) return;

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

    const handleSubmitPersonnelForm = (e: React.FormEvent) => {
        e.preventDefault();
        if (!validatePersonnelForm()) return;

        startTransition(async () => {
            if (editingPersonnel) {
                const res = await updateRHUMedicalPersonnel(editingPersonnel.id, personnelData);
                if (res.success) {
                    toast.success(`Updated ${personnelData.name}'s details & assignments!`);
                    setIsPersonnelModalOpen(false);
                    await refreshData();
                } else {
                    toast.error(res.error || "Failed to update medical personnel");
                }
            } else {
                const res = await createRHUMedicalPersonnel(personnelData);
                if (res.success) {
                    toast.success(`Assigned ${personnelData.name} to health center!`);
                    setIsPersonnelModalOpen(false);
                    await refreshData();
                } else {
                    toast.error(res.error || "Failed to assign medical personnel");
                }
            }
        });
    };

    const handleDeleteCenter = (center: any) => {
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

    const handleDeletePersonnel = (p: any) => {
        startTransition(async () => {
            const res = await deleteRHUMedicalPersonnel(p.id);
            if (res.success) {
                toast.success(`Medical personnel "${p.name}" removed.`);
                setDeletePersonnelTarget(null);
                await refreshData();
            } else {
                toast.error(res.error || "Failed to remove personnel");
            }
        });
    };

    // Service Toggle Helper for Personnel Modal
    const toggleServiceAssignment = (serviceName: string) => {
        const currentServices = personnelData.assignedServices
            ? personnelData.assignedServices.split(",").map(s => s.trim()).filter(Boolean)
            : [];

        const existingIndex = currentServices.findIndex(
            s => s.toLowerCase() === serviceName.toLowerCase()
        );

        let newServices: string[];
        if (existingIndex !== -1) {
            newServices = currentServices.filter((_, idx) => idx !== existingIndex);
        } else {
            newServices = [...currentServices, serviceName];
        }

        setPersonnelData(prev => ({
            ...prev,
            assignedServices: newServices.join(", ")
        }));
    };

    // Role Helper Badges
    const getRoleBadge = (role: MedicalPersonnelRole) => {
        switch (role) {
            case "DOCTOR":
                return {
                    label: "Doctor / Physician",
                    badgeClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
                    icon: Stethoscope
                };
            case "NURSE":
                return {
                    label: "Public Health Nurse",
                    badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
                    icon: Activity
                };
            case "MIDWIFE":
                return {
                    label: "Rural Midwife",
                    badgeClass: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
                    icon: UserCheck
                };
            case "DENTIST":
                return {
                    label: "Public Dentist",
                    badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
                    icon: ShieldCheck
                };
            case "ADMIN" as any:
                return {
                    label: "Center Medical Admin",
                    badgeClass: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
                    icon: ShieldCheck
                };
            case "PHARMACY" as any:
                return {
                    label: "Center Pharmacy Staff",
                    badgeClass: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20",
                    icon: Briefcase
                };
            default:
                return {
                    label: role,
                    badgeClass: "bg-slate-100 text-slate-600 border-slate-200",
                    icon: UserCheck
                };
        }
    };

    const myCenter = isCenterAdmin ? (centers[0] || null) : null;

    return (
        <div className="space-y-6">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm">
                <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2.5 bg-rose-500/10 text-rose-500 rounded-2xl">
                            <Building2 className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
                                {isCenterAdmin && myCenter ? `${myCenter.name} Workspace` : "Health Centers & Medical Roster"}
                            </h1>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                {isCenterAdmin
                                    ? `Dedicated Center Medical Administration — Manage information, operating hours, offered services, and medical personnel for ${myCenter?.name || "your health center"}.`
                                    : "Manage municipal health centers, barangay health sub-stations, and assign Doctors, Nurses, Midwives & Dentists to specific services."
                                }
                            </p>
                        </div>
                    </div>
                </div>

                {canManageCenter ? (
                    <div className="flex flex-row items-center gap-2.5 shrink-0 flex-nowrap">
                        {isCenterAdmin && myCenter && (
                            <Button
                                onClick={() => handleOpenEditCenterModal(myCenter)}
                                variant="outline"
                                className="border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl h-11 px-4 flex items-center gap-2 whitespace-nowrap shrink-0"
                            >
                                <Edit className="w-4 h-4" /> Edit Center Info
                            </Button>
                        )}
                        <Button
                            onClick={() => handleOpenCreatePersonnelModal(myCenter?.id)}
                            className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl h-11 px-5 shadow-lg shadow-rose-600/20 shrink-0 flex items-center gap-2 whitespace-nowrap"
                        >
                            <Stethoscope className="w-4 h-4" /> Assign Medical Personnel
                        </Button>
                        {!isCenterAdmin && (
                            <Button
                                onClick={handleOpenCreateCenterModal}
                                className="bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold text-xs rounded-xl h-11 px-5 shrink-0 flex items-center gap-2 whitespace-nowrap"
                            >
                                <Plus className="w-4 h-4" /> Add Health Center
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 text-xs font-bold border border-slate-200 dark:border-slate-700 flex items-center gap-2 shrink-0">
                        <Eye className="w-4 h-4 text-slate-400" /> Read-Only Staff Access
                    </div>
                )}
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-white/10 pb-2">
                <button
                    onClick={() => setActiveTab("centers")}
                    className={cn(
                        "px-5 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center gap-2",
                        activeTab === "centers"
                            ? "bg-rose-600 text-white shadow-md shadow-rose-600/20"
                            : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                    )}
                >
                    <Hospital className="w-4 h-4" /> {isCenterAdmin ? "Center Overview & Services" : `Health Centers (${totalCentersCount})`}
                </button>
                <button
                    onClick={() => setActiveTab("personnel")}
                    className={cn(
                        "px-5 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center gap-2",
                        activeTab === "personnel"
                            ? "bg-rose-600 text-white shadow-md shadow-rose-600/20"
                            : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                    )}
                >
                    <Users className="w-4 h-4" /> Medical Personnel & Staff ({totalPersonnelCount})
                </button>
            </div>

            {/* Metric Overview Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
                <Card className="rounded-2xl border-slate-200 dark:border-white/10 shadow-sm bg-white dark:bg-slate-900">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Center Status</p>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white">
                                {isCenterAdmin ? (myCenter?.status || "ACTIVE") : "ACTIVE"}
                            </h3>
                        </div>
                        <div className="p-2.5 bg-rose-50 dark:bg-rose-950/30 text-rose-600 rounded-2xl">
                            <Building2 className="w-4 h-4" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl border-slate-200 dark:border-white/10 shadow-sm bg-white dark:bg-slate-900">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Centers</p>
                            <h3 className="text-xl font-black text-rose-600 dark:text-rose-400">
                                {allActiveCount}
                            </h3>
                        </div>
                        <div className="p-2.5 bg-rose-50 dark:bg-rose-950/30 text-rose-600 rounded-2xl">
                            <Hospital className="w-4 h-4" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl border-slate-200 dark:border-white/10 shadow-sm bg-white dark:bg-slate-900">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Doctors</p>
                            <h3 className="text-xl font-black text-blue-600 dark:text-blue-400">{totalDoctorsCount}</h3>
                        </div>
                        <div className="p-2.5 bg-blue-50 dark:bg-blue-950/30 text-blue-600 rounded-2xl">
                            <Stethoscope className="w-4 h-4" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl border-slate-200 dark:border-white/10 shadow-sm bg-white dark:bg-slate-900">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nurses</p>
                            <h3 className="text-xl font-black text-emerald-600 dark:text-emerald-400">{totalNursesCount}</h3>
                        </div>
                        <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 rounded-2xl">
                            <Activity className="w-4 h-4" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl border-slate-200 dark:border-white/10 shadow-sm bg-white dark:bg-slate-900">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Midwives</p>
                            <h3 className="text-xl font-black text-purple-600 dark:text-purple-400">{totalMidwivesCount}</h3>
                        </div>
                        <div className="p-2.5 bg-purple-50 dark:bg-purple-950/30 text-purple-600 rounded-2xl">
                            <UserCheck className="w-4 h-4" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl border-slate-200 dark:border-white/10 shadow-sm bg-white dark:bg-slate-900">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Dentists</p>
                            <h3 className="text-xl font-black text-amber-600 dark:text-amber-400">{totalDentistsCount}</h3>
                        </div>
                        <div className="p-2.5 bg-amber-50 dark:bg-amber-950/30 text-amber-600 rounded-2xl">
                            <ShieldCheck className="w-4 h-4" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* TAB 1: HEALTH CENTERS VIEW */}
            {activeTab === "centers" && (
                <div className="space-y-5">
                    {/* CENTER ADMIN DEDICATED WORKSPACE */}
                    {isCenterAdmin && myCenter ? (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Left Panel: Center Information Card */}
                            <div className="lg:col-span-1 space-y-5">
                                <Card className="rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
                                    <CardContent className="p-6 space-y-6">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="space-y-1">
                                                {myCenter.code && (
                                                    <span className="inline-block px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                                                        {myCenter.code}
                                                    </span>
                                                )}
                                                <h2 className="text-xl font-black text-slate-900 dark:text-white leading-tight">
                                                    {myCenter.name}
                                                </h2>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                                    Barangay {myCenter.barangay || "Mapandan"}
                                                </p>
                                            </div>
                                            <span className="px-2.5 py-1 text-[10px] font-black uppercase rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                                                {myCenter.status || "ACTIVE"}
                                            </span>
                                        </div>

                                        <div className="space-y-4 pt-2 text-xs">
                                            <div className="flex items-start gap-3">
                                                <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                                                <div>
                                                    <p className="font-bold text-slate-900 dark:text-white">{myCenter.location || "No location address provided"}</p>
                                                    {myCenter.latitude && myCenter.longitude && (
                                                        <a
                                                            href={`https://www.google.com/maps?q=${myCenter.latitude},${myCenter.longitude}`}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="text-[10px] text-rose-600 dark:text-rose-400 hover:underline inline-flex items-center gap-1 mt-1 font-semibold"
                                                        >
                                                            Open Location Map <ExternalLink className="w-3 h-3" />
                                                        </a>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                                                <div>
                                                    <p className="text-[10px] text-slate-400 font-medium">Operating Hours</p>
                                                    <p className="font-bold text-slate-800 dark:text-slate-200">{myCenter.operatingHours || "Mon-Fri 8:00 AM - 5:00 PM"}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <Phone className="w-4 h-4 text-blue-500 shrink-0" />
                                                <div>
                                                    <p className="text-[10px] text-slate-400 font-medium">Contact Hotline</p>
                                                    <p className="font-bold text-slate-800 dark:text-slate-200">{myCenter.contactNumber || "No hotline number"}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <UserCheck className="w-4 h-4 text-purple-500 shrink-0" />
                                                <div>
                                                    <p className="text-[10px] text-slate-400 font-medium">Center Head</p>
                                                    <p className="font-bold text-slate-800 dark:text-slate-200">{myCenter.headPersonnel || "Unassigned"}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <Mail className="w-4 h-4 text-emerald-500 shrink-0" />
                                                <div>
                                                    <p className="text-[10px] text-slate-400 font-medium">Medical Admin Account</p>
                                                    <p className="font-bold text-emerald-600 dark:text-emerald-400">{myCenter.accountEmail || currentUser?.email || "N/A"}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {canManageCenter && (
                                            <Button
                                                onClick={() => handleOpenEditCenterModal(myCenter)}
                                                className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-rose-600 dark:hover:bg-rose-700 text-white text-xs font-bold rounded-2xl h-11 flex items-center justify-center gap-2 shadow-sm"
                                            >
                                                <Edit className="w-4 h-4" /> Edit Center Details & Services
                                            </Button>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Right Panel: Services Offered & Assigned Medical Staff Matrix */}
                            <div className="lg:col-span-2 space-y-5">
                                <Card className="rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm bg-white dark:bg-slate-900 p-6 space-y-4">
                                    <div className="flex items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-800">
                                        <div>
                                            <h3 className="text-base font-black text-slate-900 dark:text-white">
                                                Services Offered & Attending Staff
                                            </h3>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                                Medical services registered for {myCenter.name} and current assigned staff.
                                            </p>
                                        </div>
                                        {canManageCenter && (
                                            <Button
                                                onClick={() => handleOpenEditCenterModal(myCenter)}
                                                variant="outline"
                                                size="sm"
                                                className="text-xs font-bold rounded-xl h-9 text-rose-600 border-rose-200 hover:bg-rose-50"
                                            >
                                                Manage Offered Services
                                            </Button>
                                        )}
                                    </div>

                                    {/* Services Grid */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                        {((myCenter.servicesOffered || "General Consultation, Vaccination, Prenatal Care, Dental")
                                            .split(",")
                                            .map((s: string) => s.trim())
                                            .filter(Boolean)
                                        ).map((svc: string) => {
                                            const centerPersonnel = personnelList.filter(p => p.healthCenterId === myCenter.id);
                                            const assignedStaff = centerPersonnel.filter(p =>
                                                p.assignedServices && p.assignedServices.toLowerCase().includes(svc.toLowerCase())
                                            );
                                            const hasStaff = assignedStaff.length > 0;

                                            return (
                                                <div key={svc} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-2">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                                                            <Activity className="w-3.5 h-3.5 text-rose-500" /> {svc}
                                                        </span>
                                                        <span className={cn(
                                                            "px-2.5 py-0.5 text-[9px] font-black uppercase rounded-md",
                                                            hasStaff
                                                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                                                : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                                                        )}>
                                                            {hasStaff ? `${assignedStaff.length} Staff Assigned` : "Unassigned"}
                                                        </span>
                                                    </div>

                                                    {hasStaff ? (
                                                        <div className="space-y-1.5 pt-1">
                                                            {assignedStaff.map(st => (
                                                                <div key={st.id} className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center justify-between">
                                                                    <span className="font-semibold text-slate-900 dark:text-white">• {st.name} <span className="text-[10px] text-rose-500 font-bold">({st.role})</span></span>
                                                                    <span className="text-[10px] text-slate-400">{st.schedule}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center justify-between gap-2 pt-2">
                                                            <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">⚠️ No doctor/staff assigned</span>
                                                            {canManageCenter && (
                                                                <Button
                                                                    onClick={() => handleOpenCreatePersonnelModal(myCenter.id)}
                                                                    size="sm"
                                                                    className="h-7 text-[10px] font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg px-2.5 shrink-0"
                                                                >
                                                                    + Assign
                                                                </Button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </Card>

                                {/* Staff Roster Card */}
                                <Card className="rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm bg-white dark:bg-slate-900 p-6 space-y-4">
                                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-800">
                                        <div>
                                            <h3 className="text-base font-black text-slate-900 dark:text-white">
                                                Assigned Medical Staff ({personnelList.filter(p => p.healthCenterId === myCenter.id).length})
                                            </h3>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                                Medical, pharmacy, and administrative staff actively stationed at {myCenter.name}.
                                            </p>
                                        </div>

                                        {canManageCenter && (
                                            <Button
                                                onClick={() => handleOpenCreatePersonnelModal(myCenter.id)}
                                                className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl h-9 px-4 flex items-center gap-1.5 shrink-0"
                                            >
                                                <Plus className="w-3.5 h-3.5" /> Assign Personnel
                                            </Button>
                                        )}
                                    </div>

                                    {personnelList.filter(p => p.healthCenterId === myCenter.id).length > 0 ? (
                                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {personnelList.filter(p => p.healthCenterId === myCenter.id).map(personnel => {
                                                const badgeMeta = getRoleBadge(personnel.role);
                                                return (
                                                    <div key={personnel.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-600 font-black text-sm flex items-center justify-center shrink-0">
                                                                {personnel.name.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <h4 className="font-bold text-xs text-slate-900 dark:text-white">{personnel.name}</h4>
                                                                    <span className={cn("px-2 py-0.5 text-[9px] font-black uppercase rounded-md border", badgeMeta.badgeClass)}>
                                                                        {personnel.role}
                                                                    </span>
                                                                </div>
                                                                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                                                    {personnel.licenseNumber ? `PRC Lic: ${personnel.licenseNumber}` : "Registered Staff"}
                                                                </p>
                                                                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
                                                                    <span className="text-slate-400 dark:text-slate-500 font-normal">Assigned to:</span> {personnel.assignedServices || "General Consultation"}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {canManageCenter && (
                                                            <div className="flex items-center gap-2 self-end sm:self-center">
                                                                <Button
                                                                    onClick={() => handleOpenEditPersonnelModal(personnel)}
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-8 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                                                                >
                                                                    <Edit className="w-3.5 h-3.5 mr-1" /> Edit
                                                                </Button>
                                                                <Button
                                                                    onClick={() => setDeletePersonnelTarget(personnel)}
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-8 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5 mr-1" /> Remove
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 space-y-3">
                                            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
                                                <Stethoscope className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-sm text-slate-900 dark:text-white">No Personnel Assigned to {myCenter.name}</h4>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">Assign doctors, nurses, midwives or dentists to operate services at this center.</p>
                                            </div>
                                            {canManageCenter && (
                                                <Button
                                                    onClick={() => handleOpenCreatePersonnelModal(myCenter.id)}
                                                    className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl h-10 px-5"
                                                >
                                                    + Assign Personnel to {myCenter.name}
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                </Card>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Filter & Search Toolbar */}
                            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
                                <div className="relative flex-1">
                                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <Input
                                        type="text"
                                        placeholder="Search center name, code, barangay, address, or assigned staff..."
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
                                    {filteredCenters.map((center) => {
                                        const centerPersonnel = center.personnel || personnelList.filter(p => p.healthCenterId === center.id);

                                        return (
                                            <Card
                                                key={center.id}
                                                className="rounded-2xl border-slate-200 dark:border-white/10 shadow-sm hover:shadow-md transition-all overflow-hidden bg-white dark:bg-slate-900 flex flex-col justify-between"
                                            >
                                                <CardContent className="p-5 space-y-4">
                                                    {/* Header badge + title */}
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="space-y-1">
                                                            {center.code && (
                                                                <span className="inline-block px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                                                                    {center.code}
                                                                </span>
                                                            )}
                                                            <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                                                                {center.name}
                                                            </h3>
                                                        </div>

                                                        <div className="flex items-center gap-1.5 flex-wrap shrink-0">
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

                                                            {(!centerPersonnel || centerPersonnel.length === 0) ? (
                                                                <span className="px-2.5 py-0.5 text-[10px] font-extrabold uppercase rounded-full shrink-0 bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center gap-1">
                                                                    <AlertTriangle className="w-3 h-3 text-rose-500" />
                                                                    No Assigned Doctor
                                                                </span>
                                                            ) : !centerPersonnel.some((p: any) => p.role === "DOCTOR") ? (
                                                                <span className="px-2.5 py-0.5 text-[10px] font-extrabold uppercase rounded-full shrink-0 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1">
                                                                    <AlertTriangle className="w-3 h-3 text-amber-500" />
                                                                    No Assigned Doctor
                                                                </span>
                                                            ) : null}
                                                        </div>
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

                                                        {center.accountEmail && (
                                                            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                                                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                                                <span>Medical Admin Account: <strong className="font-bold">{center.accountEmail}</strong></span>
                                                            </div>
                                                        )}
                                                        {center.pharmacyEmail && (
                                                            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                                                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                                                <span>Pharmacy Account: <strong className="font-bold">{center.pharmacyEmail}</strong></span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* ASSIGNED MEDICAL PERSONNEL SECTION */}
                                                    <div className="pt-3 border-t border-slate-100 dark:border-white/5 space-y-2">
                                                        <div className="flex items-center justify-between">
                                                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                                                                <Stethoscope className="w-3 h-3 text-blue-500" /> Assigned Medical Personnel ({centerPersonnel.length})
                                                            </p>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleOpenCreatePersonnelModal(center.id)}
                                                                className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline flex items-center gap-0.5"
                                                            >
                                                                <Plus className="w-3 h-3" /> Assign Staff
                                                            </button>
                                                        </div>

                                                        {centerPersonnel.length > 0 ? (
                                                            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1.5 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-200 dark:[&::-webkit-scrollbar-thumb]:bg-slate-700/80 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-300 dark:hover:[&::-webkit-scrollbar-thumb]:bg-slate-600">
                                                                {centerPersonnel.map((p: any) => {
                                                                    const badge = getRoleBadge(p.role);
                                                                    return (
                                                                        <div
                                                                            key={p.id}
                                                                            className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-start justify-between gap-2 text-xs"
                                                                        >
                                                                            <div className="space-y-0.5">
                                                                                <div className="flex items-center gap-1.5">
                                                                                    <span className={cn("px-1.5 py-0.2 text-[9px] font-black uppercase rounded-md border", badge.badgeClass)}>
                                                                                        {p.role}
                                                                                    </span>
                                                                                    <span className="font-bold text-slate-800 dark:text-slate-100">{p.name}</span>
                                                                                </div>
                                                                                {p.assignedServices && (
                                                                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium pl-1">
                                                                                        <span className="text-slate-400 dark:text-slate-500 font-semibold">Services:</span> {p.assignedServices}
                                                                                    </p>
                                                                                )}
                                                                                {p.accountEmail && (
                                                                                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium pl-1 flex items-center gap-1">
                                                                                        <ShieldCheck className="w-3 h-3 text-emerald-500 shrink-0" />
                                                                                        <span>Login: {p.accountEmail}</span>
                                                                                    </p>
                                                                                )}
                                                                            </div>

                                                                            <button
                                                                                onClick={() => handleOpenEditPersonnelModal(p)}
                                                                                className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                                                                                title="Edit Personnel Assignment"
                                                                            >
                                                                                <Edit className="w-3 h-3" />
                                                                            </button>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        ) : (
                                                            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between gap-2">
                                                                <div className="flex items-center gap-2">
                                                                    <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                                                                    <div>
                                                                        <p className="text-[11px] font-bold text-rose-700 dark:text-rose-300">No Assigned Doctor / Staff</p>
                                                                        <p className="text-[10px] text-rose-600/80 dark:text-rose-400/80">Services registered, but no medical personnel assigned yet.</p>
                                                                    </div>
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleOpenCreatePersonnelModal(center.id)}
                                                                    className="px-2 py-1 text-[10px] font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm shrink-0 transition-colors"
                                                                >
                                                                    + Assign
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Services Offered Chips with Assignment Status */}
                                                    {center.servicesOffered && (
                                                        <div className="pt-2 border-t border-slate-100 dark:border-white/5 space-y-1.5">
                                                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Services Offered</p>
                                                            <div className="flex flex-wrap gap-1.5">
                                                                {center.servicesOffered.split(",").map((svc: string, i: number) => {
                                                                    const cleanSvc = svc.trim();
                                                                    if (!cleanSvc) return null;

                                                                    const assignedStaff = centerPersonnel.filter((p: any) =>
                                                                        p.assignedServices &&
                                                                        p.assignedServices
                                                                            .split(",")
                                                                            .map((s: string) => s.trim().toLowerCase())
                                                                            .includes(cleanSvc.toLowerCase())
                                                                    );

                                                                    const isAssigned = assignedStaff.length > 0;

                                                                    return (
                                                                        <span
                                                                            key={i}
                                                                            className={cn(
                                                                                "px-2.5 py-1 text-[10px] font-semibold rounded-lg border flex items-center gap-1.5 transition-all cursor-default",
                                                                                isAssigned
                                                                                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                                                                                    : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 shadow-sm"
                                                                            )}
                                                                        >
                                                                            {isAssigned ? (
                                                                                <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                                                                            ) : (
                                                                                <AlertTriangle className="w-3 h-3 text-rose-500 shrink-0" />
                                                                            )}

                                                                            <span className="font-bold">{cleanSvc}</span>

                                                                            {!isAssigned && (
                                                                                <span className="text-[9px] px-1.5 py-0.2 rounded font-extrabold uppercase shrink-0 bg-rose-500/20 text-rose-700 dark:text-rose-200">
                                                                                    Unassigned
                                                                                </span>
                                                                            )}
                                                                        </span>
                                                                    );
                                                                })}
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
                                                            onClick={() => handleOpenEditCenterModal(center)}
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
                                        );
                                    })}
                                </div>
                            ) : (
                                <Card className="rounded-2xl border-slate-200 dark:border-white/10 p-12 text-center bg-white dark:bg-slate-900">
                                    <Hospital className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                                    <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">No Health Centers Found</h3>
                                    <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                                        No health center matches your search criteria.
                                    </p>
                                    <Button
                                        onClick={handleOpenCreateCenterModal}
                                        className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl h-10 px-4"
                                    >
                                        <Plus className="w-4 h-4 mr-1.5" /> Add Health Center
                                    </Button>
                                </Card>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* TAB 2: MEDICAL PERSONNEL ROSTER VIEW */}
            {activeTab === "personnel" && (
                <div className="space-y-5">
                    {/* Personnel Filter Toolbar */}
                    <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
                        <div className="relative flex-1">
                            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <Input
                                type="text"
                                placeholder="Search personnel name, license #, or assigned services..."
                                value={personnelSearch}
                                onChange={(e) => setPersonnelSearch(e.target.value)}
                                className="pl-10 h-10 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
                            />
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <Select value={roleFilter} onValueChange={setRoleFilter}>
                                <SelectTrigger className="h-10 text-xs w-[160px] rounded-xl bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
                                    <SelectValue placeholder="Medical Role" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">All Medical Roles</SelectItem>
                                    <SelectItem value="DOCTOR">Doctors / Physicians</SelectItem>
                                    <SelectItem value="NURSE">Nurses</SelectItem>
                                    <SelectItem value="MIDWIFE">Midwives</SelectItem>
                                    <SelectItem value="DENTIST">Dentists</SelectItem>
                                    <SelectItem value="ADMIN">Center Medical Admins</SelectItem>
                                    <SelectItem value="PHARMACY">Pharmacy Staff</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select value={personnelCenterFilter} onValueChange={setPersonnelCenterFilter}>
                                <SelectTrigger className="h-10 text-xs w-[180px] rounded-xl bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
                                    <SelectValue placeholder="Health Center" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">All Health Centers</SelectItem>
                                    <SelectItem value="UNASSIGNED">Unassigned Only</SelectItem>
                                    {centers.map(c => (
                                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Personnel Cards Roster Grid */}
                    {filteredPersonnel.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {filteredPersonnel.map((p) => {
                                const badge = getRoleBadge(p.role);
                                const RoleIcon = badge.icon;
                                const assignedCenter = centers.find(c => c.id === p.healthCenterId);

                                return (
                                    <Card
                                        key={p.id}
                                        className="rounded-2xl border-slate-200 dark:border-white/10 shadow-sm hover:shadow-md transition-all overflow-hidden bg-white dark:bg-slate-900 flex flex-col justify-between"
                                    >
                                        <CardContent className="p-5 space-y-4">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-500">
                                                        <RoleIcon className="w-5 h-5" />
                                                    </div>
                                                    <div className="space-y-0.5">
                                                        <span className={cn("inline-block px-2 py-0.5 text-[10px] font-black uppercase rounded-md border", badge.badgeClass)}>
                                                            {badge.label}
                                                        </span>
                                                        <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                                                            {p.name}
                                                        </h3>
                                                    </div>
                                                </div>

                                                <span
                                                    className={cn(
                                                        "px-2.5 py-0.5 text-[10px] font-black uppercase rounded-full shrink-0",
                                                        p.status === "ACTIVE"
                                                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                                            : p.status === "ON_LEAVE"
                                                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                                                                : "bg-slate-200 dark:bg-slate-800 text-slate-500"
                                                    )}
                                                >
                                                    {p.status.replace("_", " ")}
                                                </span>
                                            </div>

                                            {/* Details list */}
                                            <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                                                {p.licenseNumber && (
                                                    <div className="flex items-center gap-2">
                                                        <BadgeCheck className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                                        <span>PRC License: <strong className="font-mono text-slate-800 dark:text-slate-200">{p.licenseNumber}</strong></span>
                                                    </div>
                                                )}

                                                <div className="flex items-center gap-2">
                                                    <Hospital className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                                    <span>Assigned Center: <strong className="text-slate-800 dark:text-slate-100">{assignedCenter ? assignedCenter.name : (p.healthCenter?.name || "Unassigned")}</strong></span>
                                                </div>

                                                {p.schedule && (
                                                    <div className="flex items-center gap-2">
                                                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                        <span>{p.schedule}</span>
                                                    </div>
                                                )}

                                                {p.contactNumber && (
                                                    <div className="flex items-center gap-2">
                                                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                        <span>{p.contactNumber}</span>
                                                    </div>
                                                )}

                                                {p.email && (
                                                    <div className="flex items-center gap-2">
                                                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                        <span className="truncate">{p.email}</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Assigned Services Tags */}
                                            {p.assignedServices && (
                                                <div className="pt-2 border-t border-slate-100 dark:border-white/5 space-y-1.5">
                                                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Assigned Services</p>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {p.assignedServices.split(",").map((svc: string, i: number) => (
                                                            <span
                                                                key={i}
                                                                className="px-2 py-0.5 text-[10px] font-medium rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50"
                                                            >
                                                                {svc.trim()}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </CardContent>

                                        {/* Action buttons */}
                                        {canManageCenter && (
                                            <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-white/5 flex items-center justify-end gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleOpenEditPersonnelModal(p)}
                                                    className="h-8 px-3 text-xs font-semibold rounded-lg hover:border-rose-400 hover:text-rose-600"
                                                >
                                                    <Edit className="w-3.5 h-3.5 mr-1" /> Edit / Reassign
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setDeletePersonnelTarget(p)}
                                                    className="h-8 px-3 text-xs font-semibold rounded-lg text-rose-600 border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5 mr-1" /> Remove
                                                </Button>
                                            </div>
                                        )}
                                    </Card>
                                );
                            })}
                        </div>
                    ) : (
                        <Card className="rounded-2xl border-slate-200 dark:border-white/10 p-12 text-center bg-white dark:bg-slate-900">
                            <Users className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                            <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">No Medical Personnel Found</h3>
                            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                                No personnel match your filter criteria. Click below to add medical personnel.
                            </p>
                            <Button
                                onClick={() => handleOpenCreatePersonnelModal()}
                                className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl h-10 px-4"
                            >
                                <Plus className="w-4 h-4 mr-1.5" /> Assign Medical Personnel
                            </Button>
                        </Card>
                    )}
                </div>
            )}

            {/* MODAL 1: ADD / EDIT HEALTH CENTER */}
            <Dialog open={isFormModalOpen} onOpenChange={setIsFormModalOpen}>
                <DialogContent className="sm:max-w-[1100px] max-w-[1100px] w-full max-h-[92vh] overflow-y-auto scrollbar-none rounded-3xl p-6">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                            <Building2 className="w-5 h-5 text-rose-500" />
                            {editingCenter ? "Edit Health Center" : "Add New Health Center"}
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            {editingCenter
                                ? "Update health center details, head personnel, and operating hours."
                                : "Register a new health center or barangay health station in Mapandan."}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmitCenterForm} className="space-y-4 py-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                            {/* LEFT COLUMN */}
                            <div className="space-y-4">
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
                                        placeholder="e.g., Mapandan Main RHU or Coral Health Station"
                                        value={formData.name}
                                        onChange={(e) => {
                                            setFormData({ ...formData, name: e.target.value });
                                            if (centerErrors.name) setCenterErrors({ ...centerErrors, name: "" });
                                        }}
                                        className={cn(
                                            "h-10 text-xs rounded-xl",
                                            centerErrors.name ? "border-red-500 focus-visible:ring-red-500" : ""
                                        )}
                                    />
                                    {centerErrors.name && (
                                        <p className="text-[10px] text-red-500 font-medium">{centerErrors.name}</p>
                                    )}
                                </div>

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
                                            if (centerErrors.location) setCenterErrors({ ...centerErrors, location: "" });
                                        }}
                                        className={cn(
                                            "h-10 text-xs rounded-xl",
                                            centerErrors.location ? "border-red-500 focus-visible:ring-red-500" : ""
                                        )}
                                    />
                                    {centerErrors.location && (
                                        <p className="text-[10px] text-red-500 font-medium">{centerErrors.location}</p>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Head Staff / Officer</Label>
                                        <Input
                                            type="text"
                                            placeholder="e.g., Dr. Municipal Health Officer"
                                            value={formData.headPersonnel}
                                            onChange={(e) => setFormData({ ...formData, headPersonnel: e.target.value })}
                                            className="h-10 text-xs rounded-xl"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Contact Hotline</Label>
                                        <Input
                                            type="text"
                                            placeholder="e.g., 0917-123-4567 or 075-555-0102"
                                            value={formData.contactNumber}
                                            onChange={(e) => {
                                                setFormData({ ...formData, contactNumber: formatPHPhoneNumber(e.target.value) });
                                                if (centerErrors.contactNumber) setCenterErrors(prev => ({ ...prev, contactNumber: "" }));
                                            }}
                                            className={`h-10 text-xs rounded-xl border ${
                                                centerErrors.contactNumber
                                                    ? "border-red-500 focus-visible:ring-red-500"
                                                    : "border-slate-200 dark:border-slate-700"
                                            }`}
                                        />
                                        {centerErrors.contactNumber && (
                                            <p className="text-[10px] text-red-500 font-medium mt-1 animate-fadeIn">
                                                {centerErrors.contactNumber}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Operating Hours</Label>
                                        <Input
                                            type="text"
                                            disabled={!isCenterAdmin}
                                            placeholder="e.g., Mon-Fri 8:00 AM - 5:00 PM"
                                            value={formData.operatingHours}
                                            onChange={(e) => isCenterAdmin && setFormData({ ...formData, operatingHours: e.target.value })}
                                            className="h-10 text-xs rounded-xl disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:cursor-not-allowed"
                                        />
                                        {!isCenterAdmin && (
                                            <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold mt-0.5">
                                                Center operating schedule is managed directly by the Health Center Admin.
                                            </p>
                                        )}
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

                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Services Offered (Comma Separated)</Label>
                                    <textarea
                                        placeholder="e.g., General Consultation, Vaccination, Prenatal Care"
                                        value={formData.servicesOffered}
                                        onChange={(e) => {
                                            setFormData({ ...formData, servicesOffered: e.target.value });
                                            e.target.style.height = "auto";
                                            e.target.style.height = `${e.target.scrollHeight}px`;
                                        }}
                                        ref={(el) => {
                                            if (el) {
                                                el.style.height = "auto";
                                                el.style.height = `${el.scrollHeight}px`;
                                            }
                                        }}
                                        rows={2}
                                        className="w-full text-xs rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700/60 p-3 text-slate-900 dark:text-slate-100 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 resize-none min-h-[52px] transition-all"
                                    />

                                    {/* LIVE SERVICES PREVIEW & PRESET CHIPS */}
                                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2.5">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                                <Activity className="w-3 h-3 text-rose-500" /> Live Services Preview ({
                                                    (formData.servicesOffered || "")
                                                        .split(",")
                                                        .map(s => s.trim())
                                                        .filter(Boolean).length
                                                })
                                            </span>
                                            <span className="text-[9px] text-slate-400">Click &apos;x&apos; to remove</span>
                                        </div>

                                        {((formData.servicesOffered || "")
                                            .split(",")
                                            .map(s => s.trim())
                                            .filter(Boolean)
                                        ).length > 0 ? (
                                            <div className="flex flex-wrap gap-1.5">
                                                {((formData.servicesOffered || "")
                                                    .split(",")
                                                    .map(s => s.trim())
                                                    .filter(Boolean)
                                                ).map((svc, idx) => (
                                                    <span
                                                        key={idx}
                                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-300 border border-rose-500/20"
                                                    >
                                                        <span>{svc}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const currentList = (formData.servicesOffered || "")
                                                                    .split(",")
                                                                    .map(s => s.trim())
                                                                    .filter(Boolean);
                                                                const updated = currentList.filter(s => s.toLowerCase() !== svc.toLowerCase()).join(", ");
                                                                setFormData({ ...formData, servicesOffered: updated });
                                                            }}
                                                            className="hover:bg-rose-500/20 rounded-full p-0.5 text-rose-500 transition-colors"
                                                        >
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    </span>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-[11px] text-slate-400 italic">No services added yet. Type service names above separated by commas.</p>
                                        )}
                                    </div>

                                    <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1 pt-0.5">
                                        <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
                                        Center will be marked as &quot;No Assigned Doctor&quot; until staff are assigned.
                                    </p>
                                </div>

                                {/* Center Medical Admin Account Credentials */}
                                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                            <ShieldCheck className="w-4 h-4 text-rose-500" /> Center Medical Admin Account (Optional)
                                        </Label>
                                        {formData.accountEmail ? (
                                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                                                🔐 Medical Admin Configured
                                            </span>
                                        ) : (
                                            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                                                Not Configured
                                            </span>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                                                Admin Email Address
                                            </Label>
                                            <Input
                                                type="email"
                                                placeholder="e.g. lalas.medical.clinic@mapandan.gov.ph"
                                                value={formData.accountEmail || ""}
                                                onChange={(e) => setFormData(prev => ({ ...prev, accountEmail: e.target.value }))}
                                                className="h-9 text-xs rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 flex items-center justify-between">
                                                <span>Account Password</span>
                                                {formData.accountEmail && formData.accountEmail.trim() && (
                                                    (!editingCenter || !editingCenter.accountEmail || formData.accountEmail.trim().toLowerCase() !== editingCenter.accountEmail.trim().toLowerCase())
                                                ) ? (
                                                    <span className="text-[9px] text-rose-500 font-semibold">*Required</span>
                                                ) : (
                                                    <span className="text-[9px] text-slate-400 font-normal">(Optional)</span>
                                                )}
                                            </Label>
                                            <Input
                                                type="password"
                                                placeholder={
                                                    formData.accountEmail && formData.accountEmail.trim() && (
                                                        (!editingCenter || !editingCenter.accountEmail || formData.accountEmail.trim().toLowerCase() !== editingCenter.accountEmail.trim().toLowerCase())
                                                    ) ? "Enter account password" : "Leave blank to keep current"
                                                }
                                                value={formData.accountPassword || ""}
                                                onChange={(e) => {
                                                    setFormData(prev => ({ ...prev, accountPassword: e.target.value }));
                                                    if (centerErrors.accountPassword) setCenterErrors(prev => ({ ...prev, accountPassword: "" }));
                                                }}
                                                className={`h-9 text-xs rounded-xl bg-white dark:bg-slate-900 border ${
                                                    centerErrors.accountPassword
                                                        ? "border-red-500 focus-visible:ring-red-500"
                                                        : "border-slate-200 dark:border-slate-700"
                                                }`}
                                            />
                                            {centerErrors.accountPassword && (
                                                <p className="text-[10px] text-red-500 font-medium mt-1 animate-fadeIn">
                                                    {centerErrors.accountPassword}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                                        💡 You can update the center email or type a new password to reset account credentials.
                                    </p>
                                </div>
                            </div>

                            {/* RIGHT COLUMN: Map Location Picker */}
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
                                    📍 Click anywhere on the map terrain to pin the exact position in Mapandan.
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

            {/* MODAL 2: ASSIGN / EDIT MEDICAL PERSONNEL */}
            <Dialog open={isPersonnelModalOpen} onOpenChange={setIsPersonnelModalOpen}>
                <DialogContent className="sm:max-w-[720px] max-h-[92vh] overflow-y-auto scrollbar-none rounded-3xl p-6">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                            <Stethoscope className="w-5 h-5 text-rose-500" />
                            {editingPersonnel ? "Edit Medical Personnel Assignment" : "Assign Medical Personnel"}
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Assign Doctors, Nurses, Midwives, or Dentists to a specific Mapandan health center and designate their health services.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmitPersonnelForm} className="space-y-4 py-2">
                        {/* Name & Role Row */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                    Full Name & Honorific <span className="text-rose-500">*</span>
                                </Label>
                                <Input
                                    type="text"
                                    placeholder="e.g., Dr. Juan dela Cruz or Nurse Elena Garcia"
                                    value={personnelData.name}
                                    onChange={(e) => {
                                        setPersonnelData({ ...personnelData, name: e.target.value });
                                        if (personnelErrors.name) setPersonnelErrors({ ...personnelErrors, name: "" });
                                    }}
                                    className={cn(
                                        "h-10 text-xs rounded-xl",
                                        personnelErrors.name ? "border-red-500 focus-visible:ring-red-500" : ""
                                    )}
                                />
                                {personnelErrors.name && (
                                    <p className="text-[10px] text-red-500 font-medium">{personnelErrors.name}</p>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                    Medical Role <span className="text-rose-500">*</span>
                                </Label>
                                <Select
                                    value={personnelData.role || "DOCTOR"}
                                    onValueChange={(val: MedicalPersonnelRole) => setPersonnelData({ ...personnelData, role: val })}
                                >
                                    <SelectTrigger className={cn("h-10 text-xs rounded-xl", personnelErrors.role ? "border-red-500 focus-visible:ring-red-500" : "")}>
                                        <SelectValue placeholder="Select Role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="DOCTOR">Doctor / Physician</SelectItem>
                                        <SelectItem value="NURSE">Public Health Nurse</SelectItem>
                                        <SelectItem value="MIDWIFE">Rural Midwife</SelectItem>
                                        <SelectItem value="DENTIST">Dentist</SelectItem>
                                        <SelectItem value="ADMIN">Center Medical Admin</SelectItem>
                                        <SelectItem value="PHARMACY">Center Pharmacy Staff</SelectItem>
                                    </SelectContent>
                                </Select>
                                {personnelErrors.role && (
                                    <p className="text-[10px] text-red-500 font-medium">{personnelErrors.role}</p>
                                )}
                            </div>
                        </div>

                        {/* License Number & Duty Status */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">PRC License Number</Label>
                                <Input
                                    type="text"
                                    placeholder="e.g., PRC-0129843"
                                    value={personnelData.licenseNumber}
                                    onChange={(e) => setPersonnelData({ ...personnelData, licenseNumber: e.target.value })}
                                    className="h-10 text-xs rounded-xl"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Duty Status</Label>
                                <Select
                                    value={personnelData.status || "ACTIVE"}
                                    onValueChange={(val) => setPersonnelData({ ...personnelData, status: val })}
                                >
                                    <SelectTrigger className="h-10 text-xs rounded-xl">
                                        <SelectValue placeholder="Duty Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ACTIVE">Active / On Duty</SelectItem>
                                        <SelectItem value="ON_LEAVE">On Leave</SelectItem>
                                        <SelectItem value="INACTIVE">Inactive</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Health Center & Schedule */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Assigned Health Center</Label>
                                <Select
                                    value={personnelData.healthCenterId || "NONE"}
                                    onValueChange={(val) => setPersonnelData({ ...personnelData, healthCenterId: val })}
                                >
                                    <SelectTrigger className="h-10 text-xs rounded-xl">
                                        <SelectValue placeholder="Select Health Center" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="NONE">-- Unassigned / Roaming --</SelectItem>
                                        {centers.map(c => (
                                            <SelectItem key={c.id} value={c.id}>{c.name} ({c.barangay})</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Duty Schedule</Label>
                                <Input
                                    type="text"
                                    placeholder="e.g., Mon-Fri 8:00 AM - 5:00 PM"
                                    value={personnelData.schedule}
                                    onChange={(e) => setPersonnelData({ ...personnelData, schedule: e.target.value })}
                                    className="h-10 text-xs rounded-xl"
                                />
                            </div>
                        </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Contact Number & Email</Label>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="flex flex-col gap-1">
                                        <Input
                                            type="text"
                                            placeholder="Phone (e.g. 0917-123-4567)"
                                            value={personnelData.contactNumber}
                                            onChange={(e) => {
                                                setPersonnelData({ ...personnelData, contactNumber: formatPHPhoneNumber(e.target.value) });
                                                if (personnelErrors.contactNumber) setPersonnelErrors(prev => ({ ...prev, contactNumber: "" }));
                                            }}
                                            className={`h-10 text-xs rounded-xl border ${
                                                personnelErrors.contactNumber
                                                    ? "border-red-500 focus-visible:ring-red-500"
                                                    : "border-slate-200 dark:border-slate-700"
                                            }`}
                                        />
                                        {personnelErrors.contactNumber && (
                                            <p className="text-[10px] text-red-500 font-medium leading-none mt-1 animate-fadeIn">
                                                {personnelErrors.contactNumber}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <Input
                                            type="email"
                                            placeholder="Email"
                                            value={personnelData.email}
                                            onChange={(e) => setPersonnelData({ ...personnelData, email: e.target.value })}
                                            className="h-10 text-xs rounded-xl border border-slate-200 dark:border-slate-700"
                                        />
                                    </div>
                                </div>
                            </div>

                        {/* Staff User Account Credentials */}
                        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-2.5">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                    <ShieldCheck className="w-4 h-4 text-rose-500" /> Staff User Account Login (Optional)
                                </Label>
                                {personnelData.accountEmail ? (
                                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                                        🔐 Staff Login Active
                                    </span>
                                ) : (
                                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                                        No Login Created
                                    </span>
                                )}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                <Input
                                    type="email"
                                    placeholder="Staff Login Email (dr.emil@mapandan.gov.ph)"
                                    value={personnelData.accountEmail || personnelData.email || ""}
                                    onChange={(e) => setPersonnelData({ ...personnelData, accountEmail: e.target.value, email: e.target.value })}
                                    className="h-10 text-xs rounded-xl"
                                />
                                <Input
                                    type="password"
                                    placeholder={editingPersonnel ? "Password (leave blank to keep)" : "Staff Password (min 6 chars)"}
                                    value={personnelData.accountPassword || ""}
                                    onChange={(e) => setPersonnelData({ ...personnelData, accountPassword: e.target.value })}
                                    className="h-10 text-xs rounded-xl"
                                />
                            </div>
                        </div>

                        {/* Assigned Health Services Selection (Dynamic from Health Center input) */}
                        {(() => {
                            const selectedCenter = centers.find(c => c.id === personnelData.healthCenterId);

                            // Dynamic services from the selected health center
                            const centerServices = selectedCenter?.servicesOffered
                                ? selectedCenter.servicesOffered.split(",").map((s: string) => s.trim()).filter(Boolean)
                                : [];

                            // Dynamic unique services across ALL health centers registered in the database
                            const allCentersServices: string[] = Array.from(
                                new Set(
                                    centers
                                        .flatMap((c: any) => (c.servicesOffered || "").split(",").map((s: string) => s.trim()))
                                        .filter(Boolean)
                                )
                            );

                            const fallbackServices: string[] = [
                                "General Consultation",
                                "Vaccination & Immunization",
                                "Maternal & Child Health",
                                "Prenatal Care",
                                "Dental Services",
                                "Animal Bite Care",
                                "Laboratory & Diagnostics",
                                "BP & Diabetes Screening"
                            ];

                            const typedServices = personnelData.assignedServices
                                ? personnelData.assignedServices.split(",").map((s: string) => s.trim()).filter(Boolean)
                                : [];

                            const baseChips = centerServices.length > 0
                                ? centerServices
                                : (allCentersServices.length > 0 ? allCentersServices : fallbackServices);

                            // Combine base chips and custom typed services so chips update live
                            const availablePrimaryChips: string[] = Array.from(new Set([...baseChips, ...typedServices]));

                            return (
                                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-white/5">
                                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                        Assigned Health Services
                                    </Label>

                                    {/* Dynamic Service Chips */}
                                    <div className="flex flex-wrap gap-1.5">
                                        {availablePrimaryChips.map((svc: string) => {
                                            const currentServices = personnelData.assignedServices
                                                ? personnelData.assignedServices.split(",").map((s: string) => s.trim())
                                                : [];
                                            const isSelected = currentServices.some(s => s.toLowerCase() === svc.toLowerCase());

                                            return (
                                                <button
                                                    type="button"
                                                    key={svc}
                                                    onClick={() => toggleServiceAssignment(svc)}
                                                    className={cn(
                                                        "px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all border flex items-center gap-1",
                                                        isSelected
                                                            ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                                                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-rose-400"
                                                    )}
                                                >
                                                    {isSelected && <CheckCircle2 className="w-3 h-3" />}
                                                    {svc}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    <Input
                                        type="text"
                                        placeholder="Or type additional dynamic services (comma separated)..."
                                        value={personnelData.assignedServices}
                                        onChange={(e) => setPersonnelData({ ...personnelData, assignedServices: e.target.value })}
                                        className="h-10 text-xs rounded-xl mt-2"
                                    />
                                </div>
                            );
                        })()}

                        <DialogFooter className="pt-3 gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsPersonnelModalOpen(false)}
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
                                {isPending ? "Saving..." : editingPersonnel ? "Update Assignment" : "Assign Personnel"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* DELETE HEALTH CENTER CONFIRMATION MODAL */}
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
                            onClick={() => handleDeleteCenter(deleteCenterTarget)}
                            disabled={isPending}
                            className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs h-9 font-bold px-4"
                        >
                            {isPending ? "Deleting..." : "Delete Center"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* DELETE PERSONNEL CONFIRMATION MODAL */}
            <Dialog open={!!deletePersonnelTarget} onOpenChange={(open) => !open && setDeletePersonnelTarget(null)}>
                <DialogContent className="sm:max-w-[400px] rounded-2xl p-6">
                    <DialogHeader className="space-y-2">
                        <DialogTitle className="text-base font-bold text-rose-600 flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-rose-500" />
                            Remove Medical Personnel
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-600 dark:text-slate-300">
                            Are you sure you want to remove <strong>{deletePersonnelTarget?.name}</strong> from personnel assignments?
                        </DialogDescription>
                    </DialogHeader>

                    <DialogFooter className="gap-2 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setDeletePersonnelTarget(null)}
                            disabled={isPending}
                            className="rounded-xl text-xs h-9"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={() => handleDeletePersonnel(deletePersonnelTarget)}
                            disabled={isPending}
                            className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs h-9 font-bold px-4"
                        >
                            {isPending ? "Removing..." : "Remove Personnel"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
