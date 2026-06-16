"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import SecureIdleTimer from "@/components/shared/SecureIdleTimer";
import PrivacyTermsModal from "@/components/shared/PrivacyTermsModal";
import DocumentViewerModal from "@/components/shared/DocumentViewerModal";
import { motion, AnimatePresence } from "framer-motion";
import {
    User,
    Loader2,
    Check,
    AlertCircle,
    Home,
    Heart,
    ArrowRight,
    CheckCircle2,
    Sparkles
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
    getLatestForm3AForCurrentUser
} from "@/app/admin/transactions/actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { saveDraftFile, getDraftFiles, clearDraftFiles } from "@/lib/draftDb";
import { supabase } from "@/lib/supabase";
import PremiumDocumentUpload from "@/components/shared/PremiumDocumentUpload";

// --- UPLOAD FILE CLIENT-SIDE TO SUPABASE STORAGE ---
async function uploadFileClientSide(file: File, fieldName: string, userId: string): Promise<string> {
    const fileExt = file.name.split('.').pop() || 'bin';
    const fileName = `${userId}/${fieldName}_${Date.now()}.${fileExt}`;
    const filePath = `services/lcr/marriage_psa_endorsement/${fileName}`;

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


const STORAGE_KEY = "lcr_marriage_psa_endorsement_draft";

type Step = "STATUS" | "INFORMANT" | "SUBJECT" | "REVIEW";

const STEPS: { id: Step; label: string; icon: any }[] = [
    { id: "STATUS", label: "STATUS", icon: Sparkles },
    { id: "INFORMANT", label: "INFORMANT INFO", icon: User },
    { id: "SUBJECT", label: "MARRIAGE DETAILS", icon: Heart },
    { id: "REVIEW", label: "DOCUMENTS & SUBMIT", icon: CheckCircle2 },
];

export default function MarriagePsaEndorsementPage() {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState<Step>("INFORMANT");
    const isRestoredRef = useRef(false);


    const validateStep = (step: Step): boolean => {
        if (step === "INFORMANT") {
            if (!formData.relationship || !formData.contactNumber) {
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

            if (!files.psaNegativeCert && !previews.psaNegativeCert) {
                setShowErrors(true);
                toast.error("Please upload PSA Negative Certification.");
                return false;
            }
            if (!files.form3a && !previews.form3a) {
                setShowErrors(true);
                toast.error("Please upload Form 3A (Local Registry Copy).");
                return false;
            }
        }
        setShowErrors(false);
        return true;
    };
    const [mounted, setMounted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [themeColor, setThemeColor] = useState("var(--primary-theme)");

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
    const [revisionId, setRevisionId] = useState<string | null>(null);
    const [revisionTx, setRevisionTx] = useState<any>(null);
    const [showErrors, setShowErrors] = useState(false);

    const [viewerOpen, setViewerOpen] = useState(false);
    const [viewerFile, setViewerFile] = useState<File | null>(null);
    const [viewerUrl, setViewerUrl] = useState<string | null>(null);
    const [viewerTitle, setViewerTitle] = useState("");
    const [previews, setPreviews] = useState<Record<string, string | null>>({});

    const handleOpenViewer = (file: File | null, title: string, url: string | null = null) => {
        setViewerFile(file);
        setViewerUrl(url);
        setViewerTitle(title);
        setViewerOpen(true);
    };

    // Form State
    const [formData, setFormData] = useState({
        relationship: "",
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
    });

    const [files, setFiles] = useState<Record<string, File | null>>({
        psaNegativeCert: null,
        form3a: null,
    });

    // Privacy / Terms modal state
    const [policyOpen, setPolicyOpen] = useState(false);
    const [policyAccepted, setPolicyAccepted] = useState(false);

    const handleAcceptPolicy = () => {
        setPolicyOpen(false);
        setPolicyAccepted(true);
        setShowErrors(false);
    };

    // Restore progress from session storage & IndexedDB
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get("revisionId")) return;

        const savedStep = sessionStorage.getItem("marriage-psa-endorsement-step");
        const savedForm = sessionStorage.getItem("marriage-psa-endorsement-form");

        if (savedStep) setCurrentStep(savedStep as Step);
        if (savedForm) {
            try {
                const parsed = JSON.parse(savedForm);
                setFormData(prev => ({ ...prev, ...parsed }));
            } catch (e) {
                console.error("Failed to parse saved form", e);
            }
        }

        async function hydrateFiles() {
            try {
                const draftFiles = await getDraftFiles(STORAGE_KEY);
                if (draftFiles && Object.keys(draftFiles).length > 0 && !isRestoredRef.current) {
                    isRestoredRef.current = true;
                    setFiles(prev => ({ ...prev, ...draftFiles }));
                    const localPreviews: Record<string, string> = {};
                    Object.entries(draftFiles).forEach(([key, file]) => {
                        if (file) {
                            localPreviews[key] = URL.createObjectURL(file);
                        }
                    });
                    setPreviews(prev => ({ ...prev, ...localPreviews }));
                    toast.info("Progress restored. Uploaded document drafts recovered.", { duration: 6000 });
                }
            } catch (error) {
                console.error("Failed to hydrate draft files:", error);
            }
        }
        hydrateFiles();
    }, []);

    useEffect(() => {
        if (!loading && !revisionId) {
            sessionStorage.setItem("marriage-psa-endorsement-step", currentStep);
            sessionStorage.setItem("marriage-psa-endorsement-form", JSON.stringify(formData));
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

                const [resResult, typesResult] = await Promise.all([
                    getCurrentUserResident(),
                    getTransactionTypes()
                ]);

                if (resResult.success && resResult.data) {
                    const r = resResult.data;
                    setResident(r);

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

                    if (txData) {
                        const addData = txData.additionalData as any || {};
                        const resSnapshot = txData.residentSnapshot as any || r || {};

                        const previews: Record<string, string | null> = {};
                        const fileKeys = ["psaNegativeCert", "form3a"];
                        fileKeys.forEach(k => {
                            if (addData[k] && typeof addData[k] === "string" && addData[k].startsWith("http")) {
                                previews[k] = addData[k];
                            }
                        });

                        setFormData(prev => ({
                            ...prev,
                            relationship: addData.relationship || prev.relationship,
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
                        }));
                        setPreviews(previews);
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
                    const psaType = typesResult.data.find((t: any) => t.code === "LCR_MARRIAGE_PSA_ENDORSEMENT");
                    if (psaType) {
                        setTypeId(psaType.id);
                    }
                }

                if (!txData) {
                    // Check for latest Form 3A and auto-attach if no draft exists
                    const latestRes = await getLatestForm3AForCurrentUser();
                    if (latestRes.success && latestRes.data) {
                        const draftFiles = await getDraftFiles(STORAGE_KEY);
                        if (!draftFiles?.form3a) {
                            const { docUrl, husbandName, wifeName, dateOfMarriage, placeOfMarriage } = latestRes.data;
                            setFormData(prev => ({
                                ...prev,
                                husbandFullName: prev.husbandFullName || (husbandName ? husbandName.toUpperCase() : ""),
                                wifeFullName: prev.wifeFullName || (wifeName ? wifeName.toUpperCase() : ""),
                                dateOfMarriage: prev.dateOfMarriage || (dateOfMarriage ? new Date(dateOfMarriage).toISOString().split('T')[0] : ""),
                                placeOfMarriage: prev.placeOfMarriage || (placeOfMarriage ? placeOfMarriage.toUpperCase() : "")
                            }));

                            if (docUrl) {
                                try {
                                    const response = await fetch(docUrl);
                                    const blob = await response.blob();
                                    const filename = docUrl.split('/').pop() || "form_3a.pdf";
                                    const file = new File([blob], filename, { type: blob.type });

                                    setFiles(prev => ({ ...prev, form3a: file }));
                                    await saveDraftFile(STORAGE_KEY, "form3a", file);
                                    toast.success("Latest Form 3A found and automatically attached from your transactions!");
                                } catch (err) {
                                    console.error("Failed to download Form 3A file:", err);
                                }
                            }
                        }
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
            setFiles(prev => ({ ...prev, form3a: null }));
            saveDraftFile(STORAGE_KEY, "form3a", null).catch(err => {
                console.error("Failed to delete draft Form 3A file:", err);
            });

            const promise = (async () => {
                const res = await getLatestForm3AForCurrentUser();
                if (res.success && res.data) {
                    const { docUrl, husbandName, wifeName, dateOfMarriage, placeOfMarriage } = res.data;

                    setFormData(prev => ({
                        ...prev,
                        husbandFullName: husbandName ? husbandName.toUpperCase() : prev.husbandFullName,
                        wifeFullName: wifeName ? wifeName.toUpperCase() : prev.wifeFullName,
                        dateOfMarriage: dateOfMarriage ? new Date(dateOfMarriage).toISOString().split('T')[0] : prev.dateOfMarriage,
                        placeOfMarriage: placeOfMarriage ? placeOfMarriage.toUpperCase() : prev.placeOfMarriage
                    }));

                    if (docUrl) {
                        try {
                            const response = await fetch(docUrl);
                            const blob = await response.blob();
                            const filename = docUrl.split('/').pop() || "form_3a.pdf";
                            const file = new File([blob], filename, { type: blob.type });

                            setFiles(prev => ({ ...prev, form3a: file }));
                            setPreviews(prev => ({ ...prev, form3a: docUrl }));
                            await saveDraftFile(STORAGE_KEY, "form3a", file);
                            toast.success("Latest Form 3A found and automatically attached from your transactions!");
                        } catch (err) {
                            console.error("Failed to download Form 3A file:", err);
                        }
                    }
                }
            })();
            toast.promise(promise, {
                loading: "Checking for your latest issued Form 3A in transactions...",
                success: "Form 3A status checked.",
                error: "Failed to check or fetch Form 3A document."
            });
        }
    };

    const renderDocCard = (label: string, fileKey: string, required: boolean = true) => {
        const file = files[fileKey] || null;
        const preview = previews[fileKey] || null;

        return (
            <PremiumDocumentUpload
                key={fileKey}
                label={label}
                required={required}
                file={file}
                previewUrl={preview}
                error={showErrors && required && !file && !preview}
                onFileSelect={async (newFile) => {
                    if (newFile.size > 5 * 1024 * 1024) {
                        toast.error("File size exceeds 5MB limit.");
                        return;
                    }

                    const fileToProcess = newFile;

                    try {
                        toast.loading("Uploading and preparing document preview...", { id: `file-upload-${fileKey}` });
                        const userId = resident?.id || "anonymous";
                        const sanitizedKey = fileKey.replace(/[^a-zA-Z0-9_-]/g, '_');
                        const publicUrl = await uploadFileClientSide(fileToProcess, sanitizedKey, userId);

                        setFiles(prev => ({ ...prev, [fileKey]: fileToProcess }));
                        setPreviews(prev => ({ ...prev, [fileKey]: publicUrl }));
                        await saveDraftFile(STORAGE_KEY, fileKey, fileToProcess);
                        toast.success("Document uploaded & preview ready!", { id: `file-upload-${fileKey}` });
                    } catch (uploadErr) {
                        console.error(`[ClientUpload] Failed to upload ${fileKey} on-the-fly:`, uploadErr);
                        toast.error("Upload failed. Local copy stored (preview limited).", { id: `file-upload-${fileKey}` });

                        setFiles(prev => ({ ...prev, [fileKey]: fileToProcess }));
                        setPreviews(prev => ({ ...prev, [fileKey]: fileToProcess.type.startsWith("image/") ? URL.createObjectURL(fileToProcess) : null }));
                        await saveDraftFile(STORAGE_KEY, fileKey, fileToProcess);
                    }
                }}
                onClear={async () => {
                    setFiles(prev => ({ ...prev, [fileKey]: null }));
                    setPreviews(prev => ({ ...prev, [fileKey]: null }));
                    await saveDraftFile(STORAGE_KEY, fileKey, null);
                    toast.success("File removed successfully.");
                }}
                onView={() => handleOpenViewer(file, label, preview)}
            />
        );
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
        if (!files.psaNegativeCert && !previews.psaNegativeCert) {
            toast.error("Please upload PSA Negative Certification");
            return;
        }
        if (!files.form3a && !previews.form3a) {
            toast.error("Please upload Form 3A (Local Registry Copy)");
            return;
        }

        setSubmitting(true);
        try {
            const data = new FormData();
            data.append("typeId", typeId);
            data.append("registryType", "MARRIAGE_PSA_ENDORSEMENT");
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
                address: resident ? `Brgy. ${resident.barangay}, Mapandan` : ""
            };
            data.append("residentSnapshot", JSON.stringify(residentSnapshot));

            const fileUrls: Record<string, string> = {};

            // First, copy any existing public URLs from previews
            Object.entries(previews || {}).forEach(([key, url]) => {
                if (url && typeof url === "string" && url.startsWith("http")) {
                    fileUrls[key] = url;
                }
            });

            const fileEntries = Object.entries(files);
            for (let i = 0; i < fileEntries.length; i++) {
                const [key, file] = fileEntries[i];
                if (!file) continue;
                const sanitizedKey = key.replace(/[^a-zA-Z0-9_-]/g, '_');

                if (fileUrls[key]) {
                    console.log(`[ClientUpload] Reusing existing public URL for ${key}:`, fileUrls[key]);
                    continue;
                }

                try {
                    toast.loading(`Uploading document ${i + 1}/${fileEntries.length}...`, { id: "upload-toast" });
                    const userId = resident?.id || "anonymous";
                    const url = await uploadFileClientSide(file, sanitizedKey, userId);
                    fileUrls[key] = url;
                } catch (uploadErr) {
                    console.error(`[ClientUpload] Failed to upload ${key}:`, uploadErr);
                    toast.error(`Failed to upload document: ${key}. Please try again.`, { id: "upload-toast" });
                    setSubmitting(false);
                    return;
                }
            }
            toast.dismiss("upload-toast");

            const additionalData = {
                ...formData,
                psaEndorsementFee: 200,
                ...fileUrls
            };
            data.append("additionalData", JSON.stringify(additionalData));

            const res = await submitCivilRegistryTransaction(data);

            if (res.success && res.data) {
                toast.success(revisionId ? "Revision resubmitted successfully!" : "Marriage PSA Endorsement submitted successfully!");
                sessionStorage.removeItem("marriage-psa-endorsement-step");
                sessionStorage.removeItem("marriage-psa-endorsement-form");
                await clearDraftFiles(STORAGE_KEY);
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

    const nextStep = () => {
        if (currentStep === "INFORMANT") {
            if (!validateStep("INFORMANT")) return;
            setCurrentStep("SUBJECT");
        } else if (currentStep === "SUBJECT") {
            if (!validateStep("SUBJECT")) return;
            setCurrentStep("REVIEW");
        }
    };

    const prevStep = () => {
        if (currentStep === "SUBJECT") setCurrentStep("INFORMANT");
        else if (currentStep === "REVIEW") setCurrentStep("SUBJECT");
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
                                <BreadcrumbPage className="text-[10px] font-black uppercase tracking-widest italic text-emerald-700 dark:text-emerald-400">Marriage PSA Endorsement</BreadcrumbPage>
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
                                Marriage <span style={{ color: themeColor }}>PSA Endorsement</span>
                            </h1>

                            <p className="text-slate-600 dark:text-slate-300 font-medium text-xs leading-relaxed max-w-xl italic">
                                Formally request the Local Civil Registry to endorse a verified marriage certificate record to the Philippine Statistics Authority (PSA) database.
                            </p>
                        </div>

                        <div className="flex flex-col items-end gap-2 relative z-10 shrink-0">
                            <div className="hidden md:block w-28 h-28 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/10 backdrop-blur-md flex flex-col items-center justify-center text-center p-4 shadow-sm dark:shadow-2xl relative overflow-hidden group hover:scale-105 transition-transform duration-500 mb-2">
                                <div className="absolute inset-0 bg-gradient-to-tr opacity-0 group-hover:opacity-10 transition-opacity" style={{ backgroundImage: `linear-gradient(to top right, ${themeColor}, transparent)` }} />
                                <CheckCircle2 className="w-8 h-8 mb-1.5 opacity-80" style={{ color: themeColor }} />
                                <p className="text-[7px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 leading-tight">Secure Filing</p>
                            </div>
                        </div>
                    </div>

                    {/* Progress Stepper */}
                    <div className="grid grid-cols-4 gap-1.5 md:gap-4 relative px-1 md:px-2">
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
                                            isCompleted ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30" :
                                                "bg-slate-100 dark:bg-white/5 text-slate-400 border-transparent group-hover:border-primary/30"
                                    )}
                                    style={isActive ? { backgroundColor: themeColor, borderColor: themeColor } : {}}
                                    >
                                        <Icon className="w-4 h-4 md:w-7 md:h-7" />
                                    </div>
                                    <span className={cn(
                                        "text-[7px] md:text-[10px] uppercase tracking-widest text-center italic hidden sm:block",
                                        isActive ? "opacity-100 font-black" : "opacity-40 group-hover:opacity-100 transition-opacity"
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
                                                <div className="space-y-1.5 col-span-1 md:col-span-1">
                                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1">Relationship to Spouse <span className="text-red-500">*</span></Label>
                                                    <Select
                                                        value={formData.relationship}
                                                        onValueChange={(v) => handleSelectChange("relationship", v)}
                                                    >
                                                        <SelectTrigger className={cn("!h-12 w-full rounded-xl border-slate-950 dark:border-white focus:ring-emerald-500 shadow-sm text-xs md:text-sm bg-white dark:bg-slate-900 transition-all font-bold italic", (showErrors && !formData.relationship) ? "border-2 border-red-500 focus:ring-red-500" : "")}>
                                                            <SelectValue placeholder="SELECT RELATIONSHIP" />
                                                        </SelectTrigger>
                                                        <SelectContent className="rounded-xl border-slate-200 dark:border-white/10 italic">
                                                            <SelectItem value="SELF">SELF (HUSBAND / WIFE)</SelectItem>
                                                            <SelectItem value="CHILD">CHILD</SelectItem>
                                                            <SelectItem value="PARENT">PARENT</SelectItem>
                                                            <SelectItem value="SIBLING">SIBLING</SelectItem>
                                                            <SelectItem value="RELATIVE">OTHER RELATIVE</SelectItem>
                                                            <SelectItem value="REPRESENTATIVE">AUTHORIZED REPRESENTATIVE</SelectItem>
                                                        </SelectContent>
                                                    </Select>
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

                                        <div className="p-4 rounded-2xl mt-6 border" style={{ backgroundColor: `${themeColor}0d`, borderColor: `${themeColor}1a` }}>
                                            <p className="text-[10px] font-black uppercase italic tracking-wider flex items-center gap-2" style={{ color: themeColor }}>
                                                <Sparkles className="w-4 h-4" /> NOTE: CHANGES WILL UPDATE YOUR RESIDENT PROFILE UPON SUBMISSION.
                                            </p>
                                        </div>
                                    </Card>

                                    <div className="flex justify-end pt-4">
                                        <Button
                                            onClick={nextStep}
                                            className="h-14 px-10 rounded-full text-white font-black uppercase italic tracking-widest shadow-lg shadow-emerald-500/10 hover:opacity-90 transition-opacity"
                                            style={{ backgroundColor: themeColor }}
                                        >
                                            Next Step <ArrowRight className="ml-2 w-5 h-5" />
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* ===== STEP 2: SPOUSE INFO & DOCUMENTS ===== */}
                            {currentStep === "SUBJECT" && (
                                <div className="space-y-8">
                                    <Card className="p-8 rounded-[2rem] border border-slate-200/50 dark:border-white/5 bg-white dark:bg-[#0f1117] shadow-xl dark:shadow-2xl space-y-8">
                                        <div className="space-y-6">
                                            <h3 className="text-xl font-black uppercase italic tracking-tight flex items-center gap-2" style={{ color: themeColor }}>
                                                Marriage Details
                                            </h3>
                                            <p className="text-xs text-slate-400 font-bold italic">Provide the details of the marriage record that needs PSA endorsement</p>

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

                                        <div className="border-t border-slate-200/60 dark:border-white/5 pt-8 space-y-6">
                                            <div className="space-y-2">
                                                <h3 className="text-xl font-black uppercase italic tracking-tight flex items-center gap-2" style={{ color: themeColor }}>
                                                    Required Documents
                                                </h3>
                                                <p className="text-xs text-slate-400 font-bold italic">
                                                    Please upload clear photos or scanned copies of the following requirements.
                                                </p>
                                            </div>

                                            <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-500/5 border border-amber-200/60 dark:border-amber-500/20">
                                                <div className="flex items-start gap-3">
                                                    <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                                                    <div>
                                                        <p className="text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-300">PSA Negative Certification Required</p>
                                                        <p className="text-[9px] text-amber-600/80 dark:text-amber-400/80 italic mt-1">
                                                            This is strictly required as proof that the record is not available in the national database. Obtain this from any PSA Serbilis outlet.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                {renderDocCard("PSA Negative Certification", "psaNegativeCert", true)}
                                                {renderDocCard("Form 3A (Local Registry Copy)", "form3a", true)}
                                            </div>
                                        </div>
                                    </Card>

                                    <div className="flex justify-end gap-4 pt-4">
                                        <Button variant="outline" onClick={prevStep} className="h-14 px-8 rounded-full font-black uppercase italic tracking-widest">
                                            Back
                                        </Button>
                                        <Button
                                            onClick={nextStep}
                                            className="h-14 px-10 rounded-full text-white font-black uppercase italic tracking-widest shadow-lg shadow-emerald-500/10 hover:opacity-90 transition-opacity"
                                            style={{ backgroundColor: themeColor }}
                                        >
                                            Next Step <ArrowRight className="ml-2 w-5 h-5" />
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* ===== STEP 3: REVIEW & SUBMIT ===== */}
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
                                                <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 border-b pb-2">Documents & Fee</h5>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    <div className={cn(
                                                        "flex items-center gap-3 p-3 rounded-xl border",
                                                        (files.psaNegativeCert || previews.psaNegativeCert) ? "bg-emerald-50/30 dark:bg-emerald-500/5 border-emerald-200/50 dark:border-emerald-500/20" : "bg-red-50/30 border-red-200/50"
                                                    )}>
                                                        {(files.psaNegativeCert || previews.psaNegativeCert) ? <Check className="w-4 h-4 text-emerald-500 shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />}
                                                        <div>
                                                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">PSA Negative Certification</p>
                                                            <p className="text-[8px] text-slate-400 italic">{files.psaNegativeCert ? files.psaNegativeCert.name : previews.psaNegativeCert ? "Attached from previous draft" : "Not uploaded"}</p>
                                                        </div>
                                                    </div>
                                                    <div className={cn(
                                                        "flex items-center gap-3 p-3 rounded-xl border",
                                                        (files.form3a || previews.form3a) ? "bg-emerald-50/30 dark:bg-emerald-500/5 border-emerald-200/50 dark:border-emerald-500/20" : "bg-red-50/30 border-red-200/50"
                                                    )}>
                                                        {(files.form3a || previews.form3a) ? <Check className="w-4 h-4 text-emerald-500 shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />}
                                                        <div>
                                                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">Form 3A</p>
                                                            <p className="text-[8px] text-slate-400 italic">{files.form3a ? files.form3a.name : previews.form3a ? "Attached from previous draft" : "Not uploaded"}</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/40 dark:border-white/5 flex items-center justify-between gap-4">
                                                    <div className="space-y-1">
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">PSA Endorsement Fee</span>
                                                        <p className="text-xs font-bold text-slate-500 italic">Standard processing fee for PSA endorsement</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-2xl font-black uppercase italic tracking-tight text-rose-500">₱200.00</span>
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
                                                    <div className="text-[10px] text-slate-500 italic mt-1 leading-relaxed">I AUTHORIZE THE LGU TO PROCESS MY PERSONAL INFORMATION IN ACCORDANCE WITH THE DATA PRIVACY ACT. CLICK TO REVIEW AGREEMENT.</div>
                                                    {(showErrors && !policyAccepted) && (
                                                        <p className="text-[9px] font-black text-red-500 uppercase italic tracking-widest mt-1 animate-pulse">Agreement required before submitting</p>
                                                    )}
                                                </div>
                                                <button type="button" onClick={() => setPolicyOpen(true)} className="text-[10px] font-black italic text-rose-600 shrink-0">Review</button>
                                            </div>
                                        </div>
                                    </Card>

                                    <div className="flex justify-end gap-4 pt-4">
                                        <Button variant="outline" onClick={prevStep} className="h-14 px-8 rounded-full font-black uppercase italic tracking-widest">
                                            Back
                                        </Button>
                                        <Button
                                            onClick={handleSubmit}
                                            disabled={submitting || (!files.psaNegativeCert && !previews.psaNegativeCert) || (!files.form3a && !previews.form3a)}
                                            className={cn(
                                                "h-14 px-12 rounded-full font-black uppercase italic tracking-widest shadow-xl transition-all duration-300",
                                                ((!files.psaNegativeCert && !previews.psaNegativeCert) || (!files.form3a && !previews.form3a))
                                                    ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                                                    : "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-500/20"
                                            )}
                                        >
                                            {submitting ? (
                                                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                            ) : ((!files.psaNegativeCert && !previews.psaNegativeCert) || (!files.form3a && !previews.form3a)) ? (
                                                <>
                                                    Upload Required Documents
                                                    <AlertCircle className="w-5 h-5 mr-2" />
                                                </>
                                            ) : (
                                                <>
                                                    <CheckCircle2 className="w-5 h-5 mr-2" />
                                                    Confirm & Submit
                                                </>
                                            )}
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
