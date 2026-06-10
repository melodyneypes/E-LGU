/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import SecureIdleTimer from "@/components/shared/SecureIdleTimer";
import PrivacyTermsModal from "@/components/shared/PrivacyTermsModal";
import DocumentViewerModal from "@/components/shared/DocumentViewerModal";
import { motion, AnimatePresence } from "framer-motion";
import {
    User,
    Search,
    Loader2,
    Check,
    AlertCircle,
    Home,
    Skull,
    ArrowRight,
    Upload,
    CheckCircle2,
    FileText,
    Eye,
    Trash2
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
    ensureCivilRegistryTransactionTypes,
    submitCivilRegistryTransaction,
    getTransactionTypes,
    getSystemSettingAction,
    getTransactionById,
    getBarangaysList
} from "@/app/admin/transactions/actions";
import { searchResidents, getResidentDataById } from "@/app/admin/actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { saveDraftFile, getDraftFiles, clearDraftFiles } from "@/lib/draftDb";
import { compressImage } from "@/lib/image-compression";

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

const STORAGE_KEY = "lcr_death_registration_draft";

type Step = "IDENTITY" | "DETAILS" | "CONFIRM";

const STEPS: { id: Step; label: string; icon: any }[] = [
    { id: "IDENTITY", label: "Informant Info", icon: User },
    { id: "DETAILS", label: "Deceased Details", icon: Skull },
    { id: "CONFIRM", label: "Review & Submit", icon: CheckCircle2 },
];

// --- Resident Search Component ---
const ResidentSearch = ({ onSelect, excludeId, placeholder = "Search resident..." }: { onSelect: (r: any) => void; excludeId?: string; placeholder?: string }) => {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<any[]>([]);

    useEffect(() => {
        if (query.length > 1) {
            const delayDebounceFn = setTimeout(async () => {
                const res = await searchResidents(query);
                if (res.success && res.data) {
                    let list = res.data as any[];
                    if (excludeId) {
                        list = list.filter(item => item.id !== excludeId);
                    }
                    setResults(list);
                } else {
                    setResults([]);
                }
            }, 300);
            return () => clearTimeout(delayDebounceFn);
        } else {
            setResults([]);
        }
    }, [query, excludeId]);

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
                            className="w-full text-left px-4 py-3 hover:bg-emerald-500/10 dark:hover:bg-white/5 rounded-xl flex items-center gap-3 transition-colors"
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

export default function DeathRegistrationPage() {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState<Step>("IDENTITY");
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
    const [lateFee, setLateFee] = useState<number>(0);
    const [showErrors, setShowErrors] = useState(false);
    const [barangaysList, setBarangaysList] = useState<string[]>([]);

    const [viewerOpen, setViewerOpen] = useState(false);
    const [viewerFile, setViewerFile] = useState<File | null>(null);
    const [viewerUrl, setViewerUrl] = useState<string | null>(null);
    const [viewerTitle, setViewerTitle] = useState("");

    const [revisionId, setRevisionId] = useState<string | null>(null);
    const [revisionTx, setRevisionTx] = useState<any>(null);
    const [existingUrls, setExistingUrls] = useState<Record<string, string | null>>({
        municipalForm103: null,
        psaNegative: null,
        affidavitOfDelay: null,
        validIdFront: null,
        validIdBack: null
    });

    const handleOpenViewer = (file: File | null, title: string, url: string | null = null) => {
        setViewerFile(file);
        setViewerUrl(url);
        setViewerTitle(title);
        setViewerOpen(true);
    };

    // Form State
    const [formData, setFormData] = useState({
        fullName: "",
        dateOfBirth: "",
        dateOfDeath: "",
        placeOfDeath: "",
        causeOfDeath: "",
        gender: "",
        civilStatus: "",
        fathersName: "",
        mothersName: "",
        relationship: "",
        relationshipSpecify: "",
        registrationType: "STANDARD" as "STANDARD" | "LATE",
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
        survivingSpouseName: "",
        corpseDisposal: "",
        burialLocation: "",
        deceasedResidentId: "",
    });

    const [files, setFiles] = useState<Record<string, File | null>>({
        municipalForm103: null,
        psaNegative: null,
        affidavitOfDelay: null,
        validIdFront: null,
        validIdBack: null
    });

    // Privacy / Terms modal state (shared key across LCR pages)
    const [policyOpen, setPolicyOpen] = useState(false);
    const [policyAccepted, setPolicyAccepted] = useState(false);

    const handleAcceptPolicy = () => { setPolicyOpen(false); setPolicyAccepted(true); };

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _isRestoredRef = useRef(false);

    // Restore progress from session storage & IndexedDB
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const revId = urlParams.get("revisionId");
        if (revId) return; // Skip draft loading if in revision mode!

        const savedStep = sessionStorage.getItem("death-reg-step");
        const savedForm = sessionStorage.getItem("death-reg-form");

        if (savedStep) setCurrentStep(savedStep as Step);
        if (savedForm) {
            try {
                const parsed = JSON.parse(savedForm);
                setFormData(prev => ({
                    ...prev,
                    ...parsed
                }));
            } catch (e) {
                console.error("Failed to parse saved form", e);
            }
        }

        // Hydrate files from IndexedDB
        async function hydrateFiles() {
            try {
                const draftFiles = await getDraftFiles(STORAGE_KEY);
                if (draftFiles && Object.keys(draftFiles).length > 0) {
                    setFiles(prev => ({
                        ...prev,
                        ...draftFiles
                    }));
                    toast.info("Progress restored. Uploaded document drafts recovered.", {
                        duration: 6000
                    });
                }
            } catch (error) {
                console.error("Failed to hydrate draft files from IndexedDB:", error);
            }
        }

        hydrateFiles();
    }, []);

    useEffect(() => {
        if (!loading && !revisionId) {
            sessionStorage.setItem("death-reg-step", currentStep);
            sessionStorage.setItem("death-reg-form", JSON.stringify(formData));
        }
    }, [currentStep, formData, loading, revisionId]);

    useEffect(() => {
        if (!formData.dateOfDeath) {
            if (formData.registrationType !== "STANDARD") {
                setFormData(prev => ({ ...prev, registrationType: "STANDARD" }));
            }
            return;
        }
        try {
            const [year, month, day] = formData.dateOfDeath.split('-').map(Number);
            const deathDate = new Date(year, month - 1, day);
            const today = new Date();
            const d1 = Date.UTC(deathDate.getFullYear(), deathDate.getMonth(), deathDate.getDate());
            const d2 = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
            const diffDays = Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
            
            const expectedType = diffDays >= 30 ? "LATE" : "STANDARD";
            if (formData.registrationType !== expectedType) {
                setFormData(prev => ({
                    ...prev,
                    registrationType: expectedType
                }));
            }
        } catch (e) {
            console.error("Error calculating registration type:", e);
        }
    }, [formData.dateOfDeath, formData.registrationType]);

    useEffect(() => {
        async function init() {
            try {
                await ensureCivilRegistryTransactionTypes();

                const [resResult, typesResult, brgyResult] = await Promise.all([
                    getCurrentUserResident(),
                    getTransactionTypes(),
                    getBarangaysList()
                ]);

                if (brgyResult.success && brgyResult.data) {
                    setBarangaysList(brgyResult.data);
                }

                // Check for revisionId query parameter
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

                        setFormData({
                            fullName: addData.fullName || "",
                            dateOfBirth: addData.dateOfBirth || "",
                            dateOfDeath: addData.dateOfDeath || "",
                            placeOfDeath: addData.placeOfDeath || "",
                            causeOfDeath: addData.causeOfDeath || "",
                            gender: addData.gender || "",
                            civilStatus: addData.civilStatus || "",
                            fathersName: addData.fathersName || "",
                            mothersName: addData.mothersName || "",
                            relationship: addData.relationship || "",
                            relationshipSpecify: addData.relationshipSpecify || "",
                            registrationType: addData.registrationType || "STANDARD",
                            email: addData.email || resSnapshot.email || "",
                            contactNumber: addData.contactNumber || resSnapshot.contactNumber || "",
                            informantFirstName: addData.informantFirstName || resSnapshot.firstName || "",
                            informantMiddleName: addData.informantMiddleName || resSnapshot.middleName || "",
                            informantLastName: addData.informantLastName || resSnapshot.lastName || "",
                            informantSuffix: addData.informantSuffix || resSnapshot.suffix || "",
                            informantBirthDate: addData.informantBirthDate || "",
                            informantAge: addData.informantAge || "",
                            informantCivilStatus: addData.informantCivilStatus || "",
                            informantCitizenship: addData.informantCitizenship || "FILIPINO",
                            informantOccupation: addData.informantOccupation || "",
                            informantAddress: addData.informantAddress || constructedAddr,
                            survivingSpouseName: addData.survivingSpouseName || "",
                            corpseDisposal: addData.corpseDisposal || "",
                            burialLocation: addData.burialLocation || "",
                            deceasedResidentId: addData.deceasedResidentId || "",
                        });

                        setExistingUrls({
                            municipalForm103: addData.municipalForm103 || null,
                            psaNegative: addData.psaNegative || null,
                            affidavitOfDelay: addData.affidavitOfDelay || null,
                            validIdFront: addData.validIdFront || null,
                            validIdBack: addData.validIdBack || null
                        });
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
                    const deathRegType = typesResult.data.find((t: any) => t.code === "LCR_DEATH_REG");
                    if (deathRegType) {
                        setTypeId(deathRegType.id);
                        setLateFee((deathRegType as any).lateFee || 0);
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

    const isSelfRegistration = () => {
        if (!resident) return false;

        // Check 1: deceasedResidentId matches informant's resident ID
        if (formData.deceasedResidentId === resident.id) {
            return true;
        }

        // Check 2: Manually entered name & DOB matches informant's name & DOB
        const informantFirstName = (resident.firstName || "").trim().toUpperCase();
        const informantLastName = (resident.lastName || "").trim().toUpperCase();
        const informantDOB = resident.dateOfBirth ? new Date(resident.dateOfBirth).toISOString().split('T')[0] : "";

        const deceasedName = (formData.fullName || "").trim().toUpperCase();
        const deceasedDOB = formData.dateOfBirth || "";

        if (deceasedDOB === informantDOB) {
            const hasFirstName = deceasedName.includes(informantFirstName);
            const hasLastName = deceasedName.includes(informantLastName);
            if (hasFirstName && hasLastName) {
                return true;
            }
        }

        return false;
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        
        if (name === "dateOfDeath" && value) {
            try {
                const [year, month, day] = value.split('-').map(Number);
                const selectedDate = new Date(year, month - 1, day);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                
                if (selectedDate > today) {
                    toast.error("Date of death cannot be in the future.");
                    return;
                }
            } catch {
                // Ignore parsing errors
            }
        }
        
        setFormData(prev => {
            const next = { ...prev, [name]: value.toUpperCase() };
            if (name === "fullName" || name === "dateOfBirth") {
                next.deceasedResidentId = "";
            }
            return next;
        });
    };

    const handleSelectChange = (name: string, value: string) => {
        setFormData(prev => {
            const next = { ...prev, [name]: value };
            if (name === "relationship" && value !== "RELATIVE") {
                next.relationshipSpecify = "";
            }
            return next;
        });
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, key: string) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
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
                // Clear the file input
                if (e && e.target) e.target.value = "";
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

            setFiles(prev => ({ ...prev, [key]: fileToProcess }));

            // Save raw/compressed file to IndexedDB
            saveDraftFile(STORAGE_KEY, key, fileToProcess).catch(err => {
                console.error("Failed to save draft file to IndexedDB:", err);
            });
        }
    };

    const renderDocCard = (label: string, fileKey: string, uploadId: string, isId = false) => {
        const file = files[fileKey];
        const existingUrl = isId 
            ? (fileKey === "validIdFront" ? resident?.idFrontUrl : resident?.idBackUrl)
            : existingUrls[fileKey];

        const isAdded = !!file || !!existingUrl;

        const isImage = file 
            ? file.type.startsWith("image/") 
            : (existingUrl ? (!existingUrl.toLowerCase().endsWith(".pdf") && !existingUrl.includes("application/pdf") && !existingUrl.includes(".pdf?")) : false);

        return (
            <div className="p-4 rounded-2xl border border-slate-200/60 dark:border-white/5 bg-slate-50/30 dark:bg-white/5 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col gap-4 relative overflow-hidden group">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 italic block">
                            {isId ? "Informant Identity" : "Required Document"}
                        </span>
                        <h4 className="text-[10px] font-black uppercase tracking-tight text-slate-700 dark:text-slate-200 leading-tight">
                            {label} <span className="text-red-500">*</span>
                        </h4>
                    </div>
                    {isAdded ? (
                        <span className="flex items-center gap-1 text-[8px] font-black uppercase tracking-widest bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full shrink-0">
                            <Check className="w-2.5 h-2.5" /> {isId && !file ? "From Profile" : "Added"}
                        </span>
                    ) : (
                        <span className="flex items-center gap-1 text-[8px] font-black uppercase tracking-widest bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full animate-pulse shrink-0">
                            Pending
                        </span>
                    )}
                </div>

                {/* Preview / Placeholder Area */}
                {isAdded ? (
                    <div
                        onClick={() => {
                            if (file) {
                                handleOpenViewer(file, label);
                            } else if (existingUrl) {
                                handleOpenViewer(null, label, existingUrl);
                            }
                        }}
                        className="relative w-full aspect-[16/9] rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 group/preview cursor-pointer bg-slate-100 dark:bg-slate-900"
                    >
                        {isImage ? (
                            file ? (
                                <PreviewImage
                                    file={file}
                                    alt={label}
                                    className="w-full h-full object-cover group-hover/preview:scale-105 transition-transform duration-500"
                                />
                            ) : (
                                <img
                                    src={existingUrl || ""}
                                    alt={label}
                                    className="w-full h-full object-cover group-hover/preview:scale-105 transition-transform duration-500"
                                />
                            )
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
                                <FileText className="w-10 h-10 text-red-500 mb-2 animate-bounce" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 truncate max-w-[80%]">
                                    {file ? file.name : "Document.pdf"}
                                </span>
                            </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/preview:opacity-100 transition-opacity flex items-center justify-center">
                            <Eye className="w-5 h-5 text-white animate-pulse" />
                        </div>
                    </div>
                ) : (
                    <Label
                        htmlFor={uploadId}
                        className="flex flex-col items-center justify-center aspect-[16/9] rounded-xl border border-dashed border-slate-200 dark:border-white/10 bg-white/50 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 hover:border-emerald-500/50 dark:hover:border-emerald-500/50 transition-all duration-300 cursor-pointer group/upload text-center animate-fade-in"
                    >
                        <div className="w-8 h-8 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center group-hover/upload:scale-110 transition-transform duration-300 mb-1.5">
                            <Upload className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                            Upload File
                        </span>
                        <span className="text-[7px] text-slate-400 dark:text-slate-500 italic mt-0.5">
                            PDF, JPG, PNG up to 5MB
                        </span>
                        <Input
                            id={uploadId}
                            type="file"
                            className="hidden"
                            accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                            onChange={(e) => handleFileChange(e, fileKey)}
                        />
                    </Label>
                )}

                {/* Actions Row */}
                {isAdded && (
                    <div className="flex items-center gap-2 mt-auto">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                                e.stopPropagation();
                                if (file) {
                                    handleOpenViewer(file, label);
                                } else if (existingUrl) {
                                    handleOpenViewer(null, label, existingUrl);
                                }
                            }}
                            className="h-8 flex-1 rounded-xl text-[8px] font-black uppercase tracking-widest border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 flex items-center justify-center gap-1.5 text-slate-600 dark:text-slate-300 shadow-sm"
                        >
                            <Eye className="w-3.5 h-3.5" /> Inspect
                        </Button>

                        {/* Replace / Remove */}
                        <Label
                            htmlFor={uploadId}
                            className="h-8 flex-1 rounded-xl text-[8px] font-black uppercase tracking-widest border border-dashed border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 flex items-center justify-center gap-1.5 text-amber-500 cursor-pointer shadow-sm"
                        >
                            <Upload className="w-3 h-3" /> Replace
                        </Label>
                        <Input
                            id={uploadId}
                            type="file"
                            className="hidden"
                            accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                            onChange={(e) => handleFileChange(e, fileKey)}
                        />

                        {file && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={async (e) => {
                                    e.stopPropagation();
                                    setFiles(prev => ({ ...prev, [fileKey]: null }));
                                    await saveDraftFile(STORAGE_KEY, fileKey, null);
                                }}
                                className="h-8 px-3 rounded-xl text-[8px] font-black uppercase tracking-widest text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 flex items-center justify-center gap-1"
                            >
                                <Trash2 className="w-3.5 h-3.5" /> Remove
                            </Button>
                        )}
                    </div>
                )}
            </div>
        );
    };

    const handleSubmit = async () => {
        if (submitting) return;
        // Require privacy terms acceptance before allowing submit
        if (!policyAccepted) {
            setShowErrors(true);
            toast.error("Please review and accept the Privacy Policy & Terms before submitting. Click Review to open the agreement.");
            return;
        }
        if (!typeId) {
            toast.error("Service type not initialized. Please try again later.");
            return;
        }

        // Validate deceased details
        if (!formData.fullName || !formData.dateOfBirth || !formData.dateOfDeath || !formData.placeOfDeath || !formData.causeOfDeath || !formData.gender || !formData.civilStatus || !formData.fathersName || !formData.mothersName || !formData.corpseDisposal || !formData.burialLocation) {
            setShowErrors(true);
            toast.error("Please fill in all deceased details.");
            return;
        }

        if (isSelfRegistration()) {
            toast.error("You cannot register yourself as deceased.");
            return;
        }

        if (formData.placeOfDeath === "OUTSIDE_MAPANDAN") {
            toast.error("Registration blocked: Place of death is outside Mapandan.");
            return;
        }

        // Validate informant details
        const isSpecifyEmpty = formData.relationship === "RELATIVE" && !formData.relationshipSpecify.trim();
        if (!formData.relationship || !formData.contactNumber || isSpecifyEmpty) {
            setShowErrors(true);
            toast.error("Please fill in all informant details.");
            return;
        }

        // Validate required documents
        if (formData.registrationType === "STANDARD" && !files.municipalForm103 && !existingUrls.municipalForm103) {
            toast.error("Please upload Municipal Form No. 103");
            return;
        }

        if (formData.registrationType === "LATE") {
            if (!files.psaNegative && !existingUrls.psaNegative) {
                toast.error("Please upload PSA Negative Certification");
                return;
            }
            if (!files.affidavitOfDelay && !existingUrls.affidavitOfDelay) {
                toast.error("Please upload Affidavit of Delayed Registration");
                return;
            }
        }

        // Validate valid ID
        if (!files.validIdFront && !resident?.idFrontUrl && !existingUrls.validIdFront) {
            toast.error("Please upload Informant's Valid ID (Front)");
            return;
        }
        if (!files.validIdBack && !resident?.idBackUrl && !existingUrls.validIdBack) {
            toast.error("Please upload Informant's Valid ID (Back)");
            return;
        }

        setSubmitting(true);
        try {
            const data = new FormData();
            data.append("typeId", typeId);
            data.append("registryType", "DEATH_REG");
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

            const miscFee = formData.registrationType === "LATE" ? lateFee : 0;
            const additionalData = {
                ...formData,
                subjectName: formData.fullName,
                miscFee,
            };
            data.append("additionalData", JSON.stringify(additionalData));

            // Append files
            Object.entries(files).forEach(([key, file]) => {
                if (file) {
                    data.append(key, file);
                }
            });

            const res = await submitCivilRegistryTransaction(data);

            if (res.success && res.data) {
                toast.success(revisionId ? "Revision resubmitted successfully!" : "Death Registration submitted successfully!");
                sessionStorage.removeItem("death-reg-step");
                sessionStorage.removeItem("death-reg-form");
                await clearDraftFiles(STORAGE_KEY);
                router.push(`/user/services/requests/${res.data.id}`);
            } else {
                toast.error(res.error || "Failed to submit registration");
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
                <p className="font-black uppercase tracking-widest text-[10px] text-slate-400 italic">Initializing Registration Form...</p>
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
                            <BreadcrumbLink href="/" className="flex items-center gap-1">
                                <Home className="w-3 h-3" />
                                Home
                            </BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbLink href="/user/services">Services</BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbLink href="/user/services/civil-registry">Civil Registry</BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbPage>Death Registration</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>

                <div className="space-y-6">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-white dark:bg-[#0f1117] p-8 rounded-[2.5rem] border border-slate-200/50 dark:border-white/5 shadow-xl shadow-slate-200/40 dark:shadow-none">
                        <div className="space-y-2">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-500/10 rounded-xl">
                                    <Skull className="w-6 h-6 text-emerald-500" />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-500">Local Civil Registry</span>
                            </div>
                            <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">
                                Death <span className="text-emerald-500">Registration</span>
                            </h1>
                            <p className="text-slate-500 font-medium text-sm italic">Submit timely or late registration applications for death records.</p>
                        </div>
                    </div>

                    {revisionTx?.rejectionRemarks && (
                        <div className="p-5 rounded-[2rem] bg-amber-500/10 border border-amber-500/20 flex items-start gap-4 text-amber-500 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 animate-pulse" />
                            <div className="text-left space-y-1">
                                <p className="text-[10px] font-black uppercase tracking-wider italic">Revision Instructions from Registry Office</p>
                                <p className="text-xs font-bold text-slate-700 dark:text-slate-300 leading-relaxed italic">
                                    &ldquo;{revisionTx.rejectionRemarks}&rdquo;
                                </p>
                            </div>
                        </div>
                    )}

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
                                    <div
                                        key={idx}
                                        className="flex flex-col items-center gap-2 transition-all duration-300"
                                    >
                                        <div className={cn(
                                            "w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all duration-500 border-2 bg-white dark:bg-[#08090d]",
                                            isActive ? "border-emerald-500 text-emerald-600 shadow-lg shadow-emerald-500/20 scale-110" :
                                                isCompleted ? "bg-emerald-500 border-emerald-500 text-white" :
                                                    "border-slate-200 dark:border-white/10 text-slate-400"
                                        )}>
                                            {isCompleted ? (
                                                <Check className="w-5 h-5" />
                                            ) : (
                                                <Icon className="w-4 h-4 md:w-5 md:h-5" />
                                            )}
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

                    <Card className="p-6 md:p-10 rounded-[2.5rem] border border-slate-200/50 dark:border-white/5 bg-white dark:bg-[#0f1117] shadow-xl shadow-slate-200/40 dark:shadow-none overflow-hidden min-h-[400px]">
                        <AnimatePresence mode="wait">
                            {currentStep === "IDENTITY" && (
                                <motion.div
                                    key="identity-step"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 1.05 }}
                                    className="space-y-6"
                                >
                                    <div className="space-y-2">
                                        <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight">Informant Information</h2>
                                        <p className="text-xs text-slate-500 font-medium italic">Details of the person registering the death</p>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1">Informant&apos;s Relationship to Deceased <span className="text-red-500">*</span></Label>
                                            <Select
                                                value={formData.relationship}
                                                onValueChange={(v) => handleSelectChange("relationship", v)}
                                            >
                                                <SelectTrigger className="h-12 rounded-xl border-slate-200 focus:ring-emerald-500 shadow-sm text-xs md:text-sm bg-white dark:bg-slate-900 transition-all font-bold">
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

                                        {formData.relationship === "RELATIVE" && (
                                            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1">Specify Relationship <span className="text-red-500">*</span></Label>
                                                <Input
                                                    className={cn(
                                                        "rounded-xl border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 h-12 transition-all font-bold italic uppercase",
                                                        (showErrors && !formData.relationshipSpecify) && "border-red-500/50 bg-red-50/10"
                                                    )}
                                                    placeholder="e.g. COUSIN, UNCLE, AUNT"
                                                    name="relationshipSpecify"
                                                    value={formData.relationshipSpecify}
                                                    onChange={handleInputChange}
                                                />
                                                {(showErrors && !formData.relationshipSpecify) && (
                                                    <p className="text-[9px] font-black text-red-500 uppercase italic tracking-widest ml-1 animate-pulse">Required</p>
                                                )}
                                            </div>
                                        )}

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
                                                <Input
                                                    readOnly
                                                    className="rounded-xl border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/50 h-12 transition-all font-bold italic text-slate-600"
                                                    value={formData.informantOccupation}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1">Contact Number <span className="text-red-500">*</span></Label>
                                                <Input
                                                    className={cn(
                                                        "rounded-xl border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 h-12 transition-all font-bold italic",
                                                        (showErrors && !formData.contactNumber) && "border-red-500/50 bg-red-50/10"
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
                                                const isSpecifyEmpty = formData.relationship === "RELATIVE" && !formData.relationshipSpecify.trim();
                                                if (!formData.relationship || !formData.contactNumber || isSpecifyEmpty) {
                                                    setShowErrors(true);
                                                    toast.error("Please fill in all informant details.");
                                                    return;
                                                }
                                                setShowErrors(false);
                                                setCurrentStep("DETAILS");
                                            }}
                                            className="rounded-full px-12 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest italic text-[10px] h-12 shadow-xl shadow-emerald-500/20"
                                        >
                                            Next Step
                                            <ArrowRight className="w-4 h-4 ml-2" />
                                        </Button>
                                    </div>
                                </motion.div>
                            )}

                            {currentStep === "DETAILS" && (
                                <motion.div
                                    key="details-step"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 1.05 }}
                                    className="space-y-6"
                                >
                                    <div className="space-y-2">
                                        <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight flex items-center gap-2">
                                            Deceased Information
                                        </h2>
                                        <p className="text-xs text-slate-500 font-medium italic">Provide the details of the deceased individual</p>
                                    </div>

                                    {/* Resident Database Search */}
                                    <div className="space-y-3 p-6 rounded-[2rem] bg-slate-500/5 border border-slate-200/50 dark:border-white/5">
                                        <div className="flex items-center gap-2">
                                            <Search className="w-4 h-4 text-emerald-500" />
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                                Search Deceased in Resident Database
                                            </Label>
                                        </div>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider italic">
                                            If the deceased was a registered resident of Mapandan, you can search and select their profile to automatically pre-fill all available information.
                                        </p>
                                        <ResidentSearch
                                            placeholder="Type resident name to search..."
                                            excludeId={resident?.id}
                                            onSelect={async (r) => {
                                                try {
                                                    const res = await getResidentDataById(r.id);
                                                    if (res.success && res.data) {
                                                        const fullResident = res.data;
                                                        if (resident && fullResident.id === resident.id) {
                                                            toast.error("You cannot register yourself as deceased.");
                                                            return;
                                                        }
                                                        if (fullResident.isDead) {
                                                            toast.error("This person is already registered as deceased.");
                                                            return;
                                                        }
                                                        const middleInit = fullResident.middleName ? ` ${fullResident.middleName.charAt(0)}.` : "";
                                                        const suffixStr = fullResident.suffix ? ` ${fullResident.suffix}` : "";
                                                        
                                                        const fatherMiddle = fullResident.fatherMiddleName ? ` ${fullResident.fatherMiddleName}` : "";
                                                        const fatherLast = fullResident.fatherLastName ? ` ${fullResident.fatherLastName}` : "";
                                                        const fatherFullName = fullResident.fatherFirstName ? `${fullResident.fatherFirstName}${fatherMiddle}${fatherLast}`.trim().toUpperCase() : "";

                                                        const motherMiddle = fullResident.motherMiddleName ? ` ${fullResident.motherMiddleName}` : "";
                                                        const motherLast = fullResident.motherLastName ? ` ${fullResident.motherLastName}` : "";
                                                        const motherFullName = fullResident.motherFirstName ? `${fullResident.motherFirstName}${motherMiddle}${motherLast}`.trim().toUpperCase() : "";

                                                        setFormData(prev => ({
                                                            ...prev,
                                                            fullName: `${fullResident.firstName}${middleInit} ${fullResident.lastName}${suffixStr}`.toUpperCase(),
                                                            dateOfBirth: fullResident.dateOfBirth ? new Date(fullResident.dateOfBirth).toISOString().split('T')[0] : "",
                                                            gender: (fullResident.gender || "").toUpperCase(),
                                                            civilStatus: (fullResident.civilStatus || "").toUpperCase(),
                                                            fathersName: fatherFullName,
                                                            mothersName: motherFullName,
                                                            deceasedResidentId: fullResident.id
                                                        }));
                                                        toast.success(`Selected ${fullResident.firstName} ${fullResident.lastName} as the deceased.`);
                                                    } else {
                                                        toast.error("Failed to load full resident details.");
                                                    }
                                                } catch (err) {
                                                    console.error("Error loading resident details:", err);
                                                    toast.error("An error occurred while fetching details.");
                                                }
                                            }}
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1">Full Name <span className="text-red-500">*</span></Label>
                                            <Input
                                                name="fullName"
                                                placeholder="ENTER FULL NAME"
                                                value={formData.fullName}
                                                onChange={handleInputChange}
                                                className={cn(
                                                    "rounded-xl border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 h-12 transition-all uppercase font-medium",
                                                    (showErrors && !formData.fullName) && "border-red-500/50 bg-red-50/10"
                                                )}
                                            />
                                            {(showErrors && !formData.fullName) && (
                                                <p className="text-[9px] font-black text-red-500 uppercase italic tracking-widest ml-1 animate-pulse">Required</p>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1">Date of Birth <span className="text-red-500">*</span></Label>
                                            <Input
                                                type="date"
                                                name="dateOfBirth"
                                                value={formData.dateOfBirth}
                                                onChange={handleInputChange}
                                                className={cn(
                                                    "rounded-xl border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 h-12 transition-all font-medium",
                                                    (showErrors && !formData.dateOfBirth) && "border-red-500/50 bg-red-50/10"
                                                )}
                                            />
                                            {(showErrors && !formData.dateOfBirth) && (
                                                <p className="text-[9px] font-black text-red-500 uppercase italic tracking-widest ml-1 animate-pulse">Required</p>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1">Date of Death <span className="text-red-500">*</span></Label>
                                            <Input
                                                type="date"
                                                name="dateOfDeath"
                                                max={new Date().toLocaleDateString('en-CA')}
                                                value={formData.dateOfDeath}
                                                onChange={handleInputChange}
                                                className={cn(
                                                    "rounded-xl border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 h-12 transition-all font-medium",
                                                    (showErrors && !formData.dateOfDeath) && "border-red-500/50 bg-red-50/10"
                                                )}
                                            />
                                            {(showErrors && !formData.dateOfDeath) && (
                                                <p className="text-[9px] font-black text-red-500 uppercase italic tracking-widest ml-1 animate-pulse">Required</p>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1">Place of Death <span className="text-red-500">*</span></Label>
                                            
                                            {formData.placeOfDeath === "OUTSIDE_MAPANDAN" && (
                                                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[11px] font-bold italic flex items-start gap-2.5 animate-in fade-in slide-in-from-top-2 duration-350 mb-2">
                                                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 animate-pulse" />
                                                    <div className="space-y-1 text-left">
                                                        <p className="font-black uppercase tracking-widest text-[9px] leading-none text-amber-500">Paalala</p>
                                                        <p className="leading-relaxed">
                                                            Ang Death Certificate ay dapat irehistro sa bayan kung saan pumanaw ang tao. Dahil sa labas ng Mapandan naganap ito, mangyaring makipag-ugnayan sa Local Civil Registrar ng tamang bayan. Salamat po. (Awtomatikong iba-block ng system ang submission).
                                                        </p>
                                                    </div>
                                                </div>
                                            )}

                                            <Select
                                                value={formData.placeOfDeath}
                                                onValueChange={(v) => handleSelectChange("placeOfDeath", v)}
                                            >
                                                <SelectTrigger className={cn(
                                                    "h-12 rounded-xl border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 focus:ring-emerald-500 font-medium text-xs md:text-sm uppercase font-bold",
                                                    (showErrors && !formData.placeOfDeath) && "border-red-500/50 bg-red-50/10"
                                                )}>
                                                    <SelectValue placeholder="SELECT PLACE OF DEATH" />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-xl border-slate-200 dark:border-white/10 italic">
                                                    {barangaysList.map((brgy) => (
                                                        <SelectItem key={brgy} value={brgy}>
                                                            {brgy}
                                                        </SelectItem>
                                                    ))}
                                                    <SelectItem value="OUTSIDE_MAPANDAN">OUTSIDE MAPANDAN</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            {(showErrors && !formData.placeOfDeath) && (
                                                <p className="text-[9px] font-black text-red-500 uppercase italic tracking-widest ml-1 animate-pulse">Required</p>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1">Cause of Death <span className="text-red-500">*</span></Label>
                                            <Input
                                                name="causeOfDeath"
                                                placeholder="ENTER CAUSE"
                                                value={formData.causeOfDeath}
                                                onChange={handleInputChange}
                                                className={cn(
                                                    "rounded-xl border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 h-12 transition-all uppercase font-medium",
                                                    (showErrors && !formData.causeOfDeath) && "border-red-500/50 bg-red-50/10"
                                                )}
                                            />
                                            {(showErrors && !formData.causeOfDeath) && (
                                                <p className="text-[9px] font-black text-red-500 uppercase italic tracking-widest ml-1 animate-pulse">Required</p>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1">Gender <span className="text-red-500">*</span></Label>
                                            <Select
                                                value={formData.gender}
                                                onValueChange={(v) => handleSelectChange("gender", v)}
                                            >
                                                <SelectTrigger className={cn(
                                                    "h-12 rounded-xl border-slate-200 focus:ring-emerald-500 shadow-sm text-xs md:text-sm bg-white dark:bg-slate-900 transition-all font-bold",
                                                    (showErrors && !formData.gender) && "border-red-500/50 bg-red-50/10"
                                                )}>
                                                    <SelectValue placeholder="SELECT GENDER" />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-xl border-slate-200 dark:border-white/10 italic">
                                                    <SelectItem value="MALE">MALE</SelectItem>
                                                    <SelectItem value="FEMALE">FEMALE</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            {(showErrors && !formData.gender) && (
                                                <p className="text-[9px] font-black text-red-500 uppercase italic tracking-widest ml-1 animate-pulse">Required</p>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1">Civil Status <span className="text-red-500">*</span></Label>
                                            <Select
                                                value={formData.civilStatus}
                                                onValueChange={(v) => handleSelectChange("civilStatus", v)}
                                            >
                                                <SelectTrigger className={cn(
                                                    "h-12 rounded-xl border-slate-200 focus:ring-emerald-500 shadow-sm text-xs md:text-sm bg-white dark:bg-slate-900 transition-all font-bold",
                                                    (showErrors && !formData.civilStatus) && "border-red-500/50 bg-red-50/10"
                                                )}>
                                                    <SelectValue placeholder="SELECT STATUS" />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-xl border-slate-200 dark:border-white/10 italic">
                                                    <SelectItem value="SINGLE">SINGLE</SelectItem>
                                                    <SelectItem value="MARRIED">MARRIED</SelectItem>
                                                    <SelectItem value="WIDOWED">WIDOWED</SelectItem>
                                                    <SelectItem value="DIVORCED">DIVORCED</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            {(showErrors && !formData.civilStatus) && (
                                                <p className="text-[9px] font-black text-red-500 uppercase italic tracking-widest ml-1 animate-pulse">Required</p>
                                            )}
                                        </div>
                                        {formData.civilStatus === "MARRIED" && (
                                            <div className="md:col-span-2 space-y-2">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1">Surviving Spouse&apos;s Full Name <span className="text-slate-400 font-medium">(Optional)</span></Label>
                                                <Input
                                                    name="survivingSpouseName"
                                                    placeholder="ENTER SURVIVING SPOUSE'S FULL NAME"
                                                    value={formData.survivingSpouseName}
                                                    onChange={handleInputChange}
                                                    className="rounded-xl border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 h-12 transition-all uppercase font-medium"
                                                />
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-2 pt-4">
                                        <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase italic tracking-tight">Parental Information</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1">Father&apos;s Name <span className="text-red-500">*</span></Label>
                                                <Input
                                                    name="fathersName"
                                                    placeholder="ENTER FATHER'S NAME"
                                                    value={formData.fathersName}
                                                    onChange={handleInputChange}
                                                    className={cn(
                                                        "rounded-xl border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 h-12 transition-all uppercase font-medium",
                                                        (showErrors && !formData.fathersName) && "border-red-500/50 bg-red-50/10"
                                                    )}
                                                />
                                                {(showErrors && !formData.fathersName) && (
                                                    <p className="text-[9px] font-black text-red-500 uppercase italic tracking-widest ml-1 animate-pulse">Required</p>
                                                )}
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1">Mother&apos;s Maiden Name <span className="text-red-500">*</span></Label>
                                                <Input
                                                    name="mothersName"
                                                    placeholder="ENTER MOTHER'S MAIDEN NAME"
                                                    value={formData.mothersName}
                                                    onChange={handleInputChange}
                                                    className={cn(
                                                        "rounded-xl border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 h-12 transition-all uppercase font-medium",
                                                        (showErrors && !formData.mothersName) && "border-red-500/50 bg-red-50/10"
                                                    )}
                                                />
                                                {(showErrors && !formData.mothersName) && (
                                                    <p className="text-[9px] font-black text-red-500 uppercase italic tracking-widest ml-1 animate-pulse">Required</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2 pt-4">
                                        <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase italic tracking-tight">Corpse Disposal</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1">Method of Corpse Disposal <span className="text-red-500">*</span></Label>
                                                <Select
                                                    value={formData.corpseDisposal}
                                                    onValueChange={(v) => handleSelectChange("corpseDisposal", v)}
                                                >
                                                    <SelectTrigger className={cn(
                                                        "h-12 rounded-xl border-slate-200 focus:ring-emerald-500 shadow-sm text-xs md:text-sm bg-white dark:bg-slate-900 transition-all font-bold",
                                                        (showErrors && !formData.corpseDisposal) && "border-red-500/50 bg-red-50/10"
                                                    )}>
                                                        <SelectValue placeholder="SELECT METHOD" />
                                                    </SelectTrigger>
                                                    <SelectContent className="rounded-xl border-slate-200 dark:border-white/10 italic">
                                                        <SelectItem value="BURIAL">BURIAL</SelectItem>
                                                        <SelectItem value="CREMATION">CREMATION</SelectItem>
                                                        <SelectItem value="RESOMATION">RESOMATION</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                {(showErrors && !formData.corpseDisposal) && (
                                                    <p className="text-[9px] font-black text-red-500 uppercase italic tracking-widest ml-1 animate-pulse">Required</p>
                                                )}
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1">{formData.corpseDisposal === "CREMATION" ? "Cremation Location" : formData.corpseDisposal === "RESOMATION" ? "Resomation Location" : "Cemetery Location"} <span className="text-red-500">*</span></Label>
                                                <Input
                                                    name="burialLocation"
                                                    placeholder={formData.corpseDisposal === "CREMATION" ? "ENTER CREMATION LOCATION" : formData.corpseDisposal === "RESOMATION" ? "ENTER RESOMATION LOCATION" : "ENTER CEMETERY NAME OR LOCATION"}
                                                    value={formData.burialLocation}
                                                    onChange={handleInputChange}
                                                    className={cn(
                                                        "rounded-xl border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 h-12 transition-all uppercase font-medium",
                                                        (showErrors && !formData.burialLocation) && "border-red-500/50 bg-red-50/10"
                                                    )}
                                                />
                                                {(showErrors && !formData.burialLocation) && (
                                                    <p className="text-[9px] font-black text-red-500 uppercase italic tracking-widest ml-1 animate-pulse">Required</p>
                                                )}
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
                                                if (!formData.fullName || !formData.dateOfBirth || !formData.dateOfDeath || !formData.placeOfDeath || !formData.causeOfDeath || !formData.gender || !formData.civilStatus || !formData.fathersName || !formData.mothersName || !formData.corpseDisposal || !formData.burialLocation) {
                                                    setShowErrors(true);
                                                    toast.error("Please fill in all deceased details.");
                                                    return;
                                                }
                                                if (formData.placeOfDeath === "OUTSIDE_MAPANDAN") {
                                                    toast.error("Registration blocked: Place of death is outside Mapandan.");
                                                    return;
                                                }
                                                if (isSelfRegistration()) {
                                                    toast.error("You cannot register yourself as deceased.");
                                                    return;
                                                }
                                                setShowErrors(false);
                                                setCurrentStep("CONFIRM");
                                            }}
                                            className="rounded-full px-12 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest italic text-[10px] h-12 shadow-xl shadow-emerald-500/20"
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
                                        <div>
                                            <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight">Registration Review</h2>
                                            <p className="text-xs text-slate-500 font-medium italic">Verify information and upload required documents</p>
                                        </div>
                                    </div>

                                    <Card className="bg-slate-50 dark:bg-white/5 border-none p-6 rounded-[2rem] space-y-4">
                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-1">
                                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 italic">Deceased Name</span>
                                                <p className="font-black text-slate-900 dark:text-white italic uppercase">{formData.fullName}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 italic">Date of Death</span>
                                                <p className="font-black text-slate-900 dark:text-white italic">{formData.dateOfDeath}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 italic">Place of Death</span>
                                                <p className="font-black text-slate-900 dark:text-white italic uppercase">{formData.placeOfDeath}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 italic">Cause of Death</span>
                                                <p className="font-black text-slate-900 dark:text-white italic uppercase">{formData.causeOfDeath}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 italic">Corpse Disposal</span>
                                                <p className="font-black text-slate-900 dark:text-white italic uppercase">{formData.corpseDisposal}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 italic">{formData.corpseDisposal === "CREMATION" ? "Cremation Location" : formData.corpseDisposal === "RESOMATION" ? "Resomation Location" : "Cemetery Location"}</span>
                                                <p className="font-black text-slate-900 dark:text-white italic uppercase">{formData.burialLocation}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 italic">Informant</span>
                                                <p className="font-black text-slate-900 dark:text-white italic uppercase">{resident?.firstName} {resident?.lastName} ({formData.relationship === "RELATIVE" ? `${formData.relationship} - ${formData.relationshipSpecify}` : formData.relationship})</p>
                                            </div>
                                            <div className="space-y-1">
                                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 italic">Informant Address</span>
                                                <p className="font-black text-slate-900 dark:text-white italic uppercase">{formData.informantAddress}</p>
                                            </div>
                                            {formData.civilStatus === "MARRIED" && formData.survivingSpouseName && (
                                                <div className="space-y-1">
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 italic">Surviving Spouse</span>
                                                    <p className="font-black text-slate-900 dark:text-white italic uppercase">{formData.survivingSpouseName}</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Registration Type Toggle */}
                                        <div className="pt-4 border-t border-slate-200 dark:border-white/5 space-y-4">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                <div className="flex items-center gap-4">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">Registration Type:</span>
                                                    <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-full border border-slate-200 dark:border-white/10 opacity-80">
                                                        <div
                                                            className={cn(
                                                                "px-6 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all duration-300 select-none",
                                                                formData.registrationType === "STANDARD"
                                                                    ? "bg-white dark:bg-slate-800 text-emerald-600 shadow-sm"
                                                                    : "text-slate-400"
                                                            )}
                                                        >
                                                            Standard
                                                        </div>
                                                        <div
                                                            className={cn(
                                                                "px-6 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all duration-300 select-none",
                                                                formData.registrationType === "LATE"
                                                                    ? "bg-white dark:bg-slate-800 text-emerald-600 shadow-sm"
                                                                    : "text-slate-400"
                                                            )}
                                                        >
                                                            Late
                                                        </div>
                                                    </div>
                                                </div>
                                                {formData.dateOfDeath && (() => {
                                                    const [y, m, d] = formData.dateOfDeath.split('-').map(Number);
                                                    const deathDate = new Date(y, m - 1, d);
                                                    const today = new Date();
                                                    const d1 = Date.UTC(deathDate.getFullYear(), deathDate.getMonth(), deathDate.getDate());
                                                    const d2 = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
                                                    const diffDays = Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
                                                    return (
                                                        <span className="text-[9px] font-black uppercase tracking-widest italic text-slate-400 bg-slate-100 dark:bg-white/5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/5">
                                                            {diffDays >= 30 
                                                                ? `Auto-selected Late (${diffDays} days since death)` 
                                                                : `Auto-selected Standard (${diffDays} days since death)`}
                                                        </span>
                                                    );
                                                })()}
                                            </div>

                                            {/* Miscellaneous Fee */}
                                            <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/60 dark:border-emerald-500/20">
                                                <div>
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">Miscellaneous Fee</span>
                                                    <p className="text-[9px] text-slate-400 italic mt-0.5">
                                                        {formData.registrationType === "STANDARD" ? "No additional fee for standard registration" : "Late registration surcharge"}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    {formData.registrationType === "STANDARD" ? (
                                                        <span className="text-lg font-black text-emerald-600 tracking-tight">FREE</span>
                                                    ) : (
                                                        <span className="text-lg font-black text-amber-600 tracking-tight">₱{lateFee.toFixed(2)}</span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="p-1.5 bg-emerald-500/10 rounded-lg">
                                                        <Upload className="w-3.5 h-3.5 text-emerald-500" />
                                                    </div>
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Required Documents</span>
                                                </div>



                                                <div className="pb-4">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        {formData.registrationType === "STANDARD" && (
                                                            renderDocCard("Municipal Form No. 103", "municipalForm103", "doc-upload")
                                                        )}

                                                        {formData.registrationType === "LATE" && (
                                                            <>
                                                                {renderDocCard("PSA Negative Certification", "psaNegative", "doc-upload-psa")}
                                                                {renderDocCard("Affidavit of Delayed Registration", "affidavitOfDelay", "doc-upload-affidavit")}
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>

                                    {/* Valid ID Section */}
                                    <Card className="bg-slate-50 dark:bg-white/5 border-none p-6 rounded-[2rem] space-y-4">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1.5 bg-emerald-500/10 rounded-lg">
                                                <User className="w-3.5 h-3.5 text-emerald-500" />
                                            </div>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Informant&apos;s Valid ID</span>
                                        </div>
                                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider italic">
                                            Your registered ID from your profile is shown below. You may replace it with a different valid ID for this transaction only.
                                        </p>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {renderDocCard("Valid ID (Front)", "validIdFront", "valid-id-front", true)}
                                            {renderDocCard("Valid ID (Back)", "validIdBack", "valid-id-back", true)}
                                        </div>
                                    </Card>

                                    <div className="space-y-4">
                                        {/* Data Privacy Agreement panel */}
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
                                                        ? "border-red-500/50 bg-red-50/10 ring-2 ring-red-500/20 animate-pulse"
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
                                                            ? "border-red-500"
                                                            : "border-slate-300"
                                                )}
                                            >
                                                {policyAccepted ? <Check className="w-3 h-3" /> : null}
                                            </button>
                                            <div className="flex-1 text-xs text-left cursor-pointer select-none" onClick={(e) => { e.stopPropagation(); setPolicyOpen(true); }}>
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
                                                onClick={() => setCurrentStep("DETAILS")}
                                                className="h-14 rounded-full border-slate-200 dark:border-white/10 font-black uppercase tracking-widest italic text-[11px]"
                                            >
                                                <ArrowRight className="w-4 h-4 mr-2 rotate-180" />
                                                Modify Details
                                            </Button>
                                            {(() => {
                                                const isMissingRequiredDocs = formData.registrationType === "STANDARD"
                                                    ? !(files.municipalForm103 || existingUrls.municipalForm103)
                                                    : !(files.psaNegative || existingUrls.psaNegative) || !(files.affidavitOfDelay || existingUrls.affidavitOfDelay);
                                                return (
                                                    <Button
                                                        onClick={handleSubmit}
                                                        disabled={submitting || isMissingRequiredDocs}
                                                        className={cn(
                                                            "md:col-span-3 h-14 rounded-full font-black uppercase tracking-widest italic text-[11px] transition-all duration-300",
                                                            isMissingRequiredDocs
                                                                ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                                                                : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl shadow-emerald-500/20"
                                                        )}
                                                    >
                                                        {submitting ? (
                                                            <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                                        ) : isMissingRequiredDocs ? (
                                                            <>
                                                                Upload Required Documents
                                                                <AlertCircle className="w-5 h-5 ml-2" />
                                                            </>
                                                        ) : (
                                                            <>
                                                                Submit Death Registration Application
                                                                <CheckCircle2 className="w-5 h-5 ml-2" />
                                                            </>
                                                        )}
                                                    </Button>
                                                );
                                            })()}
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
