"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    CheckCircle2,
    Calculator,
    User,
    ChevronRight,
    Loader2,
    Check,
    Home,
    Sparkles,
    Coins,
    Calendar,
    Clock,
    FileText,
    Printer,
    ArrowLeft,
    Upload,
    MapPin,
    Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
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
import { compressImage } from "@/lib/image-compression";
import { calculateCedula, CedulaResult, getCedulaPenaltyRate } from "@/lib/cedula";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { submitCedulaAppointment } from "./actions";
import PrintQueueTicket from "@/components/shared/PrintQueueTicket";

type Step = "STATUS" | "RESIDENT" | "TAX_DECLARATION" | "DECLARATION" | "CONFIRM" | "SUCCESS";

const STEPS: { id: Step; label: string; icon: any }[] = [
    { id: "STATUS", label: "Status", icon: Sparkles },
    { id: "RESIDENT", label: "Identity", icon: User },
    { id: "TAX_DECLARATION", label: "Tax Declaration", icon: Calculator },
    { id: "DECLARATION", label: "Schedule", icon: Calendar },
    { id: "CONFIRM", label: "Submit", icon: CheckCircle2 },
];

interface CedulaAppointmentClientProps {
    resident: any;
    cedulaTypes: any[];
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
}

export function CedulaAppointmentClient({
    resident,
    cedulaTypes,
    themeColor,
    branding,
    config,
    bookedSlots
}: CedulaAppointmentClientProps) {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState<Step>("STATUS");
    const [submitting, setSubmitting] = useState(false);
    const [applicantType, setApplicantType] = useState<"INDIVIDUAL" | "JURIDICAL">("INDIVIDUAL");
    const [privacyAccepted, setPrivacyAccepted] = useState(false);
    const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
    const [calcResult, setCalcResult] = useState<CedulaResult | null>(null);
    const [newTransactionId] = useState<string | null>(null);
    const [queueNumber] = useState<string | null>(null);
    const [isPriorityLane, setIsPriorityLane] = useState(false);
    const [printTriggered, setPrintTriggered] = useState(false);

    // Form inputs state
    const [formState, setFormState] = useState({
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
        // Calculations
        income: "",
        propertyValue: "",
        businessName: "",
        incomeSource: "PROFESSION",
        purpose: ""
    });

    // Appointment Schedule State
    const [selectedDate, setSelectedDate] = useState<string>("");
    const [selectedSlot, setSelectedSlot] = useState<string>("");


    const [currentMonth, setCurrentMonth] = useState<Date>(() => {
        const today = new Date();
        return new Date(today.getFullYear(), today.getMonth(), 1);
    });

    const changeMonth = (offset: number) => {
        setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
    };

    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const daysCount = new Date(year, month + 1, 0).getDate();
        const firstDayIndex = new Date(year, month, 1).getDay();

        const days = [];
        for (let i = 0; i < firstDayIndex; i++) {
            days.push(null);
        }
        for (let day = 1; day <= daysCount; day++) {
            days.push(new Date(year, month, day));
        }
        return days;
    };

    const SLOTS = [
        "08:00 AM - 11:00 AM",
        "01:00 PM - 04:00 PM"
    ];

    const contactInputRef = useRef<HTMLInputElement>(null);
    const incomeInputRef = useRef<HTMLInputElement>(null);

    const [idFile, setIdFile] = useState<File | null>(null);
    const [proofFile, setProofFile] = useState<File | null>(null);
    const [existingIdUrl] = useState<string | null>(resident?.idFrontUrl || null);
    const [existingProofUrl] = useState<string | null>(null);
    const [showValidationErrors, setShowValidationErrors] = useState(false);
    const [incomeError, setIncomeError] = useState(false);

    // Refs for sections (smooth scrolling)
    const idSectionRef = useRef<HTMLDivElement>(null);
    const proofSectionRef = useRef<HTMLDivElement>(null);
    const privacySectionRef = useRef<HTMLDivElement>(null);

    // Document Viewer state
    const [viewerOpen, setViewerOpen] = useState(false);
    const [viewerFile, setViewerFile] = useState<File | null>(null);
    const [viewerUrl, setViewerUrl] = useState<string | null>(null);
    const [viewerTitle, setViewerTitle] = useState("");

    const handleViewFile = (file: File | null, existingUrl: string | null, title?: string) => {
        setViewerFile(file);
        setViewerUrl(existingUrl);
        if (title) {
            setViewerTitle(title);
        } else {
            const isProof = file === proofFile || (existingUrl === existingProofUrl && existingUrl !== null);
            setViewerTitle(isProof ? "Proof of Income Document" : "Valid ID Document");
        }
        setViewerOpen(true);
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, field: "idFile" | "proofFile") => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];

            // Validate file type
            const allowedTypes = [
                "image/jpeg", "image/png",
                "application/pdf"
            ];
            const fileExtension = file.name.split('.').pop()?.toLowerCase() || "";
            const allowedExtensions = ["pdf", "jpg", "jpeg", "png"];

            if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
                toast.error("Invalid file type! Only standard images (PNG, JPG, JPEG) and PDFs are allowed.");
                e.target.value = ""; // clear file input
                return;
            }

            const maxBytes = 5 * 1024 * 1024; // 5MB limit
            if (file.size > maxBytes) {
                toast.error(`The file "${file.name}" is too large! Maximum limit is 5MB`);
                e.target.value = ""; // Reset the input element
                return;
            }

            let fileToProcess = file;
            if (file.type.startsWith("image/")) {
                try {
                    toast.loading("Compressing and optimizing document...", { id: "image-compress-toast" });
                    fileToProcess = await compressImage(file);
                    toast.success("Image optimized successfully!", { id: "image-compress-toast" });
                } catch (err) {
                    console.error("Compression error:", err);
                    toast.dismiss("image-compress-toast");
                }
            }

            if (field === "idFile") {
                setIdFile(fileToProcess);
            } else {
                setProofFile(fileToProcess);
            }
        }
    };

    // Compute active type ID
    const activeType = cedulaTypes.find(t => t.code === (applicantType === "INDIVIDUAL" ? "CEDULA_IND" : "CEDULA_JUR"));

    // Parse requiredDocs
    let docs: string[] = [];
    if (activeType) {
        if (Array.isArray(activeType.requiredDocs)) {
            docs = activeType.requiredDocs as string[];
        } else if (typeof activeType.requiredDocs === "string") {
            try {
                docs = JSON.parse(activeType.requiredDocs);
            } catch {
                docs = [];
            }
        } else if (activeType.requiredDocs && typeof activeType.requiredDocs === "object") {
            try {
                docs = Object.values(activeType.requiredDocs) as string[];
            } catch {
                docs = [];
            }
        }
    }

    // Parse defaultFees
    let fees: { name: string; label?: string; amount: number; code?: string }[] = [];
    if (activeType) {
        if (Array.isArray(activeType.defaultFees)) {
            fees = activeType.defaultFees as any[];
        } else if (typeof activeType.defaultFees === "string") {
            try {
                fees = JSON.parse(activeType.defaultFees);
            } catch {
                fees = [];
            }
        }
    }

    // Real-time tax calculator
    useEffect(() => {
        const baseFee = activeType?.baseFee || (applicantType === "INDIVIDUAL" ? 5 : 500);
        const result = calculateCedula({
            type: applicantType,
            income: parseFloat(formState.income.replace(/,/g, "")) || 0,
            propertyValue: parseFloat(formState.propertyValue.replace(/,/g, "")) || 0,
            baseFee,
            fulfillmentType: "PICK_UP",
            deliveryFee: 0
        });
        setCalcResult(result);
    }, [formState.income, formState.propertyValue, applicantType, activeType]);

    // Check if slot count exceeds config limit
    const getSlotAvailability = (dateStr: string, slot: string) => {
        if (!dateStr) return true;
        const targetDate = new Date(dateStr);
        const count = bookedSlots.filter(b => {
            const bDate = new Date(b.appointmentDate);
            return (
                bDate.getUTCFullYear() === targetDate.getUTCFullYear() &&
                bDate.getUTCMonth() === targetDate.getUTCMonth() &&
                bDate.getUTCDate() === targetDate.getUTCDate() &&
                b.appointmentSlot === slot
            );
        }).length;
        
        const isAM = slot.includes("AM") || slot.toUpperCase().includes("08:00 AM");
        const configAny = config as any;
        const maxLimit = isAM 
            ? (configAny.maxSlotsAM ?? 25) 
            : (configAny.maxSlotsPM ?? 25);
            
        return count < maxLimit;
    };

    // Check if a specific date is disabled
    const isDateDisabled = (date: Date | null) => {
        if (!date) return true;
        const dayOfWeek = date.getDay(); // 0 is Sunday, 6 is Saturday

        // Disable weekends if not active
        if (!config.activeDays.includes(dayOfWeek)) return true;

        // Disable blocked dates
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const formattedDate = `${year}-${month}-${day}`;
        if (config.blockedDates.includes(formattedDate)) return true;

        // Disable past dates
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (date < today) return true;

        // Check if all slots are fully booked
        const totalMaxSlots = config.maxSlots;
        const bookedOnThisDay = bookedSlots.filter(b => {
            const bDate = new Date(b.appointmentDate);
            return (
                bDate.getFullYear() === date.getFullYear() &&
                bDate.getMonth() === date.getMonth() &&
                bDate.getDate() === date.getDate()
            );
        }).length;
        if (bookedOnThisDay >= totalMaxSlots) return true;

        return false;
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormState(prev => ({ ...prev, [name]: value }));
    };

    const isStepValid = (stepId: Step) => {
        switch (stepId) {
            case "STATUS":
                return !!activeType?.id;
            case "RESIDENT":
                return !!formState.contactNumber;
            case "TAX_DECLARATION":
                return !!formState.income.trim(); // Income is now required
            case "DECLARATION":
                const isJur = applicantType === "JURIDICAL";
                const hasSchedule = !!selectedDate && !!selectedSlot;
                if (isJur) {
                    return !!formState.businessName.trim() && hasSchedule;
                }
                return hasSchedule;
            case "CONFIRM":
                return privacyAccepted;
            default:
                return true;
        }
    };

    const canNavigate = (targetStep: Step) => {
        const targetIdx = STEPS.findIndex(s => s.id === targetStep);
        const currentIdx = STEPS.findIndex(s => s.id === currentStep);
        if (targetIdx <= currentIdx) return true;

        for (let i = 0; i < targetIdx; i++) {
            if (!isStepValid(STEPS[i].id)) return false;
        }
        return true;
    };

    const handleNext = () => {
        if (!isStepValid(currentStep)) {
            if (currentStep === "STATUS") {
                toast.error("Please select your application status.");
            } else if (currentStep === "RESIDENT") {
                contactInputRef.current?.focus();
                toast.error("Please provide your contact number.");
            } else if (currentStep === "TAX_DECLARATION") {
                setIncomeError(true);
                incomeInputRef.current?.focus();
                incomeInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                toast.error("Please declare your Annual Gross Income to compute the estimated tax.");
            } else if (currentStep === "DECLARATION") {
                if (applicantType === "JURIDICAL" && !formState.businessName.trim()) {
                    toast.error("Please declare your Business Name.");
                } else if (!selectedDate || !selectedSlot) {
                    toast.error("Please select your appointment date and time session.");
                }
            }
            return;
        }
        const idx = STEPS.findIndex(s => s.id === currentStep);
        if (idx < STEPS.length - 1) {
            setCurrentStep(STEPS[idx + 1].id);
        }
    };

    const handleSubmit = async () => {
        const hasId = !!idFile || !!existingIdUrl;
        const hasProof = !!proofFile || !!existingProofUrl;

        if (!hasId || !hasProof || !privacyAccepted) {
            setShowValidationErrors(true);
            if (!hasId && !hasProof) {
                toast.error("Wait lang, pare! You need to upload both your Valid ID and Proof of Income to proceed.");
                idSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
            } else if (!hasId) {
                toast.error("Oops! You forgot to attach your Valid ID, bro.");
                idSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
            } else if (!hasProof) {
                toast.error("Hold on, you need to upload your Proof of Income first.");
                proofSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
            } else if (!privacyAccepted) {
                toast.error("Please accept the Data Privacy and Terms Agreement to submit your application.");
                privacySectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
            }
            return;
        }

        setSubmitting(true);
        try {
            const submitData = new FormData();
            submitData.append("typeId", activeType?.id || "");
            submitData.append("appointmentSlot", selectedSlot);
            submitData.append("appointmentDate", selectedDate);
            submitData.append("residentSnapshot", JSON.stringify({
                firstName: formState.firstName,
                lastName: formState.lastName,
                middleName: formState.middleName,
                suffix: formState.suffix,
                gender: formState.gender,
                dateOfBirth: formState.dateOfBirth,
                civilStatus: formState.civilStatus,
                citizenship: formState.citizenship,
                houseNumber: formState.houseNumber,
                street: formState.street,
                barangay: formState.barangay,
                municipality: formState.municipality,
                province: formState.province,
                contactNumber: formState.contactNumber,
                email: formState.email
            }));
            submitData.append("additionalData", JSON.stringify({
                applicantType: applicantType,
                income: parseFloat(formState.income.replace(/,/g, "")) || 0,
                propertyValue: parseFloat(formState.propertyValue.replace(/,/g, "")) || 0,
                businessName: formState.businessName,
                incomeSource: formState.incomeSource,
                purpose: "Community Tax Certificate Appointment",
                calculatedTax: calcResult,
                isPriorityLane: isPriorityLane // Pass priority state to backend
            }));
            if (idFile) submitData.append("idFile", idFile);
            if (proofFile) submitData.append("proofFile", proofFile);
            if (existingIdUrl) submitData.append("existingIdUrl", existingIdUrl);
            if (existingProofUrl) submitData.append("existingProofUrl", existingProofUrl);

            const response = await submitCedulaAppointment(submitData);
            if (response.success && response.data) {
                toast.success("Appointment booked successfully!");
                router.push("/user/services/requests");
            } else {
                toast.error(response.error || "Failed to book appointment.");
            }
        } catch {
            toast.error("An error occurred during submission.");
        } finally {
            setSubmitting(false);
        }
    };


    const printSlip = () => {
        setPrintTriggered(true);
    };

    const formatDateString = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
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
                                <BreadcrumbPage className="text-[10px] font-black uppercase tracking-widest italic" style={{ color: "var(--primary-theme)" }}>Cedula Appointment</BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                </div>

                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6 px-1 md:px-0">
                    <div className="space-y-1 md:space-y-2">
                        <h1 className="text-2xl md:text-4xl font-bold text-slate-900 dark:text-white uppercase italic tracking-tighter leading-tight select-none">
                            Cedula <span className="text-primary underline decoration-[4px] md:decoration-[6px] decoration-primary/20 underline-offset-[4px] md:underline-offset-[8px]">Appointment</span>
                        </h1>
                        <p className="text-[9px] md:text-[11px] font-bold text-slate-400 uppercase tracking-[0.4em] ml-1 md:ml-2 italic">LGU Digital Governance Portal</p>
                    </div>
                </div>
            </div>

            {/* Progress Stepper */}
            {currentStep !== "SUCCESS" && (
                <div className="grid grid-cols-5 gap-1.5 md:gap-4 relative px-1 md:px-2 print:hidden">
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
                                        if (currentStep === "RESIDENT") {
                                            contactInputRef.current?.focus();
                                            toast.error("Please complete your identity details first.");
                                        } else if (currentStep === "DECLARATION") {
                                            toast.error("Please complete the declaration and schedule first.");
                                        } else {
                                            toast.error("Please complete the current phase first.");
                                        }
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
                            {currentStep === "STATUS" && (
                                <div className="space-y-8 md:space-y-12">
                                    <div className="space-y-3 md:space-y-4 text-center">
                                        <h2 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter leading-tight select-none">
                                            Choose Application <span className="text-primary italic">Pathway</span>
                                        </h2>
                                        <p className="text-slate-500 dark:text-slate-400 font-medium italic text-xs md:text-sm uppercase tracking-widest max-w-2xl mx-auto select-none">
                                            Select your current community tax status to proceed.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 max-w-3xl mx-auto">
                                        {[
                                            {
                                                id: "INDIVIDUAL",
                                                icon: User,
                                                label: cedulaTypes.find(t => t.code === "CEDULA_IND")?.name || "Individual Cedula",
                                                desc: "Tax certificate for private citizens, employees, professionals, and self-employed individuals."
                                            },
                                            {
                                                id: "JURIDICAL",
                                                icon: Sparkles,
                                                label: cedulaTypes.find(t => t.code === "CEDULA_JUR")?.name || "Corporate / Juridical",
                                                desc: "Tax certificate for registered corporations, partnerships, and business organizations."
                                            }
                                        ].map(opt => {
                                            const isSelected = applicantType === opt.id;
                                            const Icon = opt.icon;
                                            return (
                                                <button
                                                    key={opt.id}
                                                    type="button"
                                                    onClick={() => setApplicantType(opt.id as any)}
                                                    className={cn(
                                                        "p-6 md:p-8 rounded-[2rem] border-2 text-left relative group select-none overflow-hidden transition-all duration-300 min-h-[180px] md:min-h-[260px] flex flex-col justify-between cursor-pointer",
                                                        isSelected
                                                            ? "border-primary bg-primary/[0.04] dark:bg-primary/[0.08] shadow-[0_8px_30px_rgba(var(--primary),0.06)] scale-[1.02]"
                                                            : "border-slate-200 dark:border-white/10 bg-white/40 dark:bg-white/5 backdrop-blur-sm hover:border-primary/30"
                                                    )}
                                                >
                                                    <div className="flex items-center justify-between w-full">
                                                        <div className={cn(
                                                            "w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center transition-all duration-300",
                                                            isSelected ? "bg-primary/20 text-primary" : "bg-primary/10 text-primary"
                                                        )}>
                                                            <Icon className="w-4 h-4 md:w-5 md:h-5 stroke-[2.5]" />
                                                        </div>
                                                        {isSelected && (
                                                            <div className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-primary flex items-center justify-center shadow-md animate-in zoom-in-50 duration-300">
                                                                <Check className="w-3 h-3 md:w-3.5 md:h-3.5 text-white stroke-[3]" />
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="space-y-2 mt-4 md:mt-8">
                                                        <h4 className={cn(
                                                            "text-base md:text-xl font-black uppercase italic tracking-wider leading-tight",
                                                            isSelected ? "text-slate-900 dark:text-white" : "text-slate-800 dark:text-slate-200"
                                                        )}>
                                                            {opt.label.toUpperCase()}
                                                        </h4>
                                                        <p className={cn(
                                                            "text-[9px] md:text-[10px] font-bold uppercase tracking-wider leading-relaxed",
                                                            isSelected ? "text-slate-500 dark:text-slate-400" : "text-slate-400 dark:text-slate-500"
                                                        )}>
                                                            {opt.desc.toUpperCase()}
                                                        </p>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {currentStep === "RESIDENT" && (
                                <div className="space-y-6 md:space-y-8">
                                    <div className="space-y-1">
                                        <h2 className="text-xl md:text-2xl font-black italic uppercase tracking-tighter leading-tight">Identity <span className="text-primary italic">Confirmation</span></h2>
                                        <p className="text-[10px] md:text-xs text-slate-500 font-medium italic">Verify your personal records. Only the contact number should be provided/updated.</p>
                                    </div>

                                    <div className="space-y-4 md:space-y-6">
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                                            <div className="space-y-1.5">
                                                <Label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">First Name</Label>
                                                <Input value={formState.firstName} readOnly className="h-10 rounded-xl border-slate-200 focus:ring-primary shadow-sm text-xs md:text-sm bg-slate-50 text-slate-400 dark:bg-white/5" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Middle Name</Label>
                                                <Input value={formState.middleName} readOnly className="h-10 rounded-xl border-slate-200 focus:ring-primary shadow-sm text-xs md:text-sm bg-slate-50 text-slate-400 dark:bg-white/5" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Last Name</Label>
                                                <Input value={formState.lastName} readOnly className="h-10 rounded-xl border-slate-200 focus:ring-primary shadow-sm text-xs md:text-sm bg-slate-50 text-slate-400 dark:bg-white/5" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Suffix</Label>
                                                <Input value={formState.suffix} readOnly className="h-10 rounded-xl border-slate-200 focus:ring-primary shadow-sm text-xs md:text-sm bg-slate-50 text-slate-400 dark:bg-white/5" />
                                            </div>
                                        </div>

                                        <Separator className="opacity-50" />

                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                                            <div className="space-y-1.5">
                                                <Label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Birth Date</Label>
                                                <Input type="date" value={formState.dateOfBirth} readOnly className="h-10 rounded-xl border-slate-200 focus:ring-primary shadow-sm text-xs md:text-sm bg-slate-50 text-slate-400 dark:bg-white/5" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Gender</Label>
                                                <Input value={formState.gender} readOnly className="h-10 rounded-xl bg-slate-50 border-slate-200 text-slate-400 font-bold text-xs md:text-sm dark:bg-white/5" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Civil Status</Label>
                                                <Input value={formState.civilStatus} readOnly className="h-10 rounded-xl bg-slate-50 border-slate-200 text-slate-400 font-bold text-xs md:text-sm dark:bg-white/5" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Citizenship</Label>
                                                <Input value={formState.citizenship} readOnly className="h-10 rounded-xl border-slate-200 focus:ring-primary shadow-sm text-xs md:text-sm bg-slate-50 text-slate-400 dark:bg-white/5" />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                                            <div className="space-y-1.5">
                                                <Label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Residential Address</Label>
                                                <Input
                                                    value={`${formState.houseNumber ? formState.houseNumber + ' ' : ''}${formState.street ? formState.street + ', ' : ''}${formState.barangay}, ${formState.municipality}, ${formState.province}`}
                                                    readOnly
                                                    className="h-10 rounded-xl border-slate-200 text-xs bg-slate-50 text-slate-400 dark:bg-white/5"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Contact Number</Label>
                                                <Input
                                                    ref={contactInputRef}
                                                    name="contactNumber"
                                                    value={formState.contactNumber}
                                                    onChange={(e) => {
                                                        const val = e.target.value.replace(/[^\d+]/g, "");
                                                        setFormState(prev => ({ ...prev, contactNumber: val }));
                                                    }}
                                                    className="h-10 rounded-xl border-slate-200 focus:ring-primary shadow-sm text-xs md:text-sm"
                                                    placeholder="09xx xxx xxxx"
                                                    required
                                                />
                                                <p className="text-[9px] font-black text-amber-500 uppercase tracking-wider ml-1 animate-pulse">
                                                    * Note: Please use your active contact number. This will be used to coordinate your appointment.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {currentStep === "TAX_DECLARATION" && (
                                <div className="space-y-8 md:space-y-12 animate-in fade-in duration-300">
                                    <div className="space-y-2 md:space-y-4 text-center md:text-left">
                                        <h2 className="text-2xl md:text-3xl font-black italic uppercase tracking-tighter leading-tight">
                                            Tax <span className="text-primary italic">Declaration</span>
                                        </h2>
                                        <p className="text-slate-500 font-medium italic text-xs md:text-sm">
                                            Declare your annual financial status for the tax computation.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                                        {/* Left Column: Inputs */}
                                        <div className="space-y-6">
                                            <div className="space-y-2 md:space-y-3">
                                                <Label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 italic ml-1">
                                                    Annual Gross Income
                                                </Label>
                                                <div className="relative">
                                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg md:text-xl font-black text-slate-350 italic">₱</span>
                                                    <Input
                                                        ref={incomeInputRef}
                                                        type="text"
                                                        value={formState.income}
                                                        onChange={(e) => {
                                                            const val = e.target.value.replace(/[^0-9.]/g, '');
                                                            if (val === '') {
                                                                setFormState(p => ({ ...p, income: '' }));
                                                                return;
                                                            }
                                                            const parts = val.split('.');
                                                            parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                                                            const formatted = parts.length > 1 ? `${parts[0]}.${parts[1].slice(0, 2)}` : parts[0];
                                                            setFormState(p => ({ ...p, income: formatted }));
                                                            if (incomeError) setIncomeError(false); // Reset error state on change
                                                        }}
                                                        placeholder="0.00"
                                                        className={cn(
                                                            "h-12 md:h-16 pl-10 rounded-xl md:rounded-2xl dark:bg-white/5 text-lg md:text-xl font-black italic bg-white transition-all",
                                                            incomeError 
                                                                ? "border-red-500 ring-2 ring-red-500/20 dark:border-red-500" 
                                                                : "border-slate-200 dark:border-white/10"
                                                        )}
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 italic ml-1">
                                                    Income Source Category
                                                </Label>
                                                <div className="flex flex-col gap-2">
                                                    {[
                                                        {
                                                            id: "PROFESSION",
                                                            label: "Profession",
                                                            desc: "Employees, Freelancers, & Salary"
                                                        },
                                                        {
                                                            id: "BUSINESS",
                                                            label: "Business",
                                                            desc: "Trade, Stores, & Services"
                                                        },
                                                        {
                                                            id: "PROPERTY",
                                                            label: "Property",
                                                            desc: "Real Estate Rentals & Leases"
                                                        }
                                                    ].map(opt => {
                                                        const isSelected = formState.incomeSource === opt.id;
                                                        return (
                                                            <button
                                                                key={opt.id}
                                                                type="button"
                                                                onClick={() => setFormState(p => ({ ...p, incomeSource: opt.id }))}
                                                                className={cn(
                                                                    "px-5 py-4 rounded-xl border-2 transition-all duration-300 text-left relative overflow-hidden flex items-center justify-between gap-4 group select-none shadow-sm cursor-pointer",
                                                                    isSelected
                                                                        ? "border-primary bg-primary/[0.05] dark:bg-primary/[0.1] shadow-[0_4px_20px_rgba(var(--primary),0.05)] scale-[1.01]"
                                                                        : "border-slate-200 dark:border-white/10 bg-white/40 dark:bg-white/5 backdrop-blur-sm hover:border-primary/30 hover:bg-white/60 dark:hover:bg-white/10"
                                                                )}
                                                            >
                                                                <h4 className={cn(
                                                                    "text-sm md:text-base font-black uppercase italic tracking-wider whitespace-nowrap",
                                                                    isSelected ? "text-primary" : "text-slate-800 dark:text-slate-200"
                                                                )}>
                                                                    {opt.label}
                                                                </h4>
                                                                <p className={cn(
                                                                    "text-[10px] md:text-xs font-bold uppercase tracking-tighter text-right",
                                                                    isSelected ? "text-primary/70 dark:text-primary/60" : "text-slate-500 dark:text-slate-400"
                                                                )}>
                                                                    {opt.desc}
                                                                </p>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right Column: Calculation Overlay */}
                                        <div className="bg-slate-900 dark:bg-black border border-slate-800 dark:border-white/5 rounded-3xl md:rounded-[2.5rem] p-6 md:p-10 text-white space-y-6 md:space-y-8 shadow-2xl relative overflow-hidden flex flex-col justify-between">
                                            <div className="absolute top-0 right-0 p-4 md:p-8 opacity-10 pointer-events-none">
                                                <Calculator className="w-24 h-24 md:w-32 md:h-32 rotate-12" />
                                            </div>

                                            <div className="space-y-4 relative z-10 font-bold">
                                                <div className="flex justify-between items-center text-[10px] md:text-xs uppercase tracking-widest italic opacity-70">
                                                    <span>Basic Tax</span>
                                                    <span>₱{(calcResult?.basicTax ?? (applicantType === "INDIVIDUAL" ? 5.00 : 500.00)).toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-[10px] md:text-xs uppercase tracking-widest italic opacity-70">
                                                    <span>Additional Tax</span>
                                                    <span>₱{(calcResult?.additionalTax ?? 0).toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-[10px] md:text-xs uppercase tracking-widest italic text-amber-500">
                                                    <span>
                                                        Penalty ({Math.round(getCedulaPenaltyRate() * 100)}%)
                                                    </span>
                                                    <span>₱{(calcResult?.penalty ?? 0).toFixed(2)}</span>
                                                </div>
                                            </div>

                                            <div className="pt-6 border-t border-white/10 relative z-10 flex justify-between items-end">
                                                <div className="space-y-1">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic block">Estimated Total</span>
                                                    <span className="text-[8px] font-bold text-amber-500/80 uppercase block italic">* Subject to admin evaluation</span>
                                                </div>
                                                <span className="text-3xl md:text-5xl font-black italic tracking-tighter text-primary">
                                                    ₱{(calcResult?.totalAmount ?? 0).toFixed(2)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                </div>
                            )}

                            {currentStep === "DECLARATION" && (
                                <div className="space-y-8 md:space-y-12">
                                    <div className="space-y-2 md:space-y-4 text-center md:text-left">
                                        <h2 className="text-2xl md:text-3xl font-black italic uppercase tracking-tighter leading-tight">
                                            Schedule <span className="text-primary italic">Declaration</span>
                                        </h2>
                                        <p className="text-slate-500 font-medium italic text-xs md:text-sm">
                                            Choose an available date and select your time slot to book your municipal appointment.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 relative">
                                        {/* Ambient background blur accent */}
                                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full blur-[100px] opacity-10 dark:opacity-5 pointer-events-none" style={{ backgroundColor: themeColor }} />

                                        {/* Left Side: Appointment Date Selection */}
                                        <div className="space-y-6 relative z-10">
                                            {applicantType === "JURIDICAL" && (
                                                <div className="space-y-2">
                                                    <Label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 italic ml-1">Registered Business Name</Label>
                                                    <Input
                                                        name="businessName"
                                                        value={formState.businessName}
                                                        onChange={handleInputChange}
                                                        placeholder="Enter Corporate/Business Name"
                                                        className="h-12 rounded-xl border-slate-200 dark:border-white/10 dark:bg-white/5 text-base font-bold bg-white focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-transparent transition-all"
                                                    />
                                                </div>
                                            )}

                                            <div className="space-y-4">
                                                <Label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 italic ml-1 flex items-center gap-1.5">
                                                    <Calendar className="w-4 h-4" style={{ color: themeColor }} /> 1. Select Date
                                                </Label>

                                                <div className="border border-slate-200/80 dark:border-white/10 rounded-[2.5rem] p-5 md:p-6 bg-white/60 dark:bg-[#0c0f16]/60 backdrop-blur-md shadow-xl dark:shadow-2xl/40 space-y-5 select-none transition-all">
                                                    {/* Calendar Header: Month, Year and Navigation */}
                                                    <div className="flex items-center justify-between px-1">
                                                        <span className="font-black text-sm md:text-base uppercase tracking-wider text-slate-900 dark:text-white italic">
                                                            {currentMonth.toLocaleString("default", { month: "long", year: "numeric" })}
                                                        </span>
                                                        <div className="flex items-center gap-1.5">
                                                            <button
                                                                type="button"
                                                                onClick={() => changeMonth(-1)}
                                                                className="w-8 h-8 rounded-full border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 transition-all text-slate-650 dark:text-slate-400 flex items-center justify-center active:scale-90"
                                                            >
                                                                <ArrowLeft className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => changeMonth(1)}
                                                                className="w-8 h-8 rounded-full border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 transition-all text-slate-650 dark:text-slate-400 flex items-center justify-center active:scale-90"
                                                            >
                                                                <ChevronRight className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Weekdays Grid */}
                                                    <div className="grid grid-cols-7 text-center gap-1.5">
                                                        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                                                            <span key={day} className="text-[10px] font-black uppercase tracking-widest text-slate-450 dark:text-slate-500 py-1">
                                                                {day}
                                                            </span>
                                                        ))}
                                                    </div>

                                                    {/* Days Grid */}
                                                    <div className="grid grid-cols-7 gap-1.5">
                                                        {getDaysInMonth(currentMonth).map((day, idx) => {
                                                            if (!day) {
                                                                return <div key={`empty-${idx}`} />;
                                                            }
                                                            const formatted = formatDateString(day);
                                                            const disabled = isDateDisabled(day);
                                                            const isSelected = selectedDate === formatted;

                                                            return (
                                                                <button
                                                                    key={formatted}
                                                                    type="button"
                                                                    disabled={disabled}
                                                                    onClick={() => {
                                                                        setSelectedDate(formatted);
                                                                        setSelectedSlot("");
                                                                    }}
                                                                    className={cn(
                                                                        "h-9 w-9 md:h-10 md:w-10 rounded-full mx-auto flex items-center justify-center text-xs font-bold transition-all duration-300 relative group",
                                                                        isSelected
                                                                            ? "text-white font-black shadow-lg scale-110 active:scale-95"
                                                                            : disabled
                                                                                ? "text-slate-300 dark:text-slate-700 cursor-not-allowed opacity-35"
                                                                                : "text-slate-700 dark:text-slate-300 hover:bg-primary/10 hover:text-primary dark:hover:bg-white/5 dark:hover:text-white"
                                                                    )}
                                                                    style={isSelected ? { backgroundColor: themeColor } : {}}
                                                                >
                                                                    <span>{day.getDate()}</span>
                                                                    {!disabled && !isSelected && (
                                                                        <div className="absolute bottom-1 w-1 h-1 rounded-full bg-slate-300 dark:bg-white/20 group-hover:bg-primary" />
                                                                    )}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right Side: Time Slots Selection */}
                                        <div className="space-y-6 relative z-10">
                                            <div className="space-y-4">
                                                <Label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 italic ml-1 flex items-center gap-1.5">
                                                    <Clock className="w-4 h-4" style={{ color: themeColor }} /> 2. Choose Time Session
                                                </Label>
                                                {!selectedDate ? (
                                                    <div className="h-[260px] border border-dashed border-slate-200 dark:border-white/10 rounded-[2.5rem] bg-slate-50/50 dark:bg-white/[0.01] flex flex-col items-center justify-center gap-2 text-slate-400 italic text-xs shadow-inner">
                                                        <Calendar className="w-8 h-8 opacity-40 animate-pulse text-slate-400" />
                                                        <span>Select an appointment date first</span>
                                                    </div>
                                                ) : (
                                                    <div className="grid grid-cols-1 gap-3.5">
                                                        {SLOTS.map((slot) => {
                                                            const available = getSlotAvailability(selectedDate, slot);
                                                            const active = selectedSlot === slot;
                                                            return (
                                                                <button
                                                                    key={slot}
                                                                    type="button"
                                                                    disabled={!available}
                                                                    onClick={() => setSelectedSlot(slot)}
                                                                    className={cn(
                                                                        "p-5 border rounded-[2rem] flex items-center justify-between text-left transition-all duration-300 shadow-sm relative overflow-hidden group/slot",
                                                                        !available
                                                                            ? "opacity-35 cursor-not-allowed bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/5"
                                                                            : active
                                                                                ? "border-primary bg-primary/[0.04] dark:bg-primary/[0.08] scale-[1.01] ring-2 ring-primary/20"
                                                                                : "border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] hover:border-slate-350 dark:hover:border-white/20 hover:scale-[1.01]"
                                                                    )}
                                                                >
                                                                    <div className="flex items-center gap-4">
                                                                        {/* Circular selector */}
                                                                        <div className={cn(
                                                                            "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0",
                                                                            active
                                                                                ? "bg-primary border-primary text-white"
                                                                                : "border-slate-300 dark:border-white/20 bg-white dark:bg-black/20"
                                                                        )}
                                                                            style={active ? { borderColor: themeColor, backgroundColor: themeColor } : {}}
                                                                        >
                                                                            {active && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                                                        </div>
                                                                        <div className="space-y-0.5">
                                                                            <span className="font-black text-xs md:text-sm text-slate-800 dark:text-slate-100">{slot}</span>
                                                                            <p className="text-[8px] font-bold uppercase tracking-wider text-slate-400">Regular processing hours</p>
                                                                        </div>
                                                                    </div>
                                                                    <span className={cn(
                                                                        "text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full",
                                                                        available
                                                                            ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                                                                            : "bg-red-500/10 text-red-500 border border-red-500/20"
                                                                    )}>
                                                                        {available ? "Available" : "Full"}
                                                                    </span>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {currentStep === "CONFIRM" && (
                                <div className="space-y-8 md:space-y-10">
                                    <div className="space-y-2 md:space-y-4 text-center md:text-left">
                                        <h2 className="text-2xl md:text-3xl font-black italic uppercase tracking-tighter leading-tight">Review <span className="text-primary italic">& Finalize</span></h2>
                                        <p className="text-slate-500 font-medium italic text-xs md:text-lg leading-relaxed">Review your declaration before submitting for evaluation.</p>
                                    </div>

                                    {/* Upload cards */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
                                        <div className="space-y-4 md:space-y-6" ref={idSectionRef}>
                                            <div className={cn(
                                                "p-4 md:p-5 bg-slate-50 dark:bg-white/5 rounded-2xl border border-dashed flex flex-col items-center text-center gap-3 md:gap-4 transition-all hover:border-primary",
                                                showValidationErrors && !(idFile || existingIdUrl)
                                                    ? "border-red-500 dark:border-red-500/80 ring-2 ring-red-500/20 bg-red-50/10 animate-pulse"
                                                    : "border-slate-200 dark:border-white/10"
                                            )}>
                                                <div className="flex items-center gap-3 md:gap-4 w-full text-left">
                                                    <div className="w-10 h-10 md:w-12 md:h-12 bg-white dark:bg-black/20 rounded-xl flex items-center justify-center shadow-sm shrink-0">
                                                        <Upload className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                                                    </div>
                                                    <div className="space-y-0.5">
                                                        <h4 className="text-[10px] md:text-[11px] font-black uppercase tracking-widest text-slate-600 dark:text-white italic flex items-center gap-1">
                                                            Valid ID <span className="text-red-500 font-black not-italic">*</span>
                                                        </h4>
                                                        <p className="text-[8px] md:text-[9px] text-slate-400 font-bold italic uppercase tracking-tighter line-clamp-1">PDF / Image (Max 5MB)</p>
                                                    </div>
                                                </div>

                                                {idFile ? (
                                                    idFile.type.startsWith("image/") ? (
                                                        <div
                                                            onClick={() => handleViewFile(idFile, null)}
                                                            className="relative w-full aspect-[21/9] rounded-xl overflow-hidden border-2 border-primary/20 shadow-lg mt-1 cursor-pointer group/preview"
                                                        >
                                                            <Image
                                                                src={URL.createObjectURL(idFile)}
                                                                alt="ID Preview"
                                                                fill
                                                                unoptimized
                                                                className="object-cover group-hover/preview:scale-105 transition-transform duration-500"
                                                            />
                                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/preview:opacity-100 transition-opacity flex items-center justify-center gap-2 select-none z-20">
                                                                <span className="text-[10px] font-black uppercase tracking-widest text-white italic">🔍 Click to View Full Size</span>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div
                                                            onClick={() => handleViewFile(idFile, null)}
                                                            className="w-full p-4 bg-primary/5 border border-primary/20 rounded-xl flex items-center justify-between mt-1 cursor-pointer hover:bg-primary/10 transition-colors"
                                                        >
                                                            <span className="text-xs font-bold text-primary truncate max-w-[200px]">{idFile.name}</span>
                                                            <span className="text-[9px] font-black uppercase tracking-widest text-primary italic">🔍 Click to View</span>
                                                        </div>
                                                    )
                                                ) : existingIdUrl ? (
                                                    <div
                                                        onClick={() => handleViewFile(null, existingIdUrl)}
                                                        className="relative w-full aspect-[21/9] rounded-xl overflow-hidden border-2 border-primary/10 shadow-lg mt-1 cursor-pointer group/preview"
                                                    >
                                                        <Image
                                                            src={existingIdUrl}
                                                            alt="Existing ID Preview"
                                                            fill
                                                            unoptimized
                                                            className="object-cover opacity-60 group-hover/preview:scale-105 transition-transform duration-500"
                                                        />
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/preview:opacity-100 transition-opacity flex items-center justify-center gap-2 select-none z-20">
                                                            <span className="text-[10px] font-black uppercase tracking-widest text-white italic">🔍 Click to View Full Size</span>
                                                        </div>
                                                    </div>
                                                ) : null}

                                                <div className="flex items-center justify-between w-full gap-2 md:gap-3 mt-1">
                                                    <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => handleFileChange(e, "idFile")} className="hidden" id="id-upload" />
                                                    {(idFile || existingIdUrl) && (
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            onClick={() => handleViewFile(idFile, existingIdUrl)}
                                                            className="font-black italic uppercase tracking-widest text-[8px] md:text-[9px] px-4 md:px-6 h-8 rounded-full border-primary/20 text-primary hover:bg-primary/5 flex-1"
                                                        >
                                                            View Document
                                                        </Button>
                                                    )}
                                                    <Button asChild variant={(idFile || existingIdUrl) ? "outline" : "default"} className="font-black italic uppercase tracking-widest text-[8px] md:text-[9px] px-4 md:px-6 h-8 rounded-full flex-1">
                                                        <label htmlFor="id-upload" className="cursor-pointer">
                                                            {idFile ? "Change" : existingIdUrl ? "Replace ID" : "Upload"}
                                                        </label>
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4 md:space-y-6" ref={proofSectionRef}>
                                            <div className={cn(
                                                "p-4 md:p-5 bg-slate-50 dark:bg-white/5 rounded-2xl border border-dashed flex flex-col items-center text-center gap-3 md:gap-4 transition-all hover:border-primary",
                                                showValidationErrors && !(proofFile || existingProofUrl)
                                                    ? "border-red-500 dark:border-red-500/80 ring-2 ring-red-500/20 bg-red-50/10 animate-pulse"
                                                    : "border-slate-200 dark:border-white/10"
                                            )}>
                                                <div className="flex items-center gap-3 md:gap-4 w-full text-left">
                                                    <div className="w-10 h-10 md:w-12 md:h-12 bg-white dark:bg-black/20 rounded-xl flex items-center justify-center shadow-sm shrink-0">
                                                        <Upload className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                                                    </div>
                                                    <div className="space-y-0.5">
                                                        <h4 className="text-[10px] md:text-[11px] font-black uppercase tracking-widest text-slate-600 dark:text-white italic flex items-center gap-1">
                                                            Proof of Income <span className="text-red-500 font-black not-italic">*</span>
                                                        </h4>
                                                        <p className="text-[8px] md:text-[9px] text-slate-400 font-bold italic uppercase tracking-tighter line-clamp-1">
                                                            Payslip / BIR (Max 5MB)
                                                        </p>
                                                    </div>
                                                </div>

                                                {proofFile ? (
                                                    proofFile.type.startsWith("image/") ? (
                                                        <div
                                                            onClick={() => handleViewFile(proofFile, null)}
                                                            className="relative w-full aspect-[21/9] rounded-xl overflow-hidden border-2 border-primary/20 shadow-lg mt-1 cursor-pointer group/preview"
                                                        >
                                                            <Image
                                                                src={URL.createObjectURL(proofFile)}
                                                                alt="Proof Preview"
                                                                fill
                                                                unoptimized
                                                                className="object-cover group-hover/preview:scale-105 transition-transform duration-500"
                                                            />
                                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/preview:opacity-100 transition-opacity flex items-center justify-center gap-2 select-none z-20">
                                                                <span className="text-[10px] font-black uppercase tracking-widest text-white italic">🔍 Click to View Full Size</span>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div
                                                            onClick={() => handleViewFile(proofFile, null)}
                                                            className="w-full p-4 bg-primary/5 border border-primary/20 rounded-xl flex items-center justify-between mt-1 cursor-pointer hover:bg-primary/10 transition-colors"
                                                        >
                                                            <span className="text-xs font-bold text-primary truncate max-w-[200px]">{proofFile.name}</span>
                                                            <span className="text-[9px] font-black uppercase tracking-widest text-primary italic">🔍 Click to View</span>
                                                        </div>
                                                    )
                                                ) : existingProofUrl ? (
                                                    <div
                                                        onClick={() => handleViewFile(null, existingProofUrl)}
                                                        className="relative w-full aspect-[21/9] rounded-xl overflow-hidden border-2 border-primary/10 shadow-lg mt-1 cursor-pointer group/preview"
                                                    >
                                                        <Image
                                                            src={existingProofUrl}
                                                            alt="Existing Proof Preview"
                                                            fill
                                                            unoptimized
                                                            className="object-cover opacity-60 group-hover/preview:scale-105 transition-transform duration-500"
                                                        />
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/preview:opacity-100 transition-opacity flex items-center justify-center gap-2 select-none z-20">
                                                            <span className="text-[10px] font-black uppercase tracking-widest text-white italic">🔍 Click to View Full Size</span>
                                                        </div>
                                                    </div>
                                                ) : null}

                                                <div className="flex items-center justify-between w-full gap-2 md:gap-3 mt-1">
                                                    <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => handleFileChange(e, "proofFile")} className="hidden" id="proof-upload" />
                                                    {(proofFile || existingProofUrl) && (
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            onClick={() => handleViewFile(proofFile, existingProofUrl)}
                                                            className="font-black italic uppercase tracking-widest text-[8px] md:text-[9px] px-4 md:px-6 h-8 rounded-full border-primary/20 text-primary hover:bg-primary/5 flex-1"
                                                        >
                                                            View Document
                                                        </Button>
                                                    )}
                                                    <Button asChild variant={(proofFile || existingProofUrl) ? "outline" : "default"} className="font-black italic uppercase tracking-widest text-[8px] md:text-[9px] px-4 md:px-6 h-8 rounded-full flex-1">
                                                        <label htmlFor="proof-upload" className="cursor-pointer">
                                                            {proofFile ? "Change" : existingProofUrl ? "Replace Proof" : "Upload"}
                                                        </label>
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Paalala / Reminder Note */}
                                    {(activeType?.pickupAddress || activeType?.processingTime || fees.length > 0) && (
                                        <div className="flex gap-3 p-4 rounded-2xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/10">
                                            <Info className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                                            <div className="space-y-2">
                                                <p className="font-black uppercase tracking-widest text-[8px] md:text-[9px] text-amber-500">Important Reminders Before Your Appointment</p>
                                                <ul className="space-y-1.5 list-none">
                                                    {activeType?.pickupAddress && (
                                                        <li className="flex items-start gap-1.5 text-[10px] md:text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                                                            <MapPin className="w-3 h-3 shrink-0 mt-0.5 text-slate-400" />
                                                            <span><span className="font-black text-slate-600 dark:text-slate-300">Report to:</span> {activeType.pickupAddress}</span>
                                                        </li>
                                                    )}
                                                    {activeType?.processingTime && (
                                                        <li className="flex items-start gap-1.5 text-[10px] md:text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                                                            <Clock className="w-3 h-3 shrink-0 mt-0.5 text-slate-400" />
                                                            <span><span className="font-black text-slate-600 dark:text-slate-300">Processing time:</span> {activeType.processingTime}</span>
                                                        </li>
                                                    )}
                                                    {fees.map((fee, idx) => fee.label && (
                                                        <li key={idx} className="flex items-start gap-1.5 text-[10px] md:text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                                                            <Coins className="w-3 h-3 shrink-0 mt-0.5 text-slate-400" />
                                                            <span>{fee.label}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                    )}

                                    {/* ♿ Minimalist Priority Lane Row Checkbox (No big card borders) */}
                                    <div className="mt-6 pt-4 border-t border-slate-100 dark:border-white/5">
                                        <div 
                                            onClick={() => setIsPriorityLane(!isPriorityLane)}
                                            className="flex items-start gap-3 md:gap-4 cursor-pointer select-none p-2 hover:bg-slate-50 dark:hover:bg-white/5 rounded-2xl transition-colors"
                                        >
                                            <div className={cn(
                                                "w-5 h-5 md:w-6 md:h-6 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 mt-0.5",
                                                isPriorityLane 
                                                    ? "bg-primary border-primary text-white" 
                                                    : "border-slate-300 dark:border-white/10"
                                            )}
                                                style={isPriorityLane ? { borderColor: themeColor, backgroundColor: themeColor } : {}}
                                            >
                                                {isPriorityLane && <Check className="w-3.5 h-3.5" />}
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-xs md:text-sm font-black italic uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                                                    ♿ Request Priority lane service
                                                </p>
                                                <p className="text-[8px] md:text-[10px] text-slate-500 font-medium leading-relaxed italic uppercase tracking-widest">
                                                    Check this if you are a Senior Citizen, PWD, or Pregnant applicant. Please present your valid ID counter for validation.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Privacy — full width, below upload grid */}
                                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-white/5" ref={privacySectionRef}>
                                        <div
                                            onClick={() => {
                                                if (privacyAccepted) {
                                                    setPrivacyAccepted(false);
                                                } else {
                                                    setIsPrivacyModalOpen(true);
                                                }
                                            }}
                                            className={cn(
                                                "p-4 md:p-6 rounded-2xl md:rounded-3xl border-2 transition-all cursor-pointer flex items-start gap-3 md:gap-4 select-none",
                                                privacyAccepted
                                                    ? "bg-primary/5 border-primary shadow-sm"
                                                    : showValidationErrors
                                                        ? "bg-red-50/10 border-red-500 dark:border-red-500/80 ring-2 ring-red-500/20 animate-pulse"
                                                        : "bg-slate-50 dark:bg-white/5 border-transparent hover:border-primary/20"
                                            )}
                                        >
                                            <div className={cn(
                                                "w-5 h-5 md:w-6 md:h-6 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 mt-0.5",
                                                privacyAccepted
                                                    ? "bg-primary border-primary text-white"
                                                    : showValidationErrors
                                                        ? "border-red-500"
                                                        : "border-slate-300 dark:border-white/10"
                                            )}>
                                                {privacyAccepted && <Check className="w-3.5 h-3.5" />}
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-xs md:text-sm font-black italic uppercase tracking-tight text-slate-900 dark:text-white">Data Privacy and Terms Agreement</p>
                                                <p className="text-[8px] md:text-[10px] text-slate-500 font-medium leading-relaxed italic uppercase tracking-widest">
                                                    I authorize the LGU to process my personal information in accordance with the Data Privacy Act. I confirm all info is true and correct. Click to review agreement.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {currentStep === "SUCCESS" && (
                                        <div className="space-y-8 text-center py-6">
                                            {/* Print queue ticket helper portal */}
                                            {queueNumber && (
                                                <PrintQueueTicket
                                                    queueNumber={queueNumber}
                                                    residentName={`${formState.firstName} ${formState.lastName}`}
                                                    serviceName={activeType?.name || "Cedula Appointment"}
                                                    appointmentDate={selectedDate ? new Date(selectedDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : ""}
                                                    appointmentSlot={selectedSlot}
                                                    isPriority={isPriorityLane}
                                                    branding={branding}
                                                    themeColor={themeColor}
                                                    triggerPrint={printTriggered}
                                                    onPrintCompleted={() => setPrintTriggered(false)}
                                                />
                                            )}

                                            <div className="w-20 h-20 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/5">
                                                <CheckCircle2 className="w-10 h-10 animate-in zoom-in duration-300" />
                                            </div>

                                            <div className="space-y-2">
                                                <h2 className="text-3xl font-black uppercase italic tracking-tight text-slate-900 dark:text-white">Appointment Scheduled!</h2>
                                                <p className="text-xs text-slate-400 font-black uppercase tracking-widest">Your slot has been successfully registered in the system</p>
                                            </div>

                                            {/* Dynamic queue ticket-like display layout */}
                                            <div className="max-w-md mx-auto border border-slate-200 dark:border-white/5 rounded-[2.5rem] p-6 bg-slate-50 dark:bg-black/10 text-left space-y-5 print:border-none print:bg-white print:text-black">
                                                <div className="flex justify-between items-center text-xs font-black uppercase tracking-widest text-slate-400 pb-2 border-b border-slate-100 dark:border-white/5">
                                                    <span>Queue ticket details</span>
                                                    <span className="text-slate-800 dark:text-slate-200 font-bold">#{(newTransactionId || "").slice(-8).toUpperCase()}</span>
                                                </div>

                                                {queueNumber && (
                                                    <div className="border-2 border-dashed border-slate-200 dark:border-white/10 rounded-3xl p-5 bg-white dark:bg-[#1a1f2c]/50 flex flex-col items-center justify-center gap-3">
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Your queue number</span>
                                                        <span className="text-4xl font-black italic tracking-tighter text-slate-900 dark:text-white font-mono">
                                                            {queueNumber}
                                                        </span>
                                                        
                                                        {isPriorityLane && (
                                                            <span className="bg-primary/10 text-primary border border-primary/20 rounded-full px-4 py-1 text-[9px] font-black uppercase tracking-widest">
                                                                ♿ Priority Lane
                                                            </span>
                                                        )}

                                                        <div className="w-full flex items-center justify-center mt-2">
                                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                                            <img 
                                                                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${queueNumber}`} 
                                                                alt="QR Ticket Code"
                                                                className="w-24 h-24 p-2 bg-white rounded-xl border border-slate-100" 
                                                            />
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="space-y-2.5 text-xs md:text-sm pt-2">
                                                    <div className="flex justify-between">
                                                        <span className="text-slate-400 font-semibold">Applicant Name:</span>
                                                        <span className="font-bold text-slate-800 dark:text-slate-100">{formState.lastName}, {formState.firstName}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-slate-400 font-semibold">Scheduled Date:</span>
                                                        <span className="font-bold text-slate-800 dark:text-slate-100">{selectedDate}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-slate-400 font-semibold">Time Session:</span>
                                                        <span className="font-bold text-slate-800 dark:text-slate-100">{selectedSlot}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-slate-400 font-semibold">Fulfillment Office:</span>
                                                        <span className="font-bold text-slate-800 dark:text-slate-100">{activeType?.pickupAddress || "Treasury Office"}</span>
                                                    </div>
                                                    {activeType?.processingTime && (
                                                        <div className="flex justify-between">
                                                            <span className="text-slate-400 font-semibold">Estimated Process Duration:</span>
                                                            <span className="font-bold text-slate-800 dark:text-slate-100">{activeType.processingTime}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                <Separator className="opacity-50" />

                                                <div className="space-y-3 pt-2">
                                                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-650 dark:text-slate-350 flex items-center gap-1.5">
                                                        <FileText className="w-4 h-4 text-blue-500" style={{ color: themeColor }} /> Requirements checklist to bring:
                                                    </h4>
                                                    {docs.length === 0 ? (
                                                        <p className="text-xs text-slate-450 italic">No specific documents required.</p>
                                                    ) : (
                                                        <ul className="text-xs font-semibold space-y-1.5 pl-5 list-disc text-slate-500 dark:text-slate-400 leading-relaxed">
                                                            {docs.map((doc, idx) => (
                                                                <li key={idx}>{doc}</li>
                                                            ))}
                                                            <li>Cash for payment (Final taxes will be computed on-site by officers).</li>
                                                        </ul>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-6 print:hidden">
                                                <Button onClick={printSlip} variant="outline" className="font-bold uppercase tracking-widest text-xs px-6 py-5 rounded-2xl w-full sm:w-auto">
                                                    <Printer className="w-4 h-4 mr-2" /> Print Ticket
                                                </Button>
                                                <Link href="/user/services" className="w-full sm:w-auto">
                                                    <Button className="text-white font-bold uppercase tracking-widest text-xs px-8 py-6 rounded-2xl hover:opacity-90 transition-all w-full" style={{ backgroundColor: themeColor }}>
                                                        <Home className="w-4 h-4 mr-2" /> Finish & Exit
                                                    </Button>
                                                </Link>
                                            </div>
                                        </div>
                                    )}
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Global Navigation Footer — like cedula page */}
                <div className="mt-8 md:mt-12 pt-6 md:pt-8 border-t border-slate-200 dark:border-white/10 flex justify-between items-center">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                                if (currentStep === "STATUS") {
                                    router.push("/user/services");
                                } else {
                                    const stepIndex = STEPS.findIndex(s => s.id === currentStep);
                                    if (stepIndex > 0) {
                                        setCurrentStep(STEPS[stepIndex - 1].id);
                                    }
                                }
                            }}
                            className="rounded-full px-12 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest italic text-[10px] h-10 md:h-14 bg-transparent hover:bg-slate-50 dark:hover:bg-white/5 flex items-center"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back
                        </Button>
                        <Button
                            onClick={currentStep === "CONFIRM" ? handleSubmit : handleNext}
                            disabled={submitting || (currentStep === "CONFIRM" && (!privacyAccepted))}
                            className="bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/20 text-[10px] md:text-xs rounded-xl md:rounded-2xl px-8 md:px-12 h-10 md:h-14 group transition-all duration-300 active:scale-95 font-black uppercase tracking-widest italic"
                            style={{ backgroundColor: themeColor }}
                        >
                            {submitting ? (
                                <div className="flex items-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Booking Slot...</span>
                                </div>
                            ) : (
                                <div className="flex items-center">
                                    {currentStep === "CONFIRM" ? "Book Appointment" : "Next Phase"}
                                    <ChevronRight className={cn("w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform", submitting && "hidden")} />
                                </div>
                            )}
                        </Button>
                    </div>
            </div>

            {/* Sticky Progress Bar at Bottom */}
            {currentStep !== "SUCCESS" && (
                <div className="fixed bottom-0 left-0 right-0 bg-white/70 dark:bg-[#06080a]/70 backdrop-blur-2xl border-t border-slate-200 dark:border-white/10 z-50 pt-2.5 pb-0 px-2.5 flex flex-col items-center print:hidden">
                    <div className="w-full max-w-5xl flex items-center justify-center gap-4">
                        <div className="h-1.5 flex-1 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                            <motion.div
                                className="h-full bg-primary"
                                initial={{ width: 0 }}
                                animate={{ width: `${((STEPS.findIndex(s => s.id === currentStep) + 1) / STEPS.length) * 100}%` }}
                            />
                        </div>
                        <span className="font-black uppercase tracking-widest italic text-[8px] md:text-[10px] text-slate-400 whitespace-nowrap">
                            Phase {STEPS.findIndex(s => s.id === currentStep) + 1} / {STEPS.length}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}
