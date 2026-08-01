"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Home,
    Activity,
    FileText,
    CheckCircle2,
    Clock,
    ArrowLeft,
    Calendar,
    User,
    Sparkles
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import dynamic from "next/dynamic";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import SchedulePicker from "@/components/shared/SchedulePicker";
import { submitRHUAppointment, getCenterAppointmentConfig } from "../actions";

const AllHealthCentersMap = dynamic(() => import("@/components/shared/AllHealthCentersMap"), {
    ssr: false,
    loading: () => (
        <div className="h-[280px] w-full rounded-2xl bg-slate-900 animate-pulse flex items-center justify-center text-xs text-slate-500 font-bold uppercase tracking-widest">
            Loading Mapandan Health Centers Map...
        </div>
    )
});

interface MedicalConsultationFormProps {
    resident: any;
    transactionType: any;
    appointmentConfig: any;
    bookedSlots: any[];
    healthCenters?: any[];
    themeColor: string;
}

type Step = "IDENTITY" | "DETAILS" | "SCHEDULE" | "REVIEW";

const STEPS: { id: Step; label: string; icon: any }[] = [
    { id: "IDENTITY", label: "IDENTITY", icon: User },
    { id: "DETAILS", label: "DETAILS", icon: FileText },
    { id: "SCHEDULE", label: "SELECT SCHEDULE", icon: Calendar },
    { id: "REVIEW", label: "REVIEW & SUBMIT", icon: CheckCircle2 }
];

const GLOBAL_STEPS = [
    { id: "STATUS", label: "STATUS", icon: Sparkles },
    { id: "IDENTITY", label: "IDENTITY", icon: User },
    { id: "DETAILS", label: "DETAILS", icon: FileText },
    { id: "SCHEDULE", label: "SCHEDULE", icon: Calendar },
    { id: "SUBMIT", label: "SUBMIT", icon: CheckCircle2 }
];

export function MedicalConsultationForm({
    resident,
    transactionType,
    appointmentConfig,
    bookedSlots: initialBookedSlots,
    healthCenters = [],
    themeColor
}: MedicalConsultationFormProps) {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState<Step>("IDENTITY");
    const [submitting, setSubmitting] = useState(false);

    // Selected Health Center state
    const [selectedCenterId, setSelectedCenterId] = useState<string>("");
    const [currentConfig, setCurrentConfig] = useState<any>(appointmentConfig);

    const selectedCenter = healthCenters.find((c: any) => c.id === selectedCenterId) || null;

    // When user selects a different health center, dynamically load its schedule config
    useEffect(() => {
        if (!selectedCenterId) {
            setCurrentConfig(appointmentConfig);
            return;
        }
        getCenterAppointmentConfig(selectedCenterId).then((res) => {
            if (res.success && res.data) {
                setCurrentConfig(res.data);
            } else {
                setCurrentConfig(appointmentConfig);
            }
        });
    }, [selectedCenterId, appointmentConfig]);

    // Validation errors state
    const [errors, setErrors] = useState<Record<string, boolean>>({});

    // Relationship to Resident state
    const [relationship, setRelationship] = useState<string>("SELF");
    const [customRelationship, setCustomRelationship] = useState<string>("");

    const bookingFor = relationship === "SELF" ? "SELF" : "RELATIVE";

    const handleRelationshipChange = (value: string) => {
        setRelationship(value);
        if (value === "SELF") {
            setResidentSnapshot({
                firstName: resident?.firstName || "",
                middleName: resident?.middleName || "",
                lastName: resident?.lastName || "",
                suffix: resident?.suffix || "",
                gender: resident?.gender || "",
                dateOfBirth: resident?.dateOfBirth ? new Date(resident.dateOfBirth).toISOString().split("T")[0] : "",
                civilStatus: resident?.civilStatus || "",
                citizenship: resident?.citizenship || "Filipino",
                houseNumber: resident?.houseNumber || "",
                street: resident?.street || "",
                barangay: resident?.barangay || "",
                municipality: resident?.municipality || "Mapandan",
                province: resident?.province || "Pangasinan",
                contactNumber: resident?.contactNumber || "",
                email: resident?.email || "",
            });
            setCustomRelationship("");
        } else {
            setResidentSnapshot({
                firstName: "",
                middleName: "",
                lastName: "",
                suffix: "",
                gender: "",
                dateOfBirth: "",
                civilStatus: "",
                citizenship: "Filipino",
                houseNumber: "",
                street: "",
                barangay: resident?.barangay || "",
                municipality: "Mapandan",
                province: "Pangasinan",
                contactNumber: resident?.contactNumber || "",
                email: resident?.email || "",
            });
            if (value !== "OTHER") {
                setCustomRelationship("");
            }
        }
    };

    const getGlobalStepState = (stepId: string) => {
        if (stepId === "STATUS") return "completed";
        
        if (currentStep === "IDENTITY") {
            if (stepId === "IDENTITY") return "active";
            return "future";
        }
        
        if (currentStep === "DETAILS") {
            if (stepId === "IDENTITY") return "completed";
            if (stepId === "DETAILS") return "active";
            return "future";
        }
        
        if (currentStep === "SCHEDULE") {
            if (stepId === "IDENTITY" || stepId === "DETAILS") return "completed";
            if (stepId === "SCHEDULE") return "active";
            return "future";
        }
        
        if (currentStep === "REVIEW") {
            if (stepId === "IDENTITY" || stepId === "DETAILS" || stepId === "SCHEDULE") return "completed";
            if (stepId === "SUBMIT") return "active";
            return "future";
        }
        
        return "future";
    };

    const handleStepClick = (stepId: Step) => {
        const targetIdx = STEPS.findIndex(s => s.id === stepId);
        const currentIdx = STEPS.findIndex(s => s.id === currentStep);

        if (targetIdx <= currentIdx) {
            setCurrentStep(stepId);
        } else {
            if (currentIdx === 0 && targetIdx > 0) {
                if (!validateDetailsStep()) return;
            }
            if (currentIdx === 1 && targetIdx > 1) {
                if (!selectedDate || !selectedSlot) {
                    toast.error("Please select a date and time slot for your appointment.");
                    return;
                }
            }
            setCurrentStep(stepId);
        }
    };

    // Form inputs
    const [residentSnapshot, setResidentSnapshot] = useState({
        firstName: resident?.firstName || "",
        middleName: resident?.middleName || "",
        lastName: resident?.lastName || "",
        suffix: resident?.suffix || "",
        gender: resident?.gender || "",
        dateOfBirth: resident?.dateOfBirth ? new Date(resident.dateOfBirth).toISOString().split("T")[0] : "",
        civilStatus: resident?.civilStatus || "",
        citizenship: resident?.citizenship || "Filipino",
        houseNumber: resident?.houseNumber || "",
        street: resident?.street || "",
        barangay: resident?.barangay || "",
        municipality: resident?.municipality || "Mapandan",
        province: resident?.province || "Pangasinan",
        contactNumber: resident?.contactNumber || "",
        email: resident?.email || "",
    });

    const [additionalFields, setAdditionalFields] = useState({
        checkupType: "General Consultation",
        customCheckupType: "",
        symptomsPurpose: "",
        findings: "Recommending clearance based on routine medical inspection.",
        isPriorityLane: false,
    });

    // Appointment Schedule
    const [selectedDate, setSelectedDate] = useState<string>("");
    const [selectedSlot, setSelectedSlot] = useState<string>("");

    const validateIdentityStep = () => {
        const newErrors: Record<string, boolean> = {};
        
        if (!residentSnapshot.firstName) newErrors.firstName = true;
        if (!residentSnapshot.lastName) newErrors.lastName = true;
        if (!residentSnapshot.gender) newErrors.gender = true;
        if (!residentSnapshot.dateOfBirth) newErrors.dateOfBirth = true;
        if (!residentSnapshot.barangay) newErrors.barangay = true;
        if (!residentSnapshot.contactNumber) newErrors.contactNumber = true;
        
        if (relationship === "OTHER" && !customRelationship.trim()) {
            newErrors.customRelationship = true;
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            toast.error("Please complete all required fields highlighted in red.");
            return false;
        }

        setErrors({});
        return true;
    };

    const validateDetailsStep = () => {
        const newErrors: Record<string, boolean> = {};

        if (!additionalFields.checkupType) {
            newErrors.checkupType = true;
        }
        if (additionalFields.checkupType === "OTHER" && !additionalFields.customCheckupType.trim()) {
            newErrors.customCheckupTypeDetails = true;
        }
        if (!additionalFields.symptomsPurpose.trim()) {
            newErrors.symptomsPurpose = true;
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            toast.error("Please complete all required fields highlighted in red.");
            return false;
        }

        setErrors({});
        return true;
    };

    const handleNextStep = () => {
        if (currentStep === "IDENTITY") {
            if (!validateIdentityStep()) return;
            setCurrentStep("DETAILS");
        } else if (currentStep === "DETAILS") {
            if (!validateDetailsStep()) return;
            setCurrentStep("SCHEDULE");
        } else if (currentStep === "SCHEDULE") {
            if (!selectedDate || !selectedSlot) {
                toast.error("Please select a date and time slot for your appointment.");
                return;
            }
            setCurrentStep("REVIEW");
        }
    };

    const handlePrevStep = () => {
        if (currentStep === "DETAILS") {
            setCurrentStep("IDENTITY");
        } else if (currentStep === "SCHEDULE") {
            setCurrentStep("DETAILS");
        } else if (currentStep === "REVIEW") {
            setCurrentStep("SCHEDULE");
        }
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            const formData = new FormData();
            formData.append("typeId", transactionType.id);
            formData.append("appointmentDate", selectedDate);
            formData.append("appointmentSlot", selectedSlot);
            formData.append("residentSnapshot", JSON.stringify(residentSnapshot));
            
            const checkupDisplay = additionalFields.checkupType === "OTHER"
                ? additionalFields.customCheckupType
                : additionalFields.checkupType;

            const targetAddData: any = {
                isPriorityLane: additionalFields.isPriorityLane,
                checkupType: additionalFields.checkupType,
                customCheckupType: additionalFields.customCheckupType,
                purpose: `${checkupDisplay} Check-up: ${additionalFields.symptomsPurpose}`,
                findings: additionalFields.findings,
                healthCenterId: selectedCenter?.id || "",
                healthCenterName: selectedCenter?.name || "",
                healthCenterLocation: selectedCenter?.location || "",
                bookingFor,
                relationship: bookingFor === "RELATIVE" ? relationship : "Self",
            };

            formData.append("additionalData", JSON.stringify(targetAddData));

            const res = await submitRHUAppointment(formData);

            if (res.success) {
                toast.success("RHU Appointment scheduled successfully!");
                router.push("/user/appointment");
            } else {
                toast.error(res.error || "Failed to submit appointment.");
            }
        } catch (error) {
            console.error("Submit RHU Appointment Error:", error);
            toast.error("Something went wrong. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="container max-w-4xl mx-auto px-4 pt-0 pb-32 space-y-8">
            <style dangerouslySetInnerHTML={{
                __html: `
                .theme-icon-bg {
                    background-color: ${themeColor === "var(--primary-theme)" ? "color-mix(in srgb, var(--primary-theme) 10%, transparent)" : `${themeColor}1a`} !important;
                }
                .theme-icon-text {
                    color: ${themeColor} !important;
                }
                .theme-text-hover:hover {
                    color: ${themeColor} !important;
                }
                .theme-bg-hover:hover {
                    background-color: ${themeColor} !important;
                    border-color: ${themeColor} !important;
                }
                .theme-border-hover:hover {
                    border-color: ${themeColor} !important;
                }
                .theme-ring-focus:focus-visible {
                    outline-color: ${themeColor} !important;
                }
                `
            }} />

            {/* Breadcrumbs */}
            <div className="space-y-4 md:space-y-6">
                <Breadcrumb>
                    <BreadcrumbList className="flex-nowrap whitespace-nowrap overflow-x-auto scrollbar-none max-w-full bg-white/80 dark:bg-white/5 backdrop-blur-md px-4 py-1.5 rounded-full border border-slate-200/60 dark:border-white/5 w-full md:w-fit shadow-sm">
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
                            <BreadcrumbLink asChild>
                                <Link href="/user/services/rural-health-unit" className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-primary transition-colors italic">
                                    Rural Health Unit
                                </Link>
                            </BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator className="text-slate-300 dark:text-white/10" />
                        <BreadcrumbItem>
                            <BreadcrumbPage className="text-[10px] font-black uppercase tracking-widest italic" style={{ color: themeColor }}>Book Appointment</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>

                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6 px-1">
                    <div className="space-y-1 md:space-y-2">
                        <h1 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none select-none">
                            Book <span className="text-primary underline decoration-[6px] md:decoration-8 decoration-primary/20 underline-offset-[6px] md:underline-offset-[12px]" style={{ textDecorationColor: themeColor === "var(--primary-theme)" ? "color-mix(in srgb, var(--primary-theme) 20%, transparent)" : `${themeColor}33` }}>Appointment</span>
                        </h1>
                        <p className="text-[9px] md:text-[11px] font-bold text-slate-400 uppercase tracking-[0.4em] ml-1 italic">Rural Health Unit Appointment</p>
                    </div>
                </div>
            </div>

            {/* Progress Stepper */}
            <div className="grid grid-cols-5 gap-1.5 md:gap-4 relative px-1 md:px-2">
                {GLOBAL_STEPS.map((step, idx) => {
                    const state = getGlobalStepState(step.id);
                    const isActive = state === "active";
                    const isCompleted = state === "completed";
                    const Icon = step.icon;

                    return (
                        <div
                            key={idx}
                            role="button"
                            tabIndex={0}
                            onClick={() => {
                                if (step.id === "STATUS") {
                                    router.push("/user/services/rural-health-unit");
                                    return;
                                }
                                if (step.id === "IDENTITY") {
                                    handleStepClick("IDENTITY");
                                } else if (step.id === "DETAILS") {
                                    handleStepClick("DETAILS");
                                } else if (step.id === "SCHEDULE") {
                                    handleStepClick("SCHEDULE");
                                } else if (step.id === "SUBMIT") {
                                    handleStepClick("REVIEW");
                                }
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    if (step.id === "STATUS") {
                                        router.push("/user/services/rural-health-unit");
                                        return;
                                    }
                                    if (step.id === "IDENTITY") {
                                        handleStepClick("IDENTITY");
                                    } else if (step.id === "DETAILS") {
                                        handleStepClick("DETAILS");
                                    } else if (step.id === "SCHEDULE") {
                                        handleStepClick("SCHEDULE");
                                    } else if (step.id === "SUBMIT") {
                                        handleStepClick("REVIEW");
                                    }
                                }
                            }}
                            className={cn(
                                "flex flex-col items-center gap-2 md:gap-3 relative z-10 font-black group cursor-pointer",
                                !isActive && !isCompleted && "opacity-50 pointer-events-none"
                            )}
                        >
                            <div className={cn(
                                "w-11 h-11 md:w-16 md:h-16 rounded-xl md:rounded-2xl flex items-center justify-center transition-all duration-500 border-2",
                                isActive ? "text-white border-primary shadow-lg scale-105" :
                                    isCompleted ? "border-transparent" :
                                        "bg-slate-100 dark:bg-white/5 text-slate-400 border-transparent group-hover:border-primary/30"
                            )}
                                style={
                                    isActive
                                        ? { backgroundColor: themeColor, borderColor: themeColor }
                                        : isCompleted
                                            ? { backgroundColor: themeColor === "var(--primary-theme)" ? "color-mix(in srgb, var(--primary-theme) 10%, transparent)" : `${themeColor}1a`, color: themeColor, borderColor: themeColor === "var(--primary-theme)" ? "color-mix(in srgb, var(--primary-theme) 20%, transparent)" : `${themeColor}33` }
                                            : {}
                                }
                            >
                                <Icon className="w-4 h-4 md:w-7 md:h-7" />
                            </div>
                            <span className={cn(
                                "text-[7px] md:text-[10px] uppercase tracking-widest text-center italic hidden sm:block",
                                (isActive || isCompleted) ? "opacity-100 font-black" : "opacity-40 group-hover:opacity-100 transition-opacity"
                            )}
                                style={(isActive || isCompleted) ? { color: themeColor } : {}}
                            >
                                {step.label}
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* Stepper Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden relative z-10 flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/10 flex items-center justify-center">
                            <Activity className="w-5 h-5" style={{ color: themeColor }} />
                        </div>
                        <div>
                            <span className="text-[8.5px] font-black uppercase tracking-widest text-slate-400 block italic leading-none mb-1">Appointment Form</span>
                            <h3 className="text-xl font-black uppercase italic tracking-tighter text-slate-800 dark:text-white leading-none">
                                {transactionType?.name}
                            </h3>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 md:p-8 space-y-6">
                    <AnimatePresence mode="wait">
                        {currentStep === "IDENTITY" && (
                            <motion.div
                                key="identity"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                className="space-y-6 animate-fadeIn"
                            >
                                <div className="space-y-4">
                                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 italic border-b border-slate-100 dark:border-white/5 pb-2">Applicant / Patient Identity</h4>
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5 col-span-2 sm:col-span-1">
                                            <Label className="text-[10px] font-black uppercase tracking-wide text-slate-400 italic">
                                                Relationship to Resident <span className="text-red-500 font-bold ml-0.5">*</span>
                                            </Label>
                                            <Select
                                                value={relationship}
                                                onValueChange={handleRelationshipChange}
                                            >
                                                <SelectTrigger className="h-10 rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-white/10 text-xs font-bold theme-ring-focus">
                                                    <SelectValue placeholder="Select Relationship" />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-xl border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900">
                                                    <SelectItem value="SELF" className="text-xs font-bold rounded-lg uppercase">SELF (I AM THE PATIENT)</SelectItem>
                                                    <SelectItem value="CHILD" className="text-xs font-bold rounded-lg uppercase">CHILD</SelectItem>
                                                    <SelectItem value="PARENT" className="text-xs font-bold rounded-lg uppercase">PARENT</SelectItem>
                                                    <SelectItem value="SIBLING" className="text-xs font-bold rounded-lg uppercase">SIBLING</SelectItem>
                                                    <SelectItem value="OTHER" className="text-xs font-bold rounded-lg uppercase">OTHER</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {relationship === "OTHER" && (
                                            <div className="space-y-1.5 col-span-2 sm:col-span-1 animate-fadeIn">
                                                <Label className="text-[10px] font-black uppercase tracking-wide text-slate-400 italic">
                                                    Specify Relationship <span className="text-red-500 font-bold ml-0.5">*</span>
                                                </Label>
                                                <Input
                                                    value={customRelationship}
                                                    onChange={e => setCustomRelationship(e.target.value)}
                                                    placeholder="e.g. Cousin, Aunt, Friend"
                                                    className={cn(
                                                        "h-10 rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-white/10 text-xs font-bold theme-ring-focus",
                                                        errors.customRelationship && "border-red-500 dark:border-red-500 focus-visible:outline-red-500 focus-visible:ring-red-500"
                                                    )}
                                                />
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <Label className="text-[10px] font-black uppercase tracking-wide text-slate-400 italic">
                                                First Name <span className="text-red-500 font-bold ml-0.5">*</span>
                                            </Label>
                                            <Input
                                                disabled={bookingFor === "SELF"}
                                                value={residentSnapshot.firstName}
                                                onChange={e => setResidentSnapshot(prev => ({ ...prev, firstName: e.target.value }))}
                                                placeholder="First name of patient"
                                                className={cn(
                                                    "h-10 rounded-xl bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/5 text-xs font-bold disabled:opacity-80 theme-ring-focus",
                                                    errors.firstName && "border-red-500 dark:border-red-500 focus-visible:outline-red-500 focus-visible:ring-red-500"
                                                )}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-[10px] font-black uppercase tracking-wide text-slate-400 italic">
                                                Last Name <span className="text-red-500 font-bold ml-0.5">*</span>
                                            </Label>
                                            <Input
                                                disabled={bookingFor === "SELF"}
                                                value={residentSnapshot.lastName}
                                                onChange={e => setResidentSnapshot(prev => ({ ...prev, lastName: e.target.value }))}
                                                placeholder="Last name of patient"
                                                className={cn(
                                                    "h-10 rounded-xl bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/5 text-xs font-bold disabled:opacity-80 theme-ring-focus",
                                                    errors.lastName && "border-red-500 dark:border-red-500 focus-visible:outline-red-500 focus-visible:ring-red-500"
                                                )}
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <Label className="text-[10px] font-black uppercase tracking-wide text-slate-400 italic">
                                                Gender <span className="text-red-500 font-bold ml-0.5">*</span>
                                            </Label>
                                            {bookingFor === "SELF" ? (
                                                <Input
                                                    disabled
                                                    value={residentSnapshot.gender}
                                                    className="h-10 rounded-xl bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/5 text-xs font-bold"
                                                />
                                            ) : (
                                                <Select
                                                    value={residentSnapshot.gender}
                                                    onValueChange={v => setResidentSnapshot(prev => ({ ...prev, gender: v }))}
                                                >
                                                    <SelectTrigger className={cn(
                                                        "h-10 rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-white/10 text-xs font-bold theme-ring-focus",
                                                        errors.gender && "border-red-500 dark:border-red-500 focus:outline-red-500"
                                                    )}>
                                                        <SelectValue placeholder="Select Gender" />
                                                    </SelectTrigger>
                                                    <SelectContent className="rounded-xl border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900">
                                                        <SelectItem value="Male" className="text-xs font-bold rounded-lg">Male</SelectItem>
                                                        <SelectItem value="Female" className="text-xs font-bold rounded-lg">Female</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            )}
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-[10px] font-black uppercase tracking-wide text-slate-400 italic">
                                                Date of Birth <span className="text-red-500 font-bold ml-0.5">*</span>
                                            </Label>
                                            <Input
                                                disabled={bookingFor === "SELF"}
                                                value={residentSnapshot.dateOfBirth}
                                                onChange={e => setResidentSnapshot(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                                                type="date"
                                                className={cn(
                                                    "h-10 rounded-xl bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/5 text-xs font-bold disabled:opacity-80 theme-ring-focus",
                                                    errors.dateOfBirth && "border-red-500 dark:border-red-500 focus-visible:outline-red-500 focus-visible:ring-red-500"
                                                )}
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <Label className="text-[10px] font-black uppercase tracking-wide text-slate-400 italic">
                                                Barangay <span className="text-red-500 font-bold ml-0.5">*</span>
                                            </Label>
                                            <Input
                                                disabled={bookingFor === "SELF"}
                                                value={residentSnapshot.barangay}
                                                onChange={e => setResidentSnapshot(prev => ({ ...prev, barangay: e.target.value }))}
                                                className={cn(
                                                    "h-10 rounded-xl bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/5 text-xs font-bold disabled:opacity-80 theme-ring-focus",
                                                    errors.barangay && "border-red-500 dark:border-red-500 focus-visible:outline-red-500 focus-visible:ring-red-500"
                                                )}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-[10px] font-black uppercase tracking-wide text-slate-400 italic">
                                                Contact Number <span className="text-red-500 font-bold ml-0.5">*</span>
                                            </Label>
                                            <Input
                                                value={residentSnapshot.contactNumber}
                                                onChange={e => setResidentSnapshot(prev => ({ ...prev, contactNumber: e.target.value }))}
                                                className={cn(
                                                    "h-10 rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-white/10 text-xs font-bold theme-ring-focus",
                                                    errors.contactNumber && "border-red-500 dark:border-red-500 focus-visible:outline-red-500 focus-visible:ring-red-500"
                                                )}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {currentStep === "DETAILS" && (
                            <motion.div
                                key="details"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                className="space-y-6 animate-fadeIn"
                            >
                                {/* Check-up details */}
                                <div className="space-y-4">
                                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 italic border-b border-slate-100 dark:border-white/5 pb-2">Facility & Check-up Details</h4>
                                    
                                    {/* 1. Health Center Selection comes FIRST */}
                                    <div className="space-y-3">
                                        <div className="space-y-1.5">
                                            <Label className="text-[10px] font-black uppercase tracking-wide text-slate-400 italic">
                                                Health Center Location / Barangay Station <span className="text-red-500 font-bold ml-0.5">*</span>
                                            </Label>
                                            <Select
                                                value={selectedCenterId}
                                                onValueChange={v => {
                                                    setSelectedCenterId(v);
                                                    const centerObj = healthCenters.find((c: any) => c.id === v);
                                                    if (centerObj && centerObj.servicesOffered) {
                                                        const offeredStr = centerObj.servicesOffered.toLowerCase();
                                                        const ALL_OPTIONS = [
                                                            { value: "General Consultation", keywords: ["general", "consultation", "check-up", "checkup"] },
                                                            { value: "Pre-Marital", keywords: ["marital", "pre-marital", "marriage"] },
                                                            { value: "Prenatal / Maternal", keywords: ["prenatal", "maternal", "pregnant", "pregnancy"] },
                                                            { value: "Pediatric", keywords: ["pediatric", "child", "infant", "vaccination", "immunization"] },
                                                            { value: "Dental", keywords: ["dental", "tooth", "teeth", "oral"] }
                                                        ];
                                                        const matched = ALL_OPTIONS.filter(opt =>
                                                            opt.keywords.some(kw => offeredStr.includes(kw))
                                                        );
                                                        if (matched.length > 0) {
                                                            setAdditionalFields(prev => ({ ...prev, checkupType: matched[0].value }));
                                                        }
                                                    }
                                                }}
                                            >
                                                <SelectTrigger className="h-11 rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-white/10 text-xs font-bold theme-ring-focus">
                                                    <SelectValue placeholder="Select Health Center Location" />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-xl border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900">
                                                    {(healthCenters && healthCenters.length > 0 ? healthCenters : [selectedCenter]).map((center: any) => (
                                                        <SelectItem key={center.id} value={center.id} className="text-xs font-bold rounded-lg">
                                                            {center.name} ({center.barangay || "Mapandan"})
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* Center Location Map Preview Card — only show when a center is selected */}
                                        {selectedCenter && (
                                        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl p-4 space-y-3">
                                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                                                <div className="space-y-0.5">
                                                    <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                                                        <Home className="w-3.5 h-3.5 text-rose-500" />
                                                        {selectedCenter.name}
                                                    </h5>
                                                    <p className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                                                        <span>📍</span> {selectedCenter.location}
                                                    </p>
                                                </div>
                                                <a
                                                    href={selectedCenter.latitude && selectedCenter.longitude
                                                        ? `https://www.google.com/maps?q=${selectedCenter.latitude},${selectedCenter.longitude}`
                                                        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${selectedCenter.name}, ${selectedCenter.location}`)}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold rounded-lg text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 hover:bg-emerald-900/80 transition-all shrink-0"
                                                >
                                                    Open Google Maps ↗
                                                </a>
                                            </div>

                                            <div className="w-full rounded-xl overflow-hidden border border-slate-800 relative z-0">
                                                <AllHealthCentersMap
                                                     centers={healthCenters.length > 0 ? healthCenters : [selectedCenter]}
                                                     selectedCenterId={selectedCenterId}
                                                     onSelectCenter={(id) => setSelectedCenterId(id)}
                                                />
                                            </div>

                                            <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-400 pt-1">
                                                {selectedCenter.operatingHours && (
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="w-3 h-3 text-slate-500" /> {selectedCenter.operatingHours}
                                                    </span>
                                                )}
                                                {selectedCenter.contactNumber && (
                                                    <span className="flex items-center gap-1">
                                                        <Activity className="w-3 h-3 text-rose-500" /> Hotline: {selectedCenter.contactNumber}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        )}
                                    </div>

                                    {/* 2. Type of Check-up (Dynamically filtered by selected center) */}
                                    <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-white/5">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-[10px] font-black uppercase tracking-wide text-slate-400 italic">
                                                Type of Check-up <span className="text-red-500 font-bold ml-0.5">*</span>
                                            </Label>
                                            {selectedCenter?.servicesOffered && (
                                                <span className="text-[9px] font-bold text-emerald-500 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                                                    Available at {selectedCenter.name.split(' ')[0]}
                                                </span>
                                            )}
                                        </div>
                                        <Select
                                            value={additionalFields.checkupType}
                                            onValueChange={v => setAdditionalFields(prev => ({ ...prev, checkupType: v }))}
                                        >
                                            <SelectTrigger className={cn(
                                                "h-10 rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-white/10 text-xs font-bold theme-ring-focus",
                                                errors.checkupType && "border-red-500 dark:border-red-500 focus:outline-red-500"
                                            )}>
                                                <SelectValue placeholder="Select type of check-up" />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900">
                                                {(() => {
                                                    const offeredStr = (selectedCenter?.servicesOffered || "").toLowerCase();
                                                    const ALL_OPTIONS = [
                                                        { value: "General Consultation", label: "General Consultation / Check-up", keywords: ["general", "consultation", "check-up", "checkup"] },
                                                        { value: "Pre-Marital", label: "Pre-Marital / Marital Check-up", keywords: ["marital", "pre-marital", "marriage"] },
                                                        { value: "Prenatal / Maternal", label: "Maternal / Prenatal Check-up", keywords: ["prenatal", "maternal", "pregnant", "pregnancy"] },
                                                        { value: "Pediatric", label: "Pediatric / Child Check-up", keywords: ["pediatric", "child", "infant", "vaccination", "immunization"] },
                                                        { value: "Dental", label: "Dental Check-up / Consultation", keywords: ["dental", "tooth", "teeth", "oral"] }
                                                    ];
                                                    const matched = offeredStr ? ALL_OPTIONS.filter(opt =>
                                                        opt.keywords.some(kw => offeredStr.includes(kw))
                                                    ) : ALL_OPTIONS;

                                                    const listToRender = matched.length > 0 ? matched : ALL_OPTIONS;

                                                    return listToRender.map(opt => (
                                                        <SelectItem key={opt.value} value={opt.value} className="text-xs font-bold rounded-lg">
                                                            {opt.label}
                                                        </SelectItem>
                                                    ));
                                                })()}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {additionalFields.checkupType === "OTHER" && (
                                        <div className="space-y-1.5 animate-fadeIn">
                                            <Label className="text-[10px] font-black uppercase tracking-wide text-slate-400 italic">
                                                Specify Check-up Type <span className="text-red-500 font-bold ml-0.5">*</span>
                                            </Label>
                                            <Input
                                                value={additionalFields.customCheckupType}
                                                onChange={e => setAdditionalFields(prev => ({ ...prev, customCheckupType: e.target.value }))}
                                                placeholder="Enter the type of check-up you need"
                                                className={cn(
                                                    "h-10 rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-white/10 text-xs font-bold theme-ring-focus",
                                                    errors.customCheckupTypeDetails && "border-red-500 dark:border-red-500 focus-visible:outline-red-500 focus-visible:ring-red-500"
                                                )}
                                            />
                                        </div>
                                    )}

                                    {/* 3. Purpose / Symptoms / Remarks */}
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-black uppercase tracking-wide text-slate-400 italic">
                                            Purpose / Symptoms / Remarks <span className="text-red-500 font-bold ml-0.5">*</span>
                                        </Label>
                                        <Input
                                            value={additionalFields.symptomsPurpose}
                                            onChange={e => setAdditionalFields(prev => ({ ...prev, symptomsPurpose: e.target.value }))}
                                            placeholder="Briefly describe why you are booking this check-up"
                                            className={cn(
                                                "h-10 rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-white/10 text-xs font-bold theme-ring-focus",
                                                errors.symptomsPurpose && "border-red-500 dark:border-red-500 focus-visible:outline-red-500 focus-visible:ring-red-500"
                                            )}
                                        />
                                    </div>
                                </div>

                                {/* Priority Lane for senior / PWD */}
                                {(resident?.isSenior || resident?.isPWD) && (
                                    <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest block italic leading-none">Priority Lane Eligible</span>
                                            <span className="text-[9px] font-bold text-slate-400 uppercase italic">Fast-track processing for Senior Citizens and PWD.</span>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={additionalFields.isPriorityLane}
                                                onChange={e => setAdditionalFields(prev => ({ ...prev, isPriorityLane: e.target.checked }))}
                                                className="sr-only peer"
                                            />
                                            <div className="w-9 h-5 bg-slate-200 dark:bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-amber-500" />
                                        </label>
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {currentStep === "SCHEDULE" && (
                            <motion.div
                                key="schedule"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                className="space-y-4"
                            >
                                <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 italic border-b border-slate-100 dark:border-white/5 pb-2">Select Appointment Schedule</h4>
                                <div className="bg-slate-50 dark:bg-white/[0.01] rounded-3xl p-4 md:p-6 border border-slate-100 dark:border-white/5">
                                    <SchedulePicker
                                        selectedDate={selectedDate}
                                        setSelectedDate={setSelectedDate}
                                        selectedSlot={selectedSlot}
                                        setSelectedSlot={setSelectedSlot}
                                        bookedSlots={selectedCenterId
                                            ? initialBookedSlots.filter((slot: any) => {
                                                const data = slot.additionalData || {};
                                                return data.healthCenterId === selectedCenterId;
                                            })
                                            : initialBookedSlots
                                        }
                                        config={currentConfig}
                                        themeColor={themeColor}
                                    />
                                </div>
                            </motion.div>
                        )}

                        {currentStep === "REVIEW" && (
                            <motion.div
                                key="review"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                className="space-y-6"
                            >
                                <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 italic border-b border-slate-100 dark:border-white/5 pb-2">Review Appointment Information</h4>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-slate-50 dark:bg-white/[0.02] rounded-2xl border border-slate-100 dark:border-white/5">
                                        <span className="text-[8.5px] font-black uppercase tracking-widest text-slate-400 block italic leading-none mb-1">Applicant / Patient</span>
                                        <span className="text-xs font-bold text-slate-800 dark:text-white uppercase">
                                            {residentSnapshot.firstName} {residentSnapshot.lastName}
                                            {relationship !== "SELF" && (
                                                <span className="text-[9px] text-slate-400 lowercase ml-1.5 italic">
                                                    ({relationship === "OTHER" ? customRelationship : relationship})
                                                </span>
                                            )}
                                        </span>
                                    </div>
                                    <div className="p-4 bg-slate-50 dark:bg-white/[0.02] rounded-2xl border border-slate-100 dark:border-white/5">
                                        <span className="text-[8.5px] font-black uppercase tracking-widest text-slate-400 block italic leading-none mb-1">Contact Number</span>
                                        <span className="text-xs font-bold text-slate-800 dark:text-white">
                                            {residentSnapshot.contactNumber}
                                        </span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-slate-50 dark:bg-white/[0.02] rounded-2xl border border-slate-100 dark:border-white/5">
                                        <span className="text-[8.5px] font-black uppercase tracking-widest text-slate-400 block italic leading-none mb-1">Date</span>
                                        <span className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5 uppercase">
                                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                            {new Date(selectedDate).toLocaleDateString("en-US", { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                                        </span>
                                    </div>
                                    <div className="p-4 bg-slate-50 dark:bg-white/[0.02] rounded-2xl border border-slate-100 dark:border-white/5">
                                        <span className="text-[8.5px] font-black uppercase tracking-widest text-slate-400 block italic leading-none mb-1">Time Slot</span>
                                        <span className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                                            {selectedSlot}
                                        </span>
                                    </div>
                                </div>

                                {/* Service specifics summary */}
                                <div className="p-5 bg-slate-50 dark:bg-white/[0.02] rounded-2xl border border-slate-100 dark:border-white/5 space-y-4">
                                    <span className="text-[8.5px] font-black uppercase tracking-widest text-slate-400 block italic leading-none border-b border-slate-100 dark:border-white/5 pb-2">Service Context</span>
                                    
                                    <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs">
                                        <div>
                                            <span className="text-[9px] font-bold text-slate-400 block">Check-up Type</span>
                                            <span className="font-bold text-slate-800 dark:text-white uppercase">
                                                {additionalFields.checkupType === "OTHER" ? additionalFields.customCheckupType : additionalFields.checkupType}
                                            </span>
                                        </div>
                                        <div className="col-span-2">
                                            <span className="text-[9px] font-bold text-slate-400 block">Purpose / Symptoms / Remarks</span>
                                            <span className="font-bold text-slate-800 dark:text-white">
                                                {additionalFields.symptomsPurpose}
                                            </span>
                                        </div>
                                    </div>
                                </div>


                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Footer Buttons */}
                <div className="p-6 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.01] flex items-center justify-between">
                    {currentStep !== "IDENTITY" ? (
                        <Button
                            onClick={handlePrevStep}
                            className="h-10 px-5 rounded-xl border border-slate-200 dark:border-white/10 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 flex items-center gap-1.5 transition-colors bg-transparent"
                        >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            Back
                        </Button>
                    ) : (
                        <Button
                            onClick={() => router.push("/user/services/rural-health-unit")}
                            className="h-10 px-5 rounded-xl border border-slate-200 dark:border-white/10 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 flex items-center gap-1.5 transition-colors bg-transparent"
                        >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            Back
                        </Button>
                    )}

                    {currentStep !== "REVIEW" ? (
                        <Button
                            onClick={handleNextStep}
                            style={{ backgroundColor: themeColor }}
                            className="h-10 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest text-white shadow-lg active:scale-95 transition-all border-none"
                        >
                            Continue
                        </Button>
                    ) : (
                        <Button
                            disabled={submitting}
                            onClick={handleSubmit}
                            style={{ backgroundColor: themeColor }}
                            className="h-10 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest text-white shadow-lg active:scale-95 transition-all flex items-center gap-2 border-none"
                        >
                            {submitting ? (
                                <>Processing...</>
                            ) : (
                                <>Confirm & Book Appointment</>
                            )}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
