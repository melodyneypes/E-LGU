"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { BackNextButton } from "../_components/back-next-button";
import SecureIdleTimer from "@/components/shared/SecureIdleTimer";
import PrivacyTermsModal from "@/components/shared/PrivacyTermsModal";

import { motion, AnimatePresence } from "framer-motion";
import {
    User,
    Loader2,
    Check,
    AlertCircle,
    Home,
    Skull,
    CheckCircle2,
    FileText,
    Sparkles,
    X,
    Calendar,
    Search
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
    getRegistrarAppointmentConfig,
    getBarangaysList
} from "@/app/admin/transactions/actions";
import SchedulePicker from "@/components/shared/SchedulePicker";
import {
    getLatestForm2AForCurrentUser
} from "@/app/admin/transactions/death-endorsement-actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";



type Step = "STATUS" | "INFORMANT" | "SUBJECT" | "SCHEDULE" | "REVIEW";

const STEPS: { id: Step; label: string; icon: any }[] = [
    { id: "STATUS", label: "Status", icon: Sparkles },
    { id: "INFORMANT", label: "Identity", icon: User },
    { id: "SUBJECT", label: "Details", icon: FileText },
    { id: "SCHEDULE", label: "Schedule", icon: Calendar },
    { id: "REVIEW", label: "Submit", icon: CheckCircle2 },
];

export default function AppointmentDeathPsaEndorsementPage() {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState<Step>("INFORMANT");
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
    const [barangaysList, setBarangaysList] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const filteredBarangays = barangaysList.filter(brgy =>
        brgy.toLowerCase().includes(searchQuery.toLowerCase())
    );



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
        // Subject (Deceased) fields
        subjectFullName: "",
        subjectDateOfDeath: "",
        mothersMaidenName: "",
        fathersName: "",
        placeOfDeath: "",
        causeOfDeath: "",
        appointmentDate: "",
        appointmentSlot: "",
    });



    // Privacy / Terms modal state
    const [policyOpen, setPolicyOpen] = useState(false);
    const [policyAccepted, setPolicyAccepted] = useState(false);

    const parsedDefaultFees = dbType?.defaultFees 
        ? (typeof dbType.defaultFees === "string" ? JSON.parse(dbType.defaultFees) : dbType.defaultFees) 
        : [];
    const miscFeeAmount = dbType?.baseFee ?? 130.00;
    const mandatoryFeeAmount = parsedDefaultFees.find((f: any) => f.code === "MANDATORY_FINE" || f.code === "MANDATORY_FEE")?.amount ?? 140.00;
    const apptTotalAmount = miscFeeAmount + mandatoryFeeAmount;

    const handleAcceptPolicy = () => { setPolicyOpen(false); setPolicyAccepted(true); };

    // Restore progress from session storage & IndexedDB
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get("revisionId")) return;

        const savedStep = sessionStorage.getItem("appointment-death-psa-endorsement-step");
        const savedForm = sessionStorage.getItem("appointment-death-psa-endorsement-form");

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
            sessionStorage.setItem("appointment-death-psa-endorsement-step", currentStep);
            sessionStorage.setItem("appointment-death-psa-endorsement-form", JSON.stringify(formData));
        }
    }, [currentStep, formData, loading, revisionId]);

    useEffect(() => {
        async function init() {
            try {
                await ensureCivilRegistryTransactionTypes();

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

                const [resResult, typesResult, configResult, brgyResult] = await Promise.all([
                    getCurrentUserResident(),
                    getTransactionTypes(),
                    getRegistrarAppointmentConfig(),
                    getBarangaysList()
                ]);

                if (brgyResult.success && brgyResult.data) {
                    setBarangaysList(brgyResult.data);
                }

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
                        r.province || "Pangasinan"
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
                            subjectFullName: addData.subjectFullName || "",
                            subjectDateOfDeath: addData.subjectDateOfDeath || "",
                            mothersMaidenName: addData.mothersMaidenName || "",
                            fathersName: addData.fathersName || "",
                            placeOfDeath: addData.placeOfDeath || "",
                            causeOfDeath: addData.causeOfDeath || "",
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

                if (typesResult.success && typesResult.data) {
                    const psaType = typesResult.data.find((t: any) => t.code === "LCR_DEATH_PSA_APPOINTMENT_ENDORSEMENT");
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
        setFormData(prev => ({ ...prev, [name]: value }));

        if (name === "relationship") {
            const promise = (async () => {
                const res = await getLatestForm2AForCurrentUser();
                if (res.success && res.data) {
                    const { subjectName, dateOfDeath, mothersMaidenName, fathersName, placeOfDeath, causeOfDeath } = res.data;
                    setFormData(prev => ({
                        ...prev,
                        subjectFullName: subjectName ? subjectName.toUpperCase() : prev.subjectFullName,
                        subjectDateOfDeath: dateOfDeath ? new Date(dateOfDeath).toISOString().split('T')[0] : prev.subjectDateOfDeath,
                        mothersMaidenName: mothersMaidenName ? mothersMaidenName.toUpperCase() : prev.mothersMaidenName,
                        fathersName: fathersName ? fathersName.toUpperCase() : prev.fathersName,
                        placeOfDeath: placeOfDeath ? placeOfDeath.toUpperCase() : prev.placeOfDeath,
                        causeOfDeath: causeOfDeath ? causeOfDeath.toUpperCase() : prev.causeOfDeath
                    }));
                }
            })();
            toast.promise(promise, {
                loading: "Searching for your latest Form 2A record...",
                success: "Form 2A check complete.",
                error: "Error checking latest Form 2A."
            });
        }
    };

    const getNormalizedPlaceOfDeath = (val: string) => {
        if (!val) return "";
        const upperVal = val.toUpperCase();
        const found = barangaysList.find(b => upperVal.includes(b.toUpperCase()));
        if (found) {
            return `${found.toUpperCase()}, MAPANDAN, PANGASINAN`;
        }
        return val;
    };

    const validateStep = (step: Step): boolean => {
        if (step === "INFORMANT") {
            const isSpecifyEmpty = (formData.relationship === "OTHER" || formData.relationship === "RELATIVE") && !formData.relationshipOther?.trim();
            if (!formData.relationship || !formData.contactNumber || isSpecifyEmpty) {
                setShowErrors(true);
                toast.error("Please complete highlighted required fields.");
                setTimeout(() => {
                    const firstInvalid = document.querySelector(".border-red-500, [class*='border-red-500']");
                    if (firstInvalid) {
                        firstInvalid.scrollIntoView({ behavior: "smooth", block: "center" });
                    }
                }, 100);
                return false;
            }
        }
        if (step === "SUBJECT") {
            if (!formData.subjectFullName || !formData.subjectDateOfDeath || !formData.mothersMaidenName) {
                setShowErrors(true);
                toast.error("Please fill in all required deceased details.");
                setTimeout(() => {
                    const firstInvalid = document.querySelector(".border-red-500, [class*='border-red-500']");
                    if (firstInvalid) {
                        firstInvalid.scrollIntoView({ behavior: "smooth", block: "center" });
                    }
                }, 100);
                return false;
            }
        }
        if (step === "SCHEDULE") {
            if (!formData.appointmentDate || !formData.appointmentSlot) {
                setShowErrors(true);
                toast.error("Please select an appointment date and session.");
                return false;
            }
        }

        return true;
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
            data.append("registryType", "DEATH_PSA_APPOINTMENT_ENDORSEMENT");
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
                relationship: finalRelationship,
                contactNumber: formData.contactNumber,
                email: formData.email,
                subjectFullName: formData.subjectFullName,
                subjectDateOfDeath: formData.subjectDateOfDeath,
                mothersMaidenName: formData.mothersMaidenName,
                fathersName: formData.fathersName,
                placeOfDeath: formData.placeOfDeath,
                causeOfDeath: formData.causeOfDeath,
                appointmentDate: formData.appointmentDate,
                appointmentSlot: formData.appointmentSlot,
                psaEndorsementFee: miscFeeAmount,
            };
            data.append("additionalData", JSON.stringify(additionalData));

            const res = await submitCivilRegistryTransaction(data);

            if (res.success && res.data) {
                toast.success(revisionId ? "Revision resubmitted successfully!" : "Death PSA Appointment Endorsement submitted successfully!");
                sessionStorage.removeItem("appointment-death-psa-endorsement-step");
                sessionStorage.removeItem("appointment-death-psa-endorsement-form");
                router.push(`/user/services/requests/${res.data.id}`);
            } else {
                toast.error(res.error || "Failed to submit endorsement request");
            }
        } catch (error) {
            console.error("Submission error:", error);
            toast.error("An unexpected error occurred");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950">
                <Loader2 className="w-10 h-10 animate-spin mb-4" style={{ color: "var(--primary-theme)" }} />
                <p className="font-black uppercase tracking-widest text-[10px] text-slate-400 italic">Initializing Endorsement Form...</p>
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
                .text-emerald-500, [class*="text-emerald-500"]:not(input):not(select):not(textarea) {
                    color: ${themeColor} !important;
                }
                .text-emerald-600, [class*="text-emerald-600"]:not(input):not(select):not(textarea) {
                    color: ${themeColor} !important;
                }
                .bg-emerald-500, [class*="bg-emerald-500"] {
                    background-color: ${themeColor} !important;
                }
                .bg-slate-600, [class*="bg-slate-600"] {
                    background-color: ${themeColor} !important;
                }
                .border-slate-500, [class*="border-slate-500"] {
                    border-color: ${themeColor} !important;
                }
                .border-slate-600, [class*="border-slate-600"] {
                    border-color: ${themeColor} !important;
                }
                .bg-emerald-500\\/10, [class*="bg-emerald-500/10"] {
                    background-color: ${themeColor === "var(--primary-theme)" ? "color-mix(in srgb, var(--primary-theme) 10%, transparent)" : `${themeColor}1a`} !important;
                }
                .bg-emerald-500\\/20, [class*="bg-emerald-500/20"] {
                    background-color: ${themeColor === "var(--primary-theme)" ? "color-mix(in srgb, var(--primary-theme) 20%, transparent)" : `${themeColor}33`} !important;
                }
                .bg-emerald-500\\/5, [class*="bg-emerald-500/5"] {
                    background-color: ${themeColor === "var(--primary-theme)" ? "color-mix(in srgb, var(--primary-theme) 5%, transparent)" : `${themeColor}0d`} !important;
                }
                .shadow-emerald-500\\/20, [class*="shadow-emerald-500/20"] {
                    --tw-shadow-color: ${themeColor === "var(--primary-theme)" ? "color-mix(in srgb, var(--primary-theme) 20%, transparent)" : `${themeColor}33`} !important;
                }
                .hover\\:bg-slate-600:hover, [class*="hover:bg-slate-600"]:hover {
                    background-color: ${themeColor} !important;
                    filter: brightness(0.9);
                }
                .hover\\:border-emerald-500\\/50:hover, [class*="hover:border-emerald-500/50"]:hover {
                    border-color: ${themeColor === "var(--primary-theme)" ? "color-mix(in srgb, var(--primary-theme) 50%, transparent)" : `${themeColor}80`} !important;
                }
                input:not([type="button"]):not([type="submit"]), select, textarea, button[role="combobox"], [class*="SelectTrigger"] {
                    color: #0f172a !important;
                }
                input:not([type="button"]):not([type="submit"]):disabled, select:disabled, textarea:disabled,
                input:not([type="button"]):not([type="submit"])[readonly], select[readonly], textarea[readonly] {
                    color: #1e293b !important;
                    -webkit-text-fill-color: #1e293b !important;
                    opacity: 0.9 !important;
                }
                .dark input:not([type="button"]):not([type="submit"]), .dark select, .dark textarea, .dark button[role="combobox"], .dark [class*="SelectTrigger"] {
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
                                <BreadcrumbPage className="text-[10px] font-black uppercase tracking-widest italic" style={{ color: themeColor }}>Death PSA Appointment Endorsement</BreadcrumbPage>
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
                                    <Skull className="w-4 h-4 text-emerald-500" style={{ color: themeColor }} />
                                </div>
                                <span className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500 dark:text-white/70 italic">Local Civil Registry</span>
                            </div>

                            <h1 className="text-2xl md:text-4xl font-black uppercase italic tracking-tighter leading-none">
                                Death PSA <span style={{ color: themeColor }}>Appointment Endorsement</span>
                            </h1>

                            <p className="text-slate-600 dark:text-slate-300 font-medium text-xs leading-relaxed max-w-xl italic">
                                Request an appointment for endorsement of a verified local death certificate record to the Philippine Statistics Authority (PSA).
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
                    <div className="grid grid-cols-5 gap-1.5 md:gap-4 relative px-1 md:px-2 py-4">
                        {STEPS.map((step, idx) => {
                            const isActive = currentStep === step.id;
                            const stepIdx = STEPS.findIndex(s => s.id === currentStep);
                            const isCompleted = stepIdx > idx;
                            const Icon = step.icon;

                            return (
                                <div
                                    key={idx}
                                    className="flex flex-col items-center gap-2 md:gap-3 relative z-10 font-black group cursor-pointer"
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
                                                const stepToValidate = STEPS[i].id;
                                                if (stepToValidate !== "STATUS" && !validateStep(stepToValidate)) {
                                                    return;
                                                }
                                            }
                                            setCurrentStep(step.id);
                                        }
                                    }}
                                >
                                    <div
                                        className={cn(
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
                                    <span
                                        className={cn(
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
                                        className="h-full bg-slate-600"
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

                    <Card className="p-6 md:p-10 rounded-[2.5rem] border border-slate-200/50 dark:border-white/5 bg-white dark:bg-[#0f1117] shadow-xl dark:shadow-2xl overflow-hidden min-h-[400px]">
                        <AnimatePresence mode="wait">
                            {/* ===== STEP 1: INFORMANT ===== */}
                            {currentStep === "INFORMANT" && (
                                <motion.div
                                    key="informant-step"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 1.05 }}
                                    className="space-y-6"
                                >
                                    <div className="space-y-1">
                                        <h2 className="text-xl md:text-2xl font-black italic uppercase tracking-tighter leading-tight text-slate-900 dark:text-white">
                                            Requester <span style={{ color: themeColor }}>Identity</span>
                                        </h2>
                                        <p className="text-[10px] md:text-xs text-slate-500 font-medium italic">
                                            Your details as the requesting informant
                                        </p>
                                    </div>

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

                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1">Relationship to Deceased <span className="text-red-500">*</span></Label>
                                            {(formData.relationship === "OTHER" || formData.relationship === "RELATIVE") ? (
                                                <div className="relative flex items-center">
                                                    <Input
                                                        value={formData.relationshipOther || ""}
                                                        onChange={(e) => setFormData(p => ({ ...p, relationshipOther: e.target.value }))}
                                                        className={cn("h-12 rounded-xl text-xs md:text-sm font-bold uppercase pr-10 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10", (showErrors && !formData.relationshipOther) && "!border-2 !border-red-500")}
                                                        placeholder="Specify relationship (e.g. Nephew, Friend)"
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
                                                    <SelectTrigger style={{ height: '3rem' }} className={cn("!h-12 rounded-xl focus:ring-slate-500 shadow-sm text-xs md:text-sm bg-white dark:bg-slate-900 transition-all font-bold border border-slate-200 dark:border-white/10", (showErrors && !formData.relationship) ? "!border-2 !border-red-500" : "")}>
                                                        <SelectValue placeholder="SELECT RELATIONSHIP" />
                                                    </SelectTrigger>
                                                    <SelectContent className="rounded-xl border-slate-200 dark:border-white/10 italic">
                                                        <SelectItem value="SPOUSE">SPOUSE</SelectItem>
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

                                        {/* Personal Details Grid */}
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                            <div className="md:col-span-1 space-y-2">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1">First Name</Label>
                                                <Input readOnly value={formData.informantFirstName} className="rounded-xl bg-slate-100 dark:bg-slate-800 h-12 font-bold uppercase border border-slate-200 dark:border-white/10" />
                                            </div>
                                            <div className="md:col-span-1 space-y-2">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1">Middle Name</Label>
                                                <Input readOnly value={formData.informantMiddleName} className="rounded-xl bg-slate-100 dark:bg-slate-800 h-12 font-bold uppercase border border-slate-200 dark:border-white/10" />
                                            </div>
                                            <div className="md:col-span-1 space-y-2">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1">Last Name</Label>
                                                <Input readOnly value={formData.informantLastName} className="rounded-xl bg-slate-100 dark:bg-slate-800 h-12 font-bold uppercase border border-slate-200 dark:border-white/10" />
                                            </div>
                                            <div className="md:col-span-1 space-y-2">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1">Suffix</Label>
                                                <Input readOnly value={formData.informantSuffix} className="rounded-xl bg-slate-100 dark:bg-slate-800 h-12 font-bold uppercase border border-slate-200 dark:border-white/10" />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1">Birth Date</Label>
                                                <Input readOnly value={formData.informantBirthDate} type="date" className="rounded-xl bg-slate-100 dark:bg-slate-800 h-12 font-bold uppercase border border-slate-200 dark:border-white/10" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1">Age</Label>
                                                <Input readOnly value={formData.informantAge} className="rounded-xl bg-slate-100 dark:bg-slate-800 h-12 font-bold uppercase border border-slate-200 dark:border-white/10" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1">Civil Status</Label>
                                                <Input readOnly value={formData.informantCivilStatus} className="rounded-xl bg-slate-100 dark:bg-slate-800 h-12 font-bold uppercase border border-slate-200 dark:border-white/10" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1">Citizenship</Label>
                                                <Input readOnly value={formData.informantCitizenship} className="rounded-xl bg-slate-100 dark:bg-slate-800 h-12 font-bold uppercase border border-slate-200 dark:border-white/10" />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1">Occupation</Label>
                                                <Input readOnly className="rounded-xl bg-slate-100 dark:bg-slate-800 h-12 font-bold uppercase border border-slate-200 dark:border-white/10" value={formData.informantOccupation} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1">Contact Number <span className="text-red-500">*</span></Label>
                                                <Input
                                                    className={cn(
                                                        "rounded-xl bg-white dark:bg-slate-900 h-12 transition-all font-bold uppercase border border-slate-200 dark:border-white/10",
                                                        (showErrors && !formData.contactNumber) ? "!border-2 !border-red-500" : ""
                                                    )}
                                                    placeholder="e.g. 0917XXXXXXX"
                                                    value={formData.contactNumber}
                                                    maxLength={11}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, contactNumber: e.target.value.replace(/[^0-9]/g, '') }))}
                                                />
                                                <p className="text-[9px] font-black text-amber-500 uppercase tracking-wider ml-1 animate-pulse">
                                                    * Note: Please use your active contact number. This will be used to contact you regarding your transaction.
                                                </p>
                                                {(showErrors && !formData.contactNumber) && (
                                                    <p className="text-[9px] font-black text-red-500 uppercase italic tracking-widest ml-1 animate-pulse">Required</p>
                                                )}
                                            </div>
                                        </div>

                                        <div
                                            className="p-3 md:p-4 rounded-2xl md:rounded-3xl flex items-center gap-2 md:gap-3 border animate-in fade-in duration-300"
                                            style={{
                                                backgroundColor: themeColor === "var(--primary-theme)" ? "color-mix(in srgb, var(--primary-theme) 5%, transparent)" : `${themeColor}0d`,
                                                borderColor: themeColor === "var(--primary-theme)" ? "color-mix(in srgb, var(--primary-theme) 15%, transparent)" : `${themeColor}26`
                                            }}
                                        >
                                            <Sparkles className="w-3.5 h-3.5 shrink-0" style={{ color: themeColor }} />
                                            <p className="text-[8px] md:text-[10px] font-black italic leading-tight uppercase tracking-widest" style={{ color: themeColor }}>
                                                Note: Changes will update your Resident Profile upon submission.
                                            </p>
                                        </div>
                                    </div>

                                    <BackNextButton
                                        onBack={() => router.push("/user/services/civil-registry")}
                                        onNext={() => {
                                            if (validateStep("INFORMANT")) {
                                                setShowErrors(false);
                                                setCurrentStep("SUBJECT");
                                            }
                                        }}
                                        themeColor={themeColor}
                                    />
                                </motion.div>
                            )}

                            {/* ===== STEP 2: DECEASED DETAILS ===== */}
                            {currentStep === "SUBJECT" && (
                                <motion.div
                                    key="subject-step"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 1.05 }}
                                    className="space-y-6"
                                >
                                    <div className="space-y-1">
                                        <h2 className="text-xl md:text-2xl font-black italic uppercase tracking-tighter leading-tight text-slate-900 dark:text-white">
                                            Deceased <span style={{ color: themeColor }}>Details</span>
                                        </h2>
                                        <p className="text-[10px] md:text-xs text-slate-500 font-medium italic">Provide the details of the deceased person whose record needs PSA endorsement</p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="md:col-span-2 space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1">Deceased&apos;s Full Name <span className="text-red-500">*</span></Label>
                                            <Input
                                                name="subjectFullName"
                                                placeholder="ENTER FULL NAME OF DECEASED"
                                                value={formData.subjectFullName}
                                                onChange={handleInputChange}
                                                className={cn(
                                                    "rounded-xl bg-white dark:bg-slate-900 h-12 transition-all uppercase font-medium border border-slate-200 dark:border-white/10",
                                                    (showErrors && !formData.subjectFullName) && "!border-2 !border-red-500"
                                                )}
                                            />
                                            {(showErrors && !formData.subjectFullName) && (
                                                <p className="text-[9px] font-black text-red-500 uppercase italic tracking-widest ml-1 animate-pulse">Required</p>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1">Date of Death <span className="text-red-500">*</span></Label>
                                            <Input
                                                type="date"
                                                name="subjectDateOfDeath"
                                                value={formData.subjectDateOfDeath}
                                                onChange={handleInputChange}
                                                className={cn(
                                                    "rounded-xl bg-white dark:bg-slate-900 h-12 transition-all font-medium border border-slate-200 dark:border-white/10",
                                                    (showErrors && !formData.subjectDateOfDeath) && "!border-2 !border-red-500"
                                                )}
                                            />
                                            {(showErrors && !formData.subjectDateOfDeath) && (
                                                <p className="text-[9px] font-black text-red-500 uppercase italic tracking-widest ml-1 animate-pulse">Required</p>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1">Mother&apos;s Maiden Name <span className="text-red-500">*</span></Label>
                                            <Input
                                                name="mothersMaidenName"
                                                placeholder="ENTER MOTHER'S MAIDEN NAME"
                                                value={formData.mothersMaidenName}
                                                onChange={handleInputChange}
                                                className={cn(
                                                    "rounded-xl bg-white dark:bg-slate-900 h-12 transition-all uppercase font-medium border border-slate-200 dark:border-white/10",
                                                    (showErrors && !formData.mothersMaidenName) && "!border-2 !border-red-500"
                                                )}
                                            />
                                            {(showErrors && !formData.mothersMaidenName) && (
                                                <p className="text-[9px] font-black text-red-500 uppercase italic tracking-widest ml-1 animate-pulse">Required</p>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1">Father&apos;s Full Name</Label>
                                            <Input
                                                name="fathersName"
                                                placeholder="ENTER FATHER'S FULL NAME"
                                                value={formData.fathersName}
                                                onChange={handleInputChange}
                                                className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 h-12 transition-all uppercase font-medium"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1">Place of Death</Label>
                                            <Select
                                                value={getNormalizedPlaceOfDeath(formData.placeOfDeath)}
                                                onValueChange={(val) => setFormData(prev => ({ ...prev, placeOfDeath: val }))}
                                            >
                                                <SelectTrigger className={cn("!w-full !h-12 rounded-xl text-xs font-medium uppercase bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 transition-all text-left px-3", (showErrors && !formData.placeOfDeath) && "border-2 border-red-500")}>
                                                    <SelectValue placeholder="SELECT PLACE OF DEATH" />
                                                </SelectTrigger>
                                                <SelectContent className="max-h-[300px] flex flex-col p-0 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0f1117]" position="popper">
                                                    <div className="p-2 border-b border-slate-100 dark:border-white/5 bg-white dark:bg-[#0f1117] sticky top-0 z-20">
                                                        <div className="relative flex items-center">
                                                            <Search className="absolute left-2.5 w-4 h-4 text-slate-400" />
                                                            <input
                                                                type="text"
                                                                placeholder="Search barangay..."
                                                                value={searchQuery}
                                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                                onKeyDown={(e) => {
                                                                    e.stopPropagation();
                                                                }}
                                                                onPointerDown={(e) => {
                                                                    e.stopPropagation();
                                                                }}
                                                                className="w-full h-8 pl-8 pr-3 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-[#2a3040] rounded-lg outline-none focus:border-slate-300 dark:focus:border-white/20 font-semibold text-slate-900 dark:text-white"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="overflow-y-auto max-h-[220px] p-1 italic">
                                                        {filteredBarangays.length > 0 ? (
                                                            filteredBarangays.map((brgy) => (
                                                                <SelectItem key={brgy} value={`${brgy.toUpperCase()}, MAPANDAN, PANGASINAN`}>
                                                                    {brgy.toUpperCase()}
                                                                </SelectItem>
                                                            ))
                                                        ) : (
                                                            <div className="p-4 text-center text-xs text-slate-400 font-bold">No barangay found</div>
                                                        )}
                                                        {(() => {
                                                            const normVal = getNormalizedPlaceOfDeath(formData.placeOfDeath);
                                                            if (normVal && !barangaysList.some(b => normVal.startsWith(b.toUpperCase()))) {
                                                                return (
                                                                    <SelectItem value={normVal}>
                                                                        {normVal}
                                                                    </SelectItem>
                                                                );
                                                            }
                                                            return null;
                                                        })()}
                                                    </div>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-3 pt-6">
                                        <Button
                                            variant="outline"
                                            onClick={() => setCurrentStep("INFORMANT")}
                                            className="rounded-full px-8 font-black uppercase tracking-widest italic text-[10px] h-12"
                                        >
                                            BACK
                                        </Button>
                                        <Button
                                            onClick={() => {
                                                if (validateStep("SUBJECT")) {
                                                    setShowErrors(false);
                                                    setCurrentStep("SCHEDULE");
                                                }
                                            }}
                                            className="rounded-full px-12 text-white font-black uppercase tracking-widest italic text-[10px] h-12 shadow-xl"
                                            style={{ backgroundColor: themeColor }}
                                        >
                                            NEXT
                                        </Button>
                                    </div>
                                </motion.div>
                            )}

                            {/* ===== STEP 4: CHOOSE SCHEDULE ===== */}
                            {currentStep === "SCHEDULE" && (
                                <motion.div
                                    key="schedule-step"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 1.05 }}
                                    className="space-y-8"
                                >
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

                                    <div className="flex justify-end gap-3 pt-6">
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                setShowErrors(false);
                                                setCurrentStep("SUBJECT");
                                            }}
                                            className="rounded-full px-8 font-black uppercase tracking-widest italic text-[10px] h-12"
                                        >
                                            BACK
                                        </Button>
                                        <Button
                                            onClick={() => {
                                                if (validateStep("SCHEDULE")) {
                                                    setShowErrors(false);
                                                    setCurrentStep("REVIEW");
                                                }
                                            }}
                                            className="rounded-full px-12 text-white font-black uppercase tracking-widest italic text-[10px] h-12 shadow-xl"
                                            style={{ backgroundColor: themeColor }}
                                        >
                                            NEXT
                                        </Button>
                                    </div>
                                </motion.div>
                            )}

                            {/* ===== STEP 5: REVIEW & SUBMIT ===== */}
                            {currentStep === "REVIEW" && (
                                <motion.div
                                    key="review-step"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 1.05 }}
                                    className="space-y-8"
                                >
                                    <div className="flex items-center gap-4 mb-4">
                                        <div>
                                            <h2 className="text-xl md:text-2xl font-black italic uppercase tracking-tighter leading-tight text-slate-900 dark:text-white">
                                                Endorsement <span style={{ color: themeColor }}>Review</span>
                                            </h2>
                                            <p className="text-xs text-slate-500 font-medium italic">Verify information before submission</p>
                                        </div>
                                    </div>

                                    <div className="space-y-6 pt-4">
                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-1">
                                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 italic">Informant</span>
                                                <p className="font-black text-slate-900 dark:text-white italic uppercase">
                                                    {resident?.firstName} {resident?.lastName} {formData.relationship === "OTHER" ? `(OTHER: ${formData.relationshipOther})` : `(${formData.relationship})`}
                                                </p>
                                            </div>
                                            <div className="space-y-1">
                                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 italic">Contact</span>
                                                <p className="font-black text-slate-900 dark:text-white italic">{formData.contactNumber}</p>
                                            </div>
                                            <div className="col-span-2 border-t border-slate-200 dark:border-white/5 pt-4 space-y-1">
                                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 italic">Deceased Name (To Endorse)</span>
                                                <p className="font-black text-slate-900 dark:text-white italic uppercase text-lg">{formData.subjectFullName}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 italic">Date of Death</span>
                                                <p className="font-black text-slate-900 dark:text-white italic">{formData.subjectDateOfDeath}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 italic">Place of Death</span>
                                                <p className="font-black text-slate-900 dark:text-white italic uppercase">{formData.placeOfDeath || "N/A"}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 italic">Father&apos;s Name</span>
                                                <p className="font-black text-slate-900 dark:text-white italic uppercase">{formData.fathersName || "N/A"}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 italic">Mother&apos;s Maiden Name</span>
                                                <p className="font-black text-slate-900 dark:text-white italic uppercase">{formData.mothersMaidenName}</p>
                                            </div>
                                            <div className="col-span-2 border-t border-slate-200 dark:border-white/5 pt-4 grid grid-cols-2 gap-6">
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
                                            {formData.causeOfDeath && (
                                                <div className="col-span-2 space-y-1">
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 italic">Cause of Death</span>
                                                    <p className="font-black text-slate-900 dark:text-white italic uppercase">{formData.causeOfDeath}</p>
                                                </div>
                                            )}
                                        </div>



                                         {/* Fee Display */}
                                         <div className="space-y-3 p-4 rounded-2xl bg-slate-500/10 border border-slate-500/20">
                                             <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400 italic">
                                                 <span>Misc Fee</span>
                                                 <span className="font-bold text-slate-200">₱{miscFeeAmount.toFixed(2)}</span>
                                             </div>
                                             <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400 italic">
                                                 <span>Mandatory Fee</span>
                                                 <span className="font-bold text-slate-200">₱{mandatoryFeeAmount.toFixed(2)}</span>
                                             </div>
                                             <div className="border-t border-slate-500/20 pt-2 flex items-center justify-between">
                                                 <div>
                                                     <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Total PSA Endorsement Fee</span>
                                                 </div>
                                                 <div className="text-right">
                                                     <span className="text-lg font-black text-slate-200 tracking-tight">₱{apptTotalAmount.toFixed(2)}</span>
                                                 </div>
                                             </div>
                                         </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div
                                            onClick={() => {
                                                if (policyAccepted) {
                                                    setPolicyAccepted(false);
                                                } else {
                                                    setPolicyOpen(true);
                                                }
                                            }}
                                            className={cn(
                                                "p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-4 select-none",
                                                policyAccepted
                                                    ? "bg-emerald-500/5 border-emerald-500/20"
                                                    : showErrors
                                                        ? "border-2 border-red-500"
                                                        : "border-slate-200/40 bg-white/30 dark:bg-white/5 hover:border-slate-500/20"
                                            )}
                                        >
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (policyAccepted) {
                                                        setPolicyAccepted(false);
                                                    } else {
                                                        setPolicyOpen(true);
                                                    }
                                                }}
                                                className={cn(
                                                    "w-5 h-5 rounded-full border flex items-center justify-center transition-all shrink-0 mt-0.5",
                                                    policyAccepted
                                                        ? "bg-emerald-500 border-emerald-500 text-white"
                                                        : showErrors
                                                            ? "border-2 border-red-500"
                                                            : "border-slate-300"
                                                )}
                                            >
                                                {policyAccepted ? <Check className="w-3 h-3" /> : null}
                                            </button>
                                            <div className="flex-1 text-xs text-left cursor-pointer select-none">
                                                <div className="font-black uppercase text-[11px] tracking-wider text-slate-900 dark:text-white">DATA PRIVACY AND TERMS AGREEMENT</div>
                                                <div className="text-[10px] text-slate-500 italic mt-1 font-bold line-clamp-2 md:line-clamp-none">I AUTHORIZE THE LGU TO PROCESS MY PERSONAL INFORMATION IN ACCORDANCE WITH THE DATA PRIVACY ACT. CLICK TO REVIEW AGREEMENT.</div>
                                                {(showErrors && !policyAccepted) && (
                                                    <p className="text-[9px] font-black text-red-500 uppercase italic tracking-widest mt-1 animate-pulse">Agreement required before submitting</p>
                                                )}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setPolicyOpen(true);
                                                }}
                                                className="text-[10px] font-black italic text-slate-500 hover:text-slate-600 shrink-0"
                                            >
                                                Review
                                            </button>
                                        </div>

                                        <div className="flex gap-3 w-full justify-end">
                                            <Button
                                                variant="outline"
                                                onClick={() => setCurrentStep("SCHEDULE")}
                                                className="h-14 px-8 rounded-full font-black uppercase tracking-widest italic text-[11px] select-none"
                                            >
                                                BACK
                                            </Button>
                                            <Button
                                                onClick={handleSubmit}
                                                disabled={submitting}
                                                className="flex-1 h-14 rounded-full text-white font-black uppercase tracking-widest italic text-[11px] shadow-xl flex items-center justify-center gap-2 select-none"
                                                style={{ backgroundColor: themeColor }}
                                            >
                                                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                                                SUBMIT
                                            </Button>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </Card>
                </div>
            </div>
        </>
    );
}
