"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import SecureIdleTimer from "@/components/shared/SecureIdleTimer";
import PrivacyTermsModal from "@/components/shared/PrivacyTermsModal";
import { motion, AnimatePresence } from "framer-motion";
import {
    User,
    Loader2,
    Check,
    Home,
    Sparkles,
    Baby,
    ArrowRight,
    Upload,
    Search,
    CheckCircle2,
    Users,
    ChevronDown,
    AlertCircle
} from "lucide-react";


import DocumentViewerModal from "@/components/shared/DocumentViewerModal";
import PremiumDocumentUpload from "@/components/shared/PremiumDocumentUpload";
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
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
    getCurrentUserResident,
    getTransactionTypes,
    ensureCivilRegistryTransactionTypes,
    submitCivilRegistryTransaction,
    getSystemSettingAction,
    getTransactionById
} from "@/app/admin/transactions/actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { saveDraftFile, getDraftFiles, clearDraftFiles } from "@/lib/draftDb";
import { supabase } from "@/lib/supabase";

const STORAGE_KEY = "lcr_birth_registration_draft";

// --- UPLOAD FILE CLIENT-SIDE TO SUPABASE STORAGE (bypasses Vercel 4.5MB limit) ---
async function uploadFileClientSide(file: File, fieldName: string, userId: string): Promise<string> {
    const fileExt = file.name.split('.').pop() || 'bin';
    const fileName = `${userId}/${fieldName}_${Date.now()}.${fileExt}`;
    const filePath = `services/lcr/birth_registration/${fileName}`;

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

const EVIDENCE_LABELS: Record<string, string> = {
    A: "Baptismal Certificate",
    B: "School records",
    C: "Income tax return of parents",
    D: "Insurance Policy",
    E: "Medical records",
    F: "Others (Voter registration record, Barangay certification)",
    G: "Affidavit of 2 disinterested persons"
};

const EVIDENCE_OPTIONS = [
    { value: 'A', label: 'A. Baptismal Certificate' },
    { value: 'B', label: 'B. School records' },
    { value: 'C', label: 'C. Income tax return of parents' },
    { value: 'D', label: 'D. Insurance Policy' },
    { value: 'E', label: 'E. Medical records' },
    { value: 'F', label: 'F. Others (Voter registration record, Barangay certification)' },
    { value: 'G', label: 'G. Affidavit of 2 disinterested persons' }
];

// --- TYPES ---

type Step = "STATUS" | "IDENTITY" | "DETAILS" | "PARENTS" | "CONFIRM";

const STEPS: { id: Step; label: string; icon: any }[] = [
    { id: "STATUS", label: "Status", icon: Sparkles },
    { id: "IDENTITY", label: "Informant Info", icon: User },
    { id: "DETAILS", label: "Child Details", icon: Search },
    { id: "PARENTS", label: "Parental Info", icon: Users },
    { id: "CONFIRM", label: "Documents & Submit", icon: CheckCircle2 },
];

interface FormState {
    typeId: string;
    registryType: "BIRTH_REG";
    // Fields for the specific registration
    children: {
        firstName: string;
        middleName: string;
        lastName: string;
        suffix: string;
        sex: string;
        birthTime: string;
    }[];
    dateOfEvent: string;
    placeOfEvent: string;
    fatherFirstName: string;
    fatherMiddleName: string;
    fatherLastName: string;
    motherFirstName: string;
    motherMiddleName: string;
    motherLastName: string;
    birthType: string;
    birthTypeSpecify?: string;
    registrationType: "STANDARD" | "LATE";
    lateDuration?: "1-10" | "10-20" | "20+" | string;
    miscFee?: number;
    parentsMarried?: boolean;
    supportingEvidence1Type: string;
    supportingEvidence2Type: string;
    supportingEvidenceTypes: string[];
    supportingEvidence1Source: string;
    supportingEvidence2Source: string;
    // Shared
    paymentType: "WALK_IN";
    files: Record<string, File | null>;
    previews: Record<string, string | null>;
    idTypeOverride?: string;
    email: string;
    contactNumber: string;
    relationship: string;
    relationshipSpecify?: string;

    // Informant details from profile
    informantFirstName: string;
    informantMiddleName: string;
    informantLastName: string;
    informantSuffix: string;
    informantBirthDate: string;
    informantAge: string;
    informantCivilStatus: string;
    informantCitizenship: string;
    informantOccupation: string;
}

export default function BirthRegistrationPage() {
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
    const [, setShowErrors] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [resident, setResident] = useState<any>(null);
    const [revisionId, setRevisionId] = useState<string | null>(null);
    const [revisionTx, setRevisionTx] = useState<any>(null);

    const [form, setForm] = useState<FormState>({
        typeId: "",
        registryType: "BIRTH_REG",
        children: [{ firstName: "", middleName: "", lastName: "", suffix: "", sex: "", birthTime: "" }],
        dateOfEvent: "",
        placeOfEvent: "MUNICIPALITY OF MAPANDAN",
        fatherFirstName: "",
        fatherMiddleName: "",
        fatherLastName: "",
        motherFirstName: "",
        motherMiddleName: "",
        motherLastName: "",
        birthType: "SINGLE",
        birthTypeSpecify: "",
        registrationType: "STANDARD",
        miscFee: 0,
        lateDuration: "",
        supportingEvidence1Type: "",
        supportingEvidence2Type: "",
        supportingEvidenceTypes: [],
        supportingEvidence1Source: "",
        supportingEvidence2Source: "",
        paymentType: "WALK_IN",
        files: {},
        previews: {},
        idTypeOverride: "",
        email: "",
        contactNumber: "",
        relationship: "",
        relationshipSpecify: "",
        informantFirstName: "",
        informantMiddleName: "",
        informantLastName: "",
        informantSuffix: "",
        informantBirthDate: "",
        informantAge: "",
        informantCivilStatus: "",
        informantCitizenship: "",
        informantOccupation: ""
    });


    // Privacy / Terms modal state (shared key across LCR pages)
    const [policyOpen, setPolicyOpen] = useState(false);

    const [policyAccepted, setPolicyAccepted] = useState(false);

    const [viewerOpen, setViewerOpen] = useState(false);
    const [viewerFile, setViewerFile] = useState<File | null>(null);
    const [viewerUrl, setViewerUrl] = useState<string | null>(null);
    const [viewerTitle, setViewerTitle] = useState("");

    // Dropdown open state for evidence menu
    const [evidenceMenuOpen, setEvidenceMenuOpen] = useState(false);

    const handleViewFile = (file: File | null, existingUrl: string | null, title: string) => {
        setViewerFile(file);
        setViewerUrl(existingUrl);
        setViewerTitle(title);
        setViewerOpen(true);
    };

    // If the dateOfEvent is set from another source (e.g. profile hydrate), keep registrationType in sync
    useEffect(() => {
        if (!form.dateOfEvent) return;

        try {
            const dob = new Date(form.dateOfEvent);
            const today = new Date();

            const dobNorm = new Date(dob.getFullYear(), dob.getMonth(), dob.getDate());
            const todayNorm = new Date(today.getFullYear(), today.getMonth(), today.getDate());

            const diffDays = Math.floor((todayNorm.getTime() - dobNorm.getTime()) / (1000 * 60 * 60 * 24));
            const isLate = diffDays > 30;

            setForm(prev => {
                const desired = isLate ? "LATE" : "STANDARD";
                let lateDuration = prev.lateDuration;
                let miscFee = prev.miscFee;

                if (isLate) {
                    let age = todayNorm.getFullYear() - dobNorm.getFullYear();
                    const m = todayNorm.getMonth() - dobNorm.getMonth();
                    if (m < 0 || (m === 0 && todayNorm.getDate() < dobNorm.getDate())) {
                        age--;
                    }
                    if (age >= 20) {
                        lateDuration = "20+";
                        miscFee = 1015;
                    } else if (age >= 10) {
                        lateDuration = "10-20";
                        miscFee = 515;
                    } else {
                        lateDuration = "1-10";
                        miscFee = 315;
                    }
                } else {
                    lateDuration = "";
                    miscFee = 0;
                }

                if (prev.registrationType === desired && prev.lateDuration === lateDuration && prev.miscFee === miscFee) return prev;
                return {
                    ...prev,
                    registrationType: desired,
                    lateDuration,
                    miscFee
                };
            });
        } catch {
            // ignore
        }
    }, [form.dateOfEvent]);

    const handleAcceptPolicy = () => {
        setPolicyOpen(false);
        setPolicyAccepted(true);
        setErrors(prev => {
            const copy = { ...prev };
            delete copy.policyAccepted;
            return copy;
        });
    };

    const isRestoredRef = useRef(false);

    const baseFee = form.registrationType === "STANDARD" ? 0 : (
        form.lateDuration === "1-10" ? 315 : form.lateDuration === "10-20" ? 515 : form.lateDuration === "20+" ? 1015 : 0
    );

    // Misc fee represents the total amount payable (base fee + 215 for e-copy and hardcopy)
    const totalAmount = Number(baseFee || 0) + 215;

    // Restore progress from session storage & IndexedDB
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get("revisionId")) return;

        const savedStep = sessionStorage.getItem("birth-reg-step");
        const savedForm = sessionStorage.getItem("birth-reg-form");

        if (savedStep) setCurrentStep(savedStep as Step);
        if (savedForm) {
            try {
                const parsed = JSON.parse(savedForm);
                if (parsed && typeof parsed === "object") {
                    const parsedSupporting = parsed.supportingEvidenceTypes || ((parsed.supportingEvidence1Type || parsed.supportingEvidence2Type) ? [parsed.supportingEvidence1Type, parsed.supportingEvidence2Type].filter(Boolean) : []);

                    isRestoredRef.current = true;
                    setForm(prev => ({
                        ...prev,
                        ...parsed,
                        placeOfEvent: "MUNICIPALITY OF MAPANDAN",
                        supportingEvidenceTypes: parsedSupporting,
                        supportingEvidence1Type: parsed.supportingEvidence1Type || parsedSupporting[0] || "",
                        supportingEvidence2Type: parsed.supportingEvidence2Type || parsedSupporting[1] || ""
                    }));
                }
            } catch (e) {
                console.error("Failed to parse saved form", e);
            }
        }

        // Hydrate files from IndexedDB
        async function hydrateFiles() {
            try {
                const draftFiles = await getDraftFiles(STORAGE_KEY);
                if (draftFiles && Object.keys(draftFiles).length > 0) {
                    setForm(prev => {
                        const newFiles = { ...prev.files, ...draftFiles };
                        return {
                            ...prev,
                            files: newFiles
                        };
                    });

                    // Asynchronously read each image file to recover previews
                    Object.entries(draftFiles).forEach(([key, file]) => {
                        if (file && file.type.startsWith("image/")) {
                            const reader = new FileReader();
                            reader.onload = () => {
                                setForm(prev => ({
                                    ...prev,
                                    previews: { ...prev.previews, [key]: reader.result as string }
                                }));
                            };
                            reader.readAsDataURL(file);
                        }
                    });

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
            try {
                sessionStorage.setItem("birth-reg-step", currentStep);

                // Build a serializable snapshot: omit File objects and previews
                // to prevent SessionStorage QuotaExceeded errors. Binary files are stored in IndexedDB.
                const copy: any = { ...form };
                delete copy.files;
                delete copy.previews;

                sessionStorage.setItem("birth-reg-form", JSON.stringify(copy));
            } catch (err) {
                console.warn("Failed to persist form to sessionStorage:", err);
            }
        }
    }, [currentStep, form, loading, revisionId]);

    useEffect(() => {
        if (loading) return;
        if (isRestoredRef.current) {
            isRestoredRef.current = false;
            return;
        }

        if (form.relationship === "SELF" && resident) {
            setForm(prev => ({
                ...prev,
                children: [{
                    firstName: resident.firstName || "",
                    middleName: resident.middleName || "",
                    lastName: resident.lastName || "",
                    suffix: resident.suffix || "",
                    sex: resident.gender?.toUpperCase() || "",
                    birthTime: "",
                }],
                placeOfEvent: resident.placeOfBirth || resident.municipality || prev.placeOfEvent,
                dateOfEvent: resident.dateOfBirth ? new Date(resident.dateOfBirth).toISOString().split('T')[0] : prev.dateOfEvent,
                fatherFirstName: resident.fatherFirstName || prev.fatherFirstName,
                fatherMiddleName: resident.fatherMiddleName || prev.fatherMiddleName,
                fatherLastName: resident.fatherLastName || prev.fatherLastName,
                motherFirstName: resident.motherFirstName || prev.motherFirstName,
                motherMiddleName: resident.motherMiddleName || prev.motherMiddleName,
                motherLastName: resident.motherLastName || prev.motherLastName,
            }));
        }
    }, [form.relationship, resident, loading]);

    useEffect(() => {
        if (form.placeOfEvent !== "MUNICIPALITY OF MAPANDAN") {
            setForm(prev => ({
                ...prev,
                placeOfEvent: "MUNICIPALITY OF MAPANDAN"
            }));
        }
    }, [form.placeOfEvent]);

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

                const [resResult, typesResult] = await Promise.all([
                    getCurrentUserResident(),
                    getTransactionTypes()
                ]);

                if (resResult.success && resResult.data) {
                    const r = resResult.data;
                    setResident(r);
                    
                    if (txData) {
                        const addData = txData.additionalData as any || {};
                        const resSnapshot = txData.residentSnapshot as any || r || {};
                        
                        const previews: Record<string, string | null> = {};
                        const fileKeys = [
                            "marriageCertificate",
                            "municipalForm102",
                            "communityTaxCertificate",
                            "negativePSA",
                            "colb",
                            "affidavitDelayed",
                            "supportingEvidence1",
                            "supportingEvidence2"
                        ];
                        fileKeys.forEach(k => {
                            if (addData[k] && typeof addData[k] === "string" && addData[k].startsWith("http")) {
                                previews[k] = addData[k];
                            }
                        });

                        let fFN = addData.fatherFirstName || "";
                        let fMN = addData.fatherMiddleName || "";
                        let fLN = addData.fatherLastName || "";
                        if (!fFN && !fLN && addData.fatherName) {
                            const parts = addData.fatherName.split(/\s+/);
                            fLN = parts.pop() || "";
                            fFN = parts.shift() || "";
                            fMN = parts.join(" ") || "";
                        }

                        let mFN = addData.motherFirstName || "";
                        let mMN = addData.motherMiddleName || "";
                        let mLN = addData.motherLastName || "";
                        if (!mFN && !mLN && addData.motherName) {
                            const parts = addData.motherName.split(/\s+/);
                            mLN = parts.pop() || "";
                            mFN = parts.shift() || "";
                            mMN = parts.join(" ") || "";
                        }

                        let infFN = addData.informantFirstName || "";
                        let infMN = addData.informantMiddleName || "";
                        let infLN = addData.informantLastName || "";
                        let infSuf = addData.informantSuffix || "";
                        if (!infFN && !infLN && addData.informantName) {
                            const parts = addData.informantName.split(/\s+/);
                            infLN = parts.pop() || "";
                            infFN = parts.shift() || "";
                            if (["JR", "SR", "I", "II", "III", "IV"].includes(infLN.toUpperCase())) {
                                infSuf = infLN;
                                infLN = parts.pop() || "";
                            }
                            infMN = parts.join(" ") || "";
                        }

                        setForm(prev => ({
                            ...prev,
                            typeId: txData.typeId || prev.typeId,
                            children: addData.children || prev.children,
                            dateOfEvent: addData.dateOfEvent || prev.dateOfEvent,
                            placeOfEvent: addData.placeOfEvent || prev.placeOfEvent,
                            fatherFirstName: fFN,
                            fatherMiddleName: fMN,
                            fatherLastName: fLN,
                            motherFirstName: mFN,
                            motherMiddleName: mMN,
                            motherLastName: mLN,
                            birthType: addData.birthType || prev.birthType,
                            birthTypeSpecify: addData.birthTypeSpecify || prev.birthTypeSpecify,
                            registrationType: addData.registrationType || prev.registrationType,
                            lateDuration: addData.lateDuration || prev.lateDuration,
                            supportingEvidence1Type: addData.supportingEvidence1Type || prev.supportingEvidence1Type,
                            supportingEvidence2Type: addData.supportingEvidence2Type || prev.supportingEvidence2Type,
                            supportingEvidenceTypes: addData.supportingEvidenceTypes || prev.supportingEvidenceTypes || [],
                            supportingEvidence1Source: addData.supportingEvidence1Source || prev.supportingEvidence1Source,
                            supportingEvidence2Source: addData.supportingEvidence2Source || prev.supportingEvidence2Source,
                            email: addData.email || resSnapshot.email || prev.email,
                            contactNumber: addData.contactNumber || resSnapshot.contactNumber || prev.contactNumber,
                            relationship: addData.relationship || prev.relationship,
                            relationshipSpecify: addData.relationshipSpecify || prev.relationshipSpecify,
                            informantFirstName: infFN,
                            informantMiddleName: infMN,
                            informantLastName: infLN,
                            informantSuffix: infSuf,
                            informantBirthDate: addData.informatnBirthDate || addData.informantBirthDate || prev.informantBirthDate,
                            informantAge: addData.informantAge || prev.informantAge,
                            informantCivilStatus: addData.informantCivilStatus || prev.informantCivilStatus,
                            informantCitizenship: addData.informantCitizenship || prev.informantCitizenship,
                            informantOccupation: addData.informantOccupation || prev.informantOccupation,
                            previews
                        }));
                    } else {
                        setForm(prev => ({
                            ...prev,
                            email: prev.email || r.email || "",
                            contactNumber: prev.contactNumber || r.contactNumber || "",
                            informantFirstName: r.firstName || "",
                            informantMiddleName: r.middleName || "",
                            informantLastName: r.lastName || "",
                            informantSuffix: r.suffix || "",
                            informantBirthDate: r.dateOfBirth ? new Date(r.dateOfBirth).toISOString().split('T')[0] : "",
                            informantAge: r.age?.toString() || "",
                            informantCivilStatus: r.civilStatus || "",
                            informantCitizenship: r.citizenship || "Filipino",
                            informantOccupation: r.occupation || ""
                        }));
                    }
                }
                if (typesResult.success && typesResult.data) {
                    const lcrTypes = typesResult.data.filter((t: any) => t.category === "Civil Registry");

                    const currentDbType = lcrTypes.find((t: any) => t.code === "LCR_BIRTH_REG");
                    if (currentDbType) {
                        setForm(prev => ({
                            ...prev,
                            typeId: prev.typeId || currentDbType.id
                        }));
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

    // Do not force a default for parentsMarried; let user choose explicitly

    const handleBirthTypeChange = (val: string) => {
        let count = 1;
        if (val === "TWIN") count = 2;
        if (val === "TRIPLET") count = 3;
        if (val === "QUADRUPLET") count = 4;
        if (val === "QUINTUPLET") count = 5;
        if (val === "SEXTUPLET") count = 6;

        setForm(prev => {
            const currentChildren = [...prev.children];
            if (currentChildren.length < count) {
                // Add more
                for (let i = currentChildren.length; i < count; i++) {
                    currentChildren.push({ firstName: "", middleName: "", lastName: "", suffix: "", sex: "", birthTime: "" });
                }
            } else if (currentChildren.length > count) {
                // Remove extra
                currentChildren.splice(count);
            }
            return { 
                ...prev, 
                birthType: val, 
                children: currentChildren 
            };
        });
    };

    const handleChildNameChange = (index: number, field: keyof FormState['children'][0], value: string) => {
        setForm(prev => {
            const newChildren = [...prev.children];
            newChildren[index] = { ...newChildren[index], [field]: value.toUpperCase() };
            return { ...prev, children: newChildren };
        });
    };

    const handleDateOfEventChange = (value: string) => {
        // Auto-set registration type to LATE when DOB is more than 1 month ago
        if (!value) {
            setForm(prev => ({ ...prev, dateOfEvent: value }));
            return;
        }

        try {
            const dob = new Date(value);
            const today = new Date();

            // Normalize to dates only to avoid timezone issues
            const dobNorm = new Date(dob.getFullYear(), dob.getMonth(), dob.getDate());
            const todayNorm = new Date(today.getFullYear(), today.getMonth(), today.getDate());

            const diffDays = Math.floor((todayNorm.getTime() - dobNorm.getTime()) / (1000 * 60 * 60 * 24));

            const isLate = diffDays > 30; // more than ~1 month

            let lateDuration = "";
            let miscFee = 0;

            if (isLate) {
                let age = todayNorm.getFullYear() - dobNorm.getFullYear();
                const m = todayNorm.getMonth() - dobNorm.getMonth();
                if (m < 0 || (m === 0 && todayNorm.getDate() < dobNorm.getDate())) {
                    age--;
                }
                if (age >= 20) {
                    lateDuration = "20+";
                    miscFee = 1015;
                } else if (age >= 10) {
                    lateDuration = "10-20";
                    miscFee = 515;
                } else {
                    lateDuration = "1-10";
                    miscFee = 315;
                }
            }

            setForm(prev => ({
                ...prev,
                dateOfEvent: value,
                registrationType: isLate ? "LATE" : "STANDARD",
                lateDuration,
                miscFee
            }));

            // Do not show toast here to avoid popping while typing; notify user when they proceed.
        } catch {
            // Fallback to simple set
            setForm(prev => ({ ...prev, dateOfEvent: value }));
        }
    };


    const handleRemoveFile = (key: string) => {
        setForm(prev => {
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

    const renderDocCard = (doc: { key: string; label: string }) => {
        const file = form.files[doc.key] || null;
        const preview = form.previews[doc.key] || null;

        return (
            <PremiumDocumentUpload
                key={doc.key}
                label={doc.label}
                required
                file={file}
                previewUrl={preview}
                onFileSelect={async (newFile) => {
                    saveDraftFile(STORAGE_KEY, doc.key, newFile).catch(err => {
                        console.error("Failed to save draft file to IndexedDB:", err);
                    });
                    try {
                        toast.loading("Uploading and preparing document preview...", { id: `file-upload-${doc.key}` });
                        const userId = resident?.id || "anonymous";
                        const sanitizedKey = doc.key.replace(/[^a-zA-Z0-9_-]/g, '_');
                        const publicUrl = await uploadFileClientSide(newFile, sanitizedKey, userId);

                        setForm(prev => ({
                            ...prev,
                            files: { ...prev.files, [doc.key]: newFile },
                            previews: { ...prev.previews, [doc.key]: publicUrl }
                        }));
                        toast.success("Document uploaded & preview ready!", { id: `file-upload-${doc.key}` });
                    } catch (uploadErr) {
                        console.error(`[ClientUpload] Failed to upload ${doc.key} on-the-fly:`, uploadErr);
                        toast.error("Upload failed. Local copy stored (preview limited).", { id: `file-upload-${doc.key}` });

                        setForm(prev => ({
                            ...prev,
                            files: { ...prev.files, [doc.key]: newFile },
                            previews: { ...prev.previews, [doc.key]: newFile.type.startsWith("image/") ? URL.createObjectURL(newFile) : null }
                        }));
                    }
                    setErrors(prev => {
                        if (!prev.documents) return prev;
                        const copy = { ...prev };
                        delete copy.documents;
                        return copy;
                    });
                }}
                onClear={() => handleRemoveFile(doc.key)}
                onView={() => handleViewFile(file, preview, doc.label)}
                error={!!errors.documents && !file && !preview}
            />
        );
    };

    const toggleSupportingEvidence = (val: string) => {
        setForm(prev => {
            const current = prev.supportingEvidenceTypes || [];
            let next: string[];
            if (current.includes(val)) {
                next = current.filter(v => v !== val);
            } else {
                if (current.length >= 2) {
                    toast.error("You can select only two supporting evidence types. Remove one to add another.");
                    return prev;
                }
                next = [...current, val];
            }

            if (next.length === 2) {
                setTimeout(() => setEvidenceMenuOpen(false), 0);
            }

            return {
                ...prev,
                supportingEvidenceTypes: next,
                supportingEvidence1Type: next[0] || "",
                supportingEvidence2Type: next[1] || ""
            };
        });
    };

    const isStepValid = (stepId: Step): boolean => {
        if (stepId === "STATUS") return true;
        if (stepId === "IDENTITY") {
            const isSpecifyValid = form.relationship !== "OTHER" || !!form.relationshipSpecify?.trim();
            return !!form.relationship && !!form.contactNumber && isSpecifyValid;
        }
        if (stepId === "DETAILS") {
            const childrenValid = form.children.every((c) => {
                if (!c.firstName || !c.lastName || !c.sex) return false;
                if (form.birthType !== "SINGLE" && !c.birthTime) return false;
                return true;
            });
            if (!childrenValid) return false;
            if (!form.dateOfEvent) return false;
            const birthDate = new Date(form.dateOfEvent);
            const today = new Date();
            today.setHours(23, 59, 59, 999);
            if (birthDate > today) return false;
            if (!form.placeOfEvent) return false;
            return true;
        }
        if (stepId === "PARENTS") {
            const hasMarried = typeof form.parentsMarried !== 'undefined';
            const hasFatherName = !!form.fatherFirstName?.trim() && !!form.fatherLastName?.trim();
            const hasMotherName = !!form.motherFirstName?.trim() && !!form.motherLastName?.trim();
            return hasMarried && hasFatherName && hasMotherName;
        }
        return true;
    };

    const validateStep = (step: Step) => {
        const errs: Record<string, string> = {};

        if (step === "IDENTITY") {
            if (!form.relationship) errs.relationship = "Please select relationship.";
            if (form.relationship === "OTHER" && !form.relationshipSpecify?.trim()) {
                errs.relationshipSpecify = "Please specify your relationship.";
            }
            if (!form.contactNumber) errs.contactNumber = "Please enter a contact number.";
        }

        if (step === "DETAILS") {
            form.children.forEach((c, i) => {
                if (!c.firstName) errs[`children.${i}.firstName`] = "Please enter first name.";
                if (!c.lastName) errs[`children.${i}.lastName`] = "Please enter last name.";
                if (!c.sex) errs[`children.${i}.sex`] = "Please select sex.";
                if (form.birthType !== "SINGLE" && !c.birthTime) {
                    errs[`children.${i}.birthTime`] = "Please enter exact time of birth.";
                }
            });
            if (!form.dateOfEvent) {
                errs.dateOfEvent = "Please select date of birth.";
            } else {
                const birthDate = new Date(form.dateOfEvent);
                const today = new Date();
                today.setHours(23, 59, 59, 999);
                if (birthDate > today) {
                    errs.dateOfEvent = "Date of birth cannot be in the future.";
                }
            }
            if (!form.placeOfEvent) errs.placeOfEvent = "Please enter place of birth.";
        }

        if (step === "PARENTS") {
            if (typeof form.parentsMarried === 'undefined') errs.parentsMarried = "Please indicate parents' marital status.";
            if (!form.fatherFirstName?.trim()) errs.fatherFirstName = "Please enter father's first name.";
            if (!form.fatherLastName?.trim()) errs.fatherLastName = "Please enter father's last name.";
            if (!form.motherFirstName?.trim()) errs.motherFirstName = "Please enter mother's first name.";
            if (!form.motherLastName?.trim()) errs.motherLastName = "Please enter mother's last name.";
        }

        setErrors(errs);
        const valid = Object.keys(errs).length === 0;
        setShowErrors(!valid);
        if (!valid) {
            toast.error("Please complete highlighted required fields.", { className: "font-black uppercase tracking-widest text-[10px] italic" });
            
            // Asynchronously find the first invalid element, scroll to it, and focus it
            setTimeout(() => {
                const firstErrorKey = Object.keys(errs)[0];
                if (firstErrorKey) {
                    // Try to find the element by name attribute first
                    let element: any = document.getElementsByName(firstErrorKey)[0] || 
                                  document.getElementById(firstErrorKey);
                    
                    // Fallbacks for children structure or custom select components
                    if (!element) {
                        if (firstErrorKey === "relationship") {
                            // Find Select Trigger
                            element = (document.querySelector('[role="combobox"]') || document.querySelector('button[aria-autocomplete="none"]')) as any;
                        } else if (firstErrorKey.startsWith("children.")) {
                            // Match children nested keys
                            const parts = firstErrorKey.split('.');
                            const index = parts[1];
                            const field = parts[2];
                            element = (document.querySelector(`[name="children.${index}.${field}"]`) || 
                                      document.querySelector(`input[placeholder*="${field === 'firstName' ? 'First' : 'Last'}"], select`)) as any;
                        } else if (firstErrorKey === "parentsMarried") {
                            element = document.getElementById("parents-married-section") as any;
                        }
                    }

                    if (element) {
                        element.scrollIntoView({ behavior: "smooth", block: "center" });
                        if (typeof (element as any).focus === "function") {
                            (element as any).focus();
                        }
                    }
                }
            }, 100);
        }
        return valid;
    };

    const handleSubmit = async () => {
        // Require privacy terms acceptance before allowing submit
        if (!policyAccepted) {
            setErrors(prev => ({ ...prev, policyAccepted: "You must agree to the Data Privacy & Terms before submitting." }));
            setShowErrors(true);
            toast.error("Please review and accept the Privacy Policy & Terms before submitting. Click Review to open the agreement.");
            return;
        }


        if (!form.relationship || (form.relationship === "OTHER" && !form.relationshipSpecify?.trim())) {
            toast.error("Please specify your relationship.");
            return;
        }

        if (!form.typeId) {
            toast.error("Service type not initialized. Please refresh the page.");
            return;
        }

        if (!form.dateOfEvent) {
            toast.error("Please provide the date of birth.");
            return;
        }



        if (form.registrationType === "LATE" && !form.lateDuration) {
            setErrors(prev => ({ ...prev, lateDuration: "Please select late registration period to compute the fee." }));
            setShowErrors(true);
            toast.error("Please select late registration period to compute the fee.");
            // Scroll to late-duration section
            try { document.getElementById('late-duration-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) { void e; }
            return;
        }

        // Validate required documents before starting submission so inline alerts show immediately
        const missingDocsQuick: string[] = [];
        if (form.registrationType === "STANDARD") {
            if (form.parentsMarried) {
                if (!(form.files['marriageCertificate'] || form.previews['marriageCertificate'])) missingDocsQuick.push('Marriage Certificate of Parents');
                if (!(form.files['municipalForm102'] || form.previews['municipalForm102'])) missingDocsQuick.push('Municipal Form 102');
            } else {
                if (!(form.files['communityTaxCertificate'] || form.previews['communityTaxCertificate'])) missingDocsQuick.push('Community Tax Certificate');
            }
        } else if (form.registrationType === "LATE") {
            const lateReqs = [
                'negativePSA',
                'colb',
                'affidavitDelayed',
                'supportingEvidence1',
                'supportingEvidence2',
                ...(form.parentsMarried ? ['marriageCertificate', 'municipalForm102'] : ['communityTaxCertificate'])
            ];
            lateReqs.forEach(k => {
                if (!(form.files[k] || form.previews[k])) {
                    const map: any = {
                        negativePSA: 'Negative Certification from PSA',
                        colb: 'Certificate of Live Birth (COLB)',
                        affidavitDelayed: 'Affidavit of Delayed Registration',
                        supportingEvidence1: 'Supporting Evidence 1',
                        supportingEvidence2: 'Supporting Evidence 2',
                        marriageCertificate: 'Marriage Certificate of Parents',
                        municipalForm102: 'Municipal Form 102',
                        communityTaxCertificate: 'Community Tax Certificate'
                    };
                    missingDocsQuick.push(map[k] || k);
                }
            });
        }

        if (missingDocsQuick.length > 0) {
            setErrors(prev => ({ ...prev, documents: `Please upload required documents: ${missingDocsQuick.join(', ')}` }));
            setShowErrors(true);
            toast.error('Please upload required documents before submitting.');
            
            // Scroll to specific section depending on what's missing
            const isSupportingEvidenceMissing = missingDocsQuick.some(doc => doc.includes('Supporting Evidence'));
            const isOtherDocsMissing = missingDocsQuick.some(doc => !doc.includes('Supporting Evidence'));
            
            if (isSupportingEvidenceMissing && !isOtherDocsMissing) {
                try { document.getElementById('supporting-evidence-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) { void e; }
            } else {
                try { document.getElementById('documents-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) { void e; }
            }
            return;
        }

        // If LATE, ensure evidence types are selected before submitting
        if (form.registrationType === "LATE") {
            if (!form.supportingEvidenceTypes || form.supportingEvidenceTypes.length < 2) {
                setErrors(prev => ({ ...prev, documents: "Please select two supporting evidence types." }));
                setShowErrors(true);
                toast.error("Please select two supporting evidence types before uploading files.");
                try { document.getElementById('supporting-evidence-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) { void e; }
                return;
            }
        }

        setSubmitting(true);
        try {
            const childrenList = form.children.map(c => `${c.firstName} ${c.middleName} ${c.lastName} ${c.suffix}`.trim());
            const subjectName = childrenList.join(" & ");

            // Create a full snapshot of the resident, updating only the volatile contact fields
            const residentSnapshot = {
                ...resident,
                contactNumber: form.contactNumber,
                email: form.email,
                occupation: form.informantOccupation
            };

            const formData = new FormData();
            formData.append("typeId", form.typeId);
            formData.append("registryType", "BIRTH_REG"); // Submit as birth_reg category type to map correctly inside actions.ts
            formData.append("residentSnapshot", JSON.stringify(residentSnapshot));
            if (revisionId) {
                formData.append("revisionId", revisionId);
            }

            // Base additional data that is always included
            const baseAdditionalData = {
                subjectName,
                children: form.children, // Store the structured array in additionalData
                dateOfEvent: form.dateOfEvent,
                placeOfEvent: form.placeOfEvent,
                birthType: form.birthType,
                registrationType: form.registrationType,
                fatherFirstName: form.fatherFirstName,
                fatherMiddleName: form.fatherMiddleName,
                fatherLastName: form.fatherLastName,
                fatherName: `${form.fatherFirstName} ${form.fatherMiddleName} ${form.fatherLastName}`.trim(),
                motherFirstName: form.motherFirstName,
                motherMiddleName: form.motherMiddleName,
                motherLastName: form.motherLastName,
                motherName: `${form.motherFirstName} ${form.motherMiddleName} ${form.motherLastName}`.trim(),
                relationship: form.relationship === "OTHER" ? form.relationshipSpecify : form.relationship,
                relationshipSpecify: form.relationshipSpecify || null,
                email: form.email,
                contactNumber: form.contactNumber,
                // Informant Details
                informantFirstName: form.informantFirstName,
                informantMiddleName: form.informantMiddleName,
                informantLastName: form.informantLastName,
                informantSuffix: form.informantSuffix,
                informantName: `${form.informantFirstName} ${form.informantMiddleName} ${form.informantLastName} ${form.informantSuffix}`.replace(/\s+/g, ' ').trim(),
                informatnBirthDate: form.informantBirthDate,
                informantAge: form.informantAge,
                informantCivilStatus: form.informantCivilStatus,
                informantCitizenship: form.informantCitizenship,
                informantOccupation: form.informantOccupation,
                idType: form.idTypeOverride || resident?.idType,
                idFrontUrl: resident?.idFrontUrl,
                idBackUrl: resident?.idBackUrl,
                lateDuration: form.lateDuration || null,
                parentsMarried: form.parentsMarried,
                miscFee: totalAmount,
                totalAmount: totalAmount,
                supportingEvidenceTypes: form.supportingEvidenceTypes || [],
                supportingEvidence1Type: form.supportingEvidence1Type || null,
                supportingEvidence2Type: form.supportingEvidence2Type || null,
            };



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
                    toast.loading(`Uploading document ${i + 1}/${fileEntries.length}...`, { id: "birth-upload-toast" });
                    const userId = resident?.id || "anonymous";
                    const url = await uploadFileClientSide(file, sanitizedKey, userId);
                    fileUrls[key] = url;
                } catch (uploadErr) {
                    console.error(`[ClientUpload] Failed to upload ${key}:`, uploadErr);
                    toast.error(`Failed to upload document: ${key}. Please try again.`, { id: "birth-upload-toast" });
                    setSubmitting(false);
                    return;
                }
            }
            toast.dismiss("birth-upload-toast");

            const updatedAdditionalData = {
                ...baseAdditionalData,
                ...fileUrls
            };

            formData.append("additionalData", JSON.stringify(updatedAdditionalData));

            console.log("Submitting with typeId:", form.typeId);
            const res = await submitCivilRegistryTransaction(formData);
            if (res.success && res.data) {
                toast.success(revisionId ? "Revision resubmitted successfully!" : "Birth Registration submitted successfully!");
                sessionStorage.removeItem("birth-reg-step");
                sessionStorage.removeItem("birth-reg-form");
                await clearDraftFiles(STORAGE_KEY);
                router.push(`/user/services/requests/${res.data.id}`);
            } else {
                toast.error(res.error || "Submission failed", {
                    description: "Please check your network connection and try again."
                });
            }
        } catch (err: any) {
            console.error("Submission error details:", err);
            toast.error("Registration failed to submit", {
                description: err.message || "An unexpected error occurred during submission."
            });
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950">
                <Loader2 className="w-10 h-10 animate-spin mb-4" style={{ color: themeColor }} />
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
                .text-blue-500, [class*="text-blue-500"]:not(input):not(select):not(textarea) {
                    color: ${themeColor} !important;
                }
                .text-blue-600, [class*="text-blue-600"]:not(input):not(select):not(textarea) {
                    color: ${themeColor} !important;
                }
                .bg-blue-500, [class*="bg-blue-500"] {
                    background-color: ${themeColor} !important;
                }
                .bg-blue-600, [class*="bg-blue-600"] {
                    background-color: ${themeColor} !important;
                }
                .border-blue-500, [class*="border-blue-500"] {
                    border-color: ${themeColor} !important;
                }
                .border-blue-600, [class*="border-blue-600"] {
                    border-color: ${themeColor} !important;
                }
                .bg-blue-500\\/10, [class*="bg-blue-500/10"] {
                    background-color: ${themeColor}1a !important;
                }
                .bg-blue-500\\/5, [class*="bg-blue-500/5"] {
                    background-color: ${themeColor}0d !important;
                }
                .shadow-blue-500\\/20, [class*="shadow-blue-500/20"] {
                    --tw-shadow-color: ${themeColor}33 !important;
                }
                .hover\\:bg-blue-600:hover, [class*="hover:bg-blue-600"]:hover {
                    background-color: ${themeColor} !important;
                    filter: brightness(0.9);
                }
                .hover\\:border-blue-500\\/50:hover, [class*="hover:border-blue-500/50"]:hover {
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
            <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 pb-0 space-y-12">
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
                            <BreadcrumbPage className="text-[10px] font-black uppercase tracking-widest italic text-emerald-700 dark:text-emerald-400">Birth Registration</BreadcrumbPage>
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
                            <Baby className="w-4 h-4 text-emerald-500" style={{ color: themeColor }} />
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500 dark:text-white/70 italic">Local Civil Registry</span>
                    </div>

                    <h1 className="text-2xl md:text-4xl font-black uppercase italic tracking-tighter leading-none">
                        Birth <span style={{ color: themeColor }}>Registration</span>
                    </h1>

                    <p className="text-slate-600 dark:text-slate-300 font-medium text-xs leading-relaxed max-w-xl italic">
                        Register a new birth record in the municipality. Complete all sections and upload the required supporting documents to submit your application.
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

            <div className="space-y-6">

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
                                            // Check steps between currentStep and target step sequentially
                                            for (let i = currentIdx; i < targetIdx; i++) {
                                                if (!validateStep(STEPS[i].id)) return;
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
                                                    if (!validateStep(STEPS[i].id)) return;
                                                }
                                                setCurrentStep(step.id);
                                            }
                                        }
                                    }}
                                    className={cn(
                                        "flex flex-col items-center gap-2 md:gap-3 relative z-10 font-black group",
                                        (() => {
                                            const targetIdx = STEPS.findIndex(s => s.id === step.id);
                                            const currentIdx = STEPS.findIndex(s => s.id === currentStep);
                                            if (targetIdx <= currentIdx || step.id === "STATUS") return "cursor-pointer";
                                            // Check if all preceding steps from current to target are valid
                                            for (let i = currentIdx; i < targetIdx; i++) {
                                                if (!isStepValid(STEPS[i].id)) return "opacity-50 cursor-not-allowed";
                                            }
                                            return "cursor-pointer";
                                        })()
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

                    <Card className="p-6 md:p-10 rounded-[2.5rem] border border-slate-200/50 dark:border-white/5 bg-white dark:bg-[#0f1117] shadow-xl dark:shadow-2xl overflow-hidden min-h-[400px]">
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
                                        <h2 className="text-xl md:text-2xl font-black italic uppercase tracking-tighter leading-tight">IDENTITY <span className="text-primary italic" style={{ color: themeColor }}>CONFIRMATION</span></h2>
                                        <p className="text-[10px] md:text-xs text-slate-500 font-medium italic">Verify your personal records. Only the contact number should be provided/updated.</p>
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
                                        {/* Relationship to Child — above names, same 1/4 width */}
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            <div className="col-span-2 md:col-span-1 space-y-2">
                                                <div className="flex items-center justify-between ml-1">
                                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">Relationship to Child <span className="text-red-500">*</span></Label>
                                                    {form.relationship === "OTHER" && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setForm({ ...form, relationship: "", relationshipSpecify: "" })}
                                                            className="text-[9px] font-black uppercase text-blue-600 hover:underline"
                                                        >
                                                            Reset
                                                        </button>
                                                    )}
                                                </div>
                                                {form.relationship === "OTHER" ? (
                                                    <Input
                                                        id="relationshipSpecify"
                                                        autoFocus
                                                        placeholder="Please specify"
                                                        value={form.relationshipSpecify || ""}
                                                        onChange={(e) => setForm({ ...form, relationshipSpecify: e.target.value.toUpperCase() })}
                                                        className={cn(
                                                            "rounded-xl border-slate-950 dark:border-white h-12 font-bold italic bg-white dark:bg-slate-900",
                                                            errors.relationshipSpecify && "!border-2 !border-red-500"
                                                        )}
                                                    />
                                                ) : (
                                                    <Select
                                                        value={form.relationship}
                                                        onValueChange={(val) => setForm({ 
                                                            ...form, 
                                                            relationship: val,
                                                            relationshipSpecify: val === "OTHER" ? (form.relationshipSpecify || "") : "" 
                                                        })}
                                                    >
                                                        <SelectTrigger 
                                                            id="relationship"
                                                            style={{ height: '3rem' }}
                                                            className={cn(
                                                            "!h-12 w-full rounded-xl border-slate-950 dark:border-white focus:ring-blue-500 shadow-sm text-xs md:text-sm bg-white dark:bg-slate-900 transition-all font-bold",
                                                            errors.relationship && "!border-2 !border-red-500"
                                                        )}>
                                                            <SelectValue placeholder="Select relationship" />
                                                        </SelectTrigger>
                                                        <SelectContent className="rounded-xl border-slate-200 dark:border-white/10 italic">
                                                            <SelectItem value="MOTHER">Mother</SelectItem>
                                                            <SelectItem value="FATHER">Father</SelectItem>
                                                            <SelectItem value="GUARDIAN">Guardian/Relative</SelectItem>
                                                            <SelectItem value="OTHER">Other</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                )}
                                                {errors.relationship && !form.relationship && (
                                                    <p className="text-[9px] font-black text-red-500 uppercase italic tracking-widest ml-1 animate-pulse">{errors.relationship}</p>
                                                )}
                                                {form.relationship === "OTHER" && errors.relationshipSpecify && (
                                                    <p className="text-[9px] font-black text-red-500 uppercase italic tracking-widest ml-1 animate-pulse">{errors.relationshipSpecify}</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Names Row — First, Middle, Last, Suffix */}
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            <div className="col-span-2 md:col-span-1 space-y-2">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1">First Name</Label>
                                                <Input readOnly value={form.informantFirstName} className="rounded-xl border-slate-950 dark:border-white bg-slate-50 dark:bg-slate-900/50 h-12 font-bold italic" />
                                            </div>
                                            <div className="col-span-2 md:col-span-1 space-y-2">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1">Middle Name</Label>
                                                <Input readOnly value={form.informantMiddleName} className="rounded-xl border-slate-950 dark:border-white bg-slate-50 dark:bg-slate-900/50 h-12 font-bold italic" />
                                            </div>
                                            <div className="col-span-2 md:col-span-1 space-y-2">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1">Last Name</Label>
                                                <Input readOnly value={form.informantLastName} className="rounded-xl border-slate-950 dark:border-white bg-slate-50 dark:bg-slate-900/50 h-12 font-bold italic" />
                                            </div>
                                            <div className="col-span-2 md:col-span-1 space-y-2">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1">Suffix</Label>
                                                <Input readOnly value={form.informantSuffix} className="rounded-xl border-slate-950 dark:border-white bg-slate-50 dark:bg-slate-900/50 h-12 font-bold italic" />
                                            </div>
                                        </div>

                                        {/* Birth Details Row */}
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1">Birth Date</Label>
                                                <Input readOnly value={form.informantBirthDate} type="date" className="rounded-xl border-slate-950 dark:border-white bg-slate-50 dark:bg-slate-900/50 h-12 font-bold italic" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1">Age</Label>
                                                <Input readOnly value={form.informantAge} className="rounded-xl border-slate-950 dark:border-white bg-slate-50 dark:bg-slate-900/50 h-12 font-bold italic" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1">Civil Status</Label>
                                                <Input readOnly value={form.informantCivilStatus} className="rounded-xl border-slate-950 dark:border-white bg-slate-50 dark:bg-slate-900/50 h-12 font-bold italic" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1">Citizenship</Label>
                                                <Input readOnly value={form.informantCitizenship} className="rounded-xl border-slate-950 dark:border-white bg-slate-50 dark:bg-slate-900/50 h-12 font-bold italic" />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            <div className="col-span-2 space-y-2">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1">Occupation</Label>
                                                <Input
                                                    readOnly
                                                    className="rounded-xl border-slate-950 dark:border-white bg-slate-50 dark:bg-slate-900/50 h-12 transition-all font-bold italic"
                                                    value={form.informantOccupation}
                                                />
                                            </div>
                                            <div className="col-span-2 space-y-2">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1">Contact Number <span className="text-red-500">*</span></Label>
                                                <Input
                                                    id="contactNumber"
                                                    className={cn(
                                                        "rounded-xl border-slate-950 dark:border-white bg-white dark:bg-slate-900 h-12 transition-all font-bold italic",
                                                        (errors.contactNumber) && "!border-2 !border-red-500"
                                                    )}
                                                    placeholder="e.g. 0917XXXXXXX"
                                                    value={form.contactNumber}
                                                    onChange={(e) => setForm(p => ({ ...p, contactNumber: e.target.value.replace(/[^0-9+]/g, '') }))}
                                                />
                                                <p className="text-[9px] font-black text-amber-500 uppercase tracking-wider ml-1 animate-pulse">
                                                    * Note: Please use your active contact number. This will be used to contact you regarding your transaction.
                                                </p>
                                                {errors.contactNumber && (
                                                    <p className="text-[9px] font-black text-red-500 uppercase italic tracking-widest ml-1 animate-pulse">{errors.contactNumber}</p>
                                                )}
                                            </div>
                                        </div>

                                        <div 
                                            className="p-3 md:p-4 rounded-2xl md:rounded-3xl flex items-center gap-2 md:gap-3 border"
                                            style={{ 
                                                backgroundColor: `${themeColor}0d`, 
                                                borderColor: `${themeColor}26` 
                                            }}
                                        >
                                            <Sparkles className="w-3.5 h-3.5 shrink-0" style={{ color: themeColor }} />
                                            <p className="text-[8px] md:text-[10px] font-black italic leading-tight uppercase tracking-widest" style={{ color: themeColor }}>
                                                Note: Changes will update your Resident Profile upon submission.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex justify-end pt-6">
                                        <Button
                                            onClick={() => {
                                                if (!validateStep("IDENTITY")) return;
                                                setCurrentStep("DETAILS");
                                            }}
                                            className="rounded-full px-12 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest italic text-[10px] h-12 shadow-xl shadow-blue-500/20"
                                            style={{ backgroundColor: themeColor }}
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
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 1.05 }}
                                    className="space-y-6"
                                >
                                    <div className="space-y-2">
                                        <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight">Child Details</h2>
                                        <p className="text-xs text-slate-500 font-medium italic">Provide the birth details of the child</p>
                                    </div>

                                    <div className="space-y-8">
                                         {/* Type of Birth */}
                                         <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                             <div className="col-span-2 md:col-span-1 space-y-2">
                                                 <Label className="text-[10px] font-black uppercase tracking-widest text-blue-500 italic ml-1 flex items-center gap-1.5">
                                                     <Baby className="w-3 h-3" />Type of Birth <span className="text-red-500">*</span>
                                                 </Label>
                                                 <Select
                                                     value={form.birthType}
                                                     onValueChange={handleBirthTypeChange}
                                                 >
                                                     <SelectTrigger 
                                                         style={{ height: '3rem' }}
                                                         className="!h-12 w-full rounded-xl border-slate-950 dark:border-white focus:ring-blue-500 shadow-sm text-xs md:text-sm bg-white dark:bg-slate-900 transition-all font-bold"
                                                     >
                                                         <SelectValue placeholder="Select birth type" />
                                                     </SelectTrigger>
                                                     <SelectContent className="rounded-xl border-slate-200 dark:border-white/10 italic">
                                                         <SelectItem value="SINGLE">Single</SelectItem>
                                                         <SelectItem value="TWIN">Twin</SelectItem>
                                                         <SelectItem value="TRIPLET">Triplet</SelectItem>
                                                         <SelectItem value="QUADRUPLET">Quadruplets</SelectItem>
                                                         <SelectItem value="QUINTUPLET">Quintuplets</SelectItem>
                                                         <SelectItem value="SEXTUPLET">Sextuplets</SelectItem>
                                                     </SelectContent>
                                                 </Select>
                                             </div>
                                         </div>

                                         {/* Children Inputs */}
                                         <div className="space-y-6">
                                             {form.children.map((child, index) => (
                                                 <div key={index} className="space-y-6">
                                                     <div className="flex items-center gap-2 border-b border-slate-100 dark:border-white/5 pb-2">
                                                         <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 italic">Child {index + 1}</span>
                                                     </div>

                                                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                         <div className="space-y-2">
                                                             <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1">First Name <span className="text-red-500">*</span></Label>
                                                             <Input
                                                                 id={`children.${index}.firstName`}
                                                                 className={cn(
                                                                     "rounded-xl border-slate-950 dark:border-white bg-white dark:bg-slate-900 h-12 transition-all uppercase font-medium",
                                                                     (errors[`children.${index}.firstName`]) && "border-2 border-red-500"
                                                                 )}
                                                                 placeholder="First name"
                                                                 value={child.firstName}
                                                                 onChange={(e) => handleChildNameChange(index, 'firstName', e.target.value)}
                                                             />
                                                             {(errors[`children.${index}.firstName`]) && (
                                                                 <p className="text-[9px] font-black text-red-500 uppercase italic tracking-widest ml-1 animate-pulse">{errors[`children.${index}.firstName`]}</p>
                                                             )}
                                                         </div>
                                                         <div className="space-y-2">
                                                             <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1">Middle Name</Label>
                                                             <Input
                                                                 className="rounded-xl border-slate-950 dark:border-white bg-white dark:bg-slate-900 h-12 transition-all uppercase font-medium"
                                                                 placeholder="Middle name"
                                                                 value={child.middleName}
                                                                 onChange={(e) => handleChildNameChange(index, 'middleName', e.target.value)}
                                                             />
                                                         </div>
                                                         <div className="space-y-2">
                                                             <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1">Last Name <span className="text-red-500">*</span></Label>
                                                             <Input
                                                                 id={`children.${index}.lastName`}
                                                                 className={cn(
                                                                     "rounded-xl border-slate-950 dark:border-white bg-white dark:bg-slate-900 h-12 transition-all uppercase font-medium",
                                                                     (errors[`children.${index}.lastName`]) && "border-2 border-red-500"
                                                                 )}
                                                                 placeholder="Last name"
                                                                 value={child.lastName}
                                                                 onChange={(e) => handleChildNameChange(index, 'lastName', e.target.value)}
                                                             />
                                                             {(errors[`children.${index}.lastName`]) && (
                                                                 <p className="text-[9px] font-black text-red-500 uppercase italic tracking-widest ml-1 animate-pulse">{errors[`children.${index}.lastName`]}</p>
                                                             )}
                                                         </div>
                                                     </div>

                                                     <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                                         <div className="space-y-2 col-span-1">
                                                             <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1">Suffix</Label>
                                                             <Input
                                                                 className="rounded-xl border-slate-950 dark:border-white bg-white dark:bg-slate-900 h-12 transition-all uppercase font-medium"
                                                                 placeholder="e.g. Jr., III"
                                                                 value={child.suffix}
                                                                 onChange={(e) => handleChildNameChange(index, 'suffix', e.target.value)}
                                                             />
                                                         </div>
                                                         <div className="space-y-2 col-span-1">
                                                             <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1">Sex <span className="text-red-500">*</span></Label>
                                                             <Select
                                                                 value={child.sex || ""}
                                                                 onValueChange={(val) => handleChildNameChange(index, 'sex', val)}
                                                             >
                                                                 <SelectTrigger 
                                                                     style={{ height: '3rem' }}
                                                                     className={cn(
                                                                     "!h-12 w-full rounded-xl border border-slate-950 dark:border-white bg-white dark:bg-slate-900 shadow-sm text-xs text-left px-3 transition-all font-medium uppercase text-slate-800 dark:text-slate-100",
                                                                     (errors[`children.${index}.sex`]) && "!border-2 !border-red-500"
                                                                 )}>
                                                                     <SelectValue placeholder="Select sex" />
                                                                 </SelectTrigger>
                                                                 <SelectContent className="rounded-xl border-slate-200 dark:border-white/10 italic">
                                                                     <SelectItem value="MALE">MALE</SelectItem>
                                                                     <SelectItem value="FEMALE">FEMALE</SelectItem>
                                                                 </SelectContent>
                                                             </Select>
                                                             {(errors[`children.${index}.sex`]) && (
                                                                 <p className="text-[9px] font-black text-red-500 uppercase italic tracking-widest ml-1 animate-pulse">{errors[`children.${index}.sex`]}</p>
                                                             )}
                                                         </div>
                                                         {form.birthType !== "SINGLE" && (
                                                             <div className="space-y-2 col-span-1 md:col-span-2">
                                                                 <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1">Exact Time of Birth <span className="text-red-500">*</span></Label>
                                                                 <Input
                                                                     type="time"
                                                                     className={cn(
                                                                         "rounded-xl border border-slate-950 dark:border-white bg-white dark:bg-slate-900 h-12 transition-all font-medium",
                                                                         (errors[`children.${index}.birthTime`]) && "border-2 border-red-500"
                                                                     )}
                                                                     value={child.birthTime || ""}
                                                                     onChange={(e) => handleChildNameChange(index, 'birthTime', e.target.value)}
                                                                 />
                                                                 {(errors[`children.${index}.birthTime`]) && (
                                                                     <p className="text-[9px] font-black text-red-500 uppercase italic tracking-widest ml-1 animate-pulse">{errors[`children.${index}.birthTime`]}</p>
                                                                 )}
                                                             </div>
                                                         )}
                                                     </div>
                                                 </div>
                                             ))}
                                         </div>

                                         {/* Date & Place Shared */}
                                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                             <div className="space-y-2">
                                                 <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1">Date of Birth <span className="text-red-500">*</span></Label>
                                                 <Input
                                                     type="date"
                                                     className={cn(
                                                         "rounded-xl border-slate-950 dark:border-white bg-white dark:bg-slate-900 h-12 transition-all font-medium",
                                                         (errors.dateOfEvent) && "border-2 border-red-500"
                                                     )}
                                                     value={form.dateOfEvent}
                                                     max={new Date().toISOString().split('T')[0]}
                                                     onChange={(e) => handleDateOfEventChange(e.target.value)}
                                                 />
                                                 {errors.dateOfEvent && (
                                                     <p className="text-[9px] font-black text-red-500 uppercase italic tracking-widest ml-1 animate-pulse">{errors.dateOfEvent}</p>
                                                 )}
                                             </div>
                                             <div className="space-y-2">
                                                 <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1">Place of Birth <span className="text-red-500">*</span></Label>
                                                 <Input
                                                     readOnly
                                                     className={cn(
                                                         "rounded-xl border-slate-950 dark:border-white bg-slate-50 dark:bg-slate-900/50 h-12 transition-all uppercase font-bold italic cursor-not-allowed",
                                                         (errors.placeOfEvent) && "border-2 border-red-500"
                                                     )}
                                                     placeholder="Hospital/Municipality, Province"
                                                     value={form.placeOfEvent || "MUNICIPALITY OF MAPANDAN"}
                                                 />
                                                 {errors.placeOfEvent && (
                                                     <p className="text-[9px] font-black text-red-500 uppercase italic tracking-widest ml-1 animate-pulse">{errors.placeOfEvent}</p>
                                                 )}
                                             </div>
                                         </div>
                                    </div>

                                    <div className="flex justify-end pt-6">
                                        <Button
                                            onClick={() => {
                                                if (!validateStep("DETAILS")) return;
                                                // Show late-registration notice when user proceeds
                                                try {
                                                    if (form.dateOfEvent) {
                                                        const dob = new Date(form.dateOfEvent);
                                                        const today = new Date();
                                                        const dobNorm = new Date(dob.getFullYear(), dob.getMonth(), dob.getDate());
                                                        const todayNorm = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                                                        const diffDays = Math.floor((todayNorm.getTime() - dobNorm.getTime()) / (1000 * 60 * 60 * 24));
                                                        if (diffDays > 30 && form.registrationType === "LATE") {
                                                            toast.info("Registration set to LATE because date of birth is over 1 month old.");
                                                        }
                                                    }
                                                } catch {
                                                    // ignore
                                                }
                                                setCurrentStep("PARENTS");
                                            }}
                                            className="rounded-full px-12 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest italic text-[10px] h-12 shadow-xl shadow-blue-500/20"
                                        >
                                            Next Step
                                            <ArrowRight className="w-4 h-4 ml-2" />
                                        </Button>
                                    </div>
                                </motion.div>
                            )}

                            {currentStep === "PARENTS" && (
                                <motion.div
                                    key="parents-step"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 1.05 }}
                                    className="space-y-6"
                                >
                                    <div className="space-y-2">
                                        <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight">Parental Information</h2>
                                        <p className="text-xs text-slate-500 font-medium italic">Provide the full names of the child&apos;s parents</p>
                                    </div>

                                    {/* Parents' Marital Status */}
                                    <div className="space-y-4">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">Parents&apos; Marital Status <span className="text-red-500">*</span></Label>
                                        <div className="flex items-center gap-3">
                                            <button
                                                type="button"
                                                onClick={() => setForm(p => ({ ...p, parentsMarried: true }))}
                                                className={cn(
                                                    "px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all shadow-sm",
                                                    form.parentsMarried === true ? "bg-blue-600 text-white shadow-blue-500/20" : "bg-white dark:bg-slate-900 text-slate-600 border border-slate-950 dark:border-white hover:bg-slate-50 dark:hover:bg-slate-800",
                                                    errors.parentsMarried ? "ring-2 ring-red-400/60 border-red-500" : ""
                                                )}
                                                aria-pressed={form.parentsMarried === true}
                                            >
                                                Married
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setForm(p => ({ ...p, parentsMarried: false }))}
                                                className={cn(
                                                    "px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all shadow-sm",
                                                    form.parentsMarried === false ? "bg-blue-600 text-white shadow-blue-500/20" : "bg-white dark:bg-slate-900 text-slate-600 border border-slate-950 dark:border-white hover:bg-slate-50 dark:hover:bg-slate-800",
                                                    errors.parentsMarried ? "ring-2 ring-red-400/60 border-red-500" : ""
                                                )}
                                                aria-pressed={form.parentsMarried === false}
                                            >
                                                Not Married
                                            </button>
                                        </div>
                                        <p className="text-[9px] text-slate-400 font-semibold italic">If not married, the required documents will change accordingly.</p>
                                        {errors.parentsMarried && (
                                            <p className="text-[9px] font-black text-red-500 uppercase italic tracking-widest ml-1 animate-pulse">{errors.parentsMarried}</p>
                                        )}
                                    </div>

                                    <div className="space-y-6">
                                        {/* Father */}
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-white/5 pb-2">
                                                <div className="p-1 bg-blue-500/10 rounded-lg">
                                                    <Users className="w-4 h-4 text-blue-500" />
                                                </div>
                                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 italic">Father&apos;s Name</h3>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                                                 <div className="space-y-2">
                                                     <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1">First Name <span className="text-red-500">*</span></Label>
                                                     <Input
                                                         id="fatherFirstName"
                                                         className={cn(
                                                             "rounded-xl border-slate-950 dark:border-white bg-white dark:bg-slate-900 transition-all uppercase font-medium h-12",
                                                             errors.fatherFirstName && "!border-2 !border-red-500"
                                                         )}
                                                         placeholder="First name"
                                                         value={form.fatherFirstName}
                                                         onChange={(e) => setForm({ ...form, fatherFirstName: e.target.value.toUpperCase() })}
                                                     />
                                                     {errors.fatherFirstName && (
                                                         <p className="text-[9px] font-black text-red-500 uppercase italic tracking-widest ml-1 animate-pulse">{errors.fatherFirstName}</p>
                                                     )}
                                                 </div>
                                                 <div className="space-y-2">
                                                     <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1">Middle Name</Label>
                                                     <Input
                                                         className="rounded-xl border-slate-950 dark:border-white bg-white dark:bg-slate-900 transition-all uppercase font-medium h-12"
                                                         placeholder="Middle name"
                                                         value={form.fatherMiddleName}
                                                         onChange={(e) => setForm({ ...form, fatherMiddleName: e.target.value.toUpperCase() })}
                                                     />
                                                 </div>
                                                 <div className="space-y-2">
                                                     <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1">Last Name <span className="text-red-500">*</span></Label>
                                                     <Input
                                                         id="fatherLastName"
                                                         className={cn(
                                                             "rounded-xl border-slate-950 dark:border-white bg-white dark:bg-slate-900 transition-all uppercase font-medium h-12",
                                                             errors.fatherLastName && "!border-2 !border-red-500"
                                                         )}
                                                         placeholder="Last name"
                                                         value={form.fatherLastName}
                                                         onChange={(e) => setForm({ ...form, fatherLastName: e.target.value.toUpperCase() })}
                                                     />
                                                     {errors.fatherLastName && (
                                                         <p className="text-[9px] font-black text-red-500 uppercase italic tracking-widest ml-1 animate-pulse">{errors.fatherLastName}</p>
                                                     )}
                                                 </div>
                                             </div>
                                        </div>

                                        {/* Mother */}
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-white/5 pb-2">
                                                <div className="p-1 bg-rose-500/10 rounded-lg">
                                                    <Users className="w-4 h-4 text-rose-500" />
                                                </div>
                                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-500 italic">Mother&apos;s Maiden Name</h3>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                 <div className="space-y-2">
                                                     <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1">First Name <span className="text-red-500">*</span></Label>
                                                     <Input
                                                         id="motherFirstName"
                                                         className={cn(
                                                             "rounded-xl border-slate-950 dark:border-white bg-white dark:bg-slate-900 transition-all uppercase font-medium h-12",
                                                             errors.motherFirstName && "!border-2 !border-red-500"
                                                         )}
                                                         placeholder="First name"
                                                         value={form.motherFirstName}
                                                         onChange={(e) => setForm({ ...form, motherFirstName: e.target.value.toUpperCase() })}
                                                     />
                                                     {errors.motherFirstName && (
                                                         <p className="text-[9px] font-black text-red-500 uppercase italic tracking-widest ml-1 animate-pulse">{errors.motherFirstName}</p>
                                                     )}
                                                 </div>
                                                 <div className="space-y-2">
                                                     <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1">Middle Name</Label>
                                                     <Input
                                                         className="rounded-xl border-slate-950 dark:border-white bg-white dark:bg-slate-900 transition-all uppercase font-medium h-12"
                                                         placeholder="Middle name"
                                                         value={form.motherMiddleName}
                                                         onChange={(e) => setForm({ ...form, motherMiddleName: e.target.value.toUpperCase() })}
                                                     />
                                                 </div>
                                                 <div className="space-y-2">
                                                     <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1">Last Name <span className="text-red-500">*</span></Label>
                                                     <Input
                                                         id="motherLastName"
                                                         className={cn(
                                                             "rounded-xl border-slate-950 dark:border-white bg-white dark:bg-slate-900 transition-all uppercase font-medium h-12",
                                                             errors.motherLastName && "!border-2 !border-red-500"
                                                         )}
                                                         placeholder="Last name"
                                                         value={form.motherLastName}
                                                         onChange={(e) => setForm({ ...form, motherLastName: e.target.value.toUpperCase() })}
                                                     />
                                                     {errors.motherLastName && (
                                                         <p className="text-[9px] font-black text-red-500 uppercase italic tracking-widest ml-1 animate-pulse">{errors.motherLastName}</p>
                                                     )}
                                                 </div>
                                             </div>
                                        </div>
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
                                                if (!validateStep("PARENTS")) return;
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
                                        <div>
                                            <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight">Registration Review</h2>
                                            <p className="text-xs text-slate-500 font-medium italic">Verify child information and upload required documents</p>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-1">
                                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 italic">Certificate Type</span>
                                                <p className="font-black text-slate-900 dark:text-white italic">Birth Registration</p>
                                            </div>
                                            <div className="space-y-1">
                                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 italic">Type of Birth</span>
                                                <p className="font-black text-slate-900 dark:text-white italic uppercase">{form.birthType}</p>
                                            </div>
                                            <div className="col-span-2 space-y-2">
                                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 italic">Children to Register</span>
                                                <div className="space-y-2.5 pl-1">
                                                    {form.children.map((child, i) => (
                                                        <div key={i} className="flex items-center gap-2">
                                                            <span className="text-[9px] font-black text-blue-500 uppercase italic">Child {i + 1}:</span>
                                                            <p className="font-black text-slate-900 dark:text-white italic uppercase text-sm">
                                                                {`${child.firstName} ${child.middleName} ${child.lastName} ${child.suffix}`.trim()}
                                                            </p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pt-4 border-t border-slate-200 dark:border-white/5 space-y-4">
                                            <div className="flex items-center gap-4">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">Registration Type:</span>
                                                <span className={cn(
                                                    "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest italic",
                                                    form.registrationType === "STANDARD" 
                                                        ? "bg-blue-500/10 text-blue-600 dark:text-blue-400" 
                                                        : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                                )}>
                                                    {form.registrationType === "STANDARD" ? "Standard" : "Late"}
                                                </span>
                                            </div>

                                            {form.registrationType === "LATE" && (
                                                <div id="late-duration-section" className="mt-4">
                                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1">Late Registration Period <span className="text-slate-400 font-medium">(Auto-selected based on age)</span></Label>
                                                    <div className="mt-2 flex flex-col md:flex-row gap-3">
                                                        <button
                                                            type="button"
                                                            disabled
                                                            className={cn(
                                                                "px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-not-allowed",
                                                                form.lateDuration === "1-10"
                                                                    ? "bg-blue-600 text-white"
                                                                    : "bg-slate-100 dark:bg-slate-900/50 text-slate-400 border border-slate-200/60 dark:border-white/5 opacity-60"
                                                            )}
                                                        >
                                                            1 month - 10 years (P315)
                                                        </button>
                                                        <button
                                                            type="button"
                                                            disabled
                                                            className={cn(
                                                                "px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-not-allowed",
                                                                form.lateDuration === "10-20"
                                                                    ? "bg-blue-600 text-white"
                                                                    : "bg-slate-100 dark:bg-slate-900/50 text-slate-400 border border-slate-200/60 dark:border-white/5 opacity-60"
                                                            )}
                                                        >
                                                            10 - 20 years (P515)
                                                        </button>
                                                        <button
                                                            type="button"
                                                            disabled
                                                            className={cn(
                                                                "px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-not-allowed",
                                                                form.lateDuration === "20+"
                                                                    ? "bg-blue-600 text-white"
                                                                    : "bg-slate-100 dark:bg-slate-900/50 text-slate-400 border border-slate-200/60 dark:border-white/5 opacity-60"
                                                            )}
                                                        >
                                                            20 years and above (P1015)
                                                        </button>
                                                    </div>
                                                    {errors.lateDuration && (
                                                        <p className="text-[9px] font-black text-red-500 uppercase italic tracking-widest ml-1 animate-pulse mt-2">{errors.lateDuration}</p>
                                                    )}
                                                </div>
                                            )}

                                            <div className="space-y-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="p-1.5 bg-blue-500/10 rounded-lg">
                                                        <Upload className="w-3.5 h-3.5 text-blue-500" />
                                                    </div>
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Required Documents</span>
                                                </div>

                                                <div className="mt-2">
                                                    <p className="text-[10px] text-slate-500 italic">Select parents&apos; marital status — required documents adjust automatically.</p>
                                                </div>



                                                <div id="documents-section" className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 items-start">
                                                    {form.registrationType === "STANDARD" ? (
                                                        (form.parentsMarried ? [
                                                            { key: "marriageCertificate", label: "Marriage Certificate of Parents" },
                                                            { key: "municipalForm102", label: "Municipal Form 102" }
                                                        ] : [
                                                            { key: "communityTaxCertificate", label: "Community Tax Certificate" }
                                                        ]).map((doc) => renderDocCard(doc))
                                                    ) : (
                                                        <>
                                                            {[
                                                                { key: "negativePSA", label: "Negative Certification from PSA" },
                                                                { key: "colb", label: "Certificate of Live Birth (COLB)" },
                                                                { key: "affidavitDelayed", label: "Affidavit of Delayed Registration" },
                                                                ...(form.parentsMarried ? [
                                                                    { key: "marriageCertificate", label: "Marriage Certificate of Parents" },
                                                                    { key: "municipalForm102", label: "Municipal Form 102" }
                                                                ] : [
                                                                    { key: "communityTaxCertificate", label: "Community Tax Certificate" }
                                                                ])
                                                            ].map((doc) => renderDocCard(doc))}

                                                            <div id="supporting-evidence-section" className="col-span-1 md:col-span-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4">
                                                                <div className="space-y-3 w-full">
                                                                    <div>
                                                                        <Label className="text-[9px] font-black uppercase tracking-wider text-slate-500 italic">Supporting Evidence (select up to 2) <span className="text-red-500">*</span></Label>
                                                                        <DropdownMenu open={evidenceMenuOpen} onOpenChange={setEvidenceMenuOpen}>
                                                                            <DropdownMenuTrigger className={cn(
                                                                                "h-10 rounded-xl border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-xs font-bold w-full text-left px-3 flex items-center justify-between transition-all",
                                                                                errors.documents && (!form.supportingEvidenceTypes || form.supportingEvidenceTypes.length < 2) && "!border-2 !border-red-500"
                                                                            )}>
                                                                                <div className="flex items-center gap-2">
                                                                                    {form.supportingEvidenceTypes && form.supportingEvidenceTypes.length > 0 ? (
                                                                                        <span className="text-xs font-bold uppercase">{form.supportingEvidenceTypes.map(v => EVIDENCE_LABELS[v] || v).join(', ')}</span>
                                                                                    ) : (
                                                                                        <span className="text-xs italic text-slate-400">Select up to 2 evidence types</span>
                                                                                    )}
                                                                                </div>
                                                                                <div className="flex items-center gap-2">
                                                                                    {form.supportingEvidenceTypes && form.supportingEvidenceTypes.length > 0 ? (
                                                                                        <div className="bg-blue-100 text-blue-700 rounded-full px-2 py-0.5 text-[10px] font-black uppercase">{form.supportingEvidenceTypes.length}</div>
                                                                                    ) : null}
                                                                                    <ChevronDown className="w-4 h-4 text-slate-500" />
                                                                                </div>
                                                                            </DropdownMenuTrigger>
                                                                            <DropdownMenuContent className="rounded-xl border-slate-200 dark:border-white/10 italic w-64">
                                                                                <div className="p-1">
                                                                                    {EVIDENCE_OPTIONS.map(opt => (
                                                                                        <DropdownMenuCheckboxItem
                                                                                            key={opt.value}
                                                                                            checked={form.supportingEvidenceTypes?.includes(opt.value)}
                                                                                            onCheckedChange={() => toggleSupportingEvidence(opt.value)}
                                                                                            onSelect={(e) => e.preventDefault()}
                                                                                            className="text-xs font-bold uppercase px-3 py-2 flex items-center justify-between"
                                                                                        >
                                                                                            <span>{opt.label}</span>
                                                                                            {form.supportingEvidenceTypes?.includes(opt.value) ? <Check className="w-4 h-4 text-blue-600" /> : null}
                                                                                        </DropdownMenuCheckboxItem>
                                                                                    ))}
                                                                                </div>
                                                                                <div className="border-t px-3 py-2 flex justify-end">
                                                                                    <button type="button" onClick={() => setEvidenceMenuOpen(false)} className="text-sm font-black uppercase text-blue-600">Done</button>
                                                                                </div>
                                                                            </DropdownMenuContent>
                                                                        </DropdownMenu>
                                                                    </div>

                                                                    <div>
                                                                        {(form.supportingEvidenceTypes && form.supportingEvidenceTypes.length === 2) ? (
                                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 items-start">
                                                                                {['supportingEvidence1', 'supportingEvidence2'].map((k, idx) => {
                                                                                    const selectedLabel = EVIDENCE_LABELS[form.supportingEvidenceTypes[idx]] || (k === 'supportingEvidence1' ? 'Supporting Evidence 1' : 'Supporting Evidence 2');
                                                                                    return renderDocCard({ key: k, label: selectedLabel });
                                                                                })}
                                                                            </div>
                                                                        ) : (
                                                                            <div className="text-[9px] text-slate-500 italic">Select two supporting evidence types to enable uploads</div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                                {errors.documents && (
                                                    <p className="text-[10px] font-black text-red-500 uppercase italic tracking-widest mt-2">{errors.documents}</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className={cn(
                                            "p-6 rounded-3xl border flex items-center gap-5 transition-all duration-300",
                                            errors.policyAccepted
                                                ? "border-2 border-red-500"
                                                : "border-slate-200/20 bg-[#11131e]/90 dark:bg-[#11131e]/90"
                                        )}>
                                            <button 
                                                type="button" 
                                                onClick={() => setPolicyOpen(true)} 
                                                className={cn(
                                                    "w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-300", 
                                                    policyAccepted 
                                                        ? "bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-500/20" 
                                                        : errors.policyAccepted
                                                            ? "border-2 border-red-500"
                                                            : "border-slate-500 hover:border-emerald-500"
                                                )}
                                            >
                                                {policyAccepted ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : null}
                                            </button>
                                            <div className="flex-1 cursor-pointer select-none" onClick={() => setPolicyOpen(true)}>
                                                <div className="font-black uppercase text-xs tracking-wider text-slate-100 italic">DATA PRIVACY AND TERMS AGREEMENT</div>
                                                <div className="text-[8px] text-slate-400 font-bold uppercase tracking-widest italic mt-2 leading-relaxed">
                                                    I AUTHORIZE THE LGU TO PROCESS MY PERSONAL INFORMATION IN ACCORDANCE WITH THE DATA PRIVACY ACT. I CONFIRM ALL INFO IS TRUE AND CORRECT. CLICK TO REVIEW AGREEMENT.
                                                </div>
                                                {errors.policyAccepted && (
                                                    <p className="text-[9px] font-black text-red-500 uppercase italic tracking-widest ml-1 animate-pulse mt-2">{errors.policyAccepted}</p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="p-5 rounded-2xl border border-slate-200/20 bg-white/30 dark:bg-white/5 space-y-3">
                                            <div className="flex justify-between items-center text-xs font-semibold italic text-slate-500">
                                                <span>Registration Fee ({form.registrationType === "STANDARD" ? "Standard" : "Late"})</span>
                                                <span className="font-extrabold text-slate-800 dark:text-slate-200">₱{baseFee}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs font-semibold italic text-slate-500 pb-2 border-b border-dashed border-slate-200/50">
                                                <span>E-Copy & Hardcopy Fee</span>
                                                <span className="font-extrabold text-slate-800 dark:text-slate-200">₱215</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">Total Amount Due</div>
                                                    <div className="text-[9px] text-slate-400 italic">Payable upon municipal verification</div>
                                                </div>
                                                <div className="text-xl font-black text-blue-600 dark:text-blue-400">₱{totalAmount}</div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                            <Button
                                                variant="ghost"
                                                onClick={() => setCurrentStep("PARENTS")}
                                                className="h-14 rounded-full border-slate-200 dark:border-white/10 font-black uppercase tracking-widest italic text-[11px]"
                                            >
                                                <ArrowRight className="w-4 h-4 mr-2 rotate-180" />
                                                Modify Details
                                            </Button>
                                            <Button
                                                onClick={handleSubmit}
                                                disabled={submitting}
                                                className={cn(
                                                    "md:col-span-3 h-14 rounded-full font-black uppercase tracking-widest italic text-[11px] transition-all duration-300",
                                                    submitting ? "bg-slate-200 text-slate-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-500/20"
                                                )}
                                            >
                                                {submitting ? (
                                                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                                ) : (
                                                    <>
                                                        Submit Birth Registration Application
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
