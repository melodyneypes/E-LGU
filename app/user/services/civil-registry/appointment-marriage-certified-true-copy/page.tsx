"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";

import SecureIdleTimer from "@/components/shared/SecureIdleTimer";
import PrivacyTermsModal from "@/components/shared/PrivacyTermsModal";

import { motion, AnimatePresence } from "framer-motion";
import {
    User,
    Loader2,
    Check,
    AlertCircle,
    Home,
    Heart,
    CheckCircle2,
    Sparkles,
    Calendar,
    X
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
    submitCivilRegistryTransaction,
    getTransactionTypes,
    getSystemSettingAction,
    getTransactionById,
    ensureCivilRegistryTransactionTypes,
    getRegistrarAppointmentConfig
} from "@/app/admin/transactions/actions";
import SchedulePicker from "@/components/shared/SchedulePicker";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { BackNextButton } from "../_components/back-next-button";



type Step = "STATUS" | "INFORMANT" | "SUBJECT" | "SCHEDULE" | "REVIEW";

const STEPS: { id: Step; label: string; icon: any }[] = [
    { id: "STATUS", label: "STATUS", icon: Sparkles },
    { id: "INFORMANT", label: "INFORMANT INFO", icon: User },
    { id: "SUBJECT", label: "MARRIAGE DETAILS", icon: Heart },
    { id: "SCHEDULE", label: "CHOOSE SCHEDULE", icon: Calendar },
    { id: "REVIEW", label: "DOCUMENTS & SUBMIT", icon: CheckCircle2 },
];

export default function AppointmentMarriageCertifiedTrueCopyPage() {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState<Step>("INFORMANT");


    const validateStep = (step: Step): boolean => {
        if (step === "INFORMANT") {
            const isSpecifyEmpty = (formData.relationship === "OTHER" || formData.relationship === "RELATIVE") && !formData.relationshipOther?.trim();
            if (!formData.relationship || !formData.contactNumber || isSpecifyEmpty) {
                setShowErrors(true);
                toast.error("Please fill in all required informant details.");

                setTimeout(() => {
                    let firstErrorId = "";
                    if (!formData.relationship) firstErrorId = "relationship";
                    else if (!formData.contactNumber) firstErrorId = "contactNumber";

                    if (firstErrorId) {
                        let element = document.getElementById(firstErrorId);
                        if (!element && firstErrorId === "relationship") {
                            element = document.querySelector('[role="combobox"]') as HTMLElement;
                        }
                        if (element) {
                            element.scrollIntoView({ behavior: "smooth", block: "center" });
                            element.focus();
                        }
                    }
                }, 100);

                return false;
            }
        }
        if (step === "SUBJECT") {
            const missingFields: string[] = [];
            if (!formData.husbandFullName) missingFields.push("husbandFullName");
            if (!formData.wifeFullName) missingFields.push("wifeFullName");
            if (!formData.dateOfMarriage) missingFields.push("dateOfMarriage");
            if (!formData.placeOfMarriage) missingFields.push("placeOfMarriage");

            if (missingFields.length > 0) {
                setShowErrors(true);
                toast.error("Please fill in all required marriage details.");

                setTimeout(() => {
                    const firstErrorId = missingFields[0];
                    const element = document.getElementById(firstErrorId);
                    if (element) {
                        element.scrollIntoView({ behavior: "smooth", block: "center" });
                        element.focus();
                    }
                }, 100);

                return false;
            }


        }
        setShowErrors(false);
        return true;
    };
    const [mounted, setMounted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [themeColor, setThemeColor] = useState("var(--primary-theme)");
    const [appointmentConfig, setAppointmentConfig] = useState<any>(null);
    const [bookedSlots, setBookedSlots] = useState<any[]>([]);

    useEffect(() => {
        getSystemSettingAction("theme_color").then((res) => {
            if (res.success && res.data) {
                setThemeColor(res.data);
            }
        });
    }, []);

    useEffect(() => {
        setMounted(true);
    }, []);
    const [submitting, setSubmitting] = useState(false);
    const [resident, setResident] = useState<any>(null);
    const [typeId, setTypeId] = useState<string>("");
    const [dbType, setDbType] = useState<any>(null);
    const [revisionId, setRevisionId] = useState<string | null>(null);
    const [revisionTx, setRevisionTx] = useState<any>(null);
    const [showErrors, setShowErrors] = useState(false);



    // Form State
    const [formData, setFormData] = useState({
        relationship: "",
        relationshipOther: "",
        email: "",
        contactNumber: "",
        informantFirstName: "",
        informantMiddleName: "",
        informantLastName: "",
        informantSuffix: "",
        informantBirthDate: "",
        informantAge: "",
        informantCivilStatus: "",
        informantCitizenship: "",
        informantOccupation: "",
        informantAddress: "",
        // Subject (Marriage) fields
        husbandFullName: "",
        wifeFullName: "",
        dateOfMarriage: "",
        placeOfMarriage: "",
        appointmentDate: "",
        appointmentSlot: "",
    });



    // Privacy / Terms modal state
    const [policyOpen, setPolicyOpen] = useState(false);
    const [policyAccepted, setPolicyAccepted] = useState(false);

    const parsedDefaultFees = dbType?.defaultFees 
        ? (typeof dbType.defaultFees === "string" ? JSON.parse(dbType.defaultFees) : dbType.defaultFees) 
        : [];
    const baseFeeObj = parsedDefaultFees.find((f: any) => f.code === "BASE_FEE_LABEL");
    const baseFeeLabel = baseFeeObj?.label || "Misc Fee";
    const additionalFees = parsedDefaultFees.filter((f: any) => f.code !== "BASE_FEE_LABEL");
    const miscFeeAmount = dbType?.baseFee ?? 130.00;
    const defaultFeesTotal = additionalFees.reduce((sum: number, fee: any) => sum + (Number(fee.amount) || 0), 0);
    const apptTotalAmount = miscFeeAmount + defaultFeesTotal;

    const handleAcceptPolicy = () => {
        setPolicyOpen(false);
        setPolicyAccepted(true);
        setShowErrors(false);
    };

    // Restore progress from session storage & IndexedDB
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get("revisionId")) return;

        const savedStep = sessionStorage.getItem("appointment-marriage-certified-true-copy-step");
        const savedForm = sessionStorage.getItem("appointment-marriage-certified-true-copy-form");

        if (savedStep) setCurrentStep(savedStep as Step);
        if (savedForm) {
            try {
                const parsed = JSON.parse(savedForm);
                setFormData(prev => ({ ...prev, ...parsed }));
            } catch (e) {
                console.error("Failed to parse saved form", e);
            }
        }
    }, []);

    useEffect(() => {
        if (!loading && !revisionId) {
            sessionStorage.setItem("appointment-marriage-certified-true-copy-step", currentStep);
            sessionStorage.setItem("appointment-marriage-certified-true-copy-form", JSON.stringify(formData));
        }
    }, [currentStep, formData, loading, revisionId]);

    useEffect(() => {
        async function init() {
            try {
                const urlParams = new URLSearchParams(window.location.search);
                const revId = urlParams.get("revisionId");

                let txData: any = null;
                if (revId) {
                    const txRes = await getTransactionById(revId);
                    if (txRes.success && txRes.data) {
                        txData = txRes.data;
                        setRevisionId(revId);
                        setRevisionTx(txData);
                    } else {
                        toast.error("Failed to fetch revision details");
                    }
                }

                const [resResult, typesResult, configResult] = await Promise.all([
                    getCurrentUserResident(),
                    getTransactionTypes(),
                    getRegistrarAppointmentConfig()
                ]);

                if (configResult.success) {
                    setAppointmentConfig(configResult.config);
                    setBookedSlots(configResult.bookedSlots);
                }

                if (resResult.success && resResult.data) {
                    const r = resResult.data;
                    setResident(r);

                    const parts = [
                        r.houseNumber && `#${r.houseNumber}`,
                        r.street && `${r.street} St.`,
                        r.purok && `Purok ${r.purok}`,
                        r.sitio && `Sitio ${r.sitio}`,
                        r.barangay && `Brgy. ${r.barangay}`,
                        r.municipality || "",
                        r.province || "{{PROVINCE_NAME}}"
                    ].filter(Boolean);
                    const constructedAddr = parts.join(", ").toUpperCase();

                    if (txData) {
                        const addData = txData.additionalData as any || {};
                        const resSnapshot = txData.residentSnapshot as any || r || {};

                        setFormData(prev => ({
                            ...prev,
                            relationship: addData.relationship && addData.relationship.startsWith("OTHER:") ? "OTHER" : (addData.relationship || prev.relationship),
                            relationshipOther: addData.relationship && addData.relationship.startsWith("OTHER:") ? addData.relationship.replace(/^OTHER:\s*/i, "") : "",
                            email: addData.email || resSnapshot.email || prev.email,
                            contactNumber: addData.contactNumber || resSnapshot.contactNumber || prev.contactNumber,
                            informantFirstName: addData.informantFirstName || resSnapshot.firstName || prev.informantFirstName,
                            informantMiddleName: addData.informantMiddleName || resSnapshot.middleName || prev.informantMiddleName,
                            informantLastName: addData.informantLastName || resSnapshot.lastName || prev.informantLastName,
                            informantSuffix: addData.informantSuffix || resSnapshot.suffix || prev.informantSuffix,
                            informantBirthDate: addData.informantBirthDate || prev.informantBirthDate,
                            informantAge: addData.informantAge || prev.informantAge,
                            informantCivilStatus: addData.informantCivilStatus || prev.informantCivilStatus,
                            informantCitizenship: addData.informantCitizenship || prev.informantCitizenship,
                            informantOccupation: addData.informantOccupation || prev.informantOccupation,
                            informantAddress: addData.informantAddress || prev.informantAddress,
                            husbandFullName: addData.husbandFullName || "",
                            wifeFullName: addData.wifeFullName || "",
                            dateOfMarriage: addData.dateOfMarriage || "",
                            placeOfMarriage: addData.placeOfMarriage || "",
                            appointmentDate: addData.appointmentDate || (txData.appointmentDate ? new Date(txData.appointmentDate).toISOString().split('T')[0] : "") || "",
                            appointmentSlot: addData.appointmentSlot || txData.appointmentSlot || "",
                        }));
                    } else {
                        setFormData(prev => ({
                            ...prev,
                            email: prev.email || r.user?.email || "",
                            contactNumber: prev.contactNumber || r.contactNumber || "",
                            informantFirstName: r.firstName || "",
                            informantMiddleName: r.middleName || "",
                            informantLastName: r.lastName || "",
                            informantSuffix: r.suffix || "",
                            informantBirthDate: r.dateOfBirth ? new Date(r.dateOfBirth).toISOString().split('T')[0] : "",
                            informantAge: r.age?.toString() || "",
                            informantCivilStatus: r.civilStatus || "",
                            informantCitizenship: r.citizenship || "FILIPINO",
                            informantOccupation: r.occupation || "",
                            informantAddress: constructedAddr
                        }));
                    }
                }

                let typesData = typesResult.success ? typesResult.data : null;
                const expectedCode = "LCR_MARRIAGE_CERTIFIED_TRUE_COPY_APPOINTMENT";
                const hasType = typesData?.some((t: any) => t.code === expectedCode);

                if (!hasType) {
                    await ensureCivilRegistryTransactionTypes();
                    const refetchedTypes = await getTransactionTypes();
                    if (refetchedTypes.success) {
                        typesData = refetchedTypes.data;
                    }
                }

                if (typesData) {
                    const psaType = typesData.find((t: any) => t.code === expectedCode);
                    if (psaType) {
                        setTypeId(psaType.id);
                        setDbType(psaType);
                    }
                }
            } catch (error) {
                console.error("Initialization error:", error);
            } finally {
                setLoading(false);
            }
        }
        init();
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value.toUpperCase() }));
    };

    const handleSelectChange = (name: string, value: string) => {
        setFormData(prev => {
            const next = { ...prev, [name]: value };

            if (name === "relationship") {
                if (value === "SELF") {
                    if (resident) {
                        const residentName = [resident.firstName, resident.middleName, resident.lastName]
                            .filter(Boolean)
                            .join(" ") + (resident.suffix ? " " + resident.suffix : "");
                        const isMale = resident.gender?.toUpperCase() === "MALE";

                        if (isMale) {
                            next.husbandFullName = residentName.toUpperCase();
                            next.wifeFullName = "";
                        } else {
                            next.wifeFullName = residentName.toUpperCase();
                            next.husbandFullName = "";
                        }
                    }
                } else {
                    next.husbandFullName = "";
                    next.wifeFullName = "";
                    next.dateOfMarriage = "";
                    next.placeOfMarriage = "";
                    next.relationshipOther = "";
                }
            }
            return next;
        });
    };



    const handleSubmit = async () => {
        if (submitting) return;
        if (!policyAccepted) {
            setShowErrors(true);
            toast.error("Please review and accept the Privacy Policy & Terms before submitting.");
            return;
        }
        if (!typeId) {
            toast.error("Service type not initialized. Please try again later.");
            return;
        }

        setSubmitting(true);
        try {
            const data = new FormData();
            data.append("typeId", typeId);
            data.append("registryType", "MARRIAGE_CERTIFIED_TRUE_COPY_APPOINTMENT");
            if (revisionId) {
                data.append("revisionId", revisionId);
            }

            const residentSnapshot = {
                firstName: resident?.firstName || "",
                middleName: resident?.middleName || "",
                lastName: resident?.lastName || "",
                suffix: resident?.suffix || "",
                contactNumber: resident?.contactNumber || "",
                email: resident?.user?.email || "",
                residentId: resident?.residentId || "",
                address: resident ? `Brgy. ${resident.barangay}, ${resident?.municipality || ""}` : ""
            };
            data.append("residentSnapshot", JSON.stringify(residentSnapshot));

            const finalRelationship = (formData.relationship === "OTHER" || formData.relationship === "RELATIVE")
                ? `OTHER: ${formData.relationshipOther.toUpperCase()}`
                : formData.relationship;

            const additionalData = {
                ...formData,
                relationship: finalRelationship,
                psaEndorsementFee: miscFeeAmount,
            };
            data.append("additionalData", JSON.stringify(additionalData));

            const res = await submitCivilRegistryTransaction(data);

            if (res.success && res.data) {
                toast.success(revisionId ? "Revision resubmitted successfully!" : "Marriage Certified True Copy Appointment submitted successfully!");
                sessionStorage.removeItem("appointment-marriage-certified-true-copy-step");
                sessionStorage.removeItem("appointment-marriage-certified-true-copy-form");
                router.push(`/user/appointment/${res.data.id}`);
            } else {
                toast.error(res.error || "Failed to submit appointment request");
            }
        } catch (error) {
            console.error("Submission error:", error);
            toast.error("An unexpected error occurred");
        } finally {
            setSubmitting(false);
        }
    };

    const nextStep = () => {
        if (currentStep === "INFORMANT") {
            if (!validateStep("INFORMANT")) return;
            setCurrentStep("SUBJECT");
        } else if (currentStep === "SUBJECT") {
            if (!validateStep("SUBJECT")) return;
            setCurrentStep("SCHEDULE");
        } else if (currentStep === "SCHEDULE") {
            if (!formData.appointmentDate || !formData.appointmentSlot) {
                setShowErrors(true);
                toast.error("Please select an appointment date and session.");
                return;
            }
            setShowErrors(false);
            setCurrentStep("REVIEW");
        }
    };

    const prevStep = () => {
        if (currentStep === "SUBJECT") setCurrentStep("INFORMANT");
        else if (currentStep === "SCHEDULE") setCurrentStep("SUBJECT");
        else if (currentStep === "REVIEW") setCurrentStep("SCHEDULE");
    };

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950">
                <Loader2 className="w-10 h-10 animate-spin mb-4" style={{ color: "var(--primary-theme)" }} />
                <p className="font-black uppercase tracking-widest text-[10px] text-slate-400 italic">Initializing Appointment Form...</p>
            </div>
        );
    }

    return (
        <>
            <style dangerouslySetInnerHTML={{
                __html: `
                ${themeColor !== "var(--primary-theme)" ? `
                :root, * {
                    --primary-theme: ${themeColor} !important;
                }
                ` : ""}
                .text-rose-500, [class*="text-rose-500"]:not(input):not(select):not(textarea) {
                    color: ${themeColor} !important;
                }
                .text-rose-600, [class*="text-rose-600"]:not(input):not(select):not(textarea) {
                    color: ${themeColor} !important;
                }
                .bg-rose-500, [class*="bg-rose-500"] {
                    background-color: ${themeColor} !important;
                }
                .bg-rose-600, [class*="bg-rose-600"] {
                    background-color: ${themeColor} !important;
                }
                .border-rose-500, [class*="border-rose-500"] {
                    border-color: ${themeColor} !important;
                }
                .border-rose-600, [class*="border-rose-600"] {
                    border-color: ${themeColor} !important;
                }
                .bg-rose-500\\/10, [class*="bg-rose-500/10"] {
                    background-color: ${themeColor === "var(--primary-theme)" ? "color-mix(in srgb, var(--primary-theme) 10%, transparent)" : `${themeColor}1a`} !important;
                }
                .bg-rose-500\\/5, [class*="bg-rose-500/5"] {
                    background-color: ${themeColor === "var(--primary-theme)" ? "color-mix(in srgb, var(--primary-theme) 5%, transparent)" : `${themeColor}0d`} !important;
                }
                .shadow-rose-500\\/20, [class*="shadow-rose-500/20"] {
                    --tw-shadow-color: ${themeColor === "var(--primary-theme)" ? "color-mix(in srgb, var(--primary-theme) 20%, transparent)" : `${themeColor}33`} !important;
                }
                .hover\\:bg-rose-600:hover, [class*="hover:bg-rose-600"]:hover {
                    background-color: ${themeColor} !important;
                    filter: brightness(0.9);
                }
                .hover\\:bg-rose-700:hover, [class*="hover:bg-rose-700"]:hover {
                    background-color: ${themeColor} !important;
                    filter: brightness(0.85);
                }
                .hover\\:border-rose-500\\/50:hover, [class*="hover:border-rose-500/50"]:hover {
                    border-color: ${themeColor === "var(--primary-theme)" ? "color-mix(in srgb, var(--primary-theme) 50%, transparent)" : `${themeColor}80`} !important;
                }
                input:not([type="button"]):not([type="submit"]), select, textarea {
                    color: #0f172a !important;
                }
                input:not([type="button"]):not([type="submit"]):disabled, select:disabled, textarea:disabled,
                input:not([type="button"]):not([type="submit"])[readonly], select[readonly], textarea[readonly] {
                    color: #1e293b !important;
                    -webkit-text-fill-color: #1e293b !important;
                    opacity: 0.9 !important;
                }
                .dark input:not([type="button"]):not([type="submit"]), .dark select, .dark textarea {
                    color: #f8fafc !important;
                }
                .dark input:not([type="button"]):not([type="submit"]):disabled, .dark select:disabled, .dark textarea:disabled,
                .dark input:not([type="button"]):not([type="submit"])[readonly], .dark select[readonly], .dark textarea[readonly] {
                    color: #cbd5e1 !important;
                    -webkit-text-fill-color: #cbd5e1 !important;
                    opacity: 0.8 !important;
                }
                `
            }} />
            <SecureIdleTimer />
            <PrivacyTermsModal
                isOpen={policyOpen}
                onClose={() => setPolicyOpen(false)}
                onAccept={handleAcceptPolicy}
                onDecline={() => { setPolicyAccepted(false); }}
                themeColor="var(--primary-theme)"
            />

            <div className="container max-w-5xl mx-auto px-4 pt-3 pb-0 space-y-5">
                <div className="sticky top-[64px] sm:top-[80px] z-40 md:static -mx-4 md:mx-0 px-4 md:px-0 pt-2 md:pt-0">
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
                                    <Link href="/user/services/civil-registry" className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-primary transition-colors italic">
                                        Civil Registry
                                    </Link>
                                </BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator className="text-slate-300 dark:text-white/10" />
                            <BreadcrumbItem>
                                <BreadcrumbPage className="text-[10px] font-black uppercase tracking-widest italic" style={{ color: themeColor }}>Marriage Certified True Copy Appointment</BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                </div>

                <div className="space-y-6">
                    {/* Premium Header/Banner with Ambient Gradient Backdrop */}
                    <div className="relative overflow-hidden bg-white dark:bg-[#0c1017] p-6 md:p-10 rounded-2xl md:rounded-[2rem] border border-slate-100 dark:border-white/5 text-slate-800 dark:text-white shadow-xl dark:shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
                        <div
                            className="absolute top-0 right-0 w-96 h-96 blur-[120px] rounded-full opacity-10 dark:opacity-20 pointer-events-none -mr-40 -mt-40 transition-colors duration-700"
                            style={{ backgroundColor: themeColor }}
                        />

                        <div className="space-y-3 md:space-y-4 max-w-2xl relative z-10">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-white/10 flex items-center justify-center backdrop-blur-md">
                                    <Heart className="w-4 h-4 text-rose-500" style={{ color: themeColor }} />
                                </div>
                                <span className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500 dark:text-white/70 italic">Local Civil Registry</span>
                            </div>

                            <h1 className="text-2xl md:text-4xl font-black uppercase italic tracking-tighter leading-none">
                                Marriage Certified True Copy <span style={{ color: themeColor }}>Appointment</span>
                            </h1>

                            <p className="text-slate-600 dark:text-slate-300 font-medium text-xs leading-relaxed max-w-xl italic">
                                Schedule an appointment and request a certified true copy of an existing marriage certificate.
                            </p>
                        </div>

                        <div className="hidden md:block relative z-10 shrink-0">
                            <div className="w-28 h-28 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/10 backdrop-blur-md flex flex-col items-center justify-center text-center p-4 shadow-sm dark:shadow-2xl relative overflow-hidden group hover:scale-105 transition-transform duration-500">
                                <div className="absolute inset-0 bg-gradient-to-tr opacity-0 group-hover:opacity-10 transition-opacity" style={{ backgroundImage: `linear-gradient(to top right, ${themeColor}, transparent)` }} />
                                <CheckCircle2 className="w-8 h-8 mb-1.5 opacity-80" style={{ color: themeColor }} />
                                <p className="text-[7px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 leading-tight">Secure Filing</p>
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
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => {
                                        if (step.id === "STATUS") {
                                            router.push("/user/services/civil-registry");
                                            return;
                                        }
                                        const targetIdx = STEPS.findIndex(s => s.id === step.id);
                                        const currentIdx = STEPS.findIndex(s => s.id === currentStep);

                                        if (targetIdx <= currentIdx) {
                                            setCurrentStep(step.id);
                                        } else {
                                            for (let i = currentIdx; i < targetIdx; i++) {
                                                if (STEPS[i].id !== "STATUS" && !validateStep(STEPS[i].id)) return;
                                            }
                                            setCurrentStep(step.id);
                                        }
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            if (step.id === "STATUS") {
                                                router.push("/user/services/civil-registry");
                                                return;
                                            }
                                            const targetIdx = STEPS.findIndex(s => s.id === step.id);
                                            const currentIdx = STEPS.findIndex(s => s.id === currentStep);
                                            if (targetIdx <= currentIdx) {
                                                setCurrentStep(step.id);
                                            } else {
                                                for (let i = currentIdx; i < targetIdx; i++) {
                                                    if (STEPS[i].id !== "STATUS" && !validateStep(STEPS[i].id)) return;
                                                }
                                                setCurrentStep(step.id);
                                            }
                                        }
                                    }}
                                    className={cn(
                                        "flex flex-col items-center gap-2 md:gap-3 relative z-10 font-black group cursor-pointer",
                                        isActive ? "opacity-100" : "opacity-40 hover:opacity-100"
                                    )}
                                >
                                    <div className={cn(
                                        "w-11 h-11 md:w-16 md:h-16 rounded-xl md:rounded-2xl flex items-center justify-center transition-all duration-500 border-2",
                                        isActive ? "text-white border-primary shadow-[0_0_20px_rgba(var(--primary),0.3)] scale-105 md:scale-110" :
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

                    {mounted && typeof document !== "undefined" && createPortal(
                        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-[#06080a] border-t border-slate-200 dark:border-white/10 z-50 pt-2.5 pb-2.5 px-4 flex flex-col items-center">
                            <div className="w-full max-w-5xl flex items-center justify-center gap-4">
                                <div className="h-1.5 flex-1 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                                    <motion.div
                                        className="h-full bg-rose-600"
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

                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentStep}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-6"
                        >
                            {revisionTx && (
                                <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 text-red-800 dark:text-red-400 animate-in fade-in duration-300">
                                    <AlertCircle className="w-5 h-5 shrink-0 animate-pulse mt-0.5" />
                                    <div className="text-left space-y-1">
                                        <p className="text-[10px] font-black uppercase tracking-wider italic">Attention: Revision Needed</p>
                                        <p className="text-xs font-bold text-slate-900 dark:text-slate-300 leading-relaxed italic">
                                            &ldquo;{revisionTx.rejectionRemarks || "Please check the highlighted checklist files or values and submit them again."}&rdquo;
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* ===== STEP 1: INFORMANT INFO ===== */}
                            {currentStep === "INFORMANT" && (
                                <div className="space-y-8">
                                    <Card className="p-8 rounded-[2rem] border border-slate-200/50 dark:border-white/5 bg-white dark:bg-[#0f1117] shadow-xl dark:shadow-2xl space-y-6">
                                        <h3 className="text-xl font-black uppercase italic tracking-tight flex items-center gap-2" style={{ color: themeColor }}>
                                            INFORMANT INFORMATION
                                        </h3>
                                        <p className="text-xs text-slate-400 font-bold italic">Details of the person registering the marriage</p>

                                        <div className="space-y-6">
                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                                <div className="space-y-1.5 col-span-1 md:col-span-2">
                                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1">Relationship to Spouse <span className="text-red-500">*</span></Label>
                                                    {(formData.relationship === "OTHER" || formData.relationship === "RELATIVE") ? (
                                                        <div className="relative flex items-center">
                                                            <Input
                                                                value={formData.relationshipOther || ""}
                                                                onChange={(e) => setFormData(p => ({ ...p, relationshipOther: e.target.value }))}
                                                                className={cn("h-12 rounded-xl text-xs md:text-sm font-bold uppercase pr-10 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10", (showErrors && !formData.relationshipOther) && "!border-2 !border-red-500")}
                                                                placeholder="Specify relationship (e.g. Aunt, Cousin)"
                                                                autoFocus
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => setFormData(p => ({ ...p, relationship: "", relationshipOther: "" }))}
                                                                className="absolute right-3 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                                                                title="Back to options"
                                                            >
                                                                <X className="w-4.5 h-4.5" />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <Select
                                                            value={formData.relationship}
                                                            onValueChange={(v) => handleSelectChange("relationship", v)}
                                                        >
                                                            <SelectTrigger className={cn("!h-12 w-full rounded-xl border-slate-950 dark:border-white focus:ring-emerald-500 shadow-sm text-xs md:text-sm bg-white dark:bg-slate-900 transition-all font-bold italic", (showErrors && !formData.relationship) ? "border-2 border-red-500 focus:ring-red-500" : "")}>
                                                                <SelectValue placeholder="SELECT RELATIONSHIP" />
                                                            </SelectTrigger>
                                                            <SelectContent className="rounded-xl border-slate-200/60 dark:border-white/10 italic">
                                                                <SelectItem value="SELF">SELF (HUSBAND / WIFE)</SelectItem>
                                                                <SelectItem value="CHILD">CHILD</SelectItem>
                                                                <SelectItem value="PARENT">PARENT</SelectItem>
                                                                <SelectItem value="SIBLING">SIBLING</SelectItem>
                                                                <SelectItem value="OTHER">OTHER</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    )}
                                                    {(showErrors && !formData.relationship) && (
                                                        <p className="text-[9px] font-black text-red-500 uppercase italic tracking-widest ml-1 animate-pulse">Required</p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Personal Details Grid */}
                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                                <div className="space-y-1.5">
                                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1">First Name</Label>
                                                    <Input disabled value={formData.informantFirstName} className="rounded-xl border-slate-950 dark:border-white bg-slate-50 dark:bg-slate-900/50 h-12 font-bold italic text-slate-600 cursor-not-allowed opacity-75" />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1">Middle Name</Label>
                                                    <Input disabled value={formData.informantMiddleName} className="rounded-xl border-slate-950 dark:border-white bg-slate-50 dark:bg-slate-900/50 h-12 font-bold italic text-slate-600 cursor-not-allowed opacity-75" />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1">Last Name</Label>
                                                    <Input disabled value={formData.informantLastName} className="rounded-xl border-slate-950 dark:border-white bg-slate-50 dark:bg-slate-900/50 h-12 font-bold italic text-slate-600 cursor-not-allowed opacity-75" />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1">Suffix</Label>
                                                    <Input disabled value={formData.informantSuffix} className="rounded-xl border-slate-950 dark:border-white bg-slate-50 dark:bg-slate-900/50 h-12 font-bold italic text-slate-600 cursor-not-allowed opacity-75" />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                                <div className="space-y-1.5">
                                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1">Birth Date</Label>
                                                    <Input disabled value={formData.informantBirthDate} type="date" className="rounded-xl border-slate-950 dark:border-white bg-slate-50 dark:bg-slate-900/50 h-12 font-bold italic text-slate-600 cursor-not-allowed opacity-75" />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1">Age</Label>
                                                    <Input disabled value={formData.informantAge} className="rounded-xl border-slate-950 dark:border-white bg-slate-50 dark:bg-slate-900/50 h-12 font-bold italic text-slate-600 cursor-not-allowed opacity-75" />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1">Civil Status</Label>
                                                    <Input disabled value={formData.informantCivilStatus} className="rounded-xl border-slate-950 dark:border-white bg-slate-50 dark:bg-slate-900/50 h-12 font-bold italic text-slate-600 cursor-not-allowed opacity-75" />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1">Citizenship</Label>
                                                    <Input disabled value={formData.informantCitizenship} className="rounded-xl border-slate-950 dark:border-white bg-slate-50 dark:bg-slate-900/50 h-12 font-bold italic text-slate-600 cursor-not-allowed opacity-75" />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-1.5">
                                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1">Occupation</Label>
                                                    <Input disabled className="rounded-xl border-slate-950 dark:border-white bg-slate-50 dark:bg-slate-900/50 h-12 font-bold italic text-slate-600 cursor-not-allowed opacity-75" value={formData.informantOccupation} />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1">Contact Number <span className="text-red-500">*</span></Label>
                                                    <Input
                                                        className={cn("rounded-xl border-slate-950 dark:border-white bg-slate-50 dark:bg-slate-900/50 h-12 font-bold italic transition-all", (showErrors && !formData.contactNumber) ? "border-2 border-red-500 focus-visible:ring-red-500" : "")}
                                                        placeholder="e.g. 0917XXXXXXX"
                                                        value={formData.contactNumber}
                                                        onChange={(e) => {
                                                            let val = e.target.value;
                                                            val = val.replace(/[^0-9+]/g, '');
                                                            if (val.includes('+')) {
                                                                val = '+' + val.replace(/\+/g, '');
                                                            }
                                                            setFormData(prev => ({ ...prev, contactNumber: val }));
                                                        }}
                                                    />
                                                    {(showErrors && !formData.contactNumber) && (
                                                        <p className="text-[9px] font-black text-red-500 uppercase italic tracking-widest ml-1 animate-pulse">Required</p>
                                                    )}
                                                    <p className="text-[9px] font-black uppercase italic tracking-widest text-amber-500 mt-2">
                                                        * NOTE: PLEASE USE YOUR ACTIVE CONTACT NUMBER. THIS WILL BE USED TO CONTACT YOU REGARDING YOUR TRANSACTION.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-4 rounded-2xl mt-6 border" style={{ backgroundColor: themeColor === "var(--primary-theme)" ? "color-mix(in srgb, var(--primary-theme) 5%, transparent)" : `${themeColor}0d`, borderColor: themeColor === "var(--primary-theme)" ? "color-mix(in srgb, var(--primary-theme) 10%, transparent)" : `${themeColor}1a` }}>
                                            <p className="text-[10px] font-black uppercase italic tracking-wider flex items-center gap-2" style={{ color: themeColor }}>
                                                <Sparkles className="w-4 h-4" /> NOTE: CHANGES WILL UPDATE YOUR RESIDENT PROFILE UPON SUBMISSION.
                                            </p>
                                        </div>
                                    </Card>

                                    <BackNextButton
                                        onBack={() => router.push("/user/services/civil-registry")}
                                        onNext={nextStep}
                                        themeColor={themeColor}
                                    />
                                </div>
                            )}

                            {/* ===== STEP 2: SPOUSE INFO ===== */}
                            {currentStep === "SUBJECT" && (
                                <div className="space-y-8">
                                    <Card className="p-8 rounded-[2rem] border border-slate-200/50 dark:border-white/5 bg-white dark:bg-[#0f1117] shadow-xl dark:shadow-2xl space-y-8">
                                        <div className="space-y-6">
                                            <h3 className="text-xl font-black uppercase italic tracking-tight flex items-center gap-2" style={{ color: themeColor }}>
                                                Marriage Details
                                            </h3>
                                            <p className="text-xs text-slate-400 font-bold italic">Provide the details of the marriage record that needs certified true copy request</p>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-1.5">
                                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1">Husband&apos;s Full Name <span className="text-red-500">*</span></Label>
                                                    <Input
                                                        id="husbandFullName"
                                                        name="husbandFullName"
                                                        placeholder="ENTER HUSBAND'S FULL NAME"
                                                        value={formData.husbandFullName}
                                                        onChange={handleInputChange}
                                                        className={cn("rounded-xl border-slate-950 dark:border-white bg-slate-50 dark:bg-slate-900/50 h-12 font-bold italic transition-all uppercase", (showErrors && !formData.husbandFullName) ? "border-2 border-red-500 focus-visible:ring-red-500" : "")}
                                                    />
                                                    {(showErrors && !formData.husbandFullName) && (
                                                        <p className="text-[9px] font-black text-red-500 uppercase italic tracking-widest ml-1 animate-pulse">Required</p>
                                                    )}
                                                </div>

                                                <div className="space-y-1.5">
                                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1">Wife&apos;s Full Name (Maiden Name) <span className="text-red-500">*</span></Label>
                                                    <Input
                                                        id="wifeFullName"
                                                        name="wifeFullName"
                                                        placeholder="ENTER WIFE'S MAIDEN NAME"
                                                        value={formData.wifeFullName}
                                                        onChange={handleInputChange}
                                                        className={cn("rounded-xl border-slate-950 dark:border-white bg-slate-50 dark:bg-slate-900/50 h-12 font-bold italic transition-all uppercase", (showErrors && !formData.wifeFullName) ? "border-2 border-red-500 focus-visible:ring-red-500" : "")}
                                                    />
                                                    {(showErrors && !formData.wifeFullName) && (
                                                        <p className="text-[9px] font-black text-red-500 uppercase italic tracking-widest ml-1 animate-pulse">Required</p>
                                                    )}
                                                </div>

                                                <div className="space-y-1.5">
                                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1">Date of Marriage <span className="text-red-500">*</span></Label>
                                                    <Input
                                                        id="dateOfMarriage"
                                                        type="date"
                                                        name="dateOfMarriage"
                                                        value={formData.dateOfMarriage}
                                                        onChange={handleInputChange}
                                                        className={cn("rounded-xl border-slate-950 dark:border-white bg-slate-50 dark:bg-slate-900/50 h-12 font-bold italic transition-all", (showErrors && !formData.dateOfMarriage) ? "border-2 border-red-500 focus-visible:ring-red-500" : "")}
                                                    />
                                                    {(showErrors && !formData.dateOfMarriage) && (
                                                        <p className="text-[9px] font-black text-red-500 uppercase italic tracking-widest ml-1 animate-pulse">Required</p>
                                                    )}
                                                </div>

                                                <div className="space-y-1.5">
                                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1">Place of Marriage <span className="text-red-500">*</span></Label>
                                                    <Input
                                                        id="placeOfMarriage"
                                                        name="placeOfMarriage"
                                                        placeholder="ENTER PLACE OF MARRIAGE"
                                                        value={formData.placeOfMarriage}
                                                        onChange={handleInputChange}
                                                        className={cn("rounded-xl border-slate-950 dark:border-white bg-slate-50 dark:bg-slate-900/50 h-12 font-bold italic transition-all uppercase", (showErrors && !formData.placeOfMarriage) ? "border-2 border-red-500 focus-visible:ring-red-500" : "")}
                                                    />
                                                    {(showErrors && !formData.placeOfMarriage) && (
                                                        <p className="text-[9px] font-black text-red-500 uppercase italic tracking-widest ml-1 animate-pulse">Required</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>


                                    </Card>

                                    <div className="flex justify-end gap-4 pt-4">
                                        <Button variant="outline" onClick={prevStep} className="h-14 px-8 rounded-full font-black uppercase italic tracking-widest">
                                            BACK
                                        </Button>
                                        <Button
                                            onClick={nextStep}
                                            className="h-14 px-10 rounded-full text-white font-black uppercase italic tracking-widest shadow-lg hover:opacity-90 transition-opacity"
                                            style={{ backgroundColor: themeColor }}
                                        >
                                            NEXT
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* ===== STEP 3: CHOOSE SCHEDULE ===== */}
                            {currentStep === "SCHEDULE" && (
                                <div className="space-y-8">
                                    <Card className="p-8 rounded-[2rem] border border-slate-200/50 dark:border-white/5 bg-white dark:bg-[#0f1117] shadow-xl dark:shadow-2xl space-y-8">
                                        <div className="flex items-center gap-4 mb-4">
                                            <div>
                                                <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight">Choose Schedule</h2>
                                                <p className="text-xs text-slate-500 font-medium italic">Select an appointment date and session</p>
                                            </div>
                                        </div>

                                        {appointmentConfig && (
                                            <SchedulePicker
                                                selectedDate={formData.appointmentDate}
                                                setSelectedDate={(dateStr) => setFormData(prev => ({ ...prev, appointmentDate: dateStr }))}
                                                selectedSlot={formData.appointmentSlot}
                                                setSelectedSlot={(slotStr) => setFormData(prev => ({ ...prev, appointmentSlot: slotStr }))}
                                                bookedSlots={bookedSlots}
                                                config={appointmentConfig}
                                                themeColor={themeColor}
                                            />
                                        )}
                                    </Card>

                                    <div className="flex justify-end gap-4 pt-4">
                                        <Button variant="outline" onClick={prevStep} className="h-14 px-8 rounded-full font-black uppercase italic tracking-widest">
                                            BACK
                                        </Button>
                                        <Button
                                            onClick={nextStep}
                                            className="h-14 px-10 rounded-full text-white font-black uppercase italic tracking-widest shadow-lg hover:opacity-90 transition-opacity"
                                            style={{ backgroundColor: themeColor }}
                                        >
                                            NEXT
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* ===== STEP 4: REVIEW & SUBMIT ===== */}
                            {currentStep === "REVIEW" && (
                                <div className="space-y-8">
                                    <Card className="p-8 rounded-[2rem] border border-slate-200/50 dark:border-white/5 bg-white dark:bg-[#0f1117] shadow-xl dark:shadow-2xl space-y-8">
                                        <div className="bg-rose-500/5 p-6 rounded-3xl border border-rose-500/10 flex items-start gap-4">
                                            <AlertCircle className="w-6 h-6 text-rose-500 mt-1" />
                                            <div className="space-y-1">
                                                <h4 className="text-sm font-black uppercase italic text-rose-600">Final Verification</h4>
                                                <p className="text-xs text-rose-500/80 font-bold italic leading-relaxed">
                                                    Please ensure all information provided is accurate and matches your official documents.
                                                    False information may lead to rejection of your application.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                            <div className="space-y-6">
                                                <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 border-b pb-2">Informant Details</h5>
                                                <div className="space-y-4">
                                                    <div className="flex justify-between items-center text-xs">
                                                        <span className="font-bold text-slate-400 italic">Informant:</span>
                                                        <span className="font-black uppercase italic">{resident?.firstName} {resident?.lastName}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-xs">
                                                        <span className="font-bold text-slate-400 italic">Relationship:</span>
                                                        <span className="font-black uppercase italic">{formData.relationship}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-xs">
                                                        <span className="font-bold text-slate-400 italic">Contact:</span>
                                                        <span className="font-black uppercase italic">{formData.contactNumber}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-xs">
                                                        <span className="font-bold text-slate-400 italic">Address:</span>
                                                        <span className="font-black uppercase italic text-right max-w-[200px]">{formData.informantAddress || "N/A"}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-6">
                                                <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 border-b pb-2">Marriage Record</h5>
                                                <div className="space-y-4">
                                                    <div className="flex justify-between items-center text-xs">
                                                        <span className="font-bold text-slate-400 italic">Husband:</span>
                                                        <span className="font-black uppercase italic">{formData.husbandFullName}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-xs">
                                                        <span className="font-bold text-slate-400 italic">Wife:</span>
                                                        <span className="font-black uppercase italic">{formData.wifeFullName}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-xs">
                                                        <span className="font-bold text-slate-400 italic">Date:</span>
                                                        <span className="font-black uppercase italic">{formData.dateOfMarriage}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-xs">
                                                        <span className="font-bold text-slate-400 italic">Place:</span>
                                                        <span className="font-black uppercase italic">{formData.placeOfMarriage}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="col-span-1 md:col-span-2 space-y-6 pt-6 border-t border-slate-100 dark:border-white/5">
                                                <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 border-b pb-2">Appointment Schedule</h5>
                                                <div className="grid grid-cols-2 gap-6 p-5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/40 dark:border-white/5">
                                                    <div className="space-y-1">
                                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 italic">Appointment Date</span>
                                                        <p className="font-black text-slate-900 dark:text-white italic">
                                                            {formData.appointmentDate ? new Date(formData.appointmentDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "Not selected"}
                                                        </p>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 italic">Appointment Slot</span>
                                                        <p className="font-black text-slate-900 dark:text-white italic uppercase">
                                                            {formData.appointmentSlot || "Not selected"}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="col-span-1 md:col-span-2 space-y-6 pt-6 border-t border-slate-100 dark:border-white/5">
                                                <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 border-b pb-2">Filing Fee Details</h5>

                                                 <div className="space-y-3 p-5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/40 dark:border-white/5">
                                                     <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                         <span>{baseFeeLabel}</span>
                                                         <span className="font-bold text-slate-700 dark:text-slate-200">₱{miscFeeAmount.toFixed(2)}</span>
                                                     </div>
                                                     {additionalFees.map((fee: any, idx: number) => (
                                                         <div key={fee.code || idx} className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                             <span>{fee.label || "Additional Fee"}</span>
                                                             <span className="font-bold text-slate-700 dark:text-slate-200">₱{(Number(fee.amount) || 0).toFixed(2)}</span>
                                                         </div>
                                                     ))}
                                                     <div className="border-t border-slate-200/40 dark:border-white/5 pt-2 flex items-center justify-between">
                                                         <div>
                                                             <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Total Certified True Copy Appointment Fee</span>
                                                         </div>
                                                         <div className="text-right">
                                                             <span className="text-2xl font-black uppercase italic tracking-tight text-rose-500">₱{apptTotalAmount.toFixed(2)}</span>
                                                         </div>
                                                     </div>
                                                 </div>
                                            </div>
                                        </div>

                                        <div className="pt-6 space-y-4">
                                            {/* Data Privacy Agreement panel */}
                                            <div className={cn(
                                                "p-4 rounded-2xl border bg-white/30 dark:bg-white/5 flex items-start gap-4 transition-all duration-300",
                                                (showErrors && !policyAccepted)
                                                    ? "border-2 border-red-500"
                                                    : "border-slate-200/40"
                                            )}>
                                                <button
                                                    type="button"
                                                    onClick={() => setPolicyOpen(true)}
                                                    className={cn(
                                                        "w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 transition-all",
                                                        policyAccepted
                                                            ? "bg-rose-500 border-rose-500 text-white"
                                                            : showErrors
                                                                ? "border-2 border-red-500"
                                                                : "border-slate-300"
                                                    )}
                                                >
                                                    {policyAccepted ? <Check className="w-3 h-3" /> : null}
                                                </button>
                                                <div className="flex-1 text-xs cursor-pointer select-none text-left" onClick={() => setPolicyOpen(true)}>
                                                    <div className="font-black uppercase text-[11px] tracking-wider text-slate-800 dark:text-white">DATA PRIVACY AND TERMS AGREEMENT</div>
                                                    <div className="text-[10px] text-slate-500 italic mt-1 leading-relaxed line-clamp-2 md:line-clamp-none">I AUTHORIZE THE LGU TO PROCESS MY PERSONAL INFORMATION IN ACCORDANCE WITH THE DATA PRIVACY ACT. CLICK TO REVIEW AGREEMENT.</div>
                                                    {(showErrors && !policyAccepted) && (
                                                        <p className="text-[9px] font-black text-red-500 uppercase italic tracking-widest mt-1 animate-pulse">Agreement required before submitting</p>
                                                    )}
                                                </div>
                                                <button type="button" onClick={() => setPolicyOpen(true)} className="text-[10px] font-black italic text-rose-600 shrink-0">Review</button>
                                            </div>
                                        </div>
                                    </Card>

                                    <div className="flex gap-4 pt-4 w-full justify-end">
                                        <Button variant="outline" onClick={prevStep} className="h-14 px-8 rounded-full font-black uppercase italic tracking-widest select-none">
                                            BACK
                                        </Button>
                                        <Button
                                            onClick={handleSubmit}
                                            disabled={submitting}
                                            className="flex-1 h-14 rounded-full font-black uppercase italic tracking-widest shadow-xl transition-all duration-300 select-none text-white"
                                            style={{ backgroundColor: themeColor }}
                                        >
                                            {submitting && <Loader2 className="w-5 h-5 animate-spin mr-2" />}
                                            SUBMIT
                                        </Button>
                                    </div>
                                </div>
                            )
                            }
                        </motion.div >
                    </AnimatePresence >
                </div >
            </div >
        </>
    );
}
