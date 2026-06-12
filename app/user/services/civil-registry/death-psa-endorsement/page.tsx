"use client";

import React, { useState, useEffect } from "react";
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
    Skull,
    ArrowRight,
    Upload,
    CheckCircle2,
    FileText
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
} from "@/app/admin/transactions/actions";
import {
    ensureDeathEndorsementTransactionType,
    getLatestForm2AForCurrentUser
} from "@/app/admin/transactions/death-endorsement-actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { saveDraftFile, getDraftFiles, clearDraftFiles } from "@/lib/draftDb";
import { compressImage } from "@/lib/image-compression";
import { supabase } from "@/lib/supabase";
import PremiumDocumentUpload from "@/components/shared/PremiumDocumentUpload";

// --- UPLOAD FILE CLIENT-SIDE TO SUPABASE STORAGE ---
async function uploadFileClientSide(file: File, fieldName: string, userId: string): Promise<string> {
    const fileExt = file.name.split('.').pop() || 'bin';
    const fileName = `${userId}/${fieldName}_${Date.now()}.${fileExt}`;
    const filePath = `services/lcr/death_psa_endorsement/${fileName}`;

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


const STORAGE_KEY = "lcr_death_psa_endorsement_draft";

type Step = "INFORMANT" | "SUBJECT" | "REVIEW";

const STEPS: { id: Step; label: string; icon: any }[] = [
    { id: "INFORMANT", label: "Informant Info", icon: User },
    { id: "SUBJECT", label: "Deceased & Documents", icon: FileText },
    { id: "REVIEW", label: "Review & Submit", icon: CheckCircle2 },
];

export default function DeathPsaEndorsementPage() {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState<Step>("INFORMANT");
    const [mounted, setMounted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [themeColor, setThemeColor] = useState("theme_color");

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
        // Subject (Deceased) fields
        subjectFullName: "",
        subjectDateOfDeath: "",
        mothersMaidenName: "",
        fathersName: "",
        placeOfDeath: "",
        causeOfDeath: "",
    });

    const [files, setFiles] = useState<Record<string, File | null>>({
        psaNegativeCert: null,
        form2a: null,
    });

    // Privacy / Terms modal state
    const [policyOpen, setPolicyOpen] = useState(false);
    const [policyAccepted, setPolicyAccepted] = useState(false);

    const handleAcceptPolicy = () => { setPolicyOpen(false); setPolicyAccepted(true); };

    // Restore progress from session storage & IndexedDB
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get("revisionId")) return;

        const savedStep = sessionStorage.getItem("death-psa-endorsement-step");
        const savedForm = sessionStorage.getItem("death-psa-endorsement-form");

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
                if (draftFiles && Object.keys(draftFiles).length > 0) {
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
            sessionStorage.setItem("death-psa-endorsement-step", currentStep);
            sessionStorage.setItem("death-psa-endorsement-form", JSON.stringify(formData));
        }
    }, [currentStep, formData, loading, revisionId]);

    useEffect(() => {
        async function init() {
            try {
                await ensureDeathEndorsementTransactionType();

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
                        const fileKeys = ["psaNegativeCert", "form2a"];
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
                            subjectFullName: addData.subjectFullName || "",
                            subjectDateOfDeath: addData.subjectDateOfDeath || "",
                            mothersMaidenName: addData.mothersMaidenName || "",
                            fathersName: addData.fathersName || "",
                            placeOfDeath: addData.placeOfDeath || "",
                            causeOfDeath: addData.causeOfDeath || "",
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
                    const psaType = typesResult.data.find((t: any) => t.code === "LCR_DEATH_PSA_ENDORSEMENT");
                    if (psaType) {
                        setTypeId(psaType.id);
                    }
                }

                if (!txData) {
                    // Check for latest Form 2A and auto-attach if no draft exists
                    const latestRes = await getLatestForm2AForCurrentUser();
                    if (latestRes.success && latestRes.data) {
                        const draftFiles = await getDraftFiles(STORAGE_KEY);
                        if (!draftFiles?.form2a) {
                            const { docUrl, subjectName, dateOfDeath, mothersMaidenName, fathersName, placeOfDeath, causeOfDeath } = latestRes.data;
                            setFormData(prev => ({
                                ...prev,
                                subjectFullName: prev.subjectFullName || (subjectName ? subjectName.toUpperCase() : ""),
                                subjectDateOfDeath: prev.subjectDateOfDeath || (dateOfDeath ? new Date(dateOfDeath).toISOString().split('T')[0] : ""),
                                mothersMaidenName: prev.mothersMaidenName || (mothersMaidenName ? mothersMaidenName.toUpperCase() : ""),
                                fathersName: prev.fathersName || (fathersName ? fathersName.toUpperCase() : ""),
                                placeOfDeath: prev.placeOfDeath || (placeOfDeath ? placeOfDeath.toUpperCase() : ""),
                                causeOfDeath: prev.causeOfDeath || (causeOfDeath ? causeOfDeath.toUpperCase() : "")
                            }));

                            if (docUrl) {
                                try {
                                    const response = await fetch(docUrl);
                                    const blob = await response.blob();
                                    const filename = docUrl.split('/').pop() || "form_2a.pdf";
                                    const file = new File([blob], filename, { type: blob.type });

                                    setFiles(prev => ({ ...prev, form2a: file }));
                                    await saveDraftFile(STORAGE_KEY, "form2a", file);
                                    toast.success("Latest Form 2A found and automatically attached from your transactions!");
                                } catch (err) {
                                    console.error("Failed to download Form 2A file:", err);
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
            setFiles(prev => ({ ...prev, form2a: null }));
            saveDraftFile(STORAGE_KEY, "form2a", null).catch(err => {
                console.error("Failed to delete draft Form 2A file:", err);
            });

            const promise = (async () => {
                const res = await getLatestForm2AForCurrentUser();
                if (res.success && res.data) {
                    const { docUrl, subjectName, dateOfDeath, mothersMaidenName, fathersName, placeOfDeath, causeOfDeath } = res.data;

                    setFormData(prev => ({
                        ...prev,
                        subjectFullName: subjectName ? subjectName.toUpperCase() : prev.subjectFullName,
                        subjectDateOfDeath: dateOfDeath ? new Date(dateOfDeath).toISOString().split('T')[0] : prev.subjectDateOfDeath,
                        mothersMaidenName: mothersMaidenName ? mothersMaidenName.toUpperCase() : prev.mothersMaidenName,
                        fathersName: fathersName ? fathersName.toUpperCase() : prev.fathersName,
                        placeOfDeath: placeOfDeath ? placeOfDeath.toUpperCase() : prev.placeOfDeath,
                        causeOfDeath: causeOfDeath ? causeOfDeath.toUpperCase() : prev.causeOfDeath
                    }));

                    if (docUrl) {
                        try {
                            const response = await fetch(docUrl);
                            const blob = await response.blob();
                            const filename = docUrl.split('/').pop() || "form_2a.pdf";
                            const file = new File([blob], filename, { type: blob.type });

                            setFiles(prev => ({ ...prev, form2a: file }));
                            setPreviews(prev => ({ ...prev, form2a: docUrl }));
                            await saveDraftFile(STORAGE_KEY, "form2a", file);
                            toast.success("Latest Form 2A found and automatically attached from your transactions!");
                        } catch (err) {
                            console.error("Failed to download Form 2A file:", err);
                        }
                    }
                }
            })();
            toast.promise(promise, {
                loading: "Checking for your latest issued Form 2A in transactions...",
                success: "Form 2A status checked.",
                error: "Failed to check or fetch Form 2A document."
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

                    let fileToProcess = newFile;
                    if (newFile.type.startsWith("image/")) {
                        try {
                            toast.loading("Compressing and optimizing document...", { id: `file-compress-${fileKey}` });
                            fileToProcess = await compressImage(newFile);
                            toast.success("Image optimized successfully!", { id: `file-compress-${fileKey}` });
                        } catch (err) {
                            console.error("Compression error:", err);
                            toast.dismiss(`file-compress-${fileKey}`);
                        }
                    }

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
        if (!files.form2a && !previews.form2a) {
            toast.error("Please upload Form 2A (Local Registry Copy)");
            return;
        }

        setSubmitting(true);
        try {
            const data = new FormData();
            data.append("typeId", typeId);
            data.append("registryType", "DEATH_PSA_ENDORSEMENT");
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
                subjectName: formData.subjectFullName,
                psaEndorsementFee: 200,
                ...fileUrls
            };
            data.append("additionalData", JSON.stringify(additionalData));

            const res = await submitCivilRegistryTransaction(data);

            if (res.success && res.data) {
                toast.success(revisionId ? "Revision resubmitted successfully!" : "Death PSA Endorsement submitted successfully!");
                sessionStorage.removeItem("death-psa-endorsement-step");
                sessionStorage.removeItem("death-psa-endorsement-form");
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

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950">
                <Loader2 className="w-10 h-10 animate-spin text-emerald-500 mb-4" />
                <p className="font-black uppercase tracking-widest text-[10px] text-slate-400 italic">Initializing Endorsement Form...</p>
            </div>
        );
    }

    return (
        <>
            <style dangerouslySetInnerHTML={{
                __html: `
                :root, * {
                    --primary-theme: ${themeColor} !important;
                }
                .text-emerald-500, [class*="text-emerald-500"]:not(input):not(select):not(textarea) {
                    color: ${themeColor} !important;
                }
                .text-emerald-600, [class*="text-emerald-600"]:not(input):not(select):not(textarea) {
                    color: ${themeColor} !important;
                }
                .bg-emerald-500, [class*="bg-emerald-500"] {
                    background-color: ${themeColor} !important;
                }
                .bg-emerald-600, [class*="bg-emerald-600"] {
                    background-color: ${themeColor} !important;
                }
                .border-emerald-500, [class*="border-emerald-500"] {
                    border-color: ${themeColor} !important;
                }
                .border-emerald-600, [class*="border-emerald-600"] {
                    border-color: ${themeColor} !important;
                }
                .bg-emerald-500\\/10, [class*="bg-emerald-500/10"] {
                    background-color: ${themeColor}1a !important;
                }
                .bg-emerald-500\\/20, [class*="bg-emerald-500/20"] {
                    background-color: ${themeColor}33 !important;
                }
                .bg-emerald-500\\/5, [class*="bg-emerald-500/5"] {
                    background-color: ${themeColor}0d !important;
                }
                .shadow-emerald-500\\/20, [class*="shadow-emerald-500/20"] {
                    --tw-shadow-color: ${themeColor}33 !important;
                }
                .hover\\:bg-emerald-600:hover, [class*="hover:bg-emerald-600"]:hover {
                    background-color: ${themeColor} !important;
                    filter: brightness(0.9);
                }
                .hover\\:border-emerald-500\\/50:hover, [class*="hover:border-emerald-500/50"]:hover {
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
                            <BreadcrumbPage className="text-[10px] font-black uppercase tracking-widest italic text-emerald-700 dark:text-emerald-400">Death PSA Endorsement</BreadcrumbPage>
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
                                Death PSA <span style={{ color: themeColor }}>Endorsement</span>
                            </h1>

                            <p className="text-slate-600 dark:text-slate-300 font-medium text-xs leading-relaxed max-w-xl italic">
                                Request endorsement of a verified local death certificate record to the Philippine Statistics Authority (PSA).
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
                    <div className="relative px-2 py-4">
                        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-100 dark:bg-white/5 -translate-y-1/2 rounded-full overflow-hidden">
                            <motion.div
                                className="h-full bg-emerald-500"
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
                                    <div key={idx} className="flex flex-col items-center gap-2 transition-all duration-300">
                                        <div className={cn(
                                            "w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all duration-500 border-2 bg-white dark:bg-[#08090d]",
                                            isActive ? "border-emerald-500 text-emerald-600 shadow-lg shadow-emerald-500/20 scale-110" :
                                                isCompleted ? "bg-emerald-500 border-emerald-500 text-white" :
                                                    "border-slate-200 dark:border-white/10 text-slate-400"
                                        )}>
                                            {isCompleted ? <Check className="w-5 h-5" /> : <Icon className="w-4 h-4 md:w-5 md:h-5" />}
                                        </div>
                                        <span className={cn(
                                            "text-[8px] md:text-[10px] font-black uppercase tracking-wider italic hidden md:block",
                                            isActive ? "text-emerald-600" : "text-slate-400"
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
                                        className="h-full bg-emerald-500"
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
                                    <div className="space-y-2">
                                        <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight">Informant Information</h2>
                                        <p className="text-xs text-slate-500 font-medium italic">Your details as the requesting informant</p>
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
                                            <Select
                                                value={formData.relationship}
                                                onValueChange={(v) => handleSelectChange("relationship", v)}
                                            >
                                                <SelectTrigger className={cn("h-12 rounded-xl focus:ring-emerald-500 shadow-sm text-xs md:text-sm bg-white dark:bg-slate-900 transition-all font-bold", (showErrors && !formData.relationship) ? "border-2 border-red-500" : "border border-slate-200 dark:border-white/10")}>
                                                    <SelectValue placeholder="SELECT RELATIONSHIP" />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-xl border-slate-200 dark:border-white/10 italic">
                                                    <SelectItem value="SPOUSE">SPOUSE</SelectItem>
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

                                        {/* Personal Details Grid */}
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                            <div className="md:col-span-1 space-y-2">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1">First Name</Label>
                                                <Input readOnly value={formData.informantFirstName} className="rounded-xl border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/50 h-12 font-bold italic text-slate-600" />
                                            </div>
                                            <div className="md:col-span-1 space-y-2">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1">Middle Name</Label>
                                                <Input readOnly value={formData.informantMiddleName} className="rounded-xl border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/50 h-12 font-bold italic text-slate-600" />
                                            </div>
                                            <div className="md:col-span-1 space-y-2">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1">Last Name</Label>
                                                <Input readOnly value={formData.informantLastName} className="rounded-xl border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/50 h-12 font-bold italic text-slate-600" />
                                            </div>
                                            <div className="md:col-span-1 space-y-2">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1">Suffix</Label>
                                                <Input readOnly value={formData.informantSuffix} className="rounded-xl border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/50 h-12 font-bold italic text-slate-600" />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1">Birth Date</Label>
                                                <Input readOnly value={formData.informantBirthDate} type="date" className="rounded-xl border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/50 h-12 font-bold italic text-slate-600" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1">Age</Label>
                                                <Input readOnly value={formData.informantAge} className="rounded-xl border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/50 h-12 font-bold italic text-slate-600" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1">Civil Status</Label>
                                                <Input readOnly value={formData.informantCivilStatus} className="rounded-xl border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/50 h-12 font-bold italic text-slate-600" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1">Citizenship</Label>
                                                <Input readOnly value={formData.informantCitizenship} className="rounded-xl border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/50 h-12 font-bold italic text-slate-600" />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1">Informant Address</Label>
                                            <Input
                                                readOnly
                                                className="rounded-xl border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/50 h-12 transition-all font-bold italic text-slate-600 uppercase"
                                                value={formData.informantAddress}
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1">Occupation</Label>
                                                <Input readOnly className="rounded-xl border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/50 h-12 font-bold italic text-slate-600" value={formData.informantOccupation} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1">Contact Number <span className="text-red-500">*</span></Label>
                                                <Input
                                                    className={cn(
                                                        "rounded-xl bg-white dark:bg-slate-900 h-12 transition-all font-bold italic",
                                                        (showErrors && !formData.contactNumber) ? "border-2 border-red-500" : "border border-slate-200 dark:border-white/10"
                                                    )}
                                                    placeholder="e.g. 0917XXXXXXX"
                                                    value={formData.contactNumber}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, contactNumber: e.target.value.replace(/[^0-9]/g, '') }))}
                                                />
                                                {(showErrors && !formData.contactNumber) && (
                                                    <p className="text-[9px] font-black text-red-500 uppercase italic tracking-widest ml-1 animate-pulse">Required</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex justify-end pt-6">
                                        <Button
                                            onClick={() => {
                                                if (!formData.relationship || !formData.contactNumber) {
                                                    setShowErrors(true);
                                                    toast.error("Please fill in all required informant details.");
                                                    return;
                                                }
                                                setShowErrors(false);
                                                setCurrentStep("SUBJECT");
                                            }}
                                            className="rounded-full px-12 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest italic text-[10px] h-12 shadow-xl shadow-emerald-500/20"
                                        >
                                            Next Step
                                            <ArrowRight className="w-4 h-4 ml-2" />
                                        </Button>
                                    </div>
                                </motion.div>
                            )}

                            {/* ===== STEP 2: DECEASED INFO & DOCUMENTS ===== */}
                            {currentStep === "SUBJECT" && (
                                <motion.div
                                    key="subject-step"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 1.05 }}
                                    className="space-y-6"
                                >
                                    <div className="space-y-2">
                                        <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight flex items-center gap-2">
                                            Deceased Information & Documents
                                        </h2>
                                        <p className="text-xs text-slate-500 font-medium italic">Provide the details of the deceased person whose record needs PSA endorsement</p>
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
                                                    "rounded-xl bg-white dark:bg-slate-900 h-12 transition-all uppercase font-medium",
                                                    (showErrors && !formData.subjectFullName) ? "border-2 border-red-500" : "border border-slate-200 dark:border-white/10"
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
                                                    "rounded-xl bg-white dark:bg-slate-900 h-12 transition-all font-medium",
                                                    (showErrors && !formData.subjectDateOfDeath) ? "border-2 border-red-500" : "border border-slate-200 dark:border-white/10"
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
                                                    "rounded-xl bg-white dark:bg-slate-900 h-12 transition-all uppercase font-medium",
                                                    (showErrors && !formData.mothersMaidenName) ? "border-2 border-red-500" : "border border-slate-200 dark:border-white/10"
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
                                                className="rounded-xl border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 h-12 transition-all uppercase font-medium"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1">Place of Death</Label>
                                            <Input
                                                name="placeOfDeath"
                                                placeholder="ENTER PLACE OF DEATH"
                                                value={formData.placeOfDeath}
                                                onChange={handleInputChange}
                                                className="rounded-xl border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 h-12 transition-all uppercase font-medium"
                                            />
                                        </div>
                                    </div>

                                    {/* Documents Section */}
                                    <div className="space-y-4 pt-4">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1.5 bg-emerald-500/10 rounded-lg">
                                                <Upload className="w-3.5 h-3.5 text-emerald-500" />
                                            </div>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Required Documents</span>
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

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {renderDocCard("PSA Negative Certification", "psaNegativeCert", true)}
                                            {renderDocCard("Form 2A (Local Registry Copy)", "form2a", true)}
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-3 pt-6">
                                        <Button
                                            variant="ghost"
                                            onClick={() => setCurrentStep("INFORMANT")}
                                            className="rounded-full px-8 border-slate-200 dark:border-white/10 font-black uppercase tracking-widest italic text-[10px] h-12"
                                        >
                                            <ArrowRight className="w-4 h-4 mr-2 rotate-180" />
                                            Back
                                        </Button>
                                        <Button
                                            onClick={() => {
                                                if (!formData.subjectFullName || !formData.subjectDateOfDeath || !formData.mothersMaidenName) {
                                                    setShowErrors(true);
                                                    toast.error("Please fill in all required deceased details.");
                                                    return;
                                                }
                                                if (!files.psaNegativeCert && !previews.psaNegativeCert) {
                                                    setShowErrors(true);
                                                    toast.error("Please upload PSA Negative Certification.");
                                                    return;
                                                }
                                                if (!files.form2a && !previews.form2a) {
                                                    setShowErrors(true);
                                                    toast.error("Please upload Form 2A (Local Registry Copy).");
                                                    return;
                                                }
                                                setShowErrors(false);
                                                setCurrentStep("REVIEW");
                                            }}
                                            className="rounded-full px-12 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest italic text-[10px] h-12 shadow-xl shadow-emerald-500/20"
                                        >
                                            Proceed to Review
                                            <ArrowRight className="w-4 h-4 ml-2" />
                                        </Button>
                                    </div>
                                </motion.div>
                            )}

                            {/* ===== STEP 3: REVIEW & SUBMIT ===== */}
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
                                            <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight">Endorsement Review</h2>
                                            <p className="text-xs text-slate-500 font-medium italic">Verify information before submission</p>
                                        </div>
                                    </div>

                                    <Card className="bg-slate-50 dark:bg-white/5 border-none p-6 rounded-[2rem] space-y-4">
                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-1">
                                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 italic">Informant</span>
                                                <p className="font-black text-slate-900 dark:text-white italic uppercase">{resident?.firstName} {resident?.lastName} ({formData.relationship})</p>
                                            </div>
                                            <div className="space-y-1">
                                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 italic">Contact</span>
                                                <p className="font-black text-slate-900 dark:text-white italic">{formData.contactNumber}</p>
                                            </div>
                                            <div className="space-y-1 col-span-2">
                                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 italic">Informant Address</span>
                                                <p className="font-black text-slate-900 dark:text-white italic uppercase">{formData.informantAddress || "N/A"}</p>
                                            </div>
                                            <div className="col-span-2 border-t border-slate-200 dark:border-white/5 pt-4 space-y-1">
                                                <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500 italic">Deceased Name (To Endorse)</span>
                                                <p className="font-black text-slate-900 dark:text-white italic uppercase text-lg">{formData.subjectFullName}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 italic">Date of Death</span>
                                                <p className="font-black text-slate-900 dark:text-white italic">{formData.subjectDateOfDeath}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 italic">Mother&apos;s Maiden Name</span>
                                                <p className="font-black text-slate-900 dark:text-white italic uppercase">{formData.mothersMaidenName}</p>
                                            </div>
                                        </div>

                                        {/* Documents Summary */}
                                        <div className="pt-4 border-t border-slate-200 dark:border-white/5 space-y-3">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Uploaded Documents</span>
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
                                                    (files.form2a || previews.form2a) ? "bg-emerald-50/30 dark:bg-emerald-500/5 border-emerald-200/50 dark:border-emerald-500/20" : "bg-red-50/30 border-red-200/50"
                                                )}>
                                                    {(files.form2a || previews.form2a) ? <Check className="w-4 h-4 text-emerald-500 shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />}
                                                    <div>
                                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">Form 2A</p>
                                                        <p className="text-[8px] text-slate-400 italic">{files.form2a ? files.form2a.name : previews.form2a ? "Attached from previous draft" : "Not uploaded"}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Fee Display */}
                                        <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/60 dark:border-emerald-500/20">
                                            <div>
                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">PSA Endorsement Fee</span>
                                                <p className="text-[9px] text-slate-400 italic mt-0.5">Standard processing fee for PSA endorsement</p>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-lg font-black text-emerald-600 tracking-tight">₱200.00</span>
                                            </div>
                                        </div>
                                    </Card>

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
                                                    ? "bg-emerald-50/20 border-emerald-500/30"
                                                    : showErrors
                                                        ? "border-2 border-red-500"
                                                        : "border-slate-200/40 bg-white/30 dark:bg-white/5 hover:border-emerald-500/20"
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
                                                <div className="text-[10px] text-slate-500 italic mt-1">I AUTHORIZE THE LGU TO PROCESS MY PERSONAL INFORMATION IN ACCORDANCE WITH THE DATA PRIVACY ACT. CLICK TO REVIEW AGREEMENT.</div>
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
                                                className="text-[10px] font-black italic text-emerald-600 hover:text-emerald-700 shrink-0"
                                            >
                                                Review
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                            <Button
                                                variant="ghost"
                                                onClick={() => setCurrentStep("SUBJECT")}
                                                className="h-14 rounded-full border-slate-200 dark:border-white/10 font-black uppercase tracking-widest italic text-[11px]"
                                            >
                                                <ArrowRight className="w-4 h-4 mr-2 rotate-180" />
                                                Modify Details
                                            </Button>
                                            <Button
                                                onClick={handleSubmit}
                                                disabled={submitting || (!files.psaNegativeCert && !previews.psaNegativeCert) || (!files.form2a && !previews.form2a)}
                                                className={cn(
                                                    "md:col-span-3 h-14 rounded-full font-black uppercase tracking-widest italic text-[11px] transition-all duration-300",
                                                    ((!files.psaNegativeCert && !previews.psaNegativeCert) || (!files.form2a && !previews.form2a))
                                                        ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                                                        : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl shadow-emerald-500/20"
                                                )}
                                            >
                                                {submitting ? (
                                                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                                ) : ((!files.psaNegativeCert && !previews.psaNegativeCert) || (!files.form2a && !previews.form2a)) ? (
                                                    <>
                                                        Upload Required Documents
                                                        <AlertCircle className="w-5 h-5 ml-2" />
                                                    </>
                                                ) : (
                                                    <>
                                                        Submit Death PSA Endorsement Application
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
                </div>
            </div>
        </>
    );
}
