/* eslint-disable react/no-unescaped-entities, @next/next/no-img-element */
"use client";

import React, { useState, useEffect } from "react";
import SecureIdleTimer from "@/components/shared/SecureIdleTimer";
import { SubmitStep } from "./components/SubmitStep";
import { BFPStep } from "./components/BFPStep";
import { EvaluationStep } from "./components/EvaluationStep";
import { UploadStep } from "./components/UploadStep";
import {
  Book,
  CheckCircle,
  ClipboardList,
  FileSignature,
  FileText,
  Flame,
  Handshake,
  Home,
  Landmark,
  MapPin,
  PenTool,
  Ruler,
  Scroll,
  UploadCloud,
  User,
  Users,
  Wallet,
  Zap,
  AlertCircle,
  FileWarning,
  Building2,
  CheckCircle2,
  Upload,
  Shield,
  Hourglass,
  Check,
  Hash,
  UserCheck,
  ChevronDown,
  Search,
  ChevronLeft,
  ChevronRight,
  Plus
} from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import Link from "next/link";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { getCurrentUserResident, cancelTransaction, getSystemSettingAction } from "@/app/admin/transactions/actions";
import { submitBuildingPermit, saveTransactionSignature, getExistingBuildingPermits, resubmitBuildingPermit, submitBuildingPermitPaymentProof, checkActivePropertyPermit, getBarangaysAction } from "./actions";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { compressImage } from "@/lib/image-compression";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import DocumentViewerModal from "@/components/shared/DocumentViewerModal";
import PremiumDocumentUpload from "@/components/shared/PremiumDocumentUpload";
import { getSecureUploadUrlsAction } from "@/app/auth/actions";
import { mapWithConcurrency } from "@/lib/async/map-with-concurrency";

const STEPS = [
  { id: "GUIDE", label: "Guide", icon: ClipboardList },
  { id: "PROFILE", label: "Profile", icon: User },
  { id: "DOCUMENTS", label: "Upload", icon: Upload },
  { id: "EVALUATION", label: "Evaluation", icon: Building2 },
  { id: "BFP", label: "BFP", icon: Landmark },
  { id: "SUBMIT", label: "Submit", icon: CheckCircle2 },
];

const OCCUPANCY_CATEGORIES = [
  "Residential",
  "Commercial",
  "Industrial",
  "Institutional",
  "Agricultural",
  "Street Furniture, Landscaping & Signboards",
  "Other Construction"
] as const;

const OCCUPANCY_OPTIONS: Record<string, { label: string; code: string }[]> = {
  "Residential": [
    { label: "Single", code: "11" },
    { label: "Duplex", code: "12" },
    { label: "Rowhouse / Accessoria", code: "13" },
    { label: "Others (Specify)", code: "10" }
  ],
  "Commercial": [
    { label: "Bank", code: "21" },
    { label: "Store", code: "22" },
    { label: "Hotel/Motel, etc.", code: "23" },
    { label: "Office Condominium/Business Office Building", code: "24" },
    { label: "Restaurant etc.", code: "25" },
    { label: "Shop (e.g. Dress Shop, Tailoring Shop, Barber Shop etc.)", code: "26" },
    { label: "Gasoline Station", code: "27" },
    { label: "Market", code: "28" },
    { label: "Dormitory or Other Lodging House", code: "29" },
    { label: "Others (Specify)", code: "20" }
  ],
  "Industrial": [
    { label: "Factory/Plant", code: "31" },
    { label: "Repair Shop, Machine Shop", code: "32" },
    { label: "Refinery", code: "33" },
    { label: "Printing Press", code: "34" },
    { label: "Warehouse", code: "35" },
    { label: "Others (Specify)", code: "30" }
  ],
  "Institutional": [
    { label: "School", code: "41" },
    { label: "Church and other religious structures", code: "42" },
    { label: "Hospital or similar structures", code: "43" },
    { label: "Welfare and charitable structures", code: "44" },
    { label: "Theater, Auditorium, Gymnasium, Court", code: "45" },
    { label: "Others (Specify)", code: "40" }
  ],
  "Agricultural": [
    { label: "Barn(s), Poultry House(s), etc.", code: "51" },
    { label: "Grain Mill", code: "52" },
    { label: "Others (Specify)", code: "50" }
  ],
  "Street Furniture, Landscaping & Signboards": [
    { label: "Parks, Plazas, Monuments, Pools, Plant Boxes etc.", code: "71" },
    { label: "Sidewalks, Promenades, Terraces, Lamposts, Electric Poles, Telephone Poles, etc.", code: "72" },
    { label: "Outdoor Ads, Signboard, etc.", code: "73" },
    { label: "Fence Enclosure", code: "74" }
  ],
  "Other Construction": [
    { label: "Specify", code: "60" }
  ]
};

function parseDescriptionOfWork(desc: string) {
  const result = {
    newConstruction: false,
    addition: false,
    additionText: "",
    repair: false,
    repairText: "",
    renovation: false,
    renovationText: "",
    demolition: false,
    demolitionText: "",
    others1: false,
    others1Text1: "",
    others1Text2: "",
    others2: false,
    others2Text1: "",
    others2Text2: "",
    legacyText: "",
  };

  if (!desc) return result;

  if (!desc.includes("NEW CONSTRUCTION") && !desc.includes("ADDITION:") && !desc.includes("REPAIR:") && !desc.includes("RENOVATION:") && !desc.includes("DEMOLITION:") && !desc.includes("OTHERS:")) {
    result.legacyText = desc;
    return result;
  }

  if (desc.includes("NEW CONSTRUCTION")) result.newConstruction = true;

  const addMatch = desc.match(/ADDITION:\s*([^;]+)/);
  if (addMatch) {
    result.addition = true;
    result.additionText = addMatch[1].trim();
  }

  const repairMatch = desc.match(/REPAIR:\s*([^;]+)/);
  if (repairMatch) {
    result.repair = true;
    result.repairText = repairMatch[1].trim();
  }

  const renoMatch = desc.match(/RENOVATION:\s*([^;]+)/);
  if (renoMatch) {
    result.renovation = true;
    result.renovationText = renoMatch[1].trim();
  }

  const demoMatch = desc.match(/DEMOLITION:\s*([^;]+)/);
  if (demoMatch) {
    result.demolition = true;
    result.demolitionText = demoMatch[1].trim();
  }

  const othersMatches = [...desc.matchAll(/OTHERS:\s*([^;]+)/g)];
  if (othersMatches.length > 0) {
    const processOthers = (matchStr: string) => {
      const parts = matchStr.split(" OF ");
      return {
        text1: parts[0]?.trim() || "",
        text2: parts[1]?.trim() || ""
      };
    };

    if (othersMatches[0]) {
      result.others1 = true;
      const res = processOthers(othersMatches[0][1]);
      result.others1Text1 = res.text1;
      result.others1Text2 = res.text2;
    }
    if (othersMatches[1]) {
      result.others2 = true;
      const res = processOthers(othersMatches[1][1]);
      result.others2Text1 = res.text1;
      result.others2Text2 = res.text2;
    }
  }

  return result;
}

function parseOccupancyUse(occupancyUse: string) {
  let category = "Residential";
  let subs: string[] = [];
  let specify = "";

  if (!occupancyUse) {
    return { category, subs, specify };
  }

  if (occupancyUse.startsWith("Other Construction - ")) {
    return {
      category: "Other Construction",
      subs: ["Specify"],
      specify: occupancyUse.replace("Other Construction - ", ""),
    };
  } else if (occupancyUse === "Other Construction") {
    return { category: "Other Construction", subs: ["Specify"], specify: "" };
  }

  const parts = occupancyUse.split(": ");
  if (parts.length >= 2) {
    category = parts[0];
    let rest = parts.slice(1).join(": ");

    const openParenIndex = rest.lastIndexOf(" (");
    const closeParenIndex = rest.lastIndexOf(")");
    if (openParenIndex !== -1 && closeParenIndex === rest.length - 1 && openParenIndex < closeParenIndex) {
      specify = rest.substring(openParenIndex + 2, closeParenIndex);
      rest = rest.substring(0, openParenIndex);
    }

    subs = rest.split(", ").map(s => s.trim()).filter(Boolean);
  } else {
    // Check if it matches category exactly, otherwise fallback
    const matchedCategory = OCCUPANCY_CATEGORIES.find(c => c.toLowerCase() === occupancyUse.toLowerCase());
    if (matchedCategory) {
      category = matchedCategory;
    } else {
      // Legacy structure or format we don't recognize
      if (occupancyUse.includes("Residential (Single Family)")) {
        category = "Residential";
        subs = ["Single"];
      } else if (occupancyUse.includes("Residential (Multi-Family)")) {
        category = "Residential";
        subs = ["Duplex"];
      } else if (occupancyUse.includes("Commercial - Retail")) {
        category = "Commercial";
        subs = ["Store"];
      } else if (occupancyUse.includes("Commercial - Office")) {
        category = "Commercial";
        subs = ["Office Condominium/Business Office Building"];
      } else if (occupancyUse.includes("Commercial - Hotel/Hospitality")) {
        category = "Commercial";
        subs = ["Hotel/Motel, etc."];
      } else if (occupancyUse.includes("Industrial")) {
        category = "Industrial";
        subs = ["Factory/Plant"];
      } else if (occupancyUse.includes("Agricultural")) {
        category = "Agricultural";
        subs = ["Barn(s), Poultry House(s), etc."];
      } else if (occupancyUse.includes("Institutional")) {
        category = "Institutional";
        subs = ["School"];
      } else {
        category = "Other Construction";
        subs = ["Specify"];
        specify = occupancyUse;
      }
    }
  }

  return { category, subs, specify };
}

function formatWithCommas(val: string | number) {
  if (val === undefined || val === null || val === "") return "";
  const numStr = String(val).replace(/,/g, "");
  if (isNaN(Number(numStr))) return String(val);
  const parts = numStr.split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(".");
}

function parseLocationString(loc: string) {
  const result = { houseNumber: "", street: "", barangay: "" };
  if (!loc) return result;

  const parts = loc.split(",").map(p => p.trim());

  const housePart = parts.find(p => p.toLowerCase().startsWith("no.") || /^\d+$/.test(p));
  if (housePart) {
    result.houseNumber = housePart.replace(/no\.\s*/i, "");
  }

  const brgyPart = parts.find(p => p.toLowerCase().startsWith("brgy.") || p.toLowerCase().startsWith("barangay"));
  if (brgyPart) {
    result.barangay = brgyPart.replace(/brgy\.\s*/i, "").replace(/barangay\s*/i, "");
  }

  const streetPart = parts.find(p =>
    p !== housePart &&
    p !== brgyPart &&
    !p.toLowerCase().includes("mapandan") &&
    !p.toLowerCase().includes("pangasinan")
  );
  if (streetPart) {
    result.street = streetPart;
  }

  return result;
}

const getEngineeringStatusLabel = (status: string) => {
  switch (status) {
    case "FOR_REQUESTING":
      return "FOR EVALUATION";
    case "FOR_REVISION":
      return "NEEDS REVISION";
    case "FOR_INSPECTION":
      return "FOR INSPECTION";
    case "FOR_REINSPECTION":
      return "FOR REINSPECTION";
    case "REJECTED":
      return "REJECTED";
    case "EVALUATED":
    case "UNPAID":
    case "PAID":
    case "FOR_PROCESSING":
    case "FOR_CLAIM":
    case "FOR_PICKING":
    case "RELEASED":
    case "DELIVERED":
      return "APPROVED";
    default:
      return status.replace(/_/g, ' ');
  }
};

const getDisplayStatusDetails = (app: any) => {
  if (app.isCancelled || app.status === "CANCELLED") {
    return { label: "CANCELLED", colorClass: "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-500" };
  }
  if (app.status === "REJECTED" || (app.status === "EVALUATED" && app.additionalData?.zoningStatus === "REJECTED")) {
    return {
      label: app.status === "REJECTED" ? "REJECTED" : "ZONING REJECTED",
      colorClass: "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-500"
    };
  }
  if (app.status === "RELEASED" || app.status === "DELIVERED") {
    return {
      label: app.status.replace(/_/g, ' '),
      colorClass: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-500"
    };
  }

  if (app.status === "EVALUATED" && app.additionalData?.zoningStatus) {
    if (app.additionalData.zoningStatus === "EVALUATED") {
      return { label: "ZONING EVALUATED", colorClass: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-500" };
    }
    return {
      label: `ZONING ${app.additionalData.zoningStatus.replace(/_/g, ' ')}`,
      colorClass: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-500"
    };
  }

  return {
    label: app.status ? app.status.replace(/_/g, ' ') : "PENDING",
    colorClass: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-500"
  };
};

export default function BuildingPermitPage() {
  const router = useRouter();
  const [themeColor, setThemeColor] = useState("var(--primary-theme)");

  useEffect(() => {
    getSystemSettingAction("theme_color").then((res) => {
      if (res.success && res.data) {
        setThemeColor(res.data);
      }
    });
  }, []);

  const [currentStep, setCurrentStep] = useState("GUIDE");
  const [hasReadGuide, setHasReadGuide] = useState(true);
  const [existingApplications, setExistingApplications] = useState<any[]>([]);
  const [existingSearchQuery, setExistingSearchQuery] = useState("");
  const [existingCurrentPage, setExistingCurrentPage] = useState(1);
  const EXISTING_ITEMS_PER_PAGE = 5;
  const [selectedApplication, setSelectedApplication] = useState<any>(null);
  const [residentData, setResidentData] = useState<any>(null);
  const [barangayList, setBarangayList] = useState<string[]>([]);
  const [brgySearchQuery, setBrgySearchQuery] = useState("");
  const [isBrgyDropdownOpen, setIsBrgyDropdownOpen] = useState(false);
  const brgyDropdownRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (brgyDropdownRef.current && !brgyDropdownRef.current.contains(event.target as Node)) {
        setIsBrgyDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredBarangays = barangayList.filter(brgy =>
    brgy.toLowerCase().includes(brgySearchQuery.toLowerCase())
  );

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRevision, setIsRevision] = useState(false);
  const [isZoningRevision, setIsZoningRevision] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentPreviewUrl, setPaymentPreviewUrl] = useState<string | null>(null);
  const [gcashReferenceNo, setGcashReferenceNo] = useState("");
  const [paymentFile, setPaymentFile] = useState<File | null>(null);

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerTitle, setViewerTitle] = useState("");
  const [viewerFile, setViewerFile] = useState<File | null>(null);

  const isEditable = !selectedApplication || isRevision || isZoningRevision;

  const isFieldRequested = (key: string) => {
    if (!isRevision && !isZoningRevision) return true;
    let requested = false;
    if (isRevision && selectedApplication?.additionalData?.revisionRequests) {
      requested = requested || selectedApplication.additionalData.revisionRequests.some((req: any) => req.key === key);
    }
    if (isZoningRevision && selectedApplication?.additionalData?.zoningRevisionRequests) {
      requested = requested || selectedApplication.additionalData.zoningRevisionRequests.some((req: any) => req.key === key);
    }
    return requested;
  };

  const effectiveDocuments = (() => {
    const docs = selectedApplication?.additionalData?.documents || {};
    if (!isRevision && !isZoningRevision) return docs;
    const filtered: Record<string, string> = {};
    const revisionKeys: string[] = [];
    const additionalData = selectedApplication?.additionalData as any;
    if (isRevision && additionalData?.revisionRequests) {
      additionalData.revisionRequests.forEach((r: any) => {
        if (r?.key) revisionKeys.push(r.key);
      });
    }
    if (isZoningRevision && additionalData?.zoningRevisionRequests) {
      additionalData.zoningRevisionRequests.forEach((r: any) => {
        if (r?.key) revisionKeys.push(r.key);
      });
    }
    for (const [k, v] of Object.entries(docs)) {
      if (revisionKeys.indexOf(k) === -1) {
        filtered[k] = v as string;
      }
    }
    return filtered;
  })();

  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [idChoice, setIdChoice] = useState<"PROFILE" | "UPLOAD">("PROFILE");
  const [activeDocTab, setActiveDocTab] = useState<"REQUIREMENTS" | "PERMITS">("REQUIREMENTS");
  const [uploadedRequirements, setUploadedRequirements] = useState<Record<number, any>>({});
  const abandonedFilesRef = React.useRef<string[]>([]);

  useEffect(() => {
    const handleUnload = () => {
      if (abandonedFilesRef.current.length > 0) {
        navigator.sendBeacon("/api/upload/cleanup", JSON.stringify({ urls: abandonedFilesRef.current }));
      }
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => {
      window.removeEventListener("beforeunload", handleUnload);
      handleUnload();
    };
  }, []);

  const [formData, setFormData] = useState({
    descriptionOfWork: "",
    scopeNewConstruction: false,
    scopeAddition: false,
    scopeAdditionText: "",
    scopeRepair: false,
    scopeRepairText: "",
    scopeRenovation: false,
    scopeRenovationText: "",
    scopeDemolition: false,
    scopeDemolitionText: "",
    scopeOthers1: false,
    scopeOthers1Text1: "",
    scopeOthers1Text2: "",
    scopeOthers2: false,
    scopeOthers2Text1: "",
    scopeOthers2Text2: "",
    descriptionOfWorkLegacyText: "",
    occupancyCategory: "",
    selectedSubOccupancies: [] as string[],
    subOccupancyOthersSpecify: "",
    estimatedCost: "",
    locationOfConstruction: "",
    locationHouseNumber: "",
    locationStreet: "",
    locationBarangay: "",
    isLotOwner: "",
    isOwnerDeceased: false,
    totalFloors: "",
    newIdFile: null as File | null,
    newIdFileBack: null as File | null,
    tctFile: null as File | null,
    occupancyUse: "Residential (Single Family)",
    otherOccupancyUse: "",
  });

  const [uploadedPermits, setUploadedPermits] = useState<Record<number, any>>({});
  const [customRequirements, setCustomRequirements] = useState<{ label: string }[]>([]);
  const [customPermits, setCustomPermits] = useState<{ label: string }[]>([]);
  const [isAddCustomDocOpen, setIsAddCustomDocOpen] = useState(false);
  const [customDocName, setCustomDocName] = useState("");

  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [duplicatePropertyWarning, setDuplicatePropertyWarning] = useState<{ isProcessing: boolean; applicantName?: string } | null>(null);

  useEffect(() => {
    const handleUnload = () => {
      if (abandonedFilesRef.current.length > 0) {
        navigator.sendBeacon("/api/upload/cleanup", JSON.stringify({ urls: abandonedFilesRef.current }));
      }
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, []);

  useEffect(() => {
    if (!formData.locationOfConstruction || formData.locationOfConstruction.trim().length < 5) {
      setDuplicatePropertyWarning(null);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      try {
        const res = await checkActivePropertyPermit(
          formData.locationOfConstruction,
          selectedApplication?.id
        );
        if (res.success && res.isProcessing) {
          setDuplicatePropertyWarning({
            isProcessing: true,
            applicantName: res.applicantName
          });
        } else {
          setDuplicatePropertyWarning(null);
        }
      } catch (err) {
        console.error(err);
      }
    }, 600);

    return () => clearTimeout(delayDebounceFn);
  }, [formData.locationOfConstruction, selectedApplication?.id]);

  useEffect(() => {
    const parts = [
      formData.locationHouseNumber ? `No. ${formData.locationHouseNumber}` : "",
      formData.locationStreet ? formData.locationStreet.trim() : "",
      formData.locationBarangay ? `Brgy. ${formData.locationBarangay}` : "",
      "Mapandan, Pangasinan"
    ].filter(Boolean);

    const combined = parts.join(", ");
    setFormData(prev => {
      if (combined !== prev.locationOfConstruction) {
        return { ...prev, locationOfConstruction: combined };
      }
      return prev;
    });
  }, [formData.locationHouseNumber, formData.locationStreet, formData.locationBarangay]);

  const hasTctFile = !!(
    formData.tctFile ||
    effectiveDocuments?.tctFile ||
    (uploadedRequirements && uploadedRequirements[2]) ||
    effectiveDocuments?.req_2
  );

  const [maxStepIdx, setMaxStepIdx] = useState(0);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);

  const prevFormDataRef = React.useRef(formData);

  useEffect(() => {
    if (prevFormDataRef.current !== formData) {
      prevFormDataRef.current = formData;
      if (privacyAccepted) {
        setPrivacyAccepted(false);
      }
    }
  }, [formData, privacyAccepted]);



  useEffect(() => {
    const currentStepIdx = STEPS.findIndex(s => s.id === currentStep);
    if (currentStepIdx > maxStepIdx) {
      setMaxStepIdx(currentStepIdx);
    }
  }, [currentStep, maxStepIdx]);

  const isOwnerDeceased = formData.isOwnerDeceased === true;
  const isAffidavitOfConsentRequired = formData.isLotOwner === "No" && !isOwnerDeceased;
  const hasMultipleFloors = parseInt(formData.totalFloors || "0", 10) > 1;
  const requiredRequirementIndexes = Array.from({ length: 25 }, (_, index) => index)
    .filter(index => {
      if ([2, 5, 8].includes(index)) return false;
      if (!isOwnerDeceased && [13, 14].includes(index)) return false;
      if (!isAffidavitOfConsentRequired && [7, 10, 11, 12].includes(index)) return false;
      if (isAffidavitOfConsentRequired && [21, 22].includes(index)) return false;
      if (!hasMultipleFloors && [23, 24].includes(index)) return false;
      return true;
    });
  const requiredRequirementsCount = requiredRequirementIndexes.length;
  const uploadedRequirementKeys = new Set([
    ...Object.keys(effectiveDocuments || {}).filter(k => k.startsWith("req_")),
    ...Object.keys(uploadedRequirements).map(k => `req_${k}`)
  ]);
  const requirementsProgress = requiredRequirementIndexes
    .filter(index => uploadedRequirementKeys.has(`req_${index}`)).length;

  const requiredPermitIndexes: number[] = [];
  const requiredPermitsCount = 4;
  const uploadedPermitKeys = new Set([
    ...Object.keys(effectiveDocuments || {}).filter(k => k.startsWith("permit_")),
    ...Object.keys(uploadedPermits).map(k => `permit_${k}`)
  ]);
  const uploadedPermitsCount = uploadedPermitKeys.size;
  const uploadedRequirementsCount = uploadedRequirementKeys.size;
  const totalRequiredItems = requiredRequirementsCount + requiredPermitsCount;
  // UPDATED: Exclude CANCELLED and isCancelled from blocking new applications
  const hasActiveApplication = existingApplications.some(app =>
    !["RELEASED", "REJECTED", "DELIVERED", "CANCELLED"].includes(app.status) && !app.isCancelled
  );

  const documentRequirementsList = [
    "Barangay Clearance/Certification",
    "Tax Declaration",
    "Land Title",
    "Community Tax Certificate",
    "Latest Tax Receipts",
    "Adjoining Owners Confirmation",
    "Locational Clearance",
    "Affidavit of Consent",
    "Affidavit of Adjoining Owners",
    "Signed & Sealed Plans",
    "Notarized Deed of Sale/Lot Locational Plan/ Contract of Lease",
    "Cedula of Lot Owner",
    "ID of Lot Owner",
    "Death Certificate of Lot Owner",
    "Birth Certificate of Heirs of Deceased Owner",
    "Valid Licenses (PRC I.D.) of Involved Professionals",
    "Duly Notarized Estimated Value of Building/Structure",
    "Duly Notarized Technical Specification",
    "Construction Safety and Health Program From DOLE",
    "Construction Logbook duly signed by Civil Engineer/Architect in-charge of Construction",
    "Affidavit of Undertaking",
    "Cedula of Applicant",
    "ID of applicant with 3 signatures",
    "Structural Analysis and Design",
    "Soil Boring Test"
  ];

  const permitTypesList = [
    "Electrical Documents",
    "Plumbing Documents",
    "Sanitary Documents",
    "Excavation & Ground Preparation Documents",
    "Fencing Documents",
    "Scaffolding Documents",
    "Mechanical Documents",
    "Architectural Documents",
    "Civil/Structural Documents",
    "Electronics Documents",
    "Geodetic Documents",
    "Fire Protection Plan"
  ];

  useEffect(() => {
    async function init() {
      try {
        const [res, permitsRes, brgyRes] = await Promise.all([
          getCurrentUserResident(),
          getExistingBuildingPermits(),
          getBarangaysAction()
        ]);
        if (res.success && res.data) {
          setResidentData(res.data);
        }
        if (permitsRes.success && permitsRes.data.length > 0) {
          setExistingApplications(permitsRes.data);
          setCurrentStep("EXISTING");
        }
        if (brgyRes.success && brgyRes.data) {
          setBarangayList(brgyRes.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);



  useEffect(() => {
    if (selectedApplication) {
      const addData = selectedApplication.additionalData as any || {};
      const parsedOccupancy = parseOccupancyUse(addData.occupancyUse || "");
      const parsedDesc = parseDescriptionOfWork(addData.descriptionOfWork || "");
      const parsedLoc = parseLocationString(addData.locationOfConstruction || "");
      setFormData({
        descriptionOfWork: addData.descriptionOfWork || "",
        scopeNewConstruction: parsedDesc.newConstruction,
        scopeAddition: parsedDesc.addition,
        scopeAdditionText: parsedDesc.additionText,
        scopeRepair: parsedDesc.repair,
        scopeRepairText: parsedDesc.repairText,
        scopeRenovation: parsedDesc.renovation,
        scopeRenovationText: parsedDesc.renovationText,
        scopeDemolition: parsedDesc.demolition,
        scopeDemolitionText: parsedDesc.demolitionText,
        scopeOthers1: parsedDesc.others1,
        scopeOthers1Text1: parsedDesc.others1Text1,
        scopeOthers1Text2: parsedDesc.others1Text2,
        scopeOthers2: parsedDesc.others2,
        scopeOthers2Text1: parsedDesc.others2Text1,
        scopeOthers2Text2: parsedDesc.others2Text2,
        descriptionOfWorkLegacyText: parsedDesc.legacyText,
        occupancyCategory: parsedOccupancy.category,
        selectedSubOccupancies: parsedOccupancy.subs,
        subOccupancyOthersSpecify: parsedOccupancy.specify,
        estimatedCost: addData.estimatedCost || "",
        locationOfConstruction: addData.locationOfConstruction || "",
        locationHouseNumber: parsedLoc.houseNumber,
        locationStreet: parsedLoc.street,
        locationBarangay: parsedLoc.barangay,
        isLotOwner: addData.isLotOwner || "",
        isOwnerDeceased: addData.isOwnerDeceased || false,
        totalFloors: addData.totalFloors !== undefined ? String(addData.totalFloors) : "",
        newIdFile: null,
        newIdFileBack: null,
        tctFile: null,
        occupancyUse: addData.occupancyUse || "",
        otherOccupancyUse: parsedOccupancy.specify,
      });
      if (addData.signature) {
        setSignatureUrl(addData.signature);
      }
      if (addData.documents?.newIdFile) {
        setIdChoice("UPLOAD");
      } else {
        setIdChoice("PROFILE");
      }

      // Load custom requirements
      const docs = addData.documents || {};
      const labels = addData.customLabels || {};

      const loadedReqs: { label: string }[] = [];
      Object.keys(docs).forEach(key => {
        if (key.startsWith("req_")) {
          const idx = parseInt(key.replace("req_", ""), 10);
          if (idx >= documentRequirementsList.length) {
            const label = labels[key] || `Additional Document ${idx - documentRequirementsList.length + 1}`;
            loadedReqs[idx - documentRequirementsList.length] = { label };
          }
        }
      });
      const finalReqs: { label: string }[] = [];
      for (let i = 0; i < loadedReqs.length; i++) {
        finalReqs.push(loadedReqs[i] || { label: `Additional Document ${i + 1}` });
      }
      setCustomRequirements(finalReqs);

      // Load custom permits
      const loadedPermits: { label: string }[] = [];
      Object.keys(docs).forEach(key => {
        if (key.startsWith("permit_")) {
          const idx = parseInt(key.replace("permit_", ""), 10);
          if (idx >= permitTypesList.length) {
            const label = labels[key] || `Additional Document ${idx - permitTypesList.length + 1}`;
            loadedPermits[idx - permitTypesList.length] = { label };
          }
        }
      });
      const finalPermits: { label: string }[] = [];
      for (let i = 0; i < loadedPermits.length; i++) {
        finalPermits.push(loadedPermits[i] || { label: `Additional Document ${i + 1}` });
      }
      setCustomPermits(finalPermits);
    } else {
      setCustomRequirements([]);
      setCustomPermits([]);
    }
  }, [selectedApplication, documentRequirementsList.length, permitTypesList.length]);

  const handleAddCustomDocument = () => {
    setCustomDocName("");
    setIsAddCustomDocOpen(true);
  };

  const handleConfirmAddCustomDoc = () => {
    if (!customDocName || !customDocName.trim()) return;

    if (activeDocTab === "REQUIREMENTS") {
      setCustomRequirements(prev => [...prev, { label: customDocName.trim() }]);
    } else {
      setCustomPermits(prev => [...prev, { label: customDocName.trim() }]);
    }
    setIsAddCustomDocOpen(false);
  };



  const handlePaymentFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
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
      setPaymentFile(fileToProcess);
      setPaymentPreviewUrl(URL.createObjectURL(fileToProcess));
    }
  };

  const handleSubmitPaymentProof = async () => {
    if (!paymentFile || !selectedApplication) return;
    const toastId = toast.loading("Uploading Payment Receipt...");
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("paymentFile", paymentFile);
      if (gcashReferenceNo) {
        formData.append("gcashReferenceNo", gcashReferenceNo.trim());
      }
      const res = await submitBuildingPermitPaymentProof(selectedApplication.id, formData);
      if (res.success) {
        toast.success("Payment Receipt uploaded successfully! Waiting for Treasury verification.", { id: toastId });
        setIsPaymentModalOpen(false);
        setPaymentFile(null);
        setPaymentPreviewUrl(null);
        setGcashReferenceNo("");

        // Refresh application data
        const appsRes = await getExistingBuildingPermits();
        if (appsRes.success && appsRes.data) {
          setExistingApplications(appsRes.data);
          const updated = appsRes.data.find((a: any) => a.id === selectedApplication.id);
          if (updated) setSelectedApplication(updated);
        }
      } else {
        toast.error(res.error || "Failed to upload payment receipt.", { id: toastId });
      }
    } catch {
      toast.error("An error occurred while submitting payment.", { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const requirements = [
    {
      id: 1,
      title: "Plans duly signed & sealed by licensed professional",
      office: "Licensed Professionals",
      icon: <Ruler className="w-5 h-5 text-slate-500" />,
      steps: [
        "Hire a licensed Architect for architectural plans and licensed Civil/Structural Engineer for structural plans.",
        "Provide them with your lot survey, dimensions, and design preferences.",
        "The professional will prepare the plans based on the National Building Code standards.",
        "Ensure the plans are signed and have the official PRC seal (dry seal or digital).",
        "Request multiple copies (usually 3 sets) for submission to different offices."
      ],
      infoType: "tip",
      infoLabel: "Professional Fee",
      infoText: "Varies based on floor area and complexity. Typically 3-5% of project cost."
    },
    {
      id: 2,
      title: "Certified true copy of Tax Declaration",
      office: "Assessor's Office",
      icon: <FileText className="w-5 h-5 text-slate-400" />,
      steps: [
        "Go to the Municipal Assessor's Office at the Municipal Hall, Mapandan.",
        "Request for a \"Certified True Copy of Tax Declaration\" for your property.",
        "Provide the Tax Declaration number or the lot owner's name and location.",
        "Pay the certification fee at the Treasury Office (usually ₱50-₱100).",
        "Return to Assessor's Office with official receipt to claim the certified document."
      ],
      infoType: "time",
      infoLabel: "Processing time",
      infoText: "1-2 hours to 1 day. Bring a valid ID."
    },
    {
      id: 3,
      title: "Xerox copy of Land Title",
      office: "Register of Deeds",
      icon: <Home className="w-5 h-5 text-orange-400" />,
      steps: [
        "Go to the Registry of Deeds (usually located at the Provincial Capitol or nearby city).",
        "Fill out a request form for a certified true copy of your Transfer Certificate of Title (TCT).",
        "Provide the TCT number and lot details.",
        "Pay the reproduction and certification fee (₱100-₱200 depending on pages).",
        "Claim the certified true copy (processing may take 1-3 days)."
      ],
      infoType: "note",
      infoLabel: "Note",
      infoText: "If you only have the owner's copy, you can have it photocopied and notarized as a substitute."
    },
    {
      id: 4,
      title: "Community Tax Certificate (Cedula)",
      office: "Treasury Office",
      icon: <ClipboardList className="w-5 h-5 text-red-400" />,
      steps: [
        "Go to the Municipal Treasury Office at the Mapandan Municipal Hall.",
        "Request for a Community Tax Certificate (Cedula).",
        "Provide your name, address, and declare your annual income (for tax classification).",
        "Pay the community tax (₱5.00 basic + ₱1.00 for every ₱1,000 income, minimum ₱10-₱20).",
        "Receive your Cedula immediately."
      ],
      infoType: "time",
      infoLabel: "Processing time",
      infoText: "5-10 minutes. Valid for one calendar year."
    },
    {
      id: 5,
      title: "Latest Tax receipts (Real Property Tax)",
      office: "Treasury Office",
      icon: <Wallet className="w-5 h-5 text-amber-500" />,
      steps: [
        "Go to the Municipal Treasury Office, Tax Payment Section.",
        "Request for your real property tax account details using your Tax Declaration number.",
        "Pay any outstanding real property tax for the current year.",
        "Secure the Official Receipt as proof of payment.",
        "Request for a Certified True Copy of Tax Clearance if needed (additional fee)."
      ],
      infoType: "important",
      infoLabel: "Important",
      infoText: "Taxes must be fully paid for the current year before permit issuance."
    },
    {
      id: 6,
      title: "Electrical & Sanitary permit",
      office: "Municipal Health Office",
      icon: <Zap className="w-5 h-5 text-yellow-500" />,
      steps: [
        "Go to the Municipal Health Office (MHO) at the Municipal Hall.",
        "Submit your Electrical and Sanitary/Plumbing plans (already signed by licensed professionals).",
        "Fill out the application forms for Electrical and Sanitary permits.",
        "The Health Officer/Sanitary Inspector will review the plans (checking for proper sewage, water lines).",
        "Pay the corresponding fees at the Treasury Office and return the receipt to MHO.",
        "Claim the approved Electrical and Sanitary permits."
      ],
      infoType: "note",
      infoLabel: "Sanitary Fee",
      infoText: "Based on number of plumbing fixtures. Electrical fee based on load/computation."
    },
    {
      id: 7,
      title: "Confirmation of adjoining lot owners",
      office: "Adjoining Lot Owners",
      icon: <Users className="w-5 h-5 text-blue-500" />,
      steps: [
        "Identify all adjacent property owners (left, right, rear, and front if applicable).",
        "Prepare a document (Confirmation/Affidavit of Adjoining Owners) stating they have no objection to your construction.",
        "Visit each adjoining owner personally to explain your planned construction.",
        "Have them sign the document in the presence of a notary public or barangay official.",
        "If any owner is unavailable or refuses, you may need to secure a barangay certification of posting instead."
      ],
    },
    {
      id: 8,
      title: "Certification from Barangay Captain",
      office: "Barangay Hall",
      icon: <Scroll className="w-5 h-5 text-stone-500" />,
      steps: [
        "Go to the Barangay Hall where your property is located (e.g., Brgy. Poblacion).",
        "Request for a \"Barangay Clearance for Building Construction\" or \"Certification\".",
        "Fill out the application form and provide details of your construction project.",
        "Pay the barangay clearance fee (usually ₱50-₱100 depending on barangay ordinance).",
        "The Barangay Captain or Secretary will issue the certification after verification."
      ],
      infoType: "time",
      infoLabel: "Validity",
      infoText: "Usually valid for 30-60 days. Process within 1 day."
    },
    {
      id: 9,
      title: "Application for locational clearance",
      office: "Zoning Office / MPDC",
      icon: <MapPin className="w-5 h-5 text-red-500" />,
      steps: [
        "Go to the Municipal Planning & Development Coordinator (MPDC) / Zoning Office.",
        "Secure and fill out the Locational Clearance application form.",
        "Submit the following: lot plan, vicinity map, and proof of ownership.",
        "The Zoning Officer will check if your project is compliant with the Comprehensive Land Use Plan (CLUP) and zoning ordinance.",
        "Pay the zoning fee (varies based on floor area and classification).",
        "Claim the Locational Clearance (processing may take 2-5 days)."
      ],
      infoType: "note",
      infoLabel: "Note",
      infoText: "Commercial and industrial projects have stricter zoning requirements."
    },
    {
      id: 10,
      title: "2 Affidavits",
      office: "Notary Public",
      icon: <FileSignature className="w-5 h-5 text-slate-500" />,
      steps: [
        "Prepare the draft affidavits (usually Affidavit of Non-Tenancy and Affidavit of Undertaking).",
        "Look for a Notary Public near the Municipal Hall or in the town proper.",
        "Bring your valid ID and the draft affidavits.",
        "Sign the affidavits in the presence of the notary public.",
        "Pay the notarization fee (₱100-₱200 per affidavit)."
      ],
      infoType: "important",
      infoLabel: "Purpose",
      infoText: "Affidavit of Non-Tenancy declares no tenants will be displaced; Affidavit of Undertaking promises to comply with building rules."
    },
    {
      id: 11,
      title: "Affidavit of consent (if applicant is not the owner)",
      office: "Notary Public",
      icon: <PenTool className="w-5 h-5 text-slate-500" />,
      steps: [
        "The lot owner must prepare a document authorizing you (the applicant) to apply for a building permit.",
        "Go together with the owner to a Notary Public (or the owner can go alone with your name/details).",
        "The owner signs the Affidavit of Consent/Authority to Apply for Building Permit.",
        "The notary public notarizes the document after verifying the owner's identity.",
        "Pay the notarization fee (₱100-₱200). Secure the original notarized copy."
      ],
      infoType: "important",
      infoLabel: "Required if",
      infoText: "You are a tenant, lessee, or developer building on someone else's land."
    },
    {
      id: 12,
      title: "Affidavit of adjoining lot owners",
      office: "Adjoining Lot Owners / Notary",
      icon: <Handshake className="w-5 h-5 text-blue-500" />,
      steps: [
        "Similar to the Confirmation of adjoining lot owners, but this is a formal sworn affidavit.",
        "Prepare an \"Affidavit of Adjoining Lot Owners\" stating they have no objection.",
        "Visit each adjoining owner and have them sign the affidavit.",
        "Bring the signed document to a Notary Public for notarization.",
        "The notary will administer oath and affix notarial seal."
      ],
      infoType: "note",
      infoLabel: "Legal weight",
      infoText: "A notarized affidavit is stronger evidence than a simple confirmation."
    },
    {
      id: 13,
      title: "Zoning Clearance (Post-Payment)",
      office: "Zoning Office / MPDC",
      icon: <MapPin className="w-5 h-5 text-emerald-500" />,
      steps: [
        "Go to the Zoning Office / MPDC at the Municipal Hall after your initial building permit payment is verified.",
        "Present your building permit payment receipt (Official Receipt) to the Zoning Officer.",
        "Submit the completed Locational Clearance form along with other required attachments.",
        "Claim the signed Zoning Clearance certificate."
      ],
      infoType: "important",
      infoLabel: "Post-Payment Requirement",
      infoText: "Required for Engineering final approval. Zoning clearance must be obtained after paying your initial fees."
    },
    {
      id: 14,
      title: "BFP Fire Safety Clearance (FSEC) (Post-Payment)",
      office: "Bureau of Fire Protection (BFP)",
      icon: <Flame className="w-5 h-5 text-red-500" />,
      steps: [
        "Submit your building plans and sanitary plans to the Bureau of Fire Protection (BFP) office.",
        "Pay the Fire Code Fee at the Municipal Treasury Office or directly to the BFP section.",
        "BFP officers will evaluate the plans for compliance with the Fire Code of the Philippines.",
        "Claim the Fire Safety Evaluation Clearance (FSEC) / BFP Clearance certificate."
      ],
      infoType: "important",
      infoLabel: "Post-Payment Requirement",
      infoText: "Required for Engineering final approval. Ensure fire safety guidelines are properly integrated in the plans."
    }
  ];

  const [isCancelling, setIsCancelling] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const confirmCancel = async () => {
    if (!selectedApplication) return;
    setIsCancelling(true);
    try {
      const res = await cancelTransaction(selectedApplication.id);
      if (res.success) {
        toast.success("Application successfully cancelled.");

        // Refresh permits list and update states
        const permitsRes = await getExistingBuildingPermits();
        if (permitsRes.success) {
          setExistingApplications(permitsRes.data);
          const updatedApp = permitsRes.data.find((a: any) => a.id === selectedApplication.id);
          if (updatedApp) {
            setSelectedApplication(updatedApp);
          }
        }
      } else {
        toast.error(res.error || "Failed to cancel application.");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred while cancelling the application.");
    } finally {
      setIsCancelling(false);
    }
  };

  const dataURLtoFile = (dataurl: string, filenameWithoutExt: string): File | null => {
    try {
      const arr = dataurl.split(',');
      const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
      const ext = mime.includes('pdf') ? 'pdf' : (mime.split('/')[1] || 'png');
      const filename = `${filenameWithoutExt}.${ext}`;
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

  const uploadFileClientSide = async (
    file: File | null,
    keyName: string,
    target: { signedUrl: string; publicUrl: string }
  ): Promise<string | null> => {
    if (!file) return null;
    try {
      const fileToUpload = file.type.startsWith("image/") ? await compressImage(file) : file;
      const uploadRes = await fetch(target.signedUrl, {
        method: "PUT",
        headers: {
          "Content-Type": fileToUpload.type
        },
        body: fileToUpload
      });

      if (!uploadRes.ok) {
        throw new Error(`Upload direct to storage failed: ${uploadRes.statusText}`);
      }

      return target.publicUrl;
    } catch (err) {
      console.error(`Failed uploading ${keyName}:`, err);
      throw new Error(`Failed to upload ${file.name}`);
    }
  };

  const handleSubmit = async () => {
    if (requirementsProgress < requiredRequirementsCount || uploadedPermitsCount < 4 || !signatureUrl || !privacyAccepted) {
      setShowValidationErrors(true);
      if (requirementsProgress < requiredRequirementsCount) {
        toast.warning(`Please ensure ALL ${requiredRequirementsCount} required documents are provided.`);
        setActiveDocTab("REQUIREMENTS");
      } else if (uploadedPermitsCount < 4) {
        toast.warning(`Please upload 4 or more permits to proceed.`);
        setActiveDocTab("PERMITS");
      } else if (!signatureUrl) {
        toast.warning("Please provide your digital signature before submitting.");
      } else {
        toast.warning("Please accept the Data Privacy and Terms Agreement.");
      }
      return;
    }

    setIsSubmitting(true);
    try {
      toast.loading("Submitting application...", { id: "bp-upload-toast" });
      const displayResident = selectedApplication?.residentSnapshot || residentData;
      const uploadJobs: Array<() => Promise<void>> = [];
      const uploadRequests: Array<{ fieldName: string; fileExt: string }> = [];
      const uploadTargets: Array<{ signedUrl: string; publicUrl: string }> = [];
      const queueUpload = (
        file: File,
        folder: string,
        keyName: string,
        onUploaded: (url: string | null) => void
      ) => {
        const targetIndex = uploadRequests.length;
        uploadRequests.push({
          fieldName: `${folder}_${keyName}`,
          fileExt: file.name.split(".").pop() || "bin"
        });
        uploadJobs.push(async () => {
          const target = uploadTargets[targetIndex];
          if (!target) throw new Error("Missing secure upload destination");
          onUploaded(await uploadFileClientSide(file, keyName, target));
        });
      };

      // 1. Upload ID
      let idFileUrl: string | null = null;
      let idBackFileUrl: string | null = null;
      if (idChoice === "UPLOAD") {
        if (formData.newIdFile) {
          queueUpload(formData.newIdFile, "ids", "newIdFile", url => { idFileUrl = url; });
        } else if (effectiveDocuments?.newIdFile) {
          idFileUrl = effectiveDocuments.newIdFile;
        }
        if (formData.newIdFileBack) {
          queueUpload(formData.newIdFileBack, "ids", "newIdFileBack", url => { idBackFileUrl = url; });
        } else if (effectiveDocuments?.newIdFileBack) {
          idBackFileUrl = effectiveDocuments.newIdFileBack;
        }
      } else if (idChoice === "PROFILE") {
        const profileIdUrl = displayResident?.idFrontUrl || displayResident?.idBackUrl;
        if (profileIdUrl) {
          if (profileIdUrl.startsWith("data:")) {
            const file = dataURLtoFile(profileIdUrl, "profile_id");
            if (file) {
              queueUpload(file, "ids", "newIdFile", url => { idFileUrl = url; });
            }
          } else if (profileIdUrl.startsWith("http")) {
            idFileUrl = profileIdUrl;
          }
        }
        const profileIdBackUrl = displayResident?.idBackUrl;
        if (profileIdBackUrl) {
          if (profileIdBackUrl.startsWith("data:")) {
            const file = dataURLtoFile(profileIdBackUrl, "profile_id_back");
            if (file) {
              queueUpload(file, "ids", "newIdFileBack", url => { idBackFileUrl = url; });
            }
          } else if (profileIdBackUrl.startsWith("http")) {
            idBackFileUrl = profileIdBackUrl;
          }
        }
      }

      // 2. Upload TCT
      let tctFileUrl: string | null = null;
      if (formData.tctFile) {
        queueUpload(formData.tctFile, "tct", "tctFile", url => { tctFileUrl = url; });
      } else if (effectiveDocuments?.tctFile) {
        tctFileUrl = effectiveDocuments.tctFile;
      }

      // 3. Upload Requirements
      const finalReqUrls: Record<string, string> = {};
      for (let i = 0; i < 25; i++) {
        if (i === 5) continue;
        if (!isAffidavitOfConsentRequired && [7, 10, 11, 12, 13, 14].includes(i)) continue;
        if (isAffidavitOfConsentRequired && [21, 22].includes(i)) continue;
        if (!hasMultipleFloors && [23, 24].includes(i)) continue;

        const file = uploadedRequirements[i];
        if (file) {
          if (typeof file === "string") {
            finalReqUrls[`req_${i}`] = file;
          } else {
            queueUpload(file, "requirements", `req_${i}`, url => {
              if (url) finalReqUrls[`req_${i}`] = url;
            });
          }
        } else {
          const existingUrl = effectiveDocuments?.[`req_${i}`];
          if (existingUrl) finalReqUrls[`req_${i}`] = existingUrl;
        }
      }
      // Process custom requirements (index >= 25)
      for (const idxStr of Object.keys(uploadedRequirements)) {
        const idx = parseInt(idxStr, 10);
        if (idx >= 25) {
          const file = uploadedRequirements[idx];
          if (file) {
            if (typeof file === "string") {
              finalReqUrls[`req_${idx}`] = file;
            } else {
              queueUpload(file, "requirements", `req_${idx}`, url => {
                if (url) finalReqUrls[`req_${idx}`] = url;
              });
            }
          }
        }
      }
      if (effectiveDocuments) {
        Object.entries(effectiveDocuments).forEach(([key, url]) => {
          if (key.startsWith("req_")) {
            const idx = parseInt(key.replace("req_", ""), 10);
            if (idx >= 25 && !finalReqUrls[key] && url) {
              finalReqUrls[key] = url as string;
            }
          }
        });
      }

      // 4. Upload Permits
      const finalPermitUrls: Record<string, string> = {};
      for (let i = 0; i < 7; i++) {
        const file = uploadedPermits[i];
        if (file) {
          if (typeof file === "string") {
            finalPermitUrls[`permit_${i}`] = file;
          } else {
            queueUpload(file, "permits", `permit_${i}`, url => {
              if (url) finalPermitUrls[`permit_${i}`] = url;
            });
          }
        } else {
          const existingUrl = effectiveDocuments?.[`permit_${i}`];
          if (existingUrl) finalPermitUrls[`permit_${i}`] = existingUrl;
        }
      }
      // Process custom permits (index >= 7)
      for (const idxStr of Object.keys(uploadedPermits)) {
        const idx = parseInt(idxStr, 10);
        if (idx >= 7) {
          const file = uploadedPermits[idx];
          if (file) {
            if (typeof file === "string") {
              finalPermitUrls[`permit_${idx}`] = file;
            } else {
              queueUpload(file, "permits", `permit_${idx}`, url => {
                if (url) finalPermitUrls[`permit_${idx}`] = url;
              });
            }
          }
        }
      }
      if (effectiveDocuments) {
        Object.entries(effectiveDocuments).forEach(([key, url]) => {
          if (key.startsWith("permit_")) {
            const idx = parseInt(key.replace("permit_", ""), 10);
            if (idx >= 7 && !finalPermitUrls[key] && url) {
              finalPermitUrls[key] = url as string;
            }
          }
        });
      }

      if (uploadRequests.length > 0) {
        const batchResult = await getSecureUploadUrlsAction(uploadRequests, "building_permits");
        if (!batchResult.success || batchResult.data.length !== uploadRequests.length) {
          throw new Error(batchResult.error || "Failed to allocate secure upload destinations");
        }
        uploadTargets.push(...batchResult.data);
      }

      await mapWithConcurrency(uploadJobs, 4, job => job());

      const customLabels: Record<string, string> = {};
      const existingLabels = selectedApplication?.additionalData?.customLabels || {};
      Object.assign(customLabels, existingLabels);
      customRequirements.forEach((req, idx) => {
        customLabels[`req_${10 + idx}`] = req.label;
      });
      customPermits.forEach((permit, idx) => {
        customLabels[`permit_${7 + idx}`] = permit.label;
      });

      const data = new FormData();
      const parts: string[] = [];
      if (formData.scopeNewConstruction) parts.push("NEW CONSTRUCTION");
      if (formData.scopeAddition) parts.push(`ADDITION: ${formData.scopeAdditionText}`);
      if (formData.scopeRepair) parts.push(`REPAIR: ${formData.scopeRepairText}`);
      if (formData.scopeRenovation) parts.push(`RENOVATION: ${formData.scopeRenovationText}`);
      if (formData.scopeOthers1) parts.push(`OTHERS: ${formData.scopeOthers1Text1} OF ${formData.scopeOthers1Text2}`);
      if (formData.scopeOthers2) parts.push(`OTHERS: ${formData.scopeOthers2Text1} OF ${formData.scopeOthers2Text2}`);
      if (formData.descriptionOfWorkLegacyText) parts.push(formData.descriptionOfWorkLegacyText);
      const finalDescription = parts.join("; ");
      data.append("descriptionOfWork", finalDescription);

      const finalOccupancy = formData.occupancyCategory === "Other Construction"
        ? `Other Construction - ${formData.subOccupancyOthersSpecify}`
        : `${formData.occupancyCategory}: ${formData.selectedSubOccupancies.join(", ")}${formData.selectedSubOccupancies.includes("Others (Specify)") ? ` (${formData.subOccupancyOthersSpecify})` : ""}`;
      data.append("occupancyUse", finalOccupancy);

      data.append("estimatedCost", formData.estimatedCost);
      data.append("locationOfConstruction", formData.locationOfConstruction);
      data.append("isLotOwner", formData.isLotOwner);
      data.append("isOwnerDeceased", formData.isOwnerDeceased ? "true" : "false");
      data.append("houseNumber", formData.locationHouseNumber);
      data.append("street", formData.locationStreet);
      data.append("barangay", formData.locationBarangay);
      data.append("totalFloors", formData.totalFloors);

      if (idFileUrl) {
        data.append("newIdFile", idFileUrl);
      }
      if (idBackFileUrl) {
        data.append("newIdFileBack", idBackFileUrl);
      }
      if (tctFileUrl) {
        data.append("tctFile", tctFileUrl);
      }

      Object.entries(finalReqUrls).forEach(([key, url]) => {
        data.append(key, url);
      });
      Object.entries(finalPermitUrls).forEach(([key, url]) => {
        data.append(key, url);
      });
      data.append("customLabels", JSON.stringify(customLabels));

      let result;
      if (isRevision && selectedApplication) {
        result = await resubmitBuildingPermit(selectedApplication.id, data);
      } else {
        result = await submitBuildingPermit(data);
      }

      if (result.success) {
        if (signatureUrl) {
          await saveTransactionSignature(result.transactionId!, signatureUrl);
        }
        abandonedFilesRef.current = [];
        // Fetch the updated data so the application becomes read-only and back button works
        const permitsRes = await getExistingBuildingPermits();
        if (permitsRes.success) {
          setExistingApplications(permitsRes.data);
          const newApp = permitsRes.data.find((a: any) => a.id === result.transactionId);
          if (newApp) setSelectedApplication(newApp);
        }
        toast.success("Building Permit application submitted successfully!", { id: "bp-upload-toast" });
        setCurrentStep("EVALUATION");
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        toast.error(result.error || "Failed to submit.", { id: "bp-upload-toast" });
      }
    } catch (error) {
      console.error(error);
      toast.error("An error occurred during submission.", { id: "bp-upload-toast" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-0 pb-8 space-y-12 pb-32 font-sans">
      <SecureIdleTimer />
      <DocumentViewerModal
        isOpen={viewerOpen}
        onClose={() => { setViewerOpen(false); setViewerFile(null); setViewerUrl(null); }}
        file={viewerFile}
        fileUrl={viewerUrl}
        title={viewerTitle}
        themeColor="var(--primary-theme)"
      />

      {/* Header / Breadcrumb */}
      <div className="space-y-4 md:space-y-10">
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
                <BreadcrumbPage className="text-[10px] font-black uppercase tracking-widest italic text-primary">Building Permit</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6 px-1 md:px-0">
          <div className="space-y-1 md:space-y-2">
            <h1 className="text-4xl md:text-7xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none select-none">
              BUILDING <span className="text-primary underline decoration-[6px] md:decoration-8 decoration-primary/20 underline-offset-[6px] md:underline-offset-[12px]">PERMIT</span>
            </h1>
            <p className="text-[9px] md:text-[11px] font-bold text-slate-400 uppercase tracking-[0.4em] ml-1 md:ml-2 italic">Construction & Building Compliance Portal</p>
          </div>
        </div>
      </div>

      {/* Progress Stepper */}
      {!loading && currentStep !== "EXISTING" && (() => {
        let allowedMaxIdx = 5;
        if (selectedApplication) {
          if (["FOR_CLAIM", "FOR_PICKING", "RELEASED", "DELIVERED"].includes(selectedApplication.status)) {
            allowedMaxIdx = 5;
          } else if (["UNPAID", "PAID", "TREASURY_REVISION", "FOR_PROCESSING"].includes(selectedApplication.status)) {
            allowedMaxIdx = 4;
          } else {
            allowedMaxIdx = 3;
          }
        }
        return (
          <div className="grid grid-cols-6 gap-1.5 md:gap-4 relative px-1 md:px-2">
            {STEPS.map((step, idx) => {
              const isActive = currentStep === step.id;
              const isCompleted = idx <= Math.min(maxStepIdx, allowedMaxIdx);
              const Icon = step.icon;
              return (
                <div
                  key={idx}
                  onClick={() => {
                    if (isCompleted) {
                      setCurrentStep(step.id);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }
                  }}
                  className={cn(
                    "flex flex-col items-center gap-2 md:gap-3 relative z-10 font-black cursor-pointer group",
                    !isCompleted && "cursor-not-allowed opacity-50"
                  )}
                >
                  <div className={cn(
                    "w-11 h-11 md:w-16 md:h-16 rounded-xl md:rounded-2xl flex items-center justify-center transition-all duration-500 border-2",
                    isActive ? "bg-primary text-white border-primary shadow-[0_0_20px_rgba(var(--primary),0.3)] scale-105 md:scale-110" :
                      isCompleted ? "" :
                        "bg-slate-100 dark:bg-white/5 text-slate-400 border-transparent group-hover:border-primary/30"
                  )}
                    style={isCompleted && !isActive ? {
                      backgroundColor: themeColor.startsWith("#") ? `${themeColor}1a` : `rgba(var(--primary), 0.1)`,
                      color: themeColor,
                      borderColor: themeColor.startsWith("#") ? `${themeColor}4d` : `rgba(var(--primary), 0.3)`,
                    } : undefined}>
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
        );
      })()}

      {/* Main Content Area */}
      <div className="mt-4 md:mt-8 md:bg-white md:dark:bg-[#11131a] md:rounded-[2.5rem] md:border md:border-slate-200 md:dark:border-white/10 p-0 md:p-12 md:shadow-2xl relative md:overflow-hidden group/container min-h-[400px] md:min-h-[500px] flex flex-col">

        {loading && (
          <div className="flex-1 min-h-[400px] md:min-h-[500px] flex items-center justify-center animate-in fade-in duration-300">
            <div className="flex flex-col items-center gap-5 text-center">
              <div className="w-20 h-20 rounded-3xl border border-primary/20 bg-primary/10 text-primary flex items-center justify-center shadow-xl shadow-primary/10 animate-pulse">
                <Hourglass className="w-9 h-9" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl md:text-3xl font-black italic uppercase tracking-tight text-slate-900 dark:text-white">
                  Loading Building Permit
                </h2>
                <p className="text-xs md:text-sm font-medium uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400">
                  Checking your existing applications...
                </p>
              </div>
            </div>
          </div>
        )}

        {!loading && currentStep === "EXISTING" && (() => {
          const handleStartNewApp = () => {
            setSelectedApplication(null);
            setSignatureUrl(null);
            setFormData({
              descriptionOfWork: "",
              scopeNewConstruction: false,
              scopeAddition: false,
              scopeAdditionText: "",
              scopeRepair: false,
              scopeRepairText: "",
              scopeRenovation: false,
              scopeRenovationText: "",
              scopeDemolition: false,
              scopeDemolitionText: "",
              scopeOthers1: false,
              scopeOthers1Text1: "",
              scopeOthers1Text2: "",
              scopeOthers2: false,
              scopeOthers2Text1: "",
              scopeOthers2Text2: "",
              descriptionOfWorkLegacyText: "",
              occupancyCategory: "",
              selectedSubOccupancies: [],
              subOccupancyOthersSpecify: "",
              estimatedCost: "",
              locationOfConstruction: "",
              locationHouseNumber: "",
              locationStreet: "",
              locationBarangay: "",
              isLotOwner: "",
              isOwnerDeceased: false,
              totalFloors: "",
              newIdFile: null,
              newIdFileBack: null,
              tctFile: null,
              occupancyUse: "Residential (Single Family)",
              otherOccupancyUse: "",
            });
            setUploadedRequirements({});
            setUploadedPermits({});
            setCurrentStep("GUIDE");
          };

          const filteredApps = existingApplications.filter(app => {
            if (!existingSearchQuery.trim()) return true;
            const q = existingSearchQuery.toLowerCase().trim();
            const idMatch = app.id?.toLowerCase().includes(q);
            const locationMatch = app.additionalData?.locationOfConstruction?.toLowerCase().includes(q);
            const statusDetails = getDisplayStatusDetails(app);
            const statusMatch = statusDetails.label?.toLowerCase().includes(q) || app.status?.toLowerCase().includes(q);
            return idMatch || locationMatch || statusMatch;
          });

          const totalPages = Math.ceil(filteredApps.length / EXISTING_ITEMS_PER_PAGE) || 1;
          const paginatedApps = filteredApps.slice(
            (existingCurrentPage - 1) * EXISTING_ITEMS_PER_PAGE,
            existingCurrentPage * EXISTING_ITEMS_PER_PAGE
          );

          return (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
              {/* Header with Relocated Primary Action */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/40 dark:bg-white/5 backdrop-blur-md border border-slate-200 dark:border-white/10 p-6 md:p-8 rounded-3xl shadow-sm">
                <div>
                  <h2 className="text-2xl md:text-4xl font-black italic uppercase tracking-tighter leading-tight text-slate-900 dark:text-white">
                    Application <span className="text-primary italic">History</span>
                  </h2>
                  <p className="text-slate-500 font-medium italic text-xs md:text-sm uppercase tracking-widest mt-1">
                    Comprehensive record of your past and active Building Permit applications.
                  </p>
                </div>
                <button
                  onClick={handleStartNewApp}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3.5 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2.5 transition-all shadow-lg shadow-emerald-500/20 shrink-0 self-start md:self-auto cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>Start New Application</span>
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={existingSearchQuery}
                  onChange={(e) => {
                    setExistingSearchQuery(e.target.value);
                    setExistingCurrentPage(1);
                  }}
                  placeholder="Search by Application ID (e.g. CMSA2JGJ), location, or status..."
                  className="w-full pl-12 pr-12 py-3.5 rounded-2xl bg-white/60 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm font-medium text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-sm"
                />
                {existingSearchQuery && (
                  <button
                    onClick={() => setExistingSearchQuery("")}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 uppercase tracking-wider"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Applications List */}
              {paginatedApps.length > 0 ? (
                <div className="grid gap-4">
                  {paginatedApps.map((app, idx) => (
                    <div
                      key={app.id || idx}
                      onClick={() => {
                        setSelectedApplication(app);
                        const parsedLoc = parseLocationString(app.additionalData?.locationOfConstruction || "");
                        setFormData(prev => ({
                          ...prev,
                          descriptionOfWork: app.additionalData?.descriptionOfWork || "",
                          occupancyUse: app.additionalData?.occupancyUse?.startsWith("Other") ? "Other" : (app.additionalData?.occupancyUse || "Residential (Single Family)"),
                          otherOccupancyUse: app.additionalData?.occupancyUse?.startsWith("Other") ? app.additionalData.occupancyUse.replace("Other - ", "") : "",
                          estimatedCost: app.additionalData?.estimatedCost || "",
                          locationOfConstruction: app.additionalData?.locationOfConstruction || "",
                          locationHouseNumber: parsedLoc.houseNumber,
                          locationStreet: parsedLoc.street,
                          locationBarangay: parsedLoc.barangay,
                          isLotOwner: app.additionalData?.isLotOwner || "",
                          isOwnerDeceased: app.additionalData?.isOwnerDeceased || false,
                          totalFloors: app.additionalData?.totalFloors !== undefined ? String(app.additionalData.totalFloors) : "",
                          newIdFile: null,
                          newIdFileBack: null,
                          tctFile: null
                        }));
                        setIsRevision(false);
                        setIsZoningRevision(false);
                        let newMaxIdx = 3;
                        let initialStep = "EVALUATION";
                        if (["FOR_CLAIM", "FOR_PICKING", "RELEASED", "DELIVERED"].includes(app.status)) {
                          newMaxIdx = 5;
                          initialStep = "SUBMIT";
                        } else if (["UNPAID", "PAID", "TREASURY_REVISION", "FOR_PROCESSING"].includes(app.status)) {
                          newMaxIdx = 4;
                          initialStep = "BFP";
                        }
                        setMaxStepIdx(newMaxIdx);
                        setCurrentStep(initialStep);
                      }}
                      className="bg-white/40 dark:bg-white/5 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl p-6 flex items-center justify-between cursor-pointer hover:border-primary/50 hover:bg-slate-50 dark:hover:bg-white/10 transition-all group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                          <Building2 className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="font-black text-slate-900 dark:text-white uppercase tracking-wider text-sm md:text-base">
                            Application {app.id?.substring(0, 8).toUpperCase()}
                          </p>
                          <p className="text-xs text-slate-500 font-medium mt-1">
                            Submitted: {new Date(app.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {(() => {
                          const statusDetails = getDisplayStatusDetails(app);
                          return (
                            <span className={cn(
                              "text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full",
                              statusDetails.colorClass
                            )}>
                              {statusDetails.label}
                            </span>
                          );
                        })()}

                        <span className="text-primary group-hover:translate-x-1 transition-transform font-bold">
                          →
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center bg-white/40 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl space-y-2">
                  <p className="text-sm font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest">
                    No matching records found
                  </p>
                  <p className="text-xs text-slate-400">
                    Try adjusting your search query or clear the filter.
                  </p>
                </div>
              )}

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200 dark:border-white/10">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Showing Page {existingCurrentPage} of {totalPages} ({filteredApps.length} Total Records)
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      disabled={existingCurrentPage === 1}
                      onClick={() => setExistingCurrentPage(prev => Math.max(prev - 1, 1))}
                      className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-slate-200 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Previous</span>
                    </button>
                    <button
                      disabled={existingCurrentPage === totalPages}
                      onClick={() => setExistingCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-slate-200 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                    >
                      <span>Next</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {hasActiveApplication && (
                <div className="mt-8 border-t border-slate-200 dark:border-white/10 pt-8 flex flex-col items-center">
                  <div className="bg-blue-500/10 dark:bg-blue-500/5 border border-blue-500/20 dark:border-blue-500/10 rounded-2xl p-6 max-w-xl text-center space-y-3 shadow-[0_0_20px_rgba(59,130,246,0.05)]">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-500/10 text-blue-500 mb-1">
                      <AlertCircle className="w-6 h-6 animate-pulse" />
                    </div>
                    <h4 className="font-black text-slate-800 dark:text-white uppercase tracking-wider text-sm">
                      Active Application In Progress
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed font-sans">
                      You currently have an active building permit application. You may still apply for a new permit for another property or project by clicking the button above.
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })()}


        {!loading && currentStep === "GUIDE" && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            {/* Citizen's Charter Reference */}
            <div className="bg-primary/5 border border-primary/20 p-6 rounded-[2rem] flex flex-col md:flex-row gap-4 md:items-center justify-between shadow-sm mb-12">
              <div className="space-y-1.5 text-left">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-[8px] font-black uppercase tracking-widest font-sans">
                  <Book className="w-3 h-3" /> Citizen's Charter
                </span>
                <h4 className="text-sm font-black tracking-widest text-slate-700 dark:text-white italic">
                  Based on Mapandan Building Permit Process
                </h4>
                <div className="text-xs text-primary dark:text-primary/90 font-bold bg-primary/[0.02] border border-primary/10 p-4 rounded-xl mt-2 italic font-sans leading-relaxed">
                  &quot;Compliant with PD 1096 (National Building Code), RA 11032 (EODB Act), and RA 10173 (Data Privacy Act). Ensure all requirements are duly signed and notarized where applicable.&quot;
                </div>
              </div>
            </div>

            {/* Requirements Guide Content */}
            <div className="space-y-3 md:space-y-4 text-center mb-8">
              <h2 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter leading-tight">Requirements <span className="text-primary italic">Guide</span></h2>
              <p className="text-slate-500 font-medium italic text-xs md:text-lg uppercase tracking-widest max-w-2xl mx-auto">Review each requirement to see detailed step-by-step instructions.</p>
            </div>

            <div
              className="space-y-6 max-h-[600px] overflow-y-auto pr-2 md:pr-4 custom-scrollbar"
              onScroll={(e) => {
                const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
                if (Math.ceil(scrollTop + clientHeight) >= scrollHeight - 5) {
                  setHasReadGuide(true);
                }
              }}
            >
              {requirements.map((req) => (
                <div
                  key={req.id}
                  className="bg-white/40 dark:bg-white/5 backdrop-blur-md border border-slate-100 dark:border-white/10 rounded-2xl md:rounded-[2rem] overflow-hidden shadow-sm relative group hover:border-primary/30 transition-all duration-300"
                >
                  {/* Left Accent Border */}
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary opacity-50 group-hover:opacity-100 transition-opacity"></div>

                  <div className="p-6 md:p-8 pl-8 md:pl-10">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-primary/5 text-primary flex items-center justify-center">
                          {req.icon}
                        </div>
                        <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tighter italic text-lg md:text-xl">{req.title}</h3>
                      </div>
                      <div className="bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 font-bold text-[10px] uppercase tracking-widest px-4 py-2 rounded-full w-fit">
                        {req.office}
                      </div>
                    </div>

                    {/* Steps */}
                    <div className="space-y-4 mb-6">
                      {req.steps.map((step, idx) => (
                        <div key={idx} className="flex gap-4 items-start border-b border-dashed border-slate-200 dark:border-white/10 pb-4 last:border-0 last:pb-0">
                          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-black mt-0.5">
                            {idx + 1}
                          </div>
                          <p className="text-slate-600 dark:text-slate-400 font-medium text-sm leading-relaxed pt-0.5">
                            {step}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Info Footer */}
                    <div className="bg-primary/[0.03] rounded-xl p-4 flex items-start gap-3 border border-primary/10">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        <span className="font-bold text-primary uppercase tracking-wider text-[10px] mr-2">{req.infoLabel}:</span>
                        <span className="italic">{req.infoText}</span>
                      </p>
                    </div>

                  </div>
                </div>
              ))}
            </div>

            {/* Document Catalog Summary */}
            <div className="mt-8 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-[2rem] p-6 md:p-8">
              <div className="mb-6">
                <h3 className="flex items-center gap-2 font-black text-slate-900 dark:text-white uppercase tracking-tighter text-lg md:text-xl italic">
                  <Book className="w-5 h-5 text-primary" />
                  Document Catalog Summary
                </h3>
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">
                  Total requirements: 13 documents from various issuing authorities
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8 text-sm font-medium text-slate-700 dark:text-slate-300">
                <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-500" /> Licensed Professionals (1)</div>
                <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-500" /> Assessor's Office (1)</div>
                <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-500" /> Register of Deeds (1)</div>
                <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-500" /> Treasury Office (2)</div>
                <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-500" /> Municipal Health Office (1)</div>
                <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-500" /> Adjoining Owners (2)</div>
                <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-500" /> Barangay Hall (1)</div>
                <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-500" /> Zoning/MPDC (1)</div>
                <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-500" /> Notary Public (2)</div>
                <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-500" /> BFP (1)</div>
              </div>

              {/* Valid ID Guidelines Callout Card */}
              <div className="mt-6 pt-6 border-t border-slate-200 dark:border-white/10 flex flex-col gap-4 text-left">
                <div className="space-y-1.5">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-[8px] font-black uppercase tracking-widest font-sans">
                    <Shield className="w-3 h-3" /> Valid IDs Guidelines
                  </span>
                  <h4 className="text-sm font-black tracking-widest text-slate-800 dark:text-white italic">
                    Accepted Government-Issued IDs
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    When uploading your ID or bringing it to the municipal offices, make sure it is one of the following valid documents:
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  <div className="flex items-center gap-2">• Philippine National ID (PhilID / ePhilID)</div>
                  <div className="flex items-center gap-2">• Philippine Passport</div>
                  <div className="flex items-center gap-2">• Driver's License</div>
                  <div className="flex items-center gap-2">• UMID Card (SSS / GSIS)</div>
                  <div className="flex items-center gap-2">• PRC License</div>
                  <div className="flex items-center gap-2">• Postal ID</div>
                  <div className="flex items-center gap-2">• Voter's ID / Certificate</div>
                  <div className="flex items-center gap-2">• TIN Card</div>
                  <div className="flex items-center gap-2">• PhilHealth ID</div>
                  <div className="flex items-center gap-2">• Senior Citizen ID</div>
                  <div className="flex items-center gap-2">• PWD ID</div>
                  <div className="flex items-center gap-2">• Barangay Certification (with photo)</div>
                </div>
              </div>
            </div>

            {/* Next Button Action */}
            <div className="mt-12 flex flex-col md:flex-row justify-between items-center gap-6">
              {existingApplications.length > 0 && (
                <button
                  onClick={() => {
                    setCurrentStep("EXISTING");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="text-slate-500 hover:text-slate-700 dark:hover:text-white font-bold uppercase tracking-widest text-[10px] md:text-xs flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-white/10 rounded-full transition-colors w-full md:w-auto justify-center"
                >
                  ← Back to Existing Applications
                </button>
              )}
              <button
                disabled={!hasReadGuide}
                onClick={() => {
                  setCurrentStep("PROFILE");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className={cn(
                  "px-8 py-4 rounded-[2rem] font-black uppercase tracking-widest text-[10px] md:text-xs flex items-center gap-3 transition-all w-full md:w-auto ml-auto",
                  hasReadGuide
                    ? "bg-primary text-white hover:bg-primary/90 shadow-xl shadow-primary/20"
                    : "bg-slate-300 text-slate-500 cursor-not-allowed dark:bg-white/10 dark:text-slate-400"
                )}
              >
                Proceed to Profile & Purpose
                <span className="text-xl leading-none">→</span>
              </button>
            </div>
          </div>
        )}

        {!loading && currentStep === "PROFILE" && (() => {
          const displayResident = selectedApplication?.residentSnapshot || residentData;
          return (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
              {/* Header */}
              <div className="space-y-3 md:space-y-4 text-center mb-8">
                <h2 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter leading-tight flex items-center justify-center gap-4">
                  <UserCheck className="w-10 h-10 md:w-12 md:h-12 text-slate-800 dark:text-white" />
                  <span className="text-slate-800 dark:text-white">Profile <span className="text-primary italic">Evaluation</span></span>
                </h2>
                <p className="text-slate-500 font-medium italic text-xs md:text-lg uppercase tracking-widest max-w-2xl mx-auto">Verify your identity and provide the necessary details. Fields marked with <span className="text-red-500 font-bold text-lg">*</span> are required.</p>
              </div>

              {loading ? (
                <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>
              ) : (
                <>
                  {/* Your Profile Card */}
                  <div className="bg-white/40 dark:bg-white/5 backdrop-blur-md border border-slate-100 dark:border-white/10 rounded-2xl md:rounded-[2rem] p-6 md:p-8 relative group hover:border-primary/30 transition-all duration-300">
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary opacity-50 group-hover:opacity-100 transition-opacity rounded-l-2xl"></div>
                    <div className="flex items-center gap-2 mb-6">
                      <Book className="w-5 h-5 text-primary" />
                      <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tighter text-lg md:text-xl italic">Your Profile (from Digital Data Gathering)</h3>
                    </div>

                    <div className="bg-blue-500/10 text-blue-700 dark:text-blue-400 text-xs py-3 px-4 rounded-xl flex items-start gap-2 border border-blue-500/20 mb-6">
                      <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <p><b>Data Import Notice:</b> Your information was imported from the Digital Data Gathering module. Updates to your profile must be made through the separate Digital Data Gathering system. Last import: Today at 8:00 AM.</p>
                    </div>

                    <div className="bg-white dark:bg-black/20 rounded-xl border border-slate-100 dark:border-white/5 p-6 relative overflow-hidden shadow-sm">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                        <div className="flex items-center gap-2">
                          <User className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                          <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-tighter text-md italic">Personal Information</h4>
                        </div>
                        <div className="bg-emerald-500/10 text-emerald-600 font-bold text-[10px] uppercase tracking-widest px-3 py-1 rounded-full flex items-center gap-1 w-fit">
                          <CheckCircle2 className="w-3 h-3" /> Imported from your registration
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Full Name</p>
                          <p className="font-bold text-slate-800 dark:text-slate-200 mt-1 uppercase text-sm">{displayResident?.firstName} {displayResident?.lastName}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Age / Date of Birth</p>
                          <p className="font-bold text-slate-800 dark:text-slate-200 mt-1 uppercase text-sm">
                            {displayResident?.dateOfBirth ? `${new Date().getFullYear() - new Date(displayResident.dateOfBirth).getFullYear()} years old / ${new Date(displayResident.dateOfBirth).toLocaleDateString()}` : "N/A"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Phone Number</p>
                          <p className="font-bold text-slate-800 dark:text-slate-200 mt-1 text-sm">{displayResident?.contactNumber || "N/A"}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email</p>
                          <p className="font-bold text-slate-800 dark:text-slate-200 mt-1 text-sm">{displayResident?.user?.email || "N/A"}</p>
                        </div>
                        <div className="md:col-span-2">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Complete Address</p>
                          <p className="font-bold text-slate-800 dark:text-slate-200 mt-1 uppercase text-sm">
                            {displayResident?.houseNumber ? `#${displayResident.houseNumber} ${displayResident.street || ""}, Brgy. ${displayResident.barangay || ""}, Mapandan, Pangasinan` : "N/A"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Government ID Card */}
                  <div className="bg-white/40 dark:bg-white/5 backdrop-blur-md border border-slate-100 dark:border-white/10 rounded-2xl md:rounded-[2rem] p-6 md:p-8 mt-6 relative group hover:border-primary/30 transition-all duration-300">
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary opacity-50 group-hover:opacity-100 transition-opacity rounded-l-2xl"></div>
                    <div className="flex items-center gap-2 mb-4">
                      <Book className="w-5 h-5 text-primary" />
                      <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tighter text-lg md:text-xl italic">
                        Government ID <span className="text-red-500 text-xl">*</span>
                      </h3>
                    </div>
                    {!isEditable ? (
                      <div>
                        {selectedApplication.additionalData?.documents?.newIdFile ? (
                          <div className="flex flex-col md:flex-row gap-6">
                            <div className="flex-1 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 p-6 flex flex-col items-center justify-center text-center relative overflow-hidden shadow-sm min-h-[180px]">
                              {(() => {
                                const url = selectedApplication.additionalData.documents.newIdFile;
                                const isImage = /\.(jpg|jpeg|png|webp|gif)($|\?)/i.test(url);
                                return (
                                  <div className="space-y-4 w-full flex flex-col items-center">
                                    {isImage ? (
                                      <img src={url} alt="Uploaded Government ID Front" className="max-h-48 object-contain rounded-lg border border-slate-200 dark:border-white/10" />
                                    ) : (
                                      <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                                        <FileText className="w-8 h-8" />
                                      </div>
                                    )}
                                    <p className="text-xs font-semibold text-slate-500">Government ID - Front Side</p>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setViewerUrl(url);
                                        setViewerTitle("Government ID - Front");
                                        setViewerOpen(true);
                                      }}
                                      className="inline-flex items-center gap-2 text-xs font-bold text-primary hover:underline"
                                    >
                                      View Front ID ↗
                                    </button>
                                  </div>
                                );
                              })()}
                            </div>
                            <div className="flex-1 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 p-6 flex flex-col items-center justify-center text-center relative overflow-hidden shadow-sm min-h-[180px]">
                              {selectedApplication.additionalData?.documents?.newIdFileBack ? (
                                (() => {
                                  const url = selectedApplication.additionalData.documents.newIdFileBack;
                                  const isImage = /\.(jpg|jpeg|png|webp|gif)($|\?)/i.test(url);
                                  return (
                                    <div className="space-y-4 w-full flex flex-col items-center">
                                      {isImage ? (
                                        <img src={url} alt="Uploaded Government ID Back" className="max-h-48 object-contain rounded-lg border border-slate-200 dark:border-white/10" />
                                      ) : (
                                        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                                          <FileText className="w-8 h-8" />
                                        </div>
                                      )}
                                      <p className="text-xs font-semibold text-slate-500">Government ID - Back Side (Optional)</p>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setViewerUrl(url);
                                          setViewerTitle("Government ID - Back");
                                          setViewerOpen(true);
                                        }}
                                        className="inline-flex items-center gap-2 text-xs font-bold text-primary hover:underline"
                                      >
                                        View Back ID ↗
                                      </button>
                                    </div>
                                  );
                                })()
                              ) : (
                                <div className="text-center p-6 flex flex-col items-center justify-center h-full">
                                  <FileWarning className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                                  <p className="text-xs font-semibold text-slate-400 italic">No Back Side ID Uploaded</p>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="bg-white dark:bg-black/20 rounded-xl border border-slate-100 dark:border-white/5 p-5 flex flex-col gap-2 shadow-sm">
                            <p className="text-sm font-bold text-slate-800 dark:text-white">ID on file: <span className="font-medium text-slate-600">{displayResident?.idType || "Philippine ID / Profile ID"}</span></p>
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Verified: <span className={cn("font-bold", displayResident?.registrationStatus === "APPROVED" || displayResident?.registrationStatus === "VERIFIED" ? "text-emerald-500" : "text-amber-500")}>{displayResident?.registrationStatus === "APPROVED" || displayResident?.registrationStatus === "VERIFIED" ? "Yes" : "Pending"}</span></p>

                            {(displayResident?.idFrontUrl || displayResident?.idBackUrl) && (
                              <div className="flex gap-4 mt-4">
                                {displayResident.idFrontUrl && (
                                  <div className="flex-1 rounded-lg border border-slate-200 dark:border-white/10 overflow-hidden bg-slate-50 dark:bg-black/40">
                                    <p className="text-[10px] font-bold text-center py-1.5 text-slate-500 uppercase tracking-widest border-b border-slate-200 dark:border-white/10 bg-white/50 dark:bg-white/5">Front ID</p>
                                    <img src={displayResident.idFrontUrl} alt="Front ID" className="w-full h-24 md:h-32 object-contain p-2" />
                                  </div>
                                )}
                                {displayResident.idBackUrl && (
                                  <div className="flex-1 rounded-lg border border-slate-200 dark:border-white/10 overflow-hidden bg-slate-50 dark:bg-black/40">
                                    <p className="text-[10px] font-bold text-center py-1.5 text-slate-500 uppercase tracking-widest border-b border-slate-200 dark:border-white/10 bg-white/50 dark:bg-white/5">Back ID</p>
                                    <img src={displayResident.idBackUrl} alt="Back ID" className="w-full h-24 md:h-32 object-contain p-2" />
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                        <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-4">You have an ID uploaded in your profile. Choose an option:</p>

                        <div className="flex bg-slate-100 dark:bg-black/40 p-1 rounded-xl w-full md:w-fit mb-6 shadow-inner border border-slate-200 dark:border-white/5">
                          <button
                            type="button"
                            onClick={() => setIdChoice("PROFILE")}
                            className={cn(
                              "flex items-center justify-center gap-2 flex-1 md:px-6 py-2.5 rounded-lg text-xs md:text-sm font-black uppercase tracking-widest transition-all",
                              idChoice === "PROFILE"
                                ? "bg-white dark:bg-white/10 text-primary shadow-sm ring-1 ring-black/5 dark:ring-white/10"
                                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-white/50 dark:hover:bg-white/5"
                            )}
                          >
                            <CheckCircle className="w-4 h-4" /> Use Profile ID
                          </button>
                          <button
                            type="button"
                            onClick={() => setIdChoice("UPLOAD")}
                            className={cn(
                              "flex items-center justify-center gap-2 flex-1 md:px-6 py-2.5 rounded-lg text-xs md:text-sm font-black uppercase tracking-widest transition-all",
                              idChoice === "UPLOAD"
                                ? "bg-white dark:bg-white/10 text-primary shadow-sm ring-1 ring-black/5 dark:ring-white/10"
                                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-white/50 dark:hover:bg-white/5"
                            )}
                          >
                            <Upload className="w-4 h-4" /> Upload New ID
                          </button>
                        </div>

                        {idChoice === "PROFILE" ? (
                          <div className="bg-white dark:bg-black/20 rounded-xl border border-slate-100 dark:border-white/5 p-5 flex flex-col gap-2 shadow-sm">
                            <p className="text-sm font-bold text-slate-800 dark:text-white">ID on file: <span className="font-medium text-slate-600">{displayResident?.idType || "Philippine ID / Profile ID"}</span></p>
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Verified: <span className={cn("font-bold", displayResident?.registrationStatus === "APPROVED" || displayResident?.registrationStatus === "VERIFIED" ? "text-emerald-500" : "text-amber-500")}>{displayResident?.registrationStatus === "APPROVED" || displayResident?.registrationStatus === "VERIFIED" ? "Yes" : "Pending"}</span></p>
                          </div>
                        ) : (
                          <div className="flex flex-col md:flex-row gap-6">
                            {/* Front Side Upload */}
                            <div className="flex-1 flex flex-col gap-2">
                              <PremiumDocumentUpload
                                label="Front Side"
                                required={true}
                                file={formData.newIdFile}
                                existingUrl={effectiveDocuments?.newIdFile}
                                onFileSelect={(file) => setFormData({ ...formData, newIdFile: file })}
                                onClear={() => setFormData({ ...formData, newIdFile: null })}
                                onView={() => {
                                  if (formData.newIdFile) {
                                    setViewerFile(formData.newIdFile);
                                  } else if (effectiveDocuments?.newIdFile) {
                                    setViewerUrl(effectiveDocuments.newIdFile);
                                  }
                                  setViewerTitle("Government ID - Front");
                                  setViewerOpen(true);
                                }}
                                error={showValidationErrors && idChoice === "UPLOAD" && !formData.newIdFile && !effectiveDocuments?.newIdFile}
                                infoText="Upload Front Side (PDF/JPG/PNG)"
                                disabled={!isEditable || (isRevision && !isFieldRequested("newIdFile"))}
                              />
                            </div>

                            {/* Back Side Upload (Optional) */}
                            <div className="flex-1 flex flex-col gap-2">
                              <PremiumDocumentUpload
                                label="Back Side (Optional)"
                                required={false}
                                file={formData.newIdFileBack}
                                existingUrl={effectiveDocuments?.newIdFileBack}
                                onFileSelect={(file) => setFormData({ ...formData, newIdFileBack: file })}
                                onClear={() => setFormData({ ...formData, newIdFileBack: null })}
                                onView={() => {
                                  if (formData.newIdFileBack) {
                                    setViewerFile(formData.newIdFileBack);
                                  } else if (effectiveDocuments?.newIdFileBack) {
                                    setViewerUrl(effectiveDocuments.newIdFileBack);
                                  }
                                  setViewerTitle("Government ID - Back");
                                  setViewerOpen(true);
                                }}
                                infoText="Upload Back Side (PDF/JPG/PNG)"
                                disabled={!isEditable || (isRevision && !isFieldRequested("newIdFileBack"))}
                              />
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Additional Information */}
                  <div className="bg-white/40 dark:bg-white/5 backdrop-blur-md border border-slate-100 dark:border-white/10 rounded-2xl md:rounded-[2rem] p-6 md:p-8 mt-6 relative group hover:border-primary/30 transition-all duration-300">
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary opacity-50 group-hover:opacity-100 transition-opacity rounded-l-2xl"></div>
                    <div className="flex items-center gap-2 mb-6">
                      <Book className="w-5 h-5 text-primary" />
                      <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tighter text-lg md:text-xl italic">Additional Information</h3>
                    </div>

                    <div className="space-y-8">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                          a. Scope of Work <span className="text-red-500 text-lg">*</span>
                        </label>

                        <div className={cn("rounded-xl p-4 border bg-white/40 dark:bg-black/20 space-y-4", (showValidationErrors && (
                          !formData.scopeNewConstruction &&
                          !formData.scopeAddition &&
                          !formData.scopeRepair &&
                          !formData.scopeRenovation &&
                          !formData.scopeOthers1 &&
                          !formData.descriptionOfWorkLegacyText
                        )) ? "border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-pulse" : "border-slate-200 dark:border-white/10")}>

                          {/* New Construction */}
                          <div className="flex items-center space-x-3 py-1">
                            <Checkbox
                              id="scope-new-con"
                              checked={formData.scopeNewConstruction}
                              disabled={!isEditable}
                              onCheckedChange={checked => {
                                if (checked) {
                                  setFormData({
                                    ...formData,
                                    scopeNewConstruction: true,
                                    scopeAddition: false,
                                    scopeAdditionText: "",
                                    scopeRepair: false,
                                    scopeRepairText: "",
                                    scopeRenovation: false,
                                    scopeRenovationText: "",
                                    scopeDemolition: false,
                                    scopeDemolitionText: "",
                                    scopeOthers1: false,
                                    scopeOthers1Text1: "",
                                    scopeOthers1Text2: ""
                                  });
                                } else {
                                  setFormData({ ...formData, scopeNewConstruction: false });
                                }
                              }}
                            />
                            <label htmlFor="scope-new-con" className="text-xs md:text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                              New Construction
                            </label>
                          </div>

                          {/* Addition Of */}
                          <div className="flex flex-col md:flex-row md:items-center gap-2 py-1">
                            <div className="flex items-center space-x-3">
                              <Checkbox
                                id="scope-addition"
                                checked={formData.scopeAddition}
                                disabled={!isEditable}
                                onCheckedChange={checked => {
                                  if (checked) {
                                    setFormData({
                                      ...formData,
                                      scopeNewConstruction: false,
                                      scopeAddition: true,
                                      scopeRepair: false,
                                      scopeRepairText: "",
                                      scopeRenovation: false,
                                      scopeRenovationText: "",
                                      scopeDemolition: false,
                                      scopeDemolitionText: "",
                                      scopeOthers1: false,
                                      scopeOthers1Text1: "",
                                      scopeOthers1Text2: ""
                                    });
                                  } else {
                                    setFormData({ ...formData, scopeAddition: false });
                                  }
                                }}
                              />
                              <label htmlFor="scope-addition" className="text-xs md:text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer select-none shrink-0">
                                Addition of
                              </label>
                            </div>
                            {formData.scopeAddition && (
                              <input
                                type="text"
                                placeholder="Specify details"
                                className={cn("flex-1 bg-white dark:bg-black/20 border rounded-lg px-3 py-1 text-xs outline-none focus:ring-1 focus:ring-primary", (showValidationErrors && !formData.scopeAdditionText) ? "border-red-500" : "border-slate-200 dark:border-white/10")}
                                value={formData.scopeAdditionText}
                                onChange={e => setFormData({ ...formData, scopeAdditionText: e.target.value })}
                                disabled={!isEditable}
                              />
                            )}
                          </div>

                          {/* Repair Of */}
                          <div className="flex flex-col md:flex-row md:items-center gap-2 py-1">
                            <div className="flex items-center space-x-3">
                              <Checkbox
                                id="scope-repair"
                                checked={formData.scopeRepair}
                                disabled={!isEditable}
                                onCheckedChange={checked => {
                                  if (checked) {
                                    setFormData({
                                      ...formData,
                                      scopeNewConstruction: false,
                                      scopeAddition: false,
                                      scopeAdditionText: "",
                                      scopeRepair: true,
                                      scopeRenovation: false,
                                      scopeRenovationText: "",
                                      scopeDemolition: false,
                                      scopeDemolitionText: "",
                                      scopeOthers1: false,
                                      scopeOthers1Text1: "",
                                      scopeOthers1Text2: ""
                                    });
                                  } else {
                                    setFormData({ ...formData, scopeRepair: false });
                                  }
                                }}
                              />
                              <label htmlFor="scope-repair" className="text-xs md:text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer select-none shrink-0">
                                Repair of
                              </label>
                            </div>
                            {formData.scopeRepair && (
                              <input
                                type="text"
                                placeholder="Specify details"
                                className={cn("flex-1 bg-white dark:bg-black/20 border rounded-lg px-3 py-1 text-xs outline-none focus:ring-1 focus:ring-primary", (showValidationErrors && !formData.scopeRepairText) ? "border-red-500" : "border-slate-200 dark:border-white/10")}
                                value={formData.scopeRepairText}
                                onChange={e => setFormData({ ...formData, scopeRepairText: e.target.value })}
                                disabled={!isEditable}
                              />
                            )}
                          </div>

                          {/* Renovation Of */}
                          <div className="flex flex-col md:flex-row md:items-center gap-2 py-1">
                            <div className="flex items-center space-x-3">
                              <Checkbox
                                id="scope-renovation"
                                checked={formData.scopeRenovation}
                                disabled={!isEditable}
                                onCheckedChange={checked => {
                                  if (checked) {
                                    setFormData({
                                      ...formData,
                                      scopeNewConstruction: false,
                                      scopeAddition: false,
                                      scopeAdditionText: "",
                                      scopeRepair: false,
                                      scopeRepairText: "",
                                      scopeRenovation: true,
                                      scopeDemolition: false,
                                      scopeDemolitionText: "",
                                      scopeOthers1: false,
                                      scopeOthers1Text1: "",
                                      scopeOthers1Text2: ""
                                    });
                                  } else {
                                    setFormData({ ...formData, scopeRenovation: false });
                                  }
                                }}
                              />
                              <label htmlFor="scope-renovation" className="text-xs md:text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer select-none shrink-0">
                                Renovation of
                              </label>
                            </div>
                            {formData.scopeRenovation && (
                              <input
                                type="text"
                                placeholder="Specify details"
                                className={cn("flex-1 bg-white dark:bg-black/20 border rounded-lg px-3 py-1 text-xs outline-none focus:ring-1 focus:ring-primary", (showValidationErrors && !formData.scopeRenovationText) ? "border-red-500" : "border-slate-200 dark:border-white/10")}
                                value={formData.scopeRenovationText}
                                onChange={e => setFormData({ ...formData, scopeRenovationText: e.target.value })}
                                disabled={!isEditable}
                              />
                            )}
                          </div>

                          {/* Others Specify */}
                          <div className="flex flex-col gap-2 py-1 border-t border-slate-100 dark:border-white/5 pt-2">
                            <div className="flex items-center space-x-3">
                              <Checkbox
                                id="scope-others-1"
                                checked={formData.scopeOthers1}
                                disabled={!isEditable}
                                onCheckedChange={checked => {
                                  if (checked) {
                                    setFormData({
                                      ...formData,
                                      scopeNewConstruction: false,
                                      scopeAddition: false,
                                      scopeAdditionText: "",
                                      scopeRepair: false,
                                      scopeRepairText: "",
                                      scopeRenovation: false,
                                      scopeRenovationText: "",
                                      scopeDemolition: false,
                                      scopeDemolitionText: "",
                                      scopeOthers1: true
                                    });
                                  } else {
                                    setFormData({ ...formData, scopeOthers1: false });
                                  }
                                }}
                              />
                              <label htmlFor="scope-others-1" className="text-xs md:text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer select-none shrink-0 font-bold text-slate-500">
                                Others (Specify)
                              </label>
                            </div>
                            {formData.scopeOthers1 && (
                              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pl-6">
                                <input
                                  type="text"
                                  placeholder="Specify item"
                                  className={cn("flex-1 bg-white dark:bg-black/20 border rounded-lg px-3 py-1 text-xs outline-none focus:ring-1 focus:ring-primary", (showValidationErrors && !formData.scopeOthers1Text1) ? "border-red-500" : "border-slate-200 dark:border-white/10")}
                                  value={formData.scopeOthers1Text1}
                                  onChange={e => setFormData({ ...formData, scopeOthers1Text1: e.target.value })}
                                  disabled={!isEditable}
                                />
                                <span className="text-xs text-slate-400 self-center">OF</span>
                                <input
                                  type="text"
                                  placeholder="Specify category/structure"
                                  className={cn("flex-1 bg-white dark:bg-black/20 border rounded-lg px-3 py-1 text-xs outline-none focus:ring-1 focus:ring-primary", (showValidationErrors && !formData.scopeOthers1Text2) ? "border-red-500" : "border-slate-200 dark:border-white/10")}
                                  value={formData.scopeOthers1Text2}
                                  onChange={e => setFormData({ ...formData, scopeOthers1Text2: e.target.value })}
                                  disabled={!isEditable}
                                />
                              </div>
                            )}
                          </div>

                          {/* Legacy Support Text Area */}
                          {formData.descriptionOfWorkLegacyText && (
                            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-white/10">
                              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                Pre-existing Description (Legacy)
                              </label>
                              <textarea
                                className="w-full bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none min-h-[80px]"
                                value={formData.descriptionOfWorkLegacyText}
                                onChange={e => setFormData({ ...formData, descriptionOfWorkLegacyText: e.target.value })}
                                disabled={!isEditable}
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                          b. Certified true copy of the TCT covering a lot on which the proposed work is to be done <span className="text-red-500 text-lg">*</span>
                        </label>
                        <PremiumDocumentUpload
                          label="Certified True Copy of TCT"
                          required={true}
                          file={formData.tctFile}
                          existingUrl={effectiveDocuments?.tctFile}
                          onFileSelect={(file) => setFormData({ ...formData, tctFile: file })}
                          onClear={() => setFormData({ ...formData, tctFile: null })}
                          onView={() => {
                            if (formData.tctFile) {
                              setViewerFile(formData.tctFile);
                            } else if (effectiveDocuments?.tctFile) {
                              setViewerUrl(effectiveDocuments.tctFile);
                            }
                            setViewerTitle("TCT Document");
                            setViewerOpen(true);
                          }}
                          error={showValidationErrors && !hasTctFile}
                          infoText="Upload TCT Document (PDF/JPG/PNG)"
                          disabled={!isEditable || (isRevision && !isFieldRequested("tctFile"))}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                          c. The use of the occupancy for which the proposed work is intended <span className="text-red-500 text-lg">*</span>
                        </label>
                        <div className={cn("rounded-xl transition-all p-4 border bg-white/40 dark:bg-black/20", (showValidationErrors && (!formData.occupancyCategory || (formData.occupancyCategory !== "Other Construction" && formData.selectedSubOccupancies.length === 0) || (formData.occupancyCategory === "Other Construction" && !formData.subOccupancyOthersSpecify) || (formData.selectedSubOccupancies.includes("Others (Specify)") && !formData.subOccupancyOthersSpecify))) ? "border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-pulse" : "border-slate-200 dark:border-white/10")}>
                          <Select
                            value={formData.occupancyCategory}
                            onValueChange={value => {
                              setFormData({
                                ...formData,
                                occupancyCategory: value,
                                selectedSubOccupancies: [],
                                subOccupancyOthersSpecify: ""
                              });
                            }}
                            disabled={!isEditable}
                          >
                            <SelectTrigger className="w-full h-auto bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer">
                              <SelectValue placeholder="Select occupancy category" />
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-[#11131a] border-slate-200 dark:border-white/10 rounded-xl">
                              {OCCUPANCY_CATEGORIES.map((cat) => (
                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {formData.occupancyCategory && (
                            <div className="mt-4 space-y-3 pl-2">
                              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Select Specific Options:</p>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {OCCUPANCY_OPTIONS[formData.occupancyCategory]?.map((opt) => {
                                  const isChecked = formData.selectedSubOccupancies.includes(opt.label) || (formData.occupancyCategory === "Other Construction" && opt.label === "Specify");
                                  return (
                                    <div key={opt.code} className="flex items-center space-x-2 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                                      {formData.occupancyCategory !== "Other Construction" ? (
                                        <Checkbox
                                          id={`sub-occ-${opt.code}`}
                                          checked={isChecked}
                                          disabled={!isEditable}
                                          onCheckedChange={(checked) => {
                                            if (checked) {
                                              setFormData({
                                                ...formData,
                                                selectedSubOccupancies: [opt.label],
                                                ...(opt.label !== "Others (Specify)" && { subOccupancyOthersSpecify: "" })
                                              });
                                            } else {
                                              setFormData({ ...formData, selectedSubOccupancies: [] });
                                            }
                                          }}
                                        />
                                      ) : (
                                        <div className="w-2.5 h-2.5 rounded bg-primary shrink-0" />
                                      )}
                                      <label htmlFor={`sub-occ-${opt.code}`} className="text-xs md:text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                                        {opt.label}
                                      </label>
                                    </div>
                                  );
                                })}
                              </div>

                              {(formData.selectedSubOccupancies.includes("Others (Specify)") || formData.occupancyCategory === "Other Construction") && (
                                <div className="mt-3 pt-2 border-t border-slate-100 dark:border-white/5">
                                  <input
                                    type="text"
                                    placeholder="Please specify occupancy use details"
                                    className={cn("w-full bg-white dark:bg-black/20 border rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none", (showValidationErrors && !formData.subOccupancyOthersSpecify) ? "border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-pulse" : "border-slate-200 dark:border-white/10")}
                                    value={formData.subOccupancyOthersSpecify}
                                    onChange={e => setFormData({ ...formData, subOccupancyOthersSpecify: e.target.value })}
                                    disabled={!isEditable}
                                  />
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                          Total Floor(s) <span className="text-red-500 text-lg">*</span>
                        </label>
                        <input
                          type="number"
                          min="1"
                          placeholder="e.g. 2"
                          className={cn("w-full !h-14 bg-white dark:bg-black/20 border rounded-xl px-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none", (showValidationErrors && (!formData.totalFloors || Number(formData.totalFloors) <= 0)) ? "border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-pulse" : "border-slate-200 dark:border-white/10")}
                          value={formData.totalFloors || ""}
                          onChange={e => {
                            const val = e.target.value;
                            if (val === "" || /^\d*$/.test(val)) {
                              setFormData({ ...formData, totalFloors: val });
                            }
                          }}
                          disabled={!isEditable}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                          d. Estimated cost of the proposal <span className="text-red-500 text-lg">*</span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-500">₱</span>
                          <input
                            type="text"
                            inputMode="numeric"
                            className={cn("w-full bg-white dark:bg-black/20 border rounded-xl p-4 pl-10 text-sm focus:ring-2 focus:ring-primary/20 outline-none", (showValidationErrors && (!formData.estimatedCost || Number(formData.estimatedCost) <= 0)) ? "border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-pulse" : "border-slate-200 dark:border-white/10")}
                            value={formatWithCommas(formData.estimatedCost)}
                            onChange={e => {
                              const rawVal = e.target.value;
                              const cleanVal = rawVal.replace(/,/g, "");
                              if (cleanVal === "" || /^\d*$/.test(cleanVal)) {
                                setFormData({ ...formData, estimatedCost: cleanVal });
                              }
                            }}
                            disabled={!isEditable}
                            placeholder="0"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                          e. Location of Construction <span className="text-red-500 text-lg">*</span>
                        </label>
                        <div className="flex flex-col sm:flex-row gap-4 mb-3">
                          {/* House/Lot Number Input */}
                          <div className="flex-1 sm:flex-[0.25]">
                            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">
                              House/Lot No. <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="number"
                              min="0"
                              placeholder="e.g. 123"
                              className={cn("w-full !h-14 bg-white dark:bg-black/20 border rounded-xl px-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none", (showValidationErrors && !formData.locationHouseNumber) ? "border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-pulse" : "border-slate-200 dark:border-white/10")}
                              value={formData.locationHouseNumber || ""}
                              onChange={e => setFormData({ ...formData, locationHouseNumber: e.target.value })}
                              disabled={!isEditable}
                            />
                          </div>

                          {/* Street Name Input */}
                          <div className="flex-1 sm:flex-[0.45]">
                            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">
                              Street <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. Bonifacio St."
                              className={cn("w-full !h-14 bg-white dark:bg-black/20 border rounded-xl px-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none", (showValidationErrors && !formData.locationStreet) ? "border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-pulse" : "border-slate-200 dark:border-white/10")}
                              value={formData.locationStreet || ""}
                              onChange={e => setFormData({ ...formData, locationStreet: e.target.value })}
                              disabled={!isEditable}
                            />
                          </div>

                          {/* Barangay Dropdown */}
                          <div className="flex-1 sm:flex-[0.3] relative" ref={brgyDropdownRef}>
                            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">
                              Barangay <span className="text-red-500">*</span>
                            </label>

                            <button
                              type="button"
                              onClick={() => isEditable && setIsBrgyDropdownOpen(!isBrgyDropdownOpen)}
                              className={cn(
                                "w-full !h-14 bg-white dark:bg-black/20 border rounded-xl px-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer flex items-center justify-between transition-all",
                                (showValidationErrors && !formData.locationBarangay) ? "border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]" : "border-slate-200 dark:border-white/10"
                              )}
                              disabled={!isEditable}
                            >
                              <span className={formData.locationBarangay ? "text-slate-900 dark:text-white" : "text-slate-400"}>
                                {formData.locationBarangay || "Select Barangay"}
                              </span>
                              <ChevronDown className="w-4 h-4 opacity-50 shrink-0" />
                            </button>

                            {isBrgyDropdownOpen && (
                              <div className="absolute z-[250] mt-2 w-full bg-white dark:bg-[#11131a] border border-slate-200 dark:border-white/10 rounded-xl shadow-xl overflow-hidden p-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                {/* Search Input */}
                                <input
                                  type="text"
                                  placeholder="Search barangay..."
                                  className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-primary mb-2 text-slate-900 dark:text-white"
                                  value={brgySearchQuery}
                                  onChange={e => setBrgySearchQuery(e.target.value)}
                                  autoFocus
                                />
                                {/* List */}
                                <div className="max-h-[180px] overflow-y-auto space-y-0.5 custom-scrollbar">
                                  {filteredBarangays.length > 0 ? (
                                    filteredBarangays.map(brgy => (
                                      <button
                                        key={brgy}
                                        type="button"
                                        onClick={() => {
                                          setFormData({ ...formData, locationBarangay: brgy });
                                          setIsBrgyDropdownOpen(false);
                                          setBrgySearchQuery("");
                                        }}
                                        className={cn(
                                          "w-full text-left px-3 py-2 text-xs rounded-lg transition-colors flex items-center justify-between",
                                          formData.locationBarangay === brgy
                                            ? "bg-primary/10 text-primary font-bold"
                                            : "hover:bg-slate-50 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300"
                                        )}
                                      >
                                        <span>{brgy}</span>
                                        {formData.locationBarangay === brgy && <Check className="w-3.5 h-3.5" />}
                                      </button>
                                    ))
                                  ) : (
                                    <div className="text-center py-4 text-xs text-slate-400 italic">No barangay found</div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        {duplicatePropertyWarning && duplicatePropertyWarning.isProcessing && (
                          <div className="mt-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3 text-amber-600 dark:text-amber-500 animate-in fade-in slide-in-from-top-2 duration-300">
                            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 animate-pulse" />
                            <div className="text-xs">
                              <span className="font-bold uppercase tracking-wider block mb-1">⚠️ Warning: Property Currently Processing</span>
                              An active building permit application for this property location is currently being processed (submitted by {duplicatePropertyWarning.applicantName}). You can still proceed if this is a separate permit for the same property.
                            </div>
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                          f. Is the applicant the owner of the lot? <span className="text-red-500 text-lg">*</span>
                        </label>
                        <Select
                          value={formData.isLotOwner}
                          onValueChange={value => {
                            setFormData({ ...formData, isLotOwner: value, isOwnerDeceased: value === "Yes" ? false : formData.isOwnerDeceased });
                            if (value === "Yes") {
                              setUploadedRequirements(prev => {
                                const next = { ...prev };
                                delete next[7];
                                delete next[10];
                                delete next[11];
                                delete next[12];
                                delete next[13];
                                delete next[14];
                                return next;
                              });
                            }
                          }}
                          disabled={!isEditable}
                        >
                          <SelectTrigger className={cn("w-full h-auto bg-white dark:bg-black/20 border rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer", (showValidationErrors && !formData.isLotOwner) ? "border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-pulse" : "border-slate-200 dark:border-white/10")}>
                            <SelectValue placeholder="Select Yes or No" />
                          </SelectTrigger>
                          <SelectContent className="bg-white dark:bg-[#11131a] border-slate-200 dark:border-white/10 rounded-xl">
                            <SelectItem value="Yes">Yes</SelectItem>
                            <SelectItem value="No">No</SelectItem>
                          </SelectContent>
                        </Select>

                        {formData.isLotOwner === "No" && (
                          <div className="flex items-center space-x-3 py-1 mt-4">
                            <Checkbox
                              id="is-owner-deceased"
                              checked={formData.isOwnerDeceased}
                              disabled={!isEditable}
                              onCheckedChange={checked => {
                                const isChecked = !!checked;
                                setFormData({ ...formData, isOwnerDeceased: isChecked });
                                if (!isChecked) {
                                  setUploadedRequirements(prev => {
                                    const next = { ...prev };
                                    delete next[13];
                                    delete next[14];
                                    return next;
                                  });
                                } else {
                                  setUploadedRequirements(prev => {
                                    const next = { ...prev };
                                    delete next[7];
                                    delete next[10];
                                    delete next[11];
                                    delete next[12];
                                    return next;
                                  });
                                }
                              }}
                            />
                            <label htmlFor="is-owner-deceased" className="text-xs md:text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                              The registered lot owner is deceased (Applicant is an heir)
                            </label>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Footer Buttons */}
                  <div className="mt-12 flex flex-col md:flex-row justify-between items-center gap-6">
                    <button
                      onClick={() => {
                        setCurrentStep("GUIDE");
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-white hover:bg-slate-200 dark:hover:bg-white/20 font-bold uppercase tracking-widest text-[10px] md:text-xs flex items-center gap-2 px-5 py-2.5 border-2 border-slate-200 dark:border-white/20 rounded-full transition-colors shadow-sm"
                    >
                      ← Back to Requirements
                    </button>
                    <button
                      onClick={() => {
                        const hasNoScopeSelected = !formData.scopeNewConstruction &&
                          !formData.scopeAddition &&
                          !formData.scopeRepair &&
                          !formData.scopeRenovation &&
                          !formData.scopeOthers1 &&
                          !formData.scopeOthers2 &&
                          !formData.descriptionOfWorkLegacyText;

                        const hasMissingScopeTexts = (formData.scopeAddition && !formData.scopeAdditionText) ||
                          (formData.scopeRepair && !formData.scopeRepairText) ||
                          (formData.scopeRenovation && !formData.scopeRenovationText) ||
                          (formData.scopeOthers1 && (!formData.scopeOthers1Text1 || !formData.scopeOthers1Text2));

                        const hasMissingFields = hasNoScopeSelected ||
                          hasMissingScopeTexts ||
                          !formData.estimatedCost ||
                          Number(formData.estimatedCost) <= 0 ||
                          !formData.totalFloors ||
                          Number(formData.totalFloors) <= 0 ||
                          !formData.locationHouseNumber ||
                          !formData.locationStreet ||
                          !formData.locationBarangay ||
                          !formData.isLotOwner ||
                          !formData.occupancyCategory ||
                          (formData.occupancyCategory !== "Other Construction" && formData.selectedSubOccupancies.length === 0) ||
                          (formData.occupancyCategory === "Other Construction" && !formData.subOccupancyOthersSpecify) ||
                          (formData.selectedSubOccupancies.includes("Others (Specify)") && !formData.subOccupancyOthersSpecify) ||
                          (idChoice === "UPLOAD" && !formData.newIdFile && !selectedApplication?.additionalData?.documents?.newIdFile) ||
                          !hasTctFile;

                        console.log("Validation Details:", {
                          hasNoScopeSelected,
                          hasMissingScopeTexts,
                          estimatedCost: formData.estimatedCost,
                          estimatedCostValid: !formData.estimatedCost || Number(formData.estimatedCost) <= 0,
                          locationOfConstruction: formData.locationOfConstruction,
                          isLotOwner: formData.isLotOwner,
                          occupancyCategory: formData.occupancyCategory,
                          selectedSubOccupancies: formData.selectedSubOccupancies,
                          subOccupancyOthersSpecify: formData.subOccupancyOthersSpecify,
                          idChoice,
                          newIdFile: formData.newIdFile,
                          hasTctFile,
                          tctFile: formData.tctFile,
                          uploadedReqs2: uploadedRequirements && uploadedRequirements[2],
                          scopeOthers2: formData.scopeOthers2,
                          scopeOthers2Text1: formData.scopeOthers2Text1,
                          scopeOthers2Text2: formData.scopeOthers2Text2,
                          hasMissingFields
                        });

                        console.log("Scope Texts details:", {
                          addition: !!(formData.scopeAddition && !formData.scopeAdditionText),
                          repair: !!(formData.scopeRepair && !formData.scopeRepairText),
                          renovation: !!(formData.scopeRenovation && !formData.scopeRenovationText),
                          others1: !!(formData.scopeOthers1 && (!formData.scopeOthers1Text1 || !formData.scopeOthers1Text2)),
                          others2: !!(formData.scopeOthers2 && (!formData.scopeOthers2Text1 || !formData.scopeOthers2Text2))
                        });

                        if (hasMissingFields) {
                          setShowValidationErrors(true);
                          toast.error("Please fill in all required fields marked with *.");
                          return;
                        }

                        setCurrentStep("DOCUMENTS");
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="px-8 py-4 rounded-[2rem] font-black uppercase tracking-widest text-[10px] md:text-xs flex items-center gap-3 transition-all w-full md:w-auto text-white hover:opacity-90 shadow-xl"
                      style={{
                        backgroundColor: themeColor,
                        boxShadow: themeColor.startsWith("#") ? `0 20px 25px -5px ${themeColor}30` : `0 20px 25px -5px rgba(var(--primary), 0.2)`
                      }}
                    >
                      Next: Upload Requirements & Documents
                      <span className="text-xl leading-none">→</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })()}

        {!loading && currentStep === "DOCUMENTS" && (
          <>
            <UploadStep
              themeColor={themeColor}
              isEditable={isEditable}
              isRevision={isRevision}
              isFieldRequested={isFieldRequested}
              activeDocTab={activeDocTab}
              setActiveDocTab={setActiveDocTab}
              requiredRequirementsCount={requiredRequirementsCount}
              documentRequirementsList={documentRequirementsList}
              customRequirements={customRequirements}
              isAffidavitOfConsentRequired={isAffidavitOfConsentRequired}
              isOwnerDeceased={formData.isOwnerDeceased}
              hasMultipleFloors={hasMultipleFloors}
              permitTypesList={permitTypesList}
              customPermits={customPermits}
              effectiveDocuments={effectiveDocuments}
              uploadedRequirements={uploadedRequirements}
              setUploadedRequirements={setUploadedRequirements}
              uploadedPermits={uploadedPermits}
              setUploadedPermits={setUploadedPermits}
              requiredRequirementIndexes={requiredRequirementIndexes}
              requiredPermitIndexes={requiredPermitIndexes}
              showValidationErrors={showValidationErrors}
              setCustomRequirements={setCustomRequirements}
              setCustomPermits={setCustomPermits}
              setViewerFile={setViewerFile}
              setViewerUrl={setViewerUrl}
              setViewerTitle={setViewerTitle}
              setViewerOpen={setViewerOpen}
              handleAddCustomDocument={handleAddCustomDocument}
              uploadedRequirementsCount={uploadedRequirementsCount}
              uploadedPermitsCount={uploadedPermitsCount}
              totalRequiredItems={totalRequiredItems}
              selectedApplication={selectedApplication}
              signatureUrl={signatureUrl}
              setSignatureUrl={setSignatureUrl}
              uploadFileClientSide={uploadFileClientSide}
              privacyAccepted={privacyAccepted}
              setPrivacyAccepted={setPrivacyAccepted}
              isPrivacyModalOpen={isPrivacyModalOpen}
              setIsPrivacyModalOpen={setIsPrivacyModalOpen}
              setCurrentStep={setCurrentStep}
              addAbandonedFile={(url) => abandonedFilesRef.current.push(url)}
            />
            <button
              id="submitBtn"
              className="hidden"
              onClick={handleSubmit}
              disabled={isSubmitting}
            />
          </>
        )}

        {!loading && currentStep === "EVALUATION" && (
          <EvaluationStep
            selectedApplication={selectedApplication}
            existingApplications={existingApplications}
            router={router}
            getEngineeringStatusLabel={getEngineeringStatusLabel}
            setCurrentStep={setCurrentStep}
            showCancelDialog={showCancelDialog}
            setShowCancelDialog={setShowCancelDialog}
            isCancelling={isCancelling}
            confirmCancel={confirmCancel}
            setIsRevision={setIsRevision}
            setIsZoningRevision={setIsZoningRevision}
          />
        )}

        {!loading && currentStep === "BFP" && (
          <BFPStep
            selectedApplication={selectedApplication}
            router={router}
            setViewerUrl={setViewerUrl}
            setViewerTitle={setViewerTitle}
            setViewerOpen={setViewerOpen}
            setCurrentStep={setCurrentStep}
          />
        )}

        {!loading && currentStep === "SUBMIT" && (
          <SubmitStep
            selectedApplication={selectedApplication}
            setCurrentStep={setCurrentStep}
            setViewerUrl={setViewerUrl}
            setViewerTitle={setViewerTitle}
            setViewerOpen={setViewerOpen}
          />
        )}

      </div>

      {/* Add Custom Document Modal */}
      <Dialog open={isAddCustomDocOpen} onOpenChange={setIsAddCustomDocOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-950 border-none rounded-[2.5rem] shadow-2xl p-10">
          <DialogHeader className="space-y-3">
            <DialogTitle className="text-3xl font-black italic uppercase tracking-tighter text-slate-900 dark:text-white leading-none">
              Add Custom <span style={{ color: themeColor }}>{activeDocTab === "REQUIREMENTS" ? "Requirement" : "Permit"}</span>
            </DialogTitle>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Define a new document name for upload</p>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <label htmlFor="customDocNameInput" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Document/Permit Name</label>
              <Input
                id="customDocNameInput"
                type="text"
                placeholder="e.g. Structural Computations"
                value={customDocName}
                onChange={(e) => setCustomDocName(e.target.value)}
                className="w-full bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 rounded-xl py-6 px-4 font-bold text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus-visible:ring-primary/20"
              />
            </div>

            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddCustomDocOpen(false)}
                className="flex-1 rounded-full border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 font-black uppercase tracking-widest text-[10px] py-6"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleConfirmAddCustomDoc}
                className="flex-1 rounded-full font-black uppercase tracking-widest text-[10px] py-6 text-white"
                style={{ backgroundColor: themeColor }}
              >
                Add Document
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Receipt Upload Modal */}
      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-950 border-none rounded-[2.5rem] shadow-2xl p-10">
          <DialogHeader className="space-y-3">
            <DialogTitle className="text-3xl font-black italic uppercase tracking-tighter text-slate-900 dark:text-white leading-none">
              Upload <span className="text-emerald-500">Receipt</span>
            </DialogTitle>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Submit your proof of payment</p>
          </DialogHeader>

          <div className="space-y-6 py-6">
            {!paymentPreviewUrl ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Hash className="w-3.5 h-3.5 text-primary" />
                    <Label className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-primary italic">Transaction Reference Number (Optional)</Label>
                  </div>
                  <Input
                    type="text"
                    placeholder="e.g. 5012 3456 78901 (GCash / Bank Transfer Ref No.)"
                    value={gcashReferenceNo}
                    onChange={(e) => setGcashReferenceNo(e.target.value)}
                    className="h-10 md:h-12 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl font-bold italic text-[10px] md:text-sm text-slate-800 dark:text-white placeholder-slate-400 focus-visible:ring-primary focus-visible:border-primary transition-all"
                  />
                </div>
                <label className="flex flex-col items-center justify-center gap-3 aspect-square rounded-2xl border-2 border-dashed border-emerald-500/20 hover:border-emerald-500/40 bg-emerald-500/[0.02] cursor-pointer group transition-all">
                  <UploadCloud className="w-10 h-10 text-emerald-400 group-hover:scale-110 transition-transform" />
                  <div className="text-center">
                    <span className="text-xs font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 italic block">Select Image</span>
                    <span className="text-[9px] text-slate-400 uppercase tracking-widest">JPG, PNG, PDF</span>
                  </div>
                  <input type="file" accept="image/*,application/pdf,.pdf" onChange={handlePaymentFileSelect} className="hidden" />
                </label>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative aspect-[3/4] md:aspect-square rounded-2xl overflow-hidden border-2 border-emerald-500/20 bg-slate-50 dark:bg-black/20">
                  <img src={paymentPreviewUrl} alt="Preview" className="object-contain w-full h-full" />
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => { setPaymentFile(null); setPaymentPreviewUrl(null); }}
                    disabled={isSubmitting}
                    className="flex-1 h-12 rounded-xl border-2 border-red-500/20 text-red-500 hover:bg-red-500/5 font-black italic uppercase tracking-widest text-[10px]"
                  >
                    Change Image
                  </Button>
                  <Button
                    onClick={handleSubmitPaymentProof}
                    disabled={isSubmitting || !paymentFile}
                    className="flex-1 h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black italic uppercase tracking-widest text-[10px] shadow-lg shadow-emerald-500/20"
                  >
                    {isSubmitting ? "Uploading..." : "Submit Receipt"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

