"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    CheckCircle2,
    Calculator,
    Building2,
    ChevronRight,
    Loader2,
    Home,
    Sparkles,
    Calendar,
    FileText,
    ArrowLeft,
    Upload,
    Receipt,
    UserCheck,
    Search,
    ShieldCheck,
    Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import PrivacyTermsModal from "@/components/shared/PrivacyTermsModal";
import DocumentViewerModal from "@/components/shared/DocumentViewerModal";
import SchedulePicker from "@/components/shared/SchedulePicker";
import { toast } from "sonner";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { submitRptAppointment, fetchPropertyByTdnOrPin } from "./actions";

type Step = "CATEGORY" | "PROPERTY" | "SCHEDULE" | "CONFIRM" | "SUCCESS";

const STEPS: { id: Step; label: string; icon: any }[] = [
    { id: "CATEGORY", label: "Category", icon: Sparkles },
    { id: "PROPERTY", label: "Property Info", icon: Calculator },
    { id: "SCHEDULE", label: "Schedule", icon: Calendar },
    { id: "CONFIRM", label: "Submit", icon: CheckCircle2 },
];

const DEFAULT_BARANGAYS = [
    "Abalos", "Amis", "Amanperez", "Apaya", "Calaocan",
    "Coral", "Golden", "Jimenez", "Nilombot", "Poblacion",
    "Primicias", "Santa Barbara", "Torres", "Luyan"
];

interface RptAppointmentClientProps {
    resident?: any;
    barangays?: string[];
    themeColor?: string;
    branding?: { logo?: string | null; word1?: string; word2?: string };
    config?: any;
    bookedSlots?: { appointmentDate: Date; appointmentSlot: string }[];
    treasuryConfig?: any;
    assessorConfig?: any;
    treasuryBookedSlots?: any[];
    assessorBookedSlots?: any[];
}

export function RptAppointmentClient({
    resident,
    barangays = [],
    themeColor = "#2563eb",
    config,
    bookedSlots = [],
    treasuryConfig,
    assessorConfig,
    treasuryBookedSlots = [],
    assessorBookedSlots = []
}: RptAppointmentClientProps) {
    const barangayList = barangays.length > 0 ? barangays : DEFAULT_BARANGAYS;
    const [currentStep, setCurrentStep] = useState<Step>("CATEGORY");
    const [submitting, setSubmitting] = useState(false);

    // Form inputs state — required inputs start empty per project rules
    const [lookupQuery, setLookupQuery] = useState<string>("");
    const [categoryCode, setCategoryCode] = useState<string>("RPT_CAT1");

    const activeConfig = categoryCode === "RPT_CAT1" ? (treasuryConfig || config) : (assessorConfig || config);
    const activeBookedSlots = categoryCode === "RPT_CAT1" ? (treasuryBookedSlots.length > 0 ? treasuryBookedSlots : bookedSlots) : (assessorBookedSlots.length > 0 ? assessorBookedSlots : bookedSlots);
    const [tdn, setTdn] = useState<string>("");
    const [pin, setPin] = useState<string>("");
    const [ownerName, setOwnerName] = useState<string>(resident?.name || "");
    const [propertyAddress, setPropertyAddress] = useState<string>("");
    const [barangay, setBarangay] = useState<string>(resident?.barangay || "");
    const [propertyType, setPropertyType] = useState<string>("");
    const [assessedValue, setAssessedValue] = useState<string>("");

    // Schedule state
    const [selectedDate, setSelectedDate] = useState<string>("");
    const [selectedSlot, setSelectedSlot] = useState<string>("");

    // Files state
    const [validIdFile, setValidIdFile] = useState<File | null>(null);
    const [previousOrFile, setPreviousOrFile] = useState<File | null>(null);
    const [buildingPermitFile, setBuildingPermitFile] = useState<File | null>(null);
    const [deedOfSaleFile, setDeedOfSaleFile] = useState<File | null>(null);
    const [titleFile, setTitleFile] = useState<File | null>(null);
    const [birEcarFile, setBirEcarFile] = useState<File | null>(null);

    // Validation & Modal states
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSearchingTdn, setIsSearchingTdn] = useState(false);
    const [privacyAccepted, setPrivacyAccepted] = useState(false);
    const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);

    // Document Viewer state
    const [viewerOpen, setViewerOpen] = useState(false);
    const [viewerFile, setViewerFile] = useState<File | null>(null);
    const [viewerUrl, setViewerUrl] = useState<string | null>(null);
    const [viewerTitle, setViewerTitle] = useState("");

    // Submission outcome state
    const [submissionResult, setSubmissionResult] = useState<{
        queueNumber: string;
        soaReferenceCode: string;
        totalTaxDue: number;
    } | null>(null);

    // Document viewer handler
    const handleViewFile = (file: File | null, url: string | null, title?: string) => {
        setViewerFile(file);
        setViewerUrl(url);
        setViewerTitle(title || "Document Viewer");
        setViewerOpen(true);
    };

    // Calculate RPT Tax amounts
    const numericAV = parseFloat(assessedValue) || 0;
    const basicTax = Math.round(numericAV * 0.01 * 100) / 100;
    const sefTax = Math.round(numericAV * 0.01 * 100) / 100;
    const totalTaxDue = basicTax + sefTax;

    // Quick property lookup helper
    const handleTdnSearch = async () => {
        if (!lookupQuery.trim()) {
            toast.error("Please enter a TDN or PIN to lookup.");
            return;
        }
        setIsSearchingTdn(true);
        const res = await fetchPropertyByTdnOrPin(lookupQuery.trim());
        setIsSearchingTdn(false);

        if (res && res.found) {
            setTdn(res.tdn || lookupQuery.trim());
            if (res.pin) setPin(res.pin);
            setOwnerName(res.ownerName || "");
            setPropertyAddress(res.propertyAddress || "");
            setBarangay(res.barangay || "");
            setPropertyType(res.propertyType || "RESIDENTIAL");
            setAssessedValue(res.assessedValue ? res.assessedValue.toString() : "");
            toast.success("Property metadata fetched successfully!");
        } else {
            toast.info("No matching records found. Please fill out property details manually below.");
        }
    };

    // Pure validation helpers (no state mutation, safe for render phase)
    const isStep1Valid = () => !!categoryCode;
    const isStep2Valid = () => !!(tdn.trim() && ownerName.trim() && barangay && propertyAddress.trim() && propertyType && assessedValue && parseFloat(assessedValue) > 0);
    const isStep3Valid = () => !!(selectedDate && selectedSlot);

    // Error-setting validation functions for user actions
    const validateStep1 = () => {
        const errs: Record<string, string> = {};
        if (!categoryCode) errs.categoryCode = "Please select an RPT category.";
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const validateStep2 = () => {
        const errs: Record<string, string> = {};
        if (!tdn.trim()) errs.tdn = "Tax Declaration Number (TDN) is required.";
        if (!ownerName.trim()) errs.ownerName = "Property Owner Name is required.";
        if (!barangay) errs.barangay = "Barangay location is required.";
        if (!propertyAddress.trim()) errs.propertyAddress = "Property Address is required.";
        if (!propertyType) errs.propertyType = "Property Classification is required.";
        if (!assessedValue || parseFloat(assessedValue) <= 0) {
            errs.assessedValue = "A valid Assessed Value (AV) greater than 0 is required.";
        }
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const validateStep3 = () => {
        const errs: Record<string, string> = {};
        if (!selectedDate) errs.selectedDate = "Please select an appointment date.";
        if (!selectedSlot) errs.selectedSlot = "Please select a time slot.";
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const validateStep4 = () => {
        const errs: Record<string, string> = {};
        if (!validIdFile) errs.validIdFile = "Valid Government-Issued ID is required.";
        if (!privacyAccepted) errs.privacy = "You must agree to the Data Privacy Terms.";
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const canNavigate = (targetStep: Step) => {
        const order: Step[] = ["CATEGORY", "PROPERTY", "SCHEDULE", "CONFIRM", "SUCCESS"];
        const targetIdx = order.indexOf(targetStep);
        const currentIdx = order.indexOf(currentStep);

        if (targetIdx <= currentIdx) return true;
        if (targetIdx === 1) return isStep1Valid();
        if (targetIdx === 2) return isStep1Valid() && isStep2Valid();
        if (targetIdx === 3) return isStep1Valid() && isStep2Valid() && isStep3Valid();
        return false;
    };

    // Final Form Submission
    const handleFinalSubmit = async () => {
        if (!validateStep4()) {
            if (!privacyAccepted) setIsPrivacyModalOpen(true);
            return;
        }

        setSubmitting(true);
        try {
            const formData = new FormData();
            formData.append("categoryCode", categoryCode);
            formData.append("tdn", tdn);
            formData.append("pin", pin);
            formData.append("ownerName", ownerName);
            formData.append("propertyAddress", propertyAddress);
            formData.append("barangay", barangay);
            formData.append("propertyType", propertyType);
            formData.append("assessedValue", assessedValue);
            formData.append("appointmentDate", selectedDate);
            formData.append("appointmentSlot", selectedSlot);

            if (validIdFile) formData.append("validIdFile", validIdFile);
            if (previousOrFile) formData.append("previousOrFile", previousOrFile);
            if (buildingPermitFile) formData.append("buildingPermitFile", buildingPermitFile);
            if (deedOfSaleFile) formData.append("deedOfSaleFile", deedOfSaleFile);
            if (titleFile) formData.append("titleFile", titleFile);
            if (birEcarFile) formData.append("birEcarFile", birEcarFile);

            const res = await submitRptAppointment(formData);

            if (res.success && res.queueNumber) {
                setSubmissionResult({
                    queueNumber: res.queueNumber,
                    soaReferenceCode: res.soaReferenceCode || "",
                    totalTaxDue: res.totalTaxDue || totalTaxDue
                });
                setCurrentStep("SUCCESS");
                toast.success("RPT Appointment submitted successfully!");
            } else {
                toast.error(res.error || "Failed to submit RPT appointment.");
            }
        } catch (err: any) {
            toast.error(err?.message || "An error occurred during submission.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-0 pb-0 space-y-12">
            <PrivacyTermsModal
                isOpen={isPrivacyModalOpen}
                onClose={() => setIsPrivacyModalOpen(false)}
                onAccept={() => {
                    setPrivacyAccepted(true);
                    setIsPrivacyModalOpen(false);
                }}
                themeColor={themeColor}
            />

            <DocumentViewerModal
                isOpen={viewerOpen}
                onClose={() => setViewerOpen(false)}
                file={viewerFile}
                fileUrl={viewerUrl}
                title={viewerTitle}
            />

            {/* Header / Breadcrumb */}
            <div className="space-y-4 md:space-y-10 print:hidden">
                <div className="sticky top-[64px] sm:top-[80px] z-40 md:static -mx-4 md:mx-0 px-4 md:px-0 pt-2 md:pt-0">
                    <Breadcrumb>
                        <BreadcrumbList className="flex-nowrap whitespace-nowrap overflow-x-auto scrollbar-none max-w-full bg-white/80 dark:bg-white/5 backdrop-blur-md px-4 md:px-6 py-2 md:py-2.5 rounded-xl md:rounded-2xl border border-slate-200 dark:border-white/10 w-fit shadow-sm">
                            <BreadcrumbItem>
                                <BreadcrumbLink asChild>
                                    <Link href="/" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-primary transition-colors italic">
                                        <Home className="w-3.5 h-3.5 mb-0.5" />
                                        Home
                                    </Link>
                                </BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator className="text-slate-300 dark:text-white/10" />
                            <BreadcrumbItem>
                                <BreadcrumbLink asChild>
                                    <Link href="/user/services" className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-primary transition-colors italic">
                                        Services
                                    </Link>
                                </BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator className="text-slate-300 dark:text-white/10" />
                            <BreadcrumbItem>
                                <BreadcrumbPage className="text-[10px] font-black uppercase tracking-widest italic" style={{ color: "var(--primary-theme)" }}>
                                    Real Property Tax (Amilyar)
                                </BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                </div>

                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6 px-1 md:px-0">
                    <div className="space-y-1 md:space-y-2">
                        <h1 className="text-2xl md:text-4xl font-bold text-slate-900 dark:text-white uppercase italic tracking-tighter leading-tight select-none">
                            Real Property Tax <span className="text-primary underline decoration-[4px] md:decoration-[6px] decoration-primary/20 underline-offset-[4px] md:underline-offset-[8px]">(Amilyar)</span>
                        </h1>
                        <p className="text-[9px] md:text-[11px] font-bold text-slate-400 uppercase tracking-[0.4em] ml-1 md:ml-2 italic">
                            Appointment Booking, Tax Assessment & Clearance Services
                        </p>
                    </div>
                </div>
            </div>

            {/* Progress Stepper */}
            {currentStep !== "SUCCESS" && (
                <div className="grid grid-cols-4 gap-1.5 md:gap-4 relative px-1 md:px-2 print:hidden">
                    {STEPS.map((step, idx) => {
                        const isActive = currentStep === step.id;
                        const isCompleted = STEPS.findIndex(s => s.id === currentStep) > idx;
                        const Icon = step.icon;
                        return (
                            <div
                                key={idx}
                                onClick={() => {
                                    if (canNavigate(step.id)) {
                                        setCurrentStep(step.id);
                                    } else {
                                        toast.error("Please complete the current phase first.");
                                    }
                                }}
                                className={cn(
                                    "flex flex-col items-center gap-2 md:gap-3 relative z-10 font-black cursor-pointer group",
                                    (!canNavigate(step.id) && !isActive) && "cursor-not-allowed opacity-50"
                                )}
                            >
                                <div className={cn(
                                    "w-11 h-11 md:w-16 md:h-16 rounded-xl md:rounded-2xl flex items-center justify-center transition-all duration-500 border-2",
                                    isActive ? "bg-primary text-white border-primary shadow-[0_0_20px_rgba(var(--primary),0.3)] scale-105 md:scale-110" :
                                        isCompleted ? "bg-primary/10 text-primary border-primary/30" :
                                            "bg-slate-100 dark:bg-white/5 text-slate-400 border-transparent group-hover:border-primary/30"
                                )}>
                                    <Icon className="w-4 h-4 md:w-7 md:h-7" />
                                </div>
                                <span className={cn(
                                    "text-[7px] md:text-[10px] uppercase tracking-widest text-center italic hidden sm:block",
                                    isActive ? "text-primary opacity-100 font-black" : "opacity-40 group-hover:opacity-100 transition-opacity"
                                )}>
                                    {step.label}
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Main Form container */}
            <div className="mt-4 md:mt-8 md:bg-white md:dark:bg-[#11131a] md:rounded-[2.5rem] md:border md:border-slate-200 md:dark:border-white/10 p-0 md:p-12 md:shadow-2xl relative md:overflow-hidden group/container min-h-[400px] md:min-h-[500px] flex flex-col print:border-none print:shadow-none print:bg-white print:text-black">
                <div className="flex-1">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentStep}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.4 }}
                        >
                            {/* STEP 1: CATEGORY SELECTION */}
                            {currentStep === "CATEGORY" && (
                                <div className="space-y-8 md:space-y-12">
                                    <div className="space-y-3 md:space-y-4 text-center">
                                        <h2 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter leading-tight select-none">
                                            Select RPT Service <span className="text-primary italic">Category</span>
                                        </h2>
                                        <p className="text-slate-500 dark:text-slate-400 font-medium italic text-xs md:text-sm uppercase tracking-widest max-w-2xl mx-auto select-none">
                                            Choose the specific Real Property Tax application category for your property.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                                        {[
                                            {
                                                code: "RPT_CAT1",
                                                icon: Receipt,
                                                title: "Category 1: Routine Annual Tax Payment & Tax Clearance",
                                                routing: "Direct to Municipal Treasury Office",
                                                desc: "For routine annual amilyar payment or Tax Clearance for existing/declared properties.",
                                                badge: "Treasury Direct"
                                            },
                                            {
                                                code: "RPT_CAT2",
                                                icon: Building2,
                                                title: "Category 2: New Property Declaration & Assessment",
                                                routing: "Municipal Assessor's Office -> Municipal Treasury",
                                                desc: "For new building/house. Assessor checks permits & schedules Ocular Field Inspection for FAAS.",
                                                badge: "Assessor Inspection Required"
                                            },
                                            {
                                                code: "RPT_CAT3",
                                                icon: UserCheck,
                                                title: "Category 3: Transfer of Property Ownership",
                                                routing: "Municipal Assessor's Office -> Municipal Treasury",
                                                desc: "For transferring ownership name. Assessor verifies Deed of Sale, TCT Title & BIR eCAR.",
                                                badge: "Assessor Transfer Required"
                                            }
                                        ].map(cat => {
                                            const isSelected = categoryCode === cat.code;
                                            const Icon = cat.icon;
                                            return (
                                                <button
                                                    key={cat.code}
                                                    type="button"
                                                    onClick={() => {
                                                        setCategoryCode(cat.code);
                                                        setErrors(prev => ({ ...prev, categoryCode: "" }));
                                                    }}
                                                    className={cn(
                                                        "p-6 md:p-8 rounded-[2rem] border-2 text-left relative group select-none overflow-hidden transition-all duration-300 min-h-[220px] md:min-h-[280px] flex flex-col justify-between cursor-pointer",
                                                        isSelected
                                                            ? "border-primary bg-primary text-white shadow-xl shadow-primary/20 scale-[1.02]"
                                                            : "border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:border-primary/50 text-slate-700 dark:text-slate-300"
                                                    )}
                                                >
                                                    <div className="space-y-4 relative z-10">
                                                        <div className={cn(
                                                            "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors",
                                                            isSelected ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
                                                        )}>
                                                            <Icon className="w-6 h-6" />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <h3 className="font-black text-base md:text-lg uppercase italic tracking-tight leading-snug">
                                                                {cat.title}
                                                            </h3>
                                                            <span className={cn(
                                                                "inline-block text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full italic mt-1",
                                                                isSelected ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
                                                            )}>
                                                                {cat.badge}
                                                            </span>
                                                        </div>
                                                        <p className={cn("text-xs leading-relaxed font-medium", isSelected ? "text-white/80" : "text-slate-500 dark:text-slate-400")}>
                                                            {cat.desc}
                                                        </p>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* STEP 2: PROPERTY INFO */}
                            {currentStep === "PROPERTY" && (
                                <div className="space-y-8 md:space-y-10">
                                    <div className="space-y-2 md:space-y-4 text-center md:text-left">
                                        <h2 className="text-2xl md:text-3xl font-black italic uppercase tracking-tighter leading-tight">
                                            Property <span className="text-primary italic">& Tax Declaration Information</span>
                                        </h2>
                                        <p className="text-slate-500 font-medium italic text-xs md:text-sm">
                                            Enter property details or use Quick Lookup to auto-fill metadata.
                                        </p>
                                    </div>

                                    {/* Quick Lookup Bar */}
                                    <div className="p-4 md:p-6 rounded-2xl md:rounded-3xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-3">
                                        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-primary italic">
                                            <Search className="w-4 h-4" /> Quick TDN / PIN Metadata Auto-fill
                                        </div>
                                        <div className="flex gap-3">
                                            <Input
                                                placeholder="Enter TDN (e.g., 2026-MAP-00123) or PIN to lookup..."
                                                value={lookupQuery}
                                                onChange={(e) => setLookupQuery(e.target.value)}
                                                className="bg-white dark:bg-black/20 border-slate-200 dark:border-white/10 rounded-xl h-11 text-xs"
                                            />
                                            <Button
                                                type="button"
                                                onClick={handleTdnSearch}
                                                disabled={isSearchingTdn}
                                                className="h-11 px-6 rounded-xl bg-primary text-white font-black text-xs uppercase tracking-widest"
                                            >
                                                {isSearchingTdn ? <Loader2 className="w-4 h-4 animate-spin" /> : "Lookup"}
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                        {/* Left 2 Cols: Form Inputs */}
                                        <div className="lg:col-span-2 space-y-6">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {/* TDN */}
                                                <div className="space-y-1.5">
                                                    <Label className="text-[10px] md:text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 italic">
                                                        Tax Declaration Number (TDN) <span className="text-red-500">*</span>
                                                    </Label>
                                                    <Input
                                                        placeholder="e.g. 2026-MAP-001234"
                                                        value={tdn}
                                                        onChange={(e) => {
                                                            setTdn(e.target.value);
                                                            if (errors.tdn) setErrors(prev => ({ ...prev, tdn: "" }));
                                                        }}
                                                        className={cn(
                                                            "bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 rounded-xl md:rounded-2xl h-11 md:h-14 font-medium",
                                                            errors.tdn && "border-red-500 focus-visible:ring-red-500"
                                                        )}
                                                    />
                                                    {errors.tdn && (
                                                        <p className="text-[10px] text-red-500 font-medium">{errors.tdn}</p>
                                                    )}
                                                </div>

                                                {/* PIN */}
                                                <div className="space-y-1.5">
                                                    <Label className="text-[10px] md:text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 italic">
                                                        Property PIN <span className="text-slate-400 font-normal">(Optional)</span>
                                                    </Label>
                                                    <Input
                                                        placeholder="e.g. 021-04-0012-004-01"
                                                        value={pin}
                                                        onChange={(e) => setPin(e.target.value)}
                                                        className="bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 rounded-xl md:rounded-2xl h-11 md:h-14 font-medium"
                                                    />
                                                </div>

                                                {/* Owner Name */}
                                                <div className="space-y-1.5 md:col-span-2">
                                                    <Label className="text-[10px] md:text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 italic">
                                                        Registered Owner Full Name <span className="text-red-500">*</span>
                                                    </Label>
                                                    <Input
                                                        placeholder="Full name as written on Tax Declaration"
                                                        value={ownerName}
                                                        onChange={(e) => {
                                                            setOwnerName(e.target.value);
                                                            if (errors.ownerName) setErrors(prev => ({ ...prev, ownerName: "" }));
                                                        }}
                                                        className={cn(
                                                            "bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 rounded-xl md:rounded-2xl h-11 md:h-14 font-medium",
                                                            errors.ownerName && "border-red-500 focus-visible:ring-red-500"
                                                        )}
                                                    />
                                                    {errors.ownerName && (
                                                        <p className="text-[10px] text-red-500 font-medium">{errors.ownerName}</p>
                                                    )}
                                                </div>

                                                {/* Barangay */}
                                                <div className="space-y-1.5">
                                                    <Label className="text-[10px] md:text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 italic">
                                                        Barangay Location <span className="text-red-500">*</span>
                                                    </Label>
                                                    <select
                                                        value={barangay}
                                                        onChange={(e) => {
                                                            setBarangay(e.target.value);
                                                            if (errors.barangay) setErrors(prev => ({ ...prev, barangay: "" }));
                                                        }}
                                                        className={cn(
                                                            "w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl md:rounded-2xl h-11 md:h-14 px-4 font-medium text-sm text-slate-800 dark:text-slate-200",
                                                            errors.barangay && "border-red-500 focus-visible:ring-red-500"
                                                        )}
                                                    >
                                                        <option value="" disabled>Select Barangay</option>
                                                        {barangayList.map((b) => (
                                                            <option key={b} value={b} className="bg-slate-900 text-white">{b}</option>
                                                        ))}
                                                    </select>
                                                    {errors.barangay && (
                                                        <p className="text-[10px] text-red-500 font-medium">{errors.barangay}</p>
                                                    )}
                                                </div>

                                                {/* Property Type */}
                                                <div className="space-y-1.5">
                                                    <Label className="text-[10px] md:text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 italic">
                                                        Classification <span className="text-red-500">*</span>
                                                    </Label>
                                                    <select
                                                        value={propertyType}
                                                        onChange={(e) => {
                                                            setPropertyType(e.target.value);
                                                            if (errors.propertyType) setErrors(prev => ({ ...prev, propertyType: "" }));
                                                        }}
                                                        className={cn(
                                                            "w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl md:rounded-2xl h-11 md:h-14 px-4 font-medium text-sm text-slate-800 dark:text-slate-200",
                                                            errors.propertyType && "border-red-500 focus-visible:ring-red-500"
                                                        )}
                                                    >
                                                        <option value="" disabled>Select Classification</option>
                                                        <option value="RESIDENTIAL" className="bg-slate-900 text-white">Residential Property</option>
                                                        <option value="COMMERCIAL" className="bg-slate-900 text-white">Commercial Property</option>
                                                        <option value="INDUSTRIAL" className="bg-slate-900 text-white">Industrial Property</option>
                                                        <option value="AGRICULTURAL" className="bg-slate-900 text-white">Agricultural Property</option>
                                                    </select>
                                                    {errors.propertyType && (
                                                        <p className="text-[10px] text-red-500 font-medium">{errors.propertyType}</p>
                                                    )}
                                                </div>

                                                {/* Property Address */}
                                                <div className="space-y-1.5 md:col-span-2">
                                                    <Label className="text-[10px] md:text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 italic">
                                                        Property Address / Location <span className="text-red-500">*</span>
                                                    </Label>
                                                    <Input
                                                        placeholder="Lot / Block No., Street, Sitio, Mapandan"
                                                        value={propertyAddress}
                                                        onChange={(e) => {
                                                            setPropertyAddress(e.target.value);
                                                            if (errors.propertyAddress) setErrors(prev => ({ ...prev, propertyAddress: "" }));
                                                        }}
                                                        className={cn(
                                                            "bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 rounded-xl md:rounded-2xl h-11 md:h-14 font-medium",
                                                            errors.propertyAddress && "border-red-500 focus-visible:ring-red-500"
                                                        )}
                                                    />
                                                    {errors.propertyAddress && (
                                                        <p className="text-[10px] text-red-500 font-medium">{errors.propertyAddress}</p>
                                                    )}
                                                </div>

                                                {/* Assessed Value */}
                                                <div className="space-y-1.5 md:col-span-2">
                                                    <Label className="text-[10px] md:text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 italic">
                                                        Assessed Value (AV) in Pesos (₱) <span className="text-red-500">*</span>
                                                    </Label>
                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        placeholder="e.g. 250000.00"
                                                        value={assessedValue}
                                                        onChange={(e) => {
                                                            setAssessedValue(e.target.value);
                                                            if (errors.assessedValue) setErrors(prev => ({ ...prev, assessedValue: "" }));
                                                        }}
                                                        className={cn(
                                                            "bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 rounded-xl md:rounded-2xl h-11 md:h-14 font-bold text-base",
                                                            errors.assessedValue && "border-red-500 focus-visible:ring-red-500"
                                                        )}
                                                    />
                                                    {errors.assessedValue && (
                                                        <p className="text-[10px] text-red-500 font-medium">{errors.assessedValue}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right Col: Calculation Overlay Box */}
                                        <div className="bg-slate-900 dark:bg-black border border-slate-800 dark:border-white/5 rounded-3xl p-5 md:p-6 text-white space-y-6 shadow-2xl relative overflow-hidden flex flex-col justify-between min-h-[280px]">
                                            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                                                <Calculator className="w-24 h-24 rotate-12" />
                                            </div>

                                            <div className="space-y-3 relative z-10 font-bold">
                                                <h3 className="text-xs uppercase tracking-widest text-primary italic border-b border-white/10 pb-2">
                                                    Estimated Tax Breakdown
                                                </h3>
                                                <div className="flex justify-between items-center text-[10px] md:text-xs uppercase tracking-widest italic opacity-80 gap-2">
                                                    <span className="truncate">Assessed Value (AV)</span>
                                                    <span className="font-mono font-bold text-white whitespace-nowrap">₱{numericAV.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-[10px] md:text-xs uppercase tracking-widest italic opacity-80 gap-2">
                                                    <span className="truncate">Basic RPT (1%)</span>
                                                    <span className="font-mono font-bold text-white whitespace-nowrap">₱{basicTax.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-[10px] md:text-xs uppercase tracking-widest italic opacity-80 gap-2">
                                                    <span className="truncate">SEF Tax (1%)</span>
                                                    <span className="font-mono font-bold text-white whitespace-nowrap">₱{sefTax.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                                                </div>
                                            </div>

                                            <div className="pt-4 border-t border-white/10 relative z-10 space-y-1">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic block">Total Estimated Tax Due</span>
                                                <div className="text-2xl sm:text-3xl font-black italic tracking-tight text-primary font-mono truncate">
                                                    ₱{totalTaxDue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* STEP 3: SCHEDULE */}
                            {currentStep === "SCHEDULE" && (
                                <div className="space-y-8 md:space-y-12">
                                    <div className="space-y-2 md:space-y-4 text-center md:text-left">
                                        <h2 className="text-2xl md:text-3xl font-black italic uppercase tracking-tighter leading-tight">
                                            Schedule <span className="text-primary italic">Declaration</span>
                                        </h2>
                                        <p className="text-slate-500 font-medium italic text-xs md:text-sm">
                                            Choose an available date and select your time slot to book your municipal appointment.
                                        </p>
                                    </div>

                                    <SchedulePicker
                                        selectedDate={selectedDate}
                                        setSelectedDate={setSelectedDate}
                                        selectedSlot={selectedSlot}
                                        setSelectedSlot={setSelectedSlot}
                                        bookedSlots={activeBookedSlots}
                                        config={activeConfig}
                                        themeColor={themeColor}
                                    />
                                </div>
                            )}

                            {/* STEP 4: CONFIRM & UPLOADS */}
                            {currentStep === "CONFIRM" && (
                                <div className="space-y-8 md:space-y-10">
                                    <div className="space-y-2 md:space-y-4 text-center md:text-left">
                                        <h2 className="text-2xl md:text-3xl font-black italic uppercase tracking-tighter leading-tight">
                                            Review <span className="text-primary italic">& Finalize Uploads</span>
                                        </h2>
                                        <p className="text-slate-500 font-medium italic text-xs md:text-lg leading-relaxed">
                                            Upload required category documents and accept Data Privacy Terms.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                                        {/* Mandatory Valid ID Upload */}
                                        <div className="p-5 bg-slate-50 dark:bg-white/5 rounded-3xl border border-dashed border-slate-200 dark:border-white/10 flex flex-col justify-between gap-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center font-bold">
                                                    <Upload className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <h4 className="text-xs font-black uppercase italic tracking-wider text-slate-900 dark:text-white">
                                                        Valid Government ID <span className="text-red-500">*</span>
                                                    </h4>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase italic">Mandatory for all applicants (PDF/Image)</p>
                                                </div>
                                            </div>

                                            {validIdFile && (
                                                <div
                                                    onClick={() => handleViewFile(validIdFile, null, "Valid ID")}
                                                    className="w-full p-3 bg-primary/10 rounded-xl flex items-center justify-between cursor-pointer text-xs font-bold text-primary"
                                                >
                                                    <span className="truncate">{validIdFile.name}</span>
                                                    <span>🔍 View</span>
                                                </div>
                                            )}

                                            <input type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" onChange={(e) => setValidIdFile(e.target.files?.[0] || null)} className="hidden" id="valid-id-file" />
                                            <Button asChild variant="default" className="rounded-xl font-black text-xs uppercase tracking-widest">
                                                <label htmlFor="valid-id-file" className="cursor-pointer">
                                                    {validIdFile ? "Change Valid ID" : "Upload Valid ID"}
                                                </label>
                                            </Button>
                                            {errors.validIdFile && (
                                                <p className="text-[10px] text-red-500 font-medium">{errors.validIdFile}</p>
                                            )}
                                        </div>

                                        {/* Category 1 Specific File */}
                                        {categoryCode === "RPT_CAT1" && (
                                            <div className="p-5 bg-slate-50 dark:bg-white/5 rounded-3xl border border-dashed border-slate-200 dark:border-white/10 flex flex-col justify-between gap-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center font-bold">
                                                        <FileText className="w-6 h-6" />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-xs font-black uppercase italic tracking-wider text-slate-900 dark:text-white">Previous O.R. / SOA</h4>
                                                        <p className="text-[10px] text-slate-400 font-bold uppercase italic">Previous Official Receipt or Statement of Account</p>
                                                    </div>
                                                </div>
                                                {previousOrFile && (
                                                    <div onClick={() => handleViewFile(previousOrFile, null, "Previous O.R.")} className="w-full p-3 bg-primary/10 rounded-xl flex items-center justify-between cursor-pointer text-xs font-bold text-primary">
                                                        <span className="truncate">{previousOrFile.name}</span>
                                                        <span>🔍 View</span>
                                                    </div>
                                                )}
                                                <input type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" onChange={(e) => setPreviousOrFile(e.target.files?.[0] || null)} className="hidden" id="previous-or-file" />
                                                <Button asChild variant="outline" className="rounded-xl font-black text-xs uppercase tracking-widest">
                                                    <label htmlFor="previous-or-file" className="cursor-pointer">{previousOrFile ? "Change File" : "Upload Previous O.R."}</label>
                                                </Button>
                                            </div>
                                        )}

                                        {/* Category 2 Specific File */}
                                        {categoryCode === "RPT_CAT2" && (
                                            <div className="p-5 bg-slate-50 dark:bg-white/5 rounded-3xl border border-dashed border-slate-200 dark:border-white/10 flex flex-col justify-between gap-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center font-bold">
                                                        <Building2 className="w-6 h-6" />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-xs font-black uppercase italic tracking-wider text-slate-900 dark:text-white">Building / Occupancy Permit</h4>
                                                        <p className="text-[10px] text-slate-400 font-bold uppercase italic">For new property declaration assessment</p>
                                                    </div>
                                                </div>
                                                {buildingPermitFile && (
                                                    <div onClick={() => handleViewFile(buildingPermitFile, null, "Building Permit")} className="w-full p-3 bg-primary/10 rounded-xl flex items-center justify-between cursor-pointer text-xs font-bold text-primary">
                                                        <span className="truncate">{buildingPermitFile.name}</span>
                                                        <span>🔍 View</span>
                                                    </div>
                                                )}
                                                <input type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" onChange={(e) => setBuildingPermitFile(e.target.files?.[0] || null)} className="hidden" id="building-permit-file" />
                                                <Button asChild variant="outline" className="rounded-xl font-black text-xs uppercase tracking-widest">
                                                    <label htmlFor="building-permit-file" className="cursor-pointer">{buildingPermitFile ? "Change File" : "Upload Building Permit"}</label>
                                                </Button>
                                            </div>
                                        )}

                                        {/* Category 3 Specific Files */}
                                        {categoryCode === "RPT_CAT3" && (
                                            <>
                                                <div className="p-5 bg-slate-50 dark:bg-white/5 rounded-3xl border border-dashed border-slate-200 dark:border-white/10 flex flex-col justify-between gap-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center font-bold">
                                                            <FileText className="w-6 h-6" />
                                                        </div>
                                                        <div>
                                                            <h4 className="text-xs font-black uppercase italic tracking-wider text-slate-900 dark:text-white">Deed of Absolute Sale</h4>
                                                            <p className="text-[10px] text-slate-400 font-bold uppercase italic">For property title transfer</p>
                                                        </div>
                                                    </div>
                                                    {deedOfSaleFile && (
                                                        <div onClick={() => handleViewFile(deedOfSaleFile, null, "Deed of Sale")} className="w-full p-3 bg-primary/10 rounded-xl flex items-center justify-between cursor-pointer text-xs font-bold text-primary">
                                                            <span className="truncate">{deedOfSaleFile.name}</span>
                                                            <span>🔍 View</span>
                                                        </div>
                                                    )}
                                                    <input type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" onChange={(e) => setDeedOfSaleFile(e.target.files?.[0] || null)} className="hidden" id="deed-file" />
                                                    <Button asChild variant="outline" className="rounded-xl font-black text-xs uppercase tracking-widest">
                                                        <label htmlFor="deed-file" className="cursor-pointer">{deedOfSaleFile ? "Change File" : "Upload Deed of Sale"}</label>
                                                    </Button>
                                                </div>

                                                <div className="p-5 bg-slate-50 dark:bg-white/5 rounded-3xl border border-dashed border-slate-200 dark:border-white/10 flex flex-col justify-between gap-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center font-bold">
                                                            <FileText className="w-6 h-6" />
                                                        </div>
                                                        <div>
                                                            <h4 className="text-xs font-black uppercase italic tracking-wider text-slate-900 dark:text-white">TCT / Land Title</h4>
                                                            <p className="text-[10px] text-slate-400 font-bold uppercase italic">Transfer Certificate of Title</p>
                                                        </div>
                                                    </div>
                                                    {titleFile && (
                                                        <div onClick={() => handleViewFile(titleFile, null, "Land Title")} className="w-full p-3 bg-primary/10 rounded-xl flex items-center justify-between cursor-pointer text-xs font-bold text-primary">
                                                            <span className="truncate">{titleFile.name}</span>
                                                            <span>🔍 View Title</span>
                                                        </div>
                                                    )}
                                                    <input type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" onChange={(e) => setTitleFile(e.target.files?.[0] || null)} className="hidden" id="title-file" />
                                                    <Button asChild variant="outline" className="rounded-xl font-black text-xs uppercase tracking-widest">
                                                        <label htmlFor="title-file" className="cursor-pointer">{titleFile ? "Change Title" : "Upload Land Title"}</label>
                                                    </Button>
                                                </div>

                                                <div className="p-5 bg-slate-50 dark:bg-white/5 rounded-3xl border border-dashed border-slate-200 dark:border-white/10 flex flex-col justify-between gap-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center font-bold">
                                                            <Receipt className="w-6 h-6" />
                                                        </div>
                                                        <div>
                                                            <h4 className="text-xs font-black uppercase italic tracking-wider text-slate-900 dark:text-white">BIR eCAR Certificate</h4>
                                                            <p className="text-[10px] text-slate-400 font-bold uppercase italic">Electronic Certificate Authorizing Registration</p>
                                                        </div>
                                                    </div>
                                                    {birEcarFile && (
                                                        <div onClick={() => handleViewFile(birEcarFile, null, "BIR eCAR")} className="w-full p-3 bg-primary/10 rounded-xl flex items-center justify-between cursor-pointer text-xs font-bold text-primary">
                                                            <span className="truncate">{birEcarFile.name}</span>
                                                            <span>🔍 View eCAR</span>
                                                        </div>
                                                    )}
                                                    <input type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" onChange={(e) => setBirEcarFile(e.target.files?.[0] || null)} className="hidden" id="bir-ecar-file" />
                                                    <Button asChild variant="outline" className="rounded-xl font-black text-xs uppercase tracking-widest">
                                                        <label htmlFor="bir-ecar-file" className="cursor-pointer">{birEcarFile ? "Change eCAR" : "Upload BIR eCAR"}</label>
                                                    </Button>
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    {/* Privacy Terms Agreement Box */}
                                    <div className="p-6 rounded-3xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-4">
                                        <div className="flex items-start gap-4">
                                            <div
                                                onClick={() => setPrivacyAccepted(!privacyAccepted)}
                                                className={cn(
                                                    "w-6 h-6 rounded-lg border-2 flex items-center justify-center cursor-pointer transition-all shrink-0 mt-0.5",
                                                    privacyAccepted ? "bg-primary border-primary text-white" : "border-slate-300 dark:border-white/20"
                                                )}
                                            >
                                                {privacyAccepted && <Check className="w-4 h-4" />}
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-relaxed">
                                                    I agree to the <button type="button" onClick={() => setIsPrivacyModalOpen(true)} className="text-primary underline">Data Privacy Terms & Governance Policies</button> of the Municipality of Mapandan.
                                                </p>
                                                <p className="text-[10px] text-slate-400 italic">All uploaded tax documents will be safely evaluated by Municipal Assessor & Treasury staff.</p>
                                            </div>
                                        </div>
                                        {errors.privacy && <p className="text-[10px] text-red-500 font-medium">{errors.privacy}</p>}
                                    </div>
                                </div>
                            )}

                            {/* SUCCESS STEP */}
                            {currentStep === "SUCCESS" && submissionResult && (
                                <div className="py-12 text-center space-y-8 animate-in fade-in zoom-in-95 duration-500">
                                    <div className="w-20 h-20 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-2xl">
                                        <CheckCircle2 className="w-12 h-12" />
                                    </div>

                                    <div className="space-y-2">
                                        <h2 className="text-3xl font-black italic uppercase tracking-tight text-slate-900 dark:text-white">
                                            Digital Queue Ticket Issued
                                        </h2>
                                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
                                            Present this Queue Ticket code during your municipal appointment schedule.
                                        </p>
                                    </div>

                                    <div className="max-w-md mx-auto p-8 rounded-[2.5rem] bg-slate-900 text-white shadow-2xl space-y-6 border border-white/10">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Queue Ticket Reference</p>
                                        <div className="text-4xl font-black text-primary font-mono tracking-wider">
                                            {submissionResult.queueNumber}
                                        </div>
                                        <div className="pt-4 border-t border-white/10 grid grid-cols-2 gap-4 text-left text-xs">
                                            <div>
                                                <span className="text-[10px] text-slate-400 uppercase tracking-widest block font-bold">SOA Reference</span>
                                                <span className="font-mono font-bold text-white">{submissionResult.soaReferenceCode}</span>
                                            </div>
                                            <div>
                                                <span className="text-[10px] text-slate-400 uppercase tracking-widest block font-bold">Estimated Tax</span>
                                                <span className="font-bold text-emerald-400">₱{submissionResult.totalTaxDue.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <Button
                                        onClick={() => window.location.href = "/user/services"}
                                        className="h-14 px-10 rounded-2xl bg-primary text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20"
                                    >
                                        Return to User Services
                                    </Button>
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Footer Navigation Controls */}
                {currentStep !== "SUCCESS" && (
                    <div className="mt-8 md:mt-12 pt-6 md:pt-8 border-t border-slate-200 dark:border-white/10 flex items-center justify-between gap-4">
                        {currentStep !== "CATEGORY" ? (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    if (currentStep === "PROPERTY") setCurrentStep("CATEGORY");
                                    if (currentStep === "SCHEDULE") setCurrentStep("PROPERTY");
                                    if (currentStep === "CONFIRM") setCurrentStep("SCHEDULE");
                                }}
                                className="h-12 md:h-16 px-6 md:px-8 rounded-xl md:rounded-2xl border-2 border-slate-200 dark:border-white/10 font-black text-xs md:text-sm uppercase tracking-widest"
                            >
                                <ArrowLeft className="w-4 h-4 md:w-5 md:h-5 mr-2" /> Back
                            </Button>
                        ) : <div />}

                        {currentStep === "CATEGORY" && (
                            <Button
                                type="button"
                                onClick={() => {
                                    if (validateStep1()) setCurrentStep("PROPERTY");
                                }}
                                className="h-12 md:h-16 px-8 md:px-12 rounded-xl md:rounded-2xl bg-primary text-white font-black text-xs md:text-sm uppercase tracking-widest hover:brightness-110 active:translate-y-0.5 transition-all shadow-xl shadow-primary/20 flex items-center gap-3 cursor-pointer select-none"
                            >
                                Next Step <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
                            </Button>
                        )}

                        {currentStep === "PROPERTY" && (
                            <Button
                                type="button"
                                onClick={() => {
                                    if (validateStep2()) setCurrentStep("SCHEDULE");
                                }}
                                className="h-12 md:h-16 px-8 md:px-12 rounded-xl md:rounded-2xl bg-primary text-white font-black text-xs md:text-sm uppercase tracking-widest hover:brightness-110 active:translate-y-0.5 transition-all shadow-xl shadow-primary/20 flex items-center gap-3 cursor-pointer select-none"
                            >
                                Next Step <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
                            </Button>
                        )}

                        {currentStep === "SCHEDULE" && (
                            <Button
                                type="button"
                                onClick={() => {
                                    if (validateStep3()) setCurrentStep("CONFIRM");
                                }}
                                className="h-12 md:h-16 px-8 md:px-12 rounded-xl md:rounded-2xl bg-primary text-white font-black text-xs md:text-sm uppercase tracking-widest hover:brightness-110 active:translate-y-0.5 transition-all shadow-xl shadow-primary/20 flex items-center gap-3 cursor-pointer select-none"
                            >
                                Next Step <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
                            </Button>
                        )}

                        {currentStep === "CONFIRM" && (
                            <Button
                                type="button"
                                onClick={handleFinalSubmit}
                                disabled={submitting}
                                className="h-12 md:h-16 px-8 md:px-12 rounded-xl md:rounded-2xl bg-primary text-white font-black text-xs md:text-sm uppercase tracking-widest hover:brightness-110 active:translate-y-0.5 transition-all shadow-xl shadow-primary/20 flex items-center gap-3 cursor-pointer select-none"
                            >
                                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
                                Submit Appointment
                            </Button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
