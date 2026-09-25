"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Home, 
  ArrowLeft,
  ClipboardList,
  Upload,
  Building2,
  Landmark,
  CheckCircle2,
  FileCheck2,
  LandPlot,
  FileSpreadsheet,
  Compass,
  Ruler,
  AlertCircle,
  Info,
  ArrowRight,
  Zap,
  ShieldAlert
} from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import DocumentViewerModal from "@/components/shared/DocumentViewerModal";
import PremiumDocumentUpload from "@/components/shared/PremiumDocumentUpload";
import SecureIdleTimer from "@/components/shared/SecureIdleTimer";
import PrivacyTermsModal from "@/components/shared/PrivacyTermsModal";
import { toast } from "sonner";
import { getSystemSettingAction } from "@/app/admin/transactions/actions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { HelpCircle, BookOpen, Eye, Lock } from "lucide-react";
import { getCurrentUserResident } from "@/app/admin/transactions/actions";
import { submitFencingPermit, getActiveFencingPermit } from "./actions";
import { saveDraftFile, getDraftFiles, clearDraftFiles } from "@/lib/draftDb";

const DRAFT_STORAGE_KEY = "fencing_permit_upload_draft";
const DRAFT_DETAILS_STORAGE_KEY = "fencing_permit_details_draft";

const MAPANDAN_BARANGAYS = [
  "Amanoaoac",
  "Apaya",
  "Aserda",
  "Baloling",
  "Coral",
  "Golden",
  "Lanas",
  "Nilombot",
  "Patland",
  "Pias",
  "Poblacion",
  "Primicias",
  "Santa Maria",
  "Torres",
  "Valenzuela"
];

const FENCE_TYPE_OPTIONS = [
  {
    value: "Concrete Hollow Block (CHB) & Steel Grille",
    label: "Concrete Hollow Block (CHB) & Steel Grille",
    description: "Standard reinforced masonry base with decorative semi-open metal grills"
  },
  {
    value: "Full Solid Reinforced Concrete / Masonry",
    label: "Full Solid Reinforced Concrete / Masonry",
    description: "Continuous reinforced perimeter masonry wall (max 1.50m along frontages)"
  },
  {
    value: "Cyclone Wire Mesh & Galvanized Iron (GI) Post",
    label: "Cyclone Wire Mesh & Galvanized Iron (GI) Post",
    description: "High-tensile perimeter security mesh with tubular steel framing"
  },
  {
    value: "Wrought Iron / Ornamental Architectural Metal",
    label: "Wrought Iron / Ornamental Architectural Metal",
    description: "Heavy-duty forged ironwork with concrete or stone footing"
  },
  {
    value: "Pre-cast Concrete Panel & Column Fencing",
    label: "Pre-cast Concrete Panel & Column Fencing",
    description: "Modular pre-stressed interlocking boundary slabs"
  },
  {
    value: "Perimeter Wooden / Composite Interlink Fencing",
    label: "Perimeter Wooden / Composite Interlink Fencing",
    description: "Treated structural lumber, PVC, or composite timber slats"
  }
];

const FENCE_SECURITY_OPTIONS = [
  {
    value: "NONE",
    label: "Standard Perimeter (None / Plain Top)",
    description: "No electrified wiring or barbed/razor wire attachments."
  },
  {
    value: "BARBED_WIRE",
    label: "Barbed Wire / Concertina Razor Wire",
    description: "Perimeter security wire; must be installed at least 2.00m above ground level."
  },
  {
    value: "ELECTRIFIED",
    label: "Electrified Security Fence (Energized)",
    description: "Pulsed non-lethal DC energizer with required Electrical Clearance & Warning Signs."
  },
  {
    value: "BOTH",
    label: "Both Barbed Wire & Electrified Security Fence",
    description: "Dual security setup requiring structural clearance and certified electrical layout."
  }
];

const STEPS = [
  { id: "GUIDE", label: "Guide", icon: ClipboardList },
  { id: "DETAILS", label: "Details", icon: Ruler },
  { id: "DOCUMENTS", label: "Upload", icon: Upload },
  { id: "SUBMIT", label: "Submit", icon: CheckCircle2 },
];

interface DocumentSlotConfig {
  key: string;
  label: string;
  required: boolean;
  agencyBadge: string;
  description: string;
}

const MANDATORY_DOCUMENT_SLOTS: DocumentSlotConfig[] = [
  {
    key: "proofOfOwnership",
    label: "Proof of Land Ownership",
    required: true,
    agencyBadge: "Registry of Deeds",
    description: "Certified True Copy of Transfer Certificate of Title (TCT/OCT), Notarized Deed of Absolute Sale, Lease Contract, or Special Power of Attorney (SPA).",
  },
  {
    key: "taxDeclaration",
    label: "Tax Declaration of Real Property",
    required: true,
    agencyBadge: "Municipal Assessor",
    description: "Latest Certified True Copy of the Real Property Tax Declaration for the subject land parcel.",
  },
  {
    key: "rptReceipt",
    label: "Current RPT Official Receipt & Tax Clearance",
    required: true,
    agencyBadge: "Municipal Treasury",
    description: "Official Receipt of Real Property Tax (Amilyar) payment for the current calendar year with Tax Clearance.",
  },
  {
    key: "lotPlan",
    label: "Certified Lot Plan & Boundary Survey",
    required: true,
    agencyBadge: "Geodetic Engineer",
    description: "Original or certified Lot Plan with Vicinity Map signed and sealed by a licensed Geodetic Engineer certifying no encroachment.",
  },
  {
    key: "fencingPlans",
    label: "Architectural & Structural Fencing Plans",
    required: true,
    agencyBadge: "Civil Engineer / Architect",
    description: "Complete drawings (site layout, elevations, footing & lintel beam details) signed and sealed by a licensed Civil Engineer or Architect.",
  },
  {
    key: "billOfMaterials",
    label: "Itemized Bill of Materials & Cost Estimate",
    required: true,
    agencyBadge: "Civil Engineer / Architect",
    description: "Detailed specification and cost estimates for materials and labor signed and sealed by a licensed professional.",
  },
  {
    key: "barangayClearance",
    label: "Barangay Construction Clearance (Fencing)",
    required: true,
    agencyBadge: "Barangay LGU",
    description: "Barangay Clearance certifying no boundary disputes with neighboring lot owners.",
  },
  {
    key: "governmentId",
    label: "Valid Government ID & Cedula",
    required: true,
    agencyBadge: "Government / LGU",
    description: "Valid photo-bearing government ID with 3 specimen signatures and current Community Tax Certificate (Cedula).",
  },
];

const CONDITIONAL_DOCUMENT_SLOTS: DocumentSlotConfig[] = [
  {
    key: "zoningClearance",
    label: "Locational / Zoning Clearance",
    required: false,
    agencyBadge: "MPDO",
    description: "Zoning / Locational clearance issued by the Municipal Planning & Development Office (if already obtained).",
  },
  {
    key: "dpwhClearance",
    label: "DPWH Clearance (National Highway)",
    required: false,
    agencyBadge: "DPWH",
    description: "Required only if the proposed fencing adjoins or fronts a National Highway road right-of-way.",
  },
  {
    key: "spaDocument",
    label: "Special Power of Attorney (SPA)",
    required: false,
    agencyBadge: "Notary Public",
    description: "Notarized authorization letter or SPA if the applicant is filing on behalf of the registered lot owner.",
  },
  {
    key: "electricalPlan",
    label: "Electrical Layout & Energizer Specification",
    required: false,
    agencyBadge: "Electrical Engineer / PEE",
    description: "Required for electrified fences: Wiring diagram, non-lethal pulsed energizer specs, grounding system, and warning sign layout.",
  },
];

export default function FencingPermitPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = React.useState("GUIDE");
  const [themeColor, setThemeColor] = React.useState("var(--primary-theme)");

  // Resident Profile & User Context State
  const [residentProfile, setResidentProfile] = React.useState<any>(null);

  // Fencing Site Details State (Inherited from resident record)
  const [siteBarangay, setSiteBarangay] = React.useState("");
  const [siteStreet, setSiteStreet] = React.useState("");
  const [estimatedCost, setEstimatedCost] = React.useState("");
  const [fenceType, setFenceType] = React.useState(FENCE_TYPE_OPTIONS[0].value);
  const [fenceSecurityFeature, setFenceSecurityFeature] = React.useState("NONE");
  const [fenceLength, setFenceLength] = React.useState("");
  const [fenceHeight, setFenceHeight] = React.useState("");

  // Submission State
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Data Privacy & Security State
  const [privacyAccepted, setPrivacyAccepted] = React.useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = React.useState(false);
  const [selectedGuideSlot, setSelectedGuideSlot] = React.useState<DocumentSlotConfig | null>(null);
  const abandonedFilesRef = React.useRef<string[]>([]);

  // Active Ongoing Application Guard State
  const [activePermit, setActivePermit] = React.useState<any>(null);
  const [checkingActive, setCheckingActive] = React.useState(true);

  // Hard Lock: Guarantee that if an active ongoing permit exists, user stays strictly on GUIDE
  React.useEffect(() => {
    if (activePermit && currentStep !== "GUIDE") {
      setCurrentStep("GUIDE");
    }
  }, [activePermit, currentStep]);

  React.useEffect(() => {
    // Check if user already has an ongoing fencing permit
    getActiveFencingPermit().then((res) => {
      if (res.success && res.data) {
        setActivePermit(res.data);
        setCurrentStep("GUIDE");
      }
      setCheckingActive(false);
    });

    getSystemSettingAction("theme_color").then((res) => {
      if (res.success && res.data) {
        setThemeColor(res.data);
      }
    });

    getCurrentUserResident().then((res) => {
      if (res.success && res.data) {
        setResidentProfile(res.data);
        // Fallback to resident address only if no draft is present
        try {
          const savedDraft = localStorage.getItem(DRAFT_DETAILS_STORAGE_KEY);
          if (savedDraft) {
            const parsed = JSON.parse(savedDraft);
            if (parsed.siteBarangay) setSiteBarangay(parsed.siteBarangay);
            else if (res.data.barangay) setSiteBarangay(res.data.barangay);

            if (parsed.siteStreet) setSiteStreet(parsed.siteStreet);
            else if (res.data.street) setSiteStreet(res.data.street);

            if (parsed.estimatedCost) setEstimatedCost(parsed.estimatedCost);
            if (parsed.fenceType) setFenceType(parsed.fenceType);
            if (parsed.fenceSecurityFeature) setFenceSecurityFeature(parsed.fenceSecurityFeature);
            if (parsed.fenceLength) setFenceLength(parsed.fenceLength);
            if (parsed.fenceHeight) setFenceHeight(parsed.fenceHeight);
            return;
          }
        } catch (e) {
          console.error("Failed to load details draft:", e);
        }

        if (res.data.barangay) {
          setSiteBarangay(res.data.barangay);
        }
        if (res.data.street) {
          setSiteStreet(res.data.street);
        }
      }
    });
  }, []);

  // Real-time debounced auto-save for Details tab form state
  const isDetailsHydratedRef = React.useRef(false);
  React.useEffect(() => {
    // Skip saving on the very first mount cycle before hydration completes
    if (!isDetailsHydratedRef.current) {
      isDetailsHydratedRef.current = true;
      return;
    }

    const timer = setTimeout(() => {
      try {
        const payload = {
          siteBarangay,
          siteStreet,
          estimatedCost,
          fenceType,
          fenceSecurityFeature,
          fenceLength,
          fenceHeight,
          savedAt: Date.now()
        };
        localStorage.setItem(DRAFT_DETAILS_STORAGE_KEY, JSON.stringify(payload));
      } catch (err) {
        console.error("Auto-save details draft error:", err);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [siteBarangay, siteStreet, estimatedCost, fenceType, fenceSecurityFeature, fenceLength, fenceHeight]);

  // Beacon Garbage Collector on page close / unload
  React.useEffect(() => {
    const abandonedFiles = abandonedFilesRef.current;
    return () => {
      if (abandonedFiles.length > 0) {
        navigator.sendBeacon("/api/upload/cleanup", JSON.stringify({ urls: abandonedFiles }));
      }
    };
  }, []);

  // Document Uploads State
  const [uploadedFiles, setUploadedFiles] = React.useState<Record<string, File | null>>({});
  const [previewUrls, setPreviewUrls] = React.useState<Record<string, string | null>>({});
  const [showValidationErrors, setShowValidationErrors] = React.useState(false);
  const [showDetailsErrors, setShowDetailsErrors] = React.useState(false);
  const isDraftHydratedRef = React.useRef(false);

  // Validate Details Tab and Scroll to First Missing Field with Red Border
  const validateDetailsStep = (): boolean => {
    setShowDetailsErrors(true);

    const costNum = parseFloat(estimatedCost.replace(/,/g, ""));
    const lengthNum = parseFloat(fenceLength);
    const heightNum = parseFloat(fenceHeight);

    if (!siteBarangay) {
      toast.error("Please select a Barangay for your fencing site.");
      const el = document.getElementById("field-siteBarangay");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.focus();
      }
      return false;
    }

    if (!siteStreet.trim()) {
      toast.error("Please input the Street address for your fencing site.");
      const el = document.getElementById("field-siteStreet");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.focus();
      }
      return false;
    }

    if (!costNum || costNum <= 0) {
      toast.error("Please provide a valid Estimated Construction Cost.");
      const el = document.getElementById("field-estimatedCost");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.focus();
      }
      return false;
    }

    if (!fenceType) {
      toast.error("Please select a Primary Fence Material / Design Type.");
      const el = document.getElementById("field-fenceType");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return false;
    }

    if (!lengthNum || lengthNum <= 0) {
      toast.error("Please input the Total Fencing Length in meters.");
      const el = document.getElementById("field-fenceLength");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.focus();
      }
      return false;
    }

    if (!heightNum || heightNum <= 0) {
      toast.error("Please input the Maximum Fence Height in meters.");
      const el = document.getElementById("field-fenceHeight");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.focus();
      }
      return false;
    }

    return true;
  };

  // Document Viewer Modal State
  const [viewerOpen, setViewerOpen] = React.useState(false);
  const [viewerFile, setViewerFile] = React.useState<File | null>(null);
  const [viewerUrl, setViewerUrl] = React.useState<string | null>(null);
  const [viewerTitle, setViewerTitle] = React.useState("");

  // Hydrate draft files from IndexedDB on initial mount
  React.useEffect(() => {
    async function restoreDrafts() {
      try {
        const draftFiles = await getDraftFiles(DRAFT_STORAGE_KEY);
        if (draftFiles && Object.keys(draftFiles).length > 0 && !isDraftHydratedRef.current) {
          isDraftHydratedRef.current = true;
          setUploadedFiles(draftFiles);
          
          const restoredPreviews: Record<string, string> = {};
          Object.entries(draftFiles).forEach(([key, file]) => {
            if (file) {
              restoredPreviews[key] = URL.createObjectURL(file);
            }
          });
          setPreviewUrls(restoredPreviews);
          toast.info("Progress restored. Previously uploaded document drafts recovered.", { duration: 5000 });
        }
      } catch (err) {
        console.error("Failed to restore draft files from IndexedDB:", err);
      }
    }

    restoreDrafts();
  }, []);

  const handleFileSelect = (key: string, file: File) => {
    const objectUrl = URL.createObjectURL(file);
    setUploadedFiles((prev) => ({ ...prev, [key]: file }));
    setPreviewUrls((prev) => ({ ...prev, [key]: objectUrl }));
    toast.success("Document uploaded successfully.");

    // Auto-save to IndexedDB asynchronously
    saveDraftFile(DRAFT_STORAGE_KEY, key, file).catch((err) => {
      console.error("Failed to auto-save draft file:", err);
    });
  };

  const handleClearFile = (key: string) => {
    setUploadedFiles((prev) => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
    setPreviewUrls((prev) => {
      const copy = { ...prev };
      if (copy[key]) {
        URL.revokeObjectURL(copy[key]!);
      }
      delete copy[key];
      return copy;
    });

    // Remove from IndexedDB asynchronously
    saveDraftFile(DRAFT_STORAGE_KEY, key, null).catch((err) => {
      console.error("Failed to remove draft file from storage:", err);
    });
  };

  const handleViewDocument = (key: string, label: string) => {
    const file = uploadedFiles[key] || null;
    const url = previewUrls[key] || null;
    if (file || url) {
      setViewerFile(file);
      setViewerUrl(url);
      setViewerTitle(label);
      setViewerOpen(true);
    }
  };

  const mandatoryUploadedCount = MANDATORY_DOCUMENT_SLOTS.filter(
    (s) => !!uploadedFiles[s.key]
  ).length;
  const isMandatoryComplete = mandatoryUploadedCount === MANDATORY_DOCUMENT_SLOTS.length;

  const scrollToFirstMissingSlot = () => {
    setShowValidationErrors(true);
    const firstMissing = MANDATORY_DOCUMENT_SLOTS.find((s) => !uploadedFiles[s.key]);
    if (firstMissing) {
      toast.warning(`Please upload the required "${firstMissing.label}" first.`);
      setTimeout(() => {
        const el = document.getElementById(`doc-slot-${firstMissing.key}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.classList.add("animate-pulse");
          setTimeout(() => el.classList.remove("animate-pulse"), 2000);
        }
      }, 50);
    } else {
      toast.error("Please complete all 8 mandatory document uploads before proceeding.");
    }
  };

  const handleProceedToSubmit = () => {
    if (!isMandatoryComplete) {
      scrollToFirstMissingSlot();
      return;
    }

    setCurrentStep("SUBMIT");
  };

  const handleStepClick = (targetStepId: string) => {
    // If user has an active ongoing permit, strictly lock to GUIDE tab
    if (activePermit && targetStepId !== "GUIDE") {
      toast.error("You currently have an active ongoing Fencing Permit application. Access to the application form is locked until your current permit is Released, Rejected, or Cancelled.", {
        action: {
          label: "View Request",
          onClick: () => router.push(`/user/services/requests/${activePermit.id}`)
        }
      });
      return;
    }

    // If on DETAILS step and trying to go to DOCUMENTS or SUBMIT, validate details first
    if (currentStep === "DETAILS" && (targetStepId === "DOCUMENTS" || targetStepId === "SUBMIT")) {
      const isValid = validateDetailsStep();
      if (!isValid) return;
    }

    // If trying to jump straight to SUBMIT without completing uploads
    if (targetStepId === "SUBMIT" && !isMandatoryComplete) {
      if (currentStep !== "DOCUMENTS") {
        setCurrentStep("DOCUMENTS");
        setTimeout(scrollToFirstMissingSlot, 200);
      } else {
        scrollToFirstMissingSlot();
      }
      return;
    }

    setCurrentStep(targetStepId);
  };

  const executeSubmission = async () => {
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("barangay", siteBarangay);
      formData.append("street", siteStreet);
      formData.append("estimatedCost", estimatedCost);
      formData.append("fenceType", fenceType);
      formData.append("fenceSecurityFeature", fenceSecurityFeature);
      formData.append("fenceLength", fenceLength);
      formData.append("fenceHeight", fenceHeight);

      // Append all uploaded files
      Object.entries(uploadedFiles).forEach(([key, file]) => {
        if (file) {
          formData.append(key, file);
        }
      });

      const res = await submitFencingPermit(formData);

      if (res.success && res.data) {
        toast.success("Application submitted successfully! Redirecting...");

        // Clear local draft files from IndexedDB asynchronously
        clearDraftFiles(DRAFT_STORAGE_KEY).catch((e) => {
          console.error("Failed to clean up draft files:", e);
        });

        // Clear details text draft from localStorage
        try {
          localStorage.removeItem(DRAFT_DETAILS_STORAGE_KEY);
        } catch (e) {
          console.error("Failed to clear details draft from localStorage:", e);
        }

        // Smooth client-side navigate directly to requests tracking page
        router.push(`/user/services/requests/${res.data.id}`);
        return;
      } else {
        setIsSubmitting(false);
        toast.error(res.error || "Failed to submit application. Please review and try again.");
      }
    } catch (err: any) {
      console.error("Submit error:", err);
      setIsSubmitting(false);
      toast.error(err?.message || "An unexpected error occurred during submission.");
    }
  };

  const handleSubmitApplication = async () => {
    if (!isMandatoryComplete) {
      toast.error("Mandatory documents are incomplete. Please complete all 8 required uploads.");
      setCurrentStep("DOCUMENTS");
      return;
    }

    // Require Data Protection & Privacy Agreement right at submission time
    if (!privacyAccepted) {
      setIsPrivacyModalOpen(true);
      return;
    }

    await executeSubmission();
  };

  const handlePrivacyAccept = () => {
    setPrivacyAccepted(true);
    setIsPrivacyModalOpen(false);
    executeSubmission();
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-0 pb-16 space-y-8">
        
        {/* Security & Idle Protection */}
        <SecureIdleTimer
          timeoutSeconds={180}
          warningSeconds={120}
          themeColor={themeColor}
        />

        {/* Legal & Data Privacy Agreement Modal */}
        <PrivacyTermsModal
          isOpen={isPrivacyModalOpen}
          onClose={() => setIsPrivacyModalOpen(false)}
          onAccept={handlePrivacyAccept}
          onDecline={() => {
            setIsPrivacyModalOpen(false);
            toast.info("Privacy agreement is required to submit building and fencing applications.");
          }}
          themeColor={themeColor}
        />

        {/* Document Fullscreen Viewer Modal */}
        <DocumentViewerModal
          isOpen={viewerOpen}
          onClose={() => setViewerOpen(false)}
          file={viewerFile}
          fileUrl={viewerUrl}
          title={viewerTitle}
        />

        {/* Dedicated Single-Document Upload Guide Modal */}
        <Dialog open={!!selectedGuideSlot} onOpenChange={(open) => !open && setSelectedGuideSlot(null)}>
          <DialogContent className="max-w-lg overflow-hidden flex flex-col p-0 rounded-3xl border-slate-200 dark:border-white/10">
            <DialogHeader className="p-6 pb-4 border-b border-slate-200 dark:border-white/10 shrink-0">
              <div className="flex items-center gap-1.5 text-primary text-[10px] font-black uppercase tracking-widest bg-primary/10 px-2.5 py-1 rounded-full w-fit mb-1">
                <BookOpen className="w-3.5 h-3.5" />
                Document Guideline
              </div>
              <DialogTitle className="text-lg sm:text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white pt-1">
                {selectedGuideSlot?.label}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                Official criteria and submission requirements for this attachment.
              </DialogDescription>
            </DialogHeader>

            <div className="p-6 space-y-4 text-left">
              <div className="space-y-1.5">
                <span className="text-[11px] font-black uppercase tracking-wider text-primary block">
                  Description & Specifications
                </span>
                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                  {selectedGuideSlot?.description}
                </p>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  Important Reminders
                </span>
                <ul className="text-xs text-slate-500 dark:text-slate-400 space-y-1.5 list-disc pl-4 leading-relaxed">
                  <li>Ensure all signatures, official dry seals, and registration stamps are fully legible.</li>
                  <li>Accepted formats: <strong>PDF, PNG, or JPG</strong> (auto-compressed up to 15MB).</li>
                  <li>Documents must be updated and valid for the current calendar year.</li>
                </ul>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Breadcrumb Navigation */}
        <Breadcrumb>
          <BreadcrumbList className="bg-white/80 dark:bg-white/5 backdrop-blur-md px-4 py-2 rounded-2xl border border-slate-200 dark:border-white/10 w-fit shadow-sm">
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/" className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-primary transition-colors">
                  <Home className="w-3.5 h-3.5 mb-0.5" />
                  Home
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="text-slate-300 dark:text-white/10" />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/user/services" className="text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-primary transition-colors">
                  Services
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="text-slate-300 dark:text-white/10" />
            <BreadcrumbItem>
              <BreadcrumbPage className="text-xs font-black uppercase tracking-widest text-primary italic">
                Fencing Permit
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Clean Portal Header */}
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-5xl font-black uppercase italic tracking-tighter leading-tight">
            Fencing <span className="text-primary underline decoration-primary/20 underline-offset-8">Permit</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium max-w-2xl">
            Online application for perimeter walls, boundary fencing, and site enclosure permits in the Municipality of Mapandan.
          </p>
        </div>

        {/* Stepper Progress Tabs */}
        <div className="grid grid-cols-4 gap-1.5 sm:gap-4 relative px-1 sm:px-2 max-w-xl mx-auto">
          {checkingActive ? (
            Array(4).fill(0).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-2 select-none animate-pulse">
                <div className="w-11 h-11 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-slate-200/70 dark:bg-white/5 border-2 border-transparent" />
                <div className="w-12 sm:w-16 h-2 sm:h-2.5 rounded-full bg-slate-200/70 dark:bg-white/5" />
              </div>
            ))
          ) : (
            STEPS.map((step, idx) => {
              const isActive = currentStep === step.id;
              const currentStepIdx = STEPS.findIndex(s => s.id === currentStep);
              const isCompleted = currentStepIdx > idx;
              const isLocked = Boolean(activePermit && step.id !== "GUIDE");
              const Icon = isLocked ? Lock : step.icon;

              return (
                <div
                  key={step.id}
                  onClick={() => handleStepClick(step.id)}
                  className={cn(
                    "flex flex-col items-center gap-2 relative z-10 font-black group select-none transition-all",
                    isLocked ? "cursor-not-allowed opacity-50" : "cursor-pointer"
                  )}
                >
                  <div
                    className={cn(
                      "w-11 h-11 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all duration-300 border-2 relative",
                      isLocked
                        ? "bg-slate-100 dark:bg-white/5 text-slate-400 border-slate-200 dark:border-white/10"
                        : isActive
                          ? "bg-primary text-white border-primary shadow-[0_0_20px_rgba(var(--primary),0.3)] scale-105 sm:scale-110"
                          : isCompleted
                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                            : "bg-slate-100 dark:bg-white/5 text-slate-400 border-transparent hover:border-primary/30"
                    )}
                  >
                    <Icon className="w-4 h-4 sm:w-6 sm:h-6" />
                    {isLocked && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-slate-600 text-white flex items-center justify-center text-[9px] shadow-sm">
                        <Lock className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-[8px] sm:text-[10px] uppercase tracking-widest text-center italic transition-all",
                      isLocked
                        ? "text-slate-400 opacity-60"
                        : isActive
                          ? "text-primary opacity-100 font-black"
                          : isCompleted
                            ? "text-emerald-500 font-bold opacity-80"
                            : "opacity-40 group-hover:opacity-100"
                    )}
                  >
                    {isLocked ? `${step.label} 🔒` : step.label}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Step 1: GUIDE TAB CONTENT */}
        {currentStep === "GUIDE" && (
          <div className="space-y-8 animate-in fade-in-50 duration-300">
            {/* Active Ongoing Application Alert Banner / Preload Skeleton */}
            {checkingActive ? (
              <div className="p-5 sm:p-6 rounded-3xl border border-slate-200/60 dark:border-white/5 bg-slate-100/50 dark:bg-white/[0.02] flex items-center justify-between gap-4 animate-pulse">
                <div className="flex items-center gap-3.5 w-full">
                  <div className="w-10 h-10 rounded-2xl bg-slate-200 dark:bg-white/10 shrink-0" />
                  <div className="space-y-2 flex-1">
                    <div className="w-36 h-4 rounded-md bg-slate-200 dark:bg-white/10" />
                    <div className="w-3/4 h-3 rounded-md bg-slate-200 dark:bg-white/5" />
                  </div>
                </div>
              </div>
            ) : activePermit ? (
              <div className="p-5 sm:p-6 rounded-3xl border-2 border-emerald-500/30 bg-emerald-500/[0.06] backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex items-start gap-3.5">
                  <div className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-emerald-600 text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded-md">
                        Active Permit Under Review
                      </Badge>
                    </div>
                    <h3 className="text-sm sm:text-base font-black uppercase text-slate-900 dark:text-white pt-0.5">
                      You have an ongoing Fencing Permit application
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
                      Current Status: <strong className="text-emerald-700 dark:text-emerald-400 uppercase">{activePermit.status?.replace(/_/g, " ")}</strong>. You can freely review the documentary guidelines and zoning regulations below, but filing another application is locked until your current permit reaches a final status (Released, Rejected, or Cancelled).
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => router.push(`/user/services/requests/${activePermit.id}`)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider shrink-0 h-10 px-5 shadow-md shadow-emerald-600/20"
                >
                  Track Request
                </Button>
              </div>
            ) : null}

            {/* Professional Notice Banner without the 2 cards and badge */}
            <div className="rounded-3xl border border-primary/20 bg-primary/[0.03] p-6 sm:p-8 backdrop-blur-md relative overflow-hidden">
              <div className="absolute -top-12 -right-12 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
              <div className="space-y-2 relative z-10">
                <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
                  Fencing Permit Application Guidelines
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-3xl leading-relaxed">
                  A Fencing Permit is a statutory accessory permit required prior to constructing, altering, repairing, or relocating any perimeter fence or boundary wall within the territorial jurisdiction of the Municipality of Mapandan. This ensures strict adherence to property boundaries, public safety standards, and road right-of-way setbacks.
                </p>
              </div>
            </div>

            {/* 6 Mandatory Requirement Pillars */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg sm:text-xl font-black uppercase tracking-tight flex items-center gap-2">
                    <FileCheck2 className="w-5 h-5 text-primary" />
                    Documentary Requirements
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Ensure clear, scanned digital copies (PDF or high-resolution JPEG) of the following mandatory documents are ready before initiating your application:
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Lot Ownership */}
                <div className="p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-white/40 dark:bg-white/[0.02] backdrop-blur-sm space-y-3 hover:border-primary/40 transition-colors group">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-sm group-hover:scale-110 transition-transform">
                      01
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 dark:bg-white/5 px-2.5 py-1 rounded-full">
                      Registry of Deeds
                    </span>
                  </div>
                  <div>
                    <h4 className="font-black text-sm sm:text-base text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      <LandPlot className="w-4 h-4 text-primary" />
                      Proof of Land Ownership
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      Certified True Copy of the Transfer Certificate of Title (TCT / OCT). If the applicant is not the registered title owner: Notarized Deed of Absolute Sale, Contract of Lease, or an authenticated Special Power of Attorney (SPA) / Authorization Letter.
                    </p>
                  </div>
                </div>

                {/* 2. Tax Dec & RPT Receipt */}
                <div className="p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-white/40 dark:bg-white/[0.02] backdrop-blur-sm space-y-3 hover:border-primary/40 transition-colors group">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-sm group-hover:scale-110 transition-transform">
                      02
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 dark:bg-white/5 px-2.5 py-1 rounded-full">
                      Municipal Assessor / Treasury
                    </span>
                  </div>
                  <div>
                    <h4 className="font-black text-sm sm:text-base text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-primary" />
                      Tax Declaration & Real Property Tax Receipt
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      Latest Certified True Copy of the Real Property Tax Declaration and the Official Receipt of updated Real Property Tax (RPT) payment for the current calendar year, accompanied by a valid Tax Clearance Certificate.
                    </p>
                  </div>
                </div>

                {/* 3. Lot Survey & Vicinity Map */}
                <div className="p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-white/40 dark:bg-white/[0.02] backdrop-blur-sm space-y-3 hover:border-primary/40 transition-colors group">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-sm group-hover:scale-110 transition-transform">
                      03
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 dark:bg-white/5 px-2.5 py-1 rounded-full">
                      Geodetic Engineer
                    </span>
                  </div>
                  <div>
                    <h4 className="font-black text-sm sm:text-base text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      <Compass className="w-4 h-4 text-primary" />
                      Certified Lot Plan & Boundary Survey
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      Original or certified copy of the Lot Plan with Vicinity Map, signed and sealed by a duly licensed Geodetic Engineer, certifying boundary verifications, monuments, and confirming non-encroachment on adjacent parcels.
                    </p>
                  </div>
                </div>

                {/* 4. Signed Fencing Engineering Plans & BOM */}
                <div className="p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-white/40 dark:bg-white/[0.02] backdrop-blur-sm space-y-3 hover:border-primary/40 transition-colors group">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-sm group-hover:scale-110 transition-transform">
                      04
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 dark:bg-white/5 px-2.5 py-1 rounded-full">
                      Civil Engineer / Architect
                    </span>
                  </div>
                  <div>
                    <h4 className="font-black text-sm sm:text-base text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      <Ruler className="w-4 h-4 text-primary" />
                      Engineering Plans & Bill of Materials
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      Complete architectural and structural fencing plans (site development plan, elevations, footing and foundation sections, lintel beam details) alongside itemized Bill of Materials and Cost Estimates, signed and sealed by a registered Civil Engineer or Architect.
                    </p>
                  </div>
                </div>

                {/* 5. Clearances: Barangay & Zoning */}
                <div className="p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-white/40 dark:bg-white/[0.02] backdrop-blur-sm space-y-3 hover:border-primary/40 transition-colors group">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-sm group-hover:scale-110 transition-transform">
                      05
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 dark:bg-white/5 px-2.5 py-1 rounded-full">
                      Barangay & MPDO
                    </span>
                  </div>
                  <div>
                    <h4 className="font-black text-sm sm:text-base text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                      Barangay Clearance & Locational Clearance
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      Barangay Construction Clearance specifically certifying the absence of boundary or neighborhood disputes, and a Locational / Zoning Clearance issued by the Municipal Planning & Development Office (MPDO).
                    </p>
                  </div>
                </div>

                {/* 6. Legal & Identification */}
                <div className="p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-white/40 dark:bg-white/[0.02] backdrop-blur-sm space-y-3 hover:border-primary/40 transition-colors group">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-sm group-hover:scale-110 transition-transform">
                      06
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 dark:bg-white/5 px-2.5 py-1 rounded-full">
                      LGU / DOLE / Valid ID
                    </span>
                  </div>
                  <div>
                    <h4 className="font-black text-sm sm:text-base text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-primary" />
                      DOLE CSHP, Cedula & Government Identification
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      DOLE Construction Safety & Health Program (CSHP) compliance sheet, Community Tax Certificate (Cedula) for the current fiscal year, and valid government-issued photo ID of the applicant and authorized representatives.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Technical Fencing Regulations & Setbacks Notice */}
            <div className="p-6 rounded-3xl border border-amber-500/20 bg-amber-500/[0.03] space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Info className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-black text-sm sm:text-base uppercase tracking-tight text-amber-700 dark:text-amber-400">
                    Mandatory Technical & Zoning Standards
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    All fence installations within Mapandan must comply with the following structural and spatial requirements:
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="p-4 rounded-2xl bg-white/60 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-1.5">
                  <span className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 tracking-wider">
                    Height Limitations
                  </span>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Solid masonry or concrete hollow block walls along road frontages must not exceed <strong>1.00m to 1.50m</strong> in solid height. Structures exceeding this threshold must feature semi-open grilles or wrought iron for clear street surveillance and ventilation.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white/60 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-1.5">
                  <span className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 tracking-wider">
                    Road Right-of-Way Protection
                  </span>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Under no circumstances may any fencing, post footing, or decorative canopy encroach upon the <strong>Road Right-of-Way (RROW)</strong>, municipal sidewalks, shoulders, or public waterway easements.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white/60 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-1.5">
                  <span className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 tracking-wider">
                    Corner Lot Sight Distance
                  </span>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Fences situated on intersection or corner parcels must incorporate a standard <strong>chaflan / corner cutoff</strong> to maintain clear sight distance for vehicular traffic and pedestrians.
                  </p>
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200 dark:border-white/10">
              <Link href="/user/services">
                <Button variant="ghost" className="rounded-xl text-xs font-bold uppercase tracking-wider gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Return to All Services
                </Button>
              </Link>
              {checkingActive ? (
                <div className="w-full sm:w-60 h-11 rounded-xl bg-slate-200/80 dark:bg-white/10 animate-pulse" />
              ) : activePermit ? (
                <Button
                  onClick={() => router.push(`/user/services/requests/${activePermit.id}`)}
                  className="w-full sm:w-auto px-8 rounded-xl font-black text-xs uppercase tracking-wider shadow-lg bg-emerald-600 hover:bg-emerald-700 text-white h-11"
                >
                  View Ongoing Request
                </Button>
              ) : (
                <Button
                  onClick={() => setCurrentStep("DETAILS")}
                  className="w-full sm:w-auto px-8 rounded-xl font-black text-xs uppercase tracking-wider shadow-lg shadow-primary/20 gap-2 h-11"
                >
                  Proceed to Project Details
                  <ArrowRight className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Step 2: DETAILS TAB CONTENT */}
        {currentStep === "DETAILS" && !activePermit && (
          <div className="space-y-8 animate-in fade-in-50 duration-300">
            {/* Fencing Site Location Card */}
            <div className="p-6 sm:p-8 rounded-3xl bg-white/80 dark:bg-white/5 border border-slate-200 dark:border-white/10 backdrop-blur-md shadow-sm space-y-6">
              <div className="flex items-center gap-3 border-b border-slate-200 dark:border-white/10 pb-4">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <LandPlot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black uppercase tracking-tight text-slate-900 dark:text-white">
                    Fencing Construction Site Address
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Specify the exact parcel where the perimeter fence or boundary wall will be constructed
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
                {/* Barangay Selector */}
                <div id="field-siteBarangay" className="space-y-1.5 scroll-mt-28">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Barangay <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={siteBarangay}
                    onChange={(e) => setSiteBarangay(e.target.value)}
                    className={cn(
                      "w-full h-11 px-3.5 rounded-xl border bg-white dark:bg-white/5 font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 transition-colors",
                      showDetailsErrors && !siteBarangay
                        ? "border-rose-500 focus:ring-rose-500/20 bg-rose-50/10 dark:bg-rose-950/10"
                        : "border-slate-200 dark:border-white/10 focus:ring-primary/20"
                    )}
                  >
                    <option value="" disabled>Select Barangay</option>
                    {MAPANDAN_BARANGAYS.map((b) => (
                      <option key={b} value={b} className="dark:bg-slate-900">
                        Barangay {b}
                      </option>
                    ))}
                  </select>
                  {showDetailsErrors && !siteBarangay && (
                    <p className="text-[10px] font-bold text-rose-500 italic">Please select a barangay.</p>
                  )}
                </div>

                {/* Street / Sitio / Purok */}
                <div id="field-siteStreet" className="space-y-1.5 scroll-mt-28">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Street / Sitio / Purok <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={siteStreet}
                    onChange={(e) => setSiteStreet(e.target.value)}
                    placeholder="e.g. Rizal Street, Purok 3"
                    className={cn(
                      "w-full h-11 px-3.5 rounded-xl border bg-white dark:bg-white/5 font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-colors",
                      showDetailsErrors && !siteStreet.trim()
                        ? "border-rose-500 focus:ring-rose-500/20 bg-rose-50/10 dark:bg-rose-950/10"
                        : "border-slate-200 dark:border-white/10 focus:ring-primary/20"
                    )}
                  />
                  {showDetailsErrors && !siteStreet.trim() && (
                    <p className="text-[10px] font-bold text-rose-500 italic">Please provide the street/sitio address.</p>
                  )}
                </div>

                {/* Municipality (Fixed) */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Municipality
                  </label>
                  <input
                    type="text"
                    value="Mapandan"
                    disabled
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/[0.02] font-bold text-slate-500 dark:text-slate-400"
                  />
                </div>

                {/* Province (Fixed) */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Province
                  </label>
                  <input
                    type="text"
                    value="Pangasinan"
                    disabled
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/[0.02] font-bold text-slate-500 dark:text-slate-400"
                  />
                </div>
              </div>
            </div>

            {/* Project Economics & Specifications Card */}
            <div className="p-6 sm:p-8 rounded-3xl bg-white/80 dark:bg-white/5 border border-slate-200 dark:border-white/10 backdrop-blur-md shadow-sm space-y-6">
              <div className="border-b border-slate-200 dark:border-white/10 pb-4">
                <h3 className="text-base font-black uppercase tracking-tight text-slate-900 dark:text-white">
                  Fencing Specifications & Cost Estimate
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Details required for structural safety review and regulatory assessment
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
                {/* Estimated Cost */}
                <div id="field-estimatedCost" className="space-y-1.5 scroll-mt-28">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Estimated Construction Cost (PHP) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-slate-400 text-sm">
                      ₱
                    </span>
                    <input
                      type="text"
                      value={estimatedCost}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^0-9]/g, "");
                        if (!raw) {
                          setEstimatedCost("");
                          return;
                        }
                        const formatted = Number(raw).toLocaleString("en-US");
                        setEstimatedCost(formatted);
                      }}
                      placeholder="e.g. 50,000"
                      className={cn(
                        "w-full h-11 pl-8 pr-3.5 rounded-xl border bg-white dark:bg-white/5 font-mono font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-colors",
                        showDetailsErrors && (!parseFloat(estimatedCost.replace(/,/g, "")) || parseFloat(estimatedCost.replace(/,/g, "")) <= 0)
                          ? "border-rose-500 focus:ring-rose-500/20 bg-rose-50/10 dark:bg-rose-950/10"
                          : "border-slate-200 dark:border-white/10 focus:ring-primary/20"
                      )}
                    />
                  </div>
                  {showDetailsErrors && (!parseFloat(estimatedCost.replace(/,/g, "")) || parseFloat(estimatedCost.replace(/,/g, "")) <= 0) ? (
                    <p className="text-[10px] font-bold text-rose-500 italic">Please enter a valid estimated cost (greater than 0).</p>
                  ) : (
                    <p className="text-[10px] text-slate-400">
                      Must match the Bill of Materials submitted by your licensed engineer.
                    </p>
                  )}
                </div>

                {/* Fence Type */}
                <div id="field-fenceType" className="space-y-1.5 scroll-mt-28">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Primary Fence Material / Design Type <span className="text-rose-500">*</span>
                  </label>
                  <Select
                    value={fenceType}
                    onValueChange={(val) => setFenceType(val)}
                  >
                    <SelectTrigger className={cn(
                      "w-full h-11 min-h-[44px] max-h-[44px] py-0 px-3.5 rounded-xl border bg-white dark:bg-white/5 font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 transition-all flex items-center justify-between text-left",
                      showDetailsErrors && !fenceType
                        ? "border-rose-500 focus:ring-rose-500/20 bg-rose-50/10 dark:bg-rose-950/10"
                        : "border-slate-200 dark:border-white/10 focus:ring-primary/20"
                    )}>
                      <SelectValue placeholder="Select primary fence design">
                        <span className="truncate block font-bold text-xs">
                          {FENCE_TYPE_OPTIONS.find((o) => o.value === fenceType)?.label || fenceType}
                        </span>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="max-h-80 w-[var(--radix-select-trigger-width)] min-w-[320px] rounded-2xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-[#0c0e14]/95 backdrop-blur-xl shadow-2xl p-1.5 space-y-1">
                      {FENCE_TYPE_OPTIONS.map((opt) => (
                        <SelectItem
                          key={opt.value}
                          value={opt.value}
                          className="rounded-xl p-2.5 text-xs font-bold text-slate-900 dark:text-white cursor-pointer hover:bg-slate-100 dark:hover:bg-white/10 focus:bg-slate-100 dark:focus:bg-white/10 transition-colors"
                        >
                          <div className="space-y-0.5 text-left pr-4">
                            <p className="font-bold text-slate-900 dark:text-white text-xs leading-snug">{opt.label}</p>
                            <p className="text-[10px] font-normal text-slate-500 dark:text-slate-400 leading-relaxed">
                              {opt.description}
                            </p>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {showDetailsErrors && !fenceType ? (
                    <p className="text-[10px] font-bold text-rose-500 italic">Please select a primary fence design.</p>
                  ) : (
                    <p className="text-[10px] text-slate-400">
                      Standard structural material for perimeter footing and walls.
                    </p>
                  )}
                </div>

                {/* Fence Security Feature / Add-on */}
                <div className="space-y-1.5 sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Perimeter Security Add-on (Electrified / Barbed Wire)
                    </label>
                    <span className="text-[9px] font-bold text-slate-400 italic">Optional Safety Feature</span>
                  </div>
                  <Select
                    value={fenceSecurityFeature}
                    onValueChange={(val) => setFenceSecurityFeature(val)}
                  >
                    <SelectTrigger className="w-full h-11 min-h-[44px] max-h-[44px] py-0 px-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all flex items-center justify-between text-left">
                      <SelectValue placeholder="Select perimeter security feature">
                        <span className="truncate block font-bold text-xs">
                          {FENCE_SECURITY_OPTIONS.find((o) => o.value === fenceSecurityFeature)?.label || "Standard Perimeter (None / Plain Top)"}
                        </span>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="max-h-80 w-[var(--radix-select-trigger-width)] min-w-[320px] rounded-2xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-[#0c0e14]/95 backdrop-blur-xl shadow-2xl p-1.5 space-y-1">
                      {FENCE_SECURITY_OPTIONS.map((opt) => (
                        <SelectItem
                          key={opt.value}
                          value={opt.value}
                          className="rounded-xl p-2.5 text-xs font-bold text-slate-900 dark:text-white cursor-pointer hover:bg-slate-100 dark:hover:bg-white/10 focus:bg-slate-100 dark:focus:bg-white/10 transition-colors"
                        >
                          <div className="space-y-0.5 text-left pr-4">
                            <p className="font-bold text-slate-900 dark:text-white text-xs leading-snug">
                              {opt.label}
                            </p>
                            <p className="text-[10px] font-normal text-slate-500 dark:text-slate-400 leading-relaxed">
                              {opt.description}
                            </p>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Clean Safety Notice for Barbed Wire */}
                  {(fenceSecurityFeature === "BARBED_WIRE" || fenceSecurityFeature === "BOTH") && (
                    <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs mt-2 space-y-0.5 animate-in fade-in duration-200">
                      <p className="font-black text-[10px] uppercase tracking-wider">Barbed / Razor Wire Safety Standard</p>
                      <p className="text-[11px] leading-relaxed opacity-90">
                        Pursuant to municipal safety regulations, barbed or concertina wire must be installed at a minimum height of <strong>2.00 meters</strong> above finished street grade to safeguard pedestrians and neighbors.
                      </p>
                    </div>
                  )}

                  {/* Clean Safety Notice for Electrified Fence */}
                  {(fenceSecurityFeature === "ELECTRIFIED" || fenceSecurityFeature === "BOTH") && (
                    <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs mt-2 space-y-0.5 animate-in fade-in duration-200">
                      <p className="font-black text-[10px] uppercase tracking-wider">Philippine Electrical Code Notice</p>
                      <p className="text-[11px] leading-relaxed opacity-90">
                        Electrified fences must strictly utilize regulated, pulsed non-lethal DC energizers. Continuous high-voltage direct AC wiring is strictly forbidden. <strong>Electrical Layout & Energizer Specification Plan</strong> signed by a Professional Electrical Engineer (PEE) will be required in the upload step.
                      </p>
                    </div>
                  )}
                </div>

                {/* Total Length */}
                <div id="field-fenceLength" className="space-y-1.5 scroll-mt-28">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Total Fencing Length (Linear Meters) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={fenceLength}
                    onChange={(e) => setFenceLength(e.target.value)}
                    placeholder="e.g. 20"
                    className={cn(
                      "w-full h-11 px-3.5 rounded-xl border bg-white dark:bg-white/5 font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-colors",
                      showDetailsErrors && (!parseFloat(fenceLength) || parseFloat(fenceLength) <= 0)
                        ? "border-rose-500 focus:ring-rose-500/20 bg-rose-50/10 dark:bg-rose-950/10"
                        : "border-slate-200 dark:border-white/10 focus:ring-primary/20"
                    )}
                  />
                  {showDetailsErrors && (!parseFloat(fenceLength) || parseFloat(fenceLength) <= 0) && (
                    <p className="text-[10px] font-bold text-rose-500 italic">Please enter the total fence length in meters.</p>
                  )}
                </div>

                {/* Total Height */}
                <div id="field-fenceHeight" className="space-y-1.5 scroll-mt-28">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Maximum Fence Height (Meters) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={fenceHeight}
                    onChange={(e) => setFenceHeight(e.target.value)}
                    placeholder="e.g. 1.8"
                    className={cn(
                      "w-full h-11 px-3.5 rounded-xl border bg-white dark:bg-white/5 font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-colors",
                      showDetailsErrors && (!parseFloat(fenceHeight) || parseFloat(fenceHeight) <= 0)
                        ? "border-rose-500 focus:ring-rose-500/20 bg-rose-50/10 dark:bg-rose-950/10"
                        : "border-slate-200 dark:border-white/10 focus:ring-primary/20"
                    )}
                  />
                  {showDetailsErrors && (!parseFloat(fenceHeight) || parseFloat(fenceHeight) <= 0) ? (
                    <p className="text-[10px] font-bold text-rose-500 italic">Please enter the fence height in meters.</p>
                  ) : (
                    <p className="text-[10px] text-amber-500">
                      Notice: Solid walls exceeding 1.50m along road frontages require semi-open grilles.
                    </p>
                  )}
                  {(fenceSecurityFeature === "BARBED_WIRE" || fenceSecurityFeature === "BOTH") && parseFloat(fenceHeight) > 0 && parseFloat(fenceHeight) < 2.0 && (
                    <p className="text-[10px] font-bold text-rose-500 animate-in fade-in duration-200">
                      Notice: Fence height is below 2.0m. Make sure the barbed wire extension reaches at least 2.00m clearance above ground level.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Navigation Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <Button
                  variant="ghost"
                  onClick={() => setCurrentStep("GUIDE")}
                  className="rounded-xl text-xs font-bold uppercase tracking-wider gap-2 flex-1 sm:flex-none"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Guidelines
                </Button>
                <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500/80" />
                  <span>Auto-saved to draft</span>
                </div>
              </div>
              <Button
                onClick={() => {
                  const isValid = validateDetailsStep();
                  if (isValid) {
                    setCurrentStep("DOCUMENTS");
                  }
                }}
                className="w-full sm:w-auto px-8 rounded-xl font-black text-xs uppercase tracking-wider shadow-lg shadow-primary/20 gap-2 h-11"
              >
                Proceed to Document Uploads
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: DOCUMENTS (UPLOAD) TAB CONTENT */}
        {currentStep === "DOCUMENTS" && !activePermit && (
          <div className="space-y-8 animate-in fade-in-50 duration-300">
            {/* Section A: Mandatory Requirements */}
            <div className="space-y-4">
              <div>
                <h3 className="text-base sm:text-lg font-black uppercase tracking-tight flex items-center gap-2">
                  <FileCheck2 className="w-5 h-5 text-primary" />
                  Mandatory Engineering & Ownership Documents
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  All 8 items below must be attached before technical review can be initiated.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                {MANDATORY_DOCUMENT_SLOTS.map((slot) => {
                  const file = uploadedFiles[slot.key] || null;
                  const previewUrl = previewUrls[slot.key] || null;
                  const isMissing = showValidationErrors && !file;

                  return (
                    <div
                      key={slot.key}
                      id={`doc-slot-${slot.key}`}
                      className="scroll-mt-28 transition-all space-y-1.5"
                    >
                      <div className="flex items-center justify-end px-1">
                        <button
                          type="button"
                          onClick={() => setSelectedGuideSlot(slot)}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline hover:text-primary/80 transition-colors"
                        >
                          <HelpCircle className="w-3.5 h-3.5" />
                          Guide
                        </button>
                      </div>

                      <PremiumDocumentUpload
                        label={slot.label}
                        required={slot.required}
                        file={file}
                        previewUrl={previewUrl}
                        onFileSelect={(selectedFile) => handleFileSelect(slot.key, selectedFile)}
                        onClear={() => handleClearFile(slot.key)}
                        onView={() => handleViewDocument(slot.key, slot.label)}
                        error={isMissing ? "This document is required" : false}
                        infoText={`${slot.agencyBadge} • PDF/IMAGE`}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Section B: Conditional / Supplementary Documents */}
            <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-white/10">
              <div>
                <h3 className="text-base sm:text-lg font-black uppercase tracking-tight flex items-center gap-2">
                  <Landmark className="w-5 h-5 text-slate-400" />
                  Supplementary Clearances & Authorizations (Optional)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Attach only if applicable to your property situation, project location, or representation.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                {CONDITIONAL_DOCUMENT_SLOTS.map((slot) => {
                  const file = uploadedFiles[slot.key] || null;
                  const previewUrl = previewUrls[slot.key] || null;

                  return (
                    <div
                      key={slot.key}
                      id={`doc-slot-${slot.key}`}
                      className="scroll-mt-28 transition-all space-y-1.5"
                    >
                      <div className="flex items-center justify-end px-1">
                        <button
                          type="button"
                          onClick={() => setSelectedGuideSlot(slot)}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline hover:text-primary/80 transition-colors"
                        >
                          <HelpCircle className="w-3.5 h-3.5" />
                          Guide
                        </button>
                      </div>

                      <PremiumDocumentUpload
                        label={slot.label}
                        required={false}
                        file={file}
                        previewUrl={previewUrl}
                        onFileSelect={(selectedFile) => handleFileSelect(slot.key, selectedFile)}
                        onClear={() => handleClearFile(slot.key)}
                        onView={() => handleViewDocument(slot.key, slot.label)}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Navigation Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200 dark:border-white/10">
              <Button
                variant="ghost"
                onClick={() => setCurrentStep("DETAILS")}
                className="rounded-xl text-xs font-bold uppercase tracking-wider gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Details
              </Button>
              <Button
                onClick={handleProceedToSubmit}
                className="w-full sm:w-auto px-8 rounded-xl font-black text-xs uppercase tracking-wider shadow-lg shadow-primary/20 gap-2 h-11"
              >
                Proceed to Review & Submit
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: SUBMIT / REVIEW TAB */}
        {currentStep === "SUBMIT" && !activePermit && (
          <div className="space-y-8 animate-in fade-in-50 duration-500">
            {/* Card 1: Applicant Profile Snapshot */}
            <div className="p-6 rounded-3xl bg-white/80 dark:bg-white/5 border border-slate-200 dark:border-white/10 backdrop-blur-md shadow-sm space-y-5">
              <div className="flex items-center gap-3 border-b border-slate-200 dark:border-white/10 pb-4">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black uppercase tracking-tight text-slate-900 dark:text-white">
                    Applicant Information
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Pre-filled verified resident record
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                    Full Name
                  </span>
                  <p className="font-bold text-slate-900 dark:text-white">
                    {residentProfile
                      ? `${residentProfile.firstName || ""} ${residentProfile.middleName ? residentProfile.middleName + " " : ""}${residentProfile.lastName || ""}`
                      : "Loading resident profile..."}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                    Contact Number
                  </span>
                  <p className="font-bold text-slate-900 dark:text-white">
                    {residentProfile?.contactNumber || residentProfile?.mobileNumber || "None on record"}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                    Email Address
                  </span>
                  <p className="font-bold text-slate-900 dark:text-white truncate">
                    {residentProfile?.email || residentProfile?.user?.email || "None on record"}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                    Resident Address
                  </span>
                  <p className="font-bold text-slate-900 dark:text-white">
                    {residentProfile?.barangay
                      ? `${residentProfile?.street ? residentProfile.street + ", " : ""}Brgy. ${residentProfile.barangay}, Mapandan`
                      : "Mapandan, Pangasinan"}
                  </p>
                </div>
              </div>
            </div>

            {/* Card 2: Fencing Construction Site & Project Estimate Summary */}
            <div className="p-6 rounded-3xl bg-white/80 dark:bg-white/5 border border-slate-200 dark:border-white/10 backdrop-blur-md shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Ruler className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black uppercase tracking-tight text-slate-900 dark:text-white">
                      Fencing Project Details & Estimate
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Declared fencing specifications and construction valuation
                    </p>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentStep("DETAILS")}
                  className="rounded-xl text-[11px] font-bold uppercase tracking-wider gap-1.5"
                >
                  Edit Details
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                    Fencing Site Address
                  </span>
                  <p className="font-bold text-slate-900 dark:text-white">
                    {siteStreet ? `${siteStreet}, ` : ""}Brgy. {siteBarangay || "Mapandan"}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                    Estimated Cost
                  </span>
                  <p className="font-mono font-black text-primary text-sm">
                    ₱{Number(estimatedCost.replace(/,/g, "") || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                    Design / Material
                  </span>
                  <p className="font-bold text-slate-900 dark:text-white line-clamp-1" title={fenceType}>
                    {fenceType}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                    Dimensions (L × H)
                  </span>
                  <p className="font-bold text-slate-900 dark:text-white">
                    {fenceLength || "0"}m length × {fenceHeight || "0"}m height
                  </p>
                </div>

                <div className="space-y-1 sm:col-span-2 md:col-span-4 pt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Security Feature / Add-on
                  </span>
                  <span className={cn(
                    "text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md flex items-center gap-1",
                    fenceSecurityFeature === "NONE" 
                      ? "bg-slate-100 dark:bg-white/5 text-slate-500" 
                      : fenceSecurityFeature === "ELECTRIFIED"
                        ? "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                        : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                  )}>
                    {fenceSecurityFeature === "ELECTRIFIED" && <Zap className="w-3 h-3 text-rose-500" />}
                    {(fenceSecurityFeature === "BARBED_WIRE" || fenceSecurityFeature === "BOTH") && <ShieldAlert className="w-3 h-3 text-amber-500" />}
                    {FENCE_SECURITY_OPTIONS.find(o => o.value === fenceSecurityFeature)?.label || "Standard Perimeter"}
                  </span>
                </div>
              </div>
            </div>

            {/* Card 3: Attached Mandatory Documents Review Gallery */}
            <div className="p-6 sm:p-8 rounded-3xl bg-white/80 dark:bg-white/5 border border-slate-200 dark:border-white/10 backdrop-blur-md shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                    <FileCheck2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black uppercase tracking-tight text-slate-900 dark:text-white">
                      Attached Documents Verification
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      All {mandatoryUploadedCount} of {MANDATORY_DOCUMENT_SLOTS.length} mandatory documents attached
                    </p>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentStep("DOCUMENTS")}
                  className="rounded-xl text-[11px] font-bold uppercase tracking-wider gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Manage Documents
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {MANDATORY_DOCUMENT_SLOTS.map((slot) => {
                  const file = uploadedFiles[slot.key];
                  const hasFile = !!file;

                  return (
                    <div
                      key={slot.key}
                      className={cn(
                        "p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 text-left relative overflow-hidden",
                        hasFile
                          ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40"
                          : "bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/40"
                      )}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[9px] font-black uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded-md truncate max-w-[120px]">
                            {slot.agencyBadge}
                          </span>
                          {hasFile ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                          )}
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-2 leading-snug">
                          {slot.label}
                        </h4>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                          {hasFile ? file?.name : "Missing attachment"}
                        </p>
                      </div>

                      {hasFile && (
                        <button
                          type="button"
                          onClick={() => handleViewDocument(slot.key, slot.label)}
                          className="w-full mt-1 py-1.5 px-2.5 rounded-xl bg-white dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/20 border border-slate-200 dark:border-white/10 text-[10px] font-bold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5 text-primary" />
                          Preview File
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Actions Bar */}
            <div className="p-6 rounded-3xl bg-white/70 dark:bg-white/5 border border-slate-200 dark:border-white/10 backdrop-blur-xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <Button
                variant="ghost"
                onClick={() => setCurrentStep("DOCUMENTS")}
                disabled={isSubmitting}
                className="rounded-xl text-xs font-bold uppercase tracking-wider gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Documents
              </Button>

              <Button
                onClick={handleSubmitApplication}
                disabled={isSubmitting || !isMandatoryComplete}
                className="w-full sm:w-auto px-10 h-12 rounded-2xl font-black text-xs uppercase tracking-wider shadow-xl shadow-primary/25 gap-2"
              >
                {isSubmitting ? "Processing & Redirecting..." : "Confirm & Submit Application"}
              </Button>
            </div>
          </div>
        )}

      </div>
  );
}
