"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    CheckCircle2,
    ChevronRight,
    Loader2,
    Check,
    Home,
    Sparkles,
    Calendar,
    TrendingUp,
    ShieldAlert,
    Upload,
    Eye,
    Building2,
    ChevronDown,
    X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
import { compressImage } from "@/lib/image-compression";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { submitBusinessAppointment } from "./actions";


function FilePreview({ file, onClick }: { file: File; onClick?: () => void }) {
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    useEffect(() => {
        if (!file) return;

        if (file.type.startsWith("image/")) {
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
            return () => URL.revokeObjectURL(url);
        } else {
            setPreviewUrl(null);
        }
    }, [file]);

    if (file.type.startsWith("image/")) {
        if (!previewUrl) return null;
        return (
            <div
                onClick={onClick}
                className="relative w-full h-36 rounded-xl overflow-hidden mt-3 border border-slate-100 dark:border-white/10 shadow-inner bg-slate-50 dark:bg-black/20 flex items-center justify-center group/preview animate-in fade-in zoom-in-95 duration-200 cursor-pointer"
            >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={previewUrl}
                    alt="Document Preview"
                    className="w-full h-full object-cover group-hover/preview:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/preview:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <span className="text-[10px] text-white font-black uppercase tracking-widest bg-black/60 px-3.5 py-1.5 rounded-full backdrop-blur-md flex items-center gap-1.5 hover:bg-black/80 transition-colors">
                        <Eye className="w-3.5 h-3.5" />
                        Click to View
                    </span>
                </div>
            </div>
        );
    }

    return (
        <div
            onClick={onClick}
            className="w-full py-4 px-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 mt-3 flex items-center justify-between gap-2.5 animate-in fade-in duration-200 cursor-pointer group/pdf hover:border-primary/25 transition-all"
        >
            <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center font-bold text-xs font-mono shrink-0">
                    PDF
                </div>
                <div className="truncate text-left">
                    <span className="block text-xs font-bold text-slate-700 dark:text-slate-300 truncate font-mono">{file.name}</span>
                    <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest">Document File</span>
                </div>
            </div>
            <Eye className="w-4 h-4 text-slate-400 group-hover/pdf:text-primary transition-colors shrink-0 mr-1" />
        </div>
    );
}

const MAPANDAN_BARANGAYS = [
    "Amanoaoac",
    "Apaya",
    "Aserda",
    "Baloling",
    "Coral",
    "Golden",
    "Lanas",
    "Nilombot",
    "Patland",
    "Pias",
    "Poblacion",
    "Primicias",
    "Santa Maria",
    "Torres",
    "Valenzuela"
];

const LINE_OF_BUSINESS_OPTIONS = [
    "Agriculture & Forestry",
    "Manufacturing",
    "Wholesale & Retail",
    "Food & Beverage Services",
    "IT & Computer Services",
    "Construction",
    "Real Estate",
    "Transportation & Storage",
    "Healthcare & Social",
    "Education"
];

type Step = "PATHWAY" | "PROFILE" | "SCHEDULE" | "CHECKLIST" | "SUBMIT" | "SUCCESS";

const STEPS: { id: Step; label: string; icon: any }[] = [
    { id: "PATHWAY", label: "Status", icon: Sparkles },
    { id: "PROFILE", label: "Business", icon: Building2 },
    { id: "SCHEDULE", label: "Schedule", icon: Calendar },
    { id: "CHECKLIST", label: "Documents", icon: Upload },
    { id: "SUBMIT", label: "Submit", icon: CheckCircle2 },
];

const STEP_TABS: { id: string; label: string; icon: any }[] = [
    { id: "PATHWAY", label: "Status", icon: Sparkles },
    { id: "PROFILE", label: "Business", icon: Building2 },
    { id: "SCHEDULE", label: "Schedule", icon: Calendar },
    { id: "CHECKLIST", label: "Documents", icon: Upload },
    { id: "SUBMIT", label: "Submit", icon: CheckCircle2 }
];



interface BusinessPermitAppointmentClientProps {
    resident: any;
    businessTypes: any[];
    themeColor: string;
    branding: {
        logo?: string | null;
        word1?: string;
        word2?: string;
    };
    config: {
        maxSlots: number;
        maxSlotsAM?: number;
        maxSlotsPM?: number;
        blockedDates: string[];
        activeDays: number[];
    };
    bookedSlots: { appointmentDate: Date; appointmentSlot: string }[];
    hasActiveNew: boolean;
    hasActiveRenew: boolean;
    previousPermits: any[];
}

export function BusinessPermitAppointmentClient({
    resident,
    businessTypes,
    themeColor,
    config,
    bookedSlots,
    hasActiveNew,
    hasActiveRenew,
    previousPermits
}: BusinessPermitAppointmentClientProps) {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState<Step>("PATHWAY");
    const [submitting, setSubmitting] = useState(false);
    const [businessType, setBusinessType] = useState<"NEW" | "RENEWAL">("NEW");
    const [privacyAccepted, setPrivacyAccepted] = useState(false);
    const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
    const [isPriorityLane, setIsPriorityLane] = useState(false);
    const [showRenewalModal, setShowRenewalModal] = useState(false);
    const [selectedPermitIndex, setSelectedPermitIndex] = useState(0);

    const [isOtherLine, setIsOtherLine] = useState(false);

    // Form State matching the online filing form
    const [formState, setFormState] = useState({
        businessName: "",
        tradeName: "",
        orgType: "SOLE_PROPRIETORSHIP",
        dtiSecNumber: "",
        permitNumber: "",
        lineOfBusiness: "",
        barangay: "",
        street: "",
        building: "",
        capitalInvestment: "",
        grossSales: "",
        employeeCount: "0",
        businessArea: "",
        tinNumber: "",
        philhealthNumber: "",
        pagibigNumber: "",
        sssNumber: "",
        businessBranch: "MAIN",
        registrationType: "DTI",
        dtiSecDate: ""
    });

    const [residentState] = useState({
        firstName: resident?.firstName || "",
        lastName: resident?.lastName || "",
        middleName: resident?.middleName || "",
        suffix: resident?.suffix || "",
        gender: resident?.gender || "Male",
        dateOfBirth: resident?.dateOfBirth ? new Date(resident.dateOfBirth).toISOString().split("T")[0] : "",
        civilStatus: resident?.civilStatus || "Single",
        citizenship: resident?.citizenship || "Filipino",
        houseNumber: resident?.houseNumber || "",
        street: resident?.street || "",
        barangay: resident?.barangay || "",
        municipality: resident?.municipality || "Mapandan",
        province: resident?.province || "Pangasinan",
        contactNumber: resident?.contactNumber || "",
        email: resident?.email || "",
        occupation: resident?.occupation || ""
    });

    const handleInputChange = (field: string, value: any) => {
        setFormState(prev => ({
            ...prev,
            [field]: value
        }));
    };



    const handleLineOfBusinessSelect = (val: string) => {
        if (val === "Other") {
            setIsOtherLine(true);
            handleInputChange("lineOfBusiness", "");
        } else {
            setIsOtherLine(false);
            handleInputChange("lineOfBusiness", val);
        }
    };

    const handleSelectPreviousPermit = () => {
        const targetPermit = previousPermits[selectedPermitIndex];
        if (!targetPermit) return;
        const addData = targetPermit.additionalData || {};

        setFormState(prev => ({
            ...prev,
            businessName: addData.businessName || "",
            tradeName: addData.tradeName || "",
            orgType: addData.orgType || "SOLE_PROPRIETORSHIP",
            dtiSecNumber: addData.dtiSecNumber || "",
            permitNumber: targetPermit.businessPermit?.permitNumber || addData.permitNumber || targetPermit.id.slice(-8).toUpperCase(),
            lineOfBusiness: addData.lineOfBusiness || "",
            barangay: addData.barangay || prev.barangay,
            street: addData.street || "",
            building: addData.building || "",
            employeeCount: addData.employeeCount ? addData.employeeCount.toString() : "0",
            businessArea: addData.businessArea ? addData.businessArea.toString() : "",
            tinNumber: addData.tinNumber || "",
            philhealthNumber: addData.philhealthNumber || "",
            pagibigNumber: addData.pagibigNumber || "",
            sssNumber: addData.sssNumber || "",
            businessBranch: addData.businessBranch === "BRANCH" ? "BRANCH" : "MAIN",
            registrationType: addData.registrationType === "SEC" ? "SEC" : addData.registrationType === "COA" ? "COA" : "DTI",
            dtiSecDate: addData.dtiSecDate || "",
        }));

        setShowRenewalModal(false);
        toast.success(`Business details auto-filled for ${addData.businessName || "selected business"}!`);
    };

    const handleDeclinePreviousPermit = () => {
        setFormState(prev => ({
            ...prev,
            businessName: "",
            tradeName: "",
            orgType: "SOLE_PROPRIETORSHIP",
            dtiSecNumber: "",
            permitNumber: "",
            lineOfBusiness: "",
            barangay: prev.barangay,
            street: "",
            building: "",
            capitalInvestment: "",
            grossSales: "",
            employeeCount: "0",
            businessArea: "",
            tinNumber: "",
            philhealthNumber: "",
            pagibigNumber: "",
            sssNumber: "",
            businessBranch: "MAIN",
            registrationType: "DTI",
            dtiSecDate: "",
        }));
        setShowRenewalModal(false);
    };

    // Appointment Schedule State
    const [selectedDate, setSelectedDate] = useState<string>("");
    const [selectedSlot, setSelectedSlot] = useState<string>("");

    // Document Files
    const [idFile, setIdFile] = useState<File | null>(null);
    const [ctcFile, setCtcFile] = useState<File | null>(null);
    const [dtiSecFile, setDtiSecFile] = useState<File | null>(null);
    const [brgyClearanceFile, setBrgyClearanceFile] = useState<File | null>(null);
    const [sanitaryPermitFile, setSanitaryPermitFile] = useState<File | null>(null);
    const [fireSafetyFile, setFireSafetyFile] = useState<File | null>(null);
    const [previousPermitFile, setPreviousPermitFile] = useState<File | null>(null);
    const [birCorFile, setBirCorFile] = useState<File | null>(null);
    const [locationPhotoFile, setLocationPhotoFile] = useState<File | null>(null);

    const [existingIdUrl] = useState<string | null>(resident?.idFrontUrl || null);
    const [showValidationErrors, setShowValidationErrors] = useState(false);

    // Document Viewers
    const [viewerOpen, setViewerOpen] = useState(false);
    const [viewerFile, setViewerFile] = useState<File | null>(null);
    const [viewerUrl, setViewerUrl] = useState<string | null>(null);
    const [viewerTitle, setViewerTitle] = useState("");

    const hasActiveTransaction = businessType === "NEW" ? hasActiveNew : hasActiveRenew;

    const handleViewFile = (file: File | null, url: string | null, title: string) => {
        setViewerFile(file);
        setViewerUrl(url);
        setViewerTitle(title);
        setViewerOpen(true);
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, setter: (f: File | null) => void) => {
        const file = e.target.files?.[0] || null;
        if (!file) {
            setter(null);
            return;
        }

        const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
        const fileExtension = file.name.split('.').pop()?.toLowerCase() || "";
        const allowedExtensions = ["pdf", "jpg", "jpeg", "png", "webp"];

        if (!allowedMimeTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
            toast.error("Invalid file type. Only JPEG, PNG, WEBP, and PDF are allowed.");
            e.target.value = "";
            return;
        }

        // Validate magic bytes (headers) on the client-side
        try {
            const headBuffer = new Uint8Array(await file.slice(0, 12).arrayBuffer());
            let hex = "";
            for (let i = 0; i < headBuffer.length; i++) {
                hex += headBuffer[i].toString(16).padStart(2, "0");
            }
            hex = hex.toUpperCase();

            let isMagicValid = false;
            const mime = file.type.toLowerCase();

            if (hex.startsWith("FFD8FF") && (mime === "image/jpeg" || mime === "image/jpg")) {
                isMagicValid = true;
            } else if (hex.startsWith("89504E470D0A1A0A") && mime === "image/png") {
                isMagicValid = true;
            } else if (hex.startsWith("25504446") && mime === "application/pdf") {
                isMagicValid = true;
            } else if (hex.startsWith("52494646") && hex.substring(16, 24) === "57454250" && mime === "image/webp") {
                isMagicValid = true;
            }

            if (!isMagicValid) {
                toast.error("Security alert: File header mismatch! The actual file content does not match its extension.");
                e.target.value = "";
                return;
            }
        } catch (err) {
            console.error("Client-side file headers verification error:", err);
            toast.error("Failed to verify file security headers.");
            e.target.value = "";
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            toast.error("File size exceeds 5MB limit.");
            e.target.value = "";
            return;
        }

        if (file.type.startsWith("image/")) {
            try {
                const compressed = await compressImage(file);
                setter(compressed);
            } catch (err) {
                console.error("Compression error:", err);
                setter(file);
            }
        } else {
            setter(file);
        }
    };

    const isStepValid = (step: Step): boolean => {
        if (step === "PATHWAY") {
            return !hasActiveTransaction;
        }
        if (step === "PROFILE") {
            const hasCapital = businessType === "NEW" ? !!formState.capitalInvestment : !!formState.grossSales;
            const hasRegistration = businessType === "NEW" ? (!!formState.registrationType && !!formState.dtiSecNumber && !!formState.dtiSecDate) : !!formState.permitNumber;
            return !!formState.businessName && !!formState.lineOfBusiness && !!formState.barangay && hasCapital && !!formState.businessBranch && !!formState.tinNumber && hasRegistration;
        }
        if (step === "CHECKLIST") {
            return true;
        }
        if (step === "SCHEDULE") {
            return !!selectedDate && !!selectedSlot;
        }
        if (step === "SUBMIT") {
            return privacyAccepted;
        }
        return true;
    };

    const handleNext = () => {
        if (!isStepValid(currentStep)) {
            setShowValidationErrors(true);
            toast.error("Please fill in all required fields and upload the necessary documents.");
            return;
        }
        setShowValidationErrors(false);

        const idx = STEPS.findIndex(s => s.id === currentStep);
        if (idx < STEPS.length - 1) {
            setCurrentStep(STEPS[idx + 1].id);
        }
    };

    const handleBack = () => {
        setShowValidationErrors(false);
        const idx = STEPS.findIndex(s => s.id === currentStep);
        if (idx > 0) {
            setCurrentStep(STEPS[idx - 1].id);
        }
    };

    const handleSubmit = async () => {
        if (!isStepValid("PATHWAY") || !isStepValid("PROFILE") || !isStepValid("CHECKLIST") || !isStepValid("SCHEDULE")) {
            toast.error("Verification failed. Please review your details.");
            return;
        }

        setSubmitting(true);
        try {
            const targetType = businessTypes.find(t => t.code === (businessType === "NEW" ? "BUSINESS_PERMIT_NEW" : "BUSINESS_PERMIT_RENEW"));
            if (!targetType) {
                toast.error("Invalid transaction type configuration.");
                setSubmitting(false);
                return;
            }

            const formDataPayload = new FormData();
            formDataPayload.append("typeId", targetType.id);
            formDataPayload.append("appointmentDate", selectedDate);
            formDataPayload.append("appointmentSlot", selectedSlot);
            formDataPayload.append("residentSnapshot", JSON.stringify(residentState));

            const addData = {
                ...formState,
                businessType,
                isPriorityLane,
                capitalInvestment: parseFloat(formState.capitalInvestment.replace(/,/g, "")) || 0,
                grossSales: parseFloat(formState.grossSales.replace(/,/g, "")) || 0,
            };
            formDataPayload.append("additionalData", JSON.stringify(addData));

            if (idFile) formDataPayload.append("idFile", idFile);
            if (ctcFile) formDataPayload.append("ctcFile", ctcFile);
            if (dtiSecFile) formDataPayload.append("dtiSecFile", dtiSecFile);
            if (brgyClearanceFile) formDataPayload.append("brgyClearanceFile", brgyClearanceFile);
            if (sanitaryPermitFile) formDataPayload.append("sanitaryPermitFile", sanitaryPermitFile);
            if (fireSafetyFile) formDataPayload.append("fireSafetyFile", fireSafetyFile);
            if (previousPermitFile) formDataPayload.append("previousPermitFile", previousPermitFile);
            if (birCorFile) formDataPayload.append("birCorFile", birCorFile);
            if (locationPhotoFile) formDataPayload.append("locationPhotoFile", locationPhotoFile);

            if (existingIdUrl) formDataPayload.append("existingIdUrl", existingIdUrl);

            const res = await submitBusinessAppointment(formDataPayload);
            if (res.success && res.data) {
                toast.success("Business Permit Appointment booked successfully!");
                router.push(`/user/appointment/${res.data.id}`);
            } else {
                toast.error(res.error || "Failed to submit booking");
            }
        } catch (err) {
            console.error("Submit error:", err);
            toast.error("An unexpected error occurred. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };


    const getCurrentTabIdx = () => {
        if (currentStep === "PATHWAY") return 0;
        if (currentStep === "PROFILE") return 1;
        if (currentStep === "SCHEDULE") return 2;
        if (currentStep === "CHECKLIST") return 3;
        return 4; // SUBMIT or SUCCESS
    };

    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-0 pb-8 space-y-12 pb-32">
            {/* Header / Breadcrumb */}
            <div className="space-y-4 md:space-y-10">
                <div className="sticky top-[64px] sm:top-[80px] z-40 md:static -mx-4 md:mx-0 px-4 md:px-0 pt-2 md:pt-0">
                    <Breadcrumb>
                        <BreadcrumbList className="flex-nowrap whitespace-nowrap overflow-x-auto scrollbar-none max-w-full bg-white/80 dark:bg-white/5 backdrop-blur-md px-4 md:px-6 py-2 md:py-2.5 rounded-xl md:rounded-2xl border border-slate-200 dark:border-white/10 w-fit shadow-sm">
                            <BreadcrumbItem>
                                <BreadcrumbLink href="/" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-primary transition-colors italic">
                                    <Home className="w-3.5 h-3.5 mb-0.5" /> Home
                                </BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator className="text-slate-300 dark:text-white/10" />
                            <BreadcrumbItem>
                                <BreadcrumbLink href="/user/services" className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-primary transition-colors italic">
                                    Services
                                </BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator className="text-slate-300 dark:text-white/10" />
                            <BreadcrumbItem>
                                <BreadcrumbPage className="text-[10px] font-black uppercase tracking-widest italic" style={{ color: themeColor }}>Permit Appointment Portal</BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                </div>

                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6 px-1 md:px-0">
                    <div className="space-y-1 md:space-y-2">
                        <h1 className="text-4xl md:text-7xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none select-none">
                            BUSINESS <span className="text-primary underline decoration-[6px] md:decoration-8 decoration-primary/20 underline-offset-[6px] md:underline-offset-[12px]" style={{ textDecorationColor: `${themeColor}33`, color: themeColor }}>PERMIT</span>
                        </h1>
                        <p className="text-[9px] md:text-[11px] font-bold text-slate-400 uppercase tracking-[0.4em] ml-1 md:ml-2 italic">Streamlined Permitting & Compliance Portal</p>
                    </div>
                </div>
            </div>

            {/* Progress Stepper */}
            {currentStep !== "SUCCESS" && (
                <div className="grid grid-cols-5 gap-1.5 md:gap-4 relative px-1 md:px-2">
                    {STEP_TABS.map((step, idx) => {
                        const isActive = getCurrentTabIdx() === idx;
                        const isCompleted = getCurrentTabIdx() > idx;
                        const Icon = step.icon;
                        return (
                            <div
                                key={idx}
                                className={cn(
                                    "flex flex-col items-center gap-2 md:gap-3 relative z-10 font-black cursor-pointer group"
                                )}
                            >
                                <div
                                    className={cn(
                                        "w-11 h-11 md:w-16 md:h-16 rounded-xl md:rounded-2xl flex items-center justify-center transition-all duration-500 border-2",
                                        isActive ? "bg-primary text-white border-primary shadow-lg scale-105 md:scale-110" :
                                            isCompleted ? "" :
                                                "bg-slate-100 dark:bg-white/5 text-slate-400 border-transparent group-hover:border-primary/30"
                                    )}
                                    style={
                                        isActive 
                                            ? { backgroundColor: themeColor, borderColor: themeColor, boxShadow: `0 0 20px ${themeColor}4d` } 
                                            : isCompleted 
                                                ? { backgroundColor: `${themeColor}1a`, color: themeColor, borderColor: `${themeColor}4d` }
                                                : {}
                                    }
                                >
                                    <Icon className="w-4 h-4 md:w-7 md:h-7" />
                                </div>
                                <span className={cn(
                                    "text-[7px] md:text-[10px] uppercase tracking-widest text-center italic hidden sm:block",
                                    isActive ? "text-primary opacity-100 font-black" : "opacity-40 group-hover:opacity-100 transition-opacity"
                                )} style={isActive ? { color: themeColor } : {}}>
                                    {step.label}
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Step Content Card Wrapper */}
            <div className="mt-4 md:mt-8 md:bg-white md:dark:bg-[#11131a] md:rounded-[2.5rem] md:border md:border-slate-200 md:dark:border-white/10 p-0 md:p-12 md:shadow-2xl relative md:overflow-hidden group/container min-h-[400px] md:min-h-[500px] flex flex-col">
                <div className="flex-1">
                    <AnimatePresence mode="wait">
                        {/* STEP 1: PATHWAY */}
                        {currentStep === "PATHWAY" && (
                            <motion.div
                                key="pathway-step"
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -15 }}
                                className="space-y-8 md:space-y-12"
                            >
                                <div className="space-y-3 md:space-y-4 text-center">
                                    <h2 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter leading-tight">
                                        Choose Application <span style={{ color: themeColor }}>Pathway</span>
                                    </h2>
                                    <p className="text-slate-500 font-medium italic text-xs md:text-lg uppercase tracking-widest max-w-2xl mx-auto">Select your current business permit status to proceed.</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 max-w-4xl mx-auto">
                                    {[
                                        {
                                            id: "NEW",
                                            label: "Business Permit - New",
                                            desc: "Apply for a new business permit for starting a business in Mapandan, Pangasinan.",
                                            icon: Sparkles
                                        },
                                        {
                                            id: "RENEWAL",
                                            label: "Business Permit - Renewal",
                                            desc: "Renew your existing business permit. Calculated based on previous annual gross sales.",
                                            icon: TrendingUp
                                        }
                                    ].map(opt => {
                                        const isSelected = businessType === opt.id;
                                        const Icon = opt.icon;
                                        return (
                                            <button
                                                key={opt.id}
                                                onClick={() => {
                                                    setBusinessType(opt.id as any);
                                                    if (opt.id === "RENEWAL" && previousPermits.length > 0) {
                                                        setShowRenewalModal(true);
                                                    }
                                                }}
                                                className={cn(
                                                    "p-6 md:p-10 rounded-2xl md:rounded-[3rem] border-2 md:border-4 transition-all duration-500 text-left relative group select-none overflow-hidden h-[240px] md:h-[300px] flex flex-col justify-between",
                                                    isSelected ? "bg-primary text-white border-primary shadow-2xl scale-[1.02]" : "bg-white/40 dark:bg-white/5 backdrop-blur-md border-slate-100 dark:border-white/10 hover:border-primary/30"
                                                )}
                                                style={isSelected ? { backgroundColor: themeColor, borderColor: themeColor } : {}}
                                            >
                                                <div className={cn("w-14 h-14 md:w-20 md:h-20 rounded-xl md:rounded-[2rem] flex items-center justify-center transition-transform group-hover:scale-110", isSelected ? "bg-white/20" : "bg-primary/5 text-primary")} style={!isSelected ? { color: themeColor, backgroundColor: `${themeColor}0d` } : {}}>
                                                    <Icon className={cn("w-6 h-6 md:w-10 md:h-10", isSelected ? "animate-pulse" : "")} />
                                                </div>
                                                <div className="space-y-1 md:space-y-2 relative z-10">
                                                    <h4 className="text-xl md:text-2xl font-black uppercase italic tracking-tighter">
                                                        {opt.label}
                                                    </h4>
                                                    <p className={cn("text-[9px] md:text-[11px] font-bold uppercase italic tracking-widest leading-relaxed", isSelected ? "text-white/70" : "text-slate-400")}>
                                                        {opt.desc}
                                                    </p>
                                                </div>
                                                {isSelected && (
                                                    <div className="absolute top-6 right-6 md:top-8 md:right-8 w-8 h-8 md:w-10 md:h-10 bg-white rounded-full flex items-center justify-center text-primary shadow-xl">
                                                        <Check className="w-4 h-4 md:w-6 md:h-6 stroke-[4]" style={{ color: themeColor }} />
                                                    </div>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>

                                {hasActiveTransaction && (
                                    <div className="p-5 rounded-2xl bg-red-500/10 border border-red-500/10 text-red-500 flex items-start gap-3">
                                        <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
                                        <p className="text-[10px] font-bold italic leading-relaxed">
                                            You already have an active/pending BPLO transaction for {businessType === "NEW" ? "New Business" : "Renewal"}. Please complete or cancel it first.
                                        </p>
                                    </div>
                                )}

                                <div className="mt-8 flex justify-end">
                                    <Button
                                        onClick={handleNext}
                                        disabled={hasActiveTransaction}
                                        className="bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/20 text-[10px] md:text-xs rounded-xl md:rounded-2xl px-8 md:px-12 h-10 md:h-14 group transition-all duration-300 active:scale-95 font-black uppercase tracking-widest italic"
                                        style={{ backgroundColor: themeColor }}
                                    >
                                        Next Phase <ChevronRight className="w-4 h-4 ml-2" />
                                    </Button>
                                </div>
                            </motion.div>
                        )}

                        {/* STEP 2: BUSINESS DETAILS */}
                        {currentStep === "PROFILE" && (
                            <motion.div
                                key="profile-step"
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -15 }}
                                className="space-y-8"
                            >
                                <div className="border-b border-slate-100 dark:border-white/5 pb-4">
                                    <h2 className="text-2xl font-black uppercase italic text-slate-900 dark:text-white tracking-tighter">Business Details</h2>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Provide legal and financial registration metrics</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500 italic">Official Business Name (DTI/SEC) <span className="text-rose-500 ml-0.5">*</span></Label>
                                        <Input
                                            type="text"
                                            value={formState.businessName}
                                            onChange={e => handleInputChange("businessName", e.target.value)}
                                            placeholder="e.g. Mapandan Express Café Inc."
                                            className={cn(
                                                "rounded-xl h-12 border-slate-200 transition-all duration-200",
                                                showValidationErrors && !formState.businessName && "border-red-500 focus-visible:ring-red-500/20 dark:border-red-500/50"
                                            )}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500 italic">Trade / Signage Name</Label>
                                        <Input
                                            type="text"
                                            value={formState.tradeName}
                                            onChange={e => handleInputChange("tradeName", e.target.value)}
                                            placeholder="e.g. Mapandan Express Café"
                                            className="rounded-xl h-12 border-slate-200"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500 italic">Organization Type <span className="text-rose-500 ml-0.5">*</span></Label>
                                        <div className="relative">
                                            <select
                                                value={formState.orgType}
                                                onChange={e => handleInputChange("orgType", e.target.value)}
                                                className={cn(
                                                    "w-full appearance-none rounded-xl h-12 border border-slate-200 dark:border-white bg-white dark:bg-[#0c0d12]/50 px-4 pr-10 text-xs md:text-sm font-bold text-slate-900 dark:text-white focus:outline-none transition-all cursor-pointer shadow-sm hover:border-slate-300 dark:hover:border-white/20",
                                                    showValidationErrors && !formState.orgType && "border-red-500 ring-2 ring-red-500/20 dark:border-red-500/50"
                                                )}
                                            >
                                                <option value="SOLE_PROPRIETORSHIP" className="dark:bg-[#0c0d12] text-slate-900 dark:text-white font-bold">Sole Proprietorship</option>
                                                <option value="PARTNERSHIP" className="dark:bg-[#0c0d12] text-slate-900 dark:text-white font-bold">Partnership</option>
                                                <option value="CORPORATION" className="dark:bg-[#0c0d12] text-slate-900 dark:text-white font-bold">Corporation</option>
                                            </select>
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                                <ChevronDown className="w-4 h-4" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500 italic">Business Barangay Location <span className="text-rose-500 ml-0.5">*</span></Label>
                                        <div className="relative">
                                            <select
                                                value={formState.barangay}
                                                onChange={e => handleInputChange("barangay", e.target.value)}
                                                className={cn(
                                                    "w-full appearance-none rounded-xl h-12 border border-slate-200 dark:border-white bg-white dark:bg-[#0c0d12]/50 px-4 pr-10 text-xs md:text-sm font-bold text-slate-900 dark:text-white focus:outline-none transition-all cursor-pointer shadow-sm hover:border-slate-300 dark:hover:border-white/20",
                                                    showValidationErrors && !formState.barangay && "border-red-500 ring-2 ring-red-500/20 dark:border-red-500/50"
                                                )}
                                            >
                                                <option value="" disabled className="dark:bg-[#0c0d12] text-slate-400">Select Barangay...</option>
                                                {MAPANDAN_BARANGAYS.map((b) => (
                                                    <option key={b} value={b} className="dark:bg-[#0c0d12] text-slate-900 dark:text-white font-bold">{b}</option>
                                                ))}
                                            </select>
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                                <ChevronDown className="w-4 h-4" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500 italic">Building / House No. / Unit</Label>
                                        <Input
                                            type="text"
                                            value={formState.building}
                                            onChange={e => handleInputChange("building", e.target.value)}
                                            placeholder="e.g. Bldg 4A, Green Meadows (Optional)"
                                            className="rounded-xl h-12 border-slate-200"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500 italic">Street Address</Label>
                                        <Input
                                            type="text"
                                            value={formState.street}
                                            onChange={e => handleInputChange("street", e.target.value)}
                                            placeholder="e.g. Rizal Avenue (Optional)"
                                            className="rounded-xl h-12 border-slate-200"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500 italic">Line of Business / Classification <span className="text-rose-500 ml-0.5">*</span></Label>
                                        {!isOtherLine ? (
                                            <div className="relative">
                                                <select
                                                    value={formState.lineOfBusiness || ""}
                                                    onChange={e => handleLineOfBusinessSelect(e.target.value)}
                                                    className={cn(
                                                        "w-full appearance-none rounded-xl h-12 border border-slate-200 dark:border-white bg-white dark:bg-[#0c0d12]/50 px-4 pr-10 text-xs md:text-sm font-bold text-slate-900 dark:text-white focus:outline-none transition-all cursor-pointer shadow-sm hover:border-slate-300 dark:hover:border-white/20",
                                                        showValidationErrors && !formState.lineOfBusiness && "border-red-500 ring-2 ring-red-500/20 dark:border-red-500/50"
                                                    )}
                                                >
                                                    <option value="" disabled className="dark:bg-[#0c0d12] text-slate-400">Select Line of Business...</option>
                                                    {LINE_OF_BUSINESS_OPTIONS.map((opt) => (
                                                        <option key={opt} value={opt} className="dark:bg-[#0c0d12] text-slate-900 dark:text-white font-bold">{opt}</option>
                                                    ))}
                                                    <option value="Other" className="dark:bg-[#0c0d12] text-slate-900 dark:text-white font-bold">Other...</option>
                                                </select>
                                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                                    <ChevronDown className="w-4 h-4" />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="relative">
                                                <Input
                                                    type="text"
                                                    value={formState.lineOfBusiness}
                                                    onChange={e => handleInputChange("lineOfBusiness", e.target.value)}
                                                    placeholder="Enter your custom line of business..."
                                                    className={cn(
                                                         "rounded-xl h-12 border-slate-200 pr-10 font-bold",
                                                         showValidationErrors && !formState.lineOfBusiness && "border-red-500 focus-visible:ring-red-500/20 dark:border-red-500/50"
                                                     )}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setIsOtherLine(false);
                                                        handleInputChange("lineOfBusiness", "");
                                                    }}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-white/10 transition-all select-none"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500 italic">Employee Count</Label>
                                        <Input
                                            type="number"
                                            value={formState.employeeCount}
                                            onChange={e => handleInputChange("employeeCount", e.target.value)}
                                            min="0"
                                            className="rounded-xl h-12 border-slate-200"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500 italic">Store Area (in Sqm)</Label>
                                        <Input
                                            type="number"
                                            value={formState.businessArea}
                                            onChange={e => handleInputChange("businessArea", e.target.value)}
                                            placeholder="e.g. 120"
                                            className="rounded-xl h-12 border-slate-200"
                                        />
                                    </div>

                                    {businessType === "NEW" ? (
                                        <div className="space-y-2 relative">
                                            <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500 italic">Initial Capitalization (₱) <span className="text-rose-500 ml-0.5">*</span></Label>
                                            <Input
                                                type="text"
                                                value={formState.capitalInvestment}
                                                onChange={e => {
                                                    const cleanVal = e.target.value.replace(/[^0-9.,]/g, "");
                                                    handleInputChange("capitalInvestment", cleanVal);
                                                }}
                                                placeholder="e.g. 250,000"
                                                className={cn(
                                                    "rounded-xl h-12 border-slate-200 font-mono font-bold",
                                                    showValidationErrors && !formState.capitalInvestment && "border-red-500 focus-visible:ring-red-500/20 dark:border-red-500/50"
                                                )}
                                            />
                                        </div>
                                    ) : (
                                        <div className="space-y-2 relative">
                                            <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500 italic">Annual Gross Sales In The Previous Year (₱) <span className="text-rose-500 ml-0.5">*</span></Label>
                                            <Input
                                                type="text"
                                                value={formState.grossSales}
                                                onChange={e => {
                                                    const cleanVal = e.target.value.replace(/[^0-9.,]/g, "");
                                                    handleInputChange("grossSales", cleanVal);
                                                }}
                                                placeholder="e.g. 1,200,000"
                                                className={cn(
                                                    "rounded-xl h-12 border-slate-200 font-mono font-bold",
                                                    showValidationErrors && !formState.grossSales && "border-red-500 focus-visible:ring-red-500/20 dark:border-red-500/50"
                                                )}
                                            />
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500 italic">Branch of Business <span className="text-rose-500 ml-0.5">*</span></Label>
                                        <div className="relative">
                                            <select
                                                value={formState.businessBranch}
                                                onChange={e => handleInputChange("businessBranch", e.target.value)}
                                                className={cn(
                                                    "w-full appearance-none rounded-xl h-12 border border-slate-200 dark:border-white bg-white dark:bg-[#0c0d12]/50 px-4 pr-10 text-xs md:text-sm font-bold text-slate-900 dark:text-white focus:outline-none transition-all cursor-pointer shadow-sm hover:border-slate-300 dark:hover:border-white/20",
                                                    showValidationErrors && !formState.businessBranch && "border-red-500 ring-2 ring-red-500/20 dark:border-red-500/50"
                                                )}
                                            >
                                                <option value="MAIN" className="dark:bg-[#0c0d12] text-slate-900 dark:text-white font-bold">Main</option>
                                                <option value="BRANCH" className="dark:bg-[#0c0d12] text-slate-900 dark:text-white font-bold">Branch</option>
                                            </select>
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                                <ChevronDown className="w-4 h-4" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500 italic">TIN No. of the Business <span className="text-rose-500 ml-0.5">*</span></Label>
                                        <Input
                                            type="text"
                                            value={formState.tinNumber}
                                            onChange={e => handleInputChange("tinNumber", e.target.value)}
                                            placeholder="e.g. 123-456-789-000"
                                            className={cn(
                                                "rounded-xl h-12 border-slate-200 font-bold",
                                                showValidationErrors && !formState.tinNumber && "border-red-500 focus-visible:ring-red-500/20 dark:border-red-500/50"
                                            )}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500 italic">PhilHealth Number <span className="text-slate-400 font-normal ml-1">(Optional)</span></Label>
                                        <Input
                                            type="text"
                                            value={formState.philhealthNumber}
                                            onChange={e => handleInputChange("philhealthNumber", e.target.value)}
                                            placeholder="e.g. 12-345678901-2"
                                            className="rounded-xl h-12 border-slate-200 font-bold"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500 italic">Pag-Ibig MID Number <span className="text-slate-400 font-normal ml-1">(Optional)</span></Label>
                                        <Input
                                            type="text"
                                            value={formState.pagibigNumber}
                                            onChange={e => handleInputChange("pagibigNumber", e.target.value)}
                                            placeholder="e.g. 1234-5678-9012"
                                            className="rounded-xl h-12 border-slate-200 font-bold"
                                        />
                                    </div>

                                    <div className="space-y-2 col-span-1 md:col-span-2">
                                        <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500 italic">SSS Number <span className="text-slate-400 font-normal ml-1">(Optional)</span></Label>
                                        <Input
                                            type="text"
                                            value={formState.sssNumber}
                                            onChange={e => handleInputChange("sssNumber", e.target.value)}
                                            placeholder="e.g. 12-3456789-0"
                                            className="rounded-xl h-12 border-slate-200 font-bold"
                                        />
                                    </div>

                                    {/* Pathway Specific Inputs */}
                                    {businessType === "NEW" ? (
                                        <div className="space-y-2 col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in duration-200">
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500 italic">Registration Type <span className="text-rose-500 ml-0.5">*</span></Label>
                                                <div className="relative">
                                                    <select
                                                        value={formState.registrationType}
                                                        onChange={e => handleInputChange("registrationType", e.target.value)}
                                                        className={cn(
                                                            "w-full appearance-none rounded-xl h-12 border border-slate-200 dark:border-white bg-white dark:bg-[#0c0d12]/50 px-4 pr-10 text-xs md:text-sm font-bold text-slate-900 dark:text-white focus:outline-none transition-all cursor-pointer shadow-sm hover:border-slate-300 dark:hover:border-white/20",
                                                            showValidationErrors && !formState.registrationType && "border-red-500 ring-2 ring-red-500/20 dark:border-red-500/50"
                                                        )}
                                                    >
                                                        <option value="DTI" className="dark:bg-[#0c0d12] text-slate-900 dark:text-white font-bold">DTI</option>
                                                        <option value="SEC" className="dark:bg-[#0c0d12] text-slate-900 dark:text-white font-bold">SEC</option>
                                                        <option value="COA" className="dark:bg-[#0c0d12] text-slate-900 dark:text-white font-bold">COA</option>
                                                    </select>
                                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                                        <ChevronDown className="w-4 h-4" />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500 italic">{formState.registrationType} Registration Number <span className="text-rose-500 ml-0.5">*</span></Label>
                                                <Input
                                                    type="text"
                                                    value={formState.dtiSecNumber}
                                                    onChange={e => handleInputChange("dtiSecNumber", e.target.value)}
                                                    placeholder={`e.g. ${formState.registrationType === "DTI" ? "DTI-123456789" : formState.registrationType === "SEC" ? "SEC-CS202012345" : "COA-987654"}`}
                                                    className={cn(
                                                        "rounded-xl h-12 border-slate-200 font-bold",
                                                        showValidationErrors && !formState.dtiSecNumber && "border-red-500 focus-visible:ring-red-500/20 dark:border-red-500/50"
                                                    )}
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500 italic">{formState.registrationType} Registration Date <span className="text-rose-500 ml-0.5">*</span></Label>
                                                <Input
                                                    type="date"
                                                    value={formState.dtiSecDate}
                                                    onChange={e => handleInputChange("dtiSecDate", e.target.value)}
                                                    className={cn(
                                                        "rounded-xl h-12 border-slate-200 font-bold",
                                                        showValidationErrors && !formState.dtiSecDate && "border-red-500 focus-visible:ring-red-500/20 dark:border-red-500/50"
                                                    )}
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-2 col-span-1 md:col-span-2 animate-in fade-in duration-200">
                                            <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500 italic">Existing Permit License Number <span className="text-rose-500 ml-0.5">*</span></Label>
                                            <Input
                                                type="text"
                                                value={formState.permitNumber}
                                                onChange={e => handleInputChange("permitNumber", e.target.value)}
                                                placeholder="e.g. BP-2025-00123"
                                                className={cn(
                                                    "rounded-xl h-12 border-slate-200 font-bold",
                                                    showValidationErrors && !formState.permitNumber && "border-red-500 focus-visible:ring-red-500/20 dark:border-red-500/50"
                                                )}
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="mt-8 flex justify-between">
                                    <Button variant="outline" onClick={handleBack} className="h-12 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500">
                                        Back
                                    </Button>
                                    <Button
                                        onClick={handleNext}
                                        className="text-white shadow-md text-[10px] md:text-xs rounded-xl md:rounded-2xl px-8 md:px-12 h-10 md:h-14 group transition-all duration-300 active:scale-95 font-black uppercase tracking-widest italic"
                                        style={{ backgroundColor: themeColor }}
                                    >
                                        Next Phase <ChevronRight className="w-4 h-4 ml-2" />
                                    </Button>
                                </div>
                            </motion.div>
                        )}

                        {/* STEP 4: CHECKLIST */}
                    {currentStep === "CHECKLIST" && (
                        <motion.div
                            key="checklist-step"
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -15 }}
                            className="space-y-8"
                        >
                            <div className="border-b border-slate-100 dark:border-white/5 pb-4">
                                <h2 className="text-2xl font-black uppercase italic text-slate-900 dark:text-white tracking-tighter">Required Document Checklist</h2>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Provide the required legal registrations and clearances to complete your submission</p>

                                <div className="mt-4 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-3 text-amber-500 animate-in fade-in duration-300">
                                    <ShieldAlert className="w-5 h-5 shrink-0 animate-pulse" />
                                    <div className="text-left">
                                        <p className="text-[10px] font-black uppercase tracking-wider italic">Notice for Multiple Pages/Images</p>
                                        <p className="text-xs font-bold text-slate-600 dark:text-slate-400">If your document has more than 1 image/page, please compile them into a single PDF file before uploading.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {((businessType === "NEW"
                                    ? [
                                        { label: "1. Owner's Valid ID", field: "idFile", file: idFile, setter: setIdFile, existingUrl: existingIdUrl, optional: true },
                                        { label: "2. Community Tax Certificate (CTC/Cedula)", field: "ctcFile", file: ctcFile, setter: setCtcFile, optional: true },
                                        { label: "3. DTI / SEC / COA Registration", field: "dtiSecFile", file: dtiSecFile, setter: setDtiSecFile, optional: true },
                                        { label: "4. BIR Certificate of Registration (COR)", field: "birCorFile", file: birCorFile, setter: setBirCorFile, optional: true },
                                        { label: "5. Barangay Clearance", field: "brgyClearanceFile", file: brgyClearanceFile, setter: setBrgyClearanceFile, optional: true },
                                        { label: "6. Location Photo of Business", field: "locationPhotoFile", file: locationPhotoFile, setter: setLocationPhotoFile, optional: true },
                                        { label: "7. Sanitary Permit", field: "sanitaryPermitFile", file: sanitaryPermitFile, setter: setSanitaryPermitFile, optional: true },
                                        { label: "8. Fire Safety Inspection Certificate", field: "fireSafetyFile", file: fireSafetyFile, setter: setFireSafetyFile, optional: true }
                                    ]
                                    : [
                                        { label: "1. Owner's Valid ID", field: "idFile", file: idFile, setter: setIdFile, existingUrl: existingIdUrl, optional: true },
                                        { label: "2. Community Tax Certificate (CTC/Cedula)", field: "ctcFile", file: ctcFile, setter: setCtcFile, optional: true },
                                        { label: "3. DTI / SEC / COA Registration", field: "dtiSecFile", file: dtiSecFile, setter: setDtiSecFile, optional: true },
                                        { label: "4. BIR Certificate of Registration (COR)", field: "birCorFile", file: birCorFile, setter: setBirCorFile, optional: true },
                                        { label: "5. Previous Business Permit", field: "previousPermitFile", file: previousPermitFile, setter: setPreviousPermitFile, optional: true }
                                    ]
                                ) as { label: string; field: string; file: File | null; setter: (f: File | null) => void; existingUrl?: string | null; optional?: boolean }[]).map(item => {
                                    const hasFile = !!item.file || !!item.existingUrl;
                                    return (
                                        <div key={item.field} className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500 italic flex items-center">
                                                    <span>{item.label}</span>
                                                    {!item.optional && <span className="text-rose-500 ml-0.5">*</span>}
                                                </Label>
                                                {item.optional && (
                                                    <span className="text-[9px] text-slate-400 font-bold tracking-widest uppercase italic">
                                                        (optional)
                                                    </span>
                                                )}
                                            </div>

                                            <div className={cn(
                                                "p-4 md:p-5 bg-slate-50/50 dark:bg-white/[0.02] rounded-3xl border border-dashed flex flex-col gap-4 relative overflow-hidden transition-all duration-300 hover:border-primary/40 shadow-sm",
                                                hasFile ? "border-primary dark:border-primary/30 bg-primary/[0.01]" : "border-slate-200 dark:border-white/10"
                                            )}>
                                                <div className="flex items-center gap-3.5 w-full text-left">
                                                    <div className={cn(
                                                        "w-11 h-11 bg-white dark:bg-black/20 border rounded-xl flex items-center justify-center shadow-sm shrink-0",
                                                        hasFile ? "border-primary/20 dark:border-primary/20 text-primary" : "border-slate-100 dark:border-white/5 text-primary"
                                                    )}>
                                                        <Upload className={cn("w-4 h-4", hasFile && "animate-bounce")} />
                                                    </div>
                                                    <div className="space-y-0.5 min-w-0">
                                                        <h4 className="text-[10px] md:text-[11px] font-black uppercase tracking-widest text-slate-700 dark:text-white italic truncate pr-2">
                                                            {item.label.replace(/^\d+\.\s*/, "")}
                                                        </h4>
                                                        <p className="text-[8px] md:text-[9px] text-slate-400 font-bold italic uppercase tracking-tighter truncate">
                                                            {item.file
                                                                ? `Uploaded (${(item.file.size / 1024).toFixed(1)} KB)`
                                                                : item.existingUrl
                                                                    ? "Preloaded from Resident Profile"
                                                                    : (item.optional ? "PDF / IMAGE (OPTIONAL)" : "PDF / IMAGE (MAX 5MB)")}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Live File Preview Card */}
                                                {item.file ? (
                                                    <FilePreview file={item.file} onClick={() => handleViewFile(item.file, null, item.label)} />
                                                ) : item.existingUrl ? (
                                                    <div
                                                        onClick={() => handleViewFile(null, item.existingUrl!, item.label)}
                                                        className="relative rounded-2xl overflow-hidden border border-slate-100 dark:border-white/5 bg-slate-100 dark:bg-black/30 h-28 flex items-center justify-center group/preview cursor-pointer animate-in fade-in duration-200"
                                                    >
                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                                        <img
                                                            src={item.existingUrl}
                                                            alt="Preloaded Document"
                                                            className="object-cover w-full h-full group-hover/preview:scale-105 transition-transform duration-300"
                                                        />
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/preview:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                            <span className="text-[10px] text-white font-black uppercase tracking-widest bg-black/60 px-3.5 py-1.5 rounded-full backdrop-blur-md flex items-center gap-1.5 hover:bg-black/80 transition-colors">
                                                                <Eye className="w-3.5 h-3.5" />
                                                                CLICK TO VIEW FULL SIZE
                                                            </span>
                                                        </div>
                                                    </div>
                                                ) : null}

                                                <div className="flex items-center justify-between w-full mt-1">
                                                    <input
                                                        type="file"
                                                        onChange={(e) => handleFileChange(e, item.setter)}
                                                        className="hidden"
                                                        id={`upload-${item.field}`}
                                                        accept=".pdf,.png,.jpg,.jpeg"
                                                    />
                                                    {hasFile ? (
                                                        <div className="flex gap-2 w-full">
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                onClick={() => document.getElementById(`upload-${item.field}`)?.click()}
                                                                className="flex-1 font-black italic uppercase tracking-widest text-[9px] sm:text-xs h-10 rounded-2xl transition-all select-none border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 active:scale-[0.98] shadow-sm bg-transparent"
                                                            >
                                                                Change File
                                                            </Button>
                                                            {!(item.field === "idFile" && item.existingUrl && !item.file) && (
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    onClick={() => item.setter(null)}
                                                                    className="flex-1 font-black italic uppercase tracking-widest text-[9px] sm:text-xs h-10 rounded-2xl transition-all border-rose-200/50 dark:border-rose-500/10 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 active:scale-[0.98] shadow-sm bg-transparent"
                                                                >
                                                                    Remove
                                                                </Button>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <Button
                                                            type="button"
                                                            onClick={() => document.getElementById(`upload-${item.field}`)?.click()}
                                                            className="font-black italic uppercase tracking-widest text-[9px] sm:text-xs h-10 w-full rounded-2xl transition-all select-none bg-primary hover:bg-primary/90 text-white shadow-md active:scale-[0.98]"
                                                            style={{ backgroundColor: themeColor }}
                                                        >
                                                            Upload
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-white/5">
                                <Button variant="outline" onClick={handleBack} className="h-12 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500">
                                    Back
                                </Button>
                                <Button
                                    onClick={handleNext}
                                    className="h-12 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest text-white italic shadow-md gap-2"
                                    style={{ backgroundColor: themeColor }}
                                >
                                    Review Details <ChevronRight className="w-4 h-4" />
                                </Button>
                            </div>
                        </motion.div>
                    )}

                    {/* STEP 5: SCHEDULE PICKER */}
                    {currentStep === "SCHEDULE" && (
                        <motion.div
                            key="schedule-step"
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -15 }}
                            className="space-y-8"
                        >
                            <div className="space-y-1">
                                <h3 className="text-lg font-black uppercase italic tracking-tighter text-slate-800 dark:text-white">Choose Appointment Schedule</h3>
                                <p className="text-[10px] text-slate-400 italic">Select an available date and shift slot for BPLO counter validation.</p>
                            </div>

                            <SchedulePicker
                                selectedDate={selectedDate}
                                setSelectedDate={setSelectedDate}
                                selectedSlot={selectedSlot}
                                setSelectedSlot={setSelectedSlot}
                                bookedSlots={bookedSlots}
                                config={config}
                                themeColor={themeColor}
                            />

                            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-white/5">
                                <Button variant="outline" onClick={handleBack} className="h-12 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500">
                                    Back
                                </Button>
                                <Button
                                    onClick={handleNext}
                                    disabled={!isStepValid("SCHEDULE")}
                                    className="h-12 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest text-white italic shadow-md gap-2"
                                    style={{ backgroundColor: themeColor }}
                                >
                                    Upload Documents <ChevronRight className="w-4 h-4" />
                                </Button>
                            </div>
                        </motion.div>
                    )}

                    {/* STEP 6: SUBMIT */}
                    {currentStep === "SUBMIT" && (
                        <motion.div
                            key="submit-step"
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -15 }}
                            className="space-y-8"
                        >
                            <div className="space-y-1">
                                <h3 className="text-lg font-black uppercase italic tracking-tighter text-slate-800 dark:text-white">Review Appointment Parameters</h3>
                                <p className="text-[10px] text-slate-400 italic">Verify all information before submitting to the queue.</p>
                            </div>

                            <div className="bg-slate-50 dark:bg-white/[0.01] border border-slate-100 dark:border-white/5 p-6 rounded-2xl space-y-4 text-xs leading-relaxed">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Filing Route</span>
                                        <p className="font-black uppercase text-slate-900 dark:text-white">{businessType === "NEW" ? "New Business Registration" : "License Renewal"}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Selected Date</span>
                                        <p className="font-black text-slate-900 dark:text-white">{selectedDate}</p>
                                    </div>
                                    <div className="space-y-1 col-span-1 sm:col-span-2">
                                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Selected Slot</span>
                                        <p className="font-black text-slate-900 dark:text-white">{selectedSlot}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Priority Lane Option */}
                            <div
                                onClick={() => setIsPriorityLane(!isPriorityLane)}
                                className={cn(
                                    "p-5 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-4 select-none",
                                    isPriorityLane ? "bg-primary/5 border-primary shadow-sm" : "bg-slate-50 dark:bg-white/[0.02] border-transparent hover:border-primary/20"
                                )}
                                style={isPriorityLane ? { borderColor: themeColor, backgroundColor: `${themeColor}0a` } : {}}
                            >
                                <div className={cn(
                                    "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0 mt-0.5",
                                    isPriorityLane ? "bg-primary border-primary text-white" : "border-slate-300 dark:border-white/10"
                                )} style={isPriorityLane ? { backgroundColor: themeColor, borderColor: themeColor } : {}}>
                                    {isPriorityLane && <Check className="w-3.5 h-3.5" />}
                                </div>
                                <div className="space-y-1 text-left">
                                    <p className="text-xs font-black italic uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                                        ♿ REQUEST PRIORITY LANE SERVICE
                                    </p>
                                    <p className="text-[8px] md:text-[10px] text-slate-400 font-bold leading-relaxed italic uppercase tracking-widest">
                                        CHECK THIS IF YOU ARE A SENIOR CITIZEN, PWD, OR PREGNANT APPLICANT.
                                    </p>
                                    <p className="text-[9px] font-bold text-amber-500 dark:text-amber-500/90 leading-relaxed uppercase tracking-wider mt-2">
                                        ⚠️ WARNING: YOU MUST PRESENT A VALID PRIORITY ID OR PROOF OF ENTITLEMENT AT THE COUNTER. FAILURE TO PRODUCE VALID VERIFICATION WILL RESULT IN THE IMMEDIATE DISAPPROVAL OF YOUR PRIORITY QUEUE STATUS, AND YOU WILL BE REQUIRED TO BOOK A NEW APPOINTMENT ON ANOTHER DAY.
                                    </p>
                                </div>
                            </div>

                            {/* Privacy Policy Checklist */}
                            <div
                                onClick={() => {
                                    if (privacyAccepted) {
                                        setPrivacyAccepted(false);
                                    } else {
                                        setIsPrivacyModalOpen(true);
                                    }
                                }}
                                className={cn(
                                    "p-5 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-4 select-none",
                                    privacyAccepted ? "bg-primary/5 border-primary shadow-sm" : "bg-slate-50 dark:bg-white/[0.02] border-transparent hover:border-primary/20"
                                )}
                                style={privacyAccepted ? { borderColor: themeColor, backgroundColor: `${themeColor}0a` } : {}}
                            >
                                <div className={cn(
                                    "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0 mt-0.5",
                                    privacyAccepted ? "bg-primary border-primary text-white" : "border-slate-300 dark:border-white/10"
                                )} style={privacyAccepted ? { backgroundColor: themeColor, borderColor: themeColor } : {}}>
                                    {privacyAccepted && <Check className="w-3.5 h-3.5" />}
                                </div>
                                <div className="space-y-1 text-left">
                                    <p className="text-xs font-black italic uppercase tracking-tight text-slate-900 dark:text-white">DATA PRIVACY AND TERMS AGREEMENT</p>
                                    <p className="text-[8px] md:text-[10px] text-slate-500 font-medium leading-relaxed italic uppercase tracking-widest">
                                        I AUTHORIZE THE LGU TO PROCESS MY PERSONAL INFORMATION IN ACCORDANCE WITH THE DATA PRIVACY ACT. I CONFIRM ALL INFO IS TRUE AND CORRECT. CLICK TO REVIEW AGREEMENT.
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-white/5">
                                <Button variant="outline" onClick={handleBack} disabled={submitting} className="h-12 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500">
                                    Back
                                </Button>
                                <Button
                                    onClick={handleSubmit}
                                    disabled={submitting || !privacyAccepted}
                                    className="h-12 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest text-white italic shadow-md gap-2"
                                    style={{ backgroundColor: themeColor }}
                                >
                                    {submitting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" /> Submitting...
                                        </>
                                    ) : (
                                        <>
                                            Submit Appointment <Check className="w-4 h-4" />
                                        </>
                                    )}
                                </Button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
                </div>
            </div>

            {/* RENEWAL AUTOFILL CONFIRMATION MODAL */}
            <AnimatePresence>
                {showRenewalModal && previousPermits.length > 0 && (
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                        {/* Glass backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowRenewalModal(false)}
                            className="absolute inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md"
                        />

                        {/* Modal card */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            transition={{ type: "spring", duration: 0.5 }}
                            className="bg-white dark:bg-[#11131a] rounded-[2rem] border border-slate-200 dark:border-white/10 shadow-2xl p-6 md:p-8 max-w-lg w-full relative z-10 space-y-6 overflow-hidden"
                        >
                            {/* Decorative background gradient */}
                            <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-primary/10 rounded-2xl text-primary shrink-0" style={{ color: themeColor, backgroundColor: `${themeColor}1a` }}>
                                    <Building2 className="w-6 h-6 animate-pulse" />
                                </div>
                                <div className="space-y-1 text-left">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-primary italic" style={{ color: themeColor }}>Record Detected</span>
                                    <h3 className="text-xl md:text-2xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white leading-none">
                                        {previousPermits.length > 1 ? "Renew Which Business?" : "Renew Previous Business?"}
                                    </h3>
                                    <p className="text-[10px] md:text-xs text-slate-400 font-bold uppercase tracking-wide italic">
                                        {previousPermits.length > 1
                                            ? "Select which of your registered businesses to renew!"
                                            : "We found your last successful business permit record!"}
                                    </p>
                                </div>
                            </div>

                            {/* Card showing previous business details or list of businesses */}
                            {previousPermits.length === 1 ? (
                                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 space-y-4 text-left">
                                    <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                                        <div className="col-span-2 space-y-0.5">
                                            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 block">Business Name</span>
                                            <span className="text-sm font-black text-slate-800 dark:text-white uppercase italic truncate block">
                                                {previousPermits[0].additionalData?.businessName || "N/A"}
                                            </span>
                                        </div>
                                        <div className="space-y-0.5">
                                            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 block">Trade Name</span>
                                            <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase italic truncate block">
                                                {previousPermits[0].additionalData?.tradeName || "N/A"}
                                            </span>
                                        </div>
                                        <div className="space-y-0.5">
                                            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 block">Permit License No.</span>
                                            <span className="text-xs font-mono font-bold text-primary block" style={{ color: themeColor }}>
                                                {previousPermits[0].businessPermit?.permitNumber || previousPermits[0].additionalData?.permitNumber || previousPermits[0].id.slice(-8).toUpperCase()}
                                            </span>
                                        </div>
                                        <div className="space-y-0.5">
                                            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 block">Barangay</span>
                                            <span className="text-xs font-bold text-slate-600 dark:text-slate-300 block">
                                                {previousPermits[0].additionalData?.barangay || "N/A"}
                                            </span>
                                        </div>
                                        <div className="space-y-0.5">
                                            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 block">Line of Business</span>
                                            <span className="text-xs font-bold text-slate-600 dark:text-slate-300 block truncate font-sans">
                                                {previousPermits[0].additionalData?.lineOfBusiness || "N/A"}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="p-3 bg-primary/10 border border-primary/20 rounded-xl flex items-center gap-2.5" style={{ borderColor: `${themeColor}33`, backgroundColor: `${themeColor}1a` }}>
                                        <p className="text-[9px] text-primary font-bold uppercase tracking-wider leading-relaxed" style={{ color: themeColor }}>
                                            Selecting yes autofills details to guarantee municipal compliance.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4 text-left">
                                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 block px-1">Choose Business to Renew</span>
                                    <div className="max-h-[260px] overflow-y-auto pr-1 space-y-2.5 custom-scrollbar">
                                        {previousPermits.map((permit, idx) => {
                                            const addData = permit.additionalData || {};
                                            const isSelected = selectedPermitIndex === idx;
                                            return (
                                                <button
                                                    type="button"
                                                    key={permit.id}
                                                    onClick={() => setSelectedPermitIndex(idx)}
                                                    className={cn(
                                                        "w-full p-4 rounded-2xl border-2 text-left transition-all duration-300 relative overflow-hidden group select-none flex flex-col gap-1.5",
                                                        isSelected
                                                            ? "bg-primary/[0.04] dark:bg-primary/[0.02] border-primary shadow-md"
                                                            : "bg-slate-50 dark:bg-white/[0.01] border-slate-100 dark:border-white/5 hover:border-slate-200 dark:hover:border-white/10"
                                                    )}
                                                    style={isSelected ? { borderColor: themeColor, backgroundColor: `${themeColor}0a` } : {}}
                                                >
                                                    <div className="flex justify-between items-start gap-2">
                                                        <span className={cn("text-xs font-black uppercase italic truncate", isSelected ? "text-primary" : "text-slate-800 dark:text-white")} style={isSelected ? { color: themeColor } : {}}>
                                                            {addData.businessName || "N/A"}
                                                        </span>
                                                        {isSelected && (
                                                            <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center text-white shrink-0" style={{ backgroundColor: themeColor }}>
                                                                <Check className="w-2.5 h-2.5 stroke-[4]" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-x-2 text-[9px] font-bold text-slate-400 uppercase tracking-wide">
                                                        <div>
                                                            <span className="text-[7px] text-slate-400 block">Trade Name</span>
                                                            <span className="text-slate-600 dark:text-slate-300 truncate block">{addData.tradeName || "N/A"}</span>
                                                        </div>
                                                        <div>
                                                            <span className="text-[7px] text-slate-400 block">License Permit No.</span>
                                                            <span className="text-primary font-mono truncate block" style={{ color: themeColor }}>{permit.businessPermit?.permitNumber || addData.permitNumber || permit.id.slice(-8).toUpperCase()}</span>
                                                        </div>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <div className="p-3 bg-primary/10 border border-primary/20 rounded-xl flex items-center gap-2.5" style={{ borderColor: `${themeColor}33`, backgroundColor: `${themeColor}1a` }}>
                                        <p className="text-[9px] text-primary font-bold uppercase tracking-wider leading-relaxed" style={{ color: themeColor }}>
                                            Selecting yes autofills details to guarantee municipal compliance.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Buttons */}
                            <div className="grid grid-cols-2 gap-3 pt-2">
                                <Button
                                    type="button"
                                    onClick={handleDeclinePreviousPermit}
                                    variant="outline"
                                    className="rounded-full py-6 font-black uppercase tracking-widest text-[10px] border-slate-200 hover:bg-slate-50 transition-all"
                                >
                                    No, Register Different
                                </Button>
                                <Button
                                    type="button"
                                    onClick={handleSelectPreviousPermit}
                                    className="rounded-full py-6 font-black uppercase tracking-widest text-[10px] text-white bg-primary hover:opacity-90 shadow-lg shadow-primary/20 transition-all"
                                    style={{ backgroundColor: themeColor }}
                                >
                                    Yes, Autofill Details
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

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
                themeColor={themeColor}
            />
        </div>
    );
}
