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
    Home,
    Heart,
    ArrowRight,
    Search,
    CheckCircle2,
    AlertCircle
} from "lucide-react";
import DocumentViewerModal from "@/components/shared/DocumentViewerModal";
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
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
    getCurrentUserResident,
    getTransactionTypes,
    ensureCivilRegistryTransactionTypes,
    getSystemSettingAction
} from "@/app/admin/transactions/actions";
import { submitMarriageRegistrationTransaction } from "@/app/admin/transactions/marriage-regis-actions";
import { searchResidents, getResidentDataById } from "@/app/admin/actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { saveDraftFile, getDraftFiles, clearDraftFiles } from "@/lib/draftDb";
import { supabase } from "@/lib/supabase";
import PremiumDocumentUpload from "@/components/shared/PremiumDocumentUpload";



// --- Resident Search Component ---
const ResidentSearch = ({ onSelect, placeholder = "Search resident..." }: { onSelect: (r: any) => void; placeholder?: string }) => {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<any[]>([]);

    useEffect(() => {
        if (query.length > 2) {
            const delayDebounceFn = setTimeout(async () => {
                const res = await searchResidents(query);
                if (res.success && res.data) {
                    setResults(res.data as any[]);
                } else {
                    setResults([]);
                }
            }, 300);
            return () => clearTimeout(delayDebounceFn);
        } else {
            setResults([]);
        }
    }, [query]);

    return (
        <div className="relative w-full">
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                    placeholder={placeholder}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="pl-12 h-12 bg-slate-50 dark:bg-white/5 border-none font-bold"
                />
            </div>

            {results.length > 0 && (
                <div className="absolute z-[110] w-full mt-2 bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl max-h-60 overflow-y-auto p-2 space-y-1">
                    {results.map((r) => (
                        <button
                            key={r.id}
                            type="button"
                            onClick={() => {
                                onSelect(r);
                                setQuery("");
                                setResults([]);
                            }}
                            className="w-full text-left px-4 py-3 hover:bg-rose-50 dark:hover:bg-rose-900/10 rounded-xl flex items-center gap-3 transition-colors"
                        >
                            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center">
                                <User className="w-4 h-4 text-slate-400" />
                            </div>
                            <div>
                                <p className="text-xs font-black uppercase italic">{r.firstName} {r.lastName}</p>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{r.barangay}</p>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

type Step = "IDENTITY" | "DETAILS" | "CONFIRM";

const STEPS: { id: Step; label: string; icon: any }[] = [
    { id: "IDENTITY", label: "Applicants", icon: User },
    { id: "DETAILS", label: "Marriage & Documents", icon: Search },
    { id: "CONFIRM", label: "Submit", icon: CheckCircle2 },
];

const STORAGE_KEY = "lcr_marriage_registration_draft";

// --- UPLOAD FILE CLIENT-SIDE TO SUPABASE STORAGE (bypasses Vercel 4.5MB limit) ---
async function uploadFileClientSide(file: File, fieldName: string, userId: string): Promise<string> {
    const fileExt = file.name.split('.').pop() || 'bin';
    const fileName = `${userId}/${fieldName}_${Date.now()}.${fileExt}`;
    const filePath = `services/lcr/marriage_registration/${fileName}`;

    const { error } = await supabase.storage
        .from("system-assets")
        .upload(filePath, file, {
            cacheControl: '3600',
            upsert: true
        });

    if (error) {
        console.error(`[ClientUpload] Upload error for ${fieldName}:`, error);
        throw new Error(`Failed to upload ${file.name}: ${error.message}`);
    }

    const { data: { publicUrl } } = supabase.storage
        .from("system-assets")
        .getPublicUrl(filePath);

    return publicUrl;
}

export default function MarriageRegistrationPage() {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState<Step>("IDENTITY");
    const [mounted, setMounted] = useState(false);
    const [loading, setLoading] = useState(true);

    const [themeColor, setThemeColor] = useState("theme_color");
    const [lateFee, setLateFee] = useState<number>(300);
    const [baseFee, setBaseFee] = useState<number>(0);

    useEffect(() => {
        getSystemSettingAction("theme_color").then((res) => {
            if (res.success && res.data) {
                setThemeColor(res.data);
            }
        });
    }, []);

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

    useEffect(() => {
        setMounted(true);
    }, []);
    const [submitting, setSubmitting] = useState(false);
    const [resident, setResident] = useState<any>(null);
    const [showDetailsErrors, setShowDetailsErrors] = useState(false);

    const isApp1Male = resident?.gender ? resident.gender.toUpperCase() === "MALE" : true;
    const app1Label = resident?.gender ? (isApp1Male ? "Groom" : "Wife") : "Applicant 1";
    const app2Label = resident?.gender ? (isApp1Male ? "Wife" : "Groom") : "Applicant 2";

    const [form, setForm] = useState({
        typeId: "",
        registryType: "MARRIAGE_REG",
        registrationType: "" as "STANDARD" | "LATE" | "",

        // Applicant 1
        app1FullName: "",
        app1BirthDate: "",
        app1BirthPlace: "",
        app1Citizenship: "FILIPINO",

        // Applicant 2
        app2IsResident: false,
        app2FullName: "",
        app2BirthDate: "",
        app2BirthPlace: "",
        app2Citizenship: "FILIPINO",
        app2Address: "",

        // Marriage Details
        dateOfMarriage: "",
        placeOfMarriage: "MAPANDAN, PANGASINAN",

        email: "",
        contactNumber: "",
        relationship: "",
        informantAddress: "",
        files: {} as Record<string, File | null>,
        previews: {} as Record<string, string | null>,
    });

    const [hasDraft, setHasDraft] = useState(false);


    // Privacy / Terms modal state (shared key across LCR pages)
    const [policyOpen, setPolicyOpen] = useState(false);
    const [policyAccepted, setPolicyAccepted] = useState(false);

    const handleAcceptPolicy = () => { setPolicyOpen(false); setPolicyAccepted(true); };

    // Save progress to localStorage
    useEffect(() => {
        if (!loading) {
            // Persist drafts to localStorage. We strip files and previews
            // to avoid hitting the quota limit, since binary files are stored in IndexedDB.
            const savableForm = (() => {
                const copy: any = { ...form };
                delete copy.files;
                delete copy.previews;
                return copy;
            })();
            const serialized = JSON.stringify({
                form: savableForm,
                currentStep
            });
            localStorage.setItem(STORAGE_KEY, serialized);
            setHasDraft(true);
        }
    }, [form, currentStep, loading]);

    useEffect(() => {
        async function init() {
            try {
                await ensureCivilRegistryTransactionTypes();

                // Try loading from localStorage first
                const saved = localStorage.getItem(STORAGE_KEY);
                const savedData = saved ? JSON.parse(saved) : null;
                setHasDraft(!!saved);

                const [resResult, typesResult] = await Promise.all([
                    getCurrentUserResident(),
                    getTransactionTypes()
                ]);

                let activeResident = null;
                if (resResult.success && resResult.data) {
                    activeResident = resResult.data;
                    setResident(activeResident);
                }

                if (savedData) {
                    setForm(prev => ({ ...prev, ...savedData.form }));
                    setCurrentStep(savedData.currentStep);
                }

                // Restore draft files from IndexedDB
                try {
                    const draftFiles = await getDraftFiles(STORAGE_KEY);
                    if (draftFiles && Object.keys(draftFiles).length > 0) {
                        setForm(prev => {
                            const newFiles = { ...prev.files, ...draftFiles };
                            const newPreviews = { ...prev.previews };
                            Object.entries(draftFiles).forEach(([key, file]) => {
                                if (file && file.type.startsWith("image/")) {
                                    newPreviews[key] = URL.createObjectURL(file);
                                }
                            });
                            return {
                                ...prev,
                                files: newFiles,
                                previews: newPreviews
                            };
                        });
                    }
                } catch (e) {
                    console.error("Failed to restore draft files from IndexedDB:", e);
                }

                if (activeResident) {
                    const r = activeResident;
                    const parts = [
                        r.houseNumber && `#${r.houseNumber}`,
                        r.street && `${r.street} St.`,
                        r.purok && `Purok ${r.purok}`,
                        r.sitio && `Sitio ${r.sitio}`,
                        r.barangay && `Brgy. ${r.barangay}`,
                        r.municipality || "Mapandan",
                        r.province || "Pangasinan"
                    ].filter(Boolean);
                    const constructedAddr = parts.join(", ").toUpperCase();

                    setForm(prev => ({
                        ...prev,
                        email: r.email || prev.email || "",
                        contactNumber: r.contactNumber || prev.contactNumber || "",
                        app1FullName: `${r.firstName} ${r.middleName ? r.middleName[0] + '. ' : ''}${r.lastName}`.toUpperCase(),
                        app1BirthDate: r.dateOfBirth ? new Date(r.dateOfBirth).toISOString().split('T')[0] : "",
                        app1BirthPlace: (r.placeOfBirth || r.municipality || "").toUpperCase(),
                        app1Citizenship: (r.citizenship || "FILIPINO").toUpperCase(),
                        informantAddress: constructedAddr
                    }));
                }

                if (typesResult.success && typesResult.data) {
                    const lcrTypes = typesResult.data.filter((t: any) => t.category === "Civil Registry");
                    const currentDbType = lcrTypes.find((t: any) => t.code === "LCR_MARRIAGE_REG");
                    if (currentDbType) {
                        setForm(prev => ({ ...prev, typeId: currentDbType.id }));
                        setBaseFee(Number(currentDbType.baseFee || 0));
                        if (currentDbType.lateFee !== undefined && currentDbType.lateFee !== null) {
                            setLateFee(Number(currentDbType.lateFee));
                        }
                    }
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

    const handlePremiumFileSelect = async (file: File, key: string) => {
        saveDraftFile(STORAGE_KEY, key, file).catch(err => {
            console.error("Failed to save draft file to IndexedDB:", err);
        });
        try {
            toast.loading("Uploading and preparing document preview...", { id: `file-upload-${key}` });
            const userId = resident?.id || "anonymous";
            const sanitizedKey = key.replace(/[^a-zA-Z0-9_-]/g, '_');
            const publicUrl = await uploadFileClientSide(file, sanitizedKey, userId);

            setForm((prev: any) => ({
                ...prev,
                files: { ...prev.files, [key]: file },
                previews: { ...prev.previews, [key]: publicUrl }
            }));
            toast.success("Document uploaded & preview ready!", { id: `file-upload-${key}` });
        } catch (uploadErr) {
            console.error(`[ClientUpload] Failed to upload ${key} on-the-fly:`, uploadErr);
            toast.error("Upload failed. Local copy stored (preview limited).", { id: `file-upload-${key}` });

            if (file.type.startsWith("image/")) {
                const reader = new FileReader();
                reader.onload = () => {
                    const dataUrl = reader.result as string | null;
                    setForm((prev: any) => ({
                        ...prev,
                        files: { ...prev.files, [key]: file },
                        previews: { ...prev.previews, [key]: dataUrl }
                    }));
                };
                reader.readAsDataURL(file);
            } else {
                setForm((prev: any) => ({
                    ...prev,
                    files: { ...prev.files, [key]: file },
                    previews: { ...prev.previews, [key]: null }
                }));
            }
        }
    };

    const handleRemoveFile = (key: string) => {
        setForm((prev: any) => {
            const nextFiles = { ...prev.files };
            const nextPreviews = { ...prev.previews };
            delete nextFiles[key];
            delete nextPreviews[key];
            return {
                ...prev,
                files: nextFiles,
                previews: nextPreviews
            };
        });
        saveDraftFile(STORAGE_KEY, key, null).catch(err => {
            console.error("Failed to delete draft file in IndexedDB:", err);
        });
        toast.success("File removed successfully.");
    };

    const handleSubmit = async () => {
        if (submitting) return;
        // Require privacy terms acceptance before allowing submit
        if (!policyAccepted) {
            toast.error("Please review and accept the Privacy Policy & Terms before submitting. Click Review to open the agreement.");
            return;
        }
        setSubmitting(true);
        try {
            const formData = new FormData();
            formData.append("typeId", form.typeId);
            formData.append("registryType", "MARRIAGE_REG");
            formData.append("residentSnapshot", JSON.stringify(resident));

            const additionalData = {
                registrationType: form.registrationType,
                applicant1: {
                    fullName: form.app1FullName,
                    birthDate: form.app1BirthDate,
                    birthPlace: form.app1BirthPlace,
                    citizenship: form.app1Citizenship,
                    gender: isApp1Male ? "MALE" : "FEMALE"
                },
                applicant2: {
                    isResident: form.app2IsResident,
                    fullName: form.app2FullName,
                    birthDate: form.app2BirthDate,
                    birthPlace: form.app2BirthPlace,
                    citizenship: form.app2Citizenship,
                    address: form.app2Address,
                    gender: isApp1Male ? "FEMALE" : "MALE"
                },
                dateOfMarriage: form.dateOfMarriage,
                placeOfMarriage: form.placeOfMarriage,
                email: form.email,
                contactNumber: form.contactNumber,
                relationship: form.relationship,
                informantAddress: form.informantAddress,
                subjectName: `${form.app1FullName} & ${form.app2FullName}`,
                totalAmount: form.registrationType === "LATE" ? lateFee : baseFee
            };

            // Debug: log additionalData to browser console to verify dateOfMarriage
            console.log("[LCR Submit] additionalData:", additionalData);
            formData.append("additionalData", JSON.stringify(additionalData));

            const fileUrls: Record<string, string> = {};

            // First, copy any existing public URLs from previews
            Object.entries(form.previews || {}).forEach(([key, url]) => {
                if (url && typeof url === "string" && url.startsWith("http")) {
                    fileUrls[key] = url;
                }
            });

            const finalFiles = { ...form.files };
            const fileEntries = Object.entries(finalFiles);
            for (let i = 0; i < fileEntries.length; i++) {
                const [key, file] = fileEntries[i];
                if (!file) continue;
                const sanitizedKey = key.replace(/[^a-zA-Z0-9_-]/g, '_');

                if (fileUrls[key]) {
                    console.log(`[ClientUpload] Reusing existing public URL for ${key}:`, fileUrls[key]);
                    continue;
                }

                try {
                    toast.loading(`Uploading document ${i + 1}/${fileEntries.length}...`, { id: "marriage-upload-toast" });
                    const userId = resident?.id || "anonymous";
                    const url = await uploadFileClientSide(file, sanitizedKey, userId);
                    fileUrls[key] = url;
                } catch (uploadErr) {
                    console.error(`[ClientUpload] Failed to upload ${key}:`, uploadErr);
                    toast.error(`Failed to upload document: ${key}. Please try again.`, { id: "marriage-upload-toast" });
                    setSubmitting(false);
                    return;
                }
            }
            toast.dismiss("marriage-upload-toast");

            const updatedAdditionalData = {
                ...additionalData,
                ...fileUrls
            };

            formData.set("additionalData", JSON.stringify(updatedAdditionalData));

            const result = await submitMarriageRegistrationTransaction(formData);
            if (result.success) {
                localStorage.removeItem(STORAGE_KEY);
                await clearDraftFiles(STORAGE_KEY);
                toast.success("Marriage Registration Submitted Successfully");
                router.push("/user/services/requests");
            } else {
                toast.error(result.error || "Submission failed");
            }
        } catch (error) {
            console.error(error);
            toast.error("Something went wrong");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950">
                <Loader2 className="w-10 h-10 animate-spin text-rose-500 mb-4" />
                <p className="font-black uppercase tracking-widest text-[10px] text-slate-400 italic">Initializing Registration Form...</p>
            </div>
        );
    }

    const nextStep = () => {
        if (currentStep === "IDENTITY") {
            // Validate Applicant 1
            if (!form.app1FullName || !form.app1BirthDate || !form.app1BirthPlace || !form.app1Citizenship) {
                toast.error(`Please fill in all ${app1Label} details`);
                return;
            }
            // Validate Applicant 2
            if (!form.app2FullName || !form.app2BirthDate || !form.app2BirthPlace || !form.app2Citizenship || !form.app2Address) {
                toast.error(`Please fill in all ${app2Label} details`);
                return;
            }
            setCurrentStep("DETAILS");
        }
        else if (currentStep === "DETAILS") {
            const missingFields: string[] = [];
            if (!form.registrationType) missingFields.push("Registration Type");
            if (!form.dateOfMarriage) missingFields.push("Date of Marriage");
            if (!form.placeOfMarriage) missingFields.push("Place of Marriage");

            if (form.registrationType === "STANDARD") {
                const hasMarriageCert = form.files.marriageCert || form.previews.marriageCert;
                if (!hasMarriageCert) {
                    missingFields.push("Accomplished Certificate of Marriage");
                }
            } else if (form.registrationType === "LATE") {
                const hasPsaNeg = form.files.psaNeg || form.previews.psaNeg;
                const hasAffidavitDelay = form.files.affidavitDelay || form.previews.affidavitDelay;
                const hasMarriageLicense = form.files.marriageLicense || form.previews.marriageLicense;

                if (!hasPsaNeg) missingFields.push("Negative Certificate from PSA");
                if (!hasAffidavitDelay) missingFields.push("Affidavit of Delayed Registration");
                if (!hasMarriageLicense) missingFields.push("Certified Copy of Marriage License");
            }

            if (missingFields.length > 0) {
                setShowDetailsErrors(true);
                toast.error(`Please complete the following fields/documents: ${missingFields.join(", ")}`);
                return;
            }
            setShowDetailsErrors(false);
            setCurrentStep("CONFIRM");
        }
    };

    const prevStep = () => {
        if (currentStep === "DETAILS") setCurrentStep("IDENTITY");
        else if (currentStep === "CONFIRM") setCurrentStep("DETAILS");
    };

    const handleApp2Select = async (res: any) => {
        const result = await getResidentDataById(res.id);
        if (result.success && result.data) {
            const r = result.data;
            const parts = [
                r.houseNumber && `#${r.houseNumber}`,
                r.street && `${r.street} St.`,
                r.purok && `Purok ${r.purok}`,
                r.sitio && `Sitio ${r.sitio}`,
                r.barangay && `Brgy. ${r.barangay}`,
                r.municipality || "Mapandan",
                r.province || "Pangasinan"
            ].filter(Boolean);
            const constructedAddr = parts.join(", ").toUpperCase();

            setForm(prev => ({
                ...prev,
                app2FullName: `${r.firstName} ${r.middleName ? r.middleName[0] + '. ' : ''}${r.lastName}`.toUpperCase(),
                app2BirthDate: r.dateOfBirth ? new Date(r.dateOfBirth).toISOString().split('T')[0] : "",
                app2BirthPlace: (r.placeOfBirth || r.municipality || "").toUpperCase(),
                app2Citizenship: (r.citizenship || "FILIPINO").toUpperCase(),
                app2Address: constructedAddr
            }));
            toast.success(`Fetched details for ${r.firstName} ${r.lastName}`);
        }
    };

    const handleDateOfMarriageChange = (val: string) => {
        if (!val) {
            setForm(prev => ({
                ...prev,
                dateOfMarriage: "",
                registrationType: ""
            }));
            return;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [year, month, day] = val.split("-").map(Number);
        const chosenDate = new Date(year, month - 1, day);
        chosenDate.setHours(0, 0, 0, 0);

        if (chosenDate > today) {
            toast.error("Date of marriage cannot be in the future");
            return;
        }

        const timeDiff = today.getTime() - chosenDate.getTime();
        const diffDays = Math.round(timeDiff / (1000 * 3600 * 24));

        const isLate = diffDays > 15;
        setForm(prev => ({
            ...prev,
            dateOfMarriage: val,
            registrationType: isLate ? "LATE" : "STANDARD"
        }));
    };

    return (
        <>
            <style dangerouslySetInnerHTML={{
                __html: `
                :root, * {
                    --primary-theme: ${themeColor} !important;
                }
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
                    background-color: ${themeColor}1a !important;
                }
                .bg-rose-500\\/5, [class*="bg-rose-500/5"] {
                    background-color: ${themeColor}0d !important;
                }
                .shadow-rose-500\\/20, [class*="shadow-rose-500/20"] {
                    --tw-shadow-color: ${themeColor}33 !important;
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
                    border-color: ${themeColor}80 !important;
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
            <DocumentViewerModal
                isOpen={viewerOpen}
                onClose={() => setViewerOpen(false)}
                file={viewerFile}
                fileUrl={viewerUrl}
                title={viewerTitle}
                themeColor="var(--primary-theme)"
            />
            <div className="container max-w-5xl mx-auto px-4 pt-0 pb-0 space-y-8">
            <div className="sticky top-[64px] sm:top-[80px] z-40 md:static -mx-4 md:mx-0 px-4 md:px-0 pt-2 md:pt-0">
                <Breadcrumb>
                    <BreadcrumbList className="bg-white/80 dark:bg-white/5 backdrop-blur-md px-6 py-2.5 rounded-full border border-slate-200/60 dark:border-white/5 w-fit shadow-sm">
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
                            <BreadcrumbPage className="text-[10px] font-black uppercase tracking-widest italic text-emerald-700 dark:text-emerald-400">Marriage Registration</BreadcrumbPage>
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
                                Marriage <span style={{ color: themeColor }}>Registration</span>
                            </h1>

                            <p className="text-slate-600 dark:text-slate-300 font-medium text-xs leading-relaxed max-w-xl italic">
                                File a request for official marriage records or register a new marriage. Complete all sections and upload required documents.
                            </p>
                        </div>

                        <div className="flex flex-col items-end gap-2 relative z-10 shrink-0">
                            <div className="hidden md:block w-28 h-28 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/10 backdrop-blur-md flex flex-col items-center justify-center text-center p-4 shadow-sm dark:shadow-2xl relative overflow-hidden group hover:scale-105 transition-transform duration-500 mb-2">
                                <div className="absolute inset-0 bg-gradient-to-tr opacity-0 group-hover:opacity-10 transition-opacity" style={{ backgroundImage: `linear-gradient(to top right, ${themeColor}, transparent)` }} />
                                <CheckCircle2 className="w-8 h-8 mb-1.5 opacity-80" style={{ color: themeColor }} />
                                <p className="text-[7px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 leading-tight">Secure Filing</p>
                            </div>
                            {hasDraft && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        localStorage.removeItem(STORAGE_KEY);
                                        window.location.reload();
                                    }}
                                    className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-rose-500 transition-colors"
                                >
                                    Reset Form
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Progress Stepper */}
                    <div className="relative px-2 py-4">
                        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-100 dark:bg-white/5 -translate-y-1/2 rounded-full overflow-hidden">
                            <motion.div
                                className="h-full bg-rose-600"
                                initial={{ width: 0 }}
                                animate={{ width: `${(STEPS.findIndex(s => s.id === currentStep) / (STEPS.length - 1)) * 100}%` }}
                            />
                        </div>

                        <div className="flex justify-between items-center relative z-10">
                            {STEPS.map((step, idx) => {
                                const isActive = currentStep === step.id;
                                const stepIdx = STEPS.findIndex(s => s.id === currentStep);
                                const isCompleted = stepIdx > idx;
                                const Icon = step.icon;

                                return (
                                    <div key={idx} className="flex flex-col items-center gap-2">
                                        <div className={cn(
                                            "w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all duration-500 border-2 bg-white dark:bg-[#08090d]",
                                            isActive ? "border-rose-600 text-rose-600 shadow-lg shadow-rose-500/20 scale-110" :
                                                isCompleted ? "bg-rose-600 border-rose-600 text-white" :
                                                    "border-slate-200 dark:border-white/10 text-slate-400"
                                        )}>
                                            {isCompleted ? <Check className="w-5 h-5" /> : <Icon className="w-4 h-4 md:w-5 md:h-5" />}
                                        </div>
                                        <span className={cn(
                                            "text-[8px] md:text-[10px] font-black uppercase tracking-wider italic hidden md:block",
                                            isActive ? "text-rose-600" : "text-slate-400"
                                        )}>
                                            {step.label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
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
                            {currentStep === "IDENTITY" && (
                                <div className="space-y-8">
                                    {/* Applicant 1 */}
                                    <Card className="p-8 rounded-[2rem] border-slate-200/50 dark:border-white/5 shadow-xl dark:shadow-2xl space-y-6">
                                        <h3 className="text-lg font-black uppercase italic tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                                            {app1Label}
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-1.5">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Full Name</Label>
                                                <Input
                                                    disabled
                                                    className="bg-slate-100 dark:bg-white/5 border-none font-bold uppercase cursor-not-allowed opacity-75"
                                                    value={form.app1FullName}
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Date of Birth</Label>
                                                <Input
                                                    disabled
                                                    type="date"
                                                    className="bg-slate-100 dark:bg-white/5 border-none font-bold cursor-not-allowed opacity-75"
                                                    value={form.app1BirthDate}
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Place of Birth</Label>
                                                <Input
                                                    disabled
                                                    className="bg-slate-100 dark:bg-white/5 border-none font-bold uppercase cursor-not-allowed opacity-75"
                                                    value={form.app1BirthPlace}
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Citizenship</Label>
                                                <Input
                                                    disabled
                                                    className="bg-slate-100 dark:bg-white/5 border-none font-bold uppercase cursor-not-allowed opacity-75"
                                                    value={form.app1Citizenship}
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sex</Label>
                                                <Input
                                                    disabled
                                                    className="bg-slate-100 dark:bg-white/5 border-none font-bold uppercase cursor-not-allowed opacity-75"
                                                    value={isApp1Male ? "MALE" : "FEMALE"}
                                                />
                                            </div>
                                            <div className="space-y-1.5 col-span-1 md:col-span-2">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Informant Address</Label>
                                                <Input
                                                    disabled
                                                    className="bg-slate-100 dark:bg-white/5 border-none font-bold uppercase cursor-not-allowed opacity-75"
                                                    value={form.informantAddress || ""}
                                                />
                                            </div>
                                        </div>
                                    </Card>

                                    {/* Applicant 2 */}
                                    <Card className="p-8 rounded-[2rem] border-slate-200/50 dark:border-white/5 shadow-xl dark:shadow-2xl space-y-6">
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <h3 className="text-lg font-black uppercase italic tracking-tight text-slate-900 dark:text-white">
                                                {app2Label}
                                            </h3>
                                            <div className="flex items-center space-x-2">
                                                <Checkbox
                                                    id="app2Resident"
                                                    checked={form.app2IsResident}
                                                    onCheckedChange={(checked) => setForm({ ...form, app2IsResident: !!checked })}
                                                />
                                                <label htmlFor="app2Resident" className="text-xs font-bold italic text-slate-500 cursor-pointer">
                                                    {app2Label} is a resident of Mapandan
                                                </label>
                                            </div>
                                        </div>

                                        {form.app2IsResident && (
                                            <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-300">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-blue-500">Search Mapandan Records</Label>
                                                <ResidentSearch
                                                    onSelect={handleApp2Select}
                                                    placeholder="Search by first or last name..."
                                                />
                                            </div>
                                        )}

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-1.5">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Full Name <span className="text-rose-500">*</span></Label>
                                                <Input
                                                    placeholder="ENTER FULL NAME"
                                                    className="bg-slate-50 dark:bg-white/5 border-none font-bold uppercase"
                                                    value={form.app2FullName}
                                                    onChange={e => setForm({ ...form, app2FullName: e.target.value.toUpperCase() })}
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Date of Birth <span className="text-rose-500">*</span></Label>
                                                <Input
                                                    type="date"
                                                    className="bg-slate-50 dark:bg-white/5 border-none font-bold"
                                                    value={form.app2BirthDate}
                                                    onChange={e => setForm({ ...form, app2BirthDate: e.target.value })}
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Place of Birth <span className="text-rose-500">*</span></Label>
                                                <Input
                                                    placeholder="ENTER PLACE"
                                                    className="bg-slate-50 dark:bg-white/5 border-none font-bold uppercase"
                                                    value={form.app2BirthPlace}
                                                    onChange={e => setForm({ ...form, app2BirthPlace: e.target.value.toUpperCase() })}
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Citizenship <span className="text-rose-500">*</span></Label>
                                                <Input
                                                    className="bg-slate-50 dark:bg-white/5 border-none font-bold uppercase"
                                                    value={form.app2Citizenship}
                                                    onChange={e => setForm({ ...form, app2Citizenship: e.target.value.toUpperCase() })}
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sex</Label>
                                                <Input
                                                    disabled
                                                    className="bg-slate-100 dark:bg-white/5 border-none font-bold uppercase cursor-not-allowed opacity-75"
                                                    value={isApp1Male ? "FEMALE" : "MALE"}
                                                />
                                            </div>
                                            <div className="space-y-1.5 col-span-1 md:col-span-2">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Address <span className="text-rose-500">*</span></Label>
                                                <Input
                                                    placeholder="ENTER ADDRESS"
                                                    className="bg-slate-50 dark:bg-white/5 border-none font-bold uppercase"
                                                    value={form.app2Address}
                                                    onChange={e => setForm({ ...form, app2Address: e.target.value.toUpperCase() })}
                                                />
                                            </div>
                                        </div>
                                    </Card>

                                    <div className="flex justify-end pt-4">
                                        <Button
                                            onClick={nextStep}
                                            className="h-14 px-10 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black uppercase italic tracking-widest"
                                        >
                                            Next Part <ArrowRight className="ml-2 w-5 h-5" />
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {currentStep === "DETAILS" && (
                                <div className="space-y-8">
                                    <Card className="p-8 rounded-[2rem] border-slate-200/50 dark:border-white/5 shadow-xl dark:shadow-2xl space-y-6">
                                        <h3 className="text-lg font-black uppercase italic tracking-tight text-slate-900 dark:text-white">
                                            Marriage Details
                                        </h3>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-1.5">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Registration Type <span className="text-rose-500">*</span></Label>
                                                <Select 
                                                    value={form.registrationType} 
                                                    disabled={true}
                                                    onValueChange={(val: any) => setForm({...form, registrationType: val})}
                                                >
                                                    <SelectTrigger className="bg-slate-50 dark:bg-white/5 border-none font-bold h-12 rounded-xl">
                                                        <SelectValue placeholder="SELECT REGISTRATION TYPE" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="STANDARD">TIMELY (STANDARD)</SelectItem>
                                                        <SelectItem value="LATE">LATE REGISTRATION</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                {!form.registrationType && showDetailsErrors && (
                                                    <div className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl flex items-center gap-2 mt-1.5 text-rose-500 animate-in fade-in slide-in-from-top-1 duration-200">
                                                        <AlertCircle className="w-4 h-4 shrink-0" />
                                                        <span className="text-[10px] font-black uppercase tracking-wider italic">Registration Type is required</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Date of Marriage <span className="text-rose-500">*</span></Label>
                                                <Input
                                                    type="date"
                                                    max={new Date().toISOString().split("T")[0]}
                                                    className="bg-slate-50 dark:bg-white/5 border-none font-bold h-12 rounded-xl"
                                                    value={form.dateOfMarriage}
                                                    onChange={e => handleDateOfMarriageChange(e.target.value)}
                                                />
                                                {!form.dateOfMarriage && showDetailsErrors && (
                                                    <div className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl flex items-center gap-2 mt-1.5 text-rose-500 animate-in fade-in slide-in-from-top-1 duration-200">
                                                        <AlertCircle className="w-4 h-4 shrink-0" />
                                                        <span className="text-[10px] font-black uppercase tracking-wider italic">Date of Marriage is required</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="md:col-span-1 space-y-1.5">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Place of Marriage <span className="text-rose-500">*</span></Label>
                                                <Input
                                                    className="bg-slate-50 dark:bg-white/5 border-none font-bold uppercase h-12 rounded-xl"
                                                    value={form.placeOfMarriage}
                                                    onChange={e => setForm({ ...form, placeOfMarriage: e.target.value.toUpperCase() })}
                                                />
                                                {!form.placeOfMarriage && showDetailsErrors && (
                                                    <div className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl flex items-center gap-2 mt-1.5 text-rose-500 animate-in fade-in slide-in-from-top-1 duration-200">
                                                        <AlertCircle className="w-4 h-4 shrink-0" />
                                                        <span className="text-[10px] font-black uppercase tracking-wider italic">Place of Marriage is required</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </Card>

                                    <Card className="p-8 rounded-[2rem] border-slate-200/50 dark:border-white/5 shadow-xl dark:shadow-2xl space-y-8">
                                        <div className="space-y-2">
                                            <h3 className="text-lg font-black uppercase italic tracking-tight text-slate-900 dark:text-white">
                                                Required Documents
                                            </h3>
                                            <p className="text-xs text-slate-400 font-bold italic">
                                                Please upload clear photos or scanned copies of the following requirements for <span className="text-rose-500 uppercase">{form.registrationType}</span> registration.
                                            </p>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            {!form.registrationType ? (
                                                <div className="col-span-1 md:col-span-2 bg-slate-50 dark:bg-white/5 border border-dashed border-slate-200 dark:border-white/10 p-8 rounded-2xl flex flex-col items-center justify-center text-center gap-3">
                                                    <AlertCircle className="w-8 h-8 text-slate-400 animate-pulse" />
                                                    <div className="space-y-1">
                                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Select Registration Type First</p>
                                                        <p className="text-xs font-bold italic text-slate-400/80 leading-normal max-w-sm mx-auto">
                                                            Please choose standard timely or late registration to see the required document uploads.
                                                        </p>
                                                    </div>
                                                </div>
                                            ) : form.registrationType === "STANDARD" ? (
                                                <div className="col-span-1">
                                                    <PremiumDocumentUpload
                                                        label="Accomplished Certificate of Marriage"
                                                        required
                                                        file={form.files.marriageCert}
                                                        previewUrl={form.previews.marriageCert}
                                                        onFileSelect={(newFile) => handlePremiumFileSelect(newFile, 'marriageCert')}
                                                        onClear={() => handleRemoveFile('marriageCert')}
                                                        onView={() => handleViewFile(form.files.marriageCert, form.previews.marriageCert, "Certificate of Marriage")}
                                                        error={!form.files.marriageCert && !form.previews.marriageCert && showDetailsErrors}
                                                    />
                                                </div>
                                            ) : (
                                                <>
                                                    <PremiumDocumentUpload
                                                        label="Negative Certificate from PSA"
                                                        required
                                                        file={form.files.psaNeg}
                                                        previewUrl={form.previews.psaNeg}
                                                        onFileSelect={(newFile) => handlePremiumFileSelect(newFile, 'psaNeg')}
                                                        onClear={() => handleRemoveFile('psaNeg')}
                                                        onView={() => handleViewFile(form.files.psaNeg, form.previews.psaNeg, "Negative Certificate from PSA")}
                                                        error={!form.files.psaNeg && !form.previews.psaNeg && showDetailsErrors}
                                                    />
                                                    <PremiumDocumentUpload
                                                        label="Affidavit of Delayed Registration"
                                                        required
                                                        file={form.files.affidavitDelay}
                                                        previewUrl={form.previews.affidavitDelay}
                                                        onFileSelect={(newFile) => handlePremiumFileSelect(newFile, 'affidavitDelay')}
                                                        onClear={() => handleRemoveFile('affidavitDelay')}
                                                        onView={() => handleViewFile(form.files.affidavitDelay, form.previews.affidavitDelay, "Affidavit of Delayed Registration")}
                                                        error={!form.files.affidavitDelay && !form.previews.affidavitDelay && showDetailsErrors}
                                                    />
                                                    <div className="col-span-1 md:col-span-2">
                                                        <PremiumDocumentUpload
                                                            label="Certified Copy of Marriage License"
                                                            required
                                                            file={form.files.marriageLicense}
                                                            previewUrl={form.previews.marriageLicense}
                                                            onFileSelect={(newFile) => handlePremiumFileSelect(newFile, 'marriageLicense')}
                                                            onClear={() => handleRemoveFile('marriageLicense')}
                                                            onView={() => handleViewFile(form.files.marriageLicense, form.previews.marriageLicense, "Certified Copy of Marriage License")}
                                                            error={!form.files.marriageLicense && !form.previews.marriageLicense && showDetailsErrors}
                                                        />
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </Card>

                                    <div className="flex justify-end gap-4 pt-4">
                                        <Button variant="outline" onClick={prevStep} className="h-14 px-8 rounded-2xl font-black uppercase italic tracking-widest">
                                            Back
                                        </Button>
                                        <Button onClick={nextStep} className="h-14 px-10 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black uppercase italic tracking-widest">
                                            Final Review <ArrowRight className="ml-2 w-5 h-5" />
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {currentStep === "CONFIRM" && (
                                <div className="space-y-8">
                                    <Card className="p-8 rounded-[2rem] border-slate-200/50 dark:border-white/5 shadow-xl dark:shadow-2xl space-y-8">
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
                                                <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 border-b pb-2">Contracting Parties</h5>
                                                <div className="space-y-4">
                                                    <div className="flex justify-between items-center text-xs">
                                                        <span className="font-bold text-slate-400 italic">{app1Label}:</span>
                                                        <span className="font-black uppercase italic">{form.app1FullName}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-xs">
                                                        <span className="font-bold text-slate-400 italic">{app1Label} Sex:</span>
                                                        <span className="font-black uppercase italic">{isApp1Male ? "MALE" : "FEMALE"}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-xs">
                                                        <span className="font-bold text-slate-400 italic">{app1Label} Address:</span>
                                                        <span className="font-black uppercase italic">{form.informantAddress || "N/A"}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-xs">
                                                        <span className="font-bold text-slate-400 italic">{app2Label}:</span>
                                                        <span className="font-black uppercase italic">{form.app2FullName}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-xs">
                                                        <span className="font-bold text-slate-400 italic">{app2Label} Sex:</span>
                                                        <span className="font-black uppercase italic">{isApp1Male ? "FEMALE" : "MALE"}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-xs">
                                                        <span className="font-bold text-slate-400 italic">{app2Label} Address:</span>
                                                        <span className="font-black uppercase italic">{form.app2Address || "N/A"}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-xs text-rose-500">
                                                        <span className="font-bold italic">Type:</span>
                                                        <span className="font-black uppercase italic">{form.registrationType}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-6">
                                                <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 border-b pb-2">Event Schedule</h5>
                                                <div className="space-y-4">
                                                    <div className="flex justify-between items-center text-xs">
                                                        <span className="font-bold text-slate-400 italic">Date:</span>
                                                        <span className="font-black uppercase italic">{form.dateOfMarriage}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-xs">
                                                        <span className="font-bold text-slate-400 italic">Location:</span>
                                                        <span className="font-black uppercase italic">{form.placeOfMarriage}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="col-span-1 md:col-span-2 space-y-6 pt-6 border-t border-slate-100 dark:border-white/5">
                                                <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 border-b pb-2">Payment / Fee Details</h5>
                                                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/40 dark:border-white/5 flex items-center justify-between gap-4">
                                                    <div className="space-y-1">
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Registration Fee</span>
                                                        <p className="text-xs font-bold text-slate-500 italic">
                                                            {form.registrationType === "LATE" 
                                                                ? "Required processing fee for late filings." 
                                                                : baseFee > 0
                                                                    ? "Standard registration fee."
                                                                    : "Standard timely registration is free of charge."}
                                                        </p>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className={cn(
                                                            "text-2xl font-black uppercase italic tracking-tight",
                                                            form.registrationType === "LATE" ? "text-rose-500" : (baseFee > 0 ? "text-[#1e293b] dark:text-white" : "text-emerald-500")
                                                        )}>
                                                            {form.registrationType === "LATE" 
                                                                ? `₱${lateFee.toFixed(2)}` 
                                                                : baseFee > 0 
                                                                    ? `₱${baseFee.toFixed(2)}` 
                                                                    : "FREE"}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pt-6 space-y-4">
                                            {/* Data Privacy Agreement panel */}
                                            <div className="p-4 rounded-2xl border border-slate-200/40 bg-white/30 dark:bg-white/5 flex items-start gap-4">
                                                <button type="button" onClick={() => setPolicyOpen(true)} className={cn("w-5 h-5 rounded-full border flex items-center justify-center", policyAccepted ? "bg-rose-500 border-rose-500 text-white" : "border-slate-300")}>
                                                    {policyAccepted ? <Check className="w-3 h-3" /> : null}
                                                </button>
                                                <div className="flex-1 text-xs cursor-pointer select-none" onClick={() => setPolicyOpen(true)}>
                                                    <div className="font-black uppercase text-[11px] tracking-wider">DATA PRIVACY AND TERMS AGREEMENT</div>
                                                    <div className="text-[10px] text-slate-500 italic mt-1">I AUTHORIZE THE LGU TO PROCESS MY PERSONAL INFORMATION IN ACCORDANCE WITH THE DATA PRIVACY ACT. CLICK TO REVIEW AGREEMENT.</div>
                                                </div>
                                                <button type="button" onClick={() => setPolicyOpen(true)} className="text-[10px] font-black italic text-rose-600">Review</button>
                                            </div>
                                        </div>
                                    </Card>

                                    <div className="flex justify-end gap-4 pt-4">
                                        <Button variant="outline" onClick={prevStep} className="h-14 px-8 rounded-2xl font-black uppercase italic tracking-widest">
                                            Back
                                        </Button>
                                        <Button
                                            onClick={handleSubmit}
                                            disabled={submitting}
                                            className="h-14 px-12 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black uppercase italic tracking-widest shadow-xl shadow-rose-500/20"
                                        >
                                            {submitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <CheckCircle2 className="w-5 h-5 mr-2" />}
                                            Confirm & Submit
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </>
    );
}

