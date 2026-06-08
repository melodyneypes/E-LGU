/* eslint-disable @next/next/no-img-element */
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
    Upload,
    AlertCircle,
    Eye,
    FileText
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
import { saveDraftFile, getDraftFiles, clearDraftFiles } from "@/lib/draftDb";

const PREVIEW_MAX_BYTES = 500 * 1024; // 500KB per preview target after compression

function estimateDataUrlSize(dataUrl: string) {
    const parts = dataUrl.split(',');
    if (parts.length < 2) return 0;
    const base64 = parts[1];
    const padding = (base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0);
    return Math.ceil(base64.length * 3 / 4) - padding;
}

function compressImageDataUrl(dataUrl: string, maxWidth = 1200, quality = 0.75): Promise<string> {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let { width, height } = img;
            if (width > maxWidth) {
                height = Math.round(height * (maxWidth / width));
                width = maxWidth;
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) return resolve(dataUrl);
            ctx.drawImage(img, 0, 0, width, height);
            try {
                const compressed = canvas.toDataURL('image/jpeg', quality);
                resolve(compressed);
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            } catch (_e) {
                resolve(dataUrl);
            }
        };
        img.onerror = () => resolve(dataUrl);
        img.src = dataUrl;
    });
}

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

export default function MarriageRegistrationPage() {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState<Step>("IDENTITY");
    const [mounted, setMounted] = useState(false);
    const [loading, setLoading] = useState(true);

    const [themeColor, setThemeColor] = useState("theme_color");
    const [lateFee, setLateFee] = useState<number>(300);

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

        // Marriage Details
        dateOfMarriage: "",
        placeOfMarriage: "MAPANDAN, PANGASINAN",

        email: "",
        contactNumber: "",
        relationship: "",
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
                    setForm(prev => ({
                        ...prev,
                        email: r.email || prev.email || "",
                        contactNumber: r.contactNumber || prev.contactNumber || "",
                        app1FullName: `${r.firstName} ${r.middleName ? r.middleName[0] + '. ' : ''}${r.lastName}`.toUpperCase(),
                        app1BirthDate: r.dateOfBirth ? new Date(r.dateOfBirth).toISOString().split('T')[0] : "",
                        app1BirthPlace: (r.placeOfBirth || r.municipality || "").toUpperCase(),
                        app1Citizenship: (r.citizenship || "FILIPINO").toUpperCase()
                    }));
                }

                if (typesResult.success && typesResult.data) {
                    const lcrTypes = typesResult.data.filter((t: any) => t.category === "Civil Registry");
                    const currentDbType = lcrTypes.find((t: any) => t.code === "LCR_MARRIAGE_REG");
                    if (currentDbType) {
                        setForm(prev => ({ ...prev, typeId: currentDbType.id }));
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

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, key: string) => {
        const file = e.target.files?.[0] || null;
        if (file) {
            if (file && file.size > 5 * 1024 * 1024) {
                toast.error("File size exceeds 5MB limit.");
                if (e && e.target && e.target.parentElement) {
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
                if (e && e.target) e.target.value = "";
                return;
            }
            // Save raw file to IndexedDB
            saveDraftFile(STORAGE_KEY, key, file).catch(err => {
                console.error("Failed to save draft file to IndexedDB:", err);
            });
            if (file.type.startsWith("image/")) {
                const reader = new FileReader();
                reader.onload = () => {
                    const dataUrl = reader.result as string | null;
                    if (!dataUrl) return;

                    // Set File reference
                    setForm(prev => ({ ...prev, files: { ...prev.files, [key]: file } }));

                    const size = estimateDataUrlSize(dataUrl);
                    if (size > PREVIEW_MAX_BYTES) {
                        // Compress preview
                        compressImageDataUrl(dataUrl).then((compressed) => {
                            const newSize = estimateDataUrlSize(compressed);
                            if (newSize <= PREVIEW_MAX_BYTES) {
                                setForm(prev => ({ ...prev, previews: { ...prev.previews, [key]: compressed } }));
                            } else {
                                setForm(prev => ({ ...prev, previews: { ...prev.previews, [key]: null } }));
                                toast.warning("Image preview too large to persist; draft preview not saved.");
                            }
                        }).catch(() => {
                            setForm(prev => ({ ...prev, previews: { ...prev.previews, [key]: null } }));
                        });
                    } else {
                        setForm(prev => ({ ...prev, previews: { ...prev.previews, [key]: dataUrl } }));
                    }
                };
                reader.readAsDataURL(file);
            } else {
                setForm(prev => ({
                    ...prev,
                    files: { ...prev.files, [key]: file },
                    previews: { ...prev.previews, [key]: null }
                }));
            }
        }
    };

    const handleSubmit = async () => {
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
                    citizenship: form.app1Citizenship
                },
                applicant2: {
                    isResident: form.app2IsResident,
                    fullName: form.app2FullName,
                    birthDate: form.app2BirthDate,
                    birthPlace: form.app2BirthPlace,
                    citizenship: form.app2Citizenship
                },
                dateOfMarriage: form.dateOfMarriage,
                placeOfMarriage: form.placeOfMarriage,
                email: form.email,
                contactNumber: form.contactNumber,
                relationship: form.relationship,
                subjectName: `${form.app1FullName} & ${form.app2FullName}`,
                totalAmount: form.registrationType === "LATE" ? lateFee : 0
            };

            // Debug: log additionalData to browser console to verify dateOfMarriage
            console.log("[LCR Submit] additionalData:", additionalData);
            formData.append("additionalData", JSON.stringify(additionalData));

            // Helper function to convert base64 to File object
            const dataURLtoFile = (dataurl: string, filename: string): File | null => {
                try {
                    const arr = dataurl.split(',');
                    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
                    const bstr = atob(arr[1]);
                    let n = bstr.length;
                    const u8arr = new Uint8Array(n);
                    while (n--) {
                        u8arr[n] = bstr.charCodeAt(n);
                    }
                    return new File([u8arr], filename, { type: mime });
                } catch (e) {
                    console.error("Failed to convert dataURL to File:", e);
                    return null;
                }
            };

            // Reconstruct any missing files from data URL previews (so reloads survive!)
            const finalFiles = { ...form.files };
            Object.entries(form.previews).forEach(([key, previewUrl]) => {
                if (previewUrl && previewUrl.startsWith("data:") && !finalFiles[key]) {
                    const reconstructedFile = dataURLtoFile(previewUrl, `${key}.png`);
                    if (reconstructedFile) {
                        finalFiles[key] = reconstructedFile;
                    }
                }
            });

            // Append files based on registration type
            Object.entries(finalFiles).forEach(([key, file]) => {
                if (file) formData.append(key, file);
            });

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
                toast.error("Please fill in all Applicant 1 details");
                return;
            }
            // Validate Applicant 2
            if (!form.app2FullName || !form.app2BirthDate || !form.app2BirthPlace || !form.app2Citizenship) {
                toast.error("Please fill in all Applicant 2 details");
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
            setForm(prev => ({
                ...prev,
                app2FullName: `${r.firstName} ${r.middleName ? r.middleName[0] + '. ' : ''}${r.lastName}`.toUpperCase(),
                app2BirthDate: r.dateOfBirth ? new Date(r.dateOfBirth).toISOString().split('T')[0] : "",
                app2BirthPlace: (r.placeOfBirth || r.municipality || "").toUpperCase(),
                app2Citizenship: (r.citizenship || "FILIPINO").toUpperCase()
            }));
            toast.success(`Fetched details for ${r.firstName} ${r.lastName}`);
        }
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
                .dark input:not([type="button"]):not([type="submit"]), .dark select, .dark textarea {
                    color: #f8fafc !important;
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
                <Breadcrumb>
                    <BreadcrumbList>
                        <BreadcrumbItem>
                            <BreadcrumbLink href="/" className="flex items-center gap-1 font-bold italic text-[11px] uppercase tracking-wider">
                                <Home className="w-3.5 h-3.5" />
                                Home
                            </BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbLink href="/user/services" className="font-bold italic text-[11px] uppercase tracking-wider">Services</BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbLink href="/user/services/civil-registry" className="font-bold italic text-[11px] uppercase tracking-wider">Civil Registry</BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbPage className="font-black italic text-[11px] uppercase tracking-wider text-rose-500">Marriage Registration</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>

                <div className="space-y-6">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-white dark:bg-[#0f1117] p-8 rounded-[2.5rem] border border-slate-200/50 dark:border-white/5 shadow-xl shadow-slate-200/40 dark:shadow-none">
                        <div className="space-y-2">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-rose-500/10 rounded-xl">
                                    <Heart className="w-6 h-6 text-rose-500" />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-rose-500">Local Civil Registry</span>
                            </div>
                            <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">
                                Marriage <span className="text-rose-500">Registration</span>
                            </h1>
                            <p className="text-slate-500 font-medium text-sm italic">File a request for official marriage records or register a new marriage.</p>
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
                                    <Card className="p-8 rounded-[2rem] border-slate-200/50 dark:border-white/5 space-y-6">
                                        <h3 className="text-lg font-black uppercase italic tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                                            Applicant 1
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
                                        </div>
                                    </Card>

                                    {/* Applicant 2 */}
                                    <Card className="p-8 rounded-[2rem] border-slate-200/50 dark:border-white/5 space-y-6">
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <h3 className="text-lg font-black uppercase italic tracking-tight text-slate-900 dark:text-white">
                                                Applicant 2
                                            </h3>
                                            <div className="flex items-center space-x-2">
                                                <Checkbox
                                                    id="app2Resident"
                                                    checked={form.app2IsResident}
                                                    onCheckedChange={(checked) => setForm({ ...form, app2IsResident: !!checked })}
                                                />
                                                <label htmlFor="app2Resident" className="text-xs font-bold italic text-slate-500 cursor-pointer">
                                                    Applicant 2 is a resident of Mapandan
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
                                    <Card className="p-8 rounded-[2rem] border-slate-200/50 dark:border-white/5 space-y-6">
                                        <h3 className="text-lg font-black uppercase italic tracking-tight text-slate-900 dark:text-white">
                                            Marriage Details
                                        </h3>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-1.5">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Registration Type <span className="text-rose-500">*</span></Label>
                                                <Select 
                                                    value={form.registrationType} 
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
                                                    className="bg-slate-50 dark:bg-white/5 border-none font-bold h-12 rounded-xl"
                                                    value={form.dateOfMarriage}
                                                    onChange={e => setForm({ ...form, dateOfMarriage: e.target.value })}
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

                                    <Card className="p-8 rounded-[2rem] border-slate-200/50 dark:border-white/5 space-y-8">
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
                                                <div className="space-y-4">
                                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Accomplished Certificate of Marriage <span className="text-rose-500">*</span></Label>
                                                    <div
                                                        onClick={() => document.getElementById('marriageCert')?.click()}
                                                        className={cn(
                                                            "aspect-video relative rounded-3xl border-2 border-dashed flex flex-col items-center justify-center gap-3 cursor-pointer transition-all group overflow-hidden",
                                                            (form.files.marriageCert || form.previews.marriageCert) ? "border-rose-500 bg-rose-500/5" : "border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5"
                                                        )}
                                                    >
                                                        {(form.files.marriageCert || form.previews.marriageCert) ? (
                                                            <div className="relative w-full h-full group/preview">
                                                                {checkIsPdf(form.files.marriageCert, form.previews.marriageCert) ? (
                                                                    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 dark:bg-[#151b2b] p-4 text-center">
                                                                        <FileText className="w-10 h-10 text-red-500 mb-2 animate-bounce" />
                                                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 max-w-[80%] truncate">
                                                                            {form.files.marriageCert ? form.files.marriageCert.name : "marriage_certificate.pdf"}
                                                                        </span>
                                                                    </div>
                                                                ) : (
                                                                    <img src={form.previews.marriageCert!} alt="Marriage certificate preview" className="absolute inset-0 w-full h-full object-cover" />
                                                                )}
                                                                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover/preview:opacity-100 transition-opacity z-20 gap-2">
                                                                    <Button
                                                                        type="button"
                                                                        size="sm"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleViewFile(form.files.marriageCert || null, form.previews.marriageCert || null, "Certificate of Marriage");
                                                                        }}
                                                                        className="font-black italic uppercase tracking-widest text-[9px] px-4 h-8 rounded-xl bg-white text-slate-900 hover:bg-slate-100 shadow-lg flex items-center gap-1.5 transition-all"
                                                                    >
                                                                        <Eye className="w-4 h-4 text-rose-500" />
                                                                        View Document
                                                                    </Button>
                                                                    <span className="text-[7px] font-black uppercase tracking-widest text-white/70 italic">Click outside button to change</span>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <Upload className="w-8 h-8 text-slate-300 group-hover:text-rose-500 transition-colors" />
                                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Click to Upload</span>
                                                            </>
                                                        )}
                                                        <input type="file" id="marriageCert" className="hidden" onChange={e => handleFileChange(e, 'marriageCert')} accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" />
                                                    </div>
                                                    {!(form.files.marriageCert || form.previews.marriageCert) && showDetailsErrors && (
                                                        <div className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl flex items-center gap-2 mt-1.5 text-rose-500 animate-in fade-in slide-in-from-top-1 duration-200">
                                                            <AlertCircle className="w-4 h-4 shrink-0" />
                                                            <span className="text-[10px] font-black uppercase tracking-wider italic">Certificate of Marriage is required</span>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="space-y-4">
                                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Negative Certificate from PSA <span className="text-rose-500">*</span></Label>
                                                        <div
                                                            onClick={() => document.getElementById('psaNeg')?.click()}
                                                            className={cn(
                                                                "aspect-video relative rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-all overflow-hidden",
                                                                (form.files.psaNeg || form.previews.psaNeg) ? "border-rose-500 bg-rose-500/5" : "border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5"
                                                            )}
                                                        >
                                                            {(form.files.psaNeg || form.previews.psaNeg) ? (
                                                                <div className="relative w-full h-full group/preview">
                                                                    {checkIsPdf(form.files.psaNeg, form.previews.psaNeg) ? (
                                                                        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 dark:bg-[#151b2b] p-4 text-center">
                                                                            <FileText className="w-10 h-10 text-red-500 mb-2 animate-bounce" />
                                                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 max-w-[80%] truncate">
                                                                                {form.files.psaNeg ? form.files.psaNeg.name : "psa_negative_certificate.pdf"}
                                                                            </span>
                                                                        </div>
                                                                    ) : (
                                                                        <img src={form.previews.psaNeg!} alt="PSA negative certificate preview" className="absolute inset-0 w-full h-full object-cover" />
                                                                    )}
                                                                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover/preview:opacity-100 transition-opacity z-20 gap-2">
                                                                        <Button
                                                                            type="button"
                                                                            size="sm"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                handleViewFile(form.files.psaNeg || null, form.previews.psaNeg || null, "Negative Certificate from PSA");
                                                                            }}
                                                                            className="font-black italic uppercase tracking-widest text-[9px] px-4 h-8 rounded-xl bg-white text-slate-900 hover:bg-slate-100 shadow-lg flex items-center gap-1.5 transition-all"
                                                                        >
                                                                            <Eye className="w-4 h-4 text-rose-500" />
                                                                            View Document
                                                                        </Button>
                                                                        <span className="text-[7px] font-black uppercase tracking-widest text-white/70 italic">Click outside button to change</span>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <>
                                                                    <Upload className="w-6 h-6 text-slate-300" />
                                                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Click to Upload</span>
                                                                </>
                                                            )}
                                                            <input type="file" id="psaNeg" className="hidden" onChange={e => handleFileChange(e, 'psaNeg')} accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" />
                                                        </div>
                                                        {!(form.files.psaNeg || form.previews.psaNeg) && showDetailsErrors && (
                                                            <div className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl flex items-center gap-2 mt-1.5 text-rose-500 animate-in fade-in slide-in-from-top-1 duration-200">
                                                                <AlertCircle className="w-4 h-4 shrink-0" />
                                                                <span className="text-[10px] font-black uppercase tracking-wider italic">PSA Negative Certificate is required</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="space-y-4">
                                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Affidavit of Delayed Registration <span className="text-rose-500">*</span></Label>
                                                        <div
                                                            onClick={() => document.getElementById('affidavitDelay')?.click()}
                                                            className={cn(
                                                                "aspect-video relative rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-all overflow-hidden",
                                                                (form.files.affidavitDelay || form.previews.affidavitDelay) ? "border-rose-500 bg-rose-500/5" : "border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5"
                                                            )}
                                                        >
                                                            {(form.files.affidavitDelay || form.previews.affidavitDelay) ? (
                                                                <div className="relative w-full h-full group/preview">
                                                                    {checkIsPdf(form.files.affidavitDelay, form.previews.affidavitDelay) ? (
                                                                        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 dark:bg-[#151b2b] p-4 text-center">
                                                                            <FileText className="w-10 h-10 text-red-500 mb-2 animate-bounce" />
                                                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 max-w-[80%] truncate">
                                                                                {form.files.affidavitDelay ? form.files.affidavitDelay.name : "affidavit_of_delayed_registration.pdf"}
                                                                            </span>
                                                                        </div>
                                                                    ) : (
                                                                        <img src={form.previews.affidavitDelay!} alt="Affidavit preview" className="absolute inset-0 w-full h-full object-cover" />
                                                                    )}
                                                                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover/preview:opacity-100 transition-opacity z-20 gap-2">
                                                                        <Button
                                                                            type="button"
                                                                            size="sm"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                handleViewFile(form.files.affidavitDelay || null, form.previews.affidavitDelay || null, "Affidavit of Delayed Registration");
                                                                            }}
                                                                            className="font-black italic uppercase tracking-widest text-[9px] px-4 h-8 rounded-xl bg-white text-slate-900 hover:bg-slate-100 shadow-lg flex items-center gap-1.5 transition-all"
                                                                        >
                                                                            <Eye className="w-4 h-4 text-rose-500" />
                                                                            View Document
                                                                        </Button>
                                                                        <span className="text-[7px] font-black uppercase tracking-widest text-white/70 italic">Click outside button to change</span>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <>
                                                                    <Upload className="w-6 h-6 text-slate-300" />
                                                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Click to Upload</span>
                                                                </>
                                                            )}
                                                            <input type="file" id="affidavitDelay" className="hidden" onChange={e => handleFileChange(e, 'affidavitDelay')} accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" />
                                                        </div>
                                                        {!(form.files.affidavitDelay || form.previews.affidavitDelay) && showDetailsErrors && (
                                                            <div className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl flex items-center gap-2 mt-1.5 text-rose-500 animate-in fade-in slide-in-from-top-1 duration-200">
                                                                <AlertCircle className="w-4 h-4 shrink-0" />
                                                                <span className="text-[10px] font-black uppercase tracking-wider italic">Affidavit of Delayed Registration is required</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="space-y-4 md:col-span-2">
                                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Certified Copy of Marriage License <span className="text-rose-500">*</span></Label>
                                                        <div
                                                            onClick={() => document.getElementById('marriageLicense')?.click()}
                                                            className={cn(
                                                                "aspect-video max-w-md mx-auto relative rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-all overflow-hidden",
                                                                (form.files.marriageLicense || form.previews.marriageLicense) ? "border-rose-500 bg-rose-500/5" : "border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5"
                                                            )}
                                                        >
                                                            {(form.files.marriageLicense || form.previews.marriageLicense) ? (
                                                                <div className="relative w-full h-full group/preview">
                                                                    {checkIsPdf(form.files.marriageLicense, form.previews.marriageLicense) ? (
                                                                        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 dark:bg-[#151b2b] p-4 text-center">
                                                                            <FileText className="w-10 h-10 text-red-500 mb-2 animate-bounce" />
                                                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 max-w-[80%] truncate">
                                                                                {form.files.marriageLicense ? form.files.marriageLicense.name : "certified_copy_of_marriage_license.pdf"}
                                                                            </span>
                                                                        </div>
                                                                    ) : (
                                                                        <img src={form.previews.marriageLicense!} alt="Marriage license preview" className="absolute inset-0 w-full h-full object-cover" />
                                                                    )}
                                                                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover/preview:opacity-100 transition-opacity z-20 gap-2">
                                                                        <Button
                                                                            type="button"
                                                                            size="sm"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                handleViewFile(form.files.marriageLicense || null, form.previews.marriageLicense || null, "Certified Copy of Marriage License");
                                                                            }}
                                                                            className="font-black italic uppercase tracking-widest text-[9px] px-4 h-8 rounded-xl bg-white text-slate-900 hover:bg-slate-100 shadow-lg flex items-center gap-1.5 transition-all"
                                                                        >
                                                                            <Eye className="w-4 h-4 text-rose-500" />
                                                                            View Document
                                                                        </Button>
                                                                        <span className="text-[7px] font-black uppercase tracking-widest text-white/70 italic">Click outside button to change</span>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <>
                                                                    <Upload className="w-6 h-6 text-slate-300" />
                                                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Click to Upload</span>
                                                                </>
                                                            )}
                                                            <input type="file" id="marriageLicense" className="hidden" onChange={e => handleFileChange(e, 'marriageLicense')} accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" />
                                                        </div>
                                                        {!(form.files.marriageLicense || form.previews.marriageLicense) && showDetailsErrors && (
                                                            <div className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl flex items-center gap-2 mt-1.5 text-rose-500 animate-in fade-in slide-in-from-top-1 duration-200">
                                                                <AlertCircle className="w-4 h-4 shrink-0" />
                                                                <span className="text-[10px] font-black uppercase tracking-wider italic">Certified Copy of Marriage License is required</span>
                                                            </div>
                                                        )}
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
                                    <Card className="p-8 rounded-[2rem] border-slate-200/50 dark:border-white/5 space-y-8">
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
                                                        <span className="font-bold text-slate-400 italic">Party 1:</span>
                                                        <span className="font-black uppercase italic">{form.app1FullName}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-xs">
                                                        <span className="font-bold text-slate-400 italic">Party 2:</span>
                                                        <span className="font-black uppercase italic">{form.app2FullName}</span>
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
                                                                : "Standard timely registration is free of charge."}
                                                        </p>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className={cn(
                                                            "text-2xl font-black uppercase italic tracking-tight",
                                                            form.registrationType === "LATE" ? "text-rose-500" : "text-emerald-500"
                                                        )}>
                                                            {form.registrationType === "LATE" ? `₱${lateFee.toFixed(2)}` : "FREE"}
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

