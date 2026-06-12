"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
    FileText,
    User,
    Loader2,
    Check,
    Sparkles,
    ArrowRight,
    Upload,
    Search,
    CheckCircle2,
    Heart,
    MapPin,
    Home,
    AlertCircle
} from "lucide-react";
import Link from "next/link";
import DocumentViewerModal from "@/components/shared/DocumentViewerModal";
import PremiumDocumentUpload from "@/components/shared/PremiumDocumentUpload";
import { supabase } from "@/lib/supabase";
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
    getTransactionTypes,
    ensureCivilRegistryTransactionTypes,
    submitCivilRegistryTransaction,
    getSystemSettingAction,
    getTransactionById
} from "@/app/admin/transactions/actions";
import { searchResidents } from "@/app/admin/actions";
import { toast } from "sonner";
import { compressImage } from "@/lib/image-compression";
import { useRouter } from "next/navigation";
import PrivacyTermsModal from "@/components/shared/PrivacyTermsModal";


// --- UPLOAD FILE CLIENT-SIDE TO SUPABASE STORAGE ---
async function uploadFileClientSide(file: File, fieldName: string, userId: string): Promise<string> {
    const fileExt = file.name.split('.').pop() || 'bin';
    const fileName = `${userId}/${fieldName}_${Date.now()}.${fileExt}`;
    const filePath = `services/lcr/death_certificate_request/${fileName}`;

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

// --- TYPES ---

type Step = "IDENTITY" | "DETAILS" | "PARENTS_DETAILS" | "PLACE_OF_DEATH" | "UPLOAD" | "CONFIRM";

const STEPS: { id: Step; label: string; icon: any }[] = [
    { id: "IDENTITY", label: "Requester Details", icon: User },
    { id: "DETAILS", label: "Deceased Details", icon: Search },
    { id: "PARENTS_DETAILS", label: "Parents' Details", icon: Heart },
    { id: "PLACE_OF_DEATH", label: "Place of Death", icon: MapPin },
    { id: "UPLOAD", label: "Supporting Docs", icon: Upload },
    { id: "CONFIRM", label: "Review & Submit", icon: CheckCircle2 },
];

interface FormState {
    typeId: string;
    idTypeOverride?: string;
    // Requester Details
    firstName: string;
    middleName: string;
    lastName: string;
    suffix: string;
    civilStatus: string;
    gender: string;
    relationship: string;
    email: string;
    contactNumber: string;
    informantAddress?: string;
    // Deceased Details
    deceasedFirstName: string;
    deceasedMiddleName: string;
    deceasedLastName: string;
    deceasedSuffix: string;
    dateOfDeath: string;
    placeOfDeath: string;
    causeOfDeath?: string;
    // Parents' Details
    fatherFirstName: string;
    fatherMiddleName: string;
    fatherLastName: string;
    motherFirstName: string;
    motherMiddleName: string;
    motherLastName: string;
    // Uploads
    files: Record<string, File | null>;
    previews: Record<string, string | null>;
}

// --- INDEXEDDB DRAFT HELPER ---
const DB_NAME = "DeathCertificateDraftDB";
const STORE_NAME = "drafts";
const DRAFT_KEY = "death-certificate";

function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        if (typeof window === "undefined") {
            reject(new Error("IndexedDB is only available in the browser"));
            return;
        }
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function saveDraft(data: any) {
    try {
        const db = await openDB();
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        store.put(data, DRAFT_KEY);
        return new Promise<void>((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    } catch (err) {
        console.error("Failed to save draft to IndexedDB:", err);
    }
}

async function getDraft(): Promise<any> {
    try {
        const db = await openDB();
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const request = store.get(DRAFT_KEY);
        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    } catch (err) {
        console.error("Failed to get draft from IndexedDB:", err);
        return null;
    }
}

async function clearDraft() {
    try {
        const db = await openDB();
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        store.delete(DRAFT_KEY);
        return new Promise<void>((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    } catch (err) {
        console.error("Failed to clear draft from IndexedDB:", err);
    }
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
                            className="w-full text-left px-4 py-3 hover:bg-slate-500/10 dark:hover:bg-white/5 rounded-xl flex items-center gap-3 transition-colors"
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

export default function DeathCertificateRequestPage() {
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
    const [draftLoaded, setDraftLoaded] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [showErrors, setShowErrors] = useState(false);
    const [dbType, setDbType] = useState<any>(null);
    const [resident, setResident] = useState<any>(null);
    const [revisionId, setRevisionId] = useState<string | null>(null);
    const [revisionTx, setRevisionTx] = useState<any>(null);

    const [form, setForm] = useState<FormState>({
        typeId: "",
        idTypeOverride: "",
        firstName: "",
        middleName: "",
        lastName: "",
        suffix: "",
        civilStatus: "",
        gender: "",
        relationship: "",
        contactNumber: "",
        email: "",
        informantAddress: "",
        deceasedFirstName: "",
        deceasedMiddleName: "",
        deceasedLastName: "",
        deceasedSuffix: "",
        dateOfDeath: "",
        placeOfDeath: "",
        causeOfDeath: "",
        fatherFirstName: "",
        fatherMiddleName: "",
        fatherLastName: "",
        motherFirstName: "",
        motherMiddleName: "",
        motherLastName: "",
        files: {
            validIdFront: null,
            validIdBack: null,
        },
        previews: {},
    });

    // Privacy policy modal state
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

    const renderIdCard = (label: string, fileKey: string) => {
        const file = form.files[fileKey] || null;
        const defaultUrl = fileKey === "validIdFront" ? resident?.idFrontUrl : resident?.idBackUrl;
        const preview = form.previews[fileKey] || defaultUrl || null;

        return (
            <PremiumDocumentUpload
                key={fileKey}
                label={label}
                required
                file={file}
                previewUrl={preview}
                error={showErrors && !file && !preview}
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

                        setForm(prev => ({
                            ...prev,
                            files: { ...prev.files, [fileKey]: fileToProcess },
                            previews: { ...prev.previews, [fileKey]: publicUrl }
                        }));
                        toast.success("Document uploaded & preview ready!", { id: `file-upload-${fileKey}` });
                    } catch (uploadErr) {
                        console.error(`[ClientUpload] Failed to upload ${fileKey} on-the-fly:`, uploadErr);
                        toast.error("Upload failed. Local copy stored (preview limited).", { id: `file-upload-${fileKey}` });

                        setForm(prev => ({
                            ...prev,
                            files: { ...prev.files, [fileKey]: fileToProcess },
                            previews: { ...prev.previews, [fileKey]: fileToProcess.type.startsWith("image/") ? URL.createObjectURL(fileToProcess) : null }
                        }));
                    }
                }}
                onClear={async () => {
                    setForm(prev => {
                        const nextFiles = { ...prev.files };
                        const nextPreviews = { ...prev.previews };
                        delete nextFiles[fileKey];
                        delete nextPreviews[fileKey];
                        return {
                            ...prev,
                            files: nextFiles,
                            previews: nextPreviews
                        };
                    });
                    toast.success("File removed successfully.");
                }}
                onView={() => handleViewFile(file, preview, label)}
            />
        );
    };

    useEffect(() => {
        async function init() {
            try {
                // Ensure civil registry transaction types are seeded in db
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

                const [resResult, typesResult] = await Promise.all([
                    getCurrentUserResident(),
                    getTransactionTypes()
                ]);

                let residentData: any = null;
                if (resResult.success && resResult.data) {
                    residentData = resResult.data;
                    setResident(residentData);
                }

                let lcrTypeId = "";
                if (typesResult.success && typesResult.data) {
                    const deathReqType = typesResult.data.find((t: any) => t.code === "LCR_DEATH");
                    if (deathReqType) {
                        setDbType(deathReqType);
                        lcrTypeId = deathReqType.id;
                    }
                }

                // Check for draft in IndexedDB (only if NOT in revision mode)
                const draft = revId ? null : await getDraft();
                if (draft) {
                    setForm({
                        typeId: lcrTypeId || draft.typeId || "",
                        idTypeOverride: draft.idTypeOverride || "",
                        firstName: draft.firstName || "",
                        middleName: draft.middleName || "",
                        lastName: draft.lastName || "",
                        suffix: draft.suffix || "",
                        civilStatus: draft.civilStatus || "",
                        gender: draft.gender || "",
                        relationship: draft.relationship || "",
                        contactNumber: draft.contactNumber || "",
                        email: draft.email || "",
                        informantAddress: draft.informantAddress || "",
                        deceasedFirstName: draft.deceasedFirstName || "",
                        deceasedMiddleName: draft.deceasedMiddleName || "",
                        deceasedLastName: draft.deceasedLastName || "",
                        deceasedSuffix: draft.deceasedSuffix || "",
                        dateOfDeath: draft.dateOfDeath || "",
                        placeOfDeath: draft.placeOfDeath || "",
                        causeOfDeath: draft.causeOfDeath || "",
                        fatherFirstName: draft.fatherFirstName || "",
                        fatherMiddleName: draft.fatherMiddleName || "",
                        fatherLastName: draft.fatherLastName || "",
                        motherFirstName: draft.motherFirstName || "",
                        motherMiddleName: draft.motherMiddleName || "",
                        motherLastName: draft.motherLastName || "",
                        files: {
                            validIdFront: draft.validIdFront || null,
                            validIdBack: draft.validIdBack || null,
                        },
                        previews: draft.previews || {},
                    });
                    if (draft.currentStep) {
                        setCurrentStep(draft.currentStep);
                    }
                } else if (txData) {
                    const addData = txData.additionalData as any || {};
                    const resSnapshot = txData.residentSnapshot as any || residentData || {};

                    const previews: Record<string, string | null> = {};
                    const fileKeys = ["validIdFront", "validIdBack"];
                    fileKeys.forEach(k => {
                        if (addData[k] && typeof addData[k] === "string" && addData[k].startsWith("http")) {
                            previews[k] = addData[k];
                        }
                    });

                    setForm(prev => ({
                        ...prev,
                        typeId: txData.typeId || prev.typeId,
                        idTypeOverride: addData.idType || prev.idTypeOverride,
                        firstName: resSnapshot.firstName || prev.firstName,
                        middleName: resSnapshot.middleName || prev.middleName,
                        lastName: resSnapshot.lastName || prev.lastName,
                        suffix: resSnapshot.suffix || prev.suffix,
                        civilStatus: (addData.civilStatus || resSnapshot.civilStatus || prev.civilStatus || "").toUpperCase(),
                        gender: (addData.gender || resSnapshot.gender || prev.gender || "").toUpperCase(),
                        relationship: addData.relationship || prev.relationship,
                        contactNumber: addData.contactNumber || resSnapshot.contactNumber || prev.contactNumber,
                        email: addData.email || resSnapshot.email || prev.email,
                        informantAddress: addData.informantAddress || prev.informantAddress,
                        deceasedFirstName: addData.deceasedFirstName || "",
                        deceasedMiddleName: addData.deceasedMiddleName || "",
                        deceasedLastName: addData.deceasedLastName || "",
                        deceasedSuffix: addData.deceasedSuffix || "",
                        dateOfDeath: addData.dateOfEvent || "",
                        placeOfDeath: addData.placeOfEvent || "",
                        causeOfDeath: addData.causeOfDeath || "",
                        fatherFirstName: addData.fatherFirstName || "",
                        fatherMiddleName: addData.fatherMiddleName || "",
                        fatherLastName: addData.fatherLastName || "",
                        motherFirstName: addData.motherFirstName || "",
                        motherMiddleName: addData.motherMiddleName || "",
                        motherLastName: addData.motherLastName || "",
                        previews
                    }));
                } else if (residentData) {
                    const parts = [
                        residentData.houseNumber && `#${residentData.houseNumber}`,
                        residentData.street && `${residentData.street} St.`,
                        residentData.purok && `Purok ${residentData.purok}`,
                        residentData.sitio && `Sitio ${residentData.sitio}`,
                        residentData.barangay && `Brgy. ${residentData.barangay}`,
                        residentData.municipality || "Mapandan",
                        residentData.province || "Pangasinan"
                    ].filter(Boolean);
                    const constructedAddr = parts.join(", ").toUpperCase();

                    setForm(prev => ({
                        ...prev,
                        typeId: lcrTypeId || prev.typeId,
                        firstName: residentData.firstName || "",
                        middleName: residentData.middleName || "",
                        lastName: residentData.lastName || "",
                        suffix: residentData.suffix || "",
                        civilStatus: (residentData.civilStatus || "").toUpperCase(),
                        gender: (residentData.gender || "").toUpperCase(),
                        contactNumber: residentData.contactNumber || "",
                        email: residentData.email || "",
                        informantAddress: constructedAddr
                    }));
                } else if (lcrTypeId) {
                    setForm(prev => ({ ...prev, typeId: lcrTypeId }));
                }

                setDraftLoaded(true);
            } catch (err) {
                console.error("Initialization Failed:", err);
                toast.error("Failed to load LCR parameters");
            } finally {
                setLoading(false);
            }
        }
        init();
    }, []);

    // Save draft when form data or step changes
    useEffect(() => {
        if (!draftLoaded || loading || revisionId) return;

        const timer = setTimeout(async () => {
            const draftData = {
                typeId: form.typeId,
                idTypeOverride: form.idTypeOverride,
                firstName: form.firstName,
                middleName: form.middleName,
                lastName: form.lastName,
                suffix: form.suffix,
                civilStatus: form.civilStatus,
                gender: form.gender,
                relationship: form.relationship,
                contactNumber: form.contactNumber,
                email: form.email,
                deceasedFirstName: form.deceasedFirstName,
                deceasedMiddleName: form.deceasedMiddleName,
                deceasedLastName: form.deceasedLastName,
                deceasedSuffix: form.deceasedSuffix,
                dateOfDeath: form.dateOfDeath,
                placeOfDeath: form.placeOfDeath,
                causeOfDeath: form.causeOfDeath,
                fatherFirstName: form.fatherFirstName,
                fatherMiddleName: form.fatherMiddleName,
                fatherLastName: form.fatherLastName,
                motherFirstName: form.motherFirstName,
                motherMiddleName: form.motherMiddleName,
                motherLastName: form.motherLastName,
                validIdFront: form.files.validIdFront,
                validIdBack: form.files.validIdBack,
                currentStep
            };
            await saveDraft(draftData);
        }, 500);

        return () => clearTimeout(timer);
    }, [form, currentStep, draftLoaded, loading, revisionId]);

    const handleAcceptPolicy = () => {
        setPolicyOpen(false);
        setPolicyAccepted(true);
    };

    const handleSubmit = async () => {
        if (submitting) return;
        if (!resident) {
            toast.error("User profile required to submit transaction");
            return;
        }

        // Validate ID uploads
        const hasIdFront = form.files["validIdFront"] || resident?.idFrontUrl || form.previews["validIdFront"];
        const hasIdBack = form.files["validIdBack"] || resident?.idBackUrl || form.previews["validIdBack"];
        if (!hasIdFront || !hasIdBack) {
            toast.error("Please upload both Front and Back of your Government ID.");
            return;
        }

        if (!form.idTypeOverride && !resident?.idType) {
            toast.error("Please select a Government ID type.");
            return;
        }

        if (!policyAccepted) {
            setShowErrors(true);
            toast.error("Please review and accept the Privacy Policy & Terms before submitting.");
            return;
        }

        setSubmitting(true);
        try {
            const formData = new FormData();
            formData.append("typeId", form.typeId);
            formData.append("registryType", "DEATH");
            if (revisionId) {
                formData.append("revisionId", revisionId);
            }

            // Build resident snapshot to update in database
            formData.append("residentSnapshot", JSON.stringify({
                firstName: form.firstName.trim(),
                lastName: form.lastName.trim(),
                middleName: form.middleName.trim(),
                suffix: form.suffix.trim(),
                contactNumber: form.contactNumber.trim(),
                email: form.email.trim(),
                gender: form.gender || resident?.gender,
                barangay: resident?.barangay || "Mapandan",
                municipality: resident?.municipality || "Mapandan",
                province: resident?.province || "Pangasinan"
            }));

            const deceasedFullName = `${form.deceasedFirstName} ${form.deceasedMiddleName} ${form.deceasedLastName} ${form.deceasedSuffix}`.replace(/\s+/g, " ").trim();

            const fileUrls: Record<string, string> = {};

            // First, copy any existing public URLs from previews
            Object.entries(form.previews || {}).forEach(([key, url]) => {
                if (url && typeof url === "string" && url.startsWith("http")) {
                    fileUrls[key] = url;
                }
            });

            const fileEntries = Object.entries(form.files);
            for (let i = 0; i < fileEntries.length; i++) {
                const [key, file] = fileEntries[i];
                if (!file) continue;
                const sanitizedKey = key.replace(/[^a-zA-Z0-9_-]/g, '_');

                if (fileUrls[key]) {
                    console.log(`[ClientUpload] Reusing existing public URL for ${key}:`, fileUrls[key]);
                    continue;
                }

                try {
                    toast.loading(`Uploading document ${i + 1}/${fileEntries.length}...`, { id: "req-upload-toast" });
                    const userId = resident?.id || "anonymous";
                    const url = await uploadFileClientSide(file, sanitizedKey, userId);
                    fileUrls[key] = url;
                } catch (uploadErr) {
                    console.error(`[ClientUpload] Failed to upload ${key}:`, uploadErr);
                    toast.error(`Failed to upload document: ${key}. Please try again.`, { id: "req-upload-toast" });
                    setSubmitting(false);
                    return;
                }
            }
            toast.dismiss("req-upload-toast");

            const additionalData = {
                subjectName: deceasedFullName,
                deceasedFirstName: form.deceasedFirstName.trim(),
                deceasedMiddleName: form.deceasedMiddleName.trim(),
                deceasedLastName: form.deceasedLastName.trim(),
                deceasedSuffix: form.deceasedSuffix.trim(),
                dateOfEvent: form.dateOfDeath,
                placeOfEvent: form.placeOfDeath.trim(),
                causeOfDeath: form.causeOfDeath?.trim() || "",
                fatherName: `${form.fatherFirstName} ${form.fatherMiddleName} ${form.fatherLastName}`.replace(/\s+/g, " ").trim(),
                fatherFirstName: form.fatherFirstName.trim(),
                fatherMiddleName: form.fatherMiddleName.trim(),
                fatherLastName: form.fatherLastName.trim(),
                motherName: `${form.motherFirstName} ${form.motherMiddleName} ${form.motherLastName}`.replace(/\s+/g, " ").trim(),
                motherFirstName: form.motherFirstName.trim(),
                motherMiddleName: form.motherMiddleName.trim(),
                motherLastName: form.motherLastName.trim(),
                relationship: form.relationship,
                email: form.email.trim(),
                contactNumber: form.contactNumber.trim(),
                idType: form.idTypeOverride || resident?.idType,
                idFrontUrl: fileUrls["validIdFront"] || resident?.idFrontUrl,
                idBackUrl: fileUrls["validIdBack"] || resident?.idBackUrl,
                totalAmount: dbType?.baseFee || 150.00
            };

            formData.append("additionalData", JSON.stringify(additionalData));

            const res = await submitCivilRegistryTransaction(formData);
            if (res.success && res.data) {
                await clearDraft();
                toast.success(revisionId ? "Revision resubmitted successfully!" : "Death Certificate Request submitted successfully!");
                router.push(`/user/services/requests/${res.data.id}`);
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

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950">
                <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-4" />
                <p className="text-sm font-black uppercase tracking-widest text-slate-400 italic">Syncing LCR Database...</p>
            </div>
        );
    }

    return (
        <div className="container max-w-4xl mx-auto px-4 pt-0 pb-0 space-y-8">
            <style dangerouslySetInnerHTML={{
                __html: `
                :root, * {
                    --primary-theme: ${themeColor} !important;
                }
                .text-slate-500, [class*="text-slate-500"]:not(input):not(select):not(textarea) {
                    color: ${themeColor} !important;
                }
                .text-slate-600, [class*="text-slate-600"]:not(input):not(select):not(textarea) {
                    color: ${themeColor} !important;
                }
                .bg-slate-500, [class*="bg-slate-500"] {
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
                .bg-slate-500\\/10, [class*="bg-slate-500/10"] {
                    background-color: ${themeColor}1a !important;
                }
                .bg-slate-500\\/5, [class*="bg-slate-500/5"] {
                    background-color: ${themeColor}0d !important;
                }
                .shadow-slate-500\\/20, [class*="shadow-slate-500/20"] {
                    --tw-shadow-color: ${themeColor}33 !important;
                }
                .hover\\:bg-slate-600:hover, [class*="hover:bg-slate-600"]:hover {
                    background-color: ${themeColor} !important;
                    filter: brightness(0.9);
                }
                .hover\\:border-slate-500\\/50:hover, [class*="hover:border-slate-500/50"]:hover {
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
            <PrivacyTermsModal
                isOpen={policyOpen}
                onClose={() => setPolicyOpen(false)}
                onAccept={handleAcceptPolicy}
                onDecline={() => setPolicyAccepted(false)}
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
            {/* Breadcrumbs */}
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
                            <BreadcrumbPage className="text-[10px] font-black uppercase tracking-widest italic text-emerald-700 dark:text-emerald-400">Death Certificate Request</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
            </div>

            {/* Premium Header/Banner with Ambient Gradient Backdrop */}
            <div className="relative overflow-hidden bg-white dark:bg-[#0c1017] p-6 md:p-10 rounded-2xl md:rounded-[2rem] border border-slate-100 dark:border-white/5 text-slate-800 dark:text-white shadow-xl dark:shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
                <div
                    className="absolute top-0 right-0 w-96 h-96 blur-[120px] rounded-full opacity-10 dark:opacity-20 pointer-events-none -mr-40 -mt-40 transition-colors duration-700"
                    style={{ backgroundColor: themeColor }}
                />

                <div className="space-y-3 md:space-y-4 max-w-2xl relative z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-white/10 flex items-center justify-center backdrop-blur-md">
                            <FileText className="w-4 h-4" style={{ color: themeColor }} />
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500 dark:text-white/70 italic">Local Civil Registry</span>
                    </div>

                    <h1 className="text-2xl md:text-4xl font-black uppercase italic tracking-tighter leading-none">
                        Request <span style={{ color: themeColor }}>Death Certificate</span>
                    </h1>

                    <p className="text-slate-600 dark:text-slate-300 font-medium text-xs leading-relaxed max-w-xl italic">
                        Request a certified true copy of an official death certificate. Complete the form and upload required identifications to verify your request.
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
                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-200 dark:bg-white/5 -translate-y-1/2" />
                <motion.div
                    className="absolute top-1/2 left-0 h-0.5 bg-slate-500 -translate-y-1/2 z-0"
                    initial={{ width: 0 }}
                    animate={{
                        width: `${(STEPS.findIndex(s => s.id === currentStep) / (STEPS.length - 1)) * 100}%`
                    }}
                />

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
                                    isActive ? "border-slate-500 text-slate-500 shadow-lg shadow-slate-500/20 scale-110" :
                                        isCompleted ? "bg-slate-500 border-slate-500 text-white" :
                                            "border-slate-200 dark:border-white/10 text-slate-400"
                                )}>
                                    {isCompleted ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                                </div>
                                <span className={cn(
                                    "text-[9px] font-black uppercase tracking-widest italic hidden md:block",
                                    isActive ? "text-slate-500" : "text-slate-400"
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

            {/* Form Wizards */}
            <Card className="p-8 rounded-[2.5rem] border-slate-200/50 dark:border-white/5 bg-white dark:bg-[#0f1117] shadow-xl dark:shadow-2xl min-h-[400px]">
                <AnimatePresence mode="wait">

                    {/* STEP 1: IDENTITY (REQUESTER DETAILS) */}
                    {currentStep === "IDENTITY" && (
                        <motion.div
                            key="identity-step"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-6 md:space-y-8"
                        >
                            <div className="space-y-1">
                                <h2 className="text-xl md:text-2xl font-black italic uppercase tracking-tighter leading-tight">
                                    Requester <span className="text-slate-500">Identity</span>
                                </h2>
                                <p className="text-[10px] md:text-xs text-slate-500 font-medium italic">
                                    Verify or enter your details as the requesting party.
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
                                {/* Name Fields */}
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">First Name</Label>
                                        <Input
                                            value={form.firstName}
                                            readOnly
                                            className="h-10 rounded-xl uppercase font-bold text-xs md:text-sm bg-slate-100 dark:bg-slate-800 text-slate-500"
                                            placeholder="First name"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Middle Name</Label>
                                        <Input
                                            value={form.middleName}
                                            readOnly
                                            className="h-10 rounded-xl uppercase font-bold text-xs md:text-sm bg-slate-100 dark:bg-slate-800 text-slate-500"
                                            placeholder="Middle name"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Last Name</Label>
                                        <Input
                                            value={form.lastName}
                                            readOnly
                                            className="h-10 rounded-xl uppercase font-bold text-xs md:text-sm bg-slate-100 dark:bg-slate-800 text-slate-500"
                                            placeholder="Last name"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Suffix</Label>
                                        <Input
                                            value={form.suffix}
                                            readOnly
                                            className="h-10 rounded-xl uppercase font-bold text-xs md:text-sm bg-slate-100 dark:bg-slate-800 text-slate-500"
                                            placeholder="Suffix"
                                        />
                                    </div>
                                </div>

                                {/* Personal details & Relationship */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Civil Status</Label>
                                        <Input
                                            value={form.civilStatus}
                                            readOnly
                                            className="h-10 rounded-xl uppercase font-bold text-xs md:text-sm bg-slate-100 dark:bg-slate-800 text-slate-500"
                                            placeholder="Civil Status"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Sex / Gender</Label>
                                        <Input
                                            value={form.gender}
                                            readOnly
                                            className="h-10 rounded-xl uppercase font-bold text-xs md:text-sm bg-slate-100 dark:bg-slate-800 text-slate-500"
                                            placeholder="Sex / Gender"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Relationship to Owner <span className="text-red-500">*</span></Label>
                                        <Select
                                            value={form.relationship}
                                            onValueChange={(val) => setForm(p => ({ ...p, relationship: val }))}
                                        >
                                            <SelectTrigger className={cn("h-10 rounded-xl text-xs md:text-sm font-bold uppercase", (showErrors && !form.relationship) && "border-2 border-red-500")}>
                                                <SelectValue placeholder="Select relationship" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="SPOUSE">Spouse</SelectItem>
                                                <SelectItem value="SON">Son</SelectItem>
                                                <SelectItem value="DAUGHTER">Daughter</SelectItem>
                                                <SelectItem value="MOTHER">Mother</SelectItem>
                                                <SelectItem value="FATHER">Father</SelectItem>
                                                <SelectItem value="SIBLING">Sibling</SelectItem>
                                                <SelectItem value="REPRESENTATIVE">Legal Representative</SelectItem>
                                                <SelectItem value="OTHER">Other</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {/* Informant Address */}
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Informant Address</Label>
                                    <Input
                                        value={form.informantAddress || ""}
                                        readOnly
                                        className="h-10 rounded-xl text-xs md:text-sm font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 uppercase"
                                        placeholder="Informant Address"
                                    />
                                </div>

                                {/* Contact Number */}
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Contact Number <span className="text-red-500">*</span></Label>
                                    <Input
                                        value={form.contactNumber}
                                        onChange={(e) => setForm(p => ({ ...p, contactNumber: e.target.value.replace(/[^0-9]/g, '') }))}
                                        className={cn("h-10 rounded-xl text-xs md:text-sm font-bold", (showErrors && !form.contactNumber) && "border-2 border-red-500")}
                                        placeholder="e.g. 09123456789"
                                    />
                                </div>
                            </div>

                            <div className="bg-slate-500/5 border border-slate-500/10 p-4 rounded-3xl flex items-center gap-3">
                                <Sparkles className="w-4 h-4 text-slate-500 shrink-0" />
                                <p className="text-[10px] text-slate-500 font-black italic leading-tight uppercase tracking-widest">
                                    Requester profile synchronized. Please ensure your contact details are updated.
                                </p>
                            </div>

                            {/* Step Nav */}
                            <div className="flex justify-end gap-3 pt-8">
                                <Button
                                    variant="ghost"
                                    onClick={() => router.push("/user/services/civil-registry")}
                                    className="rounded-full px-8 font-black uppercase tracking-widest italic text-[10px] h-12"
                                >
                                    <ArrowRight className="w-4 h-4 mr-2 rotate-180" />
                                    Cancel
                                </Button>
                                <Button
                                    onClick={() => {
                                        if (!form.firstName || !form.lastName || !form.civilStatus || !form.gender || !form.relationship || !form.contactNumber) {
                                            setShowErrors(true);
                                            toast.error("Please fill in all required requester fields.");
                                            return;
                                        }
                                        setShowErrors(false);
                                        setCurrentStep("DETAILS");
                                    }}
                                    className="rounded-full px-12 bg-slate-800 dark:bg-white dark:text-slate-900 text-white font-black uppercase tracking-widest italic text-[10px] h-12 shadow-xl hover:opacity-90 transition-opacity"
                                >
                                    Proceed to Deceased Details
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            </div>
                        </motion.div>
                    )}

                    {/* STEP 2: DETAILS (DECEASED DETAILS) */}
                    {currentStep === "DETAILS" && (
                        <motion.div
                            key="details-step"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-6 md:space-y-8"
                        >
                            <div className="space-y-1">
                                <h2 className="text-xl md:text-2xl font-black italic uppercase tracking-tighter leading-tight">
                                    Deceased <span className="text-slate-500">Details</span>
                                </h2>
                                <p className="text-[10px] md:text-xs text-slate-500 font-medium italic">
                                    Provide the official registry details of the deceased individual.
                                </p>
                            </div>

                            {/* Resident Database Search */}
                            <div className="space-y-3 p-6 rounded-[2rem] bg-slate-500/5 border border-slate-200/50 dark:border-white/5">
                                <div className="flex items-center gap-2">
                                    <Search className="w-4 h-4 text-slate-500" />
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                        Search Deceased in Resident Database
                                    </Label>
                                </div>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider italic">
                                    If the deceased was a registered resident of Mapandan, you can search and select their profile to automatically pre-fill the name fields below.
                                </p>
                                <ResidentSearch
                                    placeholder="Type resident name to search..."
                                    onSelect={(r) => {
                                        setForm(p => ({
                                            ...p,
                                            deceasedFirstName: r.firstName || "",
                                            deceasedMiddleName: r.middleName || "",
                                            deceasedLastName: r.lastName || "",
                                            deceasedSuffix: r.suffix || ""
                                        }));
                                        toast.success(`Selected ${r.firstName} ${r.lastName} as the deceased.`);
                                    }}
                                />
                            </div>

                            <div className="space-y-6">
                                {/* Deceased Name */}
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Deceased First Name <span className="text-red-500">*</span></Label>
                                        <Input
                                            value={form.deceasedFirstName}
                                            onChange={(e) => setForm(p => ({ ...p, deceasedFirstName: e.target.value }))}
                                            className={cn("h-10 rounded-xl uppercase font-bold text-xs md:text-sm", (showErrors && !form.deceasedFirstName) && "border-2 border-red-500")}
                                            placeholder="Deceased first name"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Deceased Middle Name</Label>
                                        <Input
                                            value={form.deceasedMiddleName}
                                            onChange={(e) => setForm(p => ({ ...p, deceasedMiddleName: e.target.value }))}
                                            className="h-10 rounded-xl uppercase font-bold text-xs md:text-sm"
                                            placeholder="Deceased middle name"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Deceased Last Name <span className="text-red-500">*</span></Label>
                                        <Input
                                            value={form.deceasedLastName}
                                            onChange={(e) => setForm(p => ({ ...p, deceasedLastName: e.target.value }))}
                                            className={cn("h-10 rounded-xl uppercase font-bold text-xs md:text-sm", (showErrors && !form.deceasedLastName) && "border-2 border-red-500")}
                                            placeholder="Deceased last name"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Deceased Suffix</Label>
                                        <Input
                                            value={form.deceasedSuffix}
                                            onChange={(e) => setForm(p => ({ ...p, deceasedSuffix: e.target.value }))}
                                            className="h-10 rounded-xl uppercase font-bold text-xs md:text-sm"
                                            placeholder="e.g. Jr."
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Step Nav */}
                            <div className="flex justify-end gap-3 pt-8">
                                <Button
                                    variant="ghost"
                                    onClick={() => setCurrentStep("IDENTITY")}
                                    className="rounded-full px-8 font-black uppercase tracking-widest italic text-[10px] h-12"
                                >
                                    <ArrowRight className="w-4 h-4 mr-2 rotate-180" />
                                    Back
                                </Button>
                                <Button
                                    onClick={() => {
                                        if (!form.deceasedFirstName || !form.deceasedLastName) {
                                            setShowErrors(true);
                                            toast.error("Please fill in all required deceased name fields.");
                                            return;
                                        }
                                        setShowErrors(false);
                                        setCurrentStep("PARENTS_DETAILS");
                                    }}
                                    className="rounded-full px-12 bg-slate-800 dark:bg-white dark:text-slate-900 text-white font-black uppercase tracking-widest italic text-[10px] h-12 shadow-xl hover:opacity-90 transition-opacity"
                                >
                                    Proceed to Parents&apos; Details
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            </div>
                        </motion.div>
                    )}

                    {/* STEP 3: PARENTS' DETAILS */}
                    {currentStep === "PARENTS_DETAILS" && (
                        <motion.div
                            key="parents-step"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-6 md:space-y-8"
                        >
                            <div className="space-y-1">
                                <h2 className="text-xl md:text-2xl font-black italic uppercase tracking-tighter leading-tight">
                                    Parents&apos; <span className="text-slate-500">Details</span>
                                </h2>
                                <p className="text-[10px] md:text-xs text-slate-500 font-medium italic">
                                    Provide the names of the deceased&apos;s parents for registry verification.
                                </p>
                            </div>

                            <div className="space-y-6">
                                {/* Father's Details */}
                                <div className="space-y-4 p-6 rounded-[2rem] bg-slate-500/5 border border-slate-200/50 dark:border-white/5">
                                    <div className="flex items-center gap-2">
                                        <User className="w-4 h-4 text-slate-500" />
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                            Father&apos;s Name
                                        </Label>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="space-y-1.5">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">First Name <span className="text-red-500">*</span></Label>
                                            <Input
                                                value={form.fatherFirstName}
                                                onChange={(e) => setForm(p => ({ ...p, fatherFirstName: e.target.value }))}
                                                className={cn("h-10 rounded-xl uppercase font-bold text-xs md:text-sm", (showErrors && !form.fatherFirstName) && "border-2 border-red-500")}
                                                placeholder="Father's first name"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Middle Name</Label>
                                            <Input
                                                value={form.fatherMiddleName}
                                                onChange={(e) => setForm(p => ({ ...p, fatherMiddleName: e.target.value }))}
                                                className="h-10 rounded-xl uppercase font-bold text-xs md:text-sm"
                                                placeholder="Father's middle name"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Last Name <span className="text-red-500">*</span></Label>
                                            <Input
                                                value={form.fatherLastName}
                                                onChange={(e) => setForm(p => ({ ...p, fatherLastName: e.target.value }))}
                                                className={cn("h-10 rounded-xl uppercase font-bold text-xs md:text-sm", (showErrors && !form.fatherLastName) && "border-2 border-red-500")}
                                                placeholder="Father's last name"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Mother's Details */}
                                <div className="space-y-4 p-6 rounded-[2rem] bg-slate-500/5 border border-slate-200/50 dark:border-white/5">
                                    <div className="flex items-center gap-2">
                                        <Heart className="w-4 h-4 text-slate-500" />
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                            Mother&apos;s Maiden Name
                                        </Label>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="space-y-1.5">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">First Name <span className="text-red-500">*</span></Label>
                                            <Input
                                                value={form.motherFirstName}
                                                onChange={(e) => setForm(p => ({ ...p, motherFirstName: e.target.value }))}
                                                className={cn("h-10 rounded-xl uppercase font-bold text-xs md:text-sm", (showErrors && !form.motherFirstName) && "border-2 border-red-500")}
                                                placeholder="Mother's first name"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Middle Name</Label>
                                            <Input
                                                value={form.motherMiddleName}
                                                onChange={(e) => setForm(p => ({ ...p, motherMiddleName: e.target.value }))}
                                                className="h-10 rounded-xl uppercase font-bold text-xs md:text-sm"
                                                placeholder="Mother's middle name"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Last Name <span className="text-red-500">*</span></Label>
                                            <Input
                                                value={form.motherLastName}
                                                onChange={(e) => setForm(p => ({ ...p, motherLastName: e.target.value }))}
                                                className={cn("h-10 rounded-xl uppercase font-bold text-xs md:text-sm", (showErrors && !form.motherLastName) && "border-2 border-red-500")}
                                                placeholder="Mother's maiden last name"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Step Nav */}
                            <div className="flex justify-end gap-3 pt-8">
                                <Button
                                    variant="ghost"
                                    onClick={() => setCurrentStep("DETAILS")}
                                    className="rounded-full px-8 font-black uppercase tracking-widest italic text-[10px] h-12"
                                >
                                    <ArrowRight className="w-4 h-4 mr-2 rotate-180" />
                                    Back
                                </Button>
                                <Button
                                    onClick={() => {
                                        if (!form.fatherFirstName || !form.fatherLastName || !form.motherFirstName || !form.motherLastName) {
                                            setShowErrors(true);
                                            toast.error("Please fill in all required parent name fields.");
                                            return;
                                        }
                                        setShowErrors(false);
                                        setCurrentStep("PLACE_OF_DEATH");
                                    }}
                                    className="rounded-full px-12 bg-slate-800 dark:bg-white dark:text-slate-900 text-white font-black uppercase tracking-widest italic text-[10px] h-12 shadow-xl hover:opacity-90 transition-opacity"
                                >
                                    Proceed to Place of Death
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            </div>
                        </motion.div>
                    )}

                    {/* STEP 4: PLACE OF DEATH */}
                    {currentStep === "PLACE_OF_DEATH" && (
                        <motion.div
                            key="place-of-death-step"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-6 md:space-y-8"
                        >
                            <div className="space-y-1">
                                <h2 className="text-xl md:text-2xl font-black italic uppercase tracking-tighter leading-tight">
                                    Place of <span className="text-slate-500">Death</span>
                                </h2>
                                <p className="text-[10px] md:text-xs text-slate-500 font-medium italic">
                                    Provide the date and location details of the death event.
                                </p>
                            </div>

                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Date of Death <span className="text-red-500">*</span></Label>
                                        <Input
                                            type="date"
                                            value={form.dateOfDeath}
                                            onChange={(e) => setForm(p => ({ ...p, dateOfDeath: e.target.value }))}
                                            className={cn("h-10 rounded-xl font-bold text-xs md:text-sm", (showErrors && !form.dateOfDeath) && "border-2 border-red-500")}
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Place of Death <span className="text-red-500">*</span></Label>
                                        <Input
                                            value={form.placeOfDeath}
                                            onChange={(e) => setForm(p => ({ ...p, placeOfDeath: e.target.value }))}
                                            className={cn("h-10 rounded-xl font-bold text-xs md:text-sm uppercase", (showErrors && !form.placeOfDeath) && "border-2 border-red-500")}
                                            placeholder="e.g. Mapandan, Pangasinan"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Cause of Death (Optional)</Label>
                                    <Input
                                        value={form.causeOfDeath || ""}
                                        onChange={(e) => setForm(p => ({ ...p, causeOfDeath: e.target.value }))}
                                        className="h-10 rounded-xl font-bold text-xs md:text-sm uppercase"
                                        placeholder="e.g. Cardiopulmonary Arrest"
                                    />
                                </div>
                            </div>

                            {/* Step Nav */}
                            <div className="flex justify-end gap-3 pt-8">
                                <Button
                                    variant="ghost"
                                    onClick={() => setCurrentStep("PARENTS_DETAILS")}
                                    className="rounded-full px-8 font-black uppercase tracking-widest italic text-[10px] h-12"
                                >
                                    <ArrowRight className="w-4 h-4 mr-2 rotate-180" />
                                    Back
                                </Button>
                                <Button
                                    onClick={() => {
                                        if (!form.dateOfDeath || !form.placeOfDeath) {
                                            setShowErrors(true);
                                            toast.error("Please fill in all required fields.");
                                            return;
                                        }
                                        setShowErrors(false);
                                        setCurrentStep("UPLOAD");
                                    }}
                                    className="rounded-full px-12 bg-slate-800 dark:bg-white dark:text-slate-900 text-white font-black uppercase tracking-widest italic text-[10px] h-12 shadow-xl hover:opacity-90 transition-opacity"
                                >
                                    Proceed to Document Upload
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            </div>
                        </motion.div>
                    )}

                    {/* STEP 5: UPLOAD */}
                    {currentStep === "UPLOAD" && (
                        <motion.div
                            key="upload-step"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-6 md:space-y-8"
                        >
                            <div className="space-y-1">
                                <h2 className="text-xl md:text-2xl font-black italic uppercase tracking-tighter leading-tight">
                                    Supporting <span className="text-slate-500">Documents</span>
                                </h2>
                                <p className="text-[10px] md:text-xs text-slate-500 font-medium italic">
                                    Upload legal proofs to verify your identity and association.
                                </p>
                            </div>

                            <div className="space-y-6">
                                {/* ID Type (from Resident Profile) */}
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Government ID Type <span className="text-red-500">*</span></Label>
                                    <Select
                                        value={form.idTypeOverride || resident?.idType || ""}
                                        onValueChange={(value) => setForm(prev => ({
                                            ...prev,
                                            idTypeOverride: value
                                        }))}
                                    >
                                        <SelectTrigger className="h-12 rounded-xl border-slate-200 focus:ring-slate-500 shadow-sm text-xs md:text-sm bg-white dark:bg-slate-900 transition-all font-bold">
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

                                {/* Grid Uploaders */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {renderIdCard("Valid Government ID (Front)", "validIdFront")}
                                    {renderIdCard("Valid Government ID (Back)", "validIdBack")}
                                </div>
                            </div>

                            {/* Step Nav */}
                            <div className="flex justify-end gap-3 pt-8">
                                <Button
                                    variant="ghost"
                                    onClick={() => setCurrentStep("PLACE_OF_DEATH")}
                                    className="rounded-full px-8 font-black uppercase tracking-widest italic text-[10px] h-12"
                                >
                                    <ArrowRight className="w-4 h-4 mr-2 rotate-180" />
                                    Back
                                </Button>
                                <Button
                                    onClick={() => {
                                        const hasIdFront = form.files["validIdFront"] || resident?.idFrontUrl || form.previews["validIdFront"];
                                        const hasIdBack = form.files["validIdBack"] || resident?.idBackUrl || form.previews["validIdBack"];
                                        if (!hasIdFront || !hasIdBack) {
                                            setShowErrors(true);
                                            toast.error("Please upload front and back of your Government ID.");
                                            return;
                                        }
                                        setShowErrors(false);
                                        setCurrentStep("CONFIRM");
                                    }}
                                    className="rounded-full px-12 bg-slate-800 dark:bg-white dark:text-slate-900 text-white font-black uppercase tracking-widest italic text-[10px] h-12 shadow-xl hover:opacity-90 transition-opacity"
                                >
                                    Proceed to Review & Confirm
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            </div>
                        </motion.div>
                    )}

                    {/* STEP 6: REVIEW & CONFIRM */}
                    {currentStep === "CONFIRM" && (
                        <motion.div
                            key="confirm-step"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-6 md:space-y-8"
                        >
                            <div className="space-y-1">
                                <h2 className="text-xl md:text-2xl font-black italic uppercase tracking-tighter leading-tight">
                                    Review & <span className="text-slate-500">Confirm</span>
                                </h2>
                                <p className="text-[10px] md:text-xs text-slate-500 font-medium italic">
                                    Review all parameters for this LCR request prior to filing.
                                </p>
                            </div>

                            {/* Review panels */}
                            <div className="space-y-6">
                                {/* Data Privacy checkbox */}
                                <div className={cn(
                                    "p-4 rounded-3xl border flex flex-col gap-3 shadow-sm bg-slate-500/5 transition-all duration-300",
                                    (showErrors && !policyAccepted) ? "border-2 border-red-500" : "border-slate-200/50 dark:border-white/5"
                                )}>
                                    <div className="flex items-start gap-4 w-full">
                                        <button
                                            type="button"
                                            onClick={() => setPolicyOpen(true)}
                                            className={cn(
                                                "w-5 h-5 rounded-full border flex items-center justify-center mt-0.5 shrink-0 transition-colors",
                                                policyAccepted ? "bg-slate-800 border-slate-800 dark:bg-white dark:border-white text-white dark:text-slate-900" :
                                                (showErrors && !policyAccepted) ? "border-2 border-red-500" : "border-slate-300"
                                            )}
                                        >
                                            {policyAccepted ? <Check className="w-3.5 h-3.5" /> : null}
                                        </button>
                                        <div className="flex-1 text-xs cursor-pointer select-none" onClick={() => setPolicyOpen(true)}>
                                            <div className="font-black uppercase text-[10px] tracking-wider text-slate-800 dark:text-white">Data Privacy & Certification Agreement</div>
                                            <div className="text-[9px] text-slate-500 italic mt-1 leading-relaxed">
                                                I certify that all details submitted are true, correct, and matching public registry records. I agree to the Municipal Data Privacy compliance. Click to review.
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setPolicyOpen(true)}
                                            className="text-[10px] font-black italic text-slate-600 dark:text-slate-400 hover:underline shrink-0"
                                        >
                                            Review
                                        </button>
                                    </div>
                                    {showErrors && !policyAccepted && (
                                        <div className="text-red-500 font-bold text-[9px] uppercase tracking-widest pl-9 flex items-center gap-1.5 animate-pulse">
                                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                            Data privacy agreement is required to submit
                                        </div>
                                    )}
                                </div>

                                {/* Summary columns */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-8 rounded-[2.5rem] bg-slate-500/5 border border-slate-200/50 dark:border-white/5">

                                    {/* Requester Details */}
                                    <div className="space-y-4">
                                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 italic">Requester Details</h3>
                                        <div className="space-y-2 text-xs">
                                            <div className="flex justify-between py-1 border-b border-slate-200/30 dark:border-white/5">
                                                <span className="text-slate-400 font-bold italic uppercase text-[9px]">Full Name:</span>
                                                <span className="font-black uppercase text-slate-900 dark:text-white">{`${form.firstName} ${form.middleName} ${form.lastName} ${form.suffix}`.trim()}</span>
                                            </div>
                                            <div className="flex justify-between py-1 border-b border-slate-200/30 dark:border-white/5">
                                                <span className="text-slate-400 font-bold italic uppercase text-[9px]">Civil Status / Sex:</span>
                                                <span className="font-black uppercase text-slate-900 dark:text-white">{form.civilStatus} / {form.gender}</span>
                                            </div>
                                            <div className="flex justify-between py-1 border-b border-slate-200/30 dark:border-white/5">
                                                <span className="text-slate-400 font-bold italic uppercase text-[9px]">Relationship:</span>
                                                <span className="font-black uppercase text-slate-900 dark:text-white">{form.relationship}</span>
                                            </div>
                                            <div className="flex justify-between py-1 border-b border-slate-200/30 dark:border-white/5">
                                                <span className="text-slate-400 font-bold italic uppercase text-[9px]">Contact:</span>
                                                <span className="font-black text-slate-900 dark:text-white">{form.contactNumber}</span>
                                            </div>
                                            <div className="flex justify-between py-1 border-b border-slate-200/30 dark:border-white/5">
                                                <span className="text-slate-400 font-bold italic uppercase text-[9px]">Address:</span>
                                                <span className="font-black uppercase text-slate-900 dark:text-white text-right max-w-[200px] truncate" title={form.informantAddress}>{form.informantAddress || "N/A"}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Deceased Details */}
                                    <div className="space-y-4">
                                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 italic">Deceased Details</h3>
                                        <div className="space-y-2 text-xs">
                                            <div className="flex justify-between py-1 border-b border-slate-200/30 dark:border-white/5">
                                                <span className="text-slate-400 font-bold italic uppercase text-[9px]">Deceased Individual:</span>
                                                <span className="font-black uppercase text-slate-900 dark:text-white">{`${form.deceasedFirstName} ${form.deceasedMiddleName} ${form.deceasedLastName} ${form.deceasedSuffix}`.trim()}</span>
                                            </div>
                                            <div className="flex justify-between py-1 border-b border-slate-200/30 dark:border-white/5">
                                                <span className="text-slate-400 font-bold italic uppercase text-[9px]">Father:</span>
                                                <span className="font-black uppercase text-slate-900 dark:text-white">{`${form.fatherFirstName} ${form.fatherMiddleName} ${form.fatherLastName}`.replace(/\s+/g, " ").trim()}</span>
                                            </div>
                                            <div className="flex justify-between py-1 border-b border-slate-200/30 dark:border-white/5">
                                                <span className="text-slate-400 font-bold italic uppercase text-[9px]">Mother (Maiden):</span>
                                                <span className="font-black uppercase text-slate-900 dark:text-white">{`${form.motherFirstName} ${form.motherMiddleName} ${form.motherLastName}`.replace(/\s+/g, " ").trim()}</span>
                                            </div>
                                            <div className="flex justify-between py-1 border-b border-slate-200/30 dark:border-white/5">
                                                <span className="text-slate-400 font-bold italic uppercase text-[9px]">Date of Death:</span>
                                                <span className="font-black text-slate-900 dark:text-white">{form.dateOfDeath}</span>
                                            </div>
                                            <div className="flex justify-between py-1 border-b border-slate-200/30 dark:border-white/5">
                                                <span className="text-slate-400 font-bold italic uppercase text-[9px]">Place of Death:</span>
                                                <span className="font-black uppercase text-slate-900 dark:text-white">{form.placeOfDeath}</span>
                                            </div>
                                            {form.causeOfDeath && (
                                                <div className="flex justify-between py-1 border-b border-slate-200/30 dark:border-white/5">
                                                    <span className="text-slate-400 font-bold italic uppercase text-[9px]">Cause of Death:</span>
                                                    <span className="font-black uppercase text-slate-900 dark:text-white">{form.causeOfDeath}</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between py-1 border-b border-slate-200/30 dark:border-white/5">
                                                <span className="text-slate-400 font-bold italic uppercase text-[9px]">Service Fee:</span>
                                                <span className="font-black text-slate-900 dark:text-white">₱{(dbType?.baseFee || 150).toFixed(2)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Step Nav */}
                            <div className="flex justify-end gap-3 pt-8">
                                <Button
                                    variant="ghost"
                                    onClick={() => setCurrentStep("UPLOAD")}
                                    className="rounded-full px-8 font-black uppercase tracking-widest italic text-[10px] h-12"
                                    disabled={submitting}
                                >
                                    <ArrowRight className="w-4 h-4 mr-2 rotate-180" />
                                    Back
                                </Button>
                                <Button
                                    onClick={handleSubmit}
                                    disabled={submitting}
                                    className="rounded-full px-12 bg-slate-800 dark:bg-white dark:text-slate-900 text-white font-black uppercase tracking-widest italic text-[10px] h-12 shadow-xl hover:opacity-90 transition-opacity flex items-center gap-2"
                                >
                                    {submitting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin text-white dark:text-slate-900" />
                                            Filing Request...
                                        </>
                                    ) : (
                                        <>
                                            File Death Certificate Request
                                            <Check className="w-4 h-4" />
                                        </>
                                    )}
                                </Button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </Card>
        </div>
    );
}
