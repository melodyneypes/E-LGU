/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
    FileText,
    User,
    ChevronRight,
    Loader2,
    Check,
    AlertCircle,
    Sparkles,
    Baby,
    Heart,
    Skull,
    ArrowRight,
    Info,
    Upload,
    Search,
    CheckCircle2,
    Users,
    Eye
} from "lucide-react";
import DocumentViewerModal from "@/components/shared/DocumentViewerModal";

const checkIsPdf = (file: any, url: string | null) => {
    if (file && file instanceof File) {
        return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    }
    if (url) {
        return url.toLowerCase().endsWith(".pdf") || url.includes("application/pdf") || url.includes(".pdf?");
    }
    return false;
};
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { PageBreadcrumb } from "@/components/shared/PageBreadcrumb";
import { Card } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
    getCurrentUserResident,
    getTransactionTypes,
    ensureCivilRegistryTransactionTypes,
    submitCivilRegistryTransaction,
    getSystemSettingAction
} from "@/app/admin/transactions/actions";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import PrivacyTermsModal from "@/components/shared/PrivacyTermsModal";

const PreviewImage = ({ file, fallbackUrl, alt, className }: { file: File | null; fallbackUrl?: string; alt: string; className?: string }) => {
    const [src, setSrc] = React.useState(fallbackUrl || "");

    React.useEffect(() => {
        if (!file) {
            setSrc(fallbackUrl || "");
            return;
        }
        const url = URL.createObjectURL(file);
        setSrc(url);
        return () => {
            URL.revokeObjectURL(url);
        };
    }, [file, fallbackUrl]);

    if (!src) return null;
    return <img src={src} alt={alt} className={className} />;
};

type Step = "STATUS" | "IDENTITY" | "DETAILS" | "PARENTS" | "CONFIRM";

const STEPS: { id: Step; label: string; icon: any }[] = [
    { id: "STATUS", label: "Status", icon: Sparkles },
    { id: "IDENTITY", label: "Identity", icon: User },
    { id: "DETAILS", label: "Details", icon: Search },
    { id: "PARENTS", label: "Parents", icon: Users },
    { id: "CONFIRM", label: "Submit", icon: CheckCircle2 },
];

interface FormState {
    typeId: string;
    registryType: "BIRTH" | "MARRIAGE" | "DEATH" | "MARRIAGE_LICENSE";
    // Fields for the specific certificate
    fullName: string;
    certFirstName: string;
    certMiddleName: string;
    certLastName: string;
    certSuffix: string;
    certDocType: "Birth Certificate" | "Copy" | "Certified True Copy" | "Authenticated Copy";
    dateOfEvent: string;
    placeOfEvent: string;
    fatherName: string;
    fatherFirstName: string;
    fatherMiddleName: string;
    fatherLastName: string;
    motherName: string;
    motherFirstName: string;
    motherMiddleName: string;
    motherLastName: string;
    spouseName: string; // For marriage
    // Shared
    deliveryType: "PICK_UP" | "DELIVERY" | "E_COPY";
    paymentType: "WALK_IN";
    files: Record<string, File | null>;
    idTypeOverride?: string;
    email: string;
    contactNumber: string;
    relationship: string;
}

const REGISTRY_TYPES = [
    {
        id: "BIRTH",
        label: "Birth Registration",
        icon: Baby,
        description: "Apply for a new Birth Registration or Request a Certified Copy.",
        color: "blue",
        requirements: ["Hospital/Birth Details", "Affidavit (if late)"]
    },
    {
        id: "DEATH",
        label: "Death Registration",
        icon: Skull,
        description: "Register a Death or Request a Certified Death Certificate.",
        color: "slate",
        requirements: ["Death Certificate Draft", "Burial Permit"]
    },
    {
        id: "MARRIAGE",
        label: "Marriage Registration",
        icon: Heart,
        description: "Request a certified copy of a Marriage Certificate.",
        color: "rose",
        requirements: ["Marriage Details"]
    },
    {
        id: "MARRIAGE_LICENSE",
        label: "Marriage License Application",
        icon: FileText,
        description: "Apply for a legal license to be married in the Philippines.",
        color: "amber",
        requirements: ["CENOMAR", "Birth Certificates", "Pre-Marriage Counseling Cert"]
    },
];

export default function CivilRegistryPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const urlType = searchParams ? searchParams.get("type") : null;
    const [currentStep, setCurrentStep] = useState<Step>("IDENTITY");
    const [mounted, setMounted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [showErrors, setShowErrors] = useState(false);
    const [availableTypes, setAvailableTypes] = useState<any[]>([]);
    const [themeColor, setThemeColor] = useState("#2563eb");

    const isStepValid = (stepId: Step) => {
        switch (stepId) {
            case "IDENTITY":
                return !!form.relationship;
            case "DETAILS":
                const isMarriage = form.registryType === "MARRIAGE" || form.registryType === "MARRIAGE_LICENSE";
                if (!form.certFirstName || !form.certLastName || !form.dateOfEvent || !form.placeOfEvent) return false;
                if (isMarriage && !form.spouseName) return false;
                return true;
            case "PARENTS":
                return true;
            case "CONFIRM":
                return true;
            default:
                return true;
        }
    };

    const canNavigate = (targetStep: Step) => {
        if (targetStep === "STATUS") return true;
        const stepsOrder: Step[] = ["STATUS", "IDENTITY", "DETAILS", "PARENTS", "CONFIRM"];
        const targetIdx = stepsOrder.indexOf(targetStep);
        const currentIdx = stepsOrder.indexOf(currentStep);

        // Always allow going backwards
        if (targetIdx <= currentIdx) return true;

        // For forward navigation, ensure all preceding steps are valid
        for (let i = 1; i < targetIdx; i++) {
            if (!isStepValid(stepsOrder[i])) return false;
        }
        return true;
    };

    useEffect(() => {
        setMounted(true);
    }, []);
    const [resident, setResident] = useState<any>(null);

    const [form, setForm] = useState<FormState>({
        typeId: "",
        registryType: "BIRTH",
        fullName: "",
        dateOfEvent: "",
        placeOfEvent: "",
        fatherName: "",
        fatherFirstName: "",
        fatherMiddleName: "",
        fatherLastName: "",
        motherName: "",
        motherFirstName: "",
        motherMiddleName: "",
        motherLastName: "",
        spouseName: "",
        certFirstName: "",
        certMiddleName: "",
        certLastName: "",
        certSuffix: "",
        certDocType: "Birth Certificate",
        deliveryType: "PICK_UP",
        paymentType: "WALK_IN",
        files: {},
        idTypeOverride: "",
        email: "",
        contactNumber: "",
        relationship: ""
    });

    const isRestoredRef = useRef(false);
    const prevRelationshipRef = useRef<string>("");
    // Privacy / Terms modal state (shared key across LCR pages)
    const [policyOpen, setPolicyOpen] = useState(false);
    const [policyAccepted, setPolicyAccepted] = useState(false);

    const [viewerOpen, setViewerOpen] = useState(false);
    const [viewerFile, setViewerFile] = useState<File | null>(null);
    const [viewerUrl, setViewerUrl] = useState<string | null>(null);
    const [viewerTitle, setViewerTitle] = useState("");

    const handleViewFile = (file: File | null, existingUrl: string | null, title: string) => {
        setViewerFile(file);
        setViewerUrl(existingUrl);
        setViewerTitle(title);
        setViewerOpen(true);
    };

    // Persist progress to session storage
    useEffect(() => {
        const savedStep = sessionStorage.getItem("civil-registry-step");
        const savedForm = sessionStorage.getItem("civil-registry-form");

        if (savedStep) setCurrentStep(savedStep as Step);
        if (savedForm) {
            try {
                const parsed = JSON.parse(savedForm);
                setForm(prev => ({
                    ...prev,
                    ...parsed,
                    files: {} // Ensure files are empty as they can't be stringified
                }));
                isRestoredRef.current = true;
            } catch (e) {
                console.error("Failed to parse saved form", e);
            }
        }
    }, []);

    useEffect(() => {
        if (!loading) {
            sessionStorage.setItem("civil-registry-step", currentStep);
            sessionStorage.setItem("civil-registry-form", JSON.stringify({
                ...form,
                files: {} // Don't store File objects
            }));
        }
    }, [currentStep, form, loading]);

    useEffect(() => {
        prevRelationshipRef.current = form.relationship;
    }, [form.relationship]);

    useEffect(() => {
        if (loading) return;
        if (isRestoredRef.current) {
            isRestoredRef.current = false;
            return;
        }

        if (form.relationship === "SELF" && resident) {
            setForm(prev => ({
                ...prev,
                fullName: `${resident.firstName || ""} ${resident.lastName || ""}`.trim(),
                certFirstName: resident.firstName || "",
                certMiddleName: resident.middleName || "",
                certLastName: resident.lastName || "",
                certSuffix: resident.suffix || "",
                placeOfEvent: resident.placeOfBirth || resident.municipality || prev.placeOfEvent,
                dateOfEvent: resident.dateOfBirth ? new Date(resident.dateOfBirth).toISOString().split('T')[0] : prev.dateOfEvent,
                fatherName: resident.fatherName || prev.fatherName,
                fatherFirstName: resident.fatherFirstName || prev.fatherFirstName,
                fatherMiddleName: resident.fatherMiddleName || prev.fatherMiddleName,
                fatherLastName: resident.fatherLastName || prev.fatherLastName,
                motherName: resident.motherName || prev.motherName,
                motherFirstName: resident.motherFirstName || prev.motherFirstName,
                motherMiddleName: resident.motherMiddleName || prev.motherMiddleName,
                motherLastName: resident.motherLastName || prev.motherLastName,
            }));
        } else if (form.relationship && form.relationship !== "SELF" && prevRelationshipRef.current === "SELF") {
            setForm(prev => ({
                ...prev,
                fullName: "",
                certFirstName: "",
                certMiddleName: "",
                certLastName: "",
                certSuffix: "",
                dateOfEvent: "",
                placeOfEvent: "",
                fatherName: "",
                fatherFirstName: "",
                fatherMiddleName: "",
                fatherLastName: "",
                motherName: "",
                motherFirstName: "",
                motherMiddleName: "",
                motherLastName: "",
            }));
        }
    }, [form.relationship, resident, loading]);

    useEffect(() => {
        async function init() {
            try {
                await ensureCivilRegistryTransactionTypes();
                const [resResult, typesResult, themeResult] = await Promise.all([
                    getCurrentUserResident(),
                    getTransactionTypes(),
                    getSystemSettingAction("theme_color", "#2563eb")
                ]);

                if (themeResult.success && themeResult.data) {
                    setThemeColor(themeResult.data);
                }

                if (resResult.success && resResult.data) {
                    setResident(resResult.data);
                    // Pre-fill some data if available
                    if (resResult.data) {
                        setForm(prev => ({
                            ...prev,
                            fullName: `${resResult.data?.firstName || ""} ${resResult.data?.lastName || ""}`.trim(),
                            email: resResult.data?.email || "",
                            contactNumber: resResult.data?.contactNumber || "",
                        }));
                    }
                }
                if (typesResult.success && typesResult.data) {
                    const lcrTypes = typesResult.data.filter((t: any) => t.category === "Civil Registry");
                    setAvailableTypes(lcrTypes);

                    // Set initial typeId if not already set by session storage
                    setForm(prev => {
                        if (prev.typeId) return prev;
                        const currentDbType = lcrTypes.find((t: any) => t.code === `LCR_${prev.registryType}`);
                        return { ...prev, typeId: currentDbType?.id || "" };
                    });
                }
            } catch (err) {
                console.error(err);
                toast.error("Initialization Failed");
            } finally {
                setLoading(false);
            }
        }
        init();
    }, []);

    useEffect(() => {
        if (urlType) {
            const upper = urlType.toUpperCase();
            if (["BIRTH", "DEATH", "MARRIAGE", "MARRIAGE_LICENSE"].includes(upper)) {
                let docType: FormState["certDocType"] = "Birth Certificate";
                if (upper === "DEATH" || upper === "MARRIAGE" || upper === "MARRIAGE_LICENSE") {
                    docType = "Certified True Copy";
                }
                setForm(prev => {
                    if (prev.registryType !== upper) {
                        setCurrentStep("IDENTITY");
                        return {
                            ...prev,
                            registryType: upper as FormState["registryType"],
                            certDocType: docType
                        };
                    }
                    return prev;
                });
            }
        }
    }, [urlType]);

    useEffect(() => {
        if (availableTypes.length > 0 && form.registryType) {
            const currentDbType = availableTypes.find((t: any) => t.code === `LCR_${form.registryType}`);
            if (currentDbType && form.typeId !== currentDbType.id) {
                setForm(prev => ({ ...prev, typeId: currentDbType.id }));
            }
        }
    }, [form.registryType, availableTypes, form.typeId]);


    const handleAcceptPolicy = () => { setPolicyOpen(false); setPolicyAccepted(true); };

    const selectedType = REGISTRY_TYPES.find(t => t.id === form.registryType);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, key: string) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.size > 5 * 1024 * 1024) {
                toast.error("File size exceeds 5MB limit.");
                if (e.target.parentElement) {
                    const parent = e.target.parentElement;
                    let errEl = parent.querySelector('.file-error-msg');
                    if (!errEl) {
                        errEl = document.createElement('div');
                        errEl.className = 'file-error-msg text-[9px] font-black uppercase text-red-500 bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-500/20 text-center animate-pulse mt-2 z-50';
                        parent.appendChild(errEl);
                    }
                    errEl.textContent = 'LIMIT UPLOAD ERROR: MAX 5MB ALLOWED';
                    setTimeout(() => errEl && errEl.remove(), 4000);
                }
                e.target.value = "";
                return;
            }
            setForm(prev => ({
                ...prev,
                files: { ...prev.files, [key]: file }
            }));
        }
    };

    const handleSubmit = async () => {
        if (!resident) {
            toast.error("User profile required");
            return;
        }

        // Validate ID uploads
        if ((!form.files["validIdFront"] && !resident?.idFrontUrl) || (!form.files["validIdBack"] && !resident?.idBackUrl)) {
            toast.error("Please upload both Front and Back of your Government ID.");
            return;
        }

        if (!form.idTypeOverride && !resident?.idType) {
            toast.error("Please select an ID type.");
            return;
        }

        // Require privacy terms acceptance before allowing submit
        if (!policyAccepted) {
            setShowErrors(true);
            toast.error("Please review and accept the Privacy Policy & Terms before submitting. Click Review to open the agreement.");
            return;
        }

        setSubmitting(true);
        try {
            const formData = new FormData();
            formData.append("typeId", form.typeId);
            formData.append("registryType", form.registryType);
            formData.append("residentSnapshot", JSON.stringify({
                firstName: resident.firstName,
                lastName: resident.lastName,
                middleName: resident.middleName,
                suffix: resident.suffix,
                contactNumber: resident.contactNumber,
                email: resident.email,
                gender: resident.gender,
                barangay: resident.barangay,
                municipality: resident.municipality,
                province: resident.province
            }));

            const additionalData = {
                subjectName: form.fullName,
                dateOfEvent: form.dateOfEvent,
                placeOfEvent: form.placeOfEvent,
                fatherName: form.fatherName,
                motherName: form.motherName,
                spouseName: form.spouseName,
                relationship: form.relationship,
                fulfillmentType: null, // No method selected yet upon upload
                email: form.email,
                contactNumber: form.contactNumber,
                idType: form.idTypeOverride || resident?.idType,
                idFrontUrl: resident?.idFrontUrl,
                idBackUrl: resident?.idBackUrl,
                totalAmount: 0 // No payment amount until evaluated by Registrar
            };

            formData.append("additionalData", JSON.stringify(additionalData));

            // Append files
            Object.entries(form.files).forEach(([key, file]) => {
                if (file) formData.append(key, file);
            });

            const res = await submitCivilRegistryTransaction(formData);
            if (res.success && res.data) {
                toast.success("Request submitted successfully!");
                sessionStorage.removeItem("civil-registry-step");
                sessionStorage.removeItem("civil-registry-form");
                router.push(`/user/services/requests/${res.data.id}`);
            } else {
                toast.error(res.error || "Submission failed");
            }
        } catch (err) {
            console.error(err);
            toast.error("An error occurred during submission");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950">
                <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-4" />
                <p className="text-sm font-black uppercase tracking-widest text-slate-400 italic">Syncing Registry Matrix...</p>
            </div>
        );
    }

    return (
        <div
            className="container max-w-4xl mx-auto px-4 pt-0 pb-0 space-y-8"
            style={{ "--primary-theme": themeColor } as React.CSSProperties}
        >
            <style dangerouslySetInnerHTML={{
                __html: `
                :root, * {
                    --color-blue-500: ${themeColor} !important;
                    --color-blue-600: ${themeColor} !important;
                    --color-blue-700: ${themeColor} !important;
                    --primary-theme: ${themeColor} !important;
                    --color-primary: ${themeColor} !important;
                }
            `}} />
            <PrivacyTermsModal
                isOpen={policyOpen}
                onClose={() => setPolicyOpen(false)}
                onAccept={handleAcceptPolicy}
                onDecline={() => { setPolicyAccepted(false); }}
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
            {/* Header Section */}
            <div className="space-y-4">
                <PageBreadcrumb />

                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-white dark:bg-[#0f1117] p-8 rounded-[2.5rem] border border-slate-200/50 dark:border-white/5 shadow-xl shadow-slate-200/40 dark:shadow-none">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500/10 rounded-xl">
                                <FileText className="w-6 h-6 text-blue-500" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-500">Local Civil Registry</span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">
                            Request <span className="text-blue-500">Birth Certificate</span>
                        </h1>
                        <p className="text-slate-500 font-medium text-sm italic">Certified true copy requests for civil registry documents.</p>
                    </div>
                </div>
            </div>

            {/* Progress Stepper */}
            <div className="grid grid-cols-5 gap-1.5 md:gap-4 relative px-1 md:px-2">
                {STEPS.map((step, idx) => {
                    const isActive = currentStep === step.id;
                    const stepIdx = STEPS.findIndex(s => s.id === currentStep);
                    const isCompleted = stepIdx > idx;
                    const Icon = step.icon;

                    return (
                        <div
                            key={idx}
                            onClick={() => {
                                if (step.id === "STATUS") {
                                    router.push("/user/services/civil-registry");
                                    return;
                                }
                                if (canNavigate(step.id)) {
                                    setCurrentStep(step.id);
                                } else {
                                    toast.info("Please fill out the current step to proceed.");
                                }
                            }}
                            className={cn(
                                "flex flex-col items-center gap-2 md:gap-3 relative z-10 font-black cursor-pointer group",
                                (!canNavigate(step.id) && currentStep !== step.id && step.id !== "STATUS") && "cursor-not-allowed opacity-50"
                            )}
                        >
                            <div 
                                className={cn(
                                    "w-11 h-11 md:w-16 md:h-16 rounded-xl md:rounded-2xl flex items-center justify-center transition-all duration-500 border-2",
                                    isActive ? "bg-primary text-white border-primary shadow-[0_0_20px_rgba(var(--primary),0.3)] scale-105 md:scale-110" :
                                        isCompleted ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30" :
                                            "bg-slate-100 dark:bg-white/5 text-slate-400 border-transparent group-hover:border-primary/30"
                                )}
                                style={isActive ? { backgroundColor: themeColor, borderColor: themeColor } : {}}
                            >
                                {isCompleted ? (
                                    <Check className="w-4 h-4 md:w-7 md:h-7" />
                                ) : (
                                    <Icon className="w-4 h-4 md:w-7 md:h-7" />
                                )}
                            </div>
                            <span 
                                className={cn(
                                    "text-[7px] md:text-[10px] uppercase tracking-widest text-center italic hidden sm:block",
                                    isActive ? "text-primary opacity-100 font-black" : "opacity-40 group-hover:opacity-100 transition-opacity"
                                )}
                                style={isActive ? { color: themeColor } : {}}
                            >
                                {step.label}
                            </span>
                        </div>
                    );
                })}
            </div>

            {mounted && typeof document !== "undefined" && createPortal(
                <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-[#06080a] border-t border-slate-200 dark:border-white/10 z-50 pt-2.5 pb-2.5 px-4 flex flex-col items-center">
                    <div className="w-full max-w-5xl flex items-center justify-center gap-4">
                        <div className="h-1.5 flex-1 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                            <motion.div
                                className="h-full bg-blue-600"
                                initial={{ width: 0 }}
                                animate={{ width: `${((STEPS.findIndex(s => s.id === currentStep) + 1) / STEPS.length) * 100}%` }}
                            />
                        </div>
                        <span className="font-black uppercase tracking-widest italic text-[8px] md:text-[10px] text-slate-400 whitespace-nowrap">
                            Phase {STEPS.findIndex(s => s.id === currentStep) + 1} / {STEPS.length}
                        </span>
                    </div>
                </div>,
                document.body
            )}

            {/* Step Selection */}
            <Card className="p-8 rounded-[2.5rem] border-slate-200/50 dark:border-white/5 bg-white dark:bg-[#0f1117] shadow-xl shadow-slate-200/40 dark:shadow-none min-h-[400px]">
                <AnimatePresence mode="wait">


                    {currentStep === "IDENTITY" && (
                        <motion.div
                            key="identity-step"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-6 md:space-y-8"
                        >
                            <div className="space-y-1">
                                <h2 className="text-xl md:text-2xl font-black italic uppercase tracking-tighter leading-tight">Identity <span className="text-blue-500 italic">Confirmation</span></h2>
                                <p className="text-[10px] md:text-xs text-slate-500 font-medium italic">Verify and refine your personal records for this request.</p>
                            </div>

                            <div className="space-y-4 md:space-y-6">
                                {/* Row 1: Names */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">First Name</Label>
                                        <Input
                                            value={resident?.firstName?.toUpperCase() || ""}
                                            readOnly
                                            className="h-10 rounded-xl bg-slate-50 border-slate-200 text-slate-400 text-xs md:text-sm uppercase font-bold"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Middle Name</Label>
                                        <Input
                                            value={resident?.middleName?.toUpperCase() || ""}
                                            readOnly
                                            className="h-10 rounded-xl bg-slate-50 border-slate-200 text-slate-400 text-xs md:text-sm uppercase font-bold"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Last Name</Label>
                                        <Input
                                            value={resident?.lastName?.toUpperCase() || ""}
                                            readOnly
                                            className="h-10 rounded-xl bg-slate-50 border-slate-200 text-slate-400 text-xs md:text-sm uppercase font-bold"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Suffix</Label>
                                        <Input
                                            value={resident?.suffix?.toUpperCase() || ""}
                                            readOnly
                                            className="h-10 rounded-xl bg-slate-50 border-slate-200 text-slate-400 text-xs md:text-sm uppercase font-bold"
                                        />
                                    </div>
                                </div>

                                <Separator className="opacity-50" />

                                {/* Row 2: Personal */}
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Birth Date</Label>
                                        <Input
                                            type="date"
                                            value={resident?.dateOfBirth ? new Date(resident.dateOfBirth).toISOString().split('T')[0] : ""}
                                            readOnly
                                            className="h-10 rounded-xl bg-slate-50 border-slate-200 text-slate-400 text-xs md:text-sm"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Age</Label>
                                        <Input
                                            value={(() => {
                                                if (!resident?.dateOfBirth) return "";
                                                const today = new Date();
                                                const birthDate = new Date(resident.dateOfBirth);
                                                let age = today.getFullYear() - birthDate.getFullYear();
                                                const m = today.getMonth() - birthDate.getMonth();
                                                if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
                                                return age;
                                            })()}
                                            readOnly
                                            className="h-10 rounded-xl bg-slate-50 border-slate-200 text-slate-400 font-bold text-xs md:text-sm"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Civil Status</Label>
                                        <Input
                                            value={resident?.civilStatus || "N/A"}
                                            readOnly
                                            className="h-10 rounded-xl bg-slate-50 border-slate-200 text-slate-400 font-bold text-xs md:text-sm"
                                        />
                                    </div>
                                    <div className="col-span-2 md:col-span-1 space-y-1.5">
                                        <Label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Barangay</Label>
                                        <Input
                                            value={resident?.barangay || "N/A"}
                                            readOnly
                                            className="h-10 rounded-xl bg-slate-50 border-slate-200 text-slate-400 font-bold text-xs md:text-sm"
                                        />
                                    </div>
                                </div>

                                {/* Row 3: Personal Details & Contact */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 items-end">
                                    <div className="space-y-1.5">
                                        <Label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Gender</Label>
                                        <Input
                                            value={resident?.gender || "N/A"}
                                            readOnly
                                            className="h-10 rounded-xl bg-slate-50 border-slate-200 text-slate-400 font-bold text-xs md:text-sm"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Occupation</Label>
                                        <Input
                                            value={resident?.occupation || "N/A"}
                                            readOnly
                                            className="h-10 rounded-xl bg-slate-50 border-slate-200 text-slate-400 font-bold text-xs md:text-sm"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-blue-500/70 ml-1">Contact Number <span className="text-red-500">*</span></Label>
                                        <div className="relative group">
                                            <Input
                                                value={form.contactNumber}
                                                onChange={(e) => setForm(p => ({ ...p, contactNumber: e.target.value }))}
                                                className={cn(
                                                    "h-10 rounded-xl border-slate-200 focus:ring-blue-500 shadow-sm text-xs md:text-sm transition-all duration-300",
                                                    form.contactNumber.length >= 11 && "border-blue-500 bg-blue-50/30 ring-1 ring-blue-500/20"
                                                )}
                                                placeholder="09xx xxx xxxx"
                                            />
                                            {form.contactNumber.length >= 11 && (
                                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                    <Check className="w-3.5 h-3.5 text-blue-500" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Row 4: Relationship */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-blue-500/70 ml-1">Relationship to Document Owner <span className="text-red-500">*</span></Label>
                                        <p className="text-xs md:text-sm text-slate-900 dark:text-blue-50 font-black italic ml-1 mb-2">I am requesting the certificate of my:</p>
                                        <Select
                                            value={form.relationship}
                                            onValueChange={(value) => setForm({ ...form, relationship: value })}
                                        >
                                            <SelectTrigger className={cn(
                                                "h-10 rounded-xl border-slate-200 focus:ring-blue-500 shadow-sm text-xs md:text-sm bg-white dark:bg-slate-900 transition-all",
                                                (showErrors && !form.relationship) && "border-red-500/50 bg-red-50/10"
                                            )}>
                                                <SelectValue placeholder="Select relationship" />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl border-slate-200 dark:border-white/10">
                                                <SelectItem value="SELF">SELF</SelectItem>
                                                <SelectItem value="SPOUSE">SPOUSE</SelectItem>
                                                <SelectItem value="SON">SON</SelectItem>
                                                <SelectItem value="DAUGHTER">DAUGHTER</SelectItem>
                                                <SelectItem value="MOTHER">MOTHER</SelectItem>
                                                <SelectItem value="FATHER">FATHER</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        {(showErrors && !form.relationship) && (
                                            <p className="text-[9px] font-black text-red-500 uppercase italic tracking-widest ml-1 animate-pulse mt-1.5">Required field</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-blue-500/5 border border-blue-500/10 p-3 md:p-4 rounded-2xl md:rounded-3xl flex items-center gap-2 md:gap-3">
                                <Sparkles className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                <p className="text-[8px] md:text-[10px] text-blue-500 font-black italic leading-tight uppercase tracking-widest">
                                    Verified Resident Profile. This information will be used for your official registry request.
                                </p>
                            </div>

                             <div className="flex justify-end gap-3 pt-8">
                                <Button
                                    onClick={() => {
                                        if (!form.relationship) {
                                            setShowErrors(true);
                                            toast.error("Please select your relationship to the document owner.");
                                            return;
                                        }
                                        setShowErrors(false);
                                        setCurrentStep("DETAILS");
                                    }}
                                    className="rounded-full px-12 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest italic text-[10px] h-12 shadow-xl shadow-blue-500/20"
                                >
                                    Next Phase
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            </div>
                        </motion.div>
                    )}

                    {currentStep === "DETAILS" && (
                        <motion.div
                            key="details-step"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-8"
                        >
                            <div className="flex items-center gap-4 mb-4">
                                <div className="md:hidden">
                                    <Button variant="ghost" className="rounded-full" onClick={() => setCurrentStep("IDENTITY")}>
                                        <ChevronRight className="w-5 h-5 rotate-180" />
                                    </Button>
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight">Certificate Details</h2>
                                    <p className="text-xs text-slate-500 font-medium italic">Certified copy for {selectedType?.label}</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-4 p-8 rounded-[2.5rem] bg-slate-50 dark:bg-white/5 border border-slate-200/50 dark:border-white/5">
                                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-blue-500 italic mb-4">Primary Subject Information</h3>

                                    <div className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">First Name <span className="text-red-500">*</span></Label>
                                                <Input
                                                    className={cn(
                                                        "rounded-xl border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 h-10 transition-all uppercase font-medium",
                                                        (showErrors && !form.certFirstName) && "border-red-500/50 bg-red-50/10",
                                                        form.relationship === "SELF" && "bg-slate-100 dark:bg-slate-800 text-slate-500"
                                                    )}
                                                    placeholder="First name"
                                                    value={form.certFirstName}
                                                    onChange={(e) => form.relationship !== "SELF" && setForm({ ...form, certFirstName: e.target.value.toUpperCase() })}
                                                    readOnly={form.relationship === "SELF"}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">Middle Name</Label>
                                                <Input
                                                    className={cn(
                                                        "rounded-xl border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 h-10 transition-all uppercase font-medium",
                                                        form.relationship === "SELF" && "bg-slate-100 dark:bg-slate-800 text-slate-500"
                                                    )}
                                                    placeholder="Middle name"
                                                    value={form.certMiddleName}
                                                    onChange={(e) => form.relationship !== "SELF" && setForm({ ...form, certMiddleName: e.target.value.toUpperCase() })}
                                                    readOnly={form.relationship === "SELF"}
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                            <div className="md:col-span-3 space-y-2">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">Last Name <span className="text-red-500">*</span></Label>
                                                <Input
                                                    className={cn(
                                                        "rounded-xl border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 h-10 transition-all uppercase font-medium",
                                                        (showErrors && !form.certLastName) && "border-red-500/50 bg-red-50/10",
                                                        form.relationship === "SELF" && "bg-slate-100 dark:bg-slate-800 text-slate-500"
                                                    )}
                                                    placeholder="Last name"
                                                    value={form.certLastName}
                                                    onChange={(e) => form.relationship !== "SELF" && setForm({ ...form, certLastName: e.target.value.toUpperCase() })}
                                                    readOnly={form.relationship === "SELF"}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">Suffix</Label>
                                                <Input
                                                    className={cn(
                                                        "rounded-xl border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 h-10 transition-all uppercase font-medium",
                                                        form.relationship === "SELF" && "bg-slate-100 dark:bg-slate-800 text-slate-500"
                                                    )}
                                                    placeholder="e.g. Jr."
                                                    value={form.certSuffix}
                                                    onChange={(e) => form.relationship !== "SELF" && setForm({ ...form, certSuffix: e.target.value.toUpperCase() })}
                                                    readOnly={form.relationship === "SELF"}
                                                />
                                            </div>
                                        </div>

                                        {(form.registryType === "MARRIAGE" || form.registryType === "MARRIAGE_LICENSE") && (
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">Wife&apos;s Full Name (Maiden) <span className="text-red-500">*</span></Label>
                                                <Input
                                                    className={cn(
                                                        "rounded-xl border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 transition-all uppercase font-medium",
                                                        (showErrors && !form.spouseName) && "border-red-500/50 bg-red-50/10"
                                                    )}
                                                    placeholder="Enter complete maiden name"
                                                    value={form.spouseName}
                                                    onChange={(e) => setForm({ ...form, spouseName: e.target.value.toUpperCase() })}
                                                />
                                                {(showErrors && !form.spouseName) && (
                                                    <p className="text-[9px] font-black text-red-500 uppercase italic tracking-widest ml-1 animate-pulse">Required field</p>
                                                )}
                                            </div>
                                        )}

                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">
                                                {form.registryType === "BIRTH" ? "Date of Birth" :
                                                    form.registryType === "DEATH" ? "Date of Death" :
                                                        form.registryType === "MARRIAGE" ? "Date of Marriage" :
                                                            "Target Marriage Date"} <span className="text-red-500">*</span>
                                            </Label>
                                            <Input
                                                type="date"
                                                className={cn(
                                                    "rounded-xl border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 transition-all",
                                                    (showErrors && !form.dateOfEvent) && "border-red-500/50 bg-red-50/10",
                                                    (form.relationship === "SELF" && !!resident?.dateOfBirth) && "bg-slate-100 dark:bg-slate-800 text-slate-500"
                                                )}
                                                value={form.dateOfEvent}
                                                onChange={(e) => setForm({ ...form, dateOfEvent: e.target.value })}
                                                readOnly={form.relationship === "SELF" && !!resident?.dateOfBirth}
                                            />
                                            {(showErrors && !form.dateOfEvent) && (
                                                <p className="text-[9px] font-black text-red-500 uppercase italic tracking-widest ml-1 animate-pulse">Required field</p>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">Place of Birth <span className="text-red-500">*</span></Label>
                                            <Input
                                                className={cn(
                                                    "rounded-xl border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 transition-all",
                                                    (showErrors && !form.placeOfEvent) && "border-red-500/50 bg-red-50/10",
                                                    (form.relationship === "SELF" && !!resident?.municipality) && "bg-slate-100 dark:bg-slate-800 text-slate-500"
                                                )}
                                                placeholder="Hospital / Municipality / Church"
                                                value={form.placeOfEvent}
                                                onChange={(e) => setForm({ ...form, placeOfEvent: e.target.value.toUpperCase() })}
                                                readOnly={form.relationship === "SELF" && !!resident?.municipality}
                                            />
                                            {(showErrors && !form.placeOfEvent) && (
                                                <p className="text-[9px] font-black text-red-500 uppercase italic tracking-widest ml-1 animate-pulse">Required field</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-6">
                                <Button
                                    variant="ghost"
                                    onClick={() => setCurrentStep("IDENTITY")}
                                    className="rounded-full px-8 border-slate-200 dark:border-white/10 font-black uppercase tracking-widest italic text-[10px] h-12"
                                >
                                    <ArrowRight className="w-4 h-4 mr-2 rotate-180" />
                                    Back
                                </Button>
                                <Button
                                    onClick={() => {
                                        const isMarriage = form.registryType === "MARRIAGE" || form.registryType === "MARRIAGE_LICENSE";
                                        if (!form.certFirstName || !form.certLastName || !form.dateOfEvent || !form.placeOfEvent || (isMarriage && !form.spouseName)) {
                                            setShowErrors(true);
                                            if (!form.certFirstName) toast.error("First Name is required.");
                                            else if (!form.certLastName) toast.error("Last Name is required.");
                                            else if (isMarriage && !form.spouseName) toast.error("Spouse Name is required.");
                                            else if (!form.dateOfEvent) toast.error("Date of Occurrence is required.");
                                            else if (!form.placeOfEvent) toast.error("Place of Birth is required.");
                                            return;
                                        }
                                        setShowErrors(false);
                                        // Auto-sync fullName for the API
                                        const full = `${form.certFirstName} ${form.certMiddleName} ${form.certLastName} ${form.certSuffix}`.replace(/\s+/g, ' ').trim();
                                        setForm(prev => ({ ...prev, fullName: full }));

                                        // Skip parents info for marriage requests as it's less standard for CTCs or handled elsewhere
                                        if (isMarriage) {
                                            setCurrentStep("CONFIRM");
                                        } else {
                                            setCurrentStep("PARENTS");
                                        }
                                    }}
                                    className="rounded-full px-8 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest italic text-[10px] h-12 shadow-xl shadow-blue-500/20"
                                >
                                    {form.registryType === "MARRIAGE" || form.registryType === "MARRIAGE_LICENSE" ? "Proceed to Review" : "Proceed to Parental Info"}
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            </div>
                        </motion.div>
                    )}

                    {currentStep === "PARENTS" && (
                        <motion.div
                            key="parents-step"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-8"
                        >
                            <div className="space-y-1">
                                <h2 className="text-xl md:text-2xl font-black italic uppercase tracking-tighter leading-tight">Parental <span className="text-blue-500 italic">Information</span></h2>
                                <p className="text-[10px] md:text-xs text-slate-500 font-medium italic">Required details for verifying the registry record.</p>
                            </div>

                            <div className="grid grid-cols-1 gap-6">
                                {/* FATHER'S ROW */}
                                <div className="space-y-4 p-6 rounded-[2rem] bg-slate-50 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 shadow-2xl shadow-blue-500/5">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                                            <Users className="w-4 h-4 text-blue-500" />
                                        </div>
                                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 italic">Father&apos;s Full Name</h3>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">First Name</Label>
                                            <Input
                                                className={cn(
                                                    "rounded-xl border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 transition-all uppercase font-medium h-12",
                                                    form.relationship === "SELF" && "bg-slate-100 dark:bg-slate-800 text-slate-500"
                                                )}
                                                placeholder="EX. JUAN"
                                                value={form.fatherFirstName}
                                                onChange={(e) => form.relationship !== "SELF" && setForm({ ...form, fatherFirstName: e.target.value.toUpperCase() })}
                                                readOnly={form.relationship === "SELF"}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">Middle Name</Label>
                                            <Input
                                                className={cn(
                                                    "rounded-xl border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 transition-all uppercase font-medium h-12",
                                                    form.relationship === "SELF" && "bg-slate-100 dark:bg-slate-800 text-slate-500"
                                                )}
                                                placeholder="EX. DELA CRUZ"
                                                value={form.fatherMiddleName}
                                                onChange={(e) => form.relationship !== "SELF" && setForm({ ...form, fatherMiddleName: e.target.value.toUpperCase() })}
                                                readOnly={form.relationship === "SELF"}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">Last Name</Label>
                                            <Input
                                                className={cn(
                                                    "rounded-xl border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 transition-all uppercase font-medium h-12",
                                                    form.relationship === "SELF" && "bg-slate-100 dark:bg-slate-800 text-slate-500"
                                                )}
                                                placeholder="EX. SANTOS"
                                                value={form.fatherLastName}
                                                onChange={(e) => form.relationship !== "SELF" && setForm({ ...form, fatherLastName: e.target.value.toUpperCase() })}
                                                readOnly={form.relationship === "SELF"}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* MOTHER'S ROW */}
                                <div className="space-y-4 p-6 rounded-[2rem] bg-slate-50 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 shadow-2xl shadow-blue-500/5">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-8 h-8 rounded-full bg-rose-500/10 flex items-center justify-center">
                                            <Users className="w-4 h-4 text-rose-500" />
                                        </div>
                                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 italic">Mother&apos;s Maiden Name</h3>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">First Name</Label>
                                            <Input
                                                className={cn(
                                                    "rounded-xl border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 transition-all uppercase font-medium h-12",
                                                    form.relationship === "SELF" && "bg-slate-100 dark:bg-slate-800 text-slate-500"
                                                )}
                                                placeholder="EX. MARIA"
                                                value={form.motherFirstName}
                                                onChange={(e) => form.relationship !== "SELF" && setForm({ ...form, motherFirstName: e.target.value.toUpperCase() })}
                                                readOnly={form.relationship === "SELF"}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">Middle Name</Label>
                                            <Input
                                                className={cn(
                                                    "rounded-xl border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 transition-all uppercase font-medium h-12",
                                                    form.relationship === "SELF" && "bg-slate-100 dark:bg-slate-800 text-slate-500"
                                                )}
                                                placeholder="EX. REYES"
                                                value={form.motherMiddleName}
                                                onChange={(e) => form.relationship !== "SELF" && setForm({ ...form, motherMiddleName: e.target.value.toUpperCase() })}
                                                readOnly={form.relationship === "SELF"}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">Last Name</Label>
                                            <Input
                                                className={cn(
                                                    "rounded-xl border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 transition-all uppercase font-medium h-12",
                                                    form.relationship === "SELF" && "bg-slate-100 dark:bg-slate-800 text-slate-500"
                                                )}
                                                placeholder="EX. MERCADO"
                                                value={form.motherLastName}
                                                onChange={(e) => form.relationship !== "SELF" && setForm({ ...form, motherLastName: e.target.value.toUpperCase() })}
                                                readOnly={form.relationship === "SELF"}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-blue-500/5 border border-blue-500/10 p-4 rounded-2xl flex items-center gap-3">
                                <Info className="w-4 h-4 text-blue-500 shrink-0" />
                                <p className="text-[10px] text-blue-500 font-bold italic uppercase tracking-widest">
                                    Please provide the names as they appear on the original registry document to avoid discrepancies.
                                </p>
                            </div>

                            <div className="flex justify-end gap-3 pt-6">
                                <Button
                                    variant="ghost"
                                    onClick={() => setCurrentStep("DETAILS")}
                                    className="rounded-full px-8 border-slate-200 dark:border-white/10 font-black uppercase tracking-widest italic text-[10px] h-12"
                                >
                                    <ArrowRight className="w-4 h-4 mr-2 rotate-180" />
                                    Back
                                </Button>
                                <Button
                                    onClick={() => {
                                        setShowErrors(false);
                                        setCurrentStep("CONFIRM");
                                    }}
                                    className="rounded-full px-12 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest italic text-[10px] h-12 shadow-xl shadow-blue-500/20"
                                >
                                    Proceed to Review
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            </div>
                        </motion.div>
                    )}

                    {currentStep === "CONFIRM" && (
                        <motion.div
                            key="confirm-step"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.05 }}
                            className="space-y-8"
                        >
                            <div className="flex items-center gap-4 mb-4">
                                <div className="md:hidden">
                                    <Button variant="ghost" className="rounded-full" onClick={() => setCurrentStep("DETAILS")}>
                                        <ChevronRight className="w-5 h-5 rotate-180" />
                                    </Button>
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight">Final Confirmation</h2>
                                    <p className="text-xs text-slate-500 font-medium italic">Verify your request details before submission</p>
                                </div>
                            </div>

                            <Card className="bg-slate-50 dark:bg-white/5 border-none p-6 rounded-[2rem] space-y-4">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-1">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 italic">Certificate Type</span>
                                        <p className="font-black text-slate-900 dark:text-white italic">
                                            {form.registryType === "BIRTH" ? "Birth Certificate" :
                                                form.registryType === "MARRIAGE" ? "Marriage Certificate" :
                                                    form.registryType === "DEATH" ? "Death Certificate" :
                                                        "Marriage License Application"}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 italic">Subject Name</span>
                                        <p className="font-black text-slate-900 dark:text-white italic uppercase">{`${form.certFirstName} ${form.certMiddleName} ${form.certLastName} ${form.certSuffix}`.trim()}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 italic">Relationship</span>
                                        <p className="font-black text-slate-900 dark:text-white italic">{form.relationship}</p>
                                    </div>
                                    {form.spouseName && (
                                        <div className="space-y-1">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 italic">Spouse Name</span>
                                            <p className="font-black text-slate-900 dark:text-white italic uppercase">{form.spouseName}</p>
                                        </div>
                                    )}
                                    <div className="space-y-1">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 italic">Occurrence Date</span>
                                        <p className="font-black text-slate-900 dark:text-white italic">{form.dateOfEvent}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 italic">Occupation</span>
                                        <p className="font-black text-slate-900 dark:text-white italic">{resident?.occupation || "N/A"}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 italic">Target Contact</span>
                                        <p className="font-black text-slate-900 dark:text-white italic">{form.contactNumber}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 italic">Gender</span>
                                        <p className="font-black text-slate-900 dark:text-white italic">{resident?.gender || "N/A"}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 italic">Civil Status</span>
                                        <p className="font-black text-slate-900 dark:text-white italic">{resident?.civilStatus || "N/A"}</p>
                                    </div>
                                    {/* Parents Info Summary */}
                                    {form.registryType !== "MARRIAGE" && form.registryType !== "MARRIAGE_LICENSE" && (
                                        <>
                                            <div className="space-y-1">
                                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 italic">Father&apos;s Name</span>
                                                <p className="font-black text-slate-900 dark:text-white italic uppercase">
                                                    {`${form.fatherFirstName} ${form.fatherMiddleName} ${form.fatherLastName}`.trim() || form.fatherName || "N/A"}
                                                </p>
                                            </div>
                                            <div className="space-y-1">
                                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 italic">Mother&apos;s Name</span>
                                                <p className="font-black text-slate-900 dark:text-white italic uppercase">
                                                    {`${form.motherFirstName} ${form.motherMiddleName} ${form.motherLastName}`.trim() || form.motherName || "N/A"}
                                                </p>
                                            </div>
                                        </>
                                    )}

                                </div>

                                {/* ID Submission Section */}
                                <div className="pt-4 border-t border-slate-200 dark:border-white/5 space-y-4">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 bg-blue-500/10 rounded-lg">
                                            <Upload className="w-3.5 h-3.5 text-blue-500" />
                                        </div>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Document Verification</span>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5 md:col-span-2">
                                            <Label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-blue-500/70 ml-1 flex items-center justify-between">
                                                <span>Select ID Type <span className="text-red-500">*</span></span>
                                            </Label>
                                            <Select
                                                value={form.idTypeOverride || resident?.idType || ""}
                                                onValueChange={(value) => setForm(prev => ({
                                                    ...prev,
                                                    idTypeOverride: value
                                                }))}
                                            >
                                                <SelectTrigger className="h-10 rounded-xl border-slate-200 focus:ring-blue-500 shadow-sm text-xs md:text-sm bg-white dark:bg-slate-900 transition-all font-bold">
                                                    <SelectValue>
                                                        {form.idTypeOverride || resident?.idType || "Select type of government ID"}
                                                    </SelectValue>
                                                </SelectTrigger>
                                                <SelectContent className="rounded-xl border-slate-200 dark:border-white/10 italic">
                                                    <SelectItem value="UMID">Unified Multi-Purpose ID (UMID)</SelectItem>
                                                    <SelectItem value="DRIVERS_LICENSE">Driver&apos;s License</SelectItem>
                                                    <SelectItem value="PASSPORT">Passport</SelectItem>
                                                    <SelectItem value="POSTAL_ID">Postal ID</SelectItem>
                                                    <SelectItem value="VOTERS_ID">Voter&apos;s ID</SelectItem>
                                                    <SelectItem value="PRC_ID">PRC ID</SelectItem>
                                                    <SelectItem value="NATIONAL_ID">National ID (PhilSys)</SelectItem>
                                                    <SelectItem value="SENIOR_CITIZEN">Senior Citizen ID</SelectItem>
                                                    <SelectItem value="PWD_ID">PWD ID</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-[9px] font-black uppercase tracking-widest text-slate-500 italic ml-1 flex items-center gap-2">
                                                Valid Government ID (Front) <span className="text-red-500">*</span>
                                            </Label>
                                            <div className={cn(
                                                "group relative flex flex-col items-center justify-center border-2 border-dashed rounded-[1.5rem] p-4 transition-all duration-300 min-h-[140px]",
                                                (form.files["validIdFront"] || resident?.idFrontUrl) ? "bg-blue-50/50 border-blue-500/50" : "bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 hover:border-blue-500/50"
                                            )}>
                                                <input
                                                    type="file"
                                                    onChange={(e) => handleFileChange(e, "validIdFront")}
                                                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                                    accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                                                />
                                                {(form.files["validIdFront"] || resident?.idFrontUrl) ? (
                                                    <div className="relative w-full aspect-[16/9] rounded-xl overflow-hidden group/preview shadow-lg">
                                                        {checkIsPdf(form.files["validIdFront"], resident?.idFrontUrl) ? (
                                                            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 dark:bg-white/5 p-4 text-center">
                                                                <FileText className="w-10 h-10 text-red-500 mb-2" />
                                                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 max-w-[80%] truncate">
                                                                    {form.files["validIdFront"] ? (form.files["validIdFront"] as File).name : "ID_FRONT.pdf"}
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <PreviewImage
                                                                file={form.files["validIdFront"] as File || null}
                                                                fallbackUrl={resident?.idFrontUrl || ""}
                                                                alt="ID Front Preview"
                                                                className="w-full h-full object-cover transition-transform duration-500 group-hover/preview:scale-110"
                                                            />
                                                        )}
                                                        <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover/preview:opacity-100 transition-opacity z-20 gap-2">
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleViewFile(form.files["validIdFront"] as File || null, resident?.idFrontUrl || null, "Valid Government ID (Front)");
                                                                }}
                                                                className="font-black italic uppercase tracking-widest text-[8px] px-3 h-7 rounded-lg bg-white text-slate-900 hover:bg-slate-100"
                                                            >
                                                                <Eye className="w-3.5 h-3.5 mr-1" />
                                                                View
                                                            </Button>
                                                            <span className="text-[7px] font-black uppercase tracking-widest text-white/70 italic">Click outside to change file</span>
                                                        </div>
                                                        <div className="absolute top-2 left-2 px-2 py-1 bg-blue-600 rounded-lg shadow-lg flex items-center gap-1.5 min-w-0 max-w-[calc(100%-1rem)] border border-white/20">
                                                            <Check className="w-2.5 h-2.5 text-white shrink-0" />
                                                            <span className="text-[8px] font-black text-white uppercase italic truncate">
                                                                {form.files["validIdFront"] ? (form.files["validIdFront"] as File).name : "ID RECORD"}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="text-center space-y-2">
                                                        <Upload className="w-5 h-5 text-slate-300 mx-auto group-hover:text-blue-500 transition-colors" />
                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic group-hover:text-blue-500 transition-colors">Click or drag</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-[9px] font-black uppercase tracking-widest text-slate-500 italic ml-1 flex items-center gap-2">
                                                Valid Government ID (Back) <span className="text-red-500">*</span>
                                            </Label>
                                            <div className={cn(
                                                "group relative flex flex-col items-center justify-center border-2 border-dashed rounded-[1.5rem] p-4 transition-all duration-300 min-h-[140px]",
                                                (form.files["validIdBack"] || resident?.idBackUrl) ? "bg-blue-50/50 border-blue-500/50" : "bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 hover:border-blue-500/50"
                                            )}>
                                                <input
                                                    type="file"
                                                    onChange={(e) => handleFileChange(e, "validIdBack")}
                                                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                                    accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                                                />
                                                {(form.files["validIdBack"] || resident?.idBackUrl) ? (
                                                    <div className="relative w-full aspect-[16/9] rounded-xl overflow-hidden group/preview shadow-lg">
                                                        {checkIsPdf(form.files["validIdBack"], resident?.idBackUrl) ? (
                                                            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 dark:bg-white/5 p-4 text-center">
                                                                <FileText className="w-10 h-10 text-red-500 mb-2" />
                                                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 max-w-[80%] truncate">
                                                                    {form.files["validIdBack"] ? (form.files["validIdBack"] as File).name : "ID_BACK.pdf"}
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <PreviewImage
                                                                file={form.files["validIdBack"] as File || null}
                                                                fallbackUrl={resident?.idBackUrl || ""}
                                                                alt="ID Back Preview"
                                                                className="w-full h-full object-cover transition-transform duration-500 group-hover/preview:scale-110"
                                                            />
                                                        )}
                                                        <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover/preview:opacity-100 transition-opacity z-20 gap-2">
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleViewFile(form.files["validIdBack"] as File || null, resident?.idBackUrl || null, "Valid Government ID (Back)");
                                                                }}
                                                                className="font-black italic uppercase tracking-widest text-[8px] px-3 h-7 rounded-lg bg-white text-slate-900 hover:bg-slate-100"
                                                            >
                                                                <Eye className="w-3.5 h-3.5 mr-1" />
                                                                View
                                                            </Button>
                                                            <span className="text-[7px] font-black uppercase tracking-widest text-white/70 italic">Click outside to change file</span>
                                                        </div>
                                                        <div className="absolute top-2 left-2 px-2 py-1 bg-blue-600 rounded-lg shadow-lg flex items-center gap-1.5 min-w-0 max-w-[calc(100%-1rem)] border border-white/20">
                                                            <Check className="w-2.5 h-2.5 text-white shrink-0" />
                                                            <span className="text-[8px] font-black text-white uppercase italic truncate">
                                                                {form.files["validIdBack"] ? (form.files["validIdBack"] as File).name : "ID RECORD"}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="text-center space-y-2">
                                                        <Upload className="w-5 h-5 text-slate-300 mx-auto group-hover:text-blue-500 transition-colors" />
                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic group-hover:text-blue-500 transition-colors">Click or drag</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Card>

                            <div className="space-y-4">
                                <div className="p-4 rounded-2xl border border-slate-200/40 bg-white/30 dark:bg-white/5 flex items-start gap-4">
                                    <button type="button" onClick={() => setPolicyOpen(true)} className={cn("w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5", policyAccepted ? "bg-blue-500 border-blue-500 text-white" : "border-slate-300")}>
                                        {policyAccepted ? <Check className="w-3 h-3" /> : null}
                                    </button>
                                    <div className="flex-1 text-xs cursor-pointer select-none" onClick={() => setPolicyOpen(true)}>
                                        <div className="font-black uppercase text-[11px] tracking-wider text-slate-800 dark:text-white">DATA PRIVACY & CERTIFICATION AGREEMENT</div>
                                        <div className="text-[10px] text-slate-500 italic mt-1 leading-relaxed">
                                            BY SUBMITTING, I CERTIFY THAT ALL INFORMATION PROVIDED IS TRUE AND CORRECT. I AM AWARE OF THE DATA PRIVACY POLICY OF MAPANDAN. CLICK TO REVIEW AGREEMENT.
                                        </div>
                                        {showErrors && !policyAccepted && (
                                            <p className="text-[9px] font-black text-red-500 uppercase italic tracking-widest ml-1 animate-pulse mt-1">Please accept the Privacy Policy & Terms before submitting.</p>
                                        )}
                                    </div>
                                    <button type="button" onClick={() => setPolicyOpen(true)} className="text-[10px] font-black italic text-blue-600 shrink-0">Review</button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                    <Button
                                        variant="ghost"
                                        onClick={() => setCurrentStep(form.registryType === "MARRIAGE" || form.registryType === "MARRIAGE_LICENSE" ? "DETAILS" : "PARENTS")}
                                        className="h-14 rounded-full border-slate-200 dark:border-white/10 font-black uppercase tracking-widest italic text-[11px]"
                                    >
                                        <ArrowRight className="w-4 h-4 mr-2 rotate-180" />
                                        Modify
                                    </Button>
                                    <Button
                                        onClick={handleSubmit}
                                        disabled={
                                            submitting ||
                                            (!form.idTypeOverride && !resident?.idType) ||
                                            (!form.files["validIdFront"] && !resident?.idFrontUrl) ||
                                            (!form.files["validIdBack"] && !resident?.idBackUrl)
                                        }
                                        className={cn(
                                            "md:col-span-3 h-14 rounded-full font-black uppercase tracking-widest italic text-[11px] transition-all duration-300",
                                            (!form.idTypeOverride && !resident?.idType) || (!form.files["validIdFront"] && !resident?.idFrontUrl) || (!form.files["validIdBack"] && !resident?.idBackUrl)
                                                ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                                                : "bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-500/20"
                                        )}
                                    >
                                        {submitting ? (
                                            <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                        ) : (!form.idTypeOverride && !resident?.idType) || (!form.files["validIdFront"] && !resident?.idFrontUrl) || (!form.files["validIdBack"] && !resident?.idBackUrl) ? (
                                            <>
                                                Upload Identification to Submit
                                                <AlertCircle className="w-5 h-5 ml-2" />
                                            </>
                                        ) : (
                                            <>
                                                Submit Civil Registry Request
                                                <CheckCircle2 className="w-5 h-5 ml-2" />
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </Card>

            {/* Info Section */}
            <div className="grid grid-cols-1 gap-6">
                <Card className="p-6 rounded-[2rem] border-slate-200/50 dark:border-white/5 bg-blue-500/5 border-l-4 border-l-blue-500">
                    <div className="flex gap-4">
                        <Info className="w-5 h-5 text-blue-500 shrink-0" />
                        <div className="space-y-1">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-500 italic">Requirements</h4>
                            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium italic">Certified true copies require a valid government ID and an authorization letter if the applicant is not the document owner.</p>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}
