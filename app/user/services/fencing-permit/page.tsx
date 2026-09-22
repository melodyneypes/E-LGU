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
  CheckCircle2
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

        {/* Clean Canvas / Workspace Ready for Interactive Form Stepper */}
        <div className="p-8 sm:p-14 rounded-3xl bg-transparent border border-slate-200 dark:border-white/10 flex flex-col items-center justify-center text-center space-y-5 min-h-[380px]">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
            <Construction className="w-8 h-8 animate-pulse" />
          </div>
          <div className="space-y-2 max-w-md">
            <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight">
              Ready for Application Form Setup
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Nalinis na ang lumang brochure content. Ang canvass na ito ay nakakabit na sa standard layout at handa na para sa pagtatayo ng interactive multi-step citizen application form.
            </p>
          </div>
          <div className="pt-2 flex items-center gap-3">
            <Link href="/user/services">
              <Button variant="outline" className="rounded-xl text-xs font-bold uppercase tracking-wider gap-2">
                <ArrowLeft className="w-4 h-4" />
                Return to Services
              </Button>
            </Link>
          </div>
        </div>

      </div>
  );
}
