/* eslint-disable react/no-unescaped-entities, @next/next/no-img-element */
"use client";

import React, { useState, useEffect } from "react";
import SecureIdleTimer from "@/components/shared/SecureIdleTimer";
import PrivacyTermsModal from "@/components/shared/PrivacyTermsModal";
import {
  Book,
  CheckCircle,
  ClipboardList,
  FileSignature,
  FileText,
  Flame,
  Handshake,
  Home,
  CreditCard,
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
  Clock,
  AlertCircle,
  FileWarning,
  Building2,
  CheckCircle2,
  Upload,
  Shield,
  Hourglass,
  Receipt,
  Check,
  Hash,
  UserCheck
} from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { getCurrentUserResident, cancelTransaction, uploadECopyAction, saveBfpClearanceProofAction, saveZoningClearanceProofAction } from "@/app/admin/transactions/actions";
import { submitBuildingPermit, saveTransactionSignature, getExistingBuildingPermits, resubmitBuildingPermit, submitBuildingPermitPaymentProof, submitClearancesForReviewAction } from "./actions";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useDraft } from "@/hooks/useDraft";
import { clearDraftFiles } from "@/lib/draftDb";
import DocumentViewerModal from "@/components/shared/DocumentViewerModal";
import { supabase } from "@/lib/supabase";

const STEPS = [
  { id: "GUIDE", label: "Guide", icon: ClipboardList },
  { id: "PROFILE", label: "Profile", icon: User },
  { id: "DOCUMENTS", label: "Upload", icon: Upload },
  { id: "EVALUATION", label: "Evaluation", icon: Building2 },
  { id: "TREASURY", label: "Treasury & Zoning", icon: Landmark },
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


export default function BuildingPermitPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState("GUIDE");
  const [hasReadGuide, setHasReadGuide] = useState(true);
  const [existingApplications, setExistingApplications] = useState<any[]>([]);
  const [selectedApplication, setSelectedApplication] = useState<any>(null);
  const [residentData, setResidentData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRevision, setIsRevision] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentPreviewUrl, setPaymentPreviewUrl] = useState<string | null>(null);
  const [gcashReferenceNo, setGcashReferenceNo] = useState("");
  const [paymentFile, setPaymentFile] = useState<File | null>(null);

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerTitle, setViewerTitle] = useState("");
  const [viewerFile, setViewerFile] = useState<File | null>(null);

  const isEditable = !selectedApplication || isRevision;

  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [idChoice, setIdChoice] = useState<"PROFILE" | "UPLOAD">("PROFILE");
  const [activeDocTab, setActiveDocTab] = useState<"REQUIREMENTS" | "PERMITS">("REQUIREMENTS");
  const [uploadedRequirements, setUploadedRequirements] = useState<Record<number, File>>({});
  const [uploadedPermits, setUploadedPermits] = useState<Record<number, File>>({});
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
    occupancyCategory: "Residential",
    selectedSubOccupancies: [] as string[],
    subOccupancyOthersSpecify: "",
    estimatedCost: "",
    locationOfConstruction: "",
    isLotOwner: "",
    newIdFile: null as File | null,
    tctFile: null as File | null,
    occupancyUse: "",
    otherOccupancyUse: "",
  });
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const hasTctFile = !!(
    formData.tctFile ||
    selectedApplication?.additionalData?.documents?.tctFile ||
    (uploadedRequirements && uploadedRequirements[2]) ||
    selectedApplication?.additionalData?.documents?.req_2
  );

  const [maxStepIdx, setMaxStepIdx] = useState(0);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);

  const { hydrateDraft, persistDraft, hydrateDraftFiles, persistDraftFile } = useDraft<any>("building_permit_draft");

  useEffect(() => {
    hydrateDraft(() => { }, (parsed: any) => {
      if (parsed) {
        if (parsed.formData) {
          const oldCategory = parsed.formData.occupancyCategory || (parsed.formData.occupancyUse?.startsWith("Other") ? "Other Construction" : (parsed.formData.occupancyUse || "Residential"));
          const oldSpecify = parsed.formData.subOccupancyOthersSpecify || parsed.formData.otherOccupancyUse || "";
          const parsedDesc = parseDescriptionOfWork(parsed.formData.descriptionOfWork || "");
          setFormData(prev => ({
            ...prev,
            ...parsed.formData,
            occupancyCategory: oldCategory,
            subOccupancyOthersSpecify: oldSpecify,
            selectedSubOccupancies: parsed.formData.selectedSubOccupancies || [],
            locationOfConstruction: parsed.formData.locationOfConstruction || "",
            isLotOwner: parsed.formData.isLotOwner || "",
            scopeNewConstruction: parsed.formData.scopeNewConstruction ?? parsedDesc.newConstruction,
            scopeAddition: parsed.formData.scopeAddition ?? parsedDesc.addition,
            scopeAdditionText: parsed.formData.scopeAdditionText ?? parsedDesc.additionText,
            scopeRepair: parsed.formData.scopeRepair ?? parsedDesc.repair,
            scopeRepairText: parsed.formData.scopeRepairText ?? parsedDesc.repairText,
            scopeRenovation: parsed.formData.scopeRenovation ?? parsedDesc.renovation,
            scopeRenovationText: parsed.formData.scopeRenovationText ?? parsedDesc.renovationText,
            scopeDemolition: parsed.formData.scopeDemolition ?? parsedDesc.demolition,
            scopeDemolitionText: parsed.formData.scopeDemolitionText ?? parsedDesc.demolitionText,
            scopeOthers1: parsed.formData.scopeOthers1 ?? parsedDesc.others1,
            scopeOthers1Text1: parsed.formData.scopeOthers1Text1 ?? parsedDesc.others1Text1,
            scopeOthers1Text2: parsed.formData.scopeOthers1Text2 ?? parsedDesc.others1Text2,
            scopeOthers2: parsed.formData.scopeOthers2 ?? parsedDesc.others2,
            scopeOthers2Text1: parsed.formData.scopeOthers2Text1 ?? parsedDesc.others2Text1,
            scopeOthers2Text2: parsed.formData.scopeOthers2Text2 ?? parsedDesc.others2Text2,
            descriptionOfWorkLegacyText: parsed.formData.descriptionOfWorkLegacyText ?? parsedDesc.legacyText,
          }));
        }
        if (parsed.currentStep) setCurrentStep(parsed.currentStep);
        if (parsed.idChoice) setIdChoice(parsed.idChoice);
        if (parsed.signatureData) setSignatureData(parsed.signatureData);
        if (parsed.activeDocTab) setActiveDocTab(parsed.activeDocTab);
      }
    });

    hydrateDraftFiles((files) => {
      const reqs: Record<number, File> = {};
      const perms: Record<number, File> = {};
      let nIdFile: File | null = null;
      let tFile: File | null = null;

      Object.entries(files).forEach(([key, file]) => {
        if (key.startsWith("req_")) {
          reqs[parseInt(key.split("_")[1])] = file;
        } else if (key.startsWith("permit_")) {
          perms[parseInt(key.split("_")[1])] = file;
        } else if (key === "newIdFile") {
          nIdFile = file;
        } else if (key === "tctFile") {
          tFile = file;
        }
      });

      if (Object.keys(reqs).length > 0) setUploadedRequirements(prev => ({ ...prev, ...reqs }));
      if (Object.keys(perms).length > 0) setUploadedPermits(prev => ({ ...prev, ...perms }));
      if (nIdFile || tFile) {
        setFormData(prev => ({
          ...prev,
          ...(nIdFile && { newIdFile: nIdFile }),
          ...(tFile && { tctFile: tFile })
        }));
      }
    });
  }, [hydrateDraft, hydrateDraftFiles]);

  useEffect(() => {
    if (loading || selectedApplication) return;
    persistDraft({
      formData: {
        descriptionOfWork: formData.descriptionOfWork,
        scopeNewConstruction: formData.scopeNewConstruction,
        scopeAddition: formData.scopeAddition,
        scopeAdditionText: formData.scopeAdditionText,
        scopeRepair: formData.scopeRepair,
        scopeRepairText: formData.scopeRepairText,
        scopeRenovation: formData.scopeRenovation,
        scopeRenovationText: formData.scopeRenovationText,
        scopeDemolition: formData.scopeDemolition,
        scopeDemolitionText: formData.scopeDemolitionText,
        scopeOthers1: formData.scopeOthers1,
        scopeOthers1Text1: formData.scopeOthers1Text1,
        scopeOthers1Text2: formData.scopeOthers1Text2,
        scopeOthers2: formData.scopeOthers2,
        scopeOthers2Text1: formData.scopeOthers2Text1,
        scopeOthers2Text2: formData.scopeOthers2Text2,
        descriptionOfWorkLegacyText: formData.descriptionOfWorkLegacyText,
        occupancyCategory: formData.occupancyCategory,
        selectedSubOccupancies: formData.selectedSubOccupancies,
        subOccupancyOthersSpecify: formData.subOccupancyOthersSpecify,
        estimatedCost: formData.estimatedCost,
        locationOfConstruction: formData.locationOfConstruction,
        isLotOwner: formData.isLotOwner,
        occupancyUse: formData.occupancyCategory === "Other Construction" ? "Other" : formData.occupancyCategory,
        otherOccupancyUse: formData.subOccupancyOthersSpecify,
      },
      currentStep,
      idChoice,
      signatureData,
      activeDocTab,
    });
  }, [
    formData.descriptionOfWork,
    formData.scopeNewConstruction,
    formData.scopeAddition,
    formData.scopeAdditionText,
    formData.scopeRepair,
    formData.scopeRepairText,
    formData.scopeRenovation,
    formData.scopeRenovationText,
    formData.scopeDemolition,
    formData.scopeDemolitionText,
    formData.scopeOthers1,
    formData.scopeOthers1Text1,
    formData.scopeOthers1Text2,
    formData.scopeOthers2,
    formData.scopeOthers2Text1,
    formData.scopeOthers2Text2,
    formData.descriptionOfWorkLegacyText,
    formData.occupancyCategory,
    formData.selectedSubOccupancies,
    formData.subOccupancyOthersSpecify,
    formData.estimatedCost,
    formData.locationOfConstruction,
    formData.isLotOwner,
    currentStep,
    idChoice,
    signatureData,
    activeDocTab,
    loading,
    persistDraft,
    selectedApplication
  ]);

  useEffect(() => {
    const currentStepIdx = STEPS.findIndex(s => s.id === currentStep);
    if (currentStepIdx > maxStepIdx) {
      setMaxStepIdx(currentStepIdx);
    }
  }, [currentStep, maxStepIdx]);

  const isAffidavitOfConsentRequired = formData.isLotOwner === "No";
  const requiredRequirementIndexes = Array.from({ length: 10 }, (_, index) => index)
    .filter(index => ![2, 5, 8].includes(index) && (isAffidavitOfConsentRequired || index !== 7));
  const requiredRequirementsCount = requiredRequirementIndexes.length;
  const uploadedRequirementKeys = new Set([
    ...Object.keys(selectedApplication?.additionalData?.documents || {}).filter(k => k.startsWith("req_")),
    ...Object.keys(uploadedRequirements).map(k => `req_${k}`)
  ]);
  const requirementsProgress = requiredRequirementIndexes
    .filter(index => uploadedRequirementKeys.has(`req_${index}`)).length;

  const requiredPermitIndexes = Array.from({ length: 7 }, (_, index) => index)
    .filter(index => index !== 4);
  const requiredPermitsCount = requiredPermitIndexes.length;
  const uploadedPermitKeys = new Set([
    ...Object.keys(selectedApplication?.additionalData?.documents || {}).filter(k => k.startsWith("permit_")),
    ...Object.keys(uploadedPermits).map(k => `permit_${k}`)
  ]);
  const permitsProgress = requiredPermitIndexes
    .filter(index => uploadedPermitKeys.has(`permit_${index}`)).length;

  const totalUploaded = requirementsProgress + permitsProgress;
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
    "Signed & Sealed Plans"
  ];

  const permitTypesList = [
    "1. Electrical Permit",
    "2. Plumbing Permit",
    "3. Sanitary Permit",
    "4. Excavation & Ground Preparation Permit",
    "5. Fencing Permit",
    "6. Scaffolding Permit",
    "7. Mechanical Permit"
  ];

  useEffect(() => {
    async function init() {
      try {
        const [res, permitsRes] = await Promise.all([
          getCurrentUserResident(),
          getExistingBuildingPermits()
        ]);
        if (res.success && res.data) {
          setResidentData(res.data);
        }
        if (permitsRes.success && permitsRes.data.length > 0) {
          setExistingApplications(permitsRes.data);
          const hasActive = permitsRes.data.some((app: any) =>
            !["RELEASED", "REJECTED", "DELIVERED", "CANCELLED"].includes(app.status) && !app.isCancelled
          );
          if (hasActive) {
            localStorage.removeItem("building_permit_draft");
            await clearDraftFiles("building_permit_draft");
            setCurrentStep("EXISTING");
          } else {
            const hasDraft = localStorage.getItem("building_permit_draft");
            if (!hasDraft) {
              setCurrentStep("EXISTING");
            }
          }
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
        isLotOwner: addData.isLotOwner || "",
        newIdFile: null,
        tctFile: null,
        occupancyUse: addData.occupancyUse || "",
        otherOccupancyUse: parsedOccupancy.specify,
      });
      if (addData.signature) {
        setSignatureData(addData.signature);
      }
      if (addData.documents?.newIdFile) {
        setIdChoice("UPLOAD");
      } else {
        setIdChoice("PROFILE");
      }
    }
  }, [selectedApplication]);

  const handleUploadBfpClearance = async (file: File | null) => {
    if (!file || !selectedApplication) return;
    const toastId = toast.loading("Uploading BFP Clearance Proof...");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await uploadECopyAction(formData);
      if (uploadRes.success && uploadRes.data) {
        const fileUrl = uploadRes.data as string;
        const updateRes = await saveBfpClearanceProofAction(selectedApplication.id, fileUrl);
        if (updateRes.success) {
          toast.success("BFP Clearance Proof uploaded successfully!", { id: toastId });
          const res = await getExistingBuildingPermits();
          if (res.success && res.data) {
            setExistingApplications(res.data);
            const updated = res.data.find((a: any) => a.id === selectedApplication.id);
            if (updated) setSelectedApplication(updated);
          }
        } else {
          toast.error(updateRes.error || "Failed to save clearance proof", { id: toastId });
        }
      } else {
        toast.error(uploadRes.error || "Upload failed", { id: toastId });
      }
    } catch {
      toast.error("An error occurred during upload", { id: toastId });
    }
  };

  const handleUploadZoningClearance = async (file: File | null) => {
    if (!file || !selectedApplication) return;
    const toastId = toast.loading("Uploading Zoning Clearance Proof...");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await uploadECopyAction(formData);
      if (uploadRes.success && uploadRes.data) {
        const fileUrl = uploadRes.data as string;
        const updateRes = await saveZoningClearanceProofAction(selectedApplication.id, fileUrl);
        if (updateRes.success) {
          toast.success("Zoning Clearance Proof uploaded successfully!", { id: toastId });
          const res = await getExistingBuildingPermits();
          if (res.success && res.data) {
            setExistingApplications(res.data);
            const updated = res.data.find((a: any) => a.id === selectedApplication.id);
            if (updated) setSelectedApplication(updated);
          }
        } else {
          toast.error(updateRes.error || "Failed to save clearance proof", { id: toastId });
        }
      } else {
        toast.error(uploadRes.error || "Upload failed", { id: toastId });
      }
    } catch {
      toast.error("An error occurred during upload", { id: toastId });
    }
  };

  const handlePaymentFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPaymentFile(file);
      setPaymentPreviewUrl(URL.createObjectURL(file));
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
      infoType: "tip",
      infoLabel: "Tip",
      infoText: "Bring a small token or be courteous when requesting signatures. This avoids future boundary disputes."
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
        "Similar to #7, but this is a formal sworn affidavit.",
        "Prepare an \"Affidavit of Adjoining Lot Owners\" stating they have no objection.",
        "Visit each adjoining owner and have them sign the affidavit.",
        "Bring the signed document to a Notary Public for notarization.",
        "The notary will administer oath and affix notarial seal."
      ],
      infoType: "note",
      infoLabel: "Legal weight",
      infoText: "A notarized affidavit is stronger evidence than a simple confirmation."
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

  const uploadFileClientSide = async (file: File | null, folder: string, keyName: string) => {
    if (!file) return null;
    try {
      const userId = (selectedApplication?.residentSnapshot || residentData)?.id || "anonymous";
      const timestamp = Date.now();
      const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `building-permits/${userId}/${folder}/${timestamp}-${cleanFileName}`;

      const { error } = await supabase.storage
        .from("system-assets")
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) {
        console.error(`Upload error for ${keyName}:`, error);
        throw error;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("system-assets")
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (err) {
      console.error(`Failed uploading ${keyName}:`, err);
      throw new Error(`Failed to upload ${file.name}`);
    }
  };

  const handleSubmit = async () => {
    if (requirementsProgress < requiredRequirementsCount || permitsProgress < requiredPermitsCount || !signatureData || !privacyAccepted) {
      setShowValidationErrors(true);
      if (requirementsProgress < requiredRequirementsCount) {
        toast.warning(`Please ensure ALL ${requiredRequirementsCount} required documents are provided.`);
        setActiveDocTab("REQUIREMENTS");
      } else if (permitsProgress < requiredPermitsCount) {
        toast.warning(`Please ensure ALL ${requiredPermitsCount} required permits are provided.`);
        setActiveDocTab("PERMITS");
      } else if (!signatureData) {
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

      // 1. Upload ID
      let idFileUrl: string | null = null;
      if (idChoice === "UPLOAD" && formData.newIdFile) {
        idFileUrl = await uploadFileClientSide(formData.newIdFile, "ids", "newIdFile");
      } else if (idChoice === "PROFILE") {
        const profileIdUrl = displayResident?.idFrontUrl || displayResident?.idBackUrl;
        if (profileIdUrl) {
          if (profileIdUrl.startsWith("data:")) {
            const file = dataURLtoFile(profileIdUrl, "profile_id");
            if (file) {
              idFileUrl = await uploadFileClientSide(file, "ids", "newIdFile");
            }
          } else if (profileIdUrl.startsWith("http")) {
            idFileUrl = profileIdUrl;
          }
        }
      }

      // 2. Upload TCT
      let tctFileUrl: string | null = null;
      if (formData.tctFile) {
        tctFileUrl = await uploadFileClientSide(formData.tctFile, "tct", "tctFile");
      } else if (selectedApplication?.additionalData?.documents?.tctFile) {
        tctFileUrl = selectedApplication.additionalData.documents.tctFile;
      }

      // 3. Upload Requirements
      const finalReqUrls: Record<string, string> = {};
      for (let i = 0; i < 10; i++) {
        if (i === 5 || (i === 7 && !isAffidavitOfConsentRequired)) continue;
        const file = uploadedRequirements[i];
        if (file) {
          const url = await uploadFileClientSide(file, "requirements", `req_${i}`);
          if (url) finalReqUrls[`req_${i}`] = url;
        } else {
          const existingUrl = selectedApplication?.additionalData?.documents?.[`req_${i}`];
          if (existingUrl) finalReqUrls[`req_${i}`] = existingUrl;
        }
      }

      // 4. Upload Permits
      const finalPermitUrls: Record<string, string> = {};
      for (let i = 0; i < 7; i++) {
        const file = uploadedPermits[i];
        if (file) {
          const url = await uploadFileClientSide(file, "permits", `permit_${i}`);
          if (url) finalPermitUrls[`permit_${i}`] = url;
        } else {
          const existingUrl = selectedApplication?.additionalData?.documents?.[`permit_${i}`];
          if (existingUrl) finalPermitUrls[`permit_${i}`] = existingUrl;
        }
      }

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

      if (idFileUrl) {
        data.append("newIdFile", idFileUrl);
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

      let result;
      if (isRevision && selectedApplication) {
        result = await resubmitBuildingPermit(selectedApplication.id, data);
      } else {
        result = await submitBuildingPermit(data);
      }

      if (result.success) {
        if (!isRevision) {
          await saveTransactionSignature(result.transactionId!, signatureData);
        }
        localStorage.removeItem("building_permit_draft");
        await clearDraftFiles("building_permit_draft");
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
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-12 pb-32 font-sans">
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
            <BreadcrumbList className="bg-white/80 dark:bg-white/5 backdrop-blur-md px-4 md:px-6 py-2 md:py-2.5 rounded-xl md:rounded-2xl border border-slate-200 dark:border-white/10 w-fit shadow-sm">
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
      {currentStep !== "EXISTING" && (() => {
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
                      isCompleted ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30" :
                        "bg-slate-100 dark:bg-white/5 text-slate-400 border-transparent group-hover:border-primary/30"
                  )}>
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

        {currentStep === "EXISTING" && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="text-center mb-8">
              <h2 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter leading-tight">
                Existing <span className="text-primary italic">Applications</span>
              </h2>
              <p className="text-slate-500 font-medium italic text-xs md:text-lg uppercase tracking-widest max-w-2xl mx-auto mt-2">
                We found existing Building Permit records under your name.
              </p>
            </div>

            <div className="grid gap-4">
              {existingApplications.map((app, idx) => (
                <div
                  key={app.id || idx}
                  onClick={() => {
                    setSelectedApplication(app);
                    setFormData(prev => ({
                      ...prev,
                      descriptionOfWork: app.additionalData?.descriptionOfWork || "",
                      occupancyUse: app.additionalData?.occupancyUse?.startsWith("Other") ? "Other" : (app.additionalData?.occupancyUse || "Residential (Single Family)"),
                      otherOccupancyUse: app.additionalData?.occupancyUse?.startsWith("Other") ? app.additionalData.occupancyUse.replace("Other - ", "") : "",
                      estimatedCost: app.additionalData?.estimatedCost || "",
                      isLotOwner: app.additionalData?.isLotOwner || "",
                      newIdFile: null,
                      tctFile: null
                    }));
                    setIsRevision(false);
                    let newMaxIdx = 3;
                    let initialStep = "EVALUATION";
                    if (["FOR_CLAIM", "FOR_PICKING", "RELEASED", "DELIVERED"].includes(app.status)) {
                      newMaxIdx = 5;
                      initialStep = "SUBMIT";
                    } else if (["UNPAID", "PAID", "TREASURY_REVISION", "FOR_PROCESSING"].includes(app.status)) {
                      newMaxIdx = 4;
                      initialStep = "TREASURY";
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
                    {/* UPDATED: Dynamic styling kapag cancelled yung application */}
                    <span className={cn(
                      "text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full",
                      app.isCancelled || app.status === "CANCELLED"
                        ? "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-500"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-500"
                    )}>
                      {app.isCancelled || app.status === "CANCELLED" ? "CANCELLED" : (app.status ? app.status.replace(/_/g, ' ') : "PENDING")}
                    </span>
                    <span className="text-primary group-hover:translate-x-1 transition-transform font-bold">
                      →
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {hasActiveApplication ? (
              <div className="mt-12 border-t border-slate-200 dark:border-white/10 pt-8 flex flex-col items-center">
                <div className="bg-amber-500/10 dark:bg-amber-500/5 border border-amber-500/20 dark:border-amber-500/10 rounded-2xl p-6 max-w-xl text-center space-y-3 shadow-[0_0_20px_rgba(245,158,11,0.05)]">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 mb-1">
                    <AlertCircle className="w-6 h-6 animate-pulse" />
                  </div>
                  <h4 className="font-black text-slate-800 dark:text-white uppercase tracking-wider text-sm">
                    Active Application In Progress
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                    You currently have a pending building permit application. To ensure proper processing, LGU Mapandan regulations require your active application to be completed (Released) or Rejected before starting a new one.
                  </p>
                  <div className="text-[10px] text-amber-600 dark:text-amber-500/80 font-bold uppercase tracking-widest bg-amber-500/[0.03] border border-amber-500/10 px-3 py-1 rounded-full w-fit mx-auto italic">
                    New Application Locked
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-12 flex justify-center border-t border-slate-200 dark:border-white/10 pt-8">
                <button
                  onClick={() => {
                    setSelectedApplication(null);
                    setSignatureData(null);
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
                      occupancyCategory: "Residential",
                      selectedSubOccupancies: [],
                      subOccupancyOthersSpecify: "",
                      estimatedCost: "",
                      locationOfConstruction: "",
                      isLotOwner: "",
                      newIdFile: null,
                      tctFile: null,
                      occupancyUse: "Residential (Single Family)",
                      otherOccupancyUse: "",
                    });
                    setUploadedRequirements({});
                    setUploadedPermits({});
                    setCurrentStep("GUIDE");
                  }}
                  className="bg-emerald-500 text-white hover:bg-emerald-600 px-8 py-4 rounded-[2rem] font-black uppercase tracking-widest text-[10px] md:text-xs flex items-center gap-3 transition-all shadow-xl shadow-emerald-500/20"
                >
                  Start a New Application
                  <span className="text-xl leading-none">+</span>
                </button>
              </div>
            )}
          </div>
        )}


        {currentStep === "GUIDE" && (
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

        {currentStep === "PROFILE" && (() => {
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
                      <div className="absolute top-4 right-4 bg-emerald-500/10 text-emerald-600 font-bold text-[10px] uppercase tracking-widest px-3 py-1 rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Imported from your registration
                      </div>
                      <div className="flex items-center gap-2 mb-4">
                        <User className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                        <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-tighter text-md italic">Personal Information</h4>
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
                          <div className="bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 p-6 flex flex-col items-center justify-center text-center relative overflow-hidden shadow-sm">
                            {(() => {
                              const url = selectedApplication.additionalData.documents.newIdFile;
                              const isImage = /\.(jpg|jpeg|png|webp|gif)($|\?)/i.test(url);
                              return (
                                <div className="space-y-4 w-full flex flex-col items-center">
                                  {isImage ? (
                                    <img src={url} alt="Uploaded Government ID" className="max-h-48 object-contain rounded-lg border border-slate-200 dark:border-white/10" />
                                  ) : (
                                    <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                                      <FileText className="w-8 h-8" />
                                    </div>
                                  )}
                                  <p className="text-xs font-semibold text-slate-500">Government ID is uploaded and verified</p>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setViewerUrl(url);
                                      setViewerTitle("Government ID");
                                      setViewerOpen(true);
                                    }}
                                    className="inline-flex items-center gap-2 text-xs font-bold text-primary hover:underline"
                                  >
                                    View Full ID ↗
                                  </button>
                                </div>
                              );
                            })()}
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
                        ) : (
                          <div className={cn("bg-white dark:bg-black/20 rounded-xl border border-dashed p-8 flex flex-col items-center justify-center text-center relative hover:bg-slate-50 dark:hover:bg-white/5 transition-colors overflow-hidden", (showValidationErrors && idChoice === "UPLOAD" && !formData.newIdFile && !selectedApplication?.additionalData?.documents?.newIdFile) ? "border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-pulse" : "border-slate-300 dark:border-white/20")}>
                            {(() => {
                              if (formData.newIdFile && formData.newIdFile.type.startsWith("image/")) {
                                return (
                                  <div className="w-full h-full absolute inset-0 z-0 bg-slate-900 group/preview">
                                    <img src={URL.createObjectURL(formData.newIdFile)} alt="Preview" className="w-full h-full object-contain" />
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/preview:opacity-100 transition-opacity flex flex-col justify-center items-center z-10 gap-3">
                                      <button
                                        type="button"
                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setViewerFile(formData.newIdFile); setViewerTitle("Government ID"); setViewerOpen(true); }}
                                        className="px-4 py-1.5 bg-primary text-white text-[10px] uppercase font-bold rounded-full shadow-lg hover:bg-primary/90"
                                      >
                                        Preview Image
                                      </button>
                                      <label htmlFor="upload-newIdFile" className="px-4 py-1.5 bg-slate-700 text-white text-[10px] uppercase font-bold rounded-full shadow-lg hover:bg-slate-600 cursor-pointer">
                                        Replace Image
                                      </label>
                                    </div>
                                  </div>
                                );
                              } else if (isRevision && !formData.newIdFile && selectedApplication?.additionalData?.documents?.newIdFile && /\.(jpg|jpeg|png|webp|gif)($|\?)/i.test(selectedApplication.additionalData.documents.newIdFile)) {
                                return (
                                  <div className="w-full h-full absolute inset-0 z-0 bg-slate-900 group/preview">
                                    <img src={selectedApplication.additionalData.documents.newIdFile} alt="Preview" className="w-full h-full object-contain" />
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/preview:opacity-100 transition-opacity flex flex-col justify-center items-center z-10 gap-3">
                                      <button
                                        type="button"
                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setViewerUrl(selectedApplication.additionalData.documents.newIdFile); setViewerTitle("Government ID"); setViewerOpen(true); }}
                                        className="px-4 py-1.5 bg-primary text-white text-[10px] uppercase font-bold rounded-full shadow-lg hover:bg-primary/90"
                                      >
                                        Preview Image
                                      </button>
                                      <label htmlFor="upload-newIdFile" className="px-4 py-1.5 bg-slate-700 text-white text-[10px] uppercase font-bold rounded-full shadow-lg hover:bg-slate-600 cursor-pointer">
                                        Replace Image
                                      </label>
                                    </div>
                                  </div>
                                );
                              } else if (formData.newIdFile) {
                                return (
                                  <div className="w-full h-full absolute inset-0 z-0 bg-slate-100 dark:bg-black/40 flex flex-col justify-center items-center group/preview">
                                    <FileText className="w-10 h-10 text-primary mb-2" />
                                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300 max-w-[80%] truncate">{formData.newIdFile.name}</p>
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/preview:opacity-100 transition-opacity flex flex-col justify-center items-center z-10 gap-3">
                                      <button
                                        type="button"
                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setViewerFile(formData.newIdFile); setViewerTitle("Government ID"); setViewerOpen(true); }}
                                        className="px-4 py-1.5 bg-primary text-white text-[10px] uppercase font-bold rounded-full shadow-lg hover:bg-primary/90"
                                      >
                                        Preview Document
                                      </button>
                                      <label htmlFor="upload-newIdFile" className="px-4 py-1.5 bg-slate-700 text-white text-[10px] uppercase font-bold rounded-full shadow-lg hover:bg-slate-600 cursor-pointer">
                                        Replace Document
                                      </label>
                                    </div>
                                  </div>
                                );
                              } else if (isRevision && !formData.newIdFile && selectedApplication?.additionalData?.documents?.newIdFile) {
                                return (
                                  <div className="w-full h-full absolute inset-0 z-0 bg-slate-100 dark:bg-black/40 flex flex-col justify-center items-center group/preview">
                                    <FileText className="w-10 h-10 text-primary mb-2" />
                                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300 max-w-[80%] truncate">Existing Document</p>
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/preview:opacity-100 transition-opacity flex flex-col justify-center items-center z-10 gap-3">
                                      <button
                                        type="button"
                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setViewerUrl(selectedApplication.additionalData.documents.newIdFile); setViewerTitle("Government ID"); setViewerOpen(true); }}
                                        className="px-4 py-1.5 bg-primary text-white text-[10px] uppercase font-bold rounded-full shadow-lg hover:bg-primary/90"
                                      >
                                        Preview Document
                                      </button>
                                      <label htmlFor="upload-newIdFile" className="px-4 py-1.5 bg-slate-700 text-white text-[10px] uppercase font-bold rounded-full shadow-lg hover:bg-slate-600 cursor-pointer">
                                        Replace Document
                                      </label>
                                    </div>
                                  </div>
                                );
                              }
                              return (
                                <label htmlFor="upload-newIdFile" className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer z-20">
                                  <Upload className="w-8 h-8 text-slate-400 mb-2 pointer-events-none" />
                                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400 pointer-events-none px-2">
                                    Click to upload (JPG/PNG/PDF, max 5MB)
                                  </p>
                                </label>
                              );
                            })()}
                            <input
                              id="upload-newIdFile"
                              type="file"
                              accept="image/*,application/pdf,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.rtf"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file && file.size > 5 * 1024 * 1024) {
                                  toast.error("File size exceeds 5MB limit.");
                                  e.target.value = "";
                                  setFormData({ ...formData, newIdFile: null });
                                  persistDraftFile("newIdFile", null);
                                  return;
                                }
                                setFormData({ ...formData, newIdFile: file || null });
                                persistDraftFile("newIdFile", file || null);
                              }}
                            />
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
                        {!isEditable ? (
                          <div className="bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 p-6 flex flex-col items-center justify-center text-center relative overflow-hidden shadow-sm">
                            {(() => {
                              const url = selectedApplication.additionalData?.documents?.tctFile;
                              if (!url) {
                                return <p className="text-sm font-medium text-slate-500 italic">No TCT Document uploaded.</p>;
                              }
                              const isImage = /\.(jpg|jpeg|png|webp|gif)($|\?)/i.test(url);
                              return (
                                <div className="space-y-4 w-full flex flex-col items-center">
                                  {isImage ? (
                                    <img src={url} alt="TCT Document" className="max-h-48 object-contain rounded-lg border border-slate-200 dark:border-white/10" />
                                  ) : (
                                    <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                                      <FileText className="w-8 h-8" />
                                    </div>
                                  )}
                                  <p className="text-xs font-semibold text-slate-500">TCT Document is uploaded and verified</p>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setViewerUrl(url);
                                      setViewerTitle("TCT Document");
                                      setViewerOpen(true);
                                    }}
                                    className="inline-flex items-center gap-2 text-xs font-bold text-primary hover:underline"
                                  >
                                    View Full Document ↗
                                  </button>
                                </div>
                              );
                            })()}
                          </div>
                        ) : (
                          <div className={cn("bg-white dark:bg-black/20 rounded-xl border border-dashed p-8 flex flex-col items-center justify-center text-center relative hover:bg-slate-50 dark:hover:bg-white/5 transition-colors overflow-hidden", (showValidationErrors && !hasTctFile) ? "border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-pulse" : "border-slate-300 dark:border-white/20")}>
                            {(() => {
                              if (formData.tctFile && formData.tctFile.type.startsWith("image/")) {
                                return (
                                  <div className="w-full h-full absolute inset-0 z-0 bg-slate-900 group/preview">
                                    <img src={URL.createObjectURL(formData.tctFile)} alt="Preview" className="w-full h-full object-contain" />
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/preview:opacity-100 transition-opacity flex flex-col justify-center items-center z-10 gap-3">
                                      <button
                                        type="button"
                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setViewerFile(formData.tctFile); setViewerTitle("TCT Document"); setViewerOpen(true); }}
                                        className="px-4 py-1.5 bg-primary text-white text-[10px] uppercase font-bold rounded-full shadow-lg hover:bg-primary/90"
                                      >
                                        Preview Image
                                      </button>
                                      <label htmlFor="upload-tctFile" className="px-4 py-1.5 bg-slate-700 text-white text-[10px] uppercase font-bold rounded-full shadow-lg hover:bg-slate-600 cursor-pointer">
                                        Replace Image
                                      </label>
                                    </div>
                                  </div>
                                );
                              } else if (isRevision && !formData.tctFile && selectedApplication?.additionalData?.documents?.tctFile && /\.(jpg|jpeg|png|webp|gif)($|\?)/i.test(selectedApplication.additionalData.documents.tctFile)) {
                                return (
                                  <div className="w-full h-full absolute inset-0 z-0 bg-slate-900 group/preview">
                                    <img src={selectedApplication.additionalData.documents.tctFile} alt="Preview" className="w-full h-full object-contain" />
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/preview:opacity-100 transition-opacity flex flex-col justify-center items-center z-10 gap-3">
                                      <button
                                        type="button"
                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setViewerUrl(selectedApplication.additionalData.documents.tctFile); setViewerTitle("TCT Document"); setViewerOpen(true); }}
                                        className="px-4 py-1.5 bg-primary text-white text-[10px] uppercase font-bold rounded-full shadow-lg hover:bg-primary/90"
                                      >
                                        Preview Image
                                      </button>
                                      <label htmlFor="upload-tctFile" className="px-4 py-1.5 bg-slate-700 text-white text-[10px] uppercase font-bold rounded-full shadow-lg hover:bg-slate-600 cursor-pointer">
                                        Replace Image
                                      </label>
                                    </div>
                                  </div>
                                );
                              } else if (formData.tctFile) {
                                return (
                                  <div className="w-full h-full absolute inset-0 z-0 bg-slate-100 dark:bg-black/40 flex flex-col justify-center items-center group/preview">
                                    <FileText className="w-10 h-10 text-primary mb-2" />
                                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300 max-w-[80%] truncate">{formData.tctFile.name}</p>
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/preview:opacity-100 transition-opacity flex flex-col justify-center items-center z-10 gap-3">
                                      <button
                                        type="button"
                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setViewerFile(formData.tctFile); setViewerTitle("TCT Document"); setViewerOpen(true); }}
                                        className="px-4 py-1.5 bg-primary text-white text-[10px] uppercase font-bold rounded-full shadow-lg hover:bg-primary/90"
                                      >
                                        Preview Document
                                      </button>
                                      <label htmlFor="upload-tctFile" className="px-4 py-1.5 bg-slate-700 text-white text-[10px] uppercase font-bold rounded-full shadow-lg hover:bg-slate-600 cursor-pointer">
                                        Replace Document
                                      </label>
                                    </div>
                                  </div>
                                );
                              } else if (isRevision && !formData.tctFile && selectedApplication?.additionalData?.documents?.tctFile) {
                                return (
                                  <div className="w-full h-full absolute inset-0 z-0 bg-slate-100 dark:bg-black/40 flex flex-col justify-center items-center group/preview">
                                    <FileText className="w-10 h-10 text-primary mb-2" />
                                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300 max-w-[80%] truncate">Existing Document</p>
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/preview:opacity-100 transition-opacity flex flex-col justify-center items-center z-10 gap-3">
                                      <button
                                        type="button"
                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setViewerUrl(selectedApplication.additionalData.documents.tctFile); setViewerTitle("TCT Document"); setViewerOpen(true); }}
                                        className="px-4 py-1.5 bg-primary text-white text-[10px] uppercase font-bold rounded-full shadow-lg hover:bg-primary/90"
                                      >
                                        Preview Document
                                      </button>
                                      <label htmlFor="upload-tctFile" className="px-4 py-1.5 bg-slate-700 text-white text-[10px] uppercase font-bold rounded-full shadow-lg hover:bg-slate-600 cursor-pointer">
                                        Replace Document
                                      </label>
                                    </div>
                                  </div>
                                );
                              }
                              return (
                                <label htmlFor="upload-tctFile" className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer z-20">
                                  <Upload className="w-8 h-8 text-slate-400 mb-2 pointer-events-none" />
                                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400 pointer-events-none px-2">
                                    Click to upload certified true copy of TCT (PDF/JPG/PNG)
                                  </p>
                                </label>
                              );
                            })()}
                            <input
                              id="upload-tctFile"
                              type="file"
                              accept="image/*,application/pdf,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.rtf"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file && file.size > 5 * 1024 * 1024) {
                                  toast.error("File size exceeds 5MB limit.");
                                  e.target.value = "";
                                  setFormData({ ...formData, tctFile: null });
                                  persistDraftFile("tctFile", null);
                                  return;
                                }
                                setFormData({ ...formData, tctFile: file || null });
                                persistDraftFile("tctFile", file || null);
                              }}
                            />
                          </div>
                        )}
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
                          d. Estimated cost of the proposal <span className="text-red-500 text-lg">*</span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-500">₱</span>
                          <input
                            type="number"
                            min="0"
                            className={cn("w-full bg-white dark:bg-black/20 border rounded-xl p-4 pl-10 text-sm focus:ring-2 focus:ring-primary/20 outline-none", (showValidationErrors && (!formData.estimatedCost || Number(formData.estimatedCost) <= 0)) ? "border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-pulse" : "border-slate-200 dark:border-white/10")}
                            value={formData.estimatedCost}
                            onChange={e => {
                              const val = e.target.value;
                              if (val === "" || Number(val) >= 0) {
                                setFormData({ ...formData, estimatedCost: val });
                              }
                            }}
                            disabled={!isEditable}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                          e. Location of Construction (No. Street, Barangay, City / Municipality) <span className="text-red-500 text-lg">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="No. Street, Barangay, City / Municipality"
                          className={cn("w-full bg-white dark:bg-black/20 border rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none", (showValidationErrors && !formData.locationOfConstruction) ? "border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-pulse" : "border-slate-200 dark:border-white/10")}
                          value={formData.locationOfConstruction}
                          onChange={e => setFormData({ ...formData, locationOfConstruction: e.target.value })}
                          disabled={!isEditable}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                          f. Is the applicant the owner of the lot? <span className="text-red-500 text-lg">*</span>
                        </label>
                        <Select
                          value={formData.isLotOwner}
                          onValueChange={value => {
                            setFormData({ ...formData, isLotOwner: value });
                            if (value === "Yes") {
                              setUploadedRequirements(prev => {
                                const next = { ...prev };
                                delete next[7];
                                return next;
                              });
                              persistDraftFile("req_7", null);
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
                          !formData.locationOfConstruction ||
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
                      className="px-8 py-4 rounded-[2rem] font-black uppercase tracking-widest text-[10px] md:text-xs flex items-center gap-3 transition-all w-full md:w-auto bg-emerald-500 text-white hover:bg-emerald-600 shadow-xl shadow-emerald-500/20"
                    >
                      Next: Upload Docs & Permits
                      <span className="text-xl leading-none">→</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })()}

        {currentStep === "DOCUMENTS" && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            {/* Header */}
            <div className="space-y-3 md:space-y-4 mb-8">
              <h2 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter leading-tight flex items-center gap-4">
                <UploadCloud className="w-10 h-10 md:w-12 md:h-12 text-slate-800 dark:text-white" />
                <span className="text-slate-800 dark:text-white">Upload Documents & Permits</span>
              </h2>
              <p className="text-slate-500 font-medium text-xs md:text-sm uppercase tracking-widest">
                Upload all required documents and permits. Files must be PDF, JPG, or PNG (max 5MB each).
              </p>
            </div>

            <div className="bg-slate-100/50 dark:bg-white/5 border-l-4 border-slate-800 dark:border-white p-4 rounded-r-xl flex items-center gap-3 mb-8">
              <AlertCircle className="w-5 h-5 text-slate-800 dark:text-white shrink-0" />
              <p className="text-xs md:text-sm font-medium text-slate-700 dark:text-slate-300">
                <b>File Upload Rules:</b> Max 5MB per file · Allowed: .pdf, .jpg, .jpeg, .png only
              </p>
            </div>

            {/* Tabs */}
            <div className="flex flex-col sm:flex-row items-center gap-4 mb-8">
              <button
                onClick={() => setActiveDocTab("REQUIREMENTS")}
                className={cn(
                  "flex-1 py-4 px-6 rounded-full font-black uppercase tracking-widest text-[10px] md:text-xs flex items-center justify-center gap-3 transition-all border w-full",
                  activeDocTab === "REQUIREMENTS"
                    ? "bg-emerald-500 text-white border-emerald-500 shadow-xl shadow-emerald-500/20"
                    : "bg-white dark:bg-white/5 text-slate-500 border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10"
                )}
              >
                <FileText className="w-4 h-4" />
                Requirements ({requiredRequirementsCount} items)
              </button>
              <button
                onClick={() => setActiveDocTab("PERMITS")}
                className={cn(
                  "flex-1 py-4 px-6 rounded-full font-black uppercase tracking-widest text-[10px] md:text-xs flex items-center justify-center gap-3 transition-all border w-full",
                  activeDocTab === "PERMITS"
                    ? "bg-emerald-500 text-white border-emerald-500 shadow-xl shadow-emerald-500/20"
                    : "bg-white dark:bg-white/5 text-slate-500 border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10"
                )}
              >
                <FileSignature className="w-4 h-4" />
                Permits ({requiredPermitsCount} required)
              </button>
            </div>

            <h3 className="text-xl font-black text-slate-800 dark:text-white mb-6">
              {activeDocTab === "REQUIREMENTS" ? "Requirements" : "Permits"}
            </h3>

            {/* Document Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {(activeDocTab === "REQUIREMENTS"
                ? documentRequirementsList
                  .map((docName, idx) => ({ docName, idx }))
                  .filter(({ idx }) => idx !== 5 && (isAffidavitOfConsentRequired || idx !== 7))
                : permitTypesList.map((docName, idx) => ({ docName, idx }))
              ).map(({ docName, idx }) => {
                const key = activeDocTab === "REQUIREMENTS" ? `req_${idx}` : `permit_${idx}`;
                const fileUrl = selectedApplication?.additionalData?.documents?.[key];
                const newlyUploaded = activeDocTab === "REQUIREMENTS" ? !!uploadedRequirements[idx] : !!uploadedPermits[idx];
                const isUploaded = !isEditable ? !!fileUrl : (!!fileUrl || newlyUploaded);
                const isRequired = activeDocTab === "PERMITS"
                  ? requiredPermitIndexes.includes(idx)
                  : requiredRequirementIndexes.includes(idx);
                const hasError = showValidationErrors && isRequired && !isUploaded;
                return (
                  <div key={key} className={cn("bg-white/40 dark:bg-white/5 backdrop-blur-md border rounded-2xl p-5 shadow-sm transition-all group", hasError ? "border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-pulse" : "border-slate-200 dark:border-white/10 hover:border-primary/30")}>
                    <div className="flex justify-between items-start gap-4 mb-4">
                      <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm min-w-0 flex-1">
                        <span className="inline-flex items-center gap-1.5 flex-wrap">
                          <span className="text-lg">📄</span>
                          <span className="break-words">{docName}</span>
                          {isRequired ? (
                            <span className="text-red-500 ml-0.5 text-lg">*</span>
                          ) : (
                            <span className="text-[9px] uppercase tracking-wider text-slate-400 ml-1">Optional</span>
                          )}
                        </span>
                      </h4>
                      {isUploaded ? (
                        <span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-500 text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full shrink-0">
                          Uploaded
                        </span>
                      ) : (
                        <span className="bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-500 text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full shrink-0">
                          Pending
                        </span>
                      )}
                    </div>

                    {!isEditable ? (
                      <div className="bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 p-4 flex flex-col items-center justify-center text-center relative overflow-hidden min-h-[140px] shadow-sm">
                        {fileUrl ? (
                          (() => {
                            const isImage = /\.(jpg|jpeg|png|webp|gif)($|\?)/i.test(fileUrl);
                            return (
                              <div className="space-y-3 w-full flex flex-col items-center">
                                {isImage ? (
                                  <img src={fileUrl} alt={docName} className="max-h-24 object-contain rounded border border-slate-200 dark:border-white/10" />
                                ) : (
                                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                                    <FileText className="w-5 h-5" />
                                  </div>
                                )}
                                <p className="text-[10px] font-semibold text-slate-500">Document Uploaded</p>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setViewerUrl(fileUrl);
                                    setViewerTitle(docName);
                                    setViewerOpen(true);
                                  }}
                                  className="inline-flex items-center gap-1 text-[10px] font-bold text-primary hover:underline bg-transparent border-0 cursor-pointer"
                                >
                                  View Document ↗
                                </button>
                              </div>
                            );
                          })()
                        ) : (
                          <div className="text-center p-4">
                            <FileWarning className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                            <p className="text-xs font-semibold text-slate-400 italic">Not Uploaded / Not Required</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="bg-slate-50 dark:bg-black/20 rounded-xl border border-dashed border-slate-300 dark:border-white/20 p-6 flex flex-col items-center justify-center text-center relative hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer group-hover:border-primary/40 overflow-hidden min-h-[140px]">
                        {(() => {
                          const file = activeDocTab === "REQUIREMENTS" ? uploadedRequirements[idx] : uploadedPermits[idx];
                          if (file && file.type.startsWith("image/")) {
                            return (
                              <div className="w-full h-full absolute inset-0 z-0 bg-slate-900 group/preview">
                                <img src={URL.createObjectURL(file)} alt="Preview" className="w-full h-full object-contain" />
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/preview:opacity-100 transition-opacity flex flex-col justify-center items-center z-10 gap-3">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setViewerFile(file);
                                      setViewerTitle(docName);
                                      setViewerOpen(true);
                                    }}
                                    className="px-4 py-1.5 bg-primary text-white text-[10px] uppercase font-bold rounded-full shadow-lg hover:bg-primary/90"
                                  >
                                    Preview Image
                                  </button>
                                  <label htmlFor={`upload-${activeDocTab}-${idx}`} className="px-4 py-1.5 bg-slate-700 text-white text-[10px] uppercase font-bold rounded-full shadow-lg hover:bg-slate-600 cursor-pointer">
                                    Replace Image
                                  </label>
                                </div>
                              </div>
                            );
                          } else if (isRevision && !file && fileUrl && /\.(jpg|jpeg|png|webp|gif)($|\?)/i.test(fileUrl)) {
                            return (
                              <div className="w-full h-full absolute inset-0 z-0 bg-slate-900 group/preview">
                                <img src={fileUrl} alt="Preview" className="w-full h-full object-contain" />
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/preview:opacity-100 transition-opacity flex flex-col justify-center items-center z-10 gap-3">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setViewerUrl(fileUrl);
                                      setViewerTitle(docName);
                                      setViewerOpen(true);
                                    }}
                                    className="px-4 py-1.5 bg-primary text-white text-[10px] uppercase font-bold rounded-full shadow-lg hover:bg-primary/90"
                                  >
                                    Preview Image
                                  </button>
                                  <label htmlFor={`upload-${activeDocTab}-${idx}`} className="px-4 py-1.5 bg-slate-700 text-white text-[10px] uppercase font-bold rounded-full shadow-lg hover:bg-slate-600 cursor-pointer">
                                    Replace Image
                                  </label>
                                </div>
                              </div>
                            );
                          } else if (file) {
                            return (
                              <div className="w-full h-full absolute inset-0 z-0 bg-slate-100 dark:bg-black/40 flex flex-col justify-center items-center group/preview">
                                <FileText className="w-10 h-10 text-primary mb-2" />
                                <p className="text-xs font-bold text-slate-700 dark:text-slate-300 max-w-[80%] truncate">{file.name}</p>
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/preview:opacity-100 transition-opacity flex flex-col justify-center items-center z-10 gap-3">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setViewerFile(file);
                                      setViewerTitle(docName);
                                      setViewerOpen(true);
                                    }}
                                    className="px-4 py-1.5 bg-primary text-white text-[10px] uppercase font-bold rounded-full shadow-lg hover:bg-primary/90"
                                  >
                                    Preview Document
                                  </button>
                                  <label htmlFor={`upload-${activeDocTab}-${idx}`} className="px-4 py-1.5 bg-slate-700 text-white text-[10px] uppercase font-bold rounded-full shadow-lg hover:bg-slate-600 cursor-pointer">
                                    Replace Document
                                  </label>
                                </div>
                              </div>
                            );
                          } else if (isRevision && !file && fileUrl) {
                            return (
                              <div className="w-full h-full absolute inset-0 z-0 bg-slate-100 dark:bg-black/40 flex flex-col justify-center items-center group/preview">
                                <FileText className="w-10 h-10 text-primary mb-2" />
                                <p className="text-xs font-bold text-slate-700 dark:text-slate-300 max-w-[80%] truncate">Existing Document</p>
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/preview:opacity-100 transition-opacity flex flex-col justify-center items-center z-10 gap-3">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setViewerUrl(fileUrl);
                                      setViewerTitle(docName);
                                      setViewerOpen(true);
                                    }}
                                    className="px-4 py-1.5 bg-primary text-white text-[10px] uppercase font-bold rounded-full shadow-lg hover:bg-primary/90"
                                  >
                                    Preview Document
                                  </button>
                                  <label htmlFor={`upload-${activeDocTab}-${idx}`} className="px-4 py-1.5 bg-slate-700 text-white text-[10px] uppercase font-bold rounded-full shadow-lg hover:bg-slate-600 cursor-pointer">
                                    Replace Document
                                  </label>
                                </div>
                              </div>
                            );
                          }
                          return (
                            <label htmlFor={`upload-${activeDocTab}-${idx}`} className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer z-20">
                              <UploadCloud className="w-6 h-6 text-slate-400 mb-2 group-hover:text-primary transition-colors pointer-events-none" />
                              <p className="text-xs font-medium text-slate-600 dark:text-slate-400 px-2 pointer-events-none">
                                Click to upload document/image
                              </p>
                            </label>
                          );
                        })()}
                        <input
                          id={`upload-${activeDocTab}-${idx}`}
                          type="file"
                          accept="image/*,application/pdf,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.rtf"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              if (file.size > 5 * 1024 * 1024) {
                                toast.error("File size exceeds 5MB limit.");
                                e.target.value = "";
                                return;
                              }
                              if (activeDocTab === "REQUIREMENTS") {
                                setUploadedRequirements(prev => ({ ...prev, [idx]: file }));
                                persistDraftFile(`req_${idx}`, file);
                              } else {
                                setUploadedPermits(prev => ({ ...prev, [idx]: file }));
                                persistDraftFile(`permit_${idx}`, file);
                              }
                              e.target.value = "";
                            }
                          }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Progress Summary */}
            <div className="space-y-4 mt-8">
              <div className="bg-emerald-50 dark:bg-emerald-500/5 border-l-4 border-emerald-500 p-4 rounded-r-xl flex items-center gap-3">
                <UploadCloud className="w-5 h-5 text-emerald-700 dark:text-emerald-400 shrink-0" />
                <p className="text-xs md:text-sm font-bold text-emerald-800 dark:text-emerald-300">
                  {activeDocTab === "REQUIREMENTS"
                    ? `Requirements Progress: ${requirementsProgress}/${requiredRequirementsCount} documents uploaded`
                    : `Permits Progress: ${permitsProgress}/${requiredPermitsCount} permits uploaded`}
                </p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-500/5 border-l-4 border-blue-500 p-4 rounded-r-xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-blue-700 dark:text-blue-400 shrink-0" />
                  <p className="text-xs md:text-sm font-bold text-blue-800 dark:text-blue-300">
                    Total Progress: {totalUploaded}/{totalRequiredItems} items uploaded
                  </p>
                </div>
                {!selectedApplication && (
                  <span className="text-[10px] text-blue-600/60 dark:text-blue-400/60 font-medium uppercase tracking-widest hidden sm:block">All {totalRequiredItems} items must be uploaded</span>
                )}
              </div>
            </div>

            {/* Signature Block */}
            <div className="bg-white dark:bg-black/20 rounded-2xl border border-slate-200 dark:border-white/10 p-6 shadow-sm mt-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <PenTool className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-tighter text-lg flex items-center gap-2">
                    Digital Signature <span className="text-red-500 text-xl">*</span>
                  </h3>
                  <p className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Sign directly below</p>
                </div>
              </div>
              {!isEditable ? (
                <div className="space-y-4">
                  <p className="text-sm text-slate-500">Your digital signature was recorded with this application submission:</p>
                  {selectedApplication.additionalData?.signature ? (
                    <div className="border border-slate-200 dark:border-white/10 rounded-xl p-4 bg-white max-w-md">
                      <img src={selectedApplication.additionalData.signature} alt="Digital Signature" className="max-h-32 object-contain mx-auto" />
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No signature was saved for this application.</p>
                  )}
                </div>
              ) : (
                <>
                  <p className="text-sm text-slate-500 mb-6">Please sign to acknowledge that all information provided is true and correct.</p>
                  {isRevision && signatureData && (
                    <div className="mb-4">
                      <p className="text-xs text-emerald-600 font-bold mb-2">Previous Signature (You can resign below to update):</p>
                      <div className="border border-slate-200 dark:border-white/10 rounded-xl p-4 bg-white max-w-md">
                        <img src={signatureData} alt="Digital Signature" className="max-h-32 object-contain mx-auto" />
                      </div>
                    </div>
                  )}
                  <div className={cn("rounded-xl overflow-hidden bg-white transition-all", showValidationErrors && !signatureData ? "border-2 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-pulse" : "border border-slate-200 dark:border-white/10")}>
                    <SignaturePad
                      onSave={(dataUrl) => {
                        setSignatureData(dataUrl);
                        toast.success("Signature captured successfully. Ready to submit!");
                      }}
                    />
                  </div>
                  {signatureData && (
                    <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl flex items-center gap-2 text-emerald-700 dark:text-emerald-400 text-sm font-bold">
                      <CheckCircle className="w-4 h-4" /> Signature captured successfully. Ready to submit!
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Data Privacy Agreement Block */}
            <div className="mt-8">
              <div
                onClick={() => {
                  if (privacyAccepted) {
                    setPrivacyAccepted(false);
                  } else {
                    setIsPrivacyModalOpen(true);
                  }
                }}
                className={cn(
                  "p-5 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-4 select-none",
                  privacyAccepted ? "bg-primary/5 border-primary shadow-sm" : "bg-slate-50 dark:bg-white/[0.02] border-transparent hover:border-primary/20",
                  showValidationErrors && !privacyAccepted && "border-red-500 bg-red-50/50"
                )}
              >
                <div className={cn(
                  "w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 mt-0.5",
                  privacyAccepted ? "bg-primary border-primary text-white" : "border-slate-300 dark:border-white/10",
                  showValidationErrors && !privacyAccepted && "border-red-400"
                )}>
                  {privacyAccepted && <Check className="w-3.5 h-3.5" />}
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-black italic uppercase tracking-tight text-slate-900 dark:text-white">Data Privacy and Terms Agreement</p>
                  <p className="text-[8px] md:text-[10px] text-slate-500 font-medium leading-relaxed italic uppercase tracking-widest">
                    I officially accept the EMapandan Data Privacy Agreement & Terms. I declare under penalty of perjury that all submitted details are 100% legal and genuine. Click to review agreement.
                  </p>
                </div>
              </div>
            </div>

            <PrivacyTermsModal
              isOpen={isPrivacyModalOpen}
              onClose={() => setIsPrivacyModalOpen(false)}
              onAccept={() => {
                setPrivacyAccepted(true);
                setIsPrivacyModalOpen(false);
              }}
              themeColor="#10b981"
            />

            {/* Footer Buttons */}
            <div className="mt-12 flex flex-col md:flex-row justify-between items-center gap-6">
              <button
                onClick={() => {
                  setCurrentStep("PROFILE");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-white hover:bg-slate-200 dark:hover:bg-white/20 font-bold uppercase tracking-widest text-[10px] md:text-xs flex items-center gap-2 px-5 py-2.5 border-2 border-slate-200 dark:border-white/20 rounded-full transition-colors shadow-sm"
              >
                ← Back to Profile
              </button>
              {!isEditable ? (
                <button
                  onClick={() => {
                    setCurrentStep("EVALUATION");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="bg-primary text-white hover:bg-primary/90 px-8 py-4 rounded-[2rem] font-black uppercase tracking-widest text-[10px] md:text-xs flex items-center gap-3 transition-all shadow-xl shadow-primary/20 w-full md:w-auto"
                >
                  Next: Evaluation Status
                  <span className="text-xl leading-none">→</span>
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="bg-emerald-500 text-white hover:bg-emerald-600 px-8 py-4 rounded-[2rem] font-black uppercase tracking-widest text-[10px] md:text-xs flex items-center gap-3 transition-all shadow-xl shadow-emerald-500/20 w-full md:w-auto disabled:opacity-70"
                >
                  {isSubmitting ? "Submitting..." : (isRevision ? "Resubmit Application" : "Submit to Engineering for Review")}
                  {!isSubmitting && <span className="text-xl leading-none">→</span>}
                </button>
              )}
            </div>
          </div>
        )}

        {currentStep === "EVALUATION" && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            {selectedApplication?.isCancelled && (
              <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-[2rem] flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-red-500/20 text-red-500 flex items-center justify-center shrink-0">
                    <AlertCircle className="w-6 h-6 animate-pulse" />
                  </div>
                  <div className="text-left space-y-1">
                    <h4 className="font-black text-red-500 uppercase tracking-wider text-sm">
                      Application Cancelled
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      You cancelled this building permit application. You can still view your details, but it is strictly read-only.
                    </p>
                  </div>
                </div>
                <span className="bg-red-500 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full">
                  CANCELLED
                </span>
              </div>
            )}

            <div className="bg-white dark:bg-black/20 rounded-2xl border border-slate-200 dark:border-white/10 p-6 shadow-sm">
              <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-3 mb-6">
                <ClipboardList className="w-6 h-6 text-primary" />
                Evaluation Status
              </h2>

              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="font-bold text-slate-700 dark:text-slate-300">Engineering Department Review</h3>
                  <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-4 flex flex-col gap-4">
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
                          <Clock className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 dark:text-white text-sm">
                            {selectedApplication?.status === "FOR_INSPECTION"
                              ? "Scheduled for Site Inspection"
                              : selectedApplication?.status === "FOR_REINSPECTION"
                                ? "Scheduled for Site Re-inspection"
                                : "Documents Under Review"}
                          </p>
                          <p className="text-xs text-slate-500">
                            {selectedApplication?.status === "FOR_INSPECTION"
                              ? "Your application is scheduled for an upcoming site inspection."
                              : selectedApplication?.status === "FOR_REINSPECTION"
                                ? "Your application requires a site re-inspection. Please see the scheduled date below."
                                : "Your documents are being reviewed by the Engineering Department"}
                          </p>
                        </div>
                      </div>
                      <span className={cn(
                        "text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full shrink-0",
                        selectedApplication?.isCancelled || selectedApplication?.status === "REJECTED"
                          ? "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-500"
                          : selectedApplication?.status === "APPROVED" || selectedApplication?.status === "EVALUATED"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-500"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-500"
                      )}>
                        {selectedApplication?.isCancelled ? "Cancelled" : selectedApplication ? selectedApplication.status.replace(/_/g, ' ') : "Pending Review"}
                      </span>
                    </div>

                    {selectedApplication && (selectedApplication.status === "REJECTED" || selectedApplication.status === "FOR_REVISION") && selectedApplication.rejectionRemarks && (
                      <div className="p-4 bg-red-50 dark:bg-red-500/5 border border-red-200 dark:border-red-500/20 rounded-xl text-red-800 dark:text-red-400 text-sm">
                        <p className="font-bold uppercase tracking-widest text-[10px] mb-1">
                          {selectedApplication.status === "REJECTED" ? "Reason for Rejection" : "Revision Remarks"}
                        </p>
                        <p className="whitespace-pre-wrap font-medium">{selectedApplication.rejectionRemarks}</p>
                      </div>
                    )}

                    {(selectedApplication?.status === "FOR_INSPECTION" || selectedApplication?.status === "FOR_REINSPECTION") && selectedApplication?.additionalData?.inspectionSchedule && (
                      <div className="p-5 bg-purple-50 dark:bg-purple-500/5 border border-purple-200 dark:border-purple-500/20 rounded-2xl space-y-4">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-purple-600 dark:text-purple-400">
                          {selectedApplication.status === "FOR_REINSPECTION" ? "Re-Inspection Details" : "Inspection Details"}
                        </h4>
                        <div className="grid grid-cols-2 gap-4 text-xs text-purple-800 dark:text-purple-300 font-bold">
                          <div>
                            <span className="text-purple-400 dark:text-purple-500 block text-[9px] uppercase tracking-wider mb-0.5">Date & Time</span>
                            {selectedApplication.additionalData.inspectionSchedule.date} at {selectedApplication.additionalData.inspectionSchedule.time}
                          </div>
                          <div>
                            <span className="text-purple-400 dark:text-purple-500 block text-[9px] uppercase tracking-wider mb-0.5">Inspector</span>
                            {selectedApplication.additionalData.inspectionSchedule.inspectorName}
                          </div>
                          <div className="col-span-2">
                            <span className="text-purple-400 dark:text-purple-500 block text-[9px] uppercase tracking-wider mb-0.5">Type</span>
                            {selectedApplication.additionalData.inspectionSchedule.type}
                          </div>
                          {selectedApplication.additionalData.inspectionSchedule.notes && (
                            <div className="col-span-2 mt-2 pt-3 border-t border-purple-200 dark:border-purple-500/20">
                              <span className="text-purple-400 dark:text-purple-500 block text-[9px] uppercase tracking-wider mb-1">Notes / Reason for Re-inspection</span>
                              <p className="italic text-purple-700 dark:text-purple-300 font-medium">"{selectedApplication.additionalData.inspectionSchedule.notes}"</p>
                            </div>
                          )}
                        </div>

                        {/* Previous Schedules / Re-inspection History (User side) */}
                        {selectedApplication.additionalData?.reinspectionHistory && selectedApplication.additionalData.reinspectionHistory.length > 0 && (
                          <div className="pt-4 border-t border-dashed border-purple-200 dark:border-purple-500/20 space-y-3">
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-purple-400 dark:text-purple-500 block">Previous Schedules & History</span>
                            <div className="space-y-2">
                              {selectedApplication.additionalData.reinspectionHistory.map((h: any, idx: number) => {
                                const isOrig = h.count === 0 || h.isOriginal === true;
                                return (
                                  <div key={idx} className="p-3 bg-white/50 dark:bg-black/20 border border-purple-200/20 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] font-medium text-purple-800 dark:text-purple-300">
                                    <div className="flex items-center gap-2">
                                      <span className={cn(
                                        "px-2 py-0.5 rounded text-[9px] font-black italic",
                                        isOrig ? "bg-purple-200 text-purple-800 dark:bg-purple-500/30 dark:text-purple-300" : "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-400"
                                      )}>
                                        {isOrig ? "Orig" : `#${h.count}`}
                                      </span>
                                      <span>
                                        {isOrig ? "Original Inspection Schedule" : "Re-inspection Requested"}
                                      </span>
                                    </div>
                                    <div className="text-left sm:text-right text-[10px] text-slate-500">
                                      {isOrig ? `${h.date} @ ${h.time}` : (h.date ? new Date(h.date).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "N/A")}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-bold text-slate-700 dark:text-slate-300">Endorsement Status</h3>
                  <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                        selectedApplication?.status === "EVALUATED"
                          ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-500"
                          : ["UNPAID", "PAID", "FOR_PROCESSING", "FOR_CLAIM", "FOR_PICKING", "RELEASED"].includes(selectedApplication?.status || "")
                            ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-500"
                            : "bg-amber-100 dark:bg-amber-500/20 text-amber-500"
                      )}>
                        {["EVALUATED", "UNPAID", "PAID", "FOR_PROCESSING", "FOR_CLAIM", "FOR_PICKING", "RELEASED"].includes(selectedApplication?.status || "") ? (
                          <Check className="w-5 h-5 text-emerald-500" />
                        ) : (
                          <Clock className="w-5 h-5 text-amber-500" />
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 dark:text-white text-sm">Endorsement to Treasury</p>
                        <p className="text-xs text-slate-500">
                          {["EVALUATED", "UNPAID", "PAID", "FOR_PROCESSING", "FOR_CLAIM", "FOR_PICKING", "RELEASED"].includes(selectedApplication?.status || "")
                            ? "Endorsed successfully to Treasury"
                            : "Awaiting Engineering approval"}
                        </p>
                      </div>
                    </div>
                    <span className={cn(
                      "text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full shrink-0",
                      selectedApplication?.isCancelled || selectedApplication?.status === "REJECTED"
                        ? "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-500"
                        : selectedApplication?.status === "UNPAID"
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-500"
                          : ["EVALUATED", "PAID", "FOR_PROCESSING", "FOR_CLAIM", "FOR_PICKING", "RELEASED"].includes(selectedApplication?.status || "")
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-500"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-500"
                    )}>
                      {selectedApplication?.isCancelled
                        ? "Cancelled"
                        : selectedApplication?.status === "REJECTED"
                          ? "Rejected"
                          : selectedApplication?.status === "UNPAID"
                            ? "Unpaid"
                            : ["EVALUATED", "PAID", "FOR_PROCESSING", "FOR_CLAIM", "FOR_PICKING", "RELEASED"].includes(selectedApplication?.status || "")
                              ? "Endorsed"
                              : "Pending"}
                    </span>
                  </div>
                </div>

                {selectedApplication?.fiscalSnapshot && (selectedApplication.fiscalSnapshot as any).lineItems && (
                  <div className="mt-8 p-6 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-4 animate-in fade-in-50 duration-500">
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary italic">Endorsed Fees Summary</span>
                    <div className="space-y-2">
                      {(selectedApplication.fiscalSnapshot as any).lineItems.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center text-xs font-bold text-slate-600 dark:text-slate-400">
                          <span>{item.label}</span>
                          <span className="font-mono">₱{Number(item.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                      ))}
                    </div>
                    <div className="pt-4 border-t border-dashed border-slate-200 dark:border-white/10 flex justify-between items-center">
                      <span className="text-xs font-black uppercase text-slate-800 dark:text-white">Total Amount</span>
                      <span className="text-lg font-black text-primary font-mono">
                        ₱{Number((selectedApplication.fiscalSnapshot as any).totalAmount || selectedApplication.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-between items-center mt-6">
              <button
                onClick={() => {
                  if (selectedApplication) {
                    setCurrentStep("DOCUMENTS");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  } else if (existingApplications.length > 0) {
                    setCurrentStep("EXISTING");
                  } else {
                    router.push("/user/transactions");
                  }
                }}
                className="px-6 py-3 border border-slate-200 dark:border-white/10 rounded-full text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-white transition-colors"
              >
                ← Back
              </button>

              {/* Cancel Application Button */}
              {selectedApplication && selectedApplication.status === "FOR_REQUESTING" && !selectedApplication.isCancelled && (
                <button
                  onClick={() => setShowCancelDialog(true)}
                  disabled={isCancelling}
                  className="px-6 py-3 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 hover:border-transparent rounded-full text-xs font-bold transition-all disabled:opacity-50"
                >
                  {isCancelling ? "Cancelling..." : "Cancel Application"}
                </button>
              )}

              {/* Edit for Revision Button */}
              {selectedApplication && selectedApplication.status === "FOR_REVISION" && !selectedApplication.isCancelled && (
                <button
                  onClick={() => {
                    setIsRevision(true);
                    setCurrentStep("PROFILE");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white border border-amber-500 hover:border-transparent rounded-full text-xs font-bold transition-all shadow-xl shadow-amber-500/20"
                >
                  Edit and Resubmit Application
                </button>
              )}

              {!(selectedApplication?.isCancelled || selectedApplication?.status === "CANCELLED") && (
                <button
                  disabled={["FOR_REQUESTING", "FOR_INSPECTION", "FOR_REINSPECTION", "EVALUATED"].includes(selectedApplication?.status || "")}
                  onClick={() => {
                    setCurrentStep("TREASURY");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="px-8 py-3 bg-emerald-500 text-white rounded-full text-xs font-black uppercase tracking-widest hover:bg-emerald-600 shadow-xl shadow-emerald-500/20 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-800 dark:disabled:text-slate-600"
                >
                  {["FOR_REQUESTING", "FOR_INSPECTION", "FOR_REINSPECTION", "EVALUATED"].includes(selectedApplication?.status || "")
                    ? "Awaiting Treasury Billing"
                    : "Next: Treasury & Zoning →"}
                </button>
              )}
            </div>

            <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
              <AlertDialogContent className="bg-white dark:bg-[#11131a] border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl p-6">
                <AlertDialogHeader>
                  <AlertDialogTitle className="font-black text-slate-800 dark:text-white uppercase tracking-wider italic text-lg flex items-center gap-2">
                    <span className="text-red-500 font-sans">⚠️</span> Cancel Application
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-slate-500 dark:text-slate-400 font-medium text-sm leading-relaxed mt-2">
                    Are you sure you want to cancel this application? This action is permanent and cannot be undone. Once cancelled, your application data will remain strictly read-only and a new permit application can be created.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="mt-6 flex gap-3">
                  <AlertDialogCancel className="rounded-full border border-slate-200 dark:border-white/10 text-slate-500 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 font-bold px-6 py-2.5 transition-colors cursor-pointer text-xs uppercase tracking-widest">
                    No, Keep Application
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={confirmCancel}
                    className="bg-red-500 text-white hover:bg-red-600 rounded-full font-black uppercase tracking-widest text-[10px] md:text-xs flex items-center justify-center gap-2 px-6 py-2.5 transition-all shadow-xl shadow-red-500/20 cursor-pointer"
                  >
                    Yes, Cancel Application
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}

        {currentStep === "TREASURY" && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="bg-white dark:bg-black/20 rounded-2xl border border-slate-200 dark:border-white/10 p-6 shadow-sm">
              <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-3 mb-6">
                <Landmark className="w-6 h-6 text-primary" />
                Treasury & Zoning/BFP Status
              </h2>

              <div className="border border-slate-200 dark:border-white/10 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <Receipt className="w-6 h-6 text-slate-700 dark:text-slate-300" />
                  <h3 className="font-bold text-slate-800 dark:text-white text-lg">Payment Processing</h3>
                </div>

                {selectedApplication?.fiscalSnapshot && (selectedApplication.fiscalSnapshot as any).lineItems && (
                  <div className="mb-6 p-6 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-4">
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary italic">Endorsed Fees Summary</span>
                    <div className="space-y-2">
                      {(selectedApplication.fiscalSnapshot as any).lineItems.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center text-xs font-bold text-slate-600 dark:text-slate-400">
                          <span>{item.label}</span>
                          <span className="font-mono">₱{Number(item.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                      ))}
                    </div>
                    <div className="pt-4 border-t border-dashed border-slate-200 dark:border-white/10 flex justify-between items-center">
                      <span className="text-xs font-black uppercase text-slate-800 dark:text-white">Total Amount</span>
                      <span className="text-lg font-black text-primary font-mono">
                        ₱{Number((selectedApplication.fiscalSnapshot as any).totalAmount || selectedApplication.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                )}

                {selectedApplication?.status === "UNPAID" && !selectedApplication?.paymentReference ? (
                  <>
                    <div className="bg-amber-50 dark:bg-amber-500/5 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 border border-amber-100 dark:border-amber-500/10">
                      <div className="flex items-center gap-3 text-amber-700 dark:text-amber-500">
                        <Hourglass className="w-5 h-5 animate-pulse" />
                        <span className="font-bold text-sm">Status: Pending Payment</span>
                      </div>

                      <button onClick={() => router.push(`/user/services/requests/${selectedApplication.id}`)} className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all w-full md:w-auto justify-center">
                        <CreditCard className="w-4 h-4" /> {selectedApplication.rejectionRemarks ? "Upload New Receipt" : "Proceed to Payment"}
                      </button>
                    </div>

                    {/* Show Revision Remarks if any */}
                    {selectedApplication?.rejectionRemarks && (
                      <div className="mt-4 bg-red-50 dark:bg-red-500/5 border border-red-200 dark:border-red-500/20 rounded-2xl p-5 space-y-2 animate-in fade-in-50 duration-500">
                        <div className="flex items-center gap-2 text-red-700 dark:text-red-500">
                          <AlertCircle className="w-4.5 h-4.5 shrink-0" />
                          <h4 className="font-black text-xs uppercase tracking-widest italic">Payment Revision Required</h4>
                        </div>
                        <p className="text-xs font-medium text-red-800 dark:text-red-400 leading-relaxed">
                          {selectedApplication.rejectionRemarks}
                        </p>
                      </div>
                    )}

                    {/* Show Previous Uploaded Receipts if any */}
                    {selectedApplication?.additionalData?.previousPaymentProofs && selectedApplication.additionalData.previousPaymentProofs.length > 0 && (
                      <div className="mt-4 space-y-3">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Previous Submissions</span>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {selectedApplication.additionalData.previousPaymentProofs.map((proof: any, idx: number) => (
                            <div key={idx} className="relative aspect-[3/4] rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 opacity-70 hover:opacity-100 transition-opacity">
                              <img src={proof.url} alt={`Previous Proof ${idx + 1}`} className="object-cover w-full h-full" />
                              <div className="absolute top-2 left-2 bg-red-500/90 text-white text-[8px] font-black uppercase px-2 py-0.5 rounded">Rejected</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mt-4 bg-amber-50 dark:bg-amber-500/5 border border-amber-100 dark:border-amber-500/10 text-amber-700 dark:text-amber-500 text-xs font-medium px-4 py-3 rounded-lg flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <p>Please proceed to the LGU Mapandan Treasury Office to pay the required fees. After payment, upload your official receipt here. Receipt verification takes 24 hours.</p>
                    </div>
                  </>
                ) : selectedApplication?.status === "UNPAID" && selectedApplication?.paymentReference ? (
                  <div className="bg-blue-50 dark:bg-blue-500/5 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 border border-blue-100 dark:border-blue-500/10">
                    <div className="flex items-center gap-3 text-blue-700 dark:text-blue-500">
                      <Hourglass className="w-5 h-5 animate-pulse" />
                      <span className="font-bold text-sm">Status: Waiting Verification</span>
                    </div>
                    <div className="text-xs font-medium text-blue-600 dark:text-blue-400">
                      Receipt uploaded successfully. Treasury is verifying your payment.
                    </div>
                  </div>
                ) : ["PAID", "FOR_PROCESSING", "FOR_CLAIM", "FOR_PICKING", "RELEASED", "DELIVERED"].includes(selectedApplication?.status || "") ? (
                  <div className="space-y-6">
                    <div className="bg-emerald-50 dark:bg-emerald-500/5 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 border border-emerald-100 dark:border-emerald-500/10">
                      <div className="flex items-center gap-3 text-emerald-700 dark:text-emerald-500">
                        <Check className="w-5 h-5 text-emerald-500" />
                        <span className="font-bold text-sm">Status: Paid (Receipt Submitted)</span>
                      </div>
                      {selectedApplication?.additionalData?.treasuryReceiptUrl && (
                        <button
                          onClick={() => {
                            setViewerUrl(selectedApplication.additionalData.treasuryReceiptUrl);
                            setViewerTitle("Official Treasury Receipt");
                            setViewerOpen(true);
                          }}
                          className="px-6 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-black italic uppercase tracking-widest text-[10px] shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2"
                        >
                          View Official Receipt
                        </button>
                      )}
                    </div>
                    {selectedApplication?.additionalData?.treasuryRemarks && (
                      <div className="p-5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-xs font-bold text-slate-600 dark:text-slate-400 italic">
                        <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 not-italic block mb-1">Treasury Notes:</span>
                        &ldquo;{selectedApplication.additionalData.treasuryRemarks}&rdquo;
                      </div>
                    )}
                    {selectedApplication?.additionalData?.clearanceRevisionReason && (!selectedApplication?.additionalData?.bfpClearanceUrl || !selectedApplication?.additionalData?.zoningClearanceUrl) && (
                      <div className="bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20 rounded-2xl p-5 space-y-2 animate-in fade-in-50 duration-500">
                        <div className="flex items-center gap-2 text-amber-700 dark:text-amber-500">
                          <AlertCircle className="w-4.5 h-4.5 shrink-0" />
                          <h4 className="font-black text-xs uppercase tracking-widest italic">Revision Required</h4>
                        </div>
                        <p className="text-xs font-medium text-amber-800 dark:text-amber-400 leading-relaxed">
                          {selectedApplication.additionalData.clearanceRevisionReason}
                        </p>
                      </div>
                    )}

                    {/* Info: Where to obtain clearances */}
                    <div className="bg-sky-50 dark:bg-sky-500/5 border border-sky-200 dark:border-sky-500/10 rounded-2xl p-5 space-y-3 animate-in fade-in-50 duration-500">
                      <div className="flex items-center gap-2 text-sky-700 dark:text-sky-400">
                        <AlertCircle className="w-4.5 h-4.5 shrink-0" />
                        <h4 className="font-black text-xs uppercase tracking-widest italic">Where to Obtain Your Clearances</h4>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="flex items-start gap-3 bg-white/60 dark:bg-white/5 rounded-xl p-4 border border-sky-100 dark:border-sky-500/10">
                          <div className="w-9 h-9 rounded-lg bg-purple-100 dark:bg-purple-500/10 flex items-center justify-center shrink-0">
                            <Flame className="w-4.5 h-4.5 text-purple-600 dark:text-purple-400" />
                          </div>
                          <div>
                            <p className="text-[11px] font-black uppercase tracking-wider text-purple-700 dark:text-purple-400 italic">BFP Fire Safety Clearance</p>
                            <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium mt-1 leading-relaxed">
                              Go to the <span className="font-bold text-slate-800 dark:text-white">Bureau of Fire Protection (BFP) — Mapandan Fire Station</span> and apply for a Fire Safety Inspection Certificate.
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 bg-white/60 dark:bg-white/5 rounded-xl p-4 border border-sky-100 dark:border-sky-500/10">
                          <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center shrink-0">
                            <MapPin className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <p className="text-[11px] font-black uppercase tracking-wider text-blue-700 dark:text-blue-400 italic">Zoning / Locational Clearance</p>
                            <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium mt-1 leading-relaxed">
                              Go to the <span className="font-bold text-slate-800 dark:text-white">Office of the Zoning Officer / MPDC</span> at the Municipal Hall and apply for a Locational/Zoning Clearance.
                            </p>
                          </div>
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium italic">
                        Once you have secured both clearances, upload them below to proceed with your Building Permit application.
                      </p>
                    </div>

                    {/* BFP Fire Safety Clearance Upload Container */}
                    <div className="p-6 rounded-2xl bg-purple-500/5 border border-purple-500/10 space-y-4 animate-in fade-in-50 duration-500">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-purple-700 dark:text-purple-400">
                          <Flame className="w-5 h-5 animate-pulse" />
                          <h4 className="font-black text-sm uppercase tracking-wider italic">BFP Fire Safety Clearance</h4>
                        </div>
                        {selectedApplication?.additionalData?.bfpClearanceUrl ? (
                          <span className="text-[9px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full border border-emerald-500/20">Uploaded</span>
                        ) : (
                          <span className="text-[9px] font-black uppercase tracking-widest bg-amber-500/10 text-amber-500 px-3 py-1 rounded-full border border-amber-500/20 animate-pulse">Required</span>
                        )}
                      </div>

                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
                        Please upload your official Fire Safety Clearance certificate issued by the Bureau of Fire Protection (BFP). The Engineering Department will review this document to process and approve your permit.
                      </p>

                      {selectedApplication?.additionalData?.bfpClearanceUrl ? (
                        <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 max-w-sm group">
                          <img src={selectedApplication.additionalData.bfpClearanceUrl} alt="BFP Clearance" className="object-cover w-full h-full" />
                          {selectedApplication.status === "PAID" && !selectedApplication.additionalData?.clearancesSubmitted && (
                            <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer">
                              <div className="flex flex-col items-center text-white">
                                <UploadCloud className="w-8 h-8 mb-2" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Change Image</span>
                              </div>
                              <input type="file" onChange={(e) => handleUploadBfpClearance(e.target.files?.[0] || null)} className="hidden" />
                            </label>
                          )}
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center gap-2 aspect-[21/6] rounded-xl border-2 border-dashed border-purple-500/20 hover:border-purple-500/40 bg-purple-500/[0.02] cursor-pointer group transition-all">
                          <UploadCloud className="w-6 h-6 text-purple-400 group-hover:scale-110 transition-transform" />
                          <span className="text-[9px] font-black uppercase tracking-widest text-purple-400 italic">Attach BFP Clearance Certificate</span>
                          <input type="file" onChange={(e) => handleUploadBfpClearance(e.target.files?.[0] || null)} className="hidden" />
                        </label>
                      )}
                    </div>

                    {/* Zoning Clearance Upload Container */}
                    <div className="p-6 rounded-2xl bg-blue-500/5 border border-blue-500/10 space-y-4 animate-in fade-in-50 duration-500">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-blue-700 dark:text-blue-400">
                          <MapPin className="w-5 h-5 animate-pulse" />
                          <h4 className="font-black text-sm uppercase tracking-wider italic">Zoning Clearance</h4>
                        </div>
                        {selectedApplication?.additionalData?.zoningClearanceUrl ? (
                          <span className="text-[9px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full border border-emerald-500/20">Uploaded</span>
                        ) : (
                          <span className="text-[9px] font-black uppercase tracking-widest bg-amber-500/10 text-amber-500 px-3 py-1 rounded-full border border-amber-500/20 animate-pulse">Required</span>
                        )}
                      </div>

                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
                        Please upload your official Locational/Zoning Clearance certificate issued by the Zoning Office / MPDC.
                      </p>

                      {selectedApplication?.additionalData?.zoningClearanceUrl ? (
                        <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 max-w-sm group">
                          <img src={selectedApplication.additionalData.zoningClearanceUrl} alt="Zoning Clearance" className="object-cover w-full h-full" />
                          {selectedApplication.status === "PAID" && !selectedApplication.additionalData?.clearancesSubmitted && (
                            <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer">
                              <div className="flex flex-col items-center text-white">
                                <UploadCloud className="w-8 h-8 mb-2" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Change Image</span>
                              </div>
                              <input type="file" onChange={(e) => handleUploadZoningClearance(e.target.files?.[0] || null)} className="hidden" />
                            </label>
                          )}
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center gap-2 aspect-[21/6] rounded-xl border-2 border-dashed border-blue-500/20 hover:border-blue-500/40 bg-blue-500/[0.02] cursor-pointer group transition-all">
                          <UploadCloud className="w-6 h-6 text-blue-400 group-hover:scale-110 transition-transform" />
                          <span className="text-[9px] font-black uppercase tracking-widest text-blue-400 italic">Attach Zoning Clearance Certificate</span>
                          <input type="file" onChange={(e) => handleUploadZoningClearance(e.target.files?.[0] || null)} className="hidden" />
                        </label>
                      )}
                    </div>

                    {/* Submit Clearances Button */}
                    {selectedApplication?.status === "PAID" &&
                      selectedApplication?.additionalData?.bfpClearanceUrl &&
                      selectedApplication?.additionalData?.zoningClearanceUrl && (
                        <div className="pt-4 flex flex-col items-center gap-3">
                          {selectedApplication.additionalData?.clearancesSubmitted ? (
                            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-6 py-4 rounded-2xl w-full text-center flex items-center justify-center gap-3 animate-in zoom-in duration-300">
                              <CheckCircle2 className="w-5 h-5" />
                              <div>
                                <p className="text-xs font-black uppercase tracking-widest italic">Clearances Submitted</p>
                                <p className="text-[10px] font-medium mt-1 text-emerald-600/70 dark:text-emerald-400/70">Wait for the Engineer to verify your documents</p>
                              </div>
                            </div>
                          ) : (
                            <button
                              disabled={isSubmitting}
                              onClick={async () => {
                                setIsSubmitting(true);
                                const toastId = toast.loading("Submitting clearances...");
                                try {
                                  const res = await submitClearancesForReviewAction(selectedApplication.id);
                                  if (res.success) {
                                    toast.success("Clearances submitted to Engineering!", { id: toastId });
                                    const refreshRes = await getExistingBuildingPermits();
                                    if (refreshRes.success && refreshRes.data) {
                                      setExistingApplications(refreshRes.data);
                                      const updated = refreshRes.data.find((a: any) => a.id === selectedApplication.id);
                                      if (updated) setSelectedApplication(updated);
                                    }
                                  } else {
                                    toast.error(res.error || "Submission failed", { id: toastId });
                                  }
                                } catch {
                                  toast.error("An error occurred", { id: toastId });
                                } finally {
                                  setIsSubmitting(false);
                                }
                              }}
                              className="w-full sm:w-auto px-8 py-4 bg-primary text-primary-foreground rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                              <Upload className="w-4 h-4" />
                              {isSubmitting ? "Submitting..." : "Submit Clearances for Review"}
                            </button>
                          )}
                        </div>
                      )}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="flex justify-between items-center mt-6">
              <button
                onClick={() => {
                  setCurrentStep("EVALUATION");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-white hover:bg-slate-200 dark:hover:bg-white/20 font-bold uppercase tracking-widest text-[10px] md:text-xs flex items-center gap-2 px-5 py-2.5 border-2 border-slate-200 dark:border-white/20 rounded-full transition-colors shadow-sm"
              >
                ← Back
              </button>

              <button
                disabled={
                  selectedApplication?.status === "UNPAID" ||
                  selectedApplication?.status === "PAID"
                }
                onClick={() => {
                  setCurrentStep("SUBMIT");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="px-8 py-3 bg-emerald-500 text-white rounded-full text-xs font-black uppercase tracking-widest hover:bg-emerald-600 shadow-xl shadow-emerald-500/20 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-800 dark:disabled:text-slate-600"
              >
                Next: Submission →
              </button>
            </div>
          </div>
        )}

        {currentStep === "SUBMIT" && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="bg-white dark:bg-black/20 rounded-2xl border border-slate-200 dark:border-white/10 p-10 shadow-sm text-center">
              <div className="w-20 h-20 bg-[#1e293b] dark:bg-white text-white dark:text-slate-900 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-2">Application Status</h2>
              <p className="text-slate-500 text-sm font-medium mb-8">
                {selectedApplication?.status === "FOR_CLAIM" && (
                  <span className="text-emerald-500 font-black uppercase tracking-widest block text-lg mb-1">✅ Ready to Claim!</span>
                )}
                {selectedApplication?.status === "FOR_PICKING" && (
                  <span className="text-blue-500 font-black uppercase tracking-widest block text-lg mb-1">🚚 The Rider is on its way!</span>
                )}
                {selectedApplication?.status === "RELEASED" && (
                  <span className="text-emerald-500 font-black uppercase tracking-widest block text-lg mb-1">🎉 Released!</span>
                )}
                {["FOR_CLAIM", "FOR_PICKING", "RELEASED"].includes(selectedApplication?.status || "") ? (
                  "Your building permit has been approved and the digital copy is now available below."
                ) : (
                  "Your application is being processed. You will be notified once your permit is ready for release."
                )}
              </p>

              {selectedApplication?.eCopyUrl ? (
                <div className="max-w-2xl mx-auto border-2 border-emerald-500/50 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 bg-emerald-500/5 mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-500 text-white rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div className="text-center md:text-left">
                      <p className="text-sm text-emerald-600 dark:text-emerald-400 font-black uppercase tracking-widest">
                        Official Permit E-Copy
                      </p>
                      <p className="text-xs text-slate-500 font-medium mt-1">
                        Your approved building permit is ready for download.
                        {selectedApplication?.updatedAt && (
                          <span className="block mt-1.5 text-[9px] text-emerald-600/80 dark:text-emerald-400/80 font-bold uppercase tracking-widest">
                            Released on: {new Date(selectedApplication.updatedAt).toLocaleDateString()} {new Date(selectedApplication.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setViewerUrl(selectedApplication.eCopyUrl);
                      setViewerTitle("Official Permit E-Copy");
                      setViewerOpen(true);
                    }}
                    className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20 transition-all flex items-center gap-2 shrink-0"
                  >
                    <FileText className="w-4 h-4" /> Preview & Download
                  </button>
                </div>
              ) : (
                <div className="max-w-2xl mx-auto border-2 border-dashed border-[#1e293b] dark:border-white/50 rounded-xl p-6 flex flex-col md:flex-row items-center justify-center gap-4 bg-slate-50/50 dark:bg-white/5 mb-6">
                  <div className="w-10 h-10 bg-[#1e293b] dark:bg-white text-white dark:text-slate-900 rounded-lg flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="text-center md:text-left">
                    <p className="text-sm text-slate-700 dark:text-slate-300">
                      <span className="font-bold">Digital Copy</span> of your documents will be available here upon release
                    </p>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">You can view and download your approved permit directly from this page.</p>
                  </div>
                </div>
              )}

              <div className="max-w-2xl mx-auto bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg p-4 flex items-start gap-3 text-left">
                <Shield className="w-5 h-5 text-slate-600 dark:text-slate-400 shrink-0 mt-0.5" />
                <p className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                  <span className="font-bold text-slate-700 dark:text-slate-300">RA 10173 (Data Privacy Act of 2012) Compliance:</span> Your personal information is collected for building permit processing only and will not be shared with third parties without your consent.
                </p>
              </div>
            </div>

            <div className="flex justify-start items-center mt-6">
              <button
                onClick={() => {
                  setCurrentStep("TREASURY");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-white hover:bg-slate-200 dark:hover:bg-white/20 font-bold uppercase tracking-widest text-[10px] md:text-xs flex items-center gap-2 px-5 py-2.5 border-2 border-slate-200 dark:border-white/20 rounded-full transition-colors shadow-sm"
              >
                ← Back to Treasury & Zoning
              </button>
            </div>
          </div>
        )}

      </div>

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

const SignaturePad = ({ onSave }: { onSave: (dataUrl: string) => void }) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isDrawing, setIsDrawing] = React.useState(false);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let offsetX, offsetY;
    if ('touches' in e) {
      const rect = canvas.getBoundingClientRect();
      offsetX = e.touches[0].clientX - rect.left;
      offsetY = e.touches[0].clientY - rect.top;
    } else {
      offsetX = e.nativeEvent.offsetX;
      offsetY = e.nativeEvent.offsetY;
    }

    ctx.beginPath();
    ctx.moveTo(offsetX, offsetY);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault(); // Prevent scrolling while signing on touch devices
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let offsetX, offsetY;
    if ('touches' in e) {
      const rect = canvas.getBoundingClientRect();
      offsetX = e.touches[0].clientX - rect.left;
      offsetY = e.touches[0].clientY - rect.top;
    } else {
      offsetX = e.nativeEvent.offsetX;
      offsetY = e.nativeEvent.offsetY;
    }

    ctx.lineTo(offsetX, offsetY);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    onSave(dataUrl);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const hRatio = canvas.width / img.width;
        const vRatio = canvas.height / img.height;
        const ratio = Math.min(hRatio, vRatio);
        const centerShift_x = (canvas.width - img.width * ratio) / 2;
        const centerShift_y = (canvas.height - img.height * ratio) / 2;
        ctx.drawImage(img, 0, 0, img.width, img.height,
          centerShift_x, centerShift_y, img.width * ratio, img.height * ratio);

        onSave(canvas.toDataURL('image/png'));
      }
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  return (
    <div className="flex flex-col items-center w-full">
      <canvas
        ref={canvasRef}
        width={800}
        height={250}
        className="w-full h-[250px] cursor-crosshair touch-none"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
      />
      <div className="p-4 bg-slate-50 dark:bg-black/40 w-full flex justify-center gap-4 border-t border-slate-200 dark:border-white/10 flex-wrap">
        <button onClick={clearCanvas} className="px-6 py-2 rounded-full border border-slate-300 dark:border-white/20 text-slate-600 dark:text-slate-300 text-sm font-bold flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
          Clear
        </button>
        <button onClick={() => fileInputRef.current?.click()} className="px-6 py-2 rounded-full border border-blue-300 dark:border-blue-500/30 text-blue-600 dark:text-blue-400 text-sm font-bold flex items-center gap-2 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors">
          <UploadCloud className="w-4 h-4" />
          Upload Image
        </button>
        <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
        <button onClick={handleSave} className="px-6 py-2 rounded-full bg-emerald-500 text-white text-sm font-bold flex items-center gap-2 shadow-md hover:bg-emerald-600 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
          Save Signature
        </button>
      </div>
    </div>
  );
}
