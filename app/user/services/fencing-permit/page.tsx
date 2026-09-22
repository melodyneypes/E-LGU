"use client";

import * as React from "react";
import Link from "next/link";
import { 
  Home, 
  Construction, 
  ArrowLeft,
  ClipboardList,
  User,
  Upload,
  Building2,
  Landmark,
  CheckCircle2,
  ShieldCheck,
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

const STEPS = [
  { id: "GUIDE", label: "Guide", icon: ClipboardList },
  { id: "PROFILE", label: "Profile", icon: User },
  { id: "DOCUMENTS", label: "Upload", icon: Upload },
  { id: "EVALUATION", label: "Evaluation", icon: Building2 },
  { id: "BFP", label: "Treasury", icon: Landmark },
  { id: "SUBMIT", label: "Submit", icon: CheckCircle2 },
];

export default function FencingPermitPage() {
  const [currentStep, setCurrentStep] = React.useState("GUIDE");

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-0 pb-16 space-y-8">
        
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
                onClick={() => setCurrentStep(step.id)}
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
            {/* Citizen's Charter Key Notice Banner */}
            <div className="rounded-3xl border border-primary/20 bg-primary/[0.03] p-6 sm:p-8 backdrop-blur-md relative overflow-hidden">
              <div className="absolute -top-12 -right-12 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    P.D. 1096 National Building Code & Mapandan LGU Guidelines
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black uppercase italic tracking-tight">
                    Fencing Permit Application Guide
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
                    Ang Fencing Permit ay kailangan bago magtayo, mag-ayos, o magpalit ng perimeter fence o bakod sa loob ng Mapandan upang masigurado ang tamang boundary, kaligtasan, at pagsunod sa road right-of-way.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 shrink-0 w-full sm:w-auto">
                  <div className="p-3.5 rounded-2xl bg-white/60 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-center space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Processing SLA</p>
                    <p className="text-base sm:text-lg font-black text-primary">3 - 5 Days</p>
                    <span className="text-[9px] text-slate-400 block font-medium">Upon Complete Uploads</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-white/60 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-center space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Validity</p>
                    <p className="text-base sm:text-lg font-black text-emerald-500">120 Days</p>
                    <span className="text-[9px] text-slate-400 block font-medium">To Commence Work</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 6 Mandatory Requirement Pillars */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg sm:text-xl font-black uppercase tracking-tight flex items-center gap-2">
                    <FileCheck2 className="w-5 h-5 text-primary" />
                    Dokumento at mga Kinakailangan (Documentary Requirements)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Ihanda ang malinaw na kopya (PDF o JPEG) ng sumusunod na 6 na pangunahing dokumento bago magpatuloy sa application:
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
                      Katibayan ng Pagmamay-ari (Proof of Ownership)
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      Certified True Copy ng Transfer Certificate of Title (TCT / OCT). Kung hindi nakapangalan sa nag-a-apply: Notarized Deed of Absolute Sale, Contract of Lease, o Authorization / Special Power of Attorney (SPA).
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
                      Tax Declaration & Latest Real Property Tax (Amilyar)
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      Updated Tax Declaration para sa lupa at opisyal na resibo (Official Receipt) ng pinakahuling bayad sa Real Property Tax (RPT / Amilyar) para sa kasalukuyang taon, kasama ang Tax Clearance.
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
                      Lot Plan, Vicinity Map & Boundary Survey
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      Certified Lot Plan na may Vicinity Map na nilagdaan at tinatakan (signed & sealed) ng isang Licensed Geodetic Engineer. Kasama ang certification na walang encroachment o overlaps sa katabing lote.
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
                      Fencing Plans, Structural Details & Bill of Materials
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      Kumpletong plano ng bakod (Site development, elevations, footing/foundation details, columns, lintel beams) at itemized Bill of Materials & Cost Estimates (BOM) na pirmado at may selyo ng lisensyadong Civil Engineer o Architect.
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
                      Barangay Fencing Clearance & Locational Clearance
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      Barangay Clearance para sa konstruksyon ng bakod na nagpapatunay na walang umiiral na boundary dispute sa mga kapitbahay. Locational/Zoning Clearance mula sa MPDO (at DPWH Clearance kung katabi ang national highway).
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
                      DOLE CSHP, Cedula at Valid Government IDs
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      DOLE Construction Safety & Health Program (CSHP) summary, Community Tax Certificate (Cedula) ng aplikante para sa kasalukuyang taon, at Valid Government-Issued ID na may 3 specimen signatures.
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
                    Mahahalagang Alituntunin sa Pagpapatayo ng Bakod (Technical Building Standards)
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Ayon sa National Building Code (PD 1096) at Ordinansa ng Bayan ng Mapandan:
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="p-4 rounded-2xl bg-white/60 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-1.5">
                  <span className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 tracking-wider">
                    Height Limitations
                  </span>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Ang solid masonry / hollow-block wall na nakaharap sa kalsada ay karaniwang may maximum solid height na <strong>1.00m to 1.50m</strong>. Ang lampas dito ay dapat semi-open o wrought iron/grilles upang mapanatili ang visual safety.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white/60 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-1.5">
                  <span className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 tracking-wider">
                    No RROW Encroachment
                  </span>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Mahigpit na ipinagbabawal ang pagtatayo ng bakod o poste lampas sa property line o papasok sa <strong>Road Right-of-Way (RROW)</strong>, bangketa (sidewalks), o public drainage canal easements.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white/60 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-1.5">
                  <span className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 tracking-wider">
                    Corner Lot Sight Triangle
                  </span>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Para sa mga lote sa kanto (corner lots), kailangan mag-iwan ng <strong>chaflan / corner cut-off</strong> upang hindi maharangan ang line-of-sight ng mga motorista at maiwasan ang aksidente.
                  </p>
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200 dark:border-white/10">
              <Link href="/user/services">
                <Button variant="ghost" className="rounded-xl text-xs font-bold uppercase tracking-wider gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Bumalik sa Lahat ng Serbisyo
                </Button>
              </Link>
              <Button
                onClick={() => setCurrentStep("PROFILE")}
                className="w-full sm:w-auto px-8 rounded-xl font-black text-xs uppercase tracking-wider shadow-lg shadow-primary/20 gap-2 h-11"
              >
                Magpatuloy sa Profile ng Aplikante
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Placeholder for Steps 2 to 6 (Under Development) */}
        {currentStep !== "GUIDE" && (
          <div className="p-8 sm:p-14 rounded-3xl bg-transparent border border-slate-200 dark:border-white/10 flex flex-col items-center justify-center text-center space-y-5 min-h-[380px]">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <Construction className="w-8 h-8 animate-pulse" />
            </div>
            <div className="space-y-2 max-w-md">
              <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight">
                {STEPS.find(s => s.id === currentStep)?.label} Step Under Assembly
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Naka-set na ang Guide tab! Ang module para sa <strong>{STEPS.find(s => s.id === currentStep)?.label}</strong> ay sunod nating bubuuin upang makumpleto ang buong fencing permit interactive workflow.
              </p>
            </div>
            <div className="pt-2 flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => setCurrentStep("GUIDE")}
                className="rounded-xl text-xs font-bold uppercase tracking-wider gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Bumalik sa Guide
              </Button>
            </div>
          </div>
        )}

      </div>
  );
}
