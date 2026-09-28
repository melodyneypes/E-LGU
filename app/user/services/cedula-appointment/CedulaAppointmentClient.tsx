"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    CheckCircle2,
    Calculator,
    User,
    ChevronRight,
    Loader2,
    Check,
    Home,
    Sparkles,
    Star,
    Coins,
    Calendar,
    Clock,
    FileText,
    Printer,
    ArrowLeft,
    Upload,
    MapPin,
    Info,
    ShieldCheck,
    Users,
    Building2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
import PrivacyTermsModal from "@/components/shared/PrivacyTermsModal";
import DocumentViewerModal from "@/components/shared/DocumentViewerModal";
import SchedulePicker from "@/components/shared/SchedulePicker";
import { compressImage } from "@/lib/image-compression";
import { calculateCedula, CedulaResult, getCedulaPenaltyRate } from "@/lib/cedula";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { submitCedulaAppointment } from "./actions";
import PrintQueueTicket from "@/components/shared/PrintQueueTicket";
import CedulaReviewsTab from "./components/CedulaReviewsTab";

type Step = "STATUS" | "RESIDENT" | "UPLOAD" | "TAX_DECLARATION" | "DECLARATION" | "SUCCESS";

const STEPS: { id: Step; label: string; icon: any }[] = [
    { id: "STATUS", label: "Status", icon: Sparkles },
    { id: "RESIDENT", label: "Profile", icon: User },
    { id: "UPLOAD", label: "Upload", icon: Upload },
    { id: "TAX_DECLARATION", label: "Tax Declaration", icon: Calculator },
    { id: "DECLARATION", label: "Schedule", icon: Calendar },
];

interface CedulaAppointmentClientProps {
    resident: any;
    cedulaTypes: any[];
    themeColor: string;
    branding: {
        logo?: string | null;
        word1?: string;
        word2?: string;
    };
    config: {
        maxSlots: number;
        maxSlotsAM?: number;
        maxSlotsPM?: number;
        blockedDates: string[];
        activeDays: number[];
    };
    bookedSlots: { appointmentDate: Date; appointmentSlot: string }[];
    hasActiveIndividual: boolean;
    hasActiveJuridical: boolean;
    cedulaSettings?: Record<string, string>;
    feedbacks?: any[];
    feedbackStats?: {
        totalFeedbacks: number;
        averageRating: number;
        csatPercentage: number;
        ratingCounts: Record<string, number>;
    };
    initialPagination?: {
        page: number;
        limit: number;
        totalCount: number;
        hasMore: boolean;
        remainingCount: number;
    };
}

export function CedulaAppointmentClient({
    resident,
    cedulaTypes,
    themeColor,
    branding,
    config,
    bookedSlots,
    hasActiveIndividual,
    hasActiveJuridical,
    cedulaSettings = {},
    feedbacks = [],
    feedbackStats = {
        totalFeedbacks: 0,
        averageRating: 0,
        csatPercentage: 0,
        ratingCounts: { FIVE: 0, FOUR: 0, THREE: 0, TWO: 0, ONE: 0 }
    },
    initialPagination = {
        page: 1,
        limit: 6,
        totalCount: 0,
        hasMore: false,
        remainingCount: 0
    }
}: CedulaAppointmentClientProps) {
    const router = useRouter();
    const [activeMainTab, setActiveMainTab] = useState<"APPOINTMENT" | "REVIEWS">("APPOINTMENT");
    const [currentStep, setCurrentStep] = useState<Step>("STATUS");
    const [submitting, setSubmitting] = useState(false);
    const [applicantType, setApplicantType] = useState<"INDIVIDUAL" | "JURIDICAL">("INDIVIDUAL");
    const [privacyAccepted, setPrivacyAccepted] = useState(false);
    const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
    const [calcResult, setCalcResult] = useState<CedulaResult | null>(null);
    const [newTransactionId] = useState<string | null>(null);
    const [queueNumber] = useState<string | null>(null);
    const [isPriorityLane, _setIsPriorityLane] = useState(false);
    const [printTriggered, setPrintTriggered] = useState(false);

    // Applicant Target Selection ("SELF" vs "RELATIVE")
    const [applicantTarget, setApplicantTarget] = useState<"SELF" | "RELATIVE">("SELF");
    const [relationshipToApplicant, setRelationshipToApplicant] = useState<string>("");

    const MAPANDAN_BARANGAYS = [
        "Amanoaoac", "Apaya", "Aserda", "Baloling", "Coral", "Golden", "Jimenez",
        "Lambayan", "Luyan South", "Nilombot", "Pias", "Poblacion", "Primicias", "Sta. Maria", "Torres"
    ];

    // Form inputs state
    const [formState, setFormState] = useState({
        firstName: resident?.firstName || "",
        lastName: resident?.lastName || "",
        middleName: resident?.middleName || "",
        suffix: resident?.suffix || "",
        gender: resident?.gender || "Male",
        dateOfBirth: resident?.dateOfBirth ? new Date(resident.dateOfBirth).toISOString().split("T")[0] : "",
        placeOfBirth: resident?.placeOfBirth || "",
        civilStatus: resident?.civilStatus || "Single",
        citizenship: resident?.citizenship || "Filipino",
        height: resident?.height || "",
        weight: resident?.weight || "",
        houseNumber: resident?.houseNumber || "",
        street: resident?.street || "",
        barangay: resident?.barangay || "",
        municipality: resident?.municipality || "Mapandan",
        province: resident?.province || "Pangasinan",
        contactNumber: resident?.contactNumber || "",
        email: resident?.email || "",
        // Calculations
        income: "",
        propertyValue: "",
        businessName: "",
        incomeSource: "PROFESSION",
        purpose: ""
    });

    const handleSelectApplicantTarget = (target: "SELF" | "RELATIVE") => {
        if (target === applicantTarget) return;
        setApplicantTarget(target);

        if (target === "SELF") {
            // Restore verified resident profile with official physical cedula details
            setFormState(prev => ({
                ...prev,
                firstName: resident?.firstName || "",
                lastName: resident?.lastName || "",
                middleName: resident?.middleName || "",
                suffix: resident?.suffix || "",
                gender: resident?.gender || "Male",
                dateOfBirth: resident?.dateOfBirth ? new Date(resident.dateOfBirth).toISOString().split("T")[0] : "",
                placeOfBirth: resident?.placeOfBirth || "",
                civilStatus: resident?.civilStatus || "Single",
                citizenship: resident?.citizenship || "Filipino",
                height: resident?.height || "",
                weight: resident?.weight || "",
                houseNumber: resident?.houseNumber || "",
                street: resident?.street || "",
                barangay: resident?.barangay || "",
                municipality: resident?.municipality || "Mapandan",
                province: resident?.province || "Pangasinan",
                contactNumber: resident?.contactNumber || "",
                email: resident?.email || "",
            }));
            setRelationshipToApplicant("");
            setRelativeErrors({});
        } else {
            // Clear inputs for relative credentials entry
            setFormState(prev => ({
                ...prev,
                firstName: "",
                lastName: "",
                middleName: "",
                suffix: "",
                gender: "Male",
                dateOfBirth: "",
                placeOfBirth: "",
                civilStatus: "Single",
                citizenship: "Filipino",
                height: "",
                weight: "",
                houseNumber: "",
                street: "",
                barangay: "",
                municipality: "Mapandan",
                province: "Pangasinan",
                contactNumber: "",
                email: "",
            }));
            setRelationshipToApplicant("");
            setRelativeErrors({});
        }
    };

    useEffect(() => {
        if (applicantType === "JURIDICAL" && (formState.incomeSource === "PROFESSION" || formState.incomeSource === "UNEMPLOYED")) {
            setFormState(prev => ({ ...prev, incomeSource: "BUSINESS" }));
        }
    }, [applicantType, formState.incomeSource]);

    // Appointment Schedule State
    const [selectedDate, setSelectedDate] = useState<string>("");
    const [selectedSlot, setSelectedSlot] = useState<string>("");


    const incomeInputRef = useRef<HTMLInputElement>(null);
    const businessNameInputRef = useRef<HTMLInputElement>(null);

    // Relative required field refs & error state
    const relationshipRef = useRef<HTMLDivElement>(null);
    const firstNameRef = useRef<HTMLInputElement>(null);
    const lastNameRef = useRef<HTMLInputElement>(null);
    const dateOfBirthRef = useRef<HTMLInputElement>(null);
    const placeOfBirthRef = useRef<HTMLInputElement>(null);
    const heightRef = useRef<HTMLInputElement>(null);
    const weightRef = useRef<HTMLInputElement>(null);
    const barangayRef = useRef<HTMLDivElement>(null);

    const [relativeErrors, setRelativeErrors] = useState<{
        relationship?: boolean;
        firstName?: boolean;
        lastName?: boolean;
        dateOfBirth?: boolean;
        placeOfBirth?: boolean;
        height?: boolean;
        weight?: boolean;
        barangay?: boolean;
    }>({});

    // Self missing fields refs & error state (fallback inputs if null in database)
    const selfPlaceOfBirthRef = useRef<HTMLInputElement>(null);
    const selfCitizenshipRef = useRef<HTMLInputElement>(null);
    const selfHeightRef = useRef<HTMLInputElement>(null);
    const selfWeightRef = useRef<HTMLInputElement>(null);

    const [selfFieldErrors, setSelfFieldErrors] = useState<{
        placeOfBirth?: boolean;
        citizenship?: boolean;
        height?: boolean;
        weight?: boolean;
    }>({});

    const [idFile, setIdFile] = useState<File | null>(null);
    const [proofFile, setProofFile] = useState<File | null>(null);
    const [authorizationLetterFile, setAuthorizationLetterFile] = useState<File | null>(null);
    const [secRegistrationFile, setSecRegistrationFile] = useState<File | null>(null);
    const [existingIdUrl] = useState<string | null>(resident?.idFrontUrl || null);
    const [existingProofUrl] = useState<string | null>(null);
    const [showValidationErrors, setShowValidationErrors] = useState(false);
    const [uploadErrors, setUploadErrors] = useState<{
        id?: boolean;
        authorizationLetter?: boolean;
        secRegistration?: boolean;
    }>({});
    const [incomeError, setIncomeError] = useState(false);
    const [businessNameError, setBusinessNameError] = useState(false);

    // Refs for sections (smooth scrolling)
    const idSectionRef = useRef<HTMLDivElement>(null);
    const proofSectionRef = useRef<HTMLDivElement>(null);
    const authorizationSectionRef = useRef<HTMLDivElement>(null);
    const secRegistrationSectionRef = useRef<HTMLDivElement>(null);
    const privacySectionRef = useRef<HTMLDivElement>(null);

    // Document Viewer state
    const [viewerOpen, setViewerOpen] = useState(false);
    const [viewerFile, setViewerFile] = useState<File | null>(null);
    const [viewerUrl, setViewerUrl] = useState<string | null>(null);
    const [viewerTitle, setViewerTitle] = useState("");

    const handleViewFile = (file: File | null, existingUrl: string | null, title?: string) => {
        setViewerFile(file);
        setViewerUrl(existingUrl);
        if (title) {
            setViewerTitle(title);
        } else {
            if (file === proofFile || (existingUrl === existingProofUrl && existingUrl !== null)) {
                setViewerTitle("Proof of Income Document");
            } else if (file === authorizationLetterFile) {
                setViewerTitle("Authorization Letter Document");
            } else if (file === secRegistrationFile) {
                setViewerTitle("SEC Registration / Certificate of Incorporation");
            } else {
                setViewerTitle("Valid Government ID");
            }
        }
        setViewerOpen(true);
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, field: "idFile" | "proofFile" | "authorizationLetterFile" | "secRegistrationFile") => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];

            // 1. Validate file extension and MIME type
            const allowedTypes = [
                "image/jpeg", "image/png", "image/webp",
                "application/pdf"
            ];
            const fileExtension = file.name.split('.').pop()?.toLowerCase() || "";
            const allowedExtensions = ["pdf", "jpg", "jpeg", "png", "webp"];

            if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
                toast.error("Invalid file type! Only standard images (PNG, JPG, WEBP) and PDFs are allowed.");
                e.target.value = ""; // clear file input
                return;
            }

            // 2. Validate magic bytes (headers) on the client-side
            try {
                const headBuffer = new Uint8Array(await file.slice(0, 12).arrayBuffer());
                let hex = "";
                for (let i = 0; i < headBuffer.length; i++) {
                    hex += headBuffer[i].toString(16).padStart(2, "0");
                }
                hex = hex.toUpperCase();

                let isMagicValid = false;
                const mime = file.type.toLowerCase();

                if (hex.startsWith("FFD8FF") && mime === "image/jpeg") {
                    isMagicValid = true;
                } else if (hex.startsWith("89504E470D0A1A0A") && mime === "image/png") {
                    isMagicValid = true;
                } else if (hex.startsWith("25504446") && mime === "application/pdf") {
                    isMagicValid = true;
                } else if (hex.startsWith("52494646") && hex.substring(16, 24) === "57454250" && mime === "image/webp") {
                    isMagicValid = true;
                }

                if (!isMagicValid) {
                    toast.error("Security alert: File header mismatch! The actual file content does not match its extension.");
                    e.target.value = "";
                    return;
                }
            } catch (err) {
                console.error("Client-side file headers verification error:", err);
                toast.error("Failed to verify file security headers.");
                e.target.value = "";
                return;
            }

            const maxBytes = 5 * 1024 * 1024; // 5MB limit
            if (file.size > maxBytes) {
                toast.error(`The file "${file.name}" is too large! Maximum limit is 5MB`);
                e.target.value = ""; // Reset the input element
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

            if (field === "idFile") {
                setIdFile(fileToProcess);
                setUploadErrors(prev => ({ ...prev, id: false }));
            } else if (field === "authorizationLetterFile") {
                setAuthorizationLetterFile(fileToProcess);
                setUploadErrors(prev => ({ ...prev, authorizationLetter: false }));
            } else if (field === "secRegistrationFile") {
                setSecRegistrationFile(fileToProcess);
                setUploadErrors(prev => ({ ...prev, secRegistration: false }));
            } else {
                setProofFile(fileToProcess);
            }
        }
    };

    // Compute active type ID
    const activeType = cedulaTypes.find(t => t.code === (applicantType === "INDIVIDUAL" ? "CEDULA_IND" : "CEDULA_JUR"));

    // Parse requiredDocs
    let docs: string[] = [];
    if (activeType) {
        if (Array.isArray(activeType.requiredDocs)) {
            docs = activeType.requiredDocs as string[];
        } else if (typeof activeType.requiredDocs === "string") {
            try {
                docs = JSON.parse(activeType.requiredDocs);
            } catch {
                docs = [];
            }
        } else if (activeType.requiredDocs && typeof activeType.requiredDocs === "object") {
            try {
                docs = Object.values(activeType.requiredDocs) as string[];
            } catch {
                docs = [];
            }
        }
    }

    // Parse defaultFees
    let fees: { name: string; label?: string; amount: number; code?: string }[] = [];
    if (activeType) {
        if (Array.isArray(activeType.defaultFees)) {
            fees = activeType.defaultFees as any[];
        } else if (typeof activeType.defaultFees === "string") {
            try {
                fees = JSON.parse(activeType.defaultFees);
            } catch {
                fees = [];
            }
        }
    }

    // Real-time tax calculator
    useEffect(() => {
        const baseFee = activeType?.baseFee || (applicantType === "INDIVIDUAL" ? 5 : 500);
        const result = calculateCedula({
            type: applicantType,
            income: parseFloat(formState.income.replace(/,/g, "")) || 0,
            propertyValue: parseFloat(formState.propertyValue.replace(/,/g, "")) || 0,
            baseFee,
            fulfillmentType: "PICK_UP",
            deliveryFee: 0,
            settings: cedulaSettings
        });
        setCalcResult(result);
    }, [formState.income, formState.propertyValue, applicantType, activeType, cedulaSettings]);



    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormState(prev => ({ ...prev, [name]: value }));
        if (relativeErrors[name as keyof typeof relativeErrors]) {
            setRelativeErrors(prev => ({ ...prev, [name]: false }));
        }
        if (selfFieldErrors[name as keyof typeof selfFieldErrors]) {
            setSelfFieldErrors(prev => ({ ...prev, [name]: false }));
        }
    };

    const isStepValid = (stepId: Step) => {
        switch (stepId) {
            case "STATUS":
                if (hasActiveIndividual && applicantType === "INDIVIDUAL") return false;
                if (hasActiveJuridical && applicantType === "JURIDICAL") return false;
                return !!activeType?.id;
            case "RESIDENT":
                if (applicantTarget === "RELATIVE") {
                    return (
                        !!relationshipToApplicant.trim() &&
                        !!formState.firstName.trim() &&
                        !!formState.lastName.trim() &&
                        !!formState.dateOfBirth.trim() &&
                        !!formState.placeOfBirth.trim() &&
                        !!formState.height.trim() &&
                        !!formState.weight.trim() &&
                        !!formState.barangay.trim()
                    );
                } else if (applicantTarget === "SELF") {
                    // Check required physical cedula details (must not be empty)
                    return (
                        !!formState.placeOfBirth.trim() &&
                        !!formState.citizenship.trim() &&
                        !!formState.height.trim() &&
                        !!formState.weight.trim()
                    );
                }
                return true;
            case "UPLOAD": {
                // 1. Valid ID is mandatory for everyone (either newly uploaded or existing from resident profile)
                const hasValidId = !!(idFile || existingIdUrl);
                if (!hasValidId) return false;

                // 2. Relative applicants must provide an Authorization Letter
                if (applicantTarget === "RELATIVE" && !authorizationLetterFile) {
                    return false;
                }

                // 3. Juridical applicants must provide SEC Registration / Certificate of Incorporation
                if (applicantType === "JURIDICAL" && !secRegistrationFile) {
                    return false;
                }

                return true;
            }
            case "TAX_DECLARATION":
                if (formState.incomeSource === "UNEMPLOYED") return true;
                const isIncomeValid = !!formState.income.trim();
                if (applicantType === "JURIDICAL") {
                    return isIncomeValid && !!formState.businessName.trim();
                }
                return isIncomeValid;
            case "DECLARATION":
                return !!selectedDate && !!selectedSlot && privacyAccepted;
            default:
                return true;
        }
    };

    const canNavigate = (targetStep: Step) => {
        const targetIdx = STEPS.findIndex(s => s.id === targetStep);
        const currentIdx = STEPS.findIndex(s => s.id === currentStep);
        if (targetIdx <= currentIdx) return true;

        for (let i = 0; i < targetIdx; i++) {
            if (!isStepValid(STEPS[i].id)) return false;
        }
        return true;
    };

    const handleNext = () => {
        if (!isStepValid(currentStep)) {
            if (currentStep === "STATUS") {
                if (hasActiveIndividual && applicantType === "INDIVIDUAL") {
                    toast.error("You already have an active Individual Cedula request currently in progress.");
                } else if (hasActiveJuridical && applicantType === "JURIDICAL") {
                    toast.error("You already have an active Juridical Cedula request currently in progress.");
                } else {
                    toast.error("Please select your application status.");
                }
            } else if (currentStep === "RESIDENT") {
                if (applicantTarget === "RELATIVE") {
                    if (!relationshipToApplicant.trim()) {
                        setRelativeErrors(prev => ({ ...prev, relationship: true }));
                        relationshipRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                        toast.error("Please select your relationship to the applicant.");
                        return;
                    }
                    if (!formState.firstName.trim()) {
                        setRelativeErrors(prev => ({ ...prev, firstName: true }));
                        firstNameRef.current?.focus();
                        firstNameRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                        toast.error("Please enter the first name of the relative.");
                        return;
                    }
                    if (!formState.lastName.trim()) {
                        setRelativeErrors(prev => ({ ...prev, lastName: true }));
                        lastNameRef.current?.focus();
                        lastNameRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                        toast.error("Please enter the last name of the relative.");
                        return;
                    }
                    if (!formState.dateOfBirth.trim()) {
                        setRelativeErrors(prev => ({ ...prev, dateOfBirth: true }));
                        dateOfBirthRef.current?.focus();
                        dateOfBirthRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                        toast.error("Please enter the birth date of the relative.");
                        return;
                    }
                    if (!formState.placeOfBirth.trim()) {
                        setRelativeErrors(prev => ({ ...prev, placeOfBirth: true }));
                        placeOfBirthRef.current?.focus();
                        placeOfBirthRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                        toast.error("Please enter the place of birth of the relative.");
                        return;
                    }
                    if (!formState.height.trim()) {
                        setRelativeErrors(prev => ({ ...prev, height: true }));
                        heightRef.current?.focus();
                        heightRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                        toast.error("Please enter the height (e.g. 165 cm).");
                        return;
                    }
                    if (!formState.weight.trim()) {
                        setRelativeErrors(prev => ({ ...prev, weight: true }));
                        weightRef.current?.focus();
                        weightRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                        toast.error("Please enter the weight (e.g. 60 kg).");
                        return;
                    }
                    if (!formState.barangay.trim()) {
                        setRelativeErrors(prev => ({ ...prev, barangay: true }));
                        barangayRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                        toast.error("Please select the barangay of residence.");
                        return;
                    }
                } else if (applicantTarget === "SELF") {
                    if (!formState.citizenship.trim()) {
                        setSelfFieldErrors(prev => ({ ...prev, citizenship: true }));
                        selfCitizenshipRef.current?.focus();
                        selfCitizenshipRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                        toast.error("Please enter your Citizenship.");
                        return;
                    }
                    if (!formState.height.trim()) {
                        setSelfFieldErrors(prev => ({ ...prev, height: true }));
                        selfHeightRef.current?.focus();
                        selfHeightRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                        toast.error("Please enter your Height (e.g. 165 cm).");
                        return;
                    }
                    if (!formState.weight.trim()) {
                        setSelfFieldErrors(prev => ({ ...prev, weight: true }));
                        selfWeightRef.current?.focus();
                        selfWeightRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                        toast.error("Please enter your Weight (e.g. 60 kg).");
                        return;
                    }
                    if (!formState.placeOfBirth.trim()) {
                        setSelfFieldErrors(prev => ({ ...prev, placeOfBirth: true }));
                        selfPlaceOfBirthRef.current?.focus();
                        selfPlaceOfBirthRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                        toast.error("Please enter your Place of Birth to complete your Cedula details.");
                        return;
                    }
                }
            } else if (currentStep === "UPLOAD") {
                const hasValidId = !!(idFile || existingIdUrl);
                if (!hasValidId) {
                    setUploadErrors(prev => ({ ...prev, id: true }));
                    idSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                    toast.error("Please upload a Valid Government ID.");
                    return;
                }
                if (applicantTarget === "RELATIVE" && !authorizationLetterFile) {
                    setUploadErrors(prev => ({ ...prev, authorizationLetter: true }));
                    authorizationSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                    toast.error("Please upload the signed Authorization Letter from the applicant.");
                    return;
                }
                if (applicantType === "JURIDICAL" && !secRegistrationFile) {
                    setUploadErrors(prev => ({ ...prev, secRegistration: true }));
                    secRegistrationSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                    toast.error("Please upload the SEC Registration / Certificate of Incorporation.");
                    return;
                }
            } else if (currentStep === "TAX_DECLARATION") {
                if (applicantType === "JURIDICAL" && !formState.businessName.trim()) {
                    toast.error("Please declare your Business Name.");
                } else if (!formState.income.trim()) {
                    setIncomeError(true);
                    incomeInputRef.current?.focus();
                    incomeInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                    toast.error("Please declare your Annual Gross Income to compute the estimated tax.");
                }
            } else if (currentStep === "DECLARATION") {
                if (!selectedDate || !selectedSlot) {
                    toast.error("Please select your appointment date and time session.");
                }
            }
            return;
        }
        const idx = STEPS.findIndex(s => s.id === currentStep);
        if (idx < STEPS.length - 1) {
            setCurrentStep(STEPS[idx + 1].id);
        }
    };

    const handleSubmit = async () => {
        if (!privacyAccepted) {
            setShowValidationErrors(true);
            toast.error("Please accept the Data Privacy and Terms Agreement to submit your application.");
            privacySectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
            return;
        }

        setSubmitting(true);
        try {
            const submitData = new FormData();
            submitData.append("typeId", activeType?.id || "");
            submitData.append("appointmentSlot", selectedSlot);
            submitData.append("appointmentDate", selectedDate);
            submitData.append("residentSnapshot", JSON.stringify({
                firstName: formState.firstName,
                lastName: formState.lastName,
                middleName: formState.middleName,
                suffix: formState.suffix,
                gender: formState.gender,
                dateOfBirth: formState.dateOfBirth,
                placeOfBirth: formState.placeOfBirth,
                civilStatus: formState.civilStatus,
                citizenship: formState.citizenship,
                height: formState.height,
                weight: formState.weight,
                houseNumber: formState.houseNumber,
                street: formState.street,
                barangay: formState.barangay,
                municipality: formState.municipality,
                province: formState.province,
                contactNumber: formState.contactNumber,
                email: formState.email
            }));
            submitData.append("additionalData", JSON.stringify({
                applicantType: applicantType,
                applicantTarget: applicantTarget,
                relationshipToApplicant: applicantTarget === "RELATIVE" ? relationshipToApplicant : "SELF",
                placeOfBirth: formState.placeOfBirth,
                height: formState.height,
                weight: formState.weight,
                income: parseFloat(formState.income.replace(/,/g, "")) || 0,
                propertyValue: parseFloat(formState.propertyValue.replace(/,/g, "")) || 0,
                businessName: formState.businessName,
                incomeSource: formState.incomeSource,
                purpose: "Community Tax Certificate Appointment",
                calculatedTax: calcResult,
                isPriorityLane: isPriorityLane // Pass priority state to backend
            }));
            if (idFile) submitData.append("idFile", idFile);
            if (proofFile) submitData.append("proofFile", proofFile);
            if (authorizationLetterFile) submitData.append("authorizationLetterFile", authorizationLetterFile);
            if (secRegistrationFile) submitData.append("secRegistrationFile", secRegistrationFile);
            if (existingIdUrl) submitData.append("existingIdUrl", existingIdUrl);
            if (existingProofUrl) submitData.append("existingProofUrl", existingProofUrl);

            const response = await submitCedulaAppointment(submitData);
            if (response.success && response.data) {
                toast.success("Appointment booked successfully!");
                router.push(`/user/appointment/${response.data.id}`);
            } else {
                toast.error(response.error || "Failed to book appointment.");
            }
        } catch {
            toast.error("An error occurred during submission.");
        } finally {
            setSubmitting(false);
        }
    };


    const printSlip = () => {
        setPrintTriggered(true);
    };



    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-0 pb-0 space-y-12">
            <PrivacyTermsModal
                isOpen={isPrivacyModalOpen}
                onClose={() => setIsPrivacyModalOpen(false)}
                onAccept={() => {
                    setPrivacyAccepted(true);
                    setIsPrivacyModalOpen(false);
                }}
                themeColor={themeColor}
            />

            <DocumentViewerModal
                isOpen={viewerOpen}
                onClose={() => setViewerOpen(false)}
                file={viewerFile}
                fileUrl={viewerUrl}
                title={viewerTitle}
            />

            {/* Header / Breadcrumb */}
            <div className="space-y-4 md:space-y-10 print:hidden">
                <div className="sticky top-[64px] sm:top-[80px] z-40 md:static -mx-4 md:mx-0 px-4 md:px-0 pt-2 md:pt-0">
                    <Breadcrumb>
                        <BreadcrumbList className="flex-nowrap whitespace-nowrap overflow-x-auto scrollbar-none max-w-full bg-white/80 dark:bg-white/5 backdrop-blur-md px-4 md:px-6 py-2 md:py-2.5 rounded-xl md:rounded-2xl border border-slate-200 dark:border-white/10 w-fit shadow-sm">
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
                                <BreadcrumbPage className="text-[10px] font-black uppercase tracking-widest italic" style={{ color: "var(--primary-theme)" }}>Cedula Appointment</BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                </div>

                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6 px-1 md:px-0">
                    <div className="space-y-1 md:space-y-2">
                        <h1 className="text-2xl md:text-4xl font-bold text-slate-900 dark:text-white uppercase italic tracking-tighter leading-tight select-none">
                            Cedula <span className="text-primary underline decoration-[4px] md:decoration-[6px] decoration-primary/20 underline-offset-[4px] md:underline-offset-[8px]">Appointment</span>
                        </h1>
                        <p className="text-[9px] md:text-[11px] font-bold text-slate-400 uppercase tracking-[0.4em] ml-1 md:ml-2 italic">LGU Digital Governance Portal</p>
                    </div>

                    {/* Top Tab Switcher: Appointment Wizard vs Citizen Reviews */}
                    <div className="flex items-center gap-1 p-1 rounded-xl md:rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 w-full sm:w-auto overflow-x-auto no-scrollbar shrink-0">
                        <button
                            type="button"
                            onClick={() => setActiveMainTab("APPOINTMENT")}
                            className={cn(
                                "flex-1 sm:flex-none flex items-center justify-center gap-1.5 md:gap-2 px-3 md:px-5 py-2 md:py-2.5 rounded-lg md:rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer whitespace-nowrap",
                                activeMainTab === "APPOINTMENT"
                                    ? "bg-white dark:bg-[#121622] text-slate-900 dark:text-white shadow-sm border border-slate-200/80 dark:border-white/10"
                                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                            )}
                            style={activeMainTab === "APPOINTMENT" ? { borderColor: `${themeColor}40` } : undefined}
                        >
                            <Calendar className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary shrink-0" />
                            <span>Book Appointment</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveMainTab("REVIEWS")}
                            className={cn(
                                "flex-1 sm:flex-none flex items-center justify-center gap-1.5 md:gap-2 px-3 md:px-5 py-2 md:py-2.5 rounded-lg md:rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer whitespace-nowrap",
                                activeMainTab === "REVIEWS"
                                    ? "bg-white dark:bg-[#121622] text-slate-900 dark:text-white shadow-sm border border-slate-200/80 dark:border-white/10"
                                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                            )}
                            style={activeMainTab === "REVIEWS" ? { borderColor: `${themeColor}40` } : undefined}
                        >
                            <Star className="w-3.5 h-3.5 md:w-4 md:h-4 text-amber-400 fill-amber-400 shrink-0" />
                            <span>Reviews</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* If Reviews Tab is Active */}
            {activeMainTab === "REVIEWS" ? (
                <CedulaReviewsTab
                    feedbacks={feedbacks}
                    stats={feedbackStats}
                    themeColor={themeColor}
                    initialPagination={initialPagination}
                />
            ) : (
                <>
                    {/* Progress Stepper */}
                    {currentStep !== "SUCCESS" && (
                        <div className="grid grid-cols-5 gap-1.5 md:gap-4 relative px-1 md:px-2 print:hidden">
                            {STEPS.map((step, idx) => {
                                const isActive = currentStep === step.id;
                                const isCompleted = STEPS.findIndex(s => s.id === currentStep) > idx;
                                const Icon = step.icon;
                                return (
                                    <div
                                        key={idx}
                                        onClick={() => {
                                            if (canNavigate(step.id)) {
                                                setCurrentStep(step.id);
                                            } else {
                                                if (currentStep === "DECLARATION") {
                                                    toast.error("Please complete the declaration and schedule first.");
                                                } else {
                                                    toast.error("Please complete the current phase first.");
                                                }
                                            }
                                        }}
                                        className={cn(
                                            "flex flex-col items-center gap-2 md:gap-3 relative z-10 font-black cursor-pointer group",
                                            isActive ? "opacity-100" : isCompleted ? "opacity-80" : "opacity-40"
                                        )}
                                    >
                                        <div
                                            className={cn(
                                                "w-8 h-8 md:w-16 md:h-16 rounded-xl md:rounded-[1.5rem] flex items-center justify-center transition-all duration-300 shadow-md",
                                                isActive
                                                    ? "text-white scale-105 shadow-primary/30"
                                                    : isCompleted
                                                        ? "bg-emerald-500 text-white"
                                                        : "bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-400 group-hover:border-primary/50"
                                            )}
                                            style={isActive ? { backgroundColor: themeColor } : undefined}
                                        >
                                            <Icon className="w-4 h-4 md:w-7 md:h-7" />
                                        </div>
                                        <span className={cn(
                                            "text-[7px] md:text-[10px] uppercase tracking-widest text-center italic hidden sm:block",
                                            isActive ? "text-primary opacity-100 font-black" : "opacity-40 group-hover:opacity-100 transition-opacity"
                                        )}>
                                            {step.label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Main Form container */}
                    <div className="mt-4 md:mt-8 md:bg-white md:dark:bg-[#11131a] md:rounded-[2.5rem] md:border md:border-slate-200 md:dark:border-white/10 p-0 md:p-12 md:shadow-2xl relative md:overflow-hidden group/container min-h-[400px] md:min-h-[500px] flex flex-col print:border-none print:shadow-none print:bg-white print:text-black">
                        <div className="flex-1">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={currentStep}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.4 }}
                                >
                            {currentStep === "STATUS" && (
                                <div className="space-y-8 md:space-y-12">
                                    <div className="space-y-3 md:space-y-4 text-center">
                                        <h2 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter leading-tight select-none">
                                            Choose Application <span className="text-primary italic">Pathway</span>
                                        </h2>
                                        <p className="text-slate-500 dark:text-slate-400 font-medium italic text-xs md:text-sm uppercase tracking-widest max-w-2xl mx-auto select-none">
                                            Select your current community tax status to proceed.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 max-w-3xl mx-auto">
                                        {[
                                            {
                                                id: "INDIVIDUAL",
                                                icon: User,
                                                label: cedulaTypes.find(t => t.code === "CEDULA_IND")?.name || "Individual Cedula",
                                                desc: "Tax certificate for private citizens, employees, professionals, and self-employed individuals."
                                            },
                                            {
                                                id: "JURIDICAL",
                                                icon: Sparkles,
                                                label: cedulaTypes.find(t => t.code === "CEDULA_JUR")?.name || "Corporate / Juridical",
                                                desc: "Tax certificate for registered corporations, partnerships, and business organizations."
                                            }
                                        ].map(opt => {
                                            const isSelected = applicantType === opt.id;
                                            const Icon = opt.icon;
                                            return (
                                                <button
                                                    key={opt.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setApplicantType(opt.id as any);
                                                        if (opt.id === "JURIDICAL") {
                                                            setFormState(p => ({ ...p, incomeSource: "BUSINESS" }));
                                                        } else {
                                                            setFormState(p => ({ ...p, incomeSource: "PROFESSION" }));
                                                        }
                                                    }}
                                                    className={cn(
                                                        "p-6 md:p-8 rounded-[2rem] border-2 text-left relative group select-none overflow-hidden transition-all duration-300 min-h-[180px] md:min-h-[260px] flex flex-col justify-between cursor-pointer",
                                                        isSelected
                                                            ? "border-primary bg-primary/[0.04] dark:bg-primary/[0.08] shadow-[0_8px_30px_rgba(var(--primary),0.06)] scale-[1.02]"
                                                            : "border-slate-200 dark:border-white/10 bg-white/40 dark:bg-white/5 backdrop-blur-sm hover:border-primary/30"
                                                    )}
                                                >
                                                    <div className="flex items-center justify-between w-full">
                                                        <div className={cn(
                                                            "w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center transition-all duration-300",
                                                            isSelected ? "bg-primary/20 text-primary" : "bg-primary/10 text-primary"
                                                        )}>
                                                            <Icon className="w-4 h-4 md:w-5 md:h-5 stroke-[2.5]" />
                                                        </div>
                                                        {isSelected && (
                                                            <div className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-primary flex items-center justify-center shadow-md animate-in zoom-in-50 duration-300">
                                                                <Check className="w-3 h-3 md:w-3.5 md:h-3.5 text-white stroke-[3]" />
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="space-y-2 mt-4 md:mt-8">
                                                        <h4 className={cn(
                                                            "text-base md:text-xl font-black uppercase italic tracking-wider leading-tight",
                                                            isSelected ? "text-slate-900 dark:text-white" : "text-slate-800 dark:text-slate-200"
                                                        )}>
                                                            {opt.label.toUpperCase()}
                                                        </h4>
                                                        <p className={cn(
                                                            "text-[9px] md:text-[10px] font-bold uppercase tracking-wider leading-relaxed",
                                                            isSelected ? "text-slate-500 dark:text-slate-400" : "text-slate-400 dark:text-slate-500"
                                                        )}>
                                                            {opt.desc.toUpperCase()}
                                                        </p>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {currentStep === "RESIDENT" && (
                                <div className="space-y-6 md:space-y-8 animate-in fade-in duration-300">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/5 pb-4">
                                        <div className="space-y-1 text-center sm:text-left">
                                            <h2 className="text-xl md:text-3xl font-black italic uppercase tracking-tighter leading-tight">
                                                Resident <span className="text-primary italic">Profile & Identity</span>
                                            </h2>
                                            <p className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 font-medium italic">
                                                Specify if you are applying for yourself or requesting on behalf of a relative or family member.
                                            </p>
                                        </div>

                                        <div className="flex items-center justify-center sm:justify-end gap-2">
                                            {applicantTarget === "SELF" ? (
                                                <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-black uppercase tracking-wider py-1 px-3 flex items-center gap-1.5 shadow-sm">
                                                    <ShieldCheck className="w-3.5 h-3.5" />
                                                    Verified Citizen Record
                                                </Badge>
                                            ) : (
                                                <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-[10px] font-black uppercase tracking-wider py-1 px-3 flex items-center gap-1.5 shadow-sm">
                                                    <Users className="w-3.5 h-3.5" />
                                                    Representative Application
                                                </Badge>
                                            )}
                                        </div>
                                    </div>

                                    {/* Pathway Selector: For Myself vs For a Relative */}
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                            Who is this Cedula for? <span className="text-destructive">*</span>
                                        </Label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                                            <button
                                                type="button"
                                                onClick={() => handleSelectApplicantTarget("SELF")}
                                                className={cn(
                                                    "p-4 md:p-5 rounded-2xl border text-left transition-all relative flex items-start gap-3.5 group",
                                                    applicantTarget === "SELF"
                                                        ? "bg-primary/[0.04] border-primary shadow-sm ring-1 ring-primary/20"
                                                        : "bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20"
                                                )}
                                            >
                                                <div className={cn(
                                                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                                                    applicantTarget === "SELF" ? "bg-primary text-white shadow-md shadow-primary/25" : "bg-slate-200/70 dark:bg-white/10 text-slate-500"
                                                )}>
                                                    <User className="w-5 h-5" />
                                                </div>
                                                <div className="space-y-1 min-w-0 flex-1">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs md:text-sm font-black uppercase tracking-tight text-slate-800 dark:text-slate-100">
                                                            For Myself
                                                        </span>
                                                        {applicantTarget === "SELF" && (
                                                            <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-white">
                                                                <Check className="w-3 h-3 stroke-[3]" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <p className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                                                        Use your own verified municipal account records and personal data.
                                                    </p>
                                                </div>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => handleSelectApplicantTarget("RELATIVE")}
                                                className={cn(
                                                    "p-4 md:p-5 rounded-2xl border text-left transition-all relative flex items-start gap-3.5 group",
                                                    applicantTarget === "RELATIVE"
                                                        ? "bg-primary/[0.04] border-primary shadow-sm ring-1 ring-primary/20"
                                                        : "bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20"
                                                )}
                                            >
                                                <div className={cn(
                                                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                                                    applicantTarget === "RELATIVE" ? "bg-primary text-white shadow-md shadow-primary/25" : "bg-slate-200/70 dark:bg-white/10 text-slate-500"
                                                )}>
                                                    <Users className="w-5 h-5" />
                                                </div>
                                                <div className="space-y-1 min-w-0 flex-1">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs md:text-sm font-black uppercase tracking-tight text-slate-800 dark:text-slate-100">
                                                            For a Relative / Someone Else
                                                        </span>
                                                        {applicantTarget === "RELATIVE" && (
                                                            <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-white">
                                                                <Check className="w-3 h-3 stroke-[3]" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <p className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                                                        Input credentials for your parent, spouse, child, sibling, or representative.
                                                    </p>
                                                </div>
                                            </button>
                                        </div>
                                    </div>

                                    {/* SELF MODE: Verified Read-Only Profile View */}
                                    {applicantTarget === "SELF" && (
                                        <div className="space-y-6 animate-in fade-in duration-300">
                                            {/* Personal Identity Grid */}
                                            <div className="space-y-3">
                                                <div className="flex items-center gap-2">
                                                    <User className="w-3.5 h-3.5 text-primary" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Personal Identity (Cedula Record)</span>
                                                </div>

                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                                                    <div className="p-3.5 md:p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 space-y-1">
                                                        <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">First Name</Label>
                                                        <p className="text-xs md:text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                                                            {formState.firstName || "—"}
                                                        </p>
                                                    </div>
                                                    <div className="p-3.5 md:p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 space-y-1">
                                                        <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Middle Name</Label>
                                                        <p className="text-xs md:text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                                                            {formState.middleName || "—"}
                                                        </p>
                                                    </div>
                                                    <div className="p-3.5 md:p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 space-y-1">
                                                        <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Last Name</Label>
                                                        <p className="text-xs md:text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                                                            {formState.lastName || "—"}
                                                        </p>
                                                    </div>
                                                    <div className="p-3.5 md:p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 space-y-1">
                                                        <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Suffix</Label>
                                                        <p className="text-xs md:text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                                                            {formState.suffix || "None"}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 pt-1">
                                                    <div className="p-3.5 md:p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 space-y-1">
                                                        <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Date of Birth</Label>
                                                        <p className="text-xs md:text-sm font-bold text-slate-800 dark:text-slate-200">
                                                            {formState.dateOfBirth ? new Date(formState.dateOfBirth).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                                                        </p>
                                                    </div>
                                                    <div className="p-3.5 md:p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 space-y-1">
                                                        <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Gender</Label>
                                                        <p className="text-xs md:text-sm font-bold text-slate-800 dark:text-slate-200">
                                                            {formState.gender || "—"}
                                                        </p>
                                                    </div>
                                                    <div className="p-3.5 md:p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 space-y-1">
                                                        <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Civil Status</Label>
                                                        <p className="text-xs md:text-sm font-bold text-slate-800 dark:text-slate-200">
                                                            {formState.civilStatus || "Single"}
                                                        </p>
                                                    </div>
                                                    {!resident?.citizenship ? (
                                                        <div
                                                            className={cn(
                                                                "p-3.5 md:p-4 rounded-2xl bg-white dark:bg-white/[0.03] border transition-all space-y-1",
                                                                selfFieldErrors.citizenship
                                                                    ? "border-destructive ring-2 ring-destructive/20 bg-destructive/[0.02]"
                                                                    : "border-slate-200/80 dark:border-white/10"
                                                            )}
                                                        >
                                                            <div className="flex items-center justify-between">
                                                                <Label className={cn("text-[9px] font-black uppercase tracking-widest", selfFieldErrors.citizenship ? "text-destructive" : "text-slate-400")}>
                                                                    Citizenship <span className="text-destructive">*</span>
                                                                </Label>
                                                            </div>
                                                            <Input
                                                                ref={selfCitizenshipRef}
                                                                name="citizenship"
                                                                value={formState.citizenship}
                                                                onChange={handleInputChange}
                                                                placeholder="Citizenship"
                                                                className={cn(
                                                                    "h-8 text-xs font-medium rounded-lg transition-all",
                                                                    selfFieldErrors.citizenship && "border-destructive ring-2 ring-destructive/30"
                                                                )}
                                                            />
                                                        </div>
                                                    ) : (
                                                        <div className="p-3.5 md:p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 space-y-1">
                                                            <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Citizenship</Label>
                                                            <p className="text-xs md:text-sm font-bold text-slate-800 dark:text-slate-200">
                                                                {formState.citizenship || "Filipino"}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 pt-1">
                                                    {!resident?.height ? (
                                                        <div
                                                            className={cn(
                                                                "p-3.5 md:p-4 rounded-2xl bg-white dark:bg-white/[0.03] border transition-all space-y-1",
                                                                selfFieldErrors.height
                                                                    ? "border-destructive ring-2 ring-destructive/20 bg-destructive/[0.02]"
                                                                    : "border-slate-200/80 dark:border-white/10"
                                                            )}
                                                        >
                                                            <div className="flex items-center justify-between">
                                                                <Label className={cn("text-[9px] font-black uppercase tracking-widest", selfFieldErrors.height ? "text-destructive" : "text-slate-400")}>
                                                                    Height <span className="text-destructive">*</span>
                                                                </Label>
                                                                <span className="text-[8px] font-bold text-amber-500 uppercase tracking-wider">Required</span>
                                                            </div>
                                                            <Input
                                                                ref={selfHeightRef}
                                                                name="height"
                                                                value={formState.height}
                                                                onChange={handleInputChange}
                                                                placeholder="e.g. 165 cm / 5'5&quot;"
                                                                className={cn(
                                                                    "h-8 text-xs font-medium rounded-lg transition-all",
                                                                    selfFieldErrors.height && "border-destructive ring-2 ring-destructive/30"
                                                                )}
                                                            />
                                                        </div>
                                                    ) : (
                                                        <div className="p-3.5 md:p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 space-y-1">
                                                            <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Height</Label>
                                                            <p className="text-xs md:text-sm font-bold text-slate-800 dark:text-slate-200">
                                                                {formState.height || "—"}
                                                            </p>
                                                        </div>
                                                    )}

                                                    {!resident?.weight ? (
                                                        <div
                                                            className={cn(
                                                                "p-3.5 md:p-4 rounded-2xl bg-white dark:bg-white/[0.03] border transition-all space-y-1",
                                                                selfFieldErrors.weight
                                                                    ? "border-destructive ring-2 ring-destructive/20 bg-destructive/[0.02]"
                                                                    : "border-slate-200/80 dark:border-white/10"
                                                            )}
                                                        >
                                                            <div className="flex items-center justify-between">
                                                                <Label className={cn("text-[9px] font-black uppercase tracking-widest", selfFieldErrors.weight ? "text-destructive" : "text-slate-400")}>
                                                                    Weight <span className="text-destructive">*</span>
                                                                </Label>
                                                                <span className="text-[8px] font-bold text-amber-500 uppercase tracking-wider">Required</span>
                                                            </div>
                                                            <Input
                                                                ref={selfWeightRef}
                                                                name="weight"
                                                                value={formState.weight}
                                                                onChange={handleInputChange}
                                                                placeholder="e.g. 60 kg / 132 lbs"
                                                                className={cn(
                                                                    "h-8 text-xs font-medium rounded-lg transition-all",
                                                                    selfFieldErrors.weight && "border-destructive ring-2 ring-destructive/30"
                                                                )}
                                                            />
                                                        </div>
                                                    ) : (
                                                        <div className="p-3.5 md:p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 space-y-1">
                                                            <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Weight</Label>
                                                            <p className="text-xs md:text-sm font-bold text-slate-800 dark:text-slate-200">
                                                                {formState.weight || "—"}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Residence Address Card (Single Line) */}
                                            <div className="p-4 md:p-5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 space-y-1.5">
                                                <div className="flex items-center gap-2">
                                                    <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Residential Address</span>
                                                </div>
                                                <p className="text-xs md:text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                                                    {[
                                                        [formState.houseNumber, formState.street].filter(Boolean).join(" "),
                                                        formState.barangay ? `Brgy. ${formState.barangay}` : null,
                                                        formState.municipality || "Mapandan",
                                                        formState.province || "Pangasinan"
                                                    ].filter(Boolean).join(", ") || "No residential address on record"}
                                                </p>
                                            </div>

                                            {/* Place of Birth Card (Single Line, Below Residential Address) */}
                                            {!resident?.placeOfBirth ? (
                                                <div
                                                    className={cn(
                                                        "p-4 md:p-5 rounded-2xl bg-white dark:bg-white/[0.03] border transition-all space-y-2",
                                                        selfFieldErrors.placeOfBirth
                                                            ? "border-destructive ring-2 ring-destructive/20 bg-destructive/[0.02]"
                                                            : "border-slate-200/80 dark:border-white/10"
                                                    )}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <MapPin className={cn("w-3.5 h-3.5 shrink-0", selfFieldErrors.placeOfBirth ? "text-destructive" : "text-primary")} />
                                                            <span className={cn("text-[10px] font-black uppercase tracking-widest", selfFieldErrors.placeOfBirth ? "text-destructive" : "text-slate-400")}>
                                                                Place of Birth <span className="text-destructive">*</span>
                                                            </span>
                                                        </div>
                                                        <span className="text-[9px] font-bold text-amber-500 uppercase tracking-wider">Required for Cedula</span>
                                                    </div>
                                                    <Input
                                                        ref={selfPlaceOfBirthRef}
                                                        name="placeOfBirth"
                                                        value={formState.placeOfBirth}
                                                        onChange={handleInputChange}
                                                        placeholder="Enter your City / Municipality, Province of birth (e.g. Mapandan, Pangasinan)"
                                                        className={cn(
                                                            "h-10 text-xs font-medium rounded-xl transition-all",
                                                            selfFieldErrors.placeOfBirth
                                                                ? "border-destructive ring-2 ring-destructive/30"
                                                                : "border-slate-200 dark:border-white/10 focus:ring-primary/20"
                                                        )}
                                                    />
                                                </div>
                                            ) : (
                                                <div className="p-4 md:p-5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 space-y-1.5">
                                                    <div className="flex items-center gap-2">
                                                        <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Place of Birth</span>
                                                    </div>
                                                    <p className="text-xs md:text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                                                        {formState.placeOfBirth || "—"}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* RELATIVE MODE: Interactive Editable Credentials Form */}
                                    {applicantTarget === "RELATIVE" && (
                                        <div className="space-y-6 animate-in fade-in duration-300">
                                            {/* Relationship to Applicant Section */}
                                            <div
                                                ref={relationshipRef}
                                                className={cn(
                                                    "p-4 md:p-5 rounded-2xl bg-primary/[0.03] border transition-all space-y-3",
                                                    relativeErrors.relationship
                                                        ? "border-destructive ring-2 ring-destructive/20 bg-destructive/[0.02]"
                                                        : "border-primary/20"
                                                )}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <Users className={cn("w-4 h-4", relativeErrors.relationship ? "text-destructive" : "text-primary")} />
                                                    <span className={cn("text-xs font-black uppercase tracking-wider", relativeErrors.relationship ? "text-destructive" : "text-primary")}>
                                                        Relationship with Relative
                                                    </span>
                                                </div>

                                                <div className="space-y-1.5 max-w-md">
                                                    <Label className={cn("text-[10px] font-black uppercase tracking-wider", relativeErrors.relationship ? "text-destructive" : "text-slate-600 dark:text-slate-400")}>
                                                        Relationship to Applicant <span className="text-destructive">*</span>
                                                    </Label>
                                                    <Select
                                                        value={relationshipToApplicant}
                                                        onValueChange={(val) => {
                                                            setRelationshipToApplicant(val);
                                                            if (relativeErrors.relationship) {
                                                                setRelativeErrors(prev => ({ ...prev, relationship: false }));
                                                            }
                                                        }}
                                                    >
                                                        <SelectTrigger className={cn(
                                                            "w-full h-11 px-3.5 rounded-xl bg-white dark:bg-black/40 text-xs font-medium transition-all",
                                                            relativeErrors.relationship
                                                                ? "border-destructive ring-2 ring-destructive/30"
                                                                : "border-slate-200 dark:border-white/10 focus:ring-primary/20"
                                                        )}>
                                                            <SelectValue placeholder="Select Relationship..." />
                                                        </SelectTrigger>
                                                        <SelectContent className="rounded-xl border-slate-200 dark:border-white/10 z-[200]">
                                                            <SelectItem value="Parent">Parent (Mother / Father)</SelectItem>
                                                            <SelectItem value="Spouse">Spouse (Husband / Wife)</SelectItem>
                                                            <SelectItem value="Child">Child (Son / Daughter)</SelectItem>
                                                            <SelectItem value="Sibling">Sibling (Brother / Sister)</SelectItem>
                                                            <SelectItem value="Grandparent">Grandparent</SelectItem>
                                                            <SelectItem value="Other">Other</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>

                                            {/* Relative's Personal Identity */}
                                            <div className="space-y-3">
                                                <div className="flex items-center gap-2">
                                                    <User className="w-3.5 h-3.5 text-primary" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                        Relative&apos;s Personal Information
                                                    </span>
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                                                    <div className="space-y-1.5">
                                                        <Label className={cn("text-[9px] font-black uppercase tracking-widest", relativeErrors.firstName ? "text-destructive font-black" : "text-slate-400")}>
                                                            First Name <span className="text-destructive">*</span>
                                                        </Label>
                                                        <Input
                                                            ref={firstNameRef}
                                                            name="firstName"
                                                            autoComplete="off"
                                                            value={formState.firstName}
                                                            onChange={handleInputChange}
                                                            placeholder="First name"
                                                            className={cn(
                                                                "h-10 text-xs font-medium rounded-xl transition-all",
                                                                relativeErrors.firstName && "border-destructive ring-2 ring-destructive/30"
                                                            )}
                                                        />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Middle Name</Label>
                                                        <Input
                                                            name="middleName"
                                                            autoComplete="off"
                                                            value={formState.middleName}
                                                            onChange={handleInputChange}
                                                            placeholder="Middle name"
                                                            className="h-10 text-xs font-medium rounded-xl"
                                                        />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label className={cn("text-[9px] font-black uppercase tracking-widest", relativeErrors.lastName ? "text-destructive font-black" : "text-slate-400")}>
                                                            Last Name <span className="text-destructive">*</span>
                                                        </Label>
                                                        <Input
                                                            ref={lastNameRef}
                                                            name="lastName"
                                                            autoComplete="off"
                                                            value={formState.lastName}
                                                            onChange={handleInputChange}
                                                            placeholder="Last name"
                                                            className={cn(
                                                                "h-10 text-xs font-medium rounded-xl transition-all",
                                                                relativeErrors.lastName && "border-destructive ring-2 ring-destructive/30"
                                                            )}
                                                        />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Suffix</Label>
                                                        <Input
                                                            name="suffix"
                                                            autoComplete="off"
                                                            value={formState.suffix}
                                                            onChange={handleInputChange}
                                                            placeholder="Jr., Sr., III (optional)"
                                                            className="h-10 text-xs font-medium rounded-xl"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 pt-1">
                                                    <div className="space-y-1.5">
                                                        <Label className={cn("text-[9px] font-black uppercase tracking-widest", relativeErrors.dateOfBirth ? "text-destructive font-black" : "text-slate-400")}>
                                                            Date of Birth <span className="text-destructive">*</span>
                                                        </Label>
                                                        <Input
                                                            ref={dateOfBirthRef}
                                                            type="date"
                                                            name="dateOfBirth"
                                                            value={formState.dateOfBirth}
                                                            onChange={(e) => {
                                                                handleInputChange(e);
                                                                if (relativeErrors.dateOfBirth) {
                                                                    setRelativeErrors(prev => ({ ...prev, dateOfBirth: false }));
                                                                }
                                                            }}
                                                            className={cn(
                                                                "h-10 text-xs font-medium rounded-xl transition-all",
                                                                relativeErrors.dateOfBirth && "border-destructive ring-2 ring-destructive/30"
                                                            )}
                                                        />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Gender</Label>
                                                        <Select
                                                            value={formState.gender || "Male"}
                                                            onValueChange={(val) => setFormState(prev => ({ ...prev, gender: val }))}
                                                        >
                                                            <SelectTrigger className="w-full h-10 px-3 rounded-xl border-slate-200 dark:border-white/10 bg-white dark:bg-black/40 text-xs font-medium focus:ring-primary/20">
                                                                <SelectValue placeholder="Gender" />
                                                            </SelectTrigger>
                                                            <SelectContent className="rounded-xl border-slate-200 dark:border-white/10 z-[200]">
                                                                <SelectItem value="Male">Male</SelectItem>
                                                                <SelectItem value="Female">Female</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Civil Status</Label>
                                                        <Select
                                                            value={formState.civilStatus || "Single"}
                                                            onValueChange={(val) => setFormState(prev => ({ ...prev, civilStatus: val }))}
                                                        >
                                                            <SelectTrigger className="w-full h-10 px-3 rounded-xl border-slate-200 dark:border-white/10 bg-white dark:bg-black/40 text-xs font-medium focus:ring-primary/20">
                                                                <SelectValue placeholder="Civil Status" />
                                                            </SelectTrigger>
                                                            <SelectContent className="rounded-xl border-slate-200 dark:border-white/10 z-[200]">
                                                                <SelectItem value="Single">Single</SelectItem>
                                                                <SelectItem value="Married">Married</SelectItem>
                                                                <SelectItem value="Widowed">Widowed</SelectItem>
                                                                <SelectItem value="Separated">Separated</SelectItem>
                                                                <SelectItem value="Divorced">Divorced</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Citizenship</Label>
                                                        <Input
                                                            name="citizenship"
                                                            value={formState.citizenship}
                                                            onChange={handleInputChange}
                                                            placeholder="Citizenship"
                                                            className="h-10 text-xs font-medium rounded-xl"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-3 md:gap-4 pt-1">
                                                    <div className="space-y-1.5">
                                                        <Label className={cn("text-[9px] font-black uppercase tracking-widest", relativeErrors.height ? "text-destructive font-black" : "text-slate-400")}>
                                                            Height <span className="text-destructive">*</span>
                                                        </Label>
                                                        <Input
                                                            ref={heightRef}
                                                            name="height"
                                                            value={formState.height}
                                                            onChange={(e) => {
                                                                handleInputChange(e);
                                                                if (relativeErrors.height) {
                                                                    setRelativeErrors(prev => ({ ...prev, height: false }));
                                                                }
                                                            }}
                                                            placeholder="e.g. 165 cm / 5'5&quot;"
                                                            className={cn(
                                                                "h-10 text-xs font-medium rounded-xl transition-all",
                                                                relativeErrors.height && "border-destructive ring-2 ring-destructive/30"
                                                            )}
                                                        />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label className={cn("text-[9px] font-black uppercase tracking-widest", relativeErrors.weight ? "text-destructive font-black" : "text-slate-400")}>
                                                            Weight <span className="text-destructive">*</span>
                                                        </Label>
                                                        <Input
                                                            ref={weightRef}
                                                            name="weight"
                                                            value={formState.weight}
                                                            onChange={(e) => {
                                                                handleInputChange(e);
                                                                if (relativeErrors.weight) {
                                                                    setRelativeErrors(prev => ({ ...prev, weight: false }));
                                                                }
                                                            }}
                                                            placeholder="e.g. 60 kg / 132 lbs"
                                                            className={cn(
                                                                "h-10 text-xs font-medium rounded-xl transition-all",
                                                                relativeErrors.weight && "border-destructive ring-2 ring-destructive/30"
                                                            )}
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Relative's Address */}
                                            <div className="space-y-3 pt-2">
                                                <div className="flex items-center gap-2">
                                                    <MapPin className="w-3.5 h-3.5 text-primary" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                        Relative&apos;s Residential Address
                                                    </span>
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
                                                    <div className="space-y-1.5">
                                                        <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">House / Bldg No.</Label>
                                                        <Input
                                                            name="houseNumber"
                                                            autoComplete="off"
                                                            value={formState.houseNumber}
                                                            onChange={handleInputChange}
                                                            placeholder="House / Lot No."
                                                            className="h-10 text-xs font-medium rounded-xl"
                                                        />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Street Name</Label>
                                                        <Input
                                                            name="street"
                                                            autoComplete="off"
                                                            value={formState.street}
                                                            onChange={handleInputChange}
                                                            placeholder="Street name"
                                                            className="h-10 text-xs font-medium rounded-xl"
                                                        />
                                                    </div>
                                                    <div className="space-y-1.5" ref={barangayRef}>
                                                        <Label className={cn("text-[9px] font-black uppercase tracking-widest", relativeErrors.barangay ? "text-destructive font-black" : "text-slate-400")}>
                                                            Barangay <span className="text-destructive">*</span>
                                                        </Label>
                                                        <Select
                                                            value={formState.barangay}
                                                            onValueChange={(val) => {
                                                                setFormState(prev => ({ ...prev, barangay: val }));
                                                                if (relativeErrors.barangay) {
                                                                    setRelativeErrors(prev => ({ ...prev, barangay: false }));
                                                                }
                                                            }}
                                                        >
                                                            <SelectTrigger className={cn(
                                                                "w-full h-10 px-3 rounded-xl bg-white dark:bg-black/40 text-xs font-medium transition-all",
                                                                relativeErrors.barangay
                                                                    ? "border-destructive ring-2 ring-destructive/30"
                                                                    : "border-slate-200 dark:border-white/10 focus:ring-primary/20"
                                                            )}>
                                                                <SelectValue placeholder="Select Barangay..." />
                                                            </SelectTrigger>
                                                            <SelectContent className="rounded-xl border-slate-200 dark:border-white/10 max-h-56 z-[200]">
                                                                {MAPANDAN_BARANGAYS.map((brgy) => (
                                                                    <SelectItem key={brgy} value={brgy}>
                                                                        {brgy}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 pt-1">
                                                    <div className="space-y-1.5">
                                                        <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Municipality</Label>
                                                        <Input
                                                            name="municipality"
                                                            value={formState.municipality}
                                                            disabled
                                                            className="h-10 text-xs font-medium rounded-xl bg-slate-100 dark:bg-white/5 opacity-80"
                                                        />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Province</Label>
                                                        <Input
                                                            name="province"
                                                            value={formState.province}
                                                            disabled
                                                            className="h-10 text-xs font-medium rounded-xl bg-slate-100 dark:bg-white/5 opacity-80"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Relative's Place of Birth (Below Residential Address, Single Line) */}
                                            <div className="space-y-3 pt-2">
                                                <div className="flex items-center gap-2">
                                                    <MapPin className="w-3.5 h-3.5 text-primary" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                        Relative&apos;s Place of Birth
                                                    </span>
                                                </div>

                                                <div className="space-y-1.5">
                                                    <Label className={cn("text-[9px] font-black uppercase tracking-widest", relativeErrors.placeOfBirth ? "text-destructive font-black" : "text-slate-400")}>
                                                        Place of Birth <span className="text-destructive">*</span>
                                                    </Label>
                                                    <Input
                                                        ref={placeOfBirthRef}
                                                        name="placeOfBirth"
                                                        autoComplete="off"
                                                        value={formState.placeOfBirth}
                                                        onChange={(e) => {
                                                            handleInputChange(e);
                                                            if (relativeErrors.placeOfBirth) {
                                                                setRelativeErrors(prev => ({ ...prev, placeOfBirth: false }));
                                                            }
                                                        }}
                                                        placeholder="City / Municipality, Province of birth (e.g. Mapandan, Pangasinan)"
                                                        className={cn(
                                                            "h-10 text-xs font-medium rounded-xl transition-all",
                                                            relativeErrors.placeOfBirth && "border-destructive ring-2 ring-destructive/30"
                                                        )}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {currentStep === "UPLOAD" && (
                                <div className="space-y-8 md:space-y-12 animate-in fade-in duration-300">
                                    <div className="space-y-2 md:space-y-4 text-center md:text-left">
                                        <h2 className="text-2xl md:text-3xl font-black italic uppercase tracking-tighter leading-tight">
                                            Document <span className="text-primary italic">Upload</span>
                                        </h2>
                                        <p className="text-slate-500 font-medium italic text-xs md:text-sm">
                                            Upload your required government credentials and supporting documents to proceed with your appointment.
                                        </p>
                                    </div>

                                    {/* Upload cards */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
                                         {/* 1. Valid ID Card (Mandatory for everyone) */}
                                         <div className="space-y-4 md:space-y-6" ref={idSectionRef}>
                                             <div className={cn(
                                                 "p-4 md:p-5 bg-slate-50 dark:bg-white/5 rounded-2xl border flex flex-col items-center text-center gap-3 md:gap-4 transition-all hover:border-primary",
                                                 uploadErrors.id ? "border-destructive ring-2 ring-destructive/30 bg-destructive/5" : "border-dashed border-slate-200 dark:border-white/10"
                                             )}>
                                                 <div className="flex items-center gap-3 md:gap-4 w-full text-left">
                                                     <div className="w-10 h-10 md:w-12 md:h-12 bg-white dark:bg-black/20 rounded-xl flex items-center justify-center shadow-sm shrink-0">
                                                         <Upload className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                                                     </div>
                                                     <div className="space-y-0.5">
                                                         <h4 className="text-[10px] md:text-[11px] font-black uppercase tracking-widest text-slate-600 dark:text-white italic flex items-center gap-1.5">
                                                             Valid Government ID <span className="text-destructive font-bold text-[9px]">*</span>
                                                         </h4>
                                                         <p className="text-[8px] md:text-[9px] text-slate-400 font-bold italic uppercase tracking-tighter line-clamp-1">
                                                             {existingIdUrl && !idFile ? "Using verified ID from profile" : "PDF / Image (Max 5MB)"}
                                                         </p>
                                                     </div>
                                                 </div>

                                                 {idFile ? (
                                                     idFile.type.startsWith("image/") ? (
                                                         <div
                                                             onClick={() => handleViewFile(idFile, null)}
                                                             className="relative w-full aspect-[21/9] rounded-xl overflow-hidden border-2 border-primary/20 shadow-lg mt-1 cursor-pointer group/preview"
                                                         >
                                                             <Image
                                                                src={URL.createObjectURL(idFile)}
                                                                alt="ID Preview"
                                                                fill
                                                                unoptimized
                                                                className="object-cover group-hover/preview:scale-105 transition-transform duration-500"
                                                             />
                                                             <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/preview:opacity-100 transition-opacity flex items-center justify-center gap-2 select-none z-20">
                                                                <span className="text-[10px] font-black uppercase tracking-widest text-white italic">🔍 Click to View Full Size</span>
                                                             </div>
                                                         </div>
                                                     ) : (
                                                         <div
                                                             onClick={() => handleViewFile(idFile, null)}
                                                             className="w-full p-4 bg-primary/5 border border-primary/20 rounded-xl flex items-center justify-between mt-1 cursor-pointer hover:bg-primary/10 transition-colors"
                                                         >
                                                             <span className="text-xs font-bold text-primary truncate max-w-[200px]">{idFile.name}</span>
                                                             <span className="text-[9px] font-black uppercase tracking-widest text-primary italic">🔍 Click to View</span>
                                                         </div>
                                                     )
                                                 ) : existingIdUrl ? (
                                                     <div
                                                         onClick={() => handleViewFile(null, existingIdUrl)}
                                                         className="relative w-full aspect-[21/9] rounded-xl overflow-hidden border-2 border-primary/10 shadow-lg mt-1 cursor-pointer group/preview"
                                                     >
                                                         <Image
                                                             src={existingIdUrl}
                                                             alt="Existing ID Preview"
                                                             fill
                                                             unoptimized
                                                             className="object-cover opacity-75 group-hover/preview:scale-105 transition-transform duration-500"
                                                         />
                                                         <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/preview:opacity-100 transition-opacity flex items-center justify-center gap-2 select-none z-20">
                                                             <span className="text-[10px] font-black uppercase tracking-widest text-white italic">🔍 Verified ID on File (Click to View)</span>
                                                         </div>
                                                     </div>
                                                 ) : null}

                                                 <div className="flex items-center justify-between w-full gap-2 md:gap-3 mt-1">
                                                     <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => handleFileChange(e, "idFile")} className="hidden" id="id-upload" />
                                                     {(idFile || existingIdUrl) && (
                                                         <Button
                                                             type="button"
                                                             variant="outline"
                                                             onClick={() => handleViewFile(idFile, existingIdUrl)}
                                                             className="font-black italic uppercase tracking-widest text-[8px] md:text-[9px] px-4 md:px-6 h-8 rounded-full border-primary/20 text-primary hover:bg-primary/5 flex-1"
                                                         >
                                                             View Document
                                                         </Button>
                                                     )}
                                                     <Button asChild variant={(idFile || existingIdUrl) ? "outline" : "default"} className="font-black italic uppercase tracking-widest text-[8px] md:text-[9px] px-4 md:px-6 h-8 rounded-full flex-1">
                                                         <label htmlFor="id-upload" className="cursor-pointer">
                                                             {idFile ? "Change" : existingIdUrl ? "Replace ID" : "Upload ID"}
                                                         </label>
                                                     </Button>
                                                 </div>
                                             </div>
                                         </div>

                                         {/* 2. Relative Authorization Letter (Mandatory when applicantTarget === "RELATIVE") */}
                                         {applicantTarget === "RELATIVE" && (
                                             <div className="space-y-4 md:space-y-6" ref={authorizationSectionRef}>
                                                 <div className={cn(
                                                     "p-4 md:p-5 bg-slate-50 dark:bg-white/5 rounded-2xl border flex flex-col items-center text-center gap-3 md:gap-4 transition-all hover:border-primary",
                                                     uploadErrors.authorizationLetter ? "border-destructive ring-2 ring-destructive/30 bg-destructive/5" : "border-dashed border-slate-200 dark:border-white/10"
                                                 )}>
                                                     <div className="flex items-center gap-3 md:gap-4 w-full text-left">
                                                         <div className="w-10 h-10 md:w-12 md:h-12 bg-white dark:bg-black/20 rounded-xl flex items-center justify-center shadow-sm shrink-0">
                                                             <FileText className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                                                         </div>
                                                         <div className="space-y-0.5">
                                                             <h4 className="text-[10px] md:text-[11px] font-black uppercase tracking-widest text-slate-600 dark:text-white italic flex items-center gap-1.5">
                                                                 Authorization Letter <span className="text-destructive font-bold text-[9px]">*</span>
                                                             </h4>
                                                             <p className="text-[8px] md:text-[9px] text-slate-400 font-bold italic uppercase tracking-tighter line-clamp-1">
                                                                 Signed authorization from applicant (PDF / Image)
                                                             </p>
                                                         </div>
                                                     </div>

                                                     {authorizationLetterFile ? (
                                                         authorizationLetterFile.type.startsWith("image/") ? (
                                                             <div
                                                                 onClick={() => handleViewFile(authorizationLetterFile, null)}
                                                                 className="relative w-full aspect-[21/9] rounded-xl overflow-hidden border-2 border-primary/20 shadow-lg mt-1 cursor-pointer group/preview"
                                                             >
                                                                 <Image
                                                                     src={URL.createObjectURL(authorizationLetterFile)}
                                                                     alt="Authorization Letter Preview"
                                                                     fill
                                                                     unoptimized
                                                                     className="object-cover group-hover/preview:scale-105 transition-transform duration-500"
                                                                 />
                                                                 <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/preview:opacity-100 transition-opacity flex items-center justify-center gap-2 select-none z-20">
                                                                     <span className="text-[10px] font-black uppercase tracking-widest text-white italic">🔍 Click to View Full Size</span>
                                                                 </div>
                                                             </div>
                                                         ) : (
                                                             <div
                                                                 onClick={() => handleViewFile(authorizationLetterFile, null)}
                                                                 className="w-full p-4 bg-primary/5 border border-primary/20 rounded-xl flex items-center justify-between mt-1 cursor-pointer hover:bg-primary/10 transition-colors"
                                                             >
                                                                 <span className="text-xs font-bold text-primary truncate max-w-[200px]">{authorizationLetterFile.name}</span>
                                                                 <span className="text-[9px] font-black uppercase tracking-widest text-primary italic">🔍 Click to View</span>
                                                             </div>
                                                         )
                                                     ) : null}

                                                     <div className="flex items-center justify-between w-full gap-2 md:gap-3 mt-1">
                                                         <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => handleFileChange(e, "authorizationLetterFile")} className="hidden" id="authorization-upload" />
                                                         {authorizationLetterFile && (
                                                             <Button
                                                                 type="button"
                                                                 variant="outline"
                                                                 onClick={() => handleViewFile(authorizationLetterFile, null)}
                                                                 className="font-black italic uppercase tracking-widest text-[8px] md:text-[9px] px-4 md:px-6 h-8 rounded-full border-primary/20 text-primary hover:bg-primary/5 flex-1"
                                                             >
                                                                 View Document
                                                             </Button>
                                                         )}
                                                         <Button asChild variant={authorizationLetterFile ? "outline" : "default"} className="font-black italic uppercase tracking-widest text-[8px] md:text-[9px] px-4 md:px-6 h-8 rounded-full flex-1">
                                                             <label htmlFor="authorization-upload" className="cursor-pointer">
                                                                 {authorizationLetterFile ? "Change" : "Upload Authorization Letter"}
                                                             </label>
                                                         </Button>
                                                     </div>
                                                 </div>
                                             </div>
                                         )}

                                         {/* 3. Juridical SEC Registration / Certificate of Incorporation (Mandatory when applicantType === "JURIDICAL") */}
                                         {applicantType === "JURIDICAL" && (
                                             <div className="space-y-4 md:space-y-6" ref={secRegistrationSectionRef}>
                                                 <div className={cn(
                                                     "p-4 md:p-5 bg-slate-50 dark:bg-white/5 rounded-2xl border flex flex-col items-center text-center gap-3 md:gap-4 transition-all hover:border-primary",
                                                     uploadErrors.secRegistration ? "border-destructive ring-2 ring-destructive/30 bg-destructive/5" : "border-dashed border-slate-200 dark:border-white/10"
                                                 )}>
                                                     <div className="flex items-center gap-3 md:gap-4 w-full text-left">
                                                         <div className="w-10 h-10 md:w-12 md:h-12 bg-white dark:bg-black/20 rounded-xl flex items-center justify-center shadow-sm shrink-0">
                                                             <Building2 className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                                                         </div>
                                                         <div className="space-y-0.5">
                                                             <h4 className="text-[10px] md:text-[11px] font-black uppercase tracking-widest text-slate-600 dark:text-white italic flex items-center gap-1.5">
                                                                 SEC Registration <span className="text-destructive font-bold text-[9px]">*</span>
                                                             </h4>
                                                             <p className="text-[8px] md:text-[9px] text-slate-400 font-bold italic uppercase tracking-tighter line-clamp-1">
                                                                 Certificate of Incorporation / DTI / Articles (Max 5MB)
                                                             </p>
                                                         </div>
                                                     </div>

                                                     {secRegistrationFile ? (
                                                         secRegistrationFile.type.startsWith("image/") ? (
                                                             <div
                                                                 onClick={() => handleViewFile(secRegistrationFile, null)}
                                                                 className="relative w-full aspect-[21/9] rounded-xl overflow-hidden border-2 border-primary/20 shadow-lg mt-1 cursor-pointer group/preview"
                                                             >
                                                                 <Image
                                                                     src={URL.createObjectURL(secRegistrationFile)}
                                                                     alt="SEC Registration Preview"
                                                                     fill
                                                                     unoptimized
                                                                     className="object-cover group-hover/preview:scale-105 transition-transform duration-500"
                                                                 />
                                                                 <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/preview:opacity-100 transition-opacity flex items-center justify-center gap-2 select-none z-20">
                                                                     <span className="text-[10px] font-black uppercase tracking-widest text-white italic">🔍 Click to View Full Size</span>
                                                                 </div>
                                                             </div>
                                                         ) : (
                                                             <div
                                                                 onClick={() => handleViewFile(secRegistrationFile, null)}
                                                                 className="w-full p-4 bg-primary/5 border border-primary/20 rounded-xl flex items-center justify-between mt-1 cursor-pointer hover:bg-primary/10 transition-colors"
                                                             >
                                                                 <span className="text-xs font-bold text-primary truncate max-w-[200px]">{secRegistrationFile.name}</span>
                                                                 <span className="text-[9px] font-black uppercase tracking-widest text-primary italic">🔍 Click to View</span>
                                                             </div>
                                                         )
                                                     ) : null}

                                                     <div className="flex items-center justify-between w-full gap-2 md:gap-3 mt-1">
                                                         <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => handleFileChange(e, "secRegistrationFile")} className="hidden" id="sec-upload" />
                                                         {secRegistrationFile && (
                                                             <Button
                                                                 type="button"
                                                                 variant="outline"
                                                                 onClick={() => handleViewFile(secRegistrationFile, null)}
                                                                 className="font-black italic uppercase tracking-widest text-[8px] md:text-[9px] px-4 md:px-6 h-8 rounded-full border-primary/20 text-primary hover:bg-primary/5 flex-1"
                                                             >
                                                                 View Document
                                                             </Button>
                                                         )}
                                                         <Button asChild variant={secRegistrationFile ? "outline" : "default"} className="font-black italic uppercase tracking-widest text-[8px] md:text-[9px] px-4 md:px-6 h-8 rounded-full flex-1">
                                                             <label htmlFor="sec-upload" className="cursor-pointer">
                                                                 {secRegistrationFile ? "Change" : "Upload SEC Registration"}
                                                             </label>
                                                         </Button>
                                                     </div>
                                                 </div>
                                             </div>
                                         )}

                                         {/* 4. Proof of Income Card (Optional) */}
                                         <div className="space-y-4 md:space-y-6" ref={proofSectionRef}>
                                             <div className="p-4 md:p-5 bg-slate-50 dark:bg-white/5 rounded-2xl border border-dashed flex flex-col items-center text-center gap-3 md:gap-4 transition-all hover:border-primary border-slate-200 dark:border-white/10">
                                                 <div className="flex items-center gap-3 md:gap-4 w-full text-left">
                                                     <div className="w-10 h-10 md:w-12 md:h-12 bg-white dark:bg-black/20 rounded-xl flex items-center justify-center shadow-sm shrink-0">
                                                         <Upload className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                                                     </div>
                                                     <div className="space-y-0.5">
                                                         <h4 className="text-[10px] md:text-[11px] font-black uppercase tracking-widest text-slate-600 dark:text-white italic flex items-center gap-1">
                                                             Proof of Income <span className="text-slate-450 text-[8px] font-bold lowercase tracking-normal">(optional)</span>
                                                         </h4>
                                                         <p className="text-[8px] md:text-[9px] text-slate-400 font-bold italic uppercase tracking-tighter line-clamp-1">
                                                             Payslip / BIR / ITR (Max 5MB)
                                                         </p>
                                                     </div>
                                                 </div>

                                                 {proofFile ? (
                                                     proofFile.type.startsWith("image/") ? (
                                                         <div
                                                             onClick={() => handleViewFile(proofFile, null)}
                                                             className="relative w-full aspect-[21/9] rounded-xl overflow-hidden border-2 border-primary/20 shadow-lg mt-1 cursor-pointer group/preview"
                                                         >
                                                             <Image
                                                                 src={URL.createObjectURL(proofFile)}
                                                                 alt="Proof Preview"
                                                                 fill
                                                                 unoptimized
                                                                 className="object-cover group-hover/preview:scale-105 transition-transform duration-500"
                                                             />
                                                             <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/preview:opacity-100 transition-opacity flex items-center justify-center gap-2 select-none z-20">
                                                                 <span className="text-[10px] font-black uppercase tracking-widest text-white italic">🔍 Click to View Full Size</span>
                                                             </div>
                                                         </div>
                                                     ) : (
                                                         <div
                                                             onClick={() => handleViewFile(proofFile, null)}
                                                             className="w-full p-4 bg-primary/5 border border-primary/20 rounded-xl flex items-center justify-between mt-1 cursor-pointer hover:bg-primary/10 transition-colors"
                                                         >
                                                             <span className="text-xs font-bold text-primary truncate max-w-[200px]">{proofFile.name}</span>
                                                             <span className="text-[9px] font-black uppercase tracking-widest text-primary italic">🔍 Click to View</span>
                                                         </div>
                                                     )
                                                 ) : existingProofUrl ? (
                                                     <div
                                                         onClick={() => handleViewFile(null, existingProofUrl)}
                                                         className="relative w-full aspect-[21/9] rounded-xl overflow-hidden border-2 border-primary/10 shadow-lg mt-1 cursor-pointer group/preview"
                                                     >
                                                         <Image
                                                             src={existingProofUrl}
                                                             alt="Existing Proof Preview"
                                                             fill
                                                             unoptimized
                                                             className="object-cover opacity-60 group-hover/preview:scale-105 transition-transform duration-500"
                                                         />
                                                         <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/preview:opacity-100 transition-opacity flex items-center justify-center gap-2 select-none z-20">
                                                             <span className="text-[10px] font-black uppercase tracking-widest text-white italic">🔍 Click to View Full Size</span>
                                                         </div>
                                                     </div>
                                                 ) : null}

                                                 <div className="flex items-center justify-between w-full gap-2 md:gap-3 mt-1">
                                                     <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => handleFileChange(e, "proofFile")} className="hidden" id="proof-upload" />
                                                     {(proofFile || existingProofUrl) && (
                                                         <Button
                                                             type="button"
                                                             variant="outline"
                                                             onClick={() => handleViewFile(proofFile, existingProofUrl)}
                                                             className="font-black italic uppercase tracking-widest text-[8px] md:text-[9px] px-4 md:px-6 h-8 rounded-full border-primary/20 text-primary hover:bg-primary/5 flex-1"
                                                         >
                                                             View Document
                                                         </Button>
                                                     )}
                                                     <Button asChild variant={(proofFile || existingProofUrl) ? "outline" : "default"} className="font-black italic uppercase tracking-widest text-[8px] md:text-[9px] px-4 md:px-6 h-8 rounded-full flex-1">
                                                         <label htmlFor="proof-upload" className="cursor-pointer">
                                                             {proofFile ? "Change" : existingProofUrl ? "Replace Proof" : "Upload Proof"}
                                                         </label>
                                                     </Button>
                                                 </div>
                                             </div>
                                         </div>
                                     </div>
                                </div>
                            )}

                            {currentStep === "TAX_DECLARATION" && (
                                <div className="space-y-8 md:space-y-12 animate-in fade-in duration-300">
                                    <div className="space-y-2 md:space-y-4 text-center md:text-left">
                                        <h2 className="text-2xl md:text-3xl font-black italic uppercase tracking-tighter leading-tight">
                                            Tax <span className="text-primary italic">Declaration</span>
                                        </h2>
                                        <p className="text-slate-500 font-medium italic text-xs md:text-sm">
                                            Declare your annual financial status for the tax computation.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                                        {/* Left Column: Inputs */}
                                        <div className="space-y-6">
                                            {applicantType === "JURIDICAL" && (
                                                <div className="space-y-2 md:space-y-3">
                                                    <Label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 italic ml-1">
                                                        Business Name
                                                    </Label>
                                                    <Input
                                                         ref={businessNameInputRef}
                                                         type="text"
                                                         name="businessName"
                                                         value={formState.businessName}
                                                         onChange={(e) => {
                                                             handleInputChange(e);
                                                             if (businessNameError) setBusinessNameError(false);
                                                         }}
                                                         placeholder="Enter registered business name"
                                                         className={cn(
                                                             "h-12 md:h-16 px-4 rounded-xl md:rounded-2xl dark:bg-white/5 text-sm font-bold bg-white transition-all",
                                                             businessNameError
                                                                 ? "border-red-500 ring-2 ring-red-500/20 dark:border-red-500"
                                                                 : "border-slate-200 dark:border-white/10"
                                                         )}
                                                         required
                                                     />
                                                </div>
                                            )}

                                            {formState.incomeSource === "UNEMPLOYED" ? (
                                                <div className="p-5 rounded-2xl bg-primary/10 border border-primary/20 animate-in fade-in duration-300">
                                                    <p className="text-xs font-bold text-slate-600 dark:text-slate-300 italic leading-relaxed">
                                                        Annual gross income declaration for Unemployed applications only the standard ₱5.00 basic tax applies.
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="space-y-2 md:space-y-3">
                                                    <Label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 italic ml-1">
                                                        Annual Gross Income
                                                    </Label>
                                                    <div className="relative">
                                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg md:text-xl font-black text-slate-350 italic">₱</span>
                                                        <Input
                                                            ref={incomeInputRef}
                                                            type="text"
                                                            value={formState.income}
                                                            onChange={(e) => {
                                                                const val = e.target.value.replace(/[^0-9.]/g, '');
                                                                if (val === '') {
                                                                    setFormState(p => ({ ...p, income: '' }));
                                                                    return;
                                                                }
                                                                const parts = val.split('.');
                                                                parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                                                                const formatted = parts.length > 1 ? `${parts[0]}.${parts[1].slice(0, 2)}` : parts[0];
                                                                setFormState(p => ({ ...p, income: formatted }));
                                                                if (incomeError) setIncomeError(false); // Reset error state on change
                                                            }}
                                                            placeholder="0.00"
                                                            className={cn(
                                                                "h-12 md:h-16 pl-10 rounded-xl md:rounded-2xl dark:bg-white/5 text-lg md:text-xl font-black italic bg-white transition-all",
                                                                incomeError
                                                                    ? "border-red-500 focus-visible:ring-red-500 dark:border-red-500"
                                                                    : "border-slate-200 dark:border-white/10"
                                                            )}
                                                        />
                                                    </div>
                                                    {incomeError && (
                                                        <p className="text-[10px] text-red-500 font-medium ml-1">
                                                            Annual gross income is required.
                                                        </p>
                                                    )}
                                                </div>
                                            )}

                                            <div className="space-y-4">
                                                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 italic ml-1">
                                                    Income Source Category
                                                </Label>
                                                <div className="flex flex-col gap-2">
                                                    {[
                                                        {
                                                            id: "PROFESSION",
                                                            label: "Profession",
                                                            desc: "Employees, Freelancers, & Salary"
                                                        },
                                                        {
                                                            id: "BUSINESS",
                                                            label: "Business",
                                                            desc: "Trade, Stores, & Services"
                                                        },
                                                        {
                                                            id: "PROPERTY",
                                                            label: "Property",
                                                            desc: "Real Estate Rentals & Leases"
                                                        },
                                                        {
                                                            id: "UNEMPLOYED",
                                                            label: "Unemployed",
                                                            desc: "Students & Non-earners"
                                                        }
                                                    ].filter(opt => {
                                                        if (applicantType === "JURIDICAL") {
                                                            return opt.id !== "PROFESSION" && opt.id !== "UNEMPLOYED";
                                                        }
                                                        return true;
                                                    }).map(opt => {
                                                        const isSelected = formState.incomeSource === opt.id;
                                                        return (
                                                            <button
                                                                key={opt.id}
                                                                type="button"
                                                                onClick={() => {
                                                                    setFormState(p => ({
                                                                        ...p,
                                                                        incomeSource: opt.id,
                                                                        income: opt.id === "UNEMPLOYED" ? "0.00" : (p.incomeSource === "UNEMPLOYED" ? "" : p.income)
                                                                    }));
                                                                    if (incomeError) setIncomeError(false);
                                                                }}
                                                                className={cn(
                                                                    "px-5 py-4 rounded-xl border-2 transition-all duration-300 text-left relative overflow-hidden flex items-center justify-between gap-4 group select-none shadow-sm cursor-pointer",
                                                                    isSelected
                                                                        ? "border-primary bg-primary/[0.05] dark:bg-primary/[0.1] shadow-[0_4px_20px_rgba(var(--primary),0.05)] scale-[1.01]"
                                                                        : "border-slate-200 dark:border-white/10 bg-white/40 dark:bg-white/5 backdrop-blur-sm hover:border-primary/30 hover:bg-white/60 dark:hover:bg-white/10"
                                                                )}
                                                            >
                                                                <h4 className={cn(
                                                                    "text-sm md:text-base font-black uppercase italic tracking-wider whitespace-nowrap",
                                                                    isSelected ? "text-primary" : "text-slate-800 dark:text-slate-200"
                                                                )}>
                                                                    {opt.label}
                                                                </h4>
                                                                <p className={cn(
                                                                    "text-[10px] md:text-xs font-bold uppercase tracking-tighter text-right",
                                                                    isSelected ? "text-primary/70 dark:text-primary/60" : "text-slate-500 dark:text-slate-400"
                                                                )}>
                                                                    {opt.desc}
                                                                </p>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right Column: Calculation Overlay */}
                                        <div className="bg-slate-900 dark:bg-black border border-slate-800 dark:border-white/5 rounded-3xl md:rounded-[2.5rem] p-6 md:p-10 text-white space-y-6 md:space-y-8 shadow-2xl relative overflow-hidden flex flex-col justify-between">
                                            <div className="absolute top-0 right-0 p-4 md:p-8 opacity-10 pointer-events-none">
                                                <Calculator className="w-24 h-24 md:w-32 md:h-32 rotate-12" />
                                            </div>

                                            <div className="space-y-4 relative z-10 font-bold">
                                                <div className="flex justify-between items-center text-[10px] md:text-xs uppercase tracking-widest italic opacity-70">
                                                    <span>Basic Tax</span>
                                                    <span>₱{(calcResult?.basicTax ?? (applicantType === "INDIVIDUAL" ? 5.00 : 500.00)).toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-[10px] md:text-xs uppercase tracking-widest italic opacity-70">
                                                    <span>Additional Tax</span>
                                                    <span>₱{(calcResult?.additionalTax ?? 0).toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-[10px] md:text-xs uppercase tracking-widest italic text-amber-500">
                                                    <span>
                                                        Penalty ({Math.round(getCedulaPenaltyRate(cedulaSettings) * 100)}%)
                                                    </span>
                                                    <span>₱{(calcResult?.penalty ?? 0).toFixed(2)}</span>
                                                </div>
                                            </div>

                                            <div className="pt-6 border-t border-white/10 relative z-10 flex justify-between items-end">
                                                <div className="space-y-1">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic block">Estimated Total</span>
                                                    <span className="text-[8px] font-bold text-amber-500/80 uppercase block italic"></span>
                                                </div>
                                                <span className="text-3xl md:text-5xl font-black italic tracking-tighter text-primary">
                                                    ₱{(calcResult?.totalAmount ?? 0).toFixed(2)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                </div>
                            )}

                            {currentStep === "DECLARATION" && (
                                <div className="space-y-8 md:space-y-12">
                                    <div className="space-y-2 md:space-y-4 text-center md:text-left">
                                        <h2 className="text-2xl md:text-3xl font-black italic uppercase tracking-tighter leading-tight">
                                            Schedule <span className="text-primary italic">Declaration</span>
                                        </h2>
                                        <p className="text-slate-500 font-medium italic text-xs md:text-sm">
                                            Choose an available date and select your time slot to book your municipal appointment.
                                        </p>
                                    </div>

                                    <SchedulePicker
                                        selectedDate={selectedDate}
                                        setSelectedDate={setSelectedDate}
                                        selectedSlot={selectedSlot}
                                        setSelectedSlot={setSelectedSlot}
                                        bookedSlots={bookedSlots}
                                        config={config}
                                        themeColor={themeColor}
                                    />

                                    {/* Paalala / Reminder Note */}
                                    {(activeType?.pickupAddress || activeType?.processingTime || fees.length > 0) && (
                                        <div className="flex gap-3 p-4 rounded-2xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 mt-6">
                                            <Info className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                                            <div className="space-y-2">
                                                <p className="font-black uppercase tracking-widest text-[8px] md:text-[9px] text-amber-500">Important Reminders Before Your Appointment</p>
                                                <ul className="space-y-1.5 list-none">
                                                    {activeType?.pickupAddress && (
                                                        <li className="flex items-start gap-1.5 text-[10px] md:text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                                                            <MapPin className="w-3 h-3 shrink-0 mt-0.5 text-slate-400" />
                                                            <span><span className="font-black text-slate-600 dark:text-slate-300">Report to:</span> {activeType.pickupAddress}</span>
                                                        </li>
                                                    )}
                                                    {activeType?.processingTime && (
                                                        <li className="flex items-start gap-1.5 text-[10px] md:text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                                                            <Clock className="w-3 h-3 shrink-0 mt-0.5 text-slate-400" />
                                                            <span><span className="font-black text-slate-600 dark:text-slate-300">Processing time:</span> {activeType.processingTime}</span>
                                                        </li>
                                                    )}
                                                    {fees.map((fee, idx) => fee.label && (
                                                        <li key={idx} className="flex items-start gap-1.5 text-[10px] md:text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                                                            <Coins className="w-3 h-3 shrink-0 mt-0.5 text-slate-400" />
                                                            <span>{fee.label}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                    )}

                                    {/* Data Privacy & Terms Agreement — in Schedule tab */}
                                    <div className="mt-6 pt-4 border-t border-slate-100 dark:border-white/5" ref={privacySectionRef}>
                                        <div
                                            onClick={() => {
                                                if (privacyAccepted) {
                                                    setPrivacyAccepted(false);
                                                } else {
                                                    setIsPrivacyModalOpen(true);
                                                }
                                            }}
                                            className={cn(
                                                "p-4 md:p-6 rounded-2xl md:rounded-3xl border-2 transition-all cursor-pointer flex items-start gap-3 md:gap-4 select-none",
                                                privacyAccepted
                                                    ? "bg-primary/5 border-primary shadow-sm"
                                                    : showValidationErrors
                                                        ? "bg-red-50/10 border-red-500 dark:border-red-500/80 ring-2 ring-red-500/20 animate-pulse"
                                                        : "bg-slate-50 dark:bg-white/5 border-transparent hover:border-primary/20"
                                            )}
                                        >
                                            <div className={cn(
                                                "w-5 h-5 md:w-6 md:h-6 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 mt-0.5",
                                                privacyAccepted
                                                    ? "bg-primary border-primary text-white"
                                                    : showValidationErrors
                                                        ? "border-red-500"
                                                        : "border-slate-300 dark:border-white/10"
                                            )}>
                                                {privacyAccepted && <Check className="w-3.5 h-3.5" />}
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-xs md:text-sm font-black italic uppercase tracking-tight text-slate-900 dark:text-white">Data Privacy and Terms Agreement</p>
                                                <p className="text-[8px] md:text-[10px] text-slate-500 font-medium leading-relaxed italic uppercase tracking-widest">
                                                    I authorize the LGU to process my personal information in accordance with the Data Privacy Act. I confirm all info is true and correct. Click to review agreement.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {currentStep === "SUCCESS" && (
                                <div className="space-y-8 text-center py-6">
                                    {/* Print queue ticket helper portal */}
                                    {queueNumber && (
                                        <PrintQueueTicket
                                            queueNumber={queueNumber}
                                            residentName={`${formState.firstName} ${formState.lastName}`}
                                            serviceName={activeType?.name || "Cedula Appointment"}
                                            appointmentDate={selectedDate ? new Date(selectedDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : ""}
                                            appointmentSlot={selectedSlot}
                                            isPriority={isPriorityLane}
                                            branding={branding}
                                            themeColor={themeColor}
                                            triggerPrint={printTriggered}
                                            onPrintCompleted={() => setPrintTriggered(false)}
                                        />
                                    )}

                                    <div className="w-20 h-20 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/5">
                                        <CheckCircle2 className="w-10 h-10 animate-in zoom-in duration-300" />
                                    </div>

                                    <div className="space-y-2">
                                        <h2 className="text-3xl font-black uppercase italic tracking-tight text-slate-900 dark:text-white">Appointment Scheduled!</h2>
                                        <p className="text-xs text-slate-400 font-black uppercase tracking-widest">Your slot has been successfully registered in the system</p>
                                    </div>

                                    {/* Dynamic queue ticket-like display layout */}
                                    <div className="max-w-md mx-auto border border-slate-200 dark:border-white/5 rounded-[2.5rem] p-6 bg-slate-50 dark:bg-black/10 text-left space-y-5 print:border-none print:bg-white print:text-black">
                                        <div className="flex justify-between items-center text-xs font-black uppercase tracking-widest text-slate-400 pb-2 border-b border-slate-100 dark:border-white/5">
                                            <span>Queue ticket details</span>
                                            <span className="text-slate-800 dark:text-slate-200 font-bold">#{(newTransactionId || "").slice(-8).toUpperCase()}</span>
                                        </div>

                                        {queueNumber && (
                                            <div className="border-2 border-dashed border-slate-200 dark:border-white/10 rounded-3xl p-5 bg-white dark:bg-[#1a1f2c]/50 flex flex-col items-center justify-center gap-3">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Your queue number</span>
                                                <span className="text-4xl font-black italic tracking-tighter text-slate-900 dark:text-white font-mono">
                                                    {queueNumber}
                                                </span>

                                                {isPriorityLane && (
                                                    <span className="bg-primary/10 text-primary border border-primary/20 rounded-full px-4 py-1 text-[9px] font-black uppercase tracking-widest">
                                                        ♿ Priority Lane
                                                    </span>
                                                )}

                                                <div className="w-full flex items-center justify-center mt-2">
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img
                                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${queueNumber}`}
                                                        alt="QR Ticket Code"
                                                        className="w-24 h-24 p-2 bg-white rounded-xl border border-slate-100"
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        <div className="space-y-2.5 text-xs md:text-sm pt-2">
                                            <div className="flex justify-between">
                                                <span className="text-slate-400 font-semibold">Applicant Name:</span>
                                                <span className="font-bold text-slate-800 dark:text-slate-100">{formState.lastName}, {formState.firstName}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-400 font-semibold">Scheduled Date:</span>
                                                <span className="font-bold text-slate-800 dark:text-slate-100">{selectedDate}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-400 font-semibold">Time Session:</span>
                                                <span className="font-bold text-slate-800 dark:text-slate-100">{selectedSlot}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-400 font-semibold">Fulfillment Office:</span>
                                                <span className="font-bold text-slate-800 dark:text-slate-100">{activeType?.pickupAddress || "Treasury Office"}</span>
                                            </div>
                                            {activeType?.processingTime && (
                                                <div className="flex justify-between">
                                                    <span className="text-slate-400 font-semibold">Estimated Process Duration:</span>
                                                    <span className="font-bold text-slate-800 dark:text-slate-100">{activeType.processingTime}</span>
                                                </div>
                                            )}
                                        </div>

                                        <Separator className="opacity-50" />

                                        <div className="space-y-3 pt-2">
                                            <h4 className="text-xs font-black uppercase tracking-wider text-slate-650 dark:text-slate-350 flex items-center gap-1.5">
                                                <FileText className="w-4 h-4 text-blue-500" style={{ color: themeColor }} /> Requirements checklist to bring:
                                            </h4>
                                            {docs.length === 0 ? (
                                                <p className="text-xs text-slate-450 italic">No specific documents required.</p>
                                            ) : (
                                                <ul className="text-xs font-semibold space-y-1.5 pl-5 list-disc text-slate-500 dark:text-slate-400 leading-relaxed">
                                                    {docs.map((doc, idx) => (
                                                        <li key={idx}>{doc}</li>
                                                    ))}
                                                    <li>Cash for payment (Final taxes will be computed on-site by officers).</li>
                                                </ul>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-6 print:hidden">
                                        <Button onClick={printSlip} variant="outline" className="font-bold uppercase tracking-widest text-xs px-6 py-5 rounded-2xl w-full sm:w-auto">
                                            <Printer className="w-4 h-4 mr-2" /> Print Ticket
                                        </Button>
                                        <Link href="/user/services" className="w-full sm:w-auto">
                                            <Button className="text-white font-bold uppercase tracking-widest text-xs px-8 py-6 rounded-2xl hover:opacity-90 transition-all w-full" style={{ backgroundColor: themeColor }}>
                                                <Home className="w-4 h-4 mr-2" /> Finish & Exit
                                            </Button>
                                        </Link>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Global Navigation Footer — like cedula page */}
                <div className="mt-8 md:mt-12 pt-6 md:pt-8 border-t border-slate-200 dark:border-white/10 flex justify-between items-center">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                            if (currentStep === "STATUS") {
                                router.push("/user/services");
                            } else {
                                const stepIndex = STEPS.findIndex(s => s.id === currentStep);
                                if (stepIndex > 0) {
                                    setCurrentStep(STEPS[stepIndex - 1].id);
                                }
                            }
                        }}
                        className="rounded-full px-12 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest italic text-[10px] h-10 md:h-14 bg-transparent hover:bg-slate-50 dark:hover:bg-white/5 flex items-center"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back
                    </Button>
                    <Button
                        onClick={currentStep === "DECLARATION" ? handleSubmit : handleNext}
                        disabled={submitting || (currentStep === "DECLARATION" && (!privacyAccepted || !selectedDate || !selectedSlot))}
                        className="bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/20 text-[10px] md:text-xs rounded-xl md:rounded-2xl px-8 md:px-12 h-10 md:h-14 group transition-all duration-300 active:scale-95 font-black uppercase tracking-widest italic"
                        style={{ backgroundColor: themeColor }}
                    >
                        {submitting ? (
                            <div className="flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Booking Slot...</span>
                            </div>
                        ) : (
                            <div className="flex items-center">
                                {currentStep === "DECLARATION" ? "Book Appointment" : "Next Phase"}
                                <ChevronRight className={cn("w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform", submitting && "hidden")} />
                            </div>
                        )}
                    </Button>
                </div>
            </div>

                    {/* Sticky Progress Bar at Bottom */}
                    {currentStep !== "SUCCESS" && (
                        <div className="fixed bottom-0 left-0 right-0 bg-white/70 dark:bg-[#06080a]/70 backdrop-blur-2xl border-t border-slate-200 dark:border-white/10 z-50 pt-2.5 pb-0 px-2.5 flex flex-col items-center print:hidden">
                            <div className="w-full max-w-5xl flex items-center justify-center gap-4">
                                <div className="h-1.5 flex-1 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                                    <motion.div
                                        className="h-full bg-primary"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${((STEPS.findIndex(s => s.id === currentStep) + 1) / STEPS.length) * 100}%` }}
                                    />
                                </div>
                                <span className="font-black uppercase tracking-widest italic text-[8px] md:text-[10px] text-slate-400 whitespace-nowrap">
                                    Phase {STEPS.findIndex(s => s.id === currentStep) + 1} / {STEPS.length}
                                </span>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
