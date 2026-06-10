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
    AlertCircle,
    Home,
    Upload,
    Sparkles,
    GraduationCap
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
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import PrivacyTermsModal from "@/components/shared/PrivacyTermsModal";
import SecureIdleTimer from "@/components/shared/SecureIdleTimer";
import DocumentViewerModal from "@/components/shared/DocumentViewerModal";
import { compressImage } from "@/lib/image-compression";
/**
 * multi-step form for Cedula Application.
 */
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
    getCurrentUserResident,
    getTransactionTypes,
    submitTransaction,
    ensureCedulaTransactionTypes,
    getTransactionById,
    resubmitTransaction,
    getUserTransactions
} from "@/app/admin/transactions/actions";
import {
    submitStudentCedulaTransaction,
    resubmitStudentCedulaTransaction
} from "@/app/admin/transactions/student-actions";
import { calculateCedula, CedulaResult, isPastCedulaDeadline, getCedulaPenaltyRate } from "@/lib/cedula";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useDraft } from "@/hooks/useDraft";

// --- TYPES ---

type Step = "STATUS" | "RESIDENT" | "DECLARATION" | "CONFIRM";



interface FormState {
    typeId: string;
    applicantType: "INDIVIDUAL" | "JURIDICAL";
    residentData: any;
    income: string;
    propertyValue: string;
    idFile: File | null;
    proofFile: File | null;
    businessName: string;
    incomeSource: string;
    isStudent?: boolean;
    purpose?: string;
}

// --- CONSTANTS ---

const STEPS: { id: Step; label: string; icon: any }[] = [
    { id: "STATUS", label: "Status", icon: Sparkles },
    { id: "RESIDENT", label: "Identity", icon: User },
    { id: "DECLARATION", label: "Declaration", icon: Calculator },
    { id: "CONFIRM", label: "Submit", icon: CheckCircle2 },
];

export default function CedulaApplicationPage() {
    const router = useRouter();
    const { hydrateDraft, hydrateDraftFiles, persistDraft, persistDraftFile, clearDraft } = useDraft<FormState>("emapandan_cedula_draft");
    const [currentStep, setCurrentStep] = useState<Step>("STATUS");
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [baseDraft, setBaseDraft] = useState<string | null>(null);
    const [calcResult, setCalcResult] = useState<CedulaResult | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [initialResident, setInitialResident] = useState<any>(null);
    const [privacyAccepted, setPrivacyAccepted] = useState(false);
    const [existingIdUrl, setExistingIdUrl] = useState<string | null>(null);
    const [existingProofUrl, setExistingProofUrl] = useState<string | null>(null);
    const [revisionId, setRevisionId] = useState<string | null>(null);
    const [revisionTx, setRevisionTx] = useState<any>(null);
    const [cedulaTypes, setCedulaTypes] = useState<any[]>([]);
    const [hasActiveIndividualCedula, setHasActiveIndividualCedula] = useState(false);
    const [hasActiveJuridicalCedula, setHasActiveJuridicalCedula] = useState(false);
    const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
    const [showValidationErrors, setShowValidationErrors] = useState(false);
    const incomeInputRef = useRef<HTMLInputElement>(null);
    const contactInputRef = useRef<HTMLInputElement>(null);
    const idSectionRef = useRef<HTMLDivElement>(null);
    const proofSectionRef = useRef<HTMLDivElement>(null);
    const privacySectionRef = useRef<HTMLDivElement>(null);

    const [formData, setFormData] = useState<FormState>({
        typeId: "",
        applicantType: "INDIVIDUAL",
        residentData: {},
        income: "",
        propertyValue: "",
        idFile: null,
        proofFile: null,
        businessName: "",
        incomeSource: "PROFESSION",
        isStudent: false,
        purpose: ""
    });

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
            const isProof = file === formData.proofFile || (existingUrl === existingProofUrl && existingUrl !== null);
            setViewerTitle(isProof ? "Proof of Income Document" : "Valid ID Document");
        }
        setViewerOpen(true);
    };



    // --- INITIALIZATION ---

    useEffect(() => {
        async function init() {
            try {
                // Ensure service types exist in DB
                await ensureCedulaTransactionTypes();

                // Fetch Types
                let defaultTypeId = "";
                const typesRes = await getTransactionTypes();
                let fetchedTypes: any[] = [];
                if (typesRes.success) {
                    fetchedTypes = typesRes.data?.filter((t: any) => t.code.startsWith("CEDULA")) || [];
                    setCedulaTypes(fetchedTypes);
                    if (fetchedTypes.length > 0) {
                        const individualType = fetchedTypes.find((t: any) => t.code === "CEDULA_IND") || fetchedTypes[0];
                        defaultTypeId = individualType.id;
                        setFormData(prev => ({ ...prev, typeId: individualType.id }));
                    }
                }

                // Fetch User Transactions to verify pending requests for CEDULA_IND and CEDULA_JUR
                const txsRes = await getUserTransactions();
                if (txsRes.success && txsRes.data) {
                    const activeCedula = txsRes.data.some((tx: any) =>
                        tx.type?.code === "CEDULA_IND" &&
                        !tx.isCancelled &&
                        !["DELIVERED", "RELEASED", "REJECTED", "DRAFT"].includes(tx.status)
                    );
                    setHasActiveIndividualCedula(activeCedula);

                    const activeJuridical = txsRes.data.some((tx: any) =>
                        tx.type?.code === "CEDULA_JUR" &&
                        !tx.isCancelled &&
                        !["DELIVERED", "RELEASED", "REJECTED", "DRAFT"].includes(tx.status)
                    );
                    setHasActiveJuridicalCedula(activeJuridical);
                }

                // Check for revisionId query parameter
                const urlParams = new URLSearchParams(window.location.search);
                const revId = urlParams.get("revisionId");

                // Fetch Resident
                const residentRes = await getCurrentUserResident();
                const resident = residentRes.data;

                if (revId) {
                    // Fetch existing transaction for revision
                    const txRes = await getTransactionById(revId);
                    if (txRes.success && txRes.data) {
                        const tx = txRes.data;
                        setRevisionId(revId);
                        setRevisionTx(tx);
                        setCurrentStep("RESIDENT");

                        const addData = tx.additionalData as any || {};
                        const resSnapshot = tx.residentSnapshot as any || resident || {};

                        if (addData.validIdUrl) setExistingIdUrl(addData.validIdUrl);
                        else if (resident?.idFrontUrl) setExistingIdUrl(resident.idFrontUrl);

                        if (addData.proofOfIncomeUrl) setExistingProofUrl(addData.proofOfIncomeUrl);

                        // Match correct typeId based on applicantType
                        const targetType = fetchedTypes.find((t: any) => t.code === (addData.applicantType === "JURIDICAL" ? "CEDULA_JUR" : "CEDULA_IND")) || fetchedTypes[0];

                        // Convert income to a nicely formatted currency string with commas
                        let formattedIncome = "";
                        if (addData.income != null) {
                            const incomeNum = Number(addData.income);
                            formattedIncome = isNaN(incomeNum) ? String(addData.income) : incomeNum.toLocaleString("en-US", { maximumFractionDigits: 2 });
                        }

                        const isStudent = !!(tx.isStudent || addData.isStudent);

                        setFormData({
                            typeId: targetType?.id || tx.typeId || defaultTypeId,
                            applicantType: addData.applicantType || "INDIVIDUAL",
                            residentData: resSnapshot,
                            income: formattedIncome,
                            propertyValue: addData.propertyValue != null ? String(addData.propertyValue) : "",
                            idFile: null,
                            proofFile: null,
                            businessName: addData.businessName || "",
                            incomeSource: addData.incomeSource || "PROFESSION",
                            isStudent,
                            purpose: addData.purpose || ""
                        });

                        // Set the baseline so auto-draft doesn't overwrite it
                        setBaseDraft(JSON.stringify({
                            typeId: targetType?.id || tx.typeId || defaultTypeId,
                            applicantType: addData.applicantType || "INDIVIDUAL",
                            residentData: resSnapshot,
                            income: formattedIncome,
                            propertyValue: addData.propertyValue != null ? String(addData.propertyValue) : "",
                            businessName: addData.businessName || "",
                            incomeSource: addData.incomeSource || "PROFESSION",
                            isStudent,
                            purpose: addData.purpose || ""
                        }));
                    } else {
                        toast.error("Failed to fetch revision details");
                    }
                } else if (residentRes.success && resident) {
                    setInitialResident(resident);
                    if (resident.idFrontUrl) setExistingIdUrl(resident.idFrontUrl);

                    // Capture the clean, unmodified baseline
                    setBaseDraft(JSON.stringify({
                        typeId: defaultTypeId,
                        applicantType: "INDIVIDUAL",
                        residentData: resident,
                        income: "",
                        propertyValue: "",
                        businessName: "",
                        incomeSource: "PROFESSION"
                    }));

                    setFormData(prev => ({
                        ...prev,
                        residentData: resident,
                    }));

                    // Hydrate draft AFTER setting initial data
                    hydrateDraft(setFormData, (parsed) => {
                        setFormData(prev => ({
                            ...prev,
                            // Override residentData with draft if present, otherwise use db resident
                            residentData: parsed.residentData ? { ...resident, ...parsed.residentData } : resident,
                            ...parsed,
                        }));
                    });

                    // Hydrate files from IndexedDB
                    hydrateDraftFiles((files) => {
                        setFormData(prev => ({
                            ...prev,
                            idFile: files.idFile || null,
                            proofFile: files.proofFile || null
                        }));
                    });
                }
            } catch (err) {
                console.error("Init error:", err);
                toast.error("Failed to initialize application");
            } finally {
                setLoading(false);
            }
        }
        init();
    }, [hydrateDraft, hydrateDraftFiles]);

    // Remove PSGC fetch if not needed anymore

    const selectedType = cedulaTypes.find((t: any) => t.id === formData.typeId);

    // --- LOGIC ---
    const updateCalc = React.useCallback(() => {
        if (formData.isStudent) {
            setCalcResult({
                basicTax: 0,
                additionalTax: 0,
                penalty: 0,
                deliveryFee: 0,
                totalAmount: 0
            });
            return;
        }
        const result = calculateCedula({
            type: formData.applicantType,
            income: parseFloat(formData.income.replace(/,/g, '')) || 0,
            propertyValue: parseFloat(formData.propertyValue.replace(/,/g, '')) || 0,
            fulfillmentType: "PICK_UP", // Base amount only during initial app
            deliveryFee: 0,
            baseFee: selectedType?.baseFee
        });
        setCalcResult(result);
    }, [formData.income, formData.propertyValue, formData.applicantType, selectedType, formData.isStudent]);

    useEffect(() => {
        updateCalc();
    }, [updateCalc]);

    // Normalize incomeSource based on applicantType (heals draft states)
    useEffect(() => {
        if (formData.applicantType === "JURIDICAL" && formData.incomeSource !== "BUSINESS" && formData.incomeSource !== "PROPERTY") {
            setFormData(prev => ({ ...prev, incomeSource: "BUSINESS" }));
        } else if (formData.applicantType === "INDIVIDUAL" && formData.incomeSource !== "BUSINESS" && formData.incomeSource !== "PROPERTY" && formData.incomeSource !== "PROFESSION") {
            setFormData(prev => ({ ...prev, incomeSource: "PROFESSION" }));
        }
    }, [formData.applicantType, formData.incomeSource]);

    // Auto-save form draft whenever text fields change
    useEffect(() => {
        if (loading) return;
        const textInputs = {
            typeId: formData.typeId,
            applicantType: formData.applicantType,
            residentData: formData.residentData,
            income: formData.income,
            propertyValue: formData.propertyValue,
            businessName: formData.businessName,
            incomeSource: formData.incomeSource,
            isStudent: formData.isStudent,
            purpose: formData.purpose
        };

        const currentDraftStr = JSON.stringify(textInputs);
        if (currentDraftStr !== baseDraft) {
            persistDraft(textInputs);
        } else {
            // If the user reverts back to the exact initial state, clear the draft
            clearDraft();
        }
    }, [
        formData.typeId,
        formData.applicantType,
        formData.residentData,
        formData.income,
        formData.propertyValue,
        formData.businessName,
        formData.incomeSource,
        formData.isStudent,
        formData.purpose,
        persistDraft,
        loading,
        baseDraft,
        clearDraft
    ]);

    const isStepValid = (stepId: Step) => {
        switch (stepId) {
            case "STATUS":
                if (hasActiveIndividualCedula && formData.applicantType === "INDIVIDUAL" && !revisionId) {
                    return false;
                }
                if (hasActiveJuridicalCedula && formData.applicantType === "JURIDICAL" && !revisionId) {
                    return false;
                }
                return !!formData.typeId;
            case "RESIDENT":
                const r = formData.residentData;
                return !!r?.contactNumber;
            case "DECLARATION":
                if (formData.isStudent) {
                    return !!formData.purpose?.trim();
                }
                if (formData.applicantType === "JURIDICAL") {
                    const isProp = formData.incomeSource === "PROPERTY";
                    const hasBusinessName = !!formData.businessName?.trim();
                    if (isProp) {
                        return hasBusinessName && (parseFloat(formData.propertyValue.replace(/,/g, '')) > 0);
                    } else {
                        return hasBusinessName && (parseFloat(formData.income.replace(/,/g, '')) > 0);
                    }
                }
                return (parseFloat(formData.income.replace(/,/g, '')) > 0);
            case "CONFIRM":
                // Final submission requires Data Privacy acceptance (or revisionId) AND either a new upload or existing proof. Valid ID is optional for student.
                const hasPrivacy = !!revisionId || privacyAccepted;
                const hasId = formData.isStudent || !!formData.idFile || !!existingIdUrl;
                const hasProof = !!formData.proofFile || !!existingProofUrl;
                return hasPrivacy && hasId && hasProof;
            default:
                return true;
        }
    };

    const canNavigate = (targetStep: Step) => {
        if (revisionId && targetStep === "STATUS") return false;

        const targetIdx = STEPS.findIndex(s => s.id === targetStep);
        const currentIdx = STEPS.findIndex(s => s.id === currentStep);

        // Always allow going backwards
        if (targetIdx <= currentIdx) return true;

        // For forward navigation (clicking tab icons), ensure all PRECEDING steps are valid
        for (let i = 0; i < targetIdx; i++) {
            if (!isStepValid(STEPS[i].id)) return false;
        }
        return true;
    };

    const handleNext = () => {
        if (!isStepValid(currentStep)) {
            if (currentStep === "STATUS") {
                if (hasActiveIndividualCedula && formData.applicantType === "INDIVIDUAL" && !revisionId) {
                    toast.error("You already have an active Individual Cedula request currently in progress.");
                } else if (hasActiveJuridicalCedula && formData.applicantType === "JURIDICAL" && !revisionId) {
                    toast.error("You already have an active Juridical Cedula request currently in progress.");
                } else {
                    toast.error("Please identify your status first.");
                }
            } else if (currentStep === "RESIDENT") {
                contactInputRef.current?.focus();
                toast.error("Please provide your contact number for better coordination.");
            } else if (currentStep === "DECLARATION") {
                if (formData.isStudent) {
                    toast.error("Please state the purpose / reason of your Cedula request, bro.");
                } else if (formData.applicantType === "JURIDICAL" && !formData.businessName?.trim()) {
                    toast.error("Oops! You need to enter your Business Name, boss.");
                } else if (formData.applicantType === "JURIDICAL" && formData.incomeSource === "PROPERTY") {
                    incomeInputRef.current?.focus();
                    toast.error("Please declare the worth of your real property owned, pare.");
                } else {
                    incomeInputRef.current?.focus();
                    toast.error("Please declare your annual gross income.");
                }
            } else {
                toast.error("Please complete all required fields in this phase.");
            }
            return;
        }
        const stepIndex = STEPS.findIndex(s => s.id === currentStep);
        if (stepIndex < STEPS.length - 1) {
            setCurrentStep(STEPS[stepIndex + 1].id);
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, field: "idFile" | "proofFile") => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
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

            setFormData(prev => ({ ...prev, [field]: fileToProcess }));
            await persistDraftFile(field, fileToProcess);
        }
    };

    const onSubmit = async () => {
        const hasId = formData.isStudent || !!formData.idFile || !!existingIdUrl;
        const hasProof = !!formData.proofFile || !!existingProofUrl;
        const hasPrivacy = !!revisionId || privacyAccepted;

        if (!hasId || !hasProof || !hasPrivacy) {
            setShowValidationErrors(true);

            // Premium, helpful TagLish micro-notifications and smooth scroll to first missing element
            if (formData.isStudent) {
                if (!hasProof) {
                    toast.error("Hold on, you need to upload your Student ID or Enrollment Proof first.");
                    proofSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                } else if (!hasPrivacy) {
                    toast.error("Please accept the Data Privacy and Terms Agreement to submit your application.");
                    privacySectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                }
            } else {
                if (!hasId && !hasProof) {
                    toast.error("Wait lang, pare! You need to upload both your Valid ID and Proof of Income to proceed.");
                    idSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                } else if (!hasId) {
                    toast.error("Oops! You forgot to attach your Valid ID, bro.");
                    idSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                } else if (!hasProof) {
                    toast.error("Hold on, you need to upload your Proof of Income first.");
                    proofSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                } else if (!hasPrivacy) {
                    toast.error("Please accept the Data Privacy and Terms Agreement to submit your application.");
                    privacySectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                }
            }
            return;
        }

        setSubmitting(true);
        try {
            const submitData = new FormData();
            submitData.append("typeId", formData.typeId);
            if (existingIdUrl) submitData.append("existingIdUrl", existingIdUrl);
            if (existingProofUrl) submitData.append("existingProofUrl", existingProofUrl);

            submitData.append("residentSnapshot", JSON.stringify(formData.residentData));

            let res;
            if (formData.isStudent) {
                submitData.append("additionalData", JSON.stringify({
                    applicantType: formData.applicantType,
                    isStudent: true,
                    purpose: formData.purpose
                }));
                if (formData.idFile) submitData.append("idFile", formData.idFile);
                if (formData.proofFile) submitData.append("proofFile", formData.proofFile);

                res = revisionId
                    ? await resubmitStudentCedulaTransaction(revisionId, submitData)
                    : await submitStudentCedulaTransaction(submitData);
            } else {
                submitData.append("additionalData", JSON.stringify({
                    applicantType: formData.applicantType,
                    income: parseFloat(formData.income.replace(/,/g, '')) || 0,
                    propertyValue: parseFloat(formData.propertyValue.replace(/,/g, '')) || 0,
                    businessName: formData.businessName,
                    incomeSource: formData.incomeSource
                }));
                if (formData.idFile) submitData.append("idFile", formData.idFile);
                if (formData.proofFile) submitData.append("proofFile", formData.proofFile);

                res = revisionId
                    ? await resubmitTransaction(revisionId, submitData)
                    : await submitTransaction(submitData);
            }

            if (res.success) {
                clearDraft(); // Purge draft upon successful submission
                toast.success(revisionId ? "Revision resubmitted successfully!" : "Application submitted successfully!");
                router.push("/user/services/requests"); // Re-routing to tracking page
            } else {
                toast.error(res.error || "Submission failed");
            }
        } catch (err) {
            console.error("Submission error:", err);
            toast.error("An error occurred during submission");
        } finally {
            setSubmitting(false);
        }
    };

    // --- UI COMPONENTS ---

    if (loading) {
        return (
            <div className="min-h-[70vh] flex flex-col items-center justify-center gap-6">
                <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin shadow-lg" />
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 italic animate-pulse">Initializing Portal...</p>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 pb-0 space-y-12">
            {/* Header / Breadcrumb */}
            <div className="space-y-4 md:space-y-10">
                {/* Header / Breadcrumb */}
                <div className="sticky top-[64px] sm:top-[80px] z-40 md:static -mx-4 md:mx-0 px-4 md:px-0 pt-2 md:pt-0">
                    <Breadcrumb>
                        <BreadcrumbList className="bg-white/80 dark:bg-white/5 backdrop-blur-md px-4 md:px-6 py-2 md:py-2.5 rounded-xl md:rounded-2xl border border-slate-200 dark:border-white/10 w-fit shadow-sm">
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
                                <BreadcrumbPage className="text-[10px] font-black uppercase tracking-widest italic" style={{ color: "var(--primary-theme)" }}>Cedula Portal</BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                </div>

                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6 px-1 md:px-0">
                    <div className="space-y-1 md:space-y-2">
                        <h1 className="text-2xl md:text-4xl font-bold text-slate-900 dark:text-white uppercase italic tracking-tighter leading-tight select-none">
                            Online <span className="text-primary underline decoration-[4px] md:decoration-[6px] decoration-primary/20 underline-offset-[4px] md:underline-offset-[8px]">Cedula</span>
                        </h1>
                        <p className="text-[9px] md:text-[11px] font-bold text-slate-400 uppercase tracking-[0.4em] ml-1 md:ml-2 italic">LGU Digital Governance Portal</p>
                    </div>
                </div>
            </div>

            {/* Progress Stepper */}
            <div className="grid grid-cols-4 gap-1.5 md:gap-4 relative px-1 md:px-2">
                {STEPS.map((step, idx) => {
                    const isActive = currentStep === step.id;
                    const isCompleted = STEPS.findIndex(s => s.id === currentStep) > idx;
                    const Icon = step.icon;
                    return (
                        <div
                            key={idx}
                            onClick={() => {
                                if (hasActiveIndividualCedula && formData.applicantType === "INDIVIDUAL" && !revisionId && step.id !== "STATUS") {
                                    toast.error("This phase is locked due to a pending Individual Cedula request.");
                                    return;
                                }
                                if (hasActiveJuridicalCedula && formData.applicantType === "JURIDICAL" && !revisionId && step.id !== "STATUS") {
                                    toast.error("This phase is locked due to a pending Juridical Cedula request.");
                                    return;
                                }
                                if (canNavigate(step.id)) {
                                    setCurrentStep(step.id);
                                } else {
                                    if (currentStep === "RESIDENT") {
                                        contactInputRef.current?.focus();
                                        toast.error("Please complete your identity details first.");
                                    } else if (currentStep === "DECLARATION") {
                                        incomeInputRef.current?.focus();
                                        toast.error("Please complete the declaration first.");
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
                                    isCompleted ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30" :
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



            {/* Step Content */}
            <div className="mt-4 md:mt-8 md:bg-white md:dark:bg-[#11131a] md:rounded-[2.5rem] md:border md:border-slate-200 md:dark:border-white/10 p-0 md:p-12 md:shadow-2xl relative md:overflow-hidden group/container min-h-[400px] md:min-h-[500px] flex flex-col">
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

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 max-w-5xl mx-auto">
                                        {[
                                            {
                                                id: "INDIVIDUAL",
                                                icon: User,
                                                code: "CEDULA_IND",
                                                isStudent: false
                                            },
                                            {
                                                id: "STUDENT",
                                                icon: GraduationCap,
                                                code: "CEDULA_IND",
                                                isStudent: true
                                            },
                                            {
                                                id: "JURIDICAL",
                                                icon: Sparkles,
                                                code: "CEDULA_JUR",
                                                isStudent: false
                                            }
                                        ].map(opt => {
                                            const matched = cedulaTypes.find((t: any) => t.code === opt.code);
                                            let label = matched?.name || (opt.id === "INDIVIDUAL" ? "Individual Citizen" : "Juridical Entity");
                                            let desc = matched?.description || (opt.id === "INDIVIDUAL" ? "For private citizens, professionals, and employees." : "For corporations, partnerships, and business firms.");

                                            if (opt.isStudent) {
                                                label = "Student Cedula";
                                                desc = "For active students. Flat-rate standard community tax. Excludes income declarations.";
                                            }

                                            const isSelected = formData.applicantType === (opt.id === "STUDENT" ? "INDIVIDUAL" : opt.id) && !!formData.isStudent === opt.isStudent;
                                            const Icon = opt.icon;
                                            return (
                                                <button
                                                    key={opt.id}
                                                    type="button"
                                                    onClick={() => {
                                                        const t = cedulaTypes.find((x: any) => x.code === opt.code) || cedulaTypes[0];
                                                        if (t) {
                                                            setFormData(p => ({
                                                                ...p,
                                                                applicantType: (opt.id === "STUDENT" ? "INDIVIDUAL" : opt.id) as any,
                                                                isStudent: opt.isStudent,
                                                                typeId: t.id,
                                                                incomeSource: opt.id === "JURIDICAL" ? "BUSINESS" : "PROFESSION"
                                                            }));
                                                        }
                                                    }}
                                                    className={cn(
                                                        "p-8 rounded-[2rem] border-2 text-left relative group select-none overflow-hidden transition-all duration-300 min-h-[260px] flex flex-col justify-between cursor-pointer",
                                                        isSelected
                                                            ? "border-primary bg-primary text-white shadow-xl scale-[1.02]"
                                                            : "border-slate-200 dark:border-white/10 bg-white/40 dark:bg-white/5 backdrop-blur-sm hover:border-primary/30"
                                                    )}
                                                >
                                                    {/* Top Row: Icon and Checkmark */}
                                                    <div className="flex items-center justify-between w-full">
                                                        <div className={cn(
                                                            "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300",
                                                            isSelected ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
                                                        )}>
                                                            <Icon className="w-5 h-5 stroke-[2.5]" />
                                                        </div>
                                                        {isSelected && (
                                                            <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-md animate-in zoom-in-50 duration-300">
                                                                <Check className="w-3.5 h-3.5 text-primary stroke-[3]" />
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Bottom Row: Text content */}
                                                    <div className="space-y-2 mt-8">
                                                        <h4 className={cn(
                                                            "text-lg md:text-xl font-black uppercase italic tracking-wider leading-tight",
                                                            isSelected ? "text-white" : "text-slate-800 dark:text-slate-200"
                                                        )}>
                                                            {label.toUpperCase()}
                                                        </h4>
                                                        <p className={cn(
                                                            "text-[9px] md:text-[10px] font-bold uppercase tracking-wider leading-relaxed",
                                                            isSelected ? "text-white/80" : "text-slate-400 dark:text-slate-500"
                                                        )}>
                                                            {desc.toUpperCase()}
                                                        </p>
                                                    </div>
                                                </button>
                                            )
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

                                    {revisionTx && (
                                        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 text-red-500 animate-in fade-in duration-300">
                                            <AlertCircle className="w-5 h-5 shrink-0 animate-pulse mt-0.5" />
                                            <div className="text-left space-y-1">
                                                <p className="text-[10px] font-black uppercase tracking-wider italic">Attention: Revision Needed</p>
                                                <p className="text-xs font-bold text-slate-700 dark:text-slate-300 leading-relaxed italic">
                                                    &ldquo;{revisionTx.rejectionRemarks || "Please check the highlighted checklist files or values and submit them again."}&rdquo;
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-4 md:space-y-6">
                                        {/* Row 1: Names */}
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                                            <div className="space-y-1.5">
                                                <Label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">First Name</Label>
                                                <Input
                                                    value={formData.residentData?.firstName || ""}
                                                    readOnly={true}
                                                    className="h-10 rounded-xl border-slate-200 focus:ring-primary shadow-sm text-xs md:text-sm bg-slate-50 text-slate-400"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Middle Name</Label>
                                                <Input
                                                    value={formData.residentData?.middleName || ""}
                                                    readOnly={true}
                                                    className="h-10 rounded-xl border-slate-200 focus:ring-primary shadow-sm text-xs md:text-sm bg-slate-50 text-slate-400"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Last Name</Label>
                                                <Input
                                                    value={formData.residentData?.lastName || ""}
                                                    readOnly={true}
                                                    className="h-10 rounded-xl border-slate-200 focus:ring-primary shadow-sm text-xs md:text-sm bg-slate-50 text-slate-400"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Suffix</Label>
                                                <Input
                                                    value={formData.residentData?.suffix || ""}
                                                    readOnly={true}
                                                    className="h-10 rounded-xl border-slate-200 focus:ring-primary shadow-sm text-xs md:text-sm bg-slate-50 text-slate-400"
                                                />
                                            </div>
                                        </div>

                                        <Separator className="opacity-50" />

                                        {/* Row 2: Personal */}
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                                            <div className="space-y-1.5">
                                                <Label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Birth Date</Label>
                                                <Input
                                                    type="date"
                                                    value={formData.residentData?.dateOfBirth ? new Date(formData.residentData.dateOfBirth).toISOString().split('T')[0] : ""}
                                                    readOnly={true}
                                                    className="h-10 rounded-xl border-slate-200 focus:ring-primary shadow-sm text-xs md:text-sm bg-slate-50 text-slate-400"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Age</Label>
                                                <Input
                                                    value={(() => {
                                                        if (!formData.residentData?.dateOfBirth) return "";
                                                        const today = new Date();
                                                        const birthDate = new Date(formData.residentData.dateOfBirth);
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
                                                    value={formData.residentData?.civilStatus || "N/A"}
                                                    readOnly
                                                    className="h-10 rounded-xl bg-slate-50 border-slate-200 text-slate-400 font-bold text-xs md:text-sm"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Citizenship</Label>
                                                <Input
                                                    value={formData.residentData?.citizenship || "Filipino"}
                                                    readOnly={true}
                                                    className="h-10 rounded-xl border-slate-200 focus:ring-primary shadow-sm text-xs md:text-sm bg-slate-50 text-slate-400"
                                                />
                                            </div>
                                        </div>

                                        {/* Row 3: Contact & Occupation */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                                            <div className="space-y-1.5">
                                                <Label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Occupation</Label>
                                                <div className="relative">
                                                    <Input
                                                        value={formData.residentData?.occupation || ""}
                                                        readOnly={true}
                                                        className="h-10 rounded-xl border-slate-200 focus:ring-primary shadow-sm text-xs md:text-sm bg-slate-50 text-slate-400"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Contact Number</Label>
                                                <Input
                                                    ref={contactInputRef}
                                                    value={formData.residentData?.contactNumber || ""}
                                                    onChange={(e) => setFormData(p => ({ ...p, residentData: { ...p.residentData, contactNumber: e.target.value } }))}
                                                    className="h-10 rounded-xl border-slate-200 focus:ring-primary shadow-sm text-xs md:text-sm"
                                                    placeholder="09xx xxx xxxx"
                                                />
                                                <p className="text-[9px] font-black text-amber-500 uppercase tracking-wider ml-1 animate-pulse">
                                                    * Note: Please use your active contact number. This will be used to contact you regarding your transaction.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-primary/5 border border-primary/10 p-3 md:p-4 rounded-2xl md:rounded-3xl flex items-center gap-2 md:gap-3">
                                        <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
                                        <p className="text-[8px] md:text-[10px] text-primary font-black italic leading-tight uppercase tracking-widest">
                                            Note: Changes will update your Resident Profile upon submission.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Step 3: FINANCIAL DECLARATION */}
                            {currentStep === "DECLARATION" && (
                                <div className="space-y-8 md:space-y-12">
                                    <div className="space-y-2 md:space-y-4 text-center md:text-left">
                                        <h2 className="text-2xl md:text-3xl font-black italic uppercase tracking-tighter leading-tight">
                                            {formData.isStudent ? "Request" : "Tax"} <span className="text-primary italic">Declaration</span>
                                        </h2>
                                        <p className="text-slate-500 font-medium italic text-xs md:text-lg leading-relaxed">
                                            {formData.isStudent
                                                ? "Provide the purpose / reason of your Cedula request."
                                                : "Declare your annual financial status for the tax computation."}
                                        </p>
                                    </div>

                                    {revisionTx && (
                                        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 text-red-500 animate-in fade-in duration-300">
                                            <AlertCircle className="w-5 h-5 shrink-0 animate-pulse mt-0.5" />
                                            <div className="text-left space-y-1">
                                                <p className="text-[10px] font-black uppercase tracking-wider italic">Attention: Revision Needed</p>
                                                <p className="text-xs font-bold text-slate-700 dark:text-slate-300 leading-relaxed italic">
                                                    &ldquo;{revisionTx.rejectionRemarks || "Please check the highlighted checklist files or values and submit them again."}&rdquo;
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    <div className={cn("grid grid-cols-1 gap-6 md:gap-10", !formData.isStudent && "md:grid-cols-2")}>
                                        <div className="space-y-6 md:space-y-8">
                                            {formData.isStudent ? (
                                                <div className="space-y-2 md:space-y-3">
                                                    <Label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 italic ml-1">
                                                        Purpose / Reason of Request <span className="text-rose-500 font-black not-italic">*</span>
                                                    </Label>
                                                    <textarea
                                                        value={formData.purpose || ""}
                                                        onChange={(e) => setFormData(p => ({ ...p, purpose: e.target.value }))}
                                                        placeholder="Enter the purpose of your Cedula request (e.g. Scholarship application, School Enrollment, Board Exam, Valid ID verification, etc.)"
                                                        className="w-full min-h-[140px] p-4 rounded-xl md:rounded-2xl border border-slate-200 dark:border-white/10 dark:bg-[#151720] focus:ring-primary shadow-sm text-sm font-bold bg-white text-slate-800 dark:text-slate-200 focus:outline-none focus:border-primary transition-all leading-relaxed"
                                                    />
                                                </div>
                                            ) : (
                                                <>
                                                    {formData.applicantType === "JURIDICAL" && (
                                                        <div className="space-y-2 md:space-y-3">
                                                            <Label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 italic ml-1">Business Name</Label>
                                                            <Input
                                                                value={formData.businessName}
                                                                onChange={(e) => setFormData(p => ({ ...p, businessName: e.target.value }))}
                                                                placeholder="Enter Business Name"
                                                                className="h-12 md:h-16 rounded-xl md:rounded-2xl border-slate-200 dark:border-white/10 dark:bg-white/5 text-lg md:text-xl font-black italic bg-white"
                                                            />
                                                        </div>
                                                    )}

                                                    <div className="space-y-2 md:space-y-3">
                                                        <Label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 italic ml-1">
                                                            {formData.applicantType === "JURIDICAL" && formData.incomeSource === "PROPERTY"
                                                                ? "Worth of Real Property Owned"
                                                                : "Annual Gross Income"}
                                                        </Label>
                                                        <div className="relative">
                                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg md:text-xl font-black text-slate-300 italic">₱</span>
                                                            <Input
                                                                ref={incomeInputRef}
                                                                type="text"
                                                                value={formData.applicantType === "JURIDICAL" && formData.incomeSource === "PROPERTY"
                                                                    ? formData.propertyValue
                                                                    : formData.income}
                                                                onChange={(e) => {
                                                                    const val = e.target.value.replace(/[^0-9.]/g, '');
                                                                    if (val === '') {
                                                                        if (formData.applicantType === "JURIDICAL" && formData.incomeSource === "PROPERTY") {
                                                                            setFormData(p => ({ ...p, propertyValue: '' }));
                                                                        } else {
                                                                            setFormData(p => ({ ...p, income: '' }));
                                                                        }
                                                                        return;
                                                                    }
                                                                    const parts = val.split('.');
                                                                    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                                                                    const formatted = parts.length > 1 ? `${parts[0]}.${parts[1].slice(0, 2)}` : parts[0];

                                                                    if (formData.applicantType === "JURIDICAL" && formData.incomeSource === "PROPERTY") {
                                                                        setFormData(p => ({ ...p, propertyValue: formatted }));
                                                                    } else {
                                                                        setFormData(p => ({ ...p, income: formatted }));
                                                                    }
                                                                }}
                                                                placeholder="0.00"
                                                                className="h-12 md:h-16 pl-10 rounded-xl md:rounded-2xl border-slate-200 dark:border-white/10 dark:bg-white/5 text-lg md:text-xl font-black italic bg-white"
                                                            />
                                                        </div>
                                                    </div>

                                                    {formData.applicantType === "JURIDICAL" && (
                                                        <div className="space-y-4">
                                                            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 italic ml-1">
                                                                Income Source Category
                                                            </Label>
                                                            <div className="flex flex-col gap-2">
                                                                {[
                                                                    {
                                                                        id: "BUSINESS",
                                                                        label: "Business",
                                                                        desc: "Annual Gross Receipts / Income"
                                                                    },
                                                                    {
                                                                        id: "PROPERTY",
                                                                        label: "Real Property",
                                                                        desc: "Worth of Real Property Owned"
                                                                    }
                                                                ].map(opt => {
                                                                    const isSelected = formData.incomeSource === opt.id;
                                                                    return (
                                                                        <button
                                                                            key={opt.id}
                                                                            type="button"
                                                                            onClick={() => setFormData(p => ({
                                                                                ...p,
                                                                                incomeSource: opt.id,
                                                                                income: opt.id === "BUSINESS" ? p.income : "",
                                                                                propertyValue: opt.id === "PROPERTY" ? p.propertyValue : ""
                                                                            }))}
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
                                                    )}

                                                    {formData.applicantType === "INDIVIDUAL" && (
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
                                                                    const isSelected = formData.incomeSource === opt.id;
                                                                    return (
                                                                        <button
                                                                            key={opt.id}
                                                                            type="button"
                                                                            onClick={() => setFormData(p => ({ ...p, incomeSource: opt.id }))}
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
                                                    )}
                                                </>
                                            )}
                                        </div>

                                        {!formData.isStudent && (
                                            <div className="bg-slate-900 dark:bg-black rounded-3xl md:rounded-[2.5rem] p-6 md:p-10 text-white space-y-6 md:space-y-8 shadow-2xl relative overflow-hidden group/calc transition-transform">
                                                <div className="absolute top-0 right-0 p-4 md:p-8 opacity-10">
                                                    <Calculator className="w-24 h-24 md:w-32 md:h-32 rotate-12" />
                                                </div>
                                                <div className="space-y-3 md:space-y-4 border-b border-white/10 pb-4 md:pb-6 relative z-10 font-bold">
                                                    <div className="flex justify-between items-center text-[10px] md:text-xs uppercase tracking-widest italic opacity-70">
                                                        <span>Basic Tax</span>
                                                        <span>₱{(calcResult?.basicTax ?? selectedType?.baseFee ?? (formData.applicantType === "INDIVIDUAL" ? 5.00 : 500.00)).toFixed(2)}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-[10px] md:text-xs uppercase tracking-widest italic opacity-70">
                                                        <span>Additional Tax</span>
                                                        <span>₱{calcResult?.additionalTax.toFixed(2)}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-[10px] md:text-xs uppercase tracking-widest italic text-amber-500">
                                                        <span className="flex items-center gap-2">
                                                            Penalty ({Math.round(getCedulaPenaltyRate() * 100)}%)
                                                            {isPastCedulaDeadline() && (
                                                                <TooltipProvider delayDuration={0}>
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <button type="button" className="cursor-help">
                                                                                <AlertCircle className="w-3 h-3 md:w-3.5 md:h-3.5" />
                                                                            </button>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent className="bg-slate-900 text-white border-slate-800 p-3 md:p-4 rounded-xl shadow-2xl max-w-[240px] md:max-w-[280px]">
                                                                            <div className="space-y-2">
                                                                                <h4 className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-amber-500 italic">Penalty Rule</h4>
                                                                                <p className="text-[8px] md:text-[9px] font-medium leading-relaxed uppercase tracking-tighter">
                                                                                    A 2% monthly interest is imposed after the March 1st deadline.
                                                                                </p>
                                                                            </div>
                                                                        </TooltipContent>
                                                                    </Tooltip>
                                                                </TooltipProvider>
                                                            )}
                                                        </span>
                                                        <span>₱{calcResult?.penalty.toFixed(2)}</span>
                                                    </div>
                                                </div>
                                                <div className="pt-2 flex justify-between items-end relative z-10">
                                                    <div className="space-y-1 mb-1 md:mb-2 text-left">
                                                        <span className="block text-[9px] md:text-[10px] font-black uppercase tracking-widest text-primary italic">Estimated Total</span>
                                                        <p className="text-[7px] md:text-[8px] font-bold text-white/40 uppercase tracking-tighter italic leading-none max-w-[100px] md:max-w-[120px]">
                                                            * Subject to admin evaluation.
                                                        </p>
                                                    </div>
                                                    <span className="text-3xl md:text-5xl font-black italic tracking-tighter text-white">₱{calcResult?.totalAmount.toLocaleString()}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {currentStep === "CONFIRM" && (
                                <div className="space-y-8 md:space-y-10">
                                    <div className="space-y-2 md:space-y-4 text-center md:text-left">
                                        <h2 className="text-2xl md:text-3xl font-black italic uppercase tracking-tighter leading-tight">Review <span className="text-primary italic">& Finalize</span></h2>
                                        <p className="text-slate-500 font-medium italic text-xs md:text-lg leading-relaxed">Review your declaration before submitting for evaluation.</p>
                                    </div>

                                    {revisionTx && (
                                        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 text-red-500 animate-in fade-in duration-300">
                                            <AlertCircle className="w-5 h-5 shrink-0 animate-pulse mt-0.5" />
                                            <div className="text-left space-y-1">
                                                <p className="text-[10px] font-black uppercase tracking-wider italic">Attention: Revision Needed</p>
                                                <p className="text-xs font-bold text-slate-700 dark:text-slate-300 leading-relaxed italic">
                                                    &ldquo;{revisionTx.rejectionRemarks || "Please check the highlighted checklist files or values and submit them again."}&rdquo;
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
                                        <div className="space-y-4 md:space-y-6" ref={idSectionRef}>
                                            <div className={cn(
                                                "p-4 md:p-5 bg-slate-50 dark:bg-white/5 rounded-2xl border border-dashed flex flex-col items-center text-center gap-3 md:gap-4 transition-all hover:border-primary",
                                                showValidationErrors && !formData.isStudent && !(formData.idFile || existingIdUrl)
                                                    ? "border-red-500 dark:border-red-500/80 ring-2 ring-red-500/20 bg-red-50/10 animate-pulse"
                                                    : "border-slate-200 dark:border-white/10"
                                            )}>
                                                <div className="flex items-center gap-3 md:gap-4 w-full text-left">
                                                    <div className="w-10 h-10 md:w-12 md:h-12 bg-white dark:bg-black/20 rounded-xl flex items-center justify-center shadow-sm shrink-0">
                                                        <Upload className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                                                    </div>
                                                    <div className="space-y-0.5">
                                                        <h4 className="text-[10px] md:text-[11px] font-black uppercase tracking-widest text-slate-600 dark:text-white italic flex items-center gap-1">
                                                            Valid ID {formData.isStudent ? <span className="text-slate-400 dark:text-slate-500 font-normal normal-case text-[9px]">(Optional)</span> : <span className="text-red-500 font-black not-italic">*</span>}
                                                        </h4>
                                                        <p className="text-[8px] md:text-[9px] text-slate-400 font-bold italic uppercase tracking-tighter line-clamp-1">PDF / Image (Max 5MB)</p>
                                                    </div>
                                                </div>

                                                {formData.idFile ? (
                                                    formData.idFile.type.startsWith("image/") ? (
                                                        <div
                                                            onClick={() => handleViewFile(formData.idFile, null)}
                                                            className="relative w-full aspect-[21/9] rounded-xl overflow-hidden border-2 border-primary/20 shadow-lg mt-1 cursor-pointer group/preview"
                                                        >
                                                            <Image
                                                                src={URL.createObjectURL(formData.idFile)}
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
                                                            onClick={() => handleViewFile(formData.idFile, null)}
                                                            className="w-full p-4 bg-primary/5 border border-primary/20 rounded-xl flex items-center justify-between mt-1 cursor-pointer hover:bg-primary/10 transition-colors"
                                                        >
                                                            <span className="text-xs font-bold text-primary truncate max-w-[200px]">{formData.idFile.name}</span>
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
                                                    <input type="file" onChange={(e) => handleFileChange(e, "idFile")} className="hidden" id="id-upload" />
                                                    {(formData.idFile || existingIdUrl) && (
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            onClick={() => handleViewFile(formData.idFile, existingIdUrl)}
                                                            className="font-black italic uppercase tracking-widest text-[8px] md:text-[9px] px-4 md:px-6 h-8 rounded-full border-primary/20 text-primary hover:bg-primary/5 flex-1"
                                                        >
                                                            View Document
                                                        </Button>
                                                    )}
                                                    <Button asChild variant={(formData.idFile || existingIdUrl) ? "outline" : "default"} className="font-black italic uppercase tracking-widest text-[8px] md:text-[9px] px-4 md:px-6 h-8 rounded-full flex-1">
                                                        <label htmlFor="id-upload" className="cursor-pointer">
                                                            {formData.idFile ? "Change" : existingIdUrl ? "Replace ID" : "Upload"}
                                                        </label>
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4 md:space-y-6" ref={proofSectionRef}>
                                            <div className={cn(
                                                "p-4 md:p-5 bg-slate-50 dark:bg-white/5 rounded-2xl border border-dashed flex flex-col items-center text-center gap-3 md:gap-4 transition-all hover:border-primary",
                                                showValidationErrors && !(formData.proofFile || existingProofUrl)
                                                    ? "border-red-500 dark:border-red-500/80 ring-2 ring-red-500/20 bg-red-50/10 animate-pulse"
                                                    : "border-slate-200 dark:border-white/10"
                                            )}>
                                                <div className="flex items-center gap-3 md:gap-4 w-full text-left">
                                                    <div className="w-10 h-10 md:w-12 md:h-12 bg-white dark:bg-black/20 rounded-xl flex items-center justify-center shadow-sm shrink-0">
                                                        <Upload className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                                                    </div>
                                                    <div className="space-y-0.5">
                                                        <h4 className="text-[10px] md:text-[11px] font-black uppercase tracking-widest text-slate-600 dark:text-white italic flex items-center gap-1">
                                                            {formData.isStudent ? "Student ID / Enrollment / Copy Of Grades Proof" : "Proof of Income"} <span className="text-red-500 font-black not-italic">*</span>
                                                        </h4>
                                                        <p className="text-[8px] md:text-[9px] text-slate-400 font-bold italic uppercase tracking-tighter line-clamp-1">
                                                            {formData.isStudent ? "School ID / Registration Card (Max 5MB)" : "Payslip / BIR (Max 5MB)"}
                                                        </p>
                                                    </div>
                                                </div>

                                                {formData.proofFile ? (
                                                    formData.proofFile.type.startsWith("image/") ? (
                                                        <div
                                                            onClick={() => handleViewFile(formData.proofFile, null)}
                                                            className="relative w-full aspect-[21/9] rounded-xl overflow-hidden border-2 border-primary/20 shadow-lg mt-1 cursor-pointer group/preview"
                                                        >
                                                            <Image
                                                                src={URL.createObjectURL(formData.proofFile)}
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
                                                            onClick={() => handleViewFile(formData.proofFile, null)}
                                                            className="w-full p-4 bg-primary/5 border border-primary/20 rounded-xl flex items-center justify-between mt-1 cursor-pointer hover:bg-primary/10 transition-colors"
                                                        >
                                                            <span className="text-xs font-bold text-primary truncate max-w-[200px]">{formData.proofFile.name}</span>
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
                                                    <input type="file" onChange={(e) => handleFileChange(e, "proofFile")} className="hidden" id="proof-upload" />
                                                    {(formData.proofFile || existingProofUrl) && (
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            onClick={() => handleViewFile(formData.proofFile, existingProofUrl)}
                                                            className="font-black italic uppercase tracking-widest text-[8px] md:text-[9px] px-4 md:px-6 h-8 rounded-full border-primary/20 text-primary hover:bg-primary/5 flex-1"
                                                        >
                                                            View Document
                                                        </Button>
                                                    )}
                                                    <Button asChild variant={(formData.proofFile || existingProofUrl) ? "outline" : "default"} className="font-black italic uppercase tracking-widest text-[8px] md:text-[9px] px-4 md:px-6 h-8 rounded-full flex-1">
                                                        <label htmlFor="proof-upload" className="cursor-pointer">
                                                            {formData.proofFile ? "Change" : existingProofUrl ? (formData.isStudent ? "Replace Student ID" : "Replace Proof") : "Upload"}
                                                        </label>
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {!revisionId && (
                                        <div className="mt-4 md:mt-8 pt-4 md:pt-6 border-t border-slate-100 dark:border-white/5" ref={privacySectionRef}>
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
                                    )}
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Integrated Navigation Card Actions */}
                <div className="mt-8 md:mt-12 pt-6 md:pt-8 border-t border-slate-200 dark:border-white/10 flex justify-end">
                    <Button
                        onClick={currentStep === "CONFIRM" ? onSubmit : handleNext}
                        disabled={submitting || (currentStep !== "CONFIRM" && currentStep !== "STATUS" && !isStepValid(currentStep))}
                        className="bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/20 text-[10px] md:text-xs rounded-xl md:rounded-2xl px-8 md:px-12 h-10 md:h-14 group transition-all duration-300 active:scale-95 font-black uppercase tracking-widest italic"
                    >
                        {submitting ? (
                            <div className="flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>{revisionId ? "RESUBMITTING..." : "SUBMITTING..."}</span>
                            </div>
                        ) : (
                            <div className="flex items-center">
                                {currentStep === "CONFIRM" ? (revisionId ? "Resubmit" : "Finalize Submission") : "Next Phase"}
                                <ChevronRight className={cn("w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform", submitting && "hidden")} />
                            </div>
                        )}
                    </Button>
                </div>
            </div>

            {/* Sticky Actions */}
            <div className="fixed bottom-0 left-0 right-0 bg-white/70 dark:bg-[#06080a]/70 backdrop-blur-2xl border-t border-slate-200 dark:border-white/10 z-50 pt-2.5 pb-0 px-2.5 flex flex-col items-center">
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
            <PrivacyTermsModal
                isOpen={isPrivacyModalOpen}
                onClose={() => setIsPrivacyModalOpen(false)}
                onAccept={() => {
                    setPrivacyAccepted(true);
                    setIsPrivacyModalOpen(false);
                }}
                themeColor="var(--primary-theme)"
            />
            <DocumentViewerModal
                isOpen={viewerOpen}
                onClose={() => setViewerOpen(false)}
                file={viewerFile}
                fileUrl={viewerUrl}
                title={viewerTitle}
                themeColor="var(--primary-theme)"
            />
            {/* Secure Idle Inactivity Timer */}
            <SecureIdleTimer />
        </div>
    );
}

