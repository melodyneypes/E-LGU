"use client";


import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
    FileText,
    User,
    ChevronRight,
    Loader2,
    Check,
    AlertCircle,
    Sparkles,
    Baby,
    Heart,
    Skull,
    ArrowRight,
    Info,
    Upload,
    Search,
    CheckCircle2,
    Users,
    Home
} from "lucide-react";
import DocumentViewerModal from "@/components/shared/DocumentViewerModal";
import PremiumDocumentUpload from "@/components/shared/PremiumDocumentUpload";


import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Card } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import Link from "next/link";
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
import { useRouter, useSearchParams } from "next/navigation";
import PrivacyTermsModal from "@/components/shared/PrivacyTermsModal";
import { supabase } from "@/lib/supabase";

// --- UPLOAD FILE CLIENT-SIDE TO SUPABASE STORAGE ---
async function uploadFileClientSide(file: File, fieldName: string, userId: string): Promise<string> {
    const fileExt = file.name.split('.').pop() || 'bin';
    const fileName = `${userId}/${fieldName}_${Date.now()}.${fileExt}`;
    const filePath = `services/lcr/birth_certificate_request/${fileName}`;

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

type Step = "STATUS" | "IDENTITY" | "DETAILS" | "PARENTS" | "CONFIRM";

const STEPS: { id: Step; label: string; icon: any }[] = [
    { id: "STATUS", label: "Status", icon: Sparkles },
    { id: "IDENTITY", label: "Identity", icon: User },
    { id: "DETAILS", label: "Details", icon: Search },
    { id: "PARENTS", label: "Parents", icon: Users },
    { id: "CONFIRM", label: "Submit", icon: CheckCircle2 },
];

interface FormState {
    typeId: string;
    registryType: "BIRTH" | "MARRIAGE" | "DEATH" | "MARRIAGE_LICENSE";
    // Fields for the specific certificate
    fullName: string;
    certFirstName: string;
    certMiddleName: string;
    certLastName: string;
    certSuffix: string;
    certDocType: "Birth Certificate" | "Copy" | "Certified True Copy" | "Authenticated Copy";
    dateOfEvent: string;
    placeOfEvent: string;
    fatherName: string;
    fatherFirstName: string;
    fatherMiddleName: string;
    fatherLastName: string;
    motherName: string;
    motherFirstName: string;
    motherMiddleName: string;
    motherLastName: string;
    spouseName: string; // For marriage
    // Shared
    deliveryType: "PICK_UP" | "DELIVERY" | "E_COPY";
    paymentType: "WALK_IN";
    files: Record<string, File | null>;
    previews: Record<string, string | null>;
    idTypeOverride?: string;
    email: string;
    contactNumber: string;
    relationship: string;
    informantAddress?: string;
    sex: string;
}

const REGISTRY_TYPES = [
    {
        id: "BIRTH",
        label: "Birth Registration",
        icon: Baby,
        description: "Apply for a new Birth Registration or Request a Certified Copy.",
        color: "blue",
        requirements: ["Hospital/Birth Details", "Affidavit (if late)"]
    },
    {
        id: "DEATH",
        label: "Death Registration",
        icon: Skull,
        description: "Register a Death or Request a Certified Death Certificate.",
        color: "slate",
        requirements: ["Death Certificate Draft", "Burial Permit"]
    },
    {
        id: "MARRIAGE",
        label: "Marriage Registration",
        icon: Heart,
        description: "Request a certified copy of a Marriage Certificate.",
        color: "rose",
        requirements: ["Marriage Details"]
    },
    {
        id: "MARRIAGE_LICENSE",
        label: "Marriage License Application",
        icon: FileText,
        description: "Apply for a legal license to be married in the Philippines.",
        color: "amber",
        requirements: ["CENOMAR", "Birth Certificates", "Pre-Marriage Counseling Cert"]
    },
];

export default function CivilRegistryPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const urlType = searchParams ? searchParams.get("type") : null;
    const [currentStep, setCurrentStep] = useState<Step>("IDENTITY");
    const [mounted, setMounted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [showErrors, setShowErrors] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [availableTypes, setAvailableTypes] = useState<any[]>([]);
    const [themeColor, setThemeColor] = useState("var(--primary-theme)");

    const isStepValid = (stepId: Step) => {
        switch (stepId) {
            case "IDENTITY":
                return !!form.relationship && !!form.contactNumber;
            case "DETAILS":
                const isMarriage = form.registryType === "MARRIAGE" || form.registryType === "MARRIAGE_LICENSE";
                if (!form.certFirstName || !form.certLastName || !form.dateOfEvent || !form.sex) return false;
                if (isMarriage && !form.spouseName) return false;
                return true;
            case "PARENTS":
                return !!form.motherFirstName && !!form.motherLastName;
            case "CONFIRM":
                return true;
            default:
                return true;
        }
    };

    const validateStep = (step: Step) => {
        const errs: Record<string, string> = {};

        if (step === "IDENTITY") {
            if (!form.relationship) errs.relationship = "Please select relationship.";
            if (!form.contactNumber) errs.contactNumber = "Please enter contact number.";
        }

        if (step === "DETAILS") {
            const isMarriage = form.registryType === "MARRIAGE" || form.registryType === "MARRIAGE_LICENSE";
            if (!form.certFirstName) errs.certFirstName = "Please enter first name.";
            if (!form.certLastName) errs.certLastName = "Please enter last name.";
            if (!form.dateOfEvent) errs.dateOfEvent = "Please select date of occurrence.";
            if (!form.sex) errs.sex = "Please select sex.";
            if (isMarriage && !form.spouseName) errs.spouseName = "Please enter spouse's maiden name.";
        }

        if (step === "PARENTS") {
            if (!form.motherFirstName) errs.motherFirstName = "Please enter Mother's maiden first name.";
            if (!form.motherLastName) errs.motherLastName = "Please enter Mother's maiden last name.";
        }

        setErrors(errs);
        const valid = Object.keys(errs).length === 0;
        setShowErrors(!valid);
        if (!valid) {
            toast.error("Please complete highlighted required fields.", { className: "font-black uppercase tracking-widest text-[10px] italic" });

            setTimeout(() => {
                const firstErrorKey = Object.keys(errs)[0];
                if (firstErrorKey) {
                    let element: any = document.getElementsByName(firstErrorKey)[0] ||
                        document.getElementById(firstErrorKey);

                    if (!element) {
                        if (firstErrorKey === "relationship") {
                            element = (document.querySelector('[role="combobox"]') || document.querySelector('button[aria-autocomplete="none"]')) as any;
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

    useEffect(() => {
        setMounted(true);
    }, []);
    const [resident, setResident] = useState<any>(null);
    const [revisionId, setRevisionId] = useState<string | null>(null);
    const [revisionTx, setRevisionTx] = useState<any>(null);

    const [form, setForm] = useState<FormState>({
        typeId: "",
        registryType: "BIRTH",
        fullName: "",
        dateOfEvent: "",
        placeOfEvent: "MUNICIPALITY OF MAPANDAN",
        fatherName: "",
        fatherFirstName: "",
        fatherMiddleName: "",
        fatherLastName: "",
        motherName: "",
        motherFirstName: "",
        motherMiddleName: "",
        motherLastName: "",
        spouseName: "",
        certFirstName: "",
        certMiddleName: "",
        certLastName: "",
        certSuffix: "",
        certDocType: "Birth Certificate",
        deliveryType: "PICK_UP",
        paymentType: "WALK_IN",
        files: {},
        previews: {},
        idTypeOverride: "",
        email: "",
        contactNumber: "",
        relationship: "",
        informantAddress: "",
        sex: ""
    });

    const isRestoredRef = useRef(false);

    // Privacy / Terms modal state (shared key across LCR pages)
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
    // Persist progress to session storage
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get("revisionId")) return;

        const savedStep = sessionStorage.getItem("civil-registry-step");
        const savedForm = sessionStorage.getItem("civil-registry-form");

        if (savedStep) setCurrentStep(savedStep as Step);
        if (savedForm) {
            try {
                const parsed = JSON.parse(savedForm);
                setForm(prev => ({
                    ...prev,
                    ...parsed,
                    files: {} // Ensure files are empty as they can't be stringified
                }));
                isRestoredRef.current = true;
            } catch (e) {
                console.error("Failed to parse saved form", e);
            }
        }
    }, []);

    useEffect(() => {
        if (!loading && !revisionId) {
            sessionStorage.setItem("civil-registry-step", currentStep);
            sessionStorage.setItem("civil-registry-form", JSON.stringify({
                ...form,
                files: {} // Don't store File objects
            }));
        }
    }, [currentStep, form, loading, revisionId]);

    useEffect(() => {
        if (loading || !resident) return;
        if (form.relationship === "SELF") {
            setForm(prev => ({
                ...prev,
                fullName: `${resident.firstName || ""} ${resident.lastName || ""}`.trim(),
                certFirstName: resident.firstName || "",
                certMiddleName: resident.middleName || "",
                certLastName: resident.lastName || "",
                certSuffix: resident.suffix || "",
                placeOfEvent: resident.placeOfBirth || resident.municipality || prev.placeOfEvent,
                dateOfEvent: resident.dateOfBirth ? new Date(resident.dateOfBirth).toISOString().split('T')[0] : prev.dateOfEvent,
                fatherName: resident.fatherName || prev.fatherName,
                fatherFirstName: resident.fatherFirstName || prev.fatherFirstName,
                fatherMiddleName: resident.fatherMiddleName || prev.fatherMiddleName,
                fatherLastName: resident.fatherLastName || prev.fatherLastName,
                motherName: resident.motherName || prev.motherName,
                motherFirstName: resident.motherFirstName || prev.motherFirstName,
                motherMiddleName: resident.motherMiddleName || prev.motherMiddleName,
                motherLastName: resident.motherLastName || prev.motherLastName,
                sex: (resident.gender || "").toUpperCase(),
            }));
        } else {
            setForm(prev => {
                const matchesResident =
                    prev.certFirstName === resident.firstName &&
                    prev.certLastName === resident.lastName;

                if (matchesResident) {
                    return {
                        ...prev,
                        fullName: "",
                        certFirstName: "",
                        certMiddleName: "",
                        certLastName: "",
                        certSuffix: "",
                        dateOfEvent: "",
                        placeOfEvent: "MUNICIPALITY OF MAPANDAN",
                        fatherName: "",
                        fatherFirstName: "",
                        fatherMiddleName: "",
                        fatherLastName: "",
                        motherName: "",
                        motherFirstName: "",
                        motherMiddleName: "",
                        motherLastName: "",
                        sex: "",
                    };
                }
                return prev;
            });
        }
    }, [form.relationship, resident, loading]);

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

                const [resResult, typesResult, themeResult] = await Promise.all([
                    getCurrentUserResident(),
                    getTransactionTypes(),
                    getSystemSettingAction("theme_color", "var(--primary-theme)")
                ]);

                if (themeResult.success && themeResult.data) {
                    setThemeColor(themeResult.data);
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

                        const previews: Record<string, string | null> = {};
                        const fileKeys = ["validIdFront", "validIdBack", "authorizationLetter"];
                        fileKeys.forEach(k => {
                            const altKey = k === "validIdFront" ? "idFrontUrl" : "idBackUrl";
                            const url = addData[k] || addData[altKey];
                            if (url && typeof url === "string" && url.startsWith("http")) {
                                previews[k] = url;
                            }
                        });

                        let certFN = addData.certFirstName || "";
                        let certMN = addData.certMiddleName || "";
                        let certLN = addData.certLastName || "";
                        let certSuf = addData.certSuffix || "";
                        if (!certFN && !certLN && addData.subjectName) {
                            const parts = addData.subjectName.split(/\s+/);
                            certLN = parts.pop() || "";
                            certFN = parts.shift() || "";
                            if (["JR", "SR", "I", "II", "III", "IV"].includes(certLN.toUpperCase())) {
                                certSuf = certLN;
                                certLN = parts.pop() || "";
                            }
                            certMN = parts.join(" ") || "";
                        }

                        let fFN = addData.fatherFirstName || "";
                        let fMN = addData.fatherMiddleName || "";
                        let fLN = addData.fatherLastName || "";
                        if (!fFN && !fLN && addData.fatherName && addData.fatherName !== "N/A") {
                            const parts = addData.fatherName.split(/\s+/);
                            fLN = parts.pop() || "";
                            fFN = parts.shift() || "";
                            fMN = parts.join(" ") || "";
                        }

                        let mFN = addData.motherFirstName || "";
                        let mMN = addData.motherMiddleName || "";
                        let mLN = addData.motherLastName || "";
                        if (!mFN && !mLN && addData.motherName && addData.motherName !== "N/A") {
                            const parts = addData.motherName.split(/\s+/);
                            mLN = parts.pop() || "";
                            mFN = parts.shift() || "";
                            mMN = parts.join(" ") || "";
                        }

                        setForm(prev => ({
                            ...prev,
                            typeId: txData.typeId || prev.typeId,
                            registryType: txData.registryType || prev.registryType,
                            fullName: addData.subjectName || prev.fullName,
                            dateOfEvent: addData.dateOfEvent || prev.dateOfEvent,
                            placeOfEvent: addData.placeOfEvent || prev.placeOfEvent,
                            fatherFirstName: fFN,
                            fatherMiddleName: fMN,
                            fatherLastName: fLN,
                            fatherName: addData.fatherName || prev.fatherName,
                            motherFirstName: mFN,
                            motherMiddleName: mMN,
                            motherLastName: mLN,
                            motherName: addData.motherName || prev.motherName,
                            spouseName: addData.spouseName || prev.spouseName,
                            certFirstName: certFN,
                            certMiddleName: certMN,
                            certLastName: certLN,
                            certSuffix: certSuf,
                            idTypeOverride: addData.idType || prev.idTypeOverride,
                            email: addData.email || resSnapshot.email || prev.email,
                            contactNumber: addData.contactNumber || resSnapshot.contactNumber || prev.contactNumber,
                            relationship: addData.relationship || prev.relationship,
                            informantAddress: addData.informantAddress || constructedAddr || prev.informantAddress || "",
                            sex: addData.gender || prev.sex,
                            previews
                        }));
                    } else if (resResult.data) {
                        setForm(prev => ({
                            ...prev,
                            fullName: `${resResult.data?.firstName || ""} ${resResult.data?.lastName || ""}`.trim(),
                            email: resResult.data?.email || "",
                            contactNumber: resResult.data?.contactNumber || "",
                            informantAddress: constructedAddr
                        }));
                    }
                }
                if (typesResult.success && typesResult.data) {
                    const lcrTypes = typesResult.data.filter((t: any) => t.category === "Civil Registry");
                    setAvailableTypes(lcrTypes);

                    // Set initial typeId if not already set by session storage
                    setForm(prev => {
                        if (prev.typeId) return prev;
                        const currentDbType = lcrTypes.find((t: any) => t.code === `LCR_${prev.registryType}`);
                        return { ...prev, typeId: currentDbType?.id || "" };
                    });
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

    useEffect(() => {
        if (urlType) {
            const upper = urlType.toUpperCase();
            if (["BIRTH", "DEATH", "MARRIAGE", "MARRIAGE_LICENSE"].includes(upper)) {
                let docType: FormState["certDocType"] = "Birth Certificate";
                if (upper === "DEATH" || upper === "MARRIAGE" || upper === "MARRIAGE_LICENSE") {
                    docType = "Certified True Copy";
                }
                setForm(prev => {
                    if (prev.registryType !== upper) {
                        setCurrentStep("IDENTITY");
                        return {
                            ...prev,
                            registryType: upper as FormState["registryType"],
                            certDocType: docType
                        };
                    }
                    return prev;
                });
            }
        }
    }, [urlType]);

    useEffect(() => {
        if (availableTypes.length > 0 && form.registryType) {
            const currentDbType = availableTypes.find((t: any) => t.code === `LCR_${form.registryType}`);
            if (currentDbType && form.typeId !== currentDbType.id) {
                setForm(prev => ({ ...prev, typeId: currentDbType.id }));
            }
        }
    }, [form.registryType, availableTypes, form.typeId]);


    const handleAcceptPolicy = () => { setPolicyOpen(false); setPolicyAccepted(true); };

    const selectedType = REGISTRY_TYPES.find(t => t.id === form.registryType);

    const handleSubmit = async () => {
        if (submitting) return;
        if (!resident) {
            toast.error("User profile required");
            return;
        }

        // Validate ID uploads
        const hasIdFront = form.files["validIdFront"] || resident?.idFrontUrl || form.previews["validIdFront"];
        const hasIdBack = form.files["validIdBack"] || resident?.idBackUrl || form.previews["validIdBack"];
        if (!hasIdFront || !hasIdBack) {
            toast.error("Please upload both Front and Back of your Government ID.");
            return;
        }

        if (form.relationship !== "SELF") {
            const hasAuthLetter = form.files["authorizationLetter"] || revisionTx?.additionalData?.authorizationLetter || form.previews["authorizationLetter"];
            if (!hasAuthLetter) {
                toast.error("Please upload an Authorization Letter.");
                return;
            }
        }

        if (!form.idTypeOverride && !resident?.idType) {
            toast.error("Please select an ID type.");
            return;
        }

        // Require privacy terms acceptance before allowing submit
        if (!policyAccepted) {
            setShowErrors(true);
            toast.error("Please review and accept the Privacy Policy & Terms before submitting. Click Review to open the agreement.");
            return;
        }

        setSubmitting(true);
        try {
            const formData = new FormData();
            formData.append("typeId", form.typeId);
            formData.append("registryType", form.registryType);
            if (revisionId) {
                formData.append("revisionId", revisionId);
            }
            formData.append("residentSnapshot", JSON.stringify({
                firstName: resident.firstName,
                lastName: resident.lastName,
                middleName: resident.middleName,
                suffix: resident.suffix,
                contactNumber: resident.contactNumber,
                email: resident.email,
                civilStatus: resident.civilStatus || "",
                gender: resident.gender,
                barangay: resident.barangay,
                municipality: resident.municipality,
                province: resident.province
            }));

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
                certFirstName: form.certFirstName,
                certMiddleName: form.certMiddleName,
                certLastName: form.certLastName,
                certSuffix: form.certSuffix,
                subjectName: form.fullName,
                dateOfEvent: form.dateOfEvent,
                placeOfEvent: form.placeOfEvent || "MUNICIPALITY OF MAPANDAN",
                fatherFirstName: form.fatherFirstName,
                fatherMiddleName: form.fatherMiddleName,
                fatherLastName: form.fatherLastName,
                fatherName: `${form.fatherFirstName || ""} ${form.fatherMiddleName || ""} ${form.fatherLastName || ""}`.replace(/\s+/g, ' ').trim() || form.fatherName || "N/A",
                motherFirstName: form.motherFirstName,
                motherMiddleName: form.motherMiddleName,
                motherLastName: form.motherLastName,
                motherName: `${form.motherFirstName || ""} ${form.motherMiddleName || ""} ${form.motherLastName || ""}`.replace(/\s+/g, ' ').trim() || form.motherName || "N/A",
                spouseName: form.spouseName,
                relationship: form.relationship,
                fulfillmentType: null,
                email: form.email,
                contactNumber: form.contactNumber,
                idType: form.idTypeOverride || resident?.idType,
                idFrontUrl: fileUrls["validIdFront"] || resident?.idFrontUrl,
                idBackUrl: fileUrls["validIdBack"] || resident?.idBackUrl,
                validIdFront: fileUrls["validIdFront"] || resident?.idFrontUrl,
                validIdBack: fileUrls["validIdBack"] || resident?.idBackUrl,
                totalAmount: 0, // No payment amount until evaluated by Registrar
                gender: form.sex,
                ...fileUrls
            };

            formData.append("additionalData", JSON.stringify(additionalData));

            const res = await submitCivilRegistryTransaction(formData);
            if (res.success && res.data) {
                toast.success(revisionId ? "Revision resubmitted successfully!" : "Request submitted successfully!");
                sessionStorage.removeItem("civil-registry-step");
                sessionStorage.removeItem("civil-registry-form");
                router.push(`/user/services/requests/${res.data.id}`);
            } else {
                toast.error(res.error || "Submission failed");
            }
        } catch (err) {
            console.error(err);
            toast.error("An error occurred during submission");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950">
                <Loader2 className="w-10 h-10 animate-spin mb-4" style={{ color: "var(--primary-theme)" }} />
                <p className="font-black uppercase tracking-widest text-[10px] text-slate-400 italic">Initializing Request Form...</p>
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
                    background-color: ${themeColor === "var(--primary-theme)" ? "color-mix(in srgb, var(--primary-theme) 10%, transparent)" : `${themeColor}1a`} !important;
                }
                .bg-blue-500\\/5, [class*="bg-blue-500/5"] {
                    background-color: ${themeColor === "var(--primary-theme)" ? "color-mix(in srgb, var(--primary-theme) 5%, transparent)" : `${themeColor}0d`} !important;
                }
                .shadow-blue-500\\/20, [class*="shadow-blue-500/20"] {
                    --tw-shadow-color: ${themeColor === "var(--primary-theme)" ? "color-mix(in srgb, var(--primary-theme) 20%, transparent)" : `${themeColor}33`} !important;
                }
                .hover\\:bg-blue-600:hover, [class*="hover:bg-blue-600"]:hover {
                    background-color: ${themeColor} !important;
                    filter: brightness(0.9);
                }
                .hover\\:border-blue-500\\/50:hover, [class*="hover:border-blue-500/50"]:hover {
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
                                <BreadcrumbPage className="text-[10px] font-black uppercase tracking-widest italic text-emerald-700 dark:text-emerald-400">
                                    {form.registryType === "BIRTH" ? "Request Birth Certificate" :
                                        form.registryType === "MARRIAGE" ? "Request Marriage Certificate" :
                                            form.registryType === "DEATH" ? "Request Death Certificate" :
                                                "Request Marriage License"}
                                </BreadcrumbPage>
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
                        <h1 className="text-2xl md:text-4xl font-black uppercase italic tracking-tighter leading-none">
                            Request <span style={{ color: themeColor }}>Birth Certificate</span>
                        </h1>

                        <p className="text-slate-600 dark:text-slate-300 font-medium text-xs leading-relaxed max-w-xl italic">
                            Request a certified true copy of your Birth Certificate. Complete the form and upload required identifications to verify your request.
                        </p>
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

                    {/* Step Selection */}
                    <Card className="p-8 rounded-[2.5rem] border-slate-200/50 dark:border-white/5 bg-white dark:bg-[#0f1117] shadow-xl dark:shadow-2xl min-h-[400px]">
                        <AnimatePresence mode="wait">


                            {currentStep === "IDENTITY" && (
                                <motion.div
                                    key="identity-step"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-6 md:space-y-8"
                                >
                                    <div className="space-y-1">
                                        <h2 className="text-xl md:text-2xl font-black italic uppercase tracking-tighter leading-tight">Identity <span className="text-blue-500 italic">Confirmation</span></h2>
                                        <p className="text-[10px] md:text-xs text-slate-500 font-medium italic">Verify and refine your personal records for this request.</p>
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

                                    <div className="space-y-4 md:space-y-6">
                                        {/* Row 1: Names */}
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                                            <div className="space-y-1.5">
                                                <Label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">First Name</Label>
                                                <Input
                                                    value={resident?.firstName?.toUpperCase() || ""}
                                                    readOnly
                                                    className="h-10 rounded-xl bg-slate-50 border-slate-950 dark:border-white text-slate-400 text-xs md:text-sm uppercase font-bold"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Middle Name</Label>
                                                <Input
                                                    value={resident?.middleName?.toUpperCase() || ""}
                                                    readOnly
                                                    className="h-10 rounded-xl bg-slate-50 border-slate-950 dark:border-white text-slate-400 text-xs md:text-sm uppercase font-bold"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Last Name</Label>
                                                <Input
                                                    value={resident?.lastName?.toUpperCase() || ""}
                                                    readOnly
                                                    className="h-10 rounded-xl bg-slate-50 border-slate-950 dark:border-white text-slate-400 text-xs md:text-sm uppercase font-bold"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Suffix</Label>
                                                <Input
                                                    value={resident?.suffix?.toUpperCase() || ""}
                                                    readOnly
                                                    className="h-10 rounded-xl bg-slate-50 border-slate-950 dark:border-white text-slate-400 text-xs md:text-sm uppercase font-bold"
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
                                                    value={resident?.dateOfBirth ? new Date(resident.dateOfBirth).toISOString().split('T')[0] : ""}
                                                    readOnly
                                                    className="h-10 rounded-xl bg-slate-50 border-slate-950 dark:border-white text-slate-400 text-xs md:text-sm font-bold"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Age</Label>
                                                <Input
                                                    value={(() => {
                                                        if (!resident?.dateOfBirth) return "";
                                                        const today = new Date();
                                                        const birthDate = new Date(resident.dateOfBirth);
                                                        let age = today.getFullYear() - birthDate.getFullYear();
                                                        const m = today.getMonth() - birthDate.getMonth();
                                                        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
                                                        return age;
                                                    })()}
                                                    readOnly
                                                    className="h-10 rounded-xl bg-slate-50 border-slate-950 dark:border-white text-slate-400 font-bold text-xs md:text-sm"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Civil Status</Label>
                                                <Input
                                                    value={resident?.civilStatus || "N/A"}
                                                    readOnly
                                                    className="h-10 rounded-xl bg-slate-50 border-slate-950 dark:border-white text-slate-400 font-bold text-xs md:text-sm"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Citizenship</Label>
                                                <Input
                                                    value={resident?.citizenship || "FILIPINO"}
                                                    readOnly
                                                    className="h-10 rounded-xl bg-slate-50 border-slate-950 dark:border-white text-slate-400 font-bold text-xs md:text-sm"
                                                />
                                            </div>
                                        </div>

                                        {/* Row 3: Contact & Occupation */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 items-start">
                                            <div className="space-y-1.5">
                                                <Label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Occupation</Label>
                                                <Input
                                                    value={resident?.occupation || "N/A"}
                                                    readOnly
                                                    className="h-10 rounded-xl bg-slate-50 border-slate-950 dark:border-white text-slate-400 font-bold text-xs md:text-sm"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Contact Number <span className="text-red-500">*</span></Label>
                                                <div className="relative group">
                                                    <Input
                                                        name="contactNumber"
                                                        value={form.contactNumber}
                                                        onChange={(e) => {
                                                            const cleanVal = e.target.value.replace(/[^0-9+]/g, "");
                                                            setForm(p => ({ ...p, contactNumber: cleanVal }));
                                                        }}
                                                        className={cn(
                                                            "h-10 rounded-xl border-slate-950 dark:border-white focus:ring-blue-500 shadow-sm text-xs md:text-sm transition-all duration-300 font-bold italic",
                                                            (errors.contactNumber || (showErrors && !form.contactNumber)) && "border-2 border-red-500"
                                                        )}
                                                        placeholder="09xx xxx xxxx"
                                                    />
                                                    {form.contactNumber.length >= 11 && (
                                                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                            <Check className="w-3.5 h-3.5 text-blue-500" />
                                                        </div>
                                                    )}
                                                </div>
                                                <p className="text-[9px] font-black text-amber-500 uppercase tracking-wider ml-1 animate-pulse mt-1">
                                                    * Note: Please use your active contact number. This will be used to contact you regarding your transaction.
                                                </p>
                                                {(errors.contactNumber || (showErrors && !form.contactNumber)) && (
                                                    <p className="text-[9px] font-black text-red-500 uppercase italic tracking-widest ml-1 animate-pulse mt-1">{errors.contactNumber || "Required field"}</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Row 4: Relationship */}
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                                            <div className="col-span-2 md:col-span-1 space-y-1.5">
                                                <Label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Relationship <span className="text-red-500">*</span></Label>
                                                 <Select
                                                     value={form.relationship}
                                                     onValueChange={(value) => {
                                                         const updatedFiles = { ...form.files };
                                                         const updatedPreviews = { ...form.previews };
                                                         if (value === "SELF") {
                                                             delete updatedFiles.authorizationLetter;
                                                             delete updatedPreviews.authorizationLetter;
                                                         }
                                                         setForm({ 
                                                             ...form, 
                                                             relationship: value,
                                                             files: updatedFiles,
                                                             previews: updatedPreviews
                                                         });
                                                     }}
                                                 >
                                                    <SelectTrigger className={cn(
                                                        "h-10 w-full rounded-xl border-slate-950 dark:border-white focus:ring-blue-500 shadow-sm text-xs md:text-sm bg-white dark:bg-slate-900 transition-all font-bold",
                                                        (showErrors && !form.relationship) && "!border-2 !border-red-500"
                                                    )}>
                                                        <SelectValue placeholder="Select relationship" />
                                                    </SelectTrigger>
                                                    <SelectContent className="rounded-xl border-slate-200 dark:border-white/10 italic">
                                                        <SelectItem value="SELF">SELF</SelectItem>
                                                        <SelectItem value="SPOUSE">SPOUSE</SelectItem>
                                                        <SelectItem value="SON">SON</SelectItem>
                                                        <SelectItem value="DAUGHTER">DAUGHTER</SelectItem>
                                                        <SelectItem value="MOTHER">MOTHER</SelectItem>
                                                        <SelectItem value="FATHER">FATHER</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                {(showErrors && !form.relationship) && (
                                                    <p className="text-[9px] font-black text-red-500 uppercase italic tracking-widest ml-1 animate-pulse mt-1.5">Required field</p>
                                                )}
                                            </div>
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

                                    <div className="flex justify-end gap-3 pt-8">
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
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-8"
                                >
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="md:hidden">
                                            <Button variant="ghost" className="rounded-full" onClick={() => setCurrentStep("IDENTITY")}>
                                                <ChevronRight className="w-5 h-5 rotate-180" />
                                            </Button>
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight">
                                                Certificate <span className="italic" style={{ color: themeColor }}>Details</span>
                                            </h2>
                                            <p className="text-xs text-slate-500 font-medium italic">Certified copy for {selectedType?.label}</p>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">First Name <span className="text-red-500">*</span></Label>
                                                <Input
                                                    name="certFirstName"
                                                    className={cn(
                                                        "rounded-xl border-slate-950 dark:border-white bg-white dark:bg-slate-900 h-10 transition-all uppercase font-medium",
                                                        (showErrors && !form.certFirstName) && "border-2 border-red-500",
                                                        form.relationship === "SELF" && "bg-slate-100 dark:bg-slate-800 text-slate-500"
                                                    )}
                                                    placeholder="First name"
                                                    value={form.certFirstName}
                                                    onChange={(e) => form.relationship !== "SELF" && setForm({ ...form, certFirstName: e.target.value.toUpperCase() })}
                                                    readOnly={form.relationship === "SELF"}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">Middle Name</Label>
                                                <Input
                                                    className={cn(
                                                        "rounded-xl border-slate-950 dark:border-white bg-white dark:bg-slate-900 h-10 transition-all uppercase font-medium",
                                                        form.relationship === "SELF" && "bg-slate-100 dark:bg-slate-800 text-slate-500"
                                                    )}
                                                    placeholder="Middle name"
                                                    value={form.certMiddleName}
                                                    onChange={(e) => form.relationship !== "SELF" && setForm({ ...form, certMiddleName: e.target.value.toUpperCase() })}
                                                    readOnly={form.relationship === "SELF"}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">Last Name <span className="text-red-500">*</span></Label>
                                                <Input
                                                    name="certLastName"
                                                    className={cn(
                                                        "rounded-xl border-slate-950 dark:border-white bg-white dark:bg-slate-900 h-10 transition-all uppercase font-medium",
                                                        (showErrors && !form.certLastName) && "border-2 border-red-500",
                                                        form.relationship === "SELF" && "bg-slate-100 dark:bg-slate-800 text-slate-500"
                                                    )}
                                                    placeholder="Last name"
                                                    value={form.certLastName}
                                                    onChange={(e) => form.relationship !== "SELF" && setForm({ ...form, certLastName: e.target.value.toUpperCase() })}
                                                    readOnly={form.relationship === "SELF"}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">Suffix</Label>
                                                <Input
                                                    className={cn(
                                                        "rounded-xl border-slate-950 dark:border-white bg-white dark:bg-slate-900 h-10 transition-all uppercase font-medium",
                                                        form.relationship === "SELF" && "bg-slate-100 dark:bg-slate-800 text-slate-500"
                                                    )}
                                                    placeholder="e.g. Jr."
                                                    value={form.certSuffix}
                                                    onChange={(e) => form.relationship !== "SELF" && setForm({ ...form, certSuffix: e.target.value.toUpperCase() })}
                                                    readOnly={form.relationship === "SELF"}
                                                />
                                            </div>
                                        </div>

                                        {(form.registryType === "MARRIAGE" || form.registryType === "MARRIAGE_LICENSE") && (
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">Wife&apos;s Full Name (Maiden) <span className="text-red-500">*</span></Label>
                                                <Input
                                                    name="spouseName"
                                                    className={cn(
                                                        "rounded-xl border-slate-950 dark:border-white bg-white dark:bg-slate-900 transition-all uppercase font-medium",
                                                        (showErrors && !form.spouseName) && "border-2 border-red-500"
                                                    )}
                                                    placeholder="Enter complete maiden name"
                                                    value={form.spouseName}
                                                    onChange={(e) => setForm({ ...form, spouseName: e.target.value.toUpperCase() })}
                                                />
                                                {(showErrors && !form.spouseName) && (
                                                    <p className="text-[9px] font-black text-red-500 uppercase italic tracking-widest ml-1 animate-pulse">Required field</p>
                                                )}
                                            </div>
                                        )}

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">
                                                    {form.registryType === "BIRTH" ? "Date of Birth" :
                                                        form.registryType === "DEATH" ? "Date of Death" :
                                                            form.registryType === "MARRIAGE" ? "Date of Marriage" :
                                                                "Target Marriage Date"} <span className="text-red-500">*</span>
                                                </Label>
                                                <Input
                                                    name="dateOfEvent"
                                                    type="date"
                                                    className={cn(
                                                        "rounded-xl border-slate-950 dark:border-white bg-white dark:bg-slate-900 transition-all",
                                                        (showErrors && !form.dateOfEvent) && "border-2 border-red-500",
                                                        (form.relationship === "SELF" && !!resident?.dateOfBirth) && "bg-slate-100 dark:bg-slate-800 text-slate-500"
                                                    )}
                                                    value={form.dateOfEvent}
                                                    onChange={(e) => setForm({ ...form, dateOfEvent: e.target.value })}
                                                    readOnly={form.relationship === "SELF" && !!resident?.dateOfBirth}
                                                />
                                                {(showErrors && !form.dateOfEvent) && (
                                                    <p className="text-[9px] font-black text-red-500 uppercase italic tracking-widest ml-1 animate-pulse">Required field</p>
                                                )}
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">Sex <span className="text-red-500">*</span></Label>
                                                <Select
                                                    value={form.sex}
                                                    onValueChange={(val) => setForm({ ...form, sex: val })}
                                                    disabled={form.relationship === "SELF"}
                                                >
                                                    <SelectTrigger className={cn(
                                                        "h-10 w-full rounded-xl border-slate-950 dark:border-white focus:ring-blue-500 shadow-sm text-xs md:text-sm bg-white dark:bg-slate-900 transition-all font-bold",
                                                        (showErrors && !form.sex) && "!border-2 !border-red-500",
                                                        form.relationship === "SELF" && "bg-slate-100 dark:bg-slate-800 text-slate-500"
                                                    )}>
                                                        <SelectValue placeholder="Select Sex" />
                                                    </SelectTrigger>
                                                    <SelectContent className="rounded-xl border-slate-200 dark:border-white/10 italic">
                                                        <SelectItem value="MALE">MALE</SelectItem>
                                                        <SelectItem value="FEMALE">FEMALE</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                {(showErrors && !form.sex) && (
                                                    <p className="text-[9px] font-black text-red-500 uppercase italic tracking-widest ml-1 animate-pulse">Required field</p>
                                                )}
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">Place of Birth</Label>
                                                <Input
                                                    name="placeOfEvent"
                                                    className="rounded-xl border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] text-slate-400 font-bold h-10 transition-all uppercase cursor-not-allowed"
                                                    placeholder="MUNICIPALITY OF MAPANDAN"
                                                    value={form.placeOfEvent || "MUNICIPALITY OF MAPANDAN"}
                                                    readOnly
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-3 pt-6">
                                        <Button
                                            onClick={() => {
                                                if (!validateStep("DETAILS")) return;
                                                // Auto-sync fullName for the API
                                                const full = `${form.certFirstName} ${form.certMiddleName} ${form.certLastName} ${form.certSuffix}`.replace(/\s+/g, ' ').trim();
                                                setForm(prev => ({ ...prev, fullName: full }));

                                                const isMarriage = form.registryType === "MARRIAGE" || form.registryType === "MARRIAGE_LICENSE";
                                                // Skip parents info for marriage requests as it's less standard for CTCs or handled elsewhere
                                                if (isMarriage) {
                                                    setCurrentStep("CONFIRM");
                                                } else {
                                                    setCurrentStep("PARENTS");
                                                }
                                            }}
                                            className="rounded-full px-8 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest italic text-[10px] h-12 shadow-xl shadow-blue-500/20"
                                            style={{ backgroundColor: themeColor }}
                                        >
                                            {form.registryType === "MARRIAGE" || form.registryType === "MARRIAGE_LICENSE" ? "Proceed to Review" : "Proceed to Parental Info"}
                                            <ArrowRight className="w-4 h-4 ml-2" />
                                        </Button>
                                    </div>
                                </motion.div>
                            )}

                            {currentStep === "PARENTS" && (
                                <motion.div
                                    key="parents-step"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-8"
                                >
                                    <div className="space-y-1">
                                        <h2 className="text-xl md:text-2xl font-black italic uppercase tracking-tighter leading-tight">Parental <span className="text-blue-500 italic">Information</span></h2>
                                        <p className="text-[10px] md:text-xs text-slate-500 font-medium italic">Required details for verifying the registry record.</p>
                                    </div>

                                    <div className="grid grid-cols-1 gap-6">
                                        {/* FATHER'S ROW */}
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                                                    <Users className="w-4 h-4 text-blue-500" />
                                                </div>
                                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 italic">Father&apos;s Full Name</h3>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div className="space-y-2">
                                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">First Name</Label>
                                                    <Input
                                                        className={cn(
                                                            "rounded-xl border-slate-950 dark:border-white bg-white dark:bg-slate-900 transition-all uppercase font-medium h-12",
                                                            form.relationship === "SELF" && "bg-slate-100 dark:bg-slate-800 text-slate-500"
                                                        )}
                                                        placeholder="EX. JUAN"
                                                        value={form.fatherFirstName}
                                                        onChange={(e) => form.relationship !== "SELF" && setForm({ ...form, fatherFirstName: e.target.value.toUpperCase() })}
                                                        readOnly={form.relationship === "SELF"}
                                                    />
                                                </div>

                                                <div className="space-y-2">
                                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">Middle Name</Label>
                                                    <Input
                                                        className={cn(
                                                            "rounded-xl border-slate-950 dark:border-white bg-white dark:bg-slate-900 transition-all uppercase font-medium h-12",
                                                            form.relationship === "SELF" && "bg-slate-100 dark:bg-slate-800 text-slate-500"
                                                        )}
                                                        placeholder="EX. DELA CRUZ"
                                                        value={form.fatherMiddleName}
                                                        onChange={(e) => form.relationship !== "SELF" && setForm({ ...form, fatherMiddleName: e.target.value.toUpperCase() })}
                                                        readOnly={form.relationship === "SELF"}
                                                    />
                                                </div>

                                                <div className="space-y-2">
                                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">Last Name</Label>
                                                    <Input
                                                        className={cn(
                                                            "rounded-xl border-slate-950 dark:border-white bg-white dark:bg-slate-900 transition-all uppercase font-medium h-12",
                                                            form.relationship === "SELF" && "bg-slate-100 dark:bg-slate-800 text-slate-500"
                                                        )}
                                                        placeholder="EX. SANTOS"
                                                        value={form.fatherLastName}
                                                        onChange={(e) => form.relationship !== "SELF" && setForm({ ...form, fatherLastName: e.target.value.toUpperCase() })}
                                                        readOnly={form.relationship === "SELF"}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* MOTHER'S ROW */}
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="w-8 h-8 rounded-full bg-rose-500/10 flex items-center justify-center">
                                                    <Users className="w-4 h-4 text-rose-500" />
                                                </div>
                                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 italic">Mother&apos;s Maiden Name</h3>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div className="space-y-2">
                                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">First Name <span className="text-red-500">*</span></Label>
                                                    <Input
                                                        name="motherFirstName"
                                                        className={cn(
                                                            "rounded-xl border-slate-950 dark:border-white bg-white dark:bg-slate-900 transition-all uppercase font-medium h-12",
                                                            (showErrors && !form.motherFirstName) && "border-2 border-red-500",
                                                            form.relationship === "SELF" && "bg-slate-100 dark:bg-slate-800 text-slate-500"
                                                        )}
                                                        placeholder="EX. MARIA"
                                                        value={form.motherFirstName}
                                                        onChange={(e) => form.relationship !== "SELF" && setForm({ ...form, motherFirstName: e.target.value.toUpperCase() })}
                                                        readOnly={form.relationship === "SELF"}
                                                    />
                                                    {(showErrors && !form.motherFirstName) && (
                                                        <p className="text-[9px] font-black text-red-500 uppercase italic tracking-widest ml-1 animate-pulse">Required field</p>
                                                    )}
                                                </div>

                                                <div className="space-y-2">
                                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">Middle Name</Label>
                                                    <Input
                                                        className={cn(
                                                            "rounded-xl border-slate-950 dark:border-white bg-white dark:bg-slate-900 transition-all uppercase font-medium h-12",
                                                            form.relationship === "SELF" && "bg-slate-100 dark:bg-slate-800 text-slate-500"
                                                        )}
                                                        placeholder="EX. REYES"
                                                        value={form.motherMiddleName}
                                                        onChange={(e) => form.relationship !== "SELF" && setForm({ ...form, motherMiddleName: e.target.value.toUpperCase() })}
                                                        readOnly={form.relationship === "SELF"}
                                                    />
                                                </div>

                                                <div className="space-y-2">
                                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">Last Name <span className="text-red-500">*</span></Label>
                                                    <Input
                                                        name="motherLastName"
                                                        className={cn(
                                                            "rounded-xl border-slate-950 dark:border-white bg-white dark:bg-slate-900 transition-all uppercase font-medium h-12",
                                                            (showErrors && !form.motherLastName) && "border-2 border-red-500",
                                                            form.relationship === "SELF" && "bg-slate-100 dark:bg-slate-800 text-slate-500"
                                                        )}
                                                        placeholder="EX. MERCADO"
                                                        value={form.motherLastName}
                                                        onChange={(e) => form.relationship !== "SELF" && setForm({ ...form, motherLastName: e.target.value.toUpperCase() })}
                                                        readOnly={form.relationship === "SELF"}
                                                    />
                                                    {(showErrors && !form.motherLastName) && (
                                                        <p className="text-[9px] font-black text-red-500 uppercase italic tracking-widest ml-1 animate-pulse">Required field</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-blue-500/5 border border-blue-500/10 p-4 rounded-2xl flex items-center gap-3">
                                        <Info className="w-4 h-4 text-blue-500 shrink-0" />
                                        <p className="text-[10px] text-blue-500 font-bold italic uppercase tracking-widest">
                                            Please provide the names as they appear on the original registry document to avoid discrepancies.
                                        </p>
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
                                            style={{ backgroundColor: themeColor }}
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
                                        <div className="md:hidden">
                                            <Button variant="ghost" className="rounded-full" onClick={() => setCurrentStep("DETAILS")}>
                                                <ChevronRight className="w-5 h-5 rotate-180" />
                                            </Button>
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight">Final Confirmation</h2>
                                            <p className="text-xs text-slate-500 font-medium italic">Verify your request details before submission</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-1">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 italic">Certificate Type</span>
                                            <p className="font-black text-slate-900 dark:text-white italic">
                                                {form.registryType === "BIRTH" ? "Birth Certificate" :
                                                    form.registryType === "MARRIAGE" ? "Marriage Certificate" :
                                                        form.registryType === "DEATH" ? "Death Certificate" :
                                                            "Marriage License Application"}
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 italic">Subject Name</span>
                                            <p className="font-black text-slate-900 dark:text-white italic uppercase">{`${form.certFirstName} ${form.certMiddleName} ${form.certLastName} ${form.certSuffix}`.trim()}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 italic">Relationship</span>
                                            <p className="font-black text-slate-900 dark:text-white italic">{form.relationship}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 italic">Sex</span>
                                            <p className="font-black text-slate-900 dark:text-white italic uppercase">{form.sex || "N/A"}</p>
                                        </div>
                                        {form.spouseName && (
                                            <div className="space-y-1">
                                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 italic">Spouse Name</span>
                                                <p className="font-black text-slate-900 dark:text-white italic uppercase">{form.spouseName}</p>
                                            </div>
                                        )}
                                        <div className="space-y-1">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 italic">Occurrence Date</span>
                                            <p className="font-black text-slate-900 dark:text-white italic">{form.dateOfEvent}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 italic">Target Contact</span>
                                            <p className="font-black text-slate-900 dark:text-white italic">{form.contactNumber}</p>
                                        </div>
                                        {/* Parents Info Summary */}
                                        {form.registryType !== "MARRIAGE" && form.registryType !== "MARRIAGE_LICENSE" && (
                                            <>
                                                <div className="space-y-1">
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 italic">Father&apos;s Name</span>
                                                    <p className="font-black text-slate-900 dark:text-white italic uppercase">
                                                        {`${form.fatherFirstName} ${form.fatherMiddleName} ${form.fatherLastName}`.trim() || form.fatherName || "N/A"}
                                                    </p>
                                                </div>
                                                <div className="space-y-1">
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 italic">Mother&apos;s Name</span>
                                                    <p className="font-black text-slate-900 dark:text-white italic uppercase">
                                                        {`${form.motherFirstName} ${form.motherMiddleName} ${form.motherLastName}`.trim() || form.motherName || "N/A"}
                                                    </p>
                                                </div>
                                            </>
                                        )}

                                    </div>

                                    {/* ID Submission Section */}
                                    <div className="pt-4 border-t border-slate-200 dark:border-white/5 space-y-4">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1.5 bg-blue-500/10 rounded-lg">
                                                <Upload className="w-3.5 h-3.5 text-blue-500" />
                                            </div>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Document Verification</span>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="space-y-1.5 max-w-md">
                                                <Label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-blue-500/70 ml-1 flex items-center justify-between">
                                                    <span>Select ID Type <span className="text-red-500">*</span></span>
                                                </Label>
                                                <Select
                                                    value={form.idTypeOverride || resident?.idType || ""}
                                                    onValueChange={(value) => setForm(prev => ({
                                                        ...prev,
                                                        idTypeOverride: value
                                                    }))}
                                                >
                                                    <SelectTrigger className="h-10 w-full rounded-xl border-slate-950 dark:border-white focus:ring-blue-500 shadow-sm text-xs md:text-sm bg-white dark:bg-slate-900 transition-all font-bold">
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

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="w-full">
                                                    <PremiumDocumentUpload
                                                        label="Valid Government ID (Front)"
                                                        required
                                                        file={form.files["validIdFront"]}
                                                        existingUrl={resident?.idFrontUrl}
                                                        onFileSelect={(file) => {
                                                            setForm(prev => ({
                                                                ...prev,
                                                                files: { ...prev.files, validIdFront: file }
                                                            }));
                                                        }}
                                                        onView={() => handleViewFile(form.files["validIdFront"] || null, resident?.idFrontUrl || null, "Valid Government ID (Front)")}
                                                        error={showErrors && !form.files["validIdFront"] && !resident?.idFrontUrl}
                                                    />
                                                </div>

                                                <div className="w-full">
                                                    <PremiumDocumentUpload
                                                        label="Valid Government ID (Back)"
                                                        required
                                                        file={form.files["validIdBack"]}
                                                        existingUrl={resident?.idBackUrl}
                                                        onFileSelect={(file) => {
                                                            setForm(prev => ({
                                                                ...prev,
                                                                files: { ...prev.files, validIdBack: file }
                                                            }));
                                                        }}
                                                        onView={() => handleViewFile(form.files["validIdBack"] || null, resident?.idBackUrl || null, "Valid Government ID (Back)")}
                                                        error={showErrors && !form.files["validIdBack"] && !resident?.idBackUrl}
                                                    />
                                                </div>

                                                {form.relationship !== "SELF" && (
                                                    <div className="w-full">
                                                        <PremiumDocumentUpload
                                                            label="Authorization Letter"
                                                            required
                                                            file={form.files["authorizationLetter"]}
                                                            existingUrl={revisionTx?.additionalData?.authorizationLetter || form.previews["authorizationLetter"]}
                                                            onFileSelect={(file) => {
                                                                setForm(prev => ({
                                                                    ...prev,
                                                                    files: { ...prev.files, authorizationLetter: file }
                                                                }));
                                                            }}
                                                            onView={() => handleViewFile(form.files["authorizationLetter"] || null, revisionTx?.additionalData?.authorizationLetter || form.previews["authorizationLetter"] || null, "Authorization Letter")}
                                                            error={showErrors && !form.files["authorizationLetter"] && !revisionTx?.additionalData?.authorizationLetter && !form.previews["authorizationLetter"]}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className={cn(
                                            "p-4 rounded-2xl border flex items-start gap-4 transition-all duration-300",
                                            (showErrors && !policyAccepted)
                                                ? "border-2 border-red-500"
                                                : "border-slate-200/40 bg-white/30 dark:bg-white/5"
                                        )}>
                                            <button
                                                type="button"
                                                onClick={() => setPolicyOpen(true)}
                                                className={cn(
                                                    "w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 transition-all",
                                                    policyAccepted
                                                        ? "bg-blue-500 border-blue-500 text-white"
                                                        : showErrors
                                                            ? "border-2 border-red-500"
                                                            : "border-slate-300"
                                                )}
                                            >
                                                {policyAccepted ? <Check className="w-3 h-3" /> : null}
                                            </button>
                                            <div className="flex-1 text-xs cursor-pointer select-none" onClick={() => setPolicyOpen(true)}>
                                                <div className="font-black uppercase text-[11px] tracking-wider text-slate-800 dark:text-white">DATA PRIVACY & CERTIFICATION AGREEMENT</div>
                                                <div className="text-[10px] text-slate-500 italic mt-1 leading-relaxed">
                                                    BY SUBMITTING, I CERTIFY THAT ALL INFORMATION PROVIDED IS TRUE AND CORRECT. I AM AWARE OF THE DATA PRIVACY POLICY OF MAPANDAN. CLICK TO REVIEW AGREEMENT.
                                                </div>
                                                {showErrors && !policyAccepted && (
                                                    <p className="text-[9px] font-black text-red-500 uppercase italic tracking-widest ml-1 animate-pulse mt-1">Please accept the Privacy Policy & Terms before submitting.</p>
                                                )}
                                            </div>
                                            <button type="button" onClick={() => setPolicyOpen(true)} className="text-[10px] font-black italic text-blue-600 shrink-0">Review</button>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                            <Button
                                                variant="ghost"
                                                onClick={() => setCurrentStep(form.registryType === "MARRIAGE" || form.registryType === "MARRIAGE_LICENSE" ? "DETAILS" : "PARENTS")}
                                                className="h-14 rounded-full border-slate-200 dark:border-white/10 font-black uppercase tracking-widest italic text-[11px]"
                                            >
                                                <ArrowRight className="w-4 h-4 mr-2 rotate-180" />
                                                Modify
                                            </Button>
                                            <Button
                                                onClick={handleSubmit}
                                                disabled={
                                                    submitting ||
                                                    (!form.idTypeOverride && !resident?.idType) ||
                                                    (!form.files["validIdFront"] && !resident?.idFrontUrl) ||
                                                    (!form.files["validIdBack"] && !resident?.idBackUrl) ||
                                                    (form.relationship !== "SELF" && !form.files["authorizationLetter"] && !revisionTx?.additionalData?.authorizationLetter && !form.previews["authorizationLetter"])
                                                }
                                                className={cn(
                                                    "md:col-span-3 h-14 rounded-full font-black uppercase tracking-widest italic text-[11px] transition-all duration-300",
                                                    (!form.idTypeOverride && !resident?.idType) || 
                                                    (!form.files["validIdFront"] && !resident?.idFrontUrl) || 
                                                    (!form.files["validIdBack"] && !resident?.idBackUrl) ||
                                                    (form.relationship !== "SELF" && !form.files["authorizationLetter"] && !revisionTx?.additionalData?.authorizationLetter && !form.previews["authorizationLetter"])
                                                        ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                                                        : "bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-500/20"
                                                )}
                                                style={
                                                    (!form.idTypeOverride && !resident?.idType) || 
                                                    (!form.files["validIdFront"] && !resident?.idFrontUrl) || 
                                                    (!form.files["validIdBack"] && !resident?.idBackUrl) ||
                                                    (form.relationship !== "SELF" && !form.files["authorizationLetter"] && !revisionTx?.additionalData?.authorizationLetter && !form.previews["authorizationLetter"])
                                                        ? {} 
                                                        : { backgroundColor: themeColor }
                                                }
                                            >
                                                {submitting ? (
                                                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                                ) : (!form.idTypeOverride && !resident?.idType) || 
                                                    (!form.files["validIdFront"] && !resident?.idFrontUrl) || 
                                                    (!form.files["validIdBack"] && !resident?.idBackUrl) ||
                                                    (form.relationship !== "SELF" && !form.files["authorizationLetter"] && !revisionTx?.additionalData?.authorizationLetter && !form.previews["authorizationLetter"]) ? (
                                                    <>
                                                        Upload Required Documents to Submit
                                                        <AlertCircle className="w-5 h-5 ml-2" />
                                                    </>
                                                ) : (
                                                    <>
                                                        Submit Civil Registry Request
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
