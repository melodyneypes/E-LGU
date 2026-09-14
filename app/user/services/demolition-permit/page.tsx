import * as React from "react";
import { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  Clock,
  Building2,
  ArrowRight,
  ShieldAlert,
  Scale,
  FileCheck,
  AlertCircle
} from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
export const metadata: Metadata = {
  title: "Demolition Permit | E-Mapandan",
  description: "Official Municipal Demolition Permit Guidelines, Safety Protocols, and Application Requirements for Mapandan, Pangasinan.",
};

export default function DemolitionPermitPage() {

  const requirements = [
    {
      title: "Duly Accomplished Demolition Application Form",
      desc: "Standard official application form signed by the applicant and supervising Civil Engineer/Architect.",
      copies: "5 Copies (Notarized)"
    },
    {
      title: "Proof of Property Ownership",
      desc: "Certified True Copy of Transfer Certificate of Title (TCT) or Deed of Sale, plus owner's written notarized consent if applicant is a lessee.",
      copies: "1 Certified Copy, 2 Photocopies"
    },
    {
      title: "Real Property Tax (Amilyar) Clearance",
      desc: "Current fiscal year tax clearance and official payment receipt covering the building or structure to be demolished.",
      copies: "1 Original, 2 Photocopies"
    },
    {
      title: "Demolition Plan & Method Statement",
      desc: "Sequence of demolition, structural shoring plans, debris management, and dust/noise suppression signed and sealed by a Registered Civil Engineer.",
      copies: "5 Complete Sets"
    },
    {
      title: "Safety & Hazard Mitigation Program",
      desc: "Comprehensive public safety plan, pedestrian protection canopy details, and DOLE approved Construction Safety and Health Program (CSHP).",
      copies: "3 Copies"
    },
    {
      title: "Utility Disconnection Certificates",
      desc: "Official clearance and disconnection certificate from PANELCO (electric) and Mapandan Water District / Local Waterworks.",
      copies: "1 Original each"
    },
    {
      title: "Written Notice to Adjacent Property Owners",
      desc: "Signed acknowledgement letters or proof of notice served to owners of immediately adjacent structures.",
      copies: "2 Photocopies"
    },
    {
      title: "Valid Professional Licenses & IDs",
      desc: "Photocopies of valid PRC IDs and current PTR of the supervising Civil Engineer/Architect and property owner.",
      copies: "2 Photocopies each"
    }
  ];

  const steps = [
    {
      number: "01",
      title: "Utility Shutoff & Clearances",
      desc: "Secure electric and water line disconnections and gather DOLE CSHP and adjacent neighbor notification receipts."
    },
    {
      number: "02",
      title: "Engineering Plan Review",
      desc: "Submit demolition method statement, debris hauling route, and safety measures to the Municipal Engineering Office."
    },
    {
      number: "03",
      title: "On-Site Inspection & BFP Assessment",
      desc: "The Building Official conducts an ocular inspection to confirm structural safety and hazard containment."
    },
    {
      number: "04",
      title: "Treasury Payment & Permit Release",
      desc: "Settle demolition regulatory fees at the Treasury and receive the signed Demolition Permit prior to starting work."
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 pb-20 pt-28 sm:pt-32">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">

        {/* ── Breadcrumbs ── */}
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/" className="hover:text-rose-500 transition-colors">Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/user/services" className="hover:text-rose-500 transition-colors">Services</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="font-semibold text-rose-500">Demolition Permit</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* ── Header Banner ── */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-rose-950 p-8 sm:p-12 text-white shadow-2xl border border-rose-500/20">
          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold uppercase tracking-wider backdrop-blur-sm">
              <AlertTriangle className="w-3.5 h-3.5" />
              Municipal Engineering Office (MEO)
            </div>
            <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tight">
              Demolition Permit
            </h1>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Official municipal clearance authorizing the complete or partial dismantling, demolition, and removal of hazardous or condemned buildings and structures in Mapandan.
            </p>

            <div className="pt-2 flex flex-wrap gap-3">
              <Link
                href="/user/services/building-permit"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-900 bg-rose-400 hover:bg-rose-300 transition-colors shadow-lg shadow-rose-500/20"
              >
                Building Permit Portal
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/user/services/occupancy"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-white bg-white/10 hover:bg-white/20 transition-colors border border-white/10"
              >
                Occupancy Permit
              </Link>
            </div>
          </div>

          <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none translate-x-12 translate-y-12">
            <ShieldAlert className="w-96 h-96" />
          </div>
        </div>

        {/* ── Key Highlights ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-sm flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Processing Time</div>
              <div className="text-base font-bold text-slate-900 dark:text-white">3 – 5 Working Days</div>
              <div className="text-xs text-slate-500 mt-0.5">Subject to site ocular</div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-sm flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Jurisdiction</div>
              <div className="text-base font-bold text-slate-900 dark:text-white">Building Official</div>
              <div className="text-xs text-slate-500 mt-0.5">Municipal Engineering Office</div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-sm flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Standard</div>
              <div className="text-base font-bold text-slate-900 dark:text-white">PD 1096 Rule III</div>
              <div className="text-xs text-slate-500 mt-0.5">Safety & Protection of Life</div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-sm flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Validity</div>
              <div className="text-base font-bold text-slate-900 dark:text-white">Per Approved Schedule</div>
              <div className="text-xs text-slate-500 mt-0.5">Specified in clearance</div>
            </div>
          </div>
        </div>

        {/* ── Document Requirements ── */}
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-md p-6 sm:p-10 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/10 pb-5">
            <div>
              <span className="text-xs font-black uppercase tracking-widest text-rose-500">Checklist</span>
              <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white mt-1">
                Required Documents
              </h2>
            </div>
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full self-start">
              8 Standard Requirements
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {requirements.map((req, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl border border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-slate-800/30 hover:border-rose-500/30 transition-all space-y-1.5"
              >
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 font-black text-xs flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                    {req.title}
                  </h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 pl-8 leading-relaxed">
                  {req.desc}
                </p>
                <div className="pl-8 pt-1">
                  <span className="inline-block text-[10px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2.5 py-0.5 rounded-md">
                    {req.copies}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-800 dark:text-rose-300 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-500 mt-0.5" />
            <p>
              <strong>Critical Safety Policy:</strong> No demolition work may commence without certified utility disconnections (electric power and water supply) and proper protective hoardings / barricades surrounding the property. Failure to secure a demolition permit carries penal liabilities under the National Building Code.
            </p>
          </div>
        </div>

        {/* ── Step-by-Step Workflow ── */}
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-md p-6 sm:p-10 space-y-8">
          <div>
            <span className="text-xs font-black uppercase tracking-widest text-rose-500">Procedure</span>
            <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white mt-1">
              Application Process
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, idx) => (
              <div key={idx} className="relative space-y-3">
                <div className="text-3xl font-black text-rose-500/30">
                  {step.number}
                </div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  {step.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Call to Action / Navigation ── */}
        <div className="p-8 rounded-3xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center sm:text-left">
            <h3 className="text-base font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Questions Regarding Demolition Clearances?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              The Municipal Building Official and Engineering Office are located on the 2nd Floor of Mapandan Municipal Hall.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/user/services"
              className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 text-xs font-bold uppercase tracking-wider hover:bg-slate-200 dark:hover:bg-white/5 transition-colors"
            >
              All Services
            </Link>
            <Link
              href="/user/services/building-permit"
              className="px-5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold uppercase tracking-wider transition-colors shadow-md"
            >
              Building Permit
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
