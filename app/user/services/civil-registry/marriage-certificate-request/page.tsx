/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
    FileText,
    User,
    Loader2,
    Check,
    AlertCircle,
    Sparkles,
    Heart,
    ArrowRight,
    CreditCard,
    Info,
    Upload,
    Search,
    CheckCircle2,
    Eye
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
import { Separator } from "@/components/ui/separator";
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
    getSystemSettingAction
} from "@/app/admin/transactions/actions";
import { toast } from "sonner";
import { compressImage } from "@/lib/image-compression";
import { useRouter } from "next/navigation";
import PrivacyTermsModal from "@/components/shared/PrivacyTermsModal";

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

// --- TYPES ---

type Step = "IDENTITY" | "DETAILS" | "CONFIRM";

const STEPS: { id: Step; label: string; icon: any }[] = [
    { id: "IDENTITY", label: "Requester Details", icon: User },
    { id: "DETAILS", label: "Marriage Details", icon: Search },
    { id: "CONFIRM", label: "Review & Submit", icon: CheckCircle2 },
];

interface FormState {
    typeId: string;
    registryType: "MARRIAGE";
    // Fields for the specific certificate
    fullName: string; // Husband's Full Name
    certFirstName: string;
    certMiddleName: string;
    certLastName: string;
    certSuffix: string;
    certDocType: "Certified True Copy" | "Copy" | "Authenticated Copy";
    dateOfEvent: string;
    placeOfEvent: string;
    spouseName: string; // Wife's Maiden Full Name
    // Shared
    deliveryType: "PICK_UP" | "DELIVERY" | "E_COPY";
    paymentType: "WALK_IN";
    files: Record<string, File | null>;
    idTypeOverride?: string;
    email: string;
    contactNumber: string;
    relationship: string;
    informantAddress?: string;
}

const LOCAL_FALLBACK_PROVINCES = [
    "PANGASINAN", "METRO MANILA", "LA UNION", "TARLAC", "BENGUET", "ILOCOS SUR", "ILOCOS NORTE", "NUEVA ECIJA", "PAMPANGA", "BULACAN"
];

const LOCAL_FALLBACK_CITIES = [
    "MAPANDAN", "DAGUPAN", "URDANETA", "SAN CARLOS", "ALAMINOS", "MANGALDAN", "CALASIAO", "SAN JACINTO", "MANAOAG", "STA. BARBARA", "BINALONAN", "POZORRUBIO", "LAOAC"
];

export default function MarriageCertificateRequestPage() {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState<Step>("IDENTITY");
    const [mounted, setMounted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [showErrors, setShowErrors] = useState(false);
    const [availableTypes, setAvailableTypes] = useState<any[]>([]);
    const [themeColor, setThemeColor] = useState("#ec4899"); // default rose color for marriage

    // Place of marriage dropdown and text states
    const [placeCountry, setPlaceCountry] = useState("PHILIPPINES");
    const [placeProvince, setPlaceProvince] = useState("PANGASINAN");
    const [placeCity, setPlaceCity] = useState("MAPANDAN");
    const [customCountry, setCustomCountry] = useState("");
    const [customProvince, setCustomProvince] = useState("");
    const [customCity, setCustomCity] = useState("");

    // API lists and loaders
    const [countriesList, setCountriesList] = useState<{ code: string; name: string }[]>([]);
    const [provincesList, setProvincesList] = useState<{ code: string; name: string }[]>([]);
    const [citiesList, setCitiesList] = useState<{ code: string; name: string }[]>([]);
    const [countriesLoading, setCountriesLoading] = useState(false);
    const [provincesLoading, setProvincesLoading] = useState(false);
    const [citiesLoading, setCitiesLoading] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);
    const [resident, setResident] = useState<any>(null);

    const [form, setForm] = useState<FormState>({
        typeId: "",
        registryType: "MARRIAGE",
        fullName: "",
        dateOfEvent: "",
        placeOfEvent: "",
        certFirstName: "",
        certMiddleName: "",
        certLastName: "",
        certSuffix: "",
        certDocType: "Certified True Copy",
        spouseName: "",
        deliveryType: "PICK_UP",
        paymentType: "WALK_IN",
        files: {},
        idTypeOverride: "",
        email: "",
        contactNumber: "",
        relationship: "",
        informantAddress: ""
    });

    const isRestoredRef = useRef(false);
    const prevRelationshipRef = useRef<string>("");
    // Privacy / Terms modal state
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
        const savedStep = sessionStorage.getItem("marriage-request-step");
        const savedForm = sessionStorage.getItem("marriage-request-form");

        if (savedStep) setCurrentStep(savedStep as Step);
        if (savedForm) {
            try {
                const parsed = JSON.parse(savedForm);
                setForm(prev => ({
                    ...prev,
                    ...parsed,
                    files: {}
                }));
                isRestoredRef.current = true;

                if (parsed.placeOfEvent) {
                    const parts = parsed.placeOfEvent.split(",").map((p: string) => p.trim());
                    if (parts.length >= 3) {
                        const country = parts[parts.length - 1];
                        const province = parts[parts.length - 2];
                        const city = parts[parts.length - 3];

                        if (["PHILIPPINES"].includes(country)) {
                            setPlaceCountry(country);
                        } else {
                            setPlaceCountry("OTHER");
                            setCustomCountry(country);
                        }

                        const knownProvinces = ["PANGASINAN", "METRO MANILA", "LA UNION", "TARLAC", "BENGUET", "ILOCOS SUR", "ILOCOS NORTE", "NUEVA ECIJA", "PAMPANGA", "BULACAN"];
                        if (knownProvinces.includes(province)) {
                            setPlaceProvince(province);
                        } else {
                            setPlaceProvince("OTHER");
                            setCustomProvince(province);
                        }

                        const knownCities = ["MAPANDAN", "DAGUPAN", "URDANETA", "SAN CARLOS", "ALAMINOS", "MANGALDAN", "CALASIAO", "SAN JACINTO", "MANAOAG", "STA. BARBARA", "BINALONAN", "POZORRUBIO", "LAOAC"];
                        if (knownCities.includes(city)) {
                            setPlaceCity(city);
                        } else {
                            setPlaceCity("OTHER");
                            setCustomCity(city);
                        }
                    } else if (parts.length === 2) {
                        const province = parts[1];
                        const city = parts[0];

                        const knownProvinces = ["PANGASINAN", "METRO MANILA", "LA UNION", "TARLAC", "BENGUET", "ILOCOS SUR", "ILOCOS NORTE", "NUEVA ECIJA", "PAMPANGA", "BULACAN"];
                        if (knownProvinces.includes(province)) {
                            setPlaceProvince(province);
                        } else {
                            setPlaceProvince("OTHER");
                            setCustomProvince(province);
                        }

                        const knownCities = ["MAPANDAN", "DAGUPAN", "URDANETA", "SAN CARLOS", "ALAMINOS", "MANGALDAN", "CALASIAO", "SAN JACINTO", "MANAOAG", "STA. BARBARA", "BINALONAN", "POZORRUBIO", "LAOAC"];
                        if (knownCities.includes(city)) {
                            setPlaceCity(city);
                        } else {
                            setPlaceCity("OTHER");
                            setCustomCity(city);
                        }
                    } else if (parts.length === 1 && parts[0]) {
                        setPlaceCity("OTHER");
                        setCustomCity(parts[0]);
                    }
                }
            } catch (e) {
                console.error("Failed to parse saved form", e);
            }
        }
    }, []);

    useEffect(() => {
        if (!loading) {
            sessionStorage.setItem("marriage-request-step", currentStep);
            sessionStorage.setItem("marriage-request-form", JSON.stringify({
                ...form,
                files: {}
            }));
        }
    }, [currentStep, form, loading]);

    useEffect(() => {
        prevRelationshipRef.current = form.relationship;
    }, [form.relationship]);

    useEffect(() => {
        if (loading) return;

        const city = (placeCountry === "OTHER" ? customCity : (placeProvince === "OTHER" ? customCity : (placeCity === "OTHER" ? customCity : placeCity))).trim().toUpperCase();
        const prov = (placeCountry === "OTHER" ? customProvince : (placeProvince === "OTHER" ? customProvince : placeProvince)).trim().toUpperCase();
        const country = (placeCountry === "OTHER" ? customCountry : placeCountry).trim().toUpperCase();

        const parts: string[] = [];
        if (city) parts.push(city);
        if (prov) parts.push(prov);
        if (country) parts.push(country);

        setForm(prev => ({
            ...prev,
            placeOfEvent: parts.join(", ")
        }));
    }, [placeCountry, placeProvince, placeCity, customCountry, customProvince, customCity, loading]);

    useEffect(() => {
        if (loading) return;
        if (isRestoredRef.current) {
            isRestoredRef.current = false;
            return;
        }

        if (form.relationship === "SELF" && resident) {
            // If requesting self, populate Husband details (if male) or Spouse Details (if female)
            const isFemale = resident.gender === "FEMALE";
            setForm(prev => ({
                ...prev,
                fullName: isFemale ? "" : `${resident.firstName || ""} ${resident.lastName || ""}`.trim(),
                certFirstName: isFemale ? "" : resident.firstName || "",
                certMiddleName: isFemale ? "" : resident.middleName || "",
                certLastName: isFemale ? "" : resident.lastName || "",
                certSuffix: isFemale ? "" : resident.suffix || "",
                spouseName: isFemale ? `${resident.firstName || ""} ${resident.lastName || ""}`.trim() : "",
            }));
        } else if (form.relationship && form.relationship !== "SELF" && prevRelationshipRef.current === "SELF") {
            setForm(prev => ({
                ...prev,
                fullName: "",
                certFirstName: "",
                certMiddleName: "",
                certLastName: "",
                certSuffix: "",
                spouseName: "",
                dateOfEvent: "",
                placeOfEvent: ""
            }));
        }
    }, [form.relationship, resident, loading]);

    useEffect(() => {
        if (!placeProvince || placeProvince === "OTHER" || placeCountry !== "PHILIPPINES") {
            setCitiesList([]);
            return;
        }

        const selectedProvObj = provincesList.find((p: any) => p && p.name && p.name.toUpperCase() === placeProvince.toUpperCase());
        if (!selectedProvObj || !selectedProvObj.code) return;

        async function loadCities(provCode: string) {
            setCitiesLoading(true);
            try {
                const res = await fetch(`https://psgc.gitlab.io/api/provinces/${provCode}/cities-municipalities/`);
                if (res.ok) {
                    const data = await res.json();
                    if (Array.isArray(data)) {
                        const sorted = data.sort((a: any, b: any) => (a.name || "").localeCompare(b.name || ""));
                        setCitiesList(sorted);

                        // Default to MAPANDAN if Pangasinan is selected and MAPANDAN is in the list
                        if (placeProvince.toUpperCase() === "PANGASINAN") {
                            const mapandanObj = sorted.find((c: any) => c && c.name && c.name.toUpperCase().includes("MAPANDAN"));
                            if (mapandanObj && mapandanObj.name) {
                                setPlaceCity(mapandanObj.name.toUpperCase());
                            }
                        }
                    }
                }
            } catch (e) {
                console.error("Failed to fetch cities", e);
            } finally {
                setCitiesLoading(false);
            }
        }
        loadCities(selectedProvObj.code);
    }, [placeProvince, provincesList, placeCountry]);

    useEffect(() => {
        async function init() {
            try {
                await ensureCivilRegistryTransactionTypes();
                const [resResult, typesResult, themeResult] = await Promise.all([
                    getCurrentUserResident(),
                    getTransactionTypes(),
                    getSystemSettingAction("theme_color", "#ec4899")
                ]);

                if (themeResult.success && themeResult.data) {
                    setThemeColor(themeResult.data);
                }

                if (resResult.success && resResult.data) {
                    setResident(resResult.data);
                    if (resResult.data) {
                        const r = resResult.data;
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
                            email: r.user?.email || r.email || "",
                            contactNumber: r.contactNumber || "",
                            informantAddress: constructedAddr
                        }));
                    }
                }

                // Load countries and provinces via public APIs
                setCountriesLoading(true);
                setProvincesLoading(true);

                Promise.all([
                    fetch("https://restcountries.com/v3.1/all?fields=name,cca2")
                        .then(r => r.ok ? r.json() : [])
                        .then(data => {
                            if (Array.isArray(data) && data.length > 0) {
                                const list = data.map((c: any) => ({
                                    code: c.cca2,
                                    name: c.name.common.toUpperCase()
                                })).sort((a: any, b: any) => a.name.localeCompare(b.name));
                                setCountriesList(list);
                            }
                        })
                        .catch(err => console.error("Failed to load countries:", err))
                        .finally(() => setCountriesLoading(false)),

                    fetch("https://psgc.gitlab.io/api/provinces/")
                        .then(r => r.ok ? r.json() : [])
                        .then(data => {
                            if (Array.isArray(data) && data.length > 0) {
                                const sorted = data.sort((a: any, b: any) => a.name.localeCompare(b.name));
                                setProvincesList(sorted);
                            }
                        })
                        .catch(err => console.error("Failed to load provinces:", err))
                        .finally(() => setProvincesLoading(false))
                ]);
                if (typesResult.success && typesResult.data) {
                    const lcrTypes = typesResult.data.filter((t: any) => t.category === "Civil Registry");
                    setAvailableTypes(lcrTypes);

                    setForm(prev => {
                        if (prev.typeId) return prev;
                        const currentDbType = lcrTypes.find((t: any) => t.code === "LCR_MARRIAGE");
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
        if (availableTypes.length > 0) {
            const currentDbType = availableTypes.find((t: any) => t.code === "LCR_MARRIAGE");
            if (currentDbType && form.typeId !== currentDbType.id) {
                setForm(prev => ({ ...prev, typeId: currentDbType.id }));
            }
        }
    }, [availableTypes, form.typeId]);

    const handleAcceptPolicy = () => { setPolicyOpen(false); setPolicyAccepted(true); };
    const dbType = availableTypes.find(t => t.code === "LCR_MARRIAGE");

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, key: string) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.size > 5 * 1024 * 1024) {
                toast.error("File size exceeds 5MB limit.");
                if (e.target.parentElement) {
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
                e.target.value = "";
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

            setForm(prev => ({
                ...prev,
                files: { ...prev.files, [key]: fileToProcess }
            }));
        }
    };

    const handleSubmit = async () => {
        if (submitting) return;
        if (!resident) {
            toast.error("User profile required");
            return;
        }

        if ((!form.files["validIdFront"] && !resident?.idFrontUrl) || (!form.files["validIdBack"] && !resident?.idBackUrl)) {
            toast.error("Please upload both Front and Back of your Government ID.");
            return;
        }

        if (!form.idTypeOverride && !resident?.idType) {
            toast.error("Please select an ID type.");
            return;
        }

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
            formData.append("residentSnapshot", JSON.stringify({
                firstName: resident.firstName,
                lastName: resident.lastName,
                middleName: resident.middleName,
                suffix: resident.suffix,
                contactNumber: resident.contactNumber,
                email: resident.email,
                gender: resident.gender,
                barangay: resident.barangay,
                municipality: resident.municipality,
                province: resident.province
            }));

            const additionalData = {
                subjectName: `${form.fullName} & ${form.spouseName}`,
                dateOfEvent: form.dateOfEvent,
                placeOfEvent: form.placeOfEvent,
                fatherName: "",
                motherName: "",
                spouseName: form.spouseName,
                relationship: form.relationship,
                fulfillmentType: null,
                email: form.email,
                contactNumber: form.contactNumber,
                informantAddress: form.informantAddress,
                idType: form.idTypeOverride || resident?.idType,
                idFrontUrl: resident?.idFrontUrl,
                idBackUrl: resident?.idBackUrl,
                totalAmount: dbType?.baseFee || 150
            };

            formData.append("additionalData", JSON.stringify(additionalData));

            Object.entries(form.files).forEach(([key, file]) => {
                if (file) formData.append(key, file);
            });

            const res = await submitCivilRegistryTransaction(formData);
            if (res.success && res.data) {
                toast.success("Marriage Request submitted successfully!");
                sessionStorage.removeItem("marriage-request-step");
                sessionStorage.removeItem("marriage-request-form");
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
                <Loader2 className="w-10 h-10 animate-spin text-rose-500 mb-4" />
                <p className="text-sm font-black uppercase tracking-widest text-slate-400 italic">Syncing Registry Matrix...</p>
            </div>
        );
    }

    return (
        <div
            className="container max-w-4xl mx-auto px-4 pt-0 pb-0 space-y-8"
            style={{ "--primary-theme": themeColor } as React.CSSProperties}
        >
            <style dangerouslySetInnerHTML={{
                __html: `
                :root, * {
                    --color-blue-500: ${themeColor} !important;
                    --color-blue-600: ${themeColor} !important;
                    --color-blue-700: ${themeColor} !important;
                    --primary-theme: ${themeColor} !important;
                    --color-primary: ${themeColor} !important;
                }
                .text-rose-500, [class*="text-rose-500"] {
                    color: ${themeColor} !important;
                }
                .text-rose-600, [class*="text-rose-600"] {
                    color: ${themeColor} !important;
                }
                .bg-rose-500, [class*="bg-rose-500"] {
                    background-color: ${themeColor} !important;
                }
                .bg-rose-600, [class*="bg-rose-600"] {
                    background-color: ${themeColor} !important;
                }
                .bg-rose-700, [class*="bg-rose-700"] {
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
                .border-rose-500\\/10, [class*="border-rose-500/10"] {
                    border-color: ${themeColor}1a !important;
                }
                .shadow-rose-500\\/20, [class*="shadow-rose-500/20"] {
                    --tw-shadow-color: ${themeColor}33 !important;
                }
                .hover\\:bg-rose-700:hover, [class*="hover:bg-rose-700"]:hover {
                    background-color: ${themeColor} !important;
                    filter: brightness(0.9);
                }
                .hover\\:border-rose-500\\/50:hover, [class*="hover:border-rose-500/50"]:hover {
                    border-color: ${themeColor}80 !important;
                }
                .focus\\:ring-rose-500:focus, [class*="focus:ring-rose-500"]:focus {
                    --tw-ring-color: ${themeColor} !important;
                }
                .bg-rose-50\\/50, [class*="bg-rose-50/50"] {
                    background-color: ${themeColor}0d !important;
                }
                .border-rose-500\\/50, [class*="border-rose-500/50"] {
                    border-color: ${themeColor}80 !important;
                }
                .border-l-rose-500, [class*="border-l-rose-500"] {
                    border-left-color: ${themeColor} !important;
                }
                input:not([type="button"]):not([type="submit"]), select, textarea {
                    color: #0f172a !important;
                }
                .dark input:not([type="button"]):not([type="submit"]), .dark select, .dark textarea {
                    color: #f8fafc !important;
                }
            `}} />
            <PrivacyTermsModal
                isOpen={policyOpen}
                onClose={() => setPolicyOpen(false)}
                onAccept={handleAcceptPolicy}
                onDecline={() => { setPolicyAccepted(false); }}
                themeColor={themeColor}
            />
            <DocumentViewerModal
                isOpen={viewerOpen}
                onClose={() => setViewerOpen(false)}
                file={viewerFile}
                fileUrl={viewerUrl}
                title={viewerTitle}
                themeColor={themeColor}
            />
            {/* Header Section */}
            <div className="space-y-4">
                <Breadcrumb>
                    <BreadcrumbList>
                        <BreadcrumbItem><BreadcrumbLink href="/">Home</BreadcrumbLink></BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem><BreadcrumbLink href="/user/services">Services</BreadcrumbLink></BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem><BreadcrumbLink href="/user/services/civil-registry">Civil Registry</BreadcrumbLink></BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem><BreadcrumbPage>Marriage Certificate Request</BreadcrumbPage></BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>

                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-white dark:bg-[#0f1117] p-8 rounded-[2.5rem] border border-slate-200/50 dark:border-white/5 shadow-xl shadow-slate-200/40 dark:shadow-none">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-rose-500/10 rounded-xl">
                                <Heart className="w-6 h-6 text-rose-500" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-rose-500">Local Civil Registry</span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">
                            Request <span className="text-rose-500">Marriage Certificate</span>
                        </h1>
                        <p className="text-slate-500 font-medium text-sm italic">Request certified copies of marriage certificates registered in Mapandan.</p>
                    </div>
                </div>
            </div>

            {/* Progress Stepper */}
            <div className="relative px-2 py-4">
                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-200 dark:bg-white/5 -translate-y-1/2" />
                <motion.div
                    className="absolute top-1/2 left-0 h-0.5 bg-rose-600 -translate-y-1/2 z-0"
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
                            <div
                                key={idx}
                                className="flex flex-col items-center gap-2 transition-all duration-300"
                            >
                                <div className={cn(
                                    "w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all duration-500 border-2 bg-white dark:bg-[#08090d]",
                                    isActive ? "border-rose-600 text-rose-600 shadow-lg shadow-rose-500/20 scale-110" :
                                        isCompleted ? "bg-rose-600 border-rose-600 text-white" :
                                            "border-slate-200 dark:border-white/10 text-slate-400"
                                )}>
                                    {isCompleted ? (
                                        <Check className="w-5 h-5" />
                                    ) : (
                                        <Icon className="w-5 h-5" />
                                    )}
                                </div>
                                <span className={cn(
                                    "text-[9px] font-black uppercase tracking-widest italic hidden md:block",
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

            {/* Step Selection */}
            <Card className="p-8 rounded-[2.5rem] border-slate-200/50 dark:border-white/5 bg-white dark:bg-[#0f1117] shadow-xl shadow-slate-200/40 dark:shadow-none min-h-[400px]">
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
                                <h2 className="text-xl md:text-2xl font-black italic uppercase tracking-tighter leading-tight">Identity <span className="text-rose-500 italic">Confirmation</span></h2>
                                <p className="text-[10px] md:text-xs text-slate-500 font-medium italic">Verify your details before making the marriage record request.</p>
                            </div>

                            <div className="space-y-4 md:space-y-6">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">First Name</Label>
                                        <Input
                                            value={resident?.firstName?.toUpperCase() || ""}
                                            readOnly
                                            className="h-10 rounded-xl bg-slate-50 border-slate-200 text-slate-400 text-xs md:text-sm uppercase font-bold"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Middle Name</Label>
                                        <Input
                                            value={resident?.middleName?.toUpperCase() || ""}
                                            readOnly
                                            className="h-10 rounded-xl bg-slate-50 border-slate-200 text-slate-400 text-xs md:text-sm uppercase font-bold"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Last Name</Label>
                                        <Input
                                            value={resident?.lastName?.toUpperCase() || ""}
                                            readOnly
                                            className="h-10 rounded-xl bg-slate-50 border-slate-200 text-slate-400 text-xs md:text-sm uppercase font-bold"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Suffix</Label>
                                        <Input
                                            value={resident?.suffix?.toUpperCase() || ""}
                                            readOnly
                                            className="h-10 rounded-xl bg-slate-50 border-slate-200 text-slate-400 text-xs md:text-sm uppercase font-bold"
                                        />
                                    </div>
                                </div>

                                <Separator className="opacity-50" />

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 items-end">
                                    <div className="space-y-1.5">
                                        <Label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Contact Number <span className="text-red-500">*</span></Label>
                                        <Input
                                            value={form.contactNumber}
                                            onChange={(e) => setForm(p => ({ ...p, contactNumber: e.target.value.replace(/[^0-9]/g, '') }))}
                                            className="h-10 rounded-xl border-slate-200 focus:ring-rose-500 shadow-sm text-xs md:text-sm"
                                            placeholder="09xx xxx xxxx"
                                        />
                                    </div>
                                    <div className="space-y-1.5 col-span-2 md:col-span-2">
                                        <Label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-rose-500/70 ml-1">Relationship to Document Owners <span className="text-red-500">*</span></Label>
                                        <Select
                                            value={form.relationship}
                                            onValueChange={(value) => setForm({ ...form, relationship: value })}
                                        >
                                            <SelectTrigger className={cn(
                                                "h-10 rounded-xl border-slate-200 focus:ring-rose-500 shadow-sm text-xs md:text-sm bg-white dark:bg-slate-900 transition-all",
                                                (showErrors && !form.relationship) && "border-red-500/50 bg-red-50/10"
                                            )}>
                                                <SelectValue placeholder="Select relationship" />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl border-slate-200 dark:border-white/10">
                                                <SelectItem value="SELF">HUSBAND / WIFE (SELF)</SelectItem>
                                                <SelectItem value="SON">SON</SelectItem>
                                                <SelectItem value="DAUGHTER">DAUGHTER</SelectItem>
                                                <SelectItem value="MOTHER">MOTHER</SelectItem>
                                                <SelectItem value="FATHER">FATHER</SelectItem>
                                                <SelectItem value="OTHER">AUTHORIZED REPRESENTATIVE</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Informant Address</Label>
                                    <Input
                                        value={form.informantAddress || ""}
                                        readOnly
                                        className="h-10 rounded-xl bg-slate-50 border-slate-200 text-slate-400 text-xs md:text-sm uppercase font-bold"
                                    />
                                </div>
                            </div>

                            <div className="bg-rose-500/5 border border-rose-500/10 p-3 md:p-4 rounded-2xl md:rounded-3xl flex items-center gap-2 md:gap-3">
                                <Sparkles className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                <p className="text-[8px] md:text-[10px] text-rose-500 font-black italic leading-tight uppercase tracking-widest">
                                    Verified Profile Data. Immediate family or authorized representatives can request marriage records.
                                </p>
                            </div>

                            <div className="flex justify-end gap-3 pt-8">
                                <Button
                                    variant="ghost"
                                    onClick={() => router.push("/user/services/civil-registry")}
                                    className="rounded-full px-8 border-slate-200 dark:border-white/10 font-black uppercase tracking-widest italic text-[10px] h-12"
                                >
                                    <ArrowRight className="w-4 h-4 mr-2 rotate-180" />
                                    Back
                                </Button>
                                <Button
                                    onClick={() => {
                                        if (!form.relationship) {
                                            setShowErrors(true);
                                            toast.error("Please select your relationship to the document owners.");
                                            return;
                                        }
                                        setShowErrors(false);
                                        setCurrentStep("DETAILS");
                                    }}
                                    className="rounded-full px-12 bg-rose-600 hover:bg-rose-700 text-white font-black uppercase tracking-widest italic text-[10px] h-12 shadow-xl shadow-rose-500/20"
                                >
                                    Proceed to Marriage Details
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
                            <div className="space-y-1">
                                <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight">Marriage Details</h2>
                                <p className="text-xs text-slate-500 font-medium italic">Certified Copy specifications</p>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-4 p-8 rounded-[2.5rem] bg-slate-50 dark:bg-white/5 border border-slate-200/50 dark:border-white/5">
                                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-rose-500 italic mb-4">Contracting Parties</h3>

                                    <div className="space-y-6">
                                        {/* Husband Details */}
                                        <div className="space-y-3">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Husband&apos;s Full Name <span className="text-red-500">*</span></Label>
                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                                <div className="md:col-span-2 space-y-2">
                                                    <Label className="text-[9px] font-black uppercase text-slate-500 italic">First Name</Label>
                                                    <Input
                                                        className={cn("rounded-xl h-10 transition-all uppercase font-medium", (showErrors && !form.certFirstName) && "border-red-500/50 bg-red-50/10")}
                                                        placeholder="First Name"
                                                        value={form.certFirstName}
                                                        onChange={(e) => setForm({ ...form, certFirstName: e.target.value.toUpperCase() })}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-[9px] font-black uppercase text-slate-500 italic">Middle Name</Label>
                                                    <Input
                                                        className="rounded-xl h-10 transition-all uppercase font-medium"
                                                        placeholder="Middle Name"
                                                        value={form.certMiddleName}
                                                        onChange={(e) => setForm({ ...form, certMiddleName: e.target.value.toUpperCase() })}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-[9px] font-black uppercase text-slate-500 italic">Last Name</Label>
                                                    <Input
                                                        className={cn("rounded-xl h-10 transition-all uppercase font-medium", (showErrors && !form.certLastName) && "border-red-500/50 bg-red-50/10")}
                                                        placeholder="Last Name"
                                                        value={form.certLastName}
                                                        onChange={(e) => setForm({ ...form, certLastName: e.target.value.toUpperCase() })}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Wife Details */}
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Wife&apos;s Maiden Full Name <span className="text-red-500">*</span></Label>
                                            <Input
                                                className={cn(
                                                    "rounded-xl h-10 transition-all uppercase font-medium",
                                                    (showErrors && !form.spouseName) && "border-red-500/50 bg-red-50/10"
                                                )}
                                                placeholder="Complete Maiden Name (First, Middle, Last)"
                                                value={form.spouseName}
                                                onChange={(e) => setForm({ ...form, spouseName: e.target.value.toUpperCase() })}
                                            />
                                        </div>

                                        <Separator />

                                        {/* Event Specifics */}
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">Date of Marriage <span className="text-red-500">*</span></Label>
                                            <Input
                                                type="date"
                                                className={cn("rounded-xl h-10 transition-all", (showErrors && !form.dateOfEvent) && "border-red-500/50 bg-red-50/10")}
                                                value={form.dateOfEvent}
                                                onChange={(e) => setForm({ ...form, dateOfEvent: e.target.value })}
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">Country <span className="text-red-500">*</span></Label>
                                                <Select value={placeCountry} onValueChange={(val) => {
                                                    setPlaceCountry(val);
                                                    if (val !== "PHILIPPINES") {
                                                        setPlaceProvince("OTHER");
                                                        setPlaceCity("OTHER");
                                                    } else {
                                                        setPlaceProvince("PANGASINAN");
                                                        setPlaceCity("MAPANDAN");
                                                    }
                                                }}>
                                                    <SelectTrigger className="h-10 rounded-xl border-slate-200 focus:ring-rose-500 shadow-sm text-xs bg-white dark:bg-slate-900 font-bold animate-in fade-in duration-200">
                                                        <div className="flex items-center gap-1.5 truncate">
                                                            {countriesLoading && <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0 text-slate-400" />}
                                                            <SelectValue placeholder="Select Country" />
                                                        </div>
                                                    </SelectTrigger>
                                                    <SelectContent className="max-h-[250px] overflow-y-auto">
                                                        <SelectItem value="PHILIPPINES">PHILIPPINES</SelectItem>
                                                        {countriesList.filter(c => c.name !== "PHILIPPINES").map((country) => (
                                                            <SelectItem key={country.code} value={country.name}>{country.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            {placeCountry === "PHILIPPINES" && (
                                                <div className="space-y-2">
                                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">Province <span className="text-red-500">*</span></Label>
                                                    <Select value={placeProvince} onValueChange={(val) => {
                                                        setPlaceProvince(val);
                                                        if (val === "PANGASINAN") {
                                                            setPlaceCity("MAPANDAN");
                                                        } else {
                                                            setPlaceCity("OTHER");
                                                        }
                                                    }}>
                                                        <SelectTrigger className="h-10 rounded-xl border-slate-200 focus:ring-rose-500 shadow-sm text-xs bg-white dark:bg-slate-900 font-bold animate-in fade-in duration-200">
                                                            <div className="flex items-center gap-1.5 truncate">
                                                                {provincesLoading && <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0 text-slate-400" />}
                                                                <SelectValue placeholder="Select Province" />
                                                            </div>
                                                        </SelectTrigger>
                                                        <SelectContent className="max-h-[250px] overflow-y-auto">
                                                            {provincesList.length > 0 ? (
                                                                <>
                                                                    {provincesList.map((p) => (
                                                                        <SelectItem key={p.code} value={p.name.toUpperCase()}>{p.name.toUpperCase()}</SelectItem>
                                                                    ))}
                                                                    <SelectItem value="OTHER">OTHER PROVINCE...</SelectItem>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    {LOCAL_FALLBACK_PROVINCES.map((p) => (
                                                                        <SelectItem key={p} value={p}>{p}</SelectItem>
                                                                    ))}
                                                                    <SelectItem value="OTHER">OTHER PROVINCE...</SelectItem>
                                                                </>
                                                            )}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            )}

                                            {placeCountry === "PHILIPPINES" && placeProvince !== "OTHER" && (
                                                <div className="space-y-2">
                                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">City / Municipality <span className="text-red-500">*</span></Label>
                                                    <Select value={placeCity} onValueChange={setPlaceCity}>
                                                        <SelectTrigger className="h-10 rounded-xl border-slate-200 focus:ring-rose-500 shadow-sm text-xs bg-white dark:bg-slate-900 font-bold animate-in fade-in duration-200">
                                                            <div className="flex items-center gap-1.5 truncate">
                                                                {citiesLoading && <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0 text-slate-400" />}
                                                                <SelectValue placeholder="Select City/Municipality" />
                                                            </div>
                                                        </SelectTrigger>
                                                        <SelectContent className="max-h-[250px] overflow-y-auto">
                                                            {citiesList.length > 0 ? (
                                                                <>
                                                                    {citiesList.map((c) => (
                                                                        <SelectItem key={c.code} value={c.name.toUpperCase()}>{c.name.toUpperCase()}</SelectItem>
                                                                    ))}
                                                                    <SelectItem value="OTHER">OTHER CITY/MUNICIPALITY...</SelectItem>
                                                                </>
                                                            ) : (
                                                                placeProvince.toUpperCase() === "PANGASINAN" ? (
                                                                    <>
                                                                        {LOCAL_FALLBACK_CITIES.map((c) => (
                                                                            <SelectItem key={c} value={c}>{c}</SelectItem>
                                                                        ))}
                                                                        <SelectItem value="OTHER">OTHER CITY/MUNICIPALITY...</SelectItem>
                                                                    </>
                                                                ) : (
                                                                    <SelectItem value="OTHER">OTHER CITY/MUNICIPALITY...</SelectItem>
                                                                )
                                                            )}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            )}
                                        </div>

                                        {placeCountry === "OTHER" && (
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div className="space-y-2">
                                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">Specify Country <span className="text-red-500">*</span></Label>
                                                    <Input
                                                        className={cn("rounded-xl h-10 transition-all uppercase font-bold", (showErrors && !customCountry.trim()) && "border-red-500/50 bg-red-50/10")}
                                                        placeholder="e.g. UNITED STATES"
                                                        value={customCountry}
                                                        onChange={(e) => setCustomCountry(e.target.value.toUpperCase())}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">Specify State / Province <span className="text-red-500">*</span></Label>
                                                    <Input
                                                        className={cn("rounded-xl h-10 transition-all uppercase font-bold", (showErrors && !customProvince.trim()) && "border-red-500/50 bg-red-50/10")}
                                                        placeholder="e.g. CALIFORNIA"
                                                        value={customProvince}
                                                        onChange={(e) => setCustomProvince(e.target.value.toUpperCase())}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">Specify City / Town <span className="text-red-500">*</span></Label>
                                                    <Input
                                                        className={cn("rounded-xl h-10 transition-all uppercase font-bold", (showErrors && !customCity.trim()) && "border-red-500/50 bg-red-50/10")}
                                                        placeholder="e.g. LOS ANGELES"
                                                        value={customCity}
                                                        onChange={(e) => setCustomCity(e.target.value.toUpperCase())}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {placeCountry === "PHILIPPINES" && placeProvince === "OTHER" && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">Specify Province <span className="text-red-500">*</span></Label>
                                                    <Input
                                                        className={cn("rounded-xl h-10 transition-all uppercase font-bold", (showErrors && !customProvince.trim()) && "border-red-500/50 bg-red-50/10")}
                                                        placeholder="e.g. CEBU"
                                                        value={customProvince}
                                                        onChange={(e) => setCustomProvince(e.target.value.toUpperCase())}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">Specify City / Municipality <span className="text-red-500">*</span></Label>
                                                    <Input
                                                        className={cn("rounded-xl h-10 transition-all uppercase font-bold", (showErrors && !customCity.trim()) && "border-red-500/50 bg-red-50/10")}
                                                        placeholder="e.g. CEBU CITY"
                                                        value={customCity}
                                                        onChange={(e) => setCustomCity(e.target.value.toUpperCase())}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {placeCountry === "PHILIPPINES" && placeProvince !== "OTHER" && placeCity === "OTHER" && (
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">Specify City / Municipality <span className="text-red-500">*</span></Label>
                                                <Input
                                                    className={cn("rounded-xl h-10 transition-all uppercase font-bold", (showErrors && !customCity.trim()) && "border-red-500/50 bg-red-50/10")}
                                                    placeholder="e.g. SAN JACINTO"
                                                    value={customCity}
                                                    onChange={(e) => setCustomCity(e.target.value.toUpperCase())}
                                                />
                                            </div>
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
                                        const isCustomCountryEmpty = placeCountry === "OTHER" && !customCountry.trim();
                                        const isCustomProvinceEmpty = placeProvince === "OTHER" && !customProvince.trim();
                                        const isCustomCityEmpty = placeCity === "OTHER" && !customCity.trim();

                                        if (!form.certFirstName || !form.certLastName || !form.spouseName || !form.dateOfEvent || isCustomCountryEmpty || isCustomProvinceEmpty || isCustomCityEmpty) {
                                            setShowErrors(true);
                                            toast.error("Please fill in all required marriage record and place details.");
                                            return;
                                        }
                                        setShowErrors(false);
                                        const husbandFull = `${form.certFirstName} ${form.certMiddleName} ${form.certLastName} ${form.certSuffix}`.replace(/\s+/g, ' ').trim();
                                        setForm(prev => ({ ...prev, fullName: husbandFull }));
                                        setCurrentStep("CONFIRM");
                                    }}
                                    className="rounded-full px-12 bg-rose-600 hover:bg-rose-700 text-white font-black uppercase tracking-widest italic text-[10px] h-12 shadow-xl shadow-rose-500/20"
                                >
                                    Proceed to Review & Upload
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
                            <div className="space-y-1">
                                <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight">Review & Submit Request</h2>
                                <p className="text-xs text-slate-500 font-medium italic">Upload verification document and sign off</p>
                            </div>

                            <Card className="bg-slate-50 dark:bg-white/5 border-none p-6 rounded-[2rem] space-y-4">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-1">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 italic">Registry Type</span>
                                        <p className="font-black text-slate-900 dark:text-white italic">Marriage Certificate Request</p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 italic">Husband&apos;s Name</span>
                                        <p className="font-black text-slate-900 dark:text-white italic uppercase">{form.fullName}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 italic">Wife&apos;s Maiden Name</span>
                                        <p className="font-black text-slate-900 dark:text-white italic uppercase">{form.spouseName}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 italic">Relationship</span>
                                        <p className="font-black text-slate-900 dark:text-white italic uppercase">{form.relationship}</p>
                                    </div>
                                    <div className="space-y-1 col-span-2">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 italic">Informant Address</span>
                                        <p className="font-black text-slate-900 dark:text-white italic uppercase">{form.informantAddress || "N/A"}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 italic">Date of Marriage</span>
                                        <p className="font-black text-slate-900 dark:text-white italic">{form.dateOfEvent}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 italic">Place of Marriage</span>
                                        <p className="font-black text-slate-900 dark:text-white italic uppercase">{form.placeOfEvent}</p>
                                    </div>
                                    <div className="space-y-1 text-right col-span-2">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 italic">Assessed Request Fee</span>
                                        <p className="text-2xl font-black text-rose-500 italic">₱{(dbType?.baseFee || 150).toLocaleString()}</p>
                                    </div>
                                </div>

                                {/* ID Submission Section */}
                                <div className="pt-4 border-t border-slate-200 dark:border-white/5 space-y-4">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 bg-rose-500/10 rounded-lg">
                                            <Upload className="w-3.5 h-3.5 text-rose-500" />
                                        </div>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Document Verification</span>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5 md:col-span-2">
                                            <Label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-rose-500/70 ml-1">Select ID Type <span className="text-red-500">*</span></Label>
                                            <Select
                                                value={form.idTypeOverride || resident?.idType || ""}
                                                onValueChange={(value) => setForm(prev => ({
                                                    ...prev,
                                                    idTypeOverride: value
                                                }))}
                                            >
                                                <SelectTrigger className="h-10 rounded-xl border-slate-200 focus:ring-rose-500 shadow-sm text-xs md:text-sm bg-white dark:bg-slate-900 transition-all font-bold">
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

                                        {/* Front ID Uploader */}
                                        <div className="space-y-2">
                                            <Label className="text-[9px] font-black uppercase tracking-widest text-slate-500 italic ml-1">Valid Government ID (Front) <span className="text-red-500">*</span></Label>
                                            <div className={cn(
                                                "group relative flex flex-col items-center justify-center border-2 border-dashed rounded-[1.5rem] p-4 transition-all duration-300 min-h-[140px]",
                                                (form.files["validIdFront"] || resident?.idFrontUrl) ? "bg-rose-50/50 border-rose-500/50" : "bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 hover:border-rose-500/50"
                                            )}>
                                                <input
                                                    type="file"
                                                    onChange={(e) => handleFileChange(e, "validIdFront")}
                                                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                                    accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                                                />
                                                {(form.files["validIdFront"] || resident?.idFrontUrl) ? (
                                                    <div className="relative w-full aspect-[16/9] rounded-xl overflow-hidden group/preview shadow-lg">
                                                        {checkIsPdf(form.files["validIdFront"], resident?.idFrontUrl) ? (
                                                            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 dark:bg-white/5 p-4 text-center">
                                                                <FileText className="w-10 h-10 text-red-500 mb-2" />
                                                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 max-w-[80%] truncate">
                                                                    {form.files["validIdFront"] ? (form.files["validIdFront"] as File).name : "ID_FRONT.pdf"}
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <PreviewImage
                                                                file={form.files["validIdFront"] as File || null}
                                                                fallbackUrl={resident?.idFrontUrl || ""}
                                                                alt="ID Front Preview"
                                                                className="w-full h-full object-cover transition-transform duration-500 group-hover/preview:scale-110"
                                                            />
                                                        )}
                                                        <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover/preview:opacity-100 transition-opacity z-20 gap-2">
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleViewFile(form.files["validIdFront"] as File || null, resident?.idFrontUrl || null, "Valid ID (Front)");
                                                                }}
                                                                className="font-black italic uppercase tracking-widest text-[8px] px-3 h-7 rounded-lg bg-white text-slate-900 hover:bg-slate-100"
                                                            >
                                                                <Eye className="w-3.5 h-3.5 mr-1" />
                                                                View
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="text-center space-y-2">
                                                        <Upload className="w-5 h-5 text-slate-300 mx-auto group-hover:text-rose-500 transition-colors" />
                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic group-hover:text-rose-500 transition-colors">Click or drag</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Back ID Uploader */}
                                        <div className="space-y-2">
                                            <Label className="text-[9px] font-black uppercase tracking-widest text-slate-500 italic ml-1">Valid Government ID (Back) <span className="text-red-500">*</span></Label>
                                            <div className={cn(
                                                "group relative flex flex-col items-center justify-center border-2 border-dashed rounded-[1.5rem] p-4 transition-all duration-300 min-h-[140px]",
                                                (form.files["validIdBack"] || resident?.idBackUrl) ? "bg-rose-50/50 border-rose-500/50" : "bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 hover:border-rose-500/50"
                                            )}>
                                                <input
                                                    type="file"
                                                    onChange={(e) => handleFileChange(e, "validIdBack")}
                                                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                                    accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                                                />
                                                {(form.files["validIdBack"] || resident?.idBackUrl) ? (
                                                    <div className="relative w-full aspect-[16/9] rounded-xl overflow-hidden group/preview shadow-lg">
                                                        {checkIsPdf(form.files["validIdBack"], resident?.idBackUrl) ? (
                                                            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 dark:bg-white/5 p-4 text-center">
                                                                <FileText className="w-10 h-10 text-red-500 mb-2" />
                                                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 max-w-[80%] truncate">
                                                                    {form.files["validIdBack"] ? (form.files["validIdBack"] as File).name : "ID_BACK.pdf"}
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <PreviewImage
                                                                file={form.files["validIdBack"] as File || null}
                                                                fallbackUrl={resident?.idBackUrl || ""}
                                                                alt="ID Back Preview"
                                                                className="w-full h-full object-cover transition-transform duration-500 group-hover/preview:scale-110"
                                                            />
                                                        )}
                                                        <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover/preview:opacity-100 transition-opacity z-20 gap-2">
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleViewFile(form.files["validIdBack"] as File || null, resident?.idBackUrl || null, "Valid ID (Back)");
                                                                }}
                                                                className="font-black italic uppercase tracking-widest text-[8px] px-3 h-7 rounded-lg bg-white text-slate-900 hover:bg-slate-100"
                                                            >
                                                                <Eye className="w-3.5 h-3.5 mr-1" />
                                                                View
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="text-center space-y-2">
                                                        <Upload className="w-5 h-5 text-slate-300 mx-auto group-hover:text-rose-500 transition-colors" />
                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic group-hover:text-rose-500 transition-colors">Click or drag</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Card>

                            <div className="space-y-4">
                                <div className="p-4 rounded-2xl border border-slate-200/40 bg-white/30 dark:bg-white/5 flex items-start gap-4">
                                    <button type="button" onClick={() => setPolicyOpen(true)} className={cn("w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5", policyAccepted ? "bg-rose-500 border-rose-500 text-white" : "border-slate-300")}>
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
                                    <button type="button" onClick={() => setPolicyOpen(true)} className="text-[10px] font-black italic text-rose-600 shrink-0">Review</button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                    <Button
                                        variant="ghost"
                                        onClick={() => setCurrentStep("DETAILS")}
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
                                            (!form.files["validIdBack"] && !resident?.idBackUrl)
                                        }
                                        className={cn(
                                            "md:col-span-3 h-14 rounded-full font-black uppercase tracking-widest italic text-[11px] transition-all duration-300",
                                            (!form.idTypeOverride && !resident?.idType) || (!form.files["validIdFront"] && !resident?.idFrontUrl) || (!form.files["validIdBack"] && !resident?.idBackUrl)
                                                ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                                                : "bg-rose-600 hover:bg-rose-700 text-white shadow-xl shadow-rose-500/20"
                                        )}
                                    >
                                        {submitting ? (
                                            <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                        ) : (!form.idTypeOverride && !resident?.idType) || (!form.files["validIdFront"] && !resident?.idFrontUrl) || (!form.files["validIdBack"] && !resident?.idBackUrl) ? (
                                            <>
                                                Upload Identification to Submit
                                                <AlertCircle className="w-5 h-5 ml-2" />
                                            </>
                                        ) : (
                                            <>
                                                Submit Marriage Request
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

            {/* Info Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-6 rounded-[2rem] border-slate-200/50 dark:border-white/5 bg-rose-500/5 border-l-4 border-l-rose-500">
                    <div className="flex gap-4">
                        <Info className="w-5 h-5 text-rose-500 shrink-0" />
                        <div className="space-y-1">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-rose-500 italic">Requirements</h4>
                            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium italic">Certified true copies of marriage certificates require a valid government ID of the spouse or immediate family member.</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-6 rounded-[2rem] border-slate-200/50 dark:border-white/5 bg-slate-50 dark:bg-white/5">
                    <div className="flex gap-4">
                        <CreditCard className="w-5 h-5 text-slate-400 shrink-0" />
                        <div className="space-y-1">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Standard Fee</h4>
                            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium italic">PHP 150.00 per certified copy. Processing takes 2-3 working days.</p>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}
