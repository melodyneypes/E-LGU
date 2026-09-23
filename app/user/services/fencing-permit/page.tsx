"use client";

import * as React from "react";
import Link from "next/link";
import { 
  Home, 
  Construction, 
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
  ArrowRight
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
import { cn } from "@/lib/utils";

import DocumentViewerModal from "@/components/shared/DocumentViewerModal";
import PremiumDocumentUpload from "@/components/shared/PremiumDocumentUpload";
import SecureIdleTimer from "@/components/shared/SecureIdleTimer";
import PrivacyTermsModal from "@/components/shared/PrivacyTermsModal";
import { getSystemSettingAction } from "@/app/admin/transactions/actions";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { HelpCircle, BookOpen, FileText } from "lucide-react";
import ProjectDetailsStep, { 
  type FencingProjectDetails 
} from "./components/ProjectDetailsStep";

const STEPS = [
  { id: "GUIDE", label: "Guide", icon: ClipboardList },
  { id: "DETAILS", label: "Details", icon: FileText },
  { id: "DOCUMENTS", label: "Upload", icon: Upload },
  { id: "EVALUATION", label: "Evaluation", icon: Building2 },
  { id: "BFP", label: "Treasury", icon: Landmark },
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
];

export default function FencingPermitPage() {
  const [currentStep, setCurrentStep] = React.useState("GUIDE");
  const [themeColor, setThemeColor] = React.useState("var(--primary-theme)");

  // Data Privacy & Security State
  const [privacyAccepted, setPrivacyAccepted] = React.useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = React.useState(false);
  const [selectedGuideSlot, setSelectedGuideSlot] = React.useState<DocumentSlotConfig | null>(null);
  const abandonedFilesRef = React.useRef<string[]>([]);

  React.useEffect(() => {
    getSystemSettingAction("theme_color").then((res) => {
      if (res.success && res.data) {
        setThemeColor(res.data);
      }
    });
  }, []);

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

  // Project Details State (PD 1096 - NBC Form No. B-03)
  const [projectDetails, setProjectDetails] = React.useState<FencingProjectDetails>({
    scopeOfWork: "NEW_CONSTRUCTION",
    applicantCapacity: "REGISTERED_OWNER",
    barangay: "",
    streetSitio: "",
    landmark: "",
    tctNumber: "",
    isUntitledDeedOfSale: false,
    taxDeclarationNumber: "",
    lotNumber: "",
    blockNumber: "",
    lotAreaSqM: "",
    zoningClassification: "RESIDENTIAL",
    frontageLinearMeters: "",
    rearLinearMeters: "",
    leftLinearMeters: "",
    rightLinearMeters: "",
    solidBaseHeightMeters: "",
    grilleHeightMeters: "",
    fencingMaterials: ["CHB"],
    materialsCost: "",
    laborCost: "",
    adjoiningRoadType: "BARANGAY_ROAD",
    isCornerLot: false,
    isAdjacentWaterway: false,
    hasObstructions: false,
    obstructionRemarks: "",
    professionalType: "CIVIL_ENGINEER",
    professionalName: "",
    prcLicenseNumber: "",
    prcExpiryDate: "",
    ptrNumber: "",
    ptrIssueDatePlace: "",
    tinNumber: "",
  });
  const [isDetailsCompleted, setIsDetailsCompleted] = React.useState(false);

  // Document Viewer Modal State
  const [viewerOpen, setViewerOpen] = React.useState(false);
  const [viewerFile, setViewerFile] = React.useState<File | null>(null);
  const [viewerUrl, setViewerUrl] = React.useState<string | null>(null);
  const [viewerTitle, setViewerTitle] = React.useState("");

  const handleFileSelect = (key: string, file: File) => {
    const objectUrl = URL.createObjectURL(file);
    setUploadedFiles((prev) => ({ ...prev, [key]: file }));
    setPreviewUrls((prev) => ({ ...prev, [key]: objectUrl }));
    toast.success("Document attached, verified, and compressed successfully!");
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

  const handleProceedToEvaluation = () => {
    if (!isMandatoryComplete) {
      scrollToFirstMissingSlot();
      return;
    }

    if (!privacyAccepted) {
      setIsPrivacyModalOpen(true);
      return;
    }

    setCurrentStep("EVALUATION");
  };

  const handleStepClick = (targetStepId: string) => {
    const targetIdx = STEPS.findIndex((s) => s.id === targetStepId);

    // If trying to move forward past DETAILS without completing project details
    if (targetIdx > 1 && !isDetailsCompleted) {
      toast.warning("Please complete the Project Details step first.");
      setCurrentStep("DETAILS");
      return;
    }

    // If trying to move forward past the DOCUMENTS step without completing mandatory uploads
    if (targetIdx > 2 && !isMandatoryComplete) {
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

  const handlePrivacyAccept = () => {
    setPrivacyAccepted(true);
    setIsPrivacyModalOpen(false);
    toast.success("Data Privacy & Consent confirmed!");
    setCurrentStep("EVALUATION");
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
        <div className="grid grid-cols-6 gap-1.5 sm:gap-4 relative px-1 sm:px-2">
          {STEPS.map((step, idx) => {
            const isActive = currentStep === step.id;
            const currentStepIdx = STEPS.findIndex(s => s.id === currentStep);
            const isCompleted = currentStepIdx > idx;
            const Icon = step.icon;

            return (
              <div
                key={step.id}
                onClick={() => handleStepClick(step.id)}
                className="flex flex-col items-center gap-2 relative z-10 font-black cursor-pointer group select-none"
              >
                <div
                  className={cn(
                    "w-11 h-11 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all duration-300 border-2",
                    isActive
                      ? "bg-primary text-white border-primary shadow-[0_0_20px_rgba(var(--primary),0.3)] scale-105 sm:scale-110"
                      : isCompleted
                        ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                        : "bg-slate-100 dark:bg-white/5 text-slate-400 border-transparent hover:border-primary/30"
                  )}
                >
                  <Icon className="w-4 h-4 sm:w-6 sm:h-6" />
                </div>
                <span
                  className={cn(
                    "text-[8px] sm:text-[10px] uppercase tracking-widest text-center italic transition-all",
                    isActive
                      ? "text-primary opacity-100 font-black"
                      : isCompleted
                        ? "text-emerald-500 font-bold opacity-80"
                        : "opacity-40 group-hover:opacity-100"
                  )}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Step 1: GUIDE TAB CONTENT */}
        {currentStep === "GUIDE" && (
          <div className="space-y-8 animate-in fade-in-50 duration-300">
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
              <Button
                onClick={() => setCurrentStep("DETAILS")}
                className="w-full sm:w-auto px-8 rounded-xl font-black text-xs uppercase tracking-wider shadow-lg shadow-primary/20 gap-2 h-11"
              >
                Proceed to Project Details
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: DETAILS TAB CONTENT (NEW) */}
        {currentStep === "DETAILS" && (
          <ProjectDetailsStep
            data={projectDetails}
            onChange={(updated) => setProjectDetails(updated)}
            onProceed={() => {
              setIsDetailsCompleted(true);
              setCurrentStep("DOCUMENTS");
              toast.success("Project specifications saved! Proceed to document uploads.");
            }}
            onBack={() => setCurrentStep("GUIDE")}
            themeColor={themeColor}
          />
        )}

        {/* Step 3: DOCUMENTS (UPLOAD) TAB CONTENT */}
        {currentStep === "DOCUMENTS" && (
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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                Back to Project Details
              </Button>
              <Button
                onClick={handleProceedToEvaluation}
                className="w-full sm:w-auto px-8 rounded-xl font-black text-xs uppercase tracking-wider shadow-lg shadow-primary/20 gap-2 h-11"
              >
                Proceed to Evaluation Step
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Placeholder for Steps 4 to 6 (Under Development) */}
        {currentStep !== "GUIDE" && currentStep !== "DETAILS" && currentStep !== "DOCUMENTS" && (
          <div className="p-8 sm:p-14 rounded-3xl bg-transparent border border-slate-200 dark:border-white/10 flex flex-col items-center justify-center text-center space-y-5 min-h-[380px]">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <Construction className="w-8 h-8 animate-pulse" />
            </div>
            <div className="space-y-2 max-w-md">
              <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight">
                {STEPS.find(s => s.id === currentStep)?.label} Step Under Assembly
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                The Documents Upload module is complete! Next, we will construct the <strong>{STEPS.find(s => s.id === currentStep)?.label}</strong> module to complete the citizen application flow.
              </p>
            </div>
            <div className="pt-2 flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => setCurrentStep("DOCUMENTS")}
                className="rounded-xl text-xs font-bold uppercase tracking-wider gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Document Upload
              </Button>
            </div>
          </div>
        )}

      </div>
  );
}
