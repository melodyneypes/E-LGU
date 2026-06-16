"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
    Loader2,
    Check,
    AlertCircle,
    Sparkles,
    Heart,
    ArrowRight,
    Upload,
    FileText,
    CheckCircle2,
    Home
} from "lucide-react";
import Link from "next/link";
import DocumentViewerModal from "@/components/shared/DocumentViewerModal";
import PremiumDocumentUpload from "@/components/shared/PremiumDocumentUpload";
import { supabase } from "@/lib/supabase";
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
    getSystemSettingAction,
    getTransactionById
} from "@/app/admin/transactions/actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import PrivacyTermsModal from "@/components/shared/PrivacyTermsModal";


// --- UPLOAD FILE CLIENT-SIDE TO SUPABASE STORAGE ---
async function uploadFileClientSide(file: File, fieldName: string, userId: string): Promise<string> {
    const fileExt = file.name.split('.').pop() || 'bin';
    const fileName = `${userId}/${fieldName}_${Date.now()}.${fileExt}`;
    const filePath = `services/lcr/marriage_certificate_request/${fileName}`;

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

type Step = "STATUS" | "IDENTITY" | "DETAILS" | "CONFIRM";

const STEPS: { id: Step; label: string; icon: any }[] = [
    { id: "STATUS", label: "Status", icon: Home },
    { id: "IDENTITY", label: "Requester Details", icon: Heart },
    { id: "DETAILS", label: "Marriage Details", icon: FileText },
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
    previews: Record<string, string | null>;
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
    const [themeColor, setThemeColor] = useState("var(--primary-theme)"); // default rose color for marriage

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
    const [revisionId, setRevisionId] = useState<string | null>(null);
    const [revisionTx, setRevisionTx] = useState<any>(null);

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
        previews: {},
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

    const renderIdCard = (label: string, fileKey: string) => {
        const file = form.files[fileKey] || null;
        const rawUrl = fileKey === "validIdFront" ? resident?.idFrontUrl : resident?.idBackUrl;
        const isRawUrlValid = rawUrl && typeof rawUrl === "string" && rawUrl.startsWith("http") && !rawUrl.includes("placeholder") && rawUrl.trim() !== "";
        const defaultUrl = isRawUrlValid ? rawUrl : null;
        
        // Match previews object from state
        const statePreview = form.previews[fileKey];
        const isStatePreviewValid = statePreview && typeof statePreview === "string" && statePreview.startsWith("http") && !statePreview.includes("placeholder") && statePreview.trim() !== "";
        
        // Final value sent to component must be undefined if not valid to prevent card extension
        const finalPreviewUrl = isStatePreviewValid ? statePreview : (isRawUrlValid ? defaultUrl : undefined);

        return (
            <PremiumDocumentUpload
                key={fileKey}
                label={label}
                required
                file={file}
                previewUrl={finalPreviewUrl}
                error={showErrors && !file && !finalPreviewUrl}
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
                onView={() => handleViewFile(file, finalPreviewUrl || null, label)}
            />
        );
    };

    // Persist progress to session storage
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get("revisionId")) return;

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
        if (!loading && !revisionId) {
            sessionStorage.setItem("marriage-request-step", currentStep);
            sessionStorage.setItem("marriage-request-form", JSON.stringify({
                ...form,
                files: {}
            }));
        }
    }, [currentStep, form, loading, revisionId]);

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
                    } else {
                        setCitiesList(LOCAL_FALLBACK_CITIES.map(n => ({ code: n, name: n })));
                    }
                } else {
                    setCitiesList(LOCAL_FALLBACK_CITIES.map(n => ({ code: n, name: n })));
                }
            } catch {
                console.warn("[MarriageCertRequest] Cities API unavailable, using local fallback.");
                setCitiesList(LOCAL_FALLBACK_CITIES.map(n => ({ code: n, name: n })));
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
                        const fileKeys = ["validIdFront", "validIdBack"];
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
                        let certHusbandFullName = addData.certHusbandFullName || "";
                        if (!certHusbandFullName && addData.subjectName) {
                            certHusbandFullName = addData.subjectName.split("&")[0]?.trim() || "";
                        }
                        if (!certFN && !certLN && certHusbandFullName) {
                            const parts = certHusbandFullName.split(/\s+/);
                            certLN = parts.pop() || "";
                            certFN = parts.shift() || "";
                            if (["JR", "SR", "I", "II", "III", "IV"].includes(certLN.toUpperCase())) {
                                certSuf = certLN;
                                certLN = parts.pop() || "";
                            }
                            certMN = parts.join(" ") || "";
                        }

                        setForm(prev => ({
                            ...prev,
                            typeId: txData.typeId || prev.typeId,
                            fullName: certHusbandFullName || prev.fullName,
                            dateOfEvent: addData.dateOfEvent || prev.dateOfEvent,
                            placeOfEvent: addData.placeOfEvent || prev.placeOfEvent,
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
                            previews
                        }));

                        if (addData.placeOfEvent) {
                            const parts = addData.placeOfEvent.split(",").map((p: string) => p.trim());
                            if (parts.length >= 3) {
                                setPlaceCountry(parts[parts.length - 1]);
                                setPlaceProvince(parts[parts.length - 2]);
                                setPlaceCity(parts[parts.length - 3]);
                            }
                        }
                    } else {
                        setForm(prev => ({
                            ...prev,
                            email: r.user?.email || r.email || "",
                            contactNumber: r.contactNumber || "",
                            informantAddress: constructedAddr
                        }));
                    }
                }

                // Load countries and provinces via public APIs with local fallbacks
                setCountriesLoading(true);
                setProvincesLoading(true);

                // Countries
                (async () => {
                    try {
                        const res = await fetch("https://restcountries.com/v3.1/all?fields=name,cca2");
                        if (res.ok) {
                            const data = await res.json();
                            if (Array.isArray(data) && data.length > 0) {
                                const list = data.map((c: any) => ({
                                    code: c.cca2,
                                    name: c.name.common.toUpperCase()
                                })).sort((a: any, b: any) => a.name.localeCompare(b.name));
                                setCountriesList(list);
                            }
                        }
                    } catch {
                        // Network unavailable — countries list stays empty, user can type manually
                        console.warn("[MarriageCertRequest] Countries API unavailable, using manual input.");
                    } finally {
                        setCountriesLoading(false);
                    }
                })();

                // Provinces
                (async () => {
                    try {
                        const res = await fetch("https://psgc.gitlab.io/api/provinces/");
                        if (res.ok) {
                            const data = await res.json();
                            if (Array.isArray(data) && data.length > 0) {
                                const sorted = data.sort((a: any, b: any) => a.name.localeCompare(b.name));
                                setProvincesList(sorted);
                            } else {
                                // Fallback to local list
                                setProvincesList(LOCAL_FALLBACK_PROVINCES.map(n => ({ code: n, name: n })));
                            }
                        } else {
                            setProvincesList(LOCAL_FALLBACK_PROVINCES.map(n => ({ code: n, name: n })));
                        }
                    } catch {
                        console.warn("[MarriageCertRequest] Provinces API unavailable, using local fallback.");
                        setProvincesList(LOCAL_FALLBACK_PROVINCES.map(n => ({ code: n, name: n })));
                    } finally {
                        setProvincesLoading(false);
                    }
                })();
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

    // --- STEP VALIDATION ---
    const validateStep = (stepId: Step): boolean => {
        if (stepId === "STATUS" || stepId === "IDENTITY") {
            const missingIdentity: string[] = [];
            if (!form.relationship) missingIdentity.push("Relationship to Document Owners");
            if (!form.contactNumber) missingIdentity.push("Contact Number");
            if (missingIdentity.length > 0) {
                setShowErrors(true);
                toast.error(`Please fill in: ${missingIdentity.join(", ")}`);
                // Scroll to card
                setTimeout(() => {
                    const card = document.querySelector("[data-step-card]");
                    if (card) card.scrollIntoView({ behavior: "smooth", block: "start" });
                }, 50);
                return false;
            }
        }
        if (stepId === "DETAILS") {
            const isCustomCountryEmpty = placeCountry === "OTHER" && !customCountry.trim();
            const isCustomProvinceEmpty = placeProvince === "OTHER" && !customProvince.trim();
            const isCustomCityEmpty = placeCity === "OTHER" && !customCity.trim();
            const missingDetails: string[] = [];
            if (!form.certFirstName) missingDetails.push("Husband First Name");
            if (!form.certLastName) missingDetails.push("Husband Last Name");
            if (!form.spouseName) missingDetails.push("Wife's Maiden Name");
            if (!form.dateOfEvent) missingDetails.push("Date of Marriage");
            if (isCustomCountryEmpty) missingDetails.push("Country");
            if (isCustomProvinceEmpty) missingDetails.push("Province");
            if (isCustomCityEmpty) missingDetails.push("City / Municipality");
            if (missingDetails.length > 0) {
                setShowErrors(true);
                toast.error(`Please fill in: ${missingDetails.join(", ")}`);
                setTimeout(() => {
                    const card = document.querySelector("[data-step-card]");
                    if (card) card.scrollIntoView({ behavior: "smooth", block: "start" });
                }, 50);
                return false;
            }
        }
        return true;
    };

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
                certHusbandFullName: form.fullName,
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
                idFrontUrl: fileUrls["validIdFront"] || resident?.idFrontUrl,
                idBackUrl: fileUrls["validIdBack"] || resident?.idBackUrl,
                validIdFront: fileUrls["validIdFront"] || resident?.idFrontUrl,
                validIdBack: fileUrls["validIdBack"] || resident?.idBackUrl,
                totalAmount: dbType?.baseFee || 150
            };

            formData.append("additionalData", JSON.stringify(additionalData));

            const res = await submitCivilRegistryTransaction(formData);
            if (res.success && res.data) {
                toast.success(revisionId ? "Revision resubmitted successfully!" : "Marriage Request submitted successfully!");
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
                <Loader2 className="w-10 h-10 animate-spin mb-4" style={{ color: "var(--primary-theme)" }} />
                <p className="text-sm font-black uppercase tracking-widest text-slate-400 italic">Syncing Registry Matrix...</p>
            </div>
        );
    }

    return (
        <div
            className="container max-w-4xl mx-auto px-4 pt-0 pb-0 space-y-8"
            style={themeColor !== "var(--primary-theme)" ? { "--primary-theme": themeColor } as React.CSSProperties : {}}
        >
            <style dangerouslySetInnerHTML={{
                __html: `
                ${themeColor !== "var(--primary-theme)" ? `
                :root, * {
                    --color-blue-500: ${themeColor} !important;
                    --color-blue-600: ${themeColor} !important;
                    --color-blue-700: ${themeColor} !important;
                    --primary-theme: ${themeColor} !important;
                    --color-primary: ${themeColor} !important;
                }
                ` : ""}
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
                    background-color: ${themeColor === "var(--primary-theme)" ? "color-mix(in srgb, var(--primary-theme) 10%, transparent)" : `${themeColor}1a`} !important;
                }
                .bg-rose-500\\/5, [class*="bg-rose-500/5"] {
                    background-color: ${themeColor === "var(--primary-theme)" ? "color-mix(in srgb, var(--primary-theme) 5%, transparent)" : `${themeColor}0d`} !important;
                }
                .border-rose-500\\/10, [class*="border-rose-500/10"] {
                    border-color: ${themeColor === "var(--primary-theme)" ? "color-mix(in srgb, var(--primary-theme) 10%, transparent)" : `${themeColor}1a`} !important;
                }
                .shadow-rose-500\\/20, [class*="shadow-rose-500/20"] {
                    --tw-shadow-color: ${themeColor === "var(--primary-theme)" ? "color-mix(in srgb, var(--primary-theme) 20%, transparent)" : `${themeColor}33`} !important;
                }
                .hover\\:bg-rose-700:hover, [class*="hover:bg-rose-700"]:hover {
                    background-color: ${themeColor} !important;
                    filter: brightness(0.9);
                }
                .hover\\:border-rose-500\\/50:hover, [class*="hover:border-rose-500/50"]:hover {
                    border-color: ${themeColor === "var(--primary-theme)" ? "color-mix(in srgb, var(--primary-theme) 50%, transparent)" : `${themeColor}80`} !important;
                }
                .focus\\:ring-rose-500:focus, [class*="focus:ring-rose-500"]:focus {
                    --tw-ring-color: ${themeColor} !important;
                }
                .bg-rose-50\\/50, [class*="bg-rose-50/50"] {
                    background-color: ${themeColor === "var(--primary-theme)" ? "color-mix(in srgb, var(--primary-theme) 5%, transparent)" : `${themeColor}0d`} !important;
                }
                .border-rose-500\\/50, [class*="border-rose-500/50"] {
                    border-color: ${themeColor === "var(--primary-theme)" ? "color-mix(in srgb, var(--primary-theme) 50%, transparent)" : `${themeColor}80`} !important;
                }
                .border-l-rose-500, [class*="border-l-rose-500"] {
                    border-left-color: ${themeColor} !important;
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
                            <BreadcrumbPage className="text-[10px] font-black uppercase tracking-widest italic text-emerald-700 dark:text-emerald-400">Marriage Certificate Request</BreadcrumbPage>
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
                            <Heart className="w-4 h-4" style={{ color: themeColor }} />
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500 dark:text-white/70 italic">Local Civil Registry</span>
                    </div>

                    <h1 className="text-2xl md:text-4xl font-black uppercase italic tracking-tighter leading-none">
                        Request <span style={{ color: themeColor }}>Marriage Certificate</span>
                    </h1>

                    <p className="text-slate-600 dark:text-slate-300 font-medium text-xs leading-relaxed max-w-xl italic">
                        Request certified copies of marriage certificates registered in Mapandan. Complete the form and upload required identifications to verify your request.
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
            <div className="grid grid-cols-4 gap-1.5 md:gap-4 relative px-1 md:px-2 py-2">
                {STEPS.map((step, idx) => {
                    const isActive = currentStep === step.id;
                    const stepIdx = STEPS.findIndex(s => s.id === currentStep);
                    const isCompleted = stepIdx > idx;
                    const Icon = step.icon;

                    return (
                        <div
                            key={idx}
                            className="flex flex-col items-center gap-1 md:gap-2 relative z-10 font-black group cursor-pointer"
                            onClick={() => {
                                if (step.id === "STATUS") {
                                    router.push("/user/services/civil-registry");
                                    return;
                                }
                                const targetIdx = STEPS.findIndex(s => s.id === step.id);
                                const currentIdx = STEPS.findIndex(s => s.id === currentStep);

                                if (targetIdx <= currentIdx) {
                                    // Going back — always allowed
                                    setShowErrors(false);
                                    setCurrentStep(step.id);
                                    setTimeout(() => {
                                        const card = document.querySelector("[data-step-card]");
                                        if (card) card.scrollIntoView({ behavior: "smooth", block: "start" });
                                    }, 50);
                                } else {
                                    // Going forward — validate each step in between
                                    for (let i = currentIdx; i < targetIdx; i++) {
                                        const stepToValidate = STEPS[i].id;
                                        if (!validateStep(stepToValidate)) {
                                            return; // Stop at first failing step
                                        }
                                    }
                                    setShowErrors(false);
                                    setCurrentStep(step.id);
                                    setTimeout(() => {
                                        const card = document.querySelector("[data-step-card]");
                                        if (card) card.scrollIntoView({ behavior: "smooth", block: "start" });
                                    }, 50);
                                }
                            }}
                        >
                            <div
                                className={cn(
                                    "w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center transition-all duration-500 border-2",
                                    isActive ? "text-white border-primary shadow-[0_0_20px_rgba(var(--primary),0.3)] scale-105 md:scale-110" :
                                        isCompleted ? "border-transparent" :
                                            "bg-slate-100 dark:bg-white/5 text-slate-400 border-transparent group-hover:border-slate-500/30"
                                )}
                                style={
                                    isActive
                                        ? { backgroundColor: themeColor, borderColor: themeColor }
                                        : isCompleted
                                            ? { backgroundColor: themeColor + "1a", color: themeColor, borderColor: themeColor + "33" }
                                            : {}
                                }
                            >
                                <Icon className="w-4 h-4 md:w-6 md:h-6" />
                            </div>
                            <span
                                className={cn(
                                    "text-[7px] md:text-[10px] uppercase tracking-widest text-center italic hidden sm:block",
                                    (isActive || isCompleted) ? "opacity-100 font-black" : "opacity-40 group-hover:opacity-100 transition-opacity text-slate-400"
                                )}
                                style={
                                    (isActive || isCompleted)
                                        ? { color: themeColor }
                                        : {}
                                }
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
                                className="h-full"
                                style={{ backgroundColor: themeColor }}
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
            <Card data-step-card className="p-8 rounded-[2.5rem] border-slate-200/50 dark:border-white/5 bg-white dark:bg-[#0f1117] shadow-xl dark:shadow-2xl min-h-[400px]">
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
                                <h2 className="text-xl md:text-2xl font-black italic uppercase tracking-tighter leading-tight">Requester <span style={{ color: themeColor }}>Identity</span></h2>
                                <p className="text-[10px] md:text-xs text-slate-500 font-medium italic">Verify your details before making the marriage record request.</p>
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
                                {/* Relationship to Owner — at the top */}
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                                    <div className="col-span-1 md:col-span-2 space-y-1.5">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Relationship to Document Owners <span className="text-red-500">*</span></Label>
                                        <Select
                                            value={form.relationship}
                                            onValueChange={(value) => setForm({ ...form, relationship: value })}
                                        >
                                            <SelectTrigger 
                                                className={cn(
                                                    "h-10 rounded-xl border-slate-200 focus:ring-rose-500 shadow-sm text-xs md:text-sm bg-white dark:bg-slate-900 transition-all font-bold uppercase",
                                                    (showErrors && !form.relationship) && "border-2 border-red-500"
                                                )}
                                            >
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

                                {/* Name Fields */}
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">First Name</Label>
                                        <Input
                                            value={resident?.firstName?.toUpperCase() || ""}
                                            readOnly
                                            className="h-10 rounded-xl uppercase font-bold text-xs md:text-sm bg-slate-100 dark:bg-slate-800 text-slate-500"
                                            placeholder="First name"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Middle Name</Label>
                                        <Input
                                            value={resident?.middleName?.toUpperCase() || ""}
                                            readOnly
                                            className="h-10 rounded-xl uppercase font-bold text-xs md:text-sm bg-slate-100 dark:bg-slate-800 text-slate-500"
                                            placeholder="Middle name"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Last Name</Label>
                                        <Input
                                            value={resident?.lastName?.toUpperCase() || ""}
                                            readOnly
                                            className="h-10 rounded-xl uppercase font-bold text-xs md:text-sm bg-slate-100 dark:bg-slate-800 text-slate-500"
                                            placeholder="Last name"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Suffix</Label>
                                        <Input
                                            value={resident?.suffix?.toUpperCase() || ""}
                                            readOnly
                                            className="h-10 rounded-xl uppercase font-bold text-xs md:text-sm bg-slate-100 dark:bg-slate-800 text-slate-500"
                                            placeholder="Suffix"
                                        />
                                    </div>
                                </div>

                                {/* Personal Details */}
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Birth Date</Label>
                                        <Input
                                            value={resident?.dateOfBirth ? new Date(resident.dateOfBirth).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : ""}
                                            readOnly
                                            className="h-10 rounded-xl uppercase font-bold text-xs md:text-sm bg-slate-100 dark:bg-slate-800 text-slate-500"
                                            placeholder="MM/DD/YYYY"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Age</Label>
                                        <Input
                                            value={resident?.age != null ? String(resident.age) : ""}
                                            readOnly
                                            className="h-10 rounded-xl uppercase font-bold text-xs md:text-sm bg-slate-100 dark:bg-slate-800 text-slate-500"
                                            placeholder="Age"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Civil Status</Label>
                                        <Input
                                            value={(resident?.civilStatus || "").toUpperCase()}
                                            readOnly
                                            className="h-10 rounded-xl uppercase font-bold text-xs md:text-sm bg-slate-100 dark:bg-slate-800 text-slate-500"
                                            placeholder="Civil Status"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Citizenship</Label>
                                        <Input
                                            value={resident?.citizenship || "FILIPINO"}
                                            readOnly
                                            className="h-10 rounded-xl uppercase font-bold text-xs md:text-sm bg-slate-100 dark:bg-slate-800 text-slate-500"
                                            placeholder="Citizenship"
                                        />
                                    </div>
                                </div>

                                {/* Occupation & Contact */}
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div className="col-span-1 md:col-span-2 space-y-1.5">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Occupation</Label>
                                        <Input
                                            value={(resident?.occupation || "N/A").toUpperCase()}
                                            readOnly
                                            className="h-10 rounded-xl uppercase font-bold text-xs md:text-sm bg-slate-100 dark:bg-slate-800 text-slate-500"
                                            placeholder="Occupation"
                                        />
                                    </div>
                                    <div className="col-span-1 md:col-span-2 space-y-1.5">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Contact Number <span className="text-red-500">*</span></Label>
                                        <Input
                                            value={form.contactNumber}
                                            onChange={(e) => setForm(p => ({ ...p, contactNumber: e.target.value.replace(/[^0-9]/g, '') }))}
                                            className={cn("h-10 rounded-xl text-xs md:text-sm font-bold", (showErrors && !form.contactNumber) && "border-2 border-red-500")}
                                            placeholder="e.g. 09123456789"
                                            maxLength={11}
                                        />
                                        <p className="text-[9px] font-black text-amber-500 uppercase tracking-wider ml-1 animate-pulse">
                                            * Note: Please use your active contact number.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-500/5 border border-slate-500/10 p-4 rounded-3xl flex items-center gap-3">
                                <Sparkles className="w-4 h-4 shrink-0" style={{ color: themeColor }} />
                                <p className="text-[10px] font-black italic leading-tight uppercase tracking-widest" style={{ color: themeColor }}>
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
                                        const missing = [];
                                        if (!form.relationship) missing.push("Relationship");
                                        if (!form.contactNumber) missing.push("Contact Number");

                                        if (missing.length > 0) {
                                            setShowErrors(true);
                                            toast.error(`Please fill in all required fields: ${missing.join(", ")}`);
                                            return;
                                        }
                                        setShowErrors(false);
                                        setCurrentStep("DETAILS");
                                    }}
                                    className="rounded-full px-12 text-white font-black uppercase tracking-widest italic text-[10px] h-12 shadow-xl transition-all duration-300"
                                    style={{ backgroundColor: themeColor, boxShadow: `0 10px 20px ${themeColor}33` }}
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

                            <div className="space-y-6">
                                {/* Husband Details */}
                                <div className="space-y-3">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Husband&apos;s Full Name <span className="text-red-500">*</span></Label>
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                        <div className="md:col-span-2 space-y-2">
                                            <Label className="text-[9px] font-black uppercase text-slate-500 italic">First Name</Label>
                                            <Input
                                                className={cn("rounded-xl h-10 transition-all uppercase font-medium", (showErrors && !form.certFirstName) && "border-2 border-red-500")}
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
                                                className={cn("rounded-xl h-10 transition-all uppercase font-medium", (showErrors && !form.certLastName) && "border-2 border-red-500")}
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
                                            (showErrors && !form.spouseName) && "border-2 border-red-500"
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
                                                className={cn("rounded-xl h-10 transition-all", (showErrors && !form.dateOfEvent) && "border-2 border-red-500")}
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
                                                        className={cn("rounded-xl h-10 transition-all uppercase font-bold", (showErrors && !customCountry.trim()) && "border-2 border-red-500")}
                                                        placeholder="e.g. UNITED STATES"
                                                        value={customCountry}
                                                        onChange={(e) => setCustomCountry(e.target.value.toUpperCase())}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">Specify State / Province <span className="text-red-500">*</span></Label>
                                                    <Input
                                                        className={cn("rounded-xl h-10 transition-all uppercase font-bold", (showErrors && !customProvince.trim()) && "border-2 border-red-500")}
                                                        placeholder="e.g. CALIFORNIA"
                                                        value={customProvince}
                                                        onChange={(e) => setCustomProvince(e.target.value.toUpperCase())}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">Specify City / Town <span className="text-red-500">*</span></Label>
                                                    <Input
                                                        className={cn("rounded-xl h-10 transition-all uppercase font-bold", (showErrors && !customCity.trim()) && "border-2 border-red-500")}
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
                                                        className={cn("rounded-xl h-10 transition-all uppercase font-bold", (showErrors && !customProvince.trim()) && "border-2 border-red-500")}
                                                        placeholder="e.g. CEBU"
                                                        value={customProvince}
                                                        onChange={(e) => setCustomProvince(e.target.value.toUpperCase())}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">Specify City / Municipality <span className="text-red-500">*</span></Label>
                                                    <Input
                                                        className={cn("rounded-xl h-10 transition-all uppercase font-bold", (showErrors && !customCity.trim()) && "border-2 border-red-500")}
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
                                                    className={cn("rounded-xl h-10 transition-all uppercase font-bold", (showErrors && !customCity.trim()) && "border-2 border-red-500")}
                                                    placeholder="e.g. SAN JACINTO"
                                                    value={customCity}
                                                    onChange={(e) => setCustomCity(e.target.value.toUpperCase())}
                                                />
                                            </div>
                                        )}
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
                                    className="rounded-full px-12 text-white font-black uppercase tracking-widest italic text-[10px] h-12 shadow-xl transition-all duration-300"
                                    style={{ backgroundColor: themeColor, boxShadow: `0 10px 20px ${themeColor}33` }}
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
                            <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-6 pb-6">
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
                                    <div className="space-y-1">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 italic">Citizenship</span>
                                        <p className="font-black text-slate-900 dark:text-white italic uppercase">{resident?.citizenship || "FILIPINO"}</p>
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
                                            <Label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Select ID Type <span className="text-red-500">*</span></Label>
                                            <Select
                                                value={form.idTypeOverride || resident?.idType || ""}
                                                onValueChange={(value) => setForm(prev => ({
                                                    ...prev,
                                                    idTypeOverride: value
                                                }))}
                                            >
                                                <SelectTrigger className="h-10 rounded-xl border-slate-200 focus:ring-rose-500 shadow-sm text-xs md:text-sm bg-white dark:bg-slate-900 transition-all font-bold uppercase">
                                                    <SelectValue placeholder="SELECT GOVERNMENT ID TYPE" />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-xl border-slate-200 dark:border-white/10 font-bold uppercase">
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

                                        {renderIdCard("Valid Government ID (Front)", "validIdFront")}
                                        {renderIdCard("Valid Government ID (Back)", "validIdBack")}
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
                                                ? "bg-rose-500 border-rose-500 text-white"
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
                                            (!form.files["validIdFront"] && !resident?.idFrontUrl && !form.previews["validIdFront"]) ||
                                            (!form.files["validIdBack"] && !resident?.idBackUrl && !form.previews["validIdBack"])
                                        }
                                        className={cn(
                                            "md:col-span-3 h-14 rounded-full font-black uppercase tracking-widest italic text-[11px] transition-all duration-300",
                                            (!form.idTypeOverride && !resident?.idType) || (!form.files["validIdFront"] && !resident?.idFrontUrl && !form.previews["validIdFront"]) || (!form.files["validIdBack"] && !resident?.idBackUrl && !form.previews["validIdBack"])
                                                ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                                                : "bg-rose-600 hover:bg-rose-700 text-white shadow-xl shadow-rose-500/20"
                                        )}
                                    >
                                        {submitting ? (
                                            <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                        ) : (!form.idTypeOverride && !resident?.idType) || (!form.files["validIdFront"] && !resident?.idFrontUrl && !form.previews["validIdFront"]) || (!form.files["validIdBack"] && !resident?.idBackUrl && !form.previews["validIdBack"]) ? (
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


        </div>
    );
}
