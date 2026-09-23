"use client";

import * as React from "react";
import { 
  Building2, 
  MapPin, 
  Ruler, 
  ShieldAlert, 
  UserCheck, 
  ArrowLeft, 
  ArrowRight,
  PlusCircle,
  Layers,
  Wrench,
  RefreshCw,
  Info,
  Check,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export const MAPANDAN_BARANGAYS = [
  "Amanoaoac",
  "Apaya",
  "Aserda",
  "Baloling",
  "Coral",
  "Golden",
  "Jimenez",
  "Lambayan",
  "Lou-is",
  "Luyan",
  "Nilombot",
  "Pias",
  "Poblacion",
  "Primicias",
  "Santa Maria",
] as const;

export const FENCING_MATERIAL_OPTIONS = [
  { id: "CHB", label: "Reinforced Concrete Hollow Blocks (CHB)" },
  { id: "STEEL_GRILLE", label: "Decorative Steel / Wrought Iron Grilles" },
  { id: "CYCLONE_WIRE", label: "Cyclone / Chain-Link Wire with Concrete Posts" },
  { id: "PRECAST_PANEL", label: "Precast Concrete Panels & Columns" },
  { id: "STONE_MASONRY", label: "Stone Masonry / Riprap Retaining Wall" },
  { id: "WOOD_TEMPORARY", label: "Timber / Bamboo / Temporary Site Enclosure" },
];

export interface FencingProjectDetails {
  // 1. Scope & Legal
  scopeOfWork: string;
  applicantCapacity: string;

  // 2. Cadastral & Site Location
  barangay: string;
  streetSitio: string;
  landmark: string;
  tctNumber: string;
  isUntitledDeedOfSale: boolean;
  taxDeclarationNumber: string;
  lotNumber: string;
  blockNumber: string;
  lotAreaSqM: string;
  zoningClassification: string;

  // 3. Dimensions & Construction Specs
  frontageLinearMeters: string;
  rearLinearMeters: string;
  leftLinearMeters: string;
  rightLinearMeters: string;
  solidBaseHeightMeters: string;
  grilleHeightMeters: string;
  fencingMaterials: string[];
  materialsCost: string;
  laborCost: string;

  // 4. Site Conditions & Setbacks
  adjoiningRoadType: string;
  isCornerLot: boolean;
  isAdjacentWaterway: boolean;
  hasObstructions: boolean;
  obstructionRemarks: string;

  // 5. Supervising Professional
  professionalType: "CIVIL_ENGINEER" | "ARCHITECT";
  professionalName: string;
  prcLicenseNumber: string;
  prcExpiryDate: string;
  ptrNumber: string;
  ptrIssueDatePlace: string;
  tinNumber: string;
}

interface ProjectDetailsStepProps {
  data: FencingProjectDetails;
  onChange: (data: FencingProjectDetails) => void;
  onProceed: () => void;
  onBack: () => void;
  themeColor?: string;
}

export default function ProjectDetailsStep({
  data,
  onChange,
  onProceed,
  onBack,
}: ProjectDetailsStepProps) {
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [, setAttemptedSubmit] = React.useState(false);

  // Field updater
  const updateField = <K extends keyof FencingProjectDetails>(
    field: K,
    value: FencingProjectDetails[K]
  ) => {
    const updated = { ...data, [field]: value };
    onChange(updated);
    if (errors[field]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[field];
        return copy;
      });
    }
  };

  // Toggle material helper
  const toggleMaterial = (id: string) => {
    const current = [...data.fencingMaterials];
    const exists = current.includes(id);
    const updated = exists ? current.filter((m) => m !== id) : [...current, id];
    updateField("fencingMaterials", updated);
  };

  // Computations
  const frontM = parseFloat(data.frontageLinearMeters) || 0;
  const rearM = parseFloat(data.rearLinearMeters) || 0;
  const leftM = parseFloat(data.leftLinearMeters) || 0;
  const rightM = parseFloat(data.rightLinearMeters) || 0;
  const totalLinearMeters = Number((frontM + rearM + leftM + rightM).toFixed(2));

  const baseH = parseFloat(data.solidBaseHeightMeters) || 0;
  const grilleH = parseFloat(data.grilleHeightMeters) || 0;
  const totalHeight = Number((baseH + grilleH).toFixed(2));

  const matCost = parseFloat(data.materialsCost.replace(/,/g, "")) || 0;
  const labCost = parseFloat(data.laborCost.replace(/,/g, "")) || 0;
  const totalCost = matCost + labCost;

  // Validation Routine
  const validate = (): boolean => {
    setAttemptedSubmit(true);
    const newErrors: Record<string, string> = {};

    if (!data.scopeOfWork) newErrors.scopeOfWork = "Please select the scope of work";
    if (!data.applicantCapacity) newErrors.applicantCapacity = "Please specify your legal capacity";
    if (!data.barangay) newErrors.barangay = "Select property barangay";
    if (!data.streetSitio.trim()) newErrors.streetSitio = "Street or Purok address is required";
    if (!data.isUntitledDeedOfSale && !data.tctNumber.trim()) {
      newErrors.tctNumber = "Title / TCT No. is required";
    }
    if (!data.taxDeclarationNumber.trim()) newErrors.taxDeclarationNumber = "Tax Dec No. is required";
    
    // Dimension validation: At least one perimeter segment must be > 0
    if (totalLinearMeters <= 0) {
      newErrors.frontageLinearMeters = "Provide at least one perimeter dimension";
    }
    if (totalHeight <= 0) {
      newErrors.solidBaseHeightMeters = "Specify fence height";
    }
    if (data.fencingMaterials.length === 0) {
      newErrors.fencingMaterials = "Select at least one fencing material";
    }
    if (totalCost <= 0) {
      newErrors.materialsCost = "Project cost estimate is required";
    }

    // Professional credentials
    if (!data.professionalName.trim()) newErrors.professionalName = "Professional name is required";
    if (!data.prcLicenseNumber.trim()) newErrors.prcLicenseNumber = "PRC license number is required";
    if (!data.ptrNumber.trim()) newErrors.ptrNumber = "PTR number is required";

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      // Find the first error field element and scroll to it smoothly
      const firstErrorKey = Object.keys(newErrors)[0];
      const el = document.getElementById(`field-${firstErrorKey}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return false;
    }

    return true;
  };

  const handleProceed = () => {
    if (validate()) {
      onProceed();
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-300">
      {/* CARD 1: Scope & Legal Capacity */}
      <div className="p-6 sm:p-7 rounded-3xl border border-slate-200 dark:border-white/10 bg-white/40 dark:bg-white/[0.02] backdrop-blur-sm space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-200/80 dark:border-white/10 pb-4">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black">
            1
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black uppercase tracking-tight">
              Scope of Work & Applicant Capacity
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Statutory classification of construction activity and legal representation.
            </p>
          </div>
        </div>

        {/* Scope of Work Radio Grid */}
        <div id="field-scopeOfWork" className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
            Scope of Construction Work <span className="text-red-500">*</span>
          </Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { id: "NEW_CONSTRUCTION", label: "New Construction", desc: "Fresh boundary fence erection", icon: PlusCircle },
              { id: "ADDITION_EXTENSION", label: "Addition / Extension", desc: "Lengthening or height elevation", icon: Layers },
              { id: "REPAIR_RENOVATION", label: "Repair / Renovation", desc: "Structural repair or finishing", icon: Wrench },
              { id: "DEMOLITION_REBUILD", label: "Demolition & Rebuild", desc: "Total tear-down and replacement", icon: RefreshCw },
            ].map((item) => {
              const Icon = item.icon;
              const isSelected = data.scopeOfWork === item.id;
              return (
                <div
                  key={item.id}
                  onClick={() => updateField("scopeOfWork", item.id)}
                  className={cn(
                    "p-4 rounded-2xl border cursor-pointer transition-all duration-200 text-left flex flex-col justify-between gap-3 group",
                    isSelected
                      ? "border-primary bg-primary/10 shadow-sm shadow-primary/10 ring-2 ring-primary/20"
                      : "border-slate-200 dark:border-white/10 hover:border-primary/40 bg-white/60 dark:bg-white/[0.01]"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                      isSelected ? "bg-primary text-white" : "bg-slate-100 dark:bg-white/5 text-slate-500 group-hover:text-primary"
                    )}>
                      <Icon className="w-4 h-4" />
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-primary" />}
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-tight text-slate-900 dark:text-white">
                      {item.label}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                      {item.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          {errors.scopeOfWork && (
            <p className="text-xs text-red-500 font-medium flex items-center gap-1 mt-1">
              <AlertCircle className="w-3.5 h-3.5" /> {errors.scopeOfWork}
            </p>
          )}
        </div>

        {/* Applicant Capacity */}
        <div className="pt-2">
          <div id="field-applicantCapacity" className="space-y-1.5 max-w-md">
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Applicant Legal Capacity <span className="text-red-500">*</span>
            </Label>
            <Select
              value={data.applicantCapacity}
              onValueChange={(val) => updateField("applicantCapacity", val)}
            >
              <SelectTrigger className="rounded-xl h-11 border-slate-200 dark:border-white/10 bg-white/70 dark:bg-white/5">
                <SelectValue placeholder="Select occupancy status" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="REGISTERED_OWNER">Registered Lot Owner</SelectItem>
                <SelectItem value="AUTHORIZED_REPRESENTATIVE">Authorized Representative / SPA</SelectItem>
                <SelectItem value="LESSEE_TENANT">Lessee / Tenant (with Authority)</SelectItem>
                <SelectItem value="CONTRACTOR_DEVELOPER">Contractor / Project Manager</SelectItem>
              </SelectContent>
            </Select>
            {errors.applicantCapacity && (
              <p className="text-xs text-red-500 font-medium mt-1">{errors.applicantCapacity}</p>
            )}
          </div>
        </div>
      </div>

      {/* CARD 2: Cadastral & Site Location in Mapandan */}
      <div className="p-6 sm:p-7 rounded-3xl border border-slate-200 dark:border-white/10 bg-white/40 dark:bg-white/[0.02] backdrop-blur-sm space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-200/80 dark:border-white/10 pb-4">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black">
            2
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black uppercase tracking-tight">
              Property Location & Cadastral Identifiers
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Exact geographical site and land registration records in Mapandan, Pangasinan.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Barangay */}
          <div id="field-barangay" className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Barangay in Mapandan <span className="text-red-500">*</span>
            </Label>
            <Select
              value={data.barangay}
              onValueChange={(val) => updateField("barangay", val)}
            >
              <SelectTrigger className="rounded-xl h-11 border-slate-200 dark:border-white/10 bg-white/70 dark:bg-white/5">
                <SelectValue placeholder="Select Barangay" />
              </SelectTrigger>
              <SelectContent className="rounded-xl max-h-60">
                {MAPANDAN_BARANGAYS.map((bgy) => (
                  <SelectItem key={bgy} value={bgy}>
                    Brgy. {bgy}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.barangay && (
              <p className="text-xs text-red-500 font-medium mt-1">{errors.barangay}</p>
            )}
          </div>

          {/* Street / Sitio */}
          <div id="field-streetSitio" className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Street / Sitio / Purok <span className="text-red-500">*</span>
            </Label>
            <Input
              placeholder="e.g. Purok 3, Rizal St."
              value={data.streetSitio}
              onChange={(e) => updateField("streetSitio", e.target.value)}
              className="rounded-xl h-11 border-slate-200 dark:border-white/10 bg-white/70 dark:bg-white/5"
            />
            {errors.streetSitio && (
              <p className="text-xs text-red-500 font-medium mt-1">{errors.streetSitio}</p>
            )}
          </div>

          {/* Landmark */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Prominent Landmark
            </Label>
            <Input
              placeholder="e.g. Beside Barangay Chapel"
              value={data.landmark}
              onChange={(e) => updateField("landmark", e.target.value)}
              className="rounded-xl h-11 border-slate-200 dark:border-white/10 bg-white/70 dark:bg-white/5"
            />
          </div>

          {/* TCT / OCT No */}
          <div id="field-tctNumber" className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                TCT / OCT Number {!data.isUntitledDeedOfSale && <span className="text-red-500">*</span>}
              </Label>
              <label className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500 cursor-pointer">
                <input
                  type="checkbox"
                  checked={data.isUntitledDeedOfSale}
                  onChange={(e) => updateField("isUntitledDeedOfSale", e.target.checked)}
                  className="rounded border-slate-300 text-primary focus:ring-primary w-3.5 h-3.5"
                />
                Untitled / Deed of Sale
              </label>
            </div>
            <Input
              disabled={data.isUntitledDeedOfSale}
              placeholder={data.isUntitledDeedOfSale ? "Under Notarized Deed of Sale / Untitled" : "e.g. T-123456"}
              value={data.tctNumber}
              onChange={(e) => updateField("tctNumber", e.target.value)}
              className="rounded-xl h-11 border-slate-200 dark:border-white/10 bg-white/70 dark:bg-white/5 disabled:opacity-50"
            />
            {errors.tctNumber && (
              <p className="text-xs text-red-500 font-medium mt-1">{errors.tctNumber}</p>
            )}
          </div>

          {/* Tax Declaration Number */}
          <div id="field-taxDeclarationNumber" className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Tax Declaration (TD) No. <span className="text-red-500">*</span>
            </Label>
            <Input
              placeholder="e.g. 2026-004-12345"
              value={data.taxDeclarationNumber}
              onChange={(e) => updateField("taxDeclarationNumber", e.target.value)}
              className="rounded-xl h-11 border-slate-200 dark:border-white/10 bg-white/70 dark:bg-white/5"
            />
            {errors.taxDeclarationNumber && (
              <p className="text-xs text-red-500 font-medium mt-1">{errors.taxDeclarationNumber}</p>
            )}
          </div>

          {/* Zoning Classification */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Zoning Classification
            </Label>
            <Select
              value={data.zoningClassification}
              onValueChange={(val) => updateField("zoningClassification", val)}
            >
              <SelectTrigger className="rounded-xl h-11 border-slate-200 dark:border-white/10 bg-white/70 dark:bg-white/5">
                <SelectValue placeholder="Select Zone" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="RESIDENTIAL">Residential Zone</SelectItem>
                <SelectItem value="COMMERCIAL">Commercial Zone</SelectItem>
                <SelectItem value="AGRICULTURAL">Agricultural Zone</SelectItem>
                <SelectItem value="INSTITUTIONAL">Institutional / Civic</SelectItem>
                <SelectItem value="INDUSTRIAL">Industrial Zone</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Cadastral Lot / Block / Area */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Lot Number
            </Label>
            <Input
              placeholder="e.g. Lot 12-A"
              value={data.lotNumber}
              onChange={(e) => updateField("lotNumber", e.target.value)}
              className="rounded-xl h-11 border-slate-200 dark:border-white/10 bg-white/70 dark:bg-white/5"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Block Number
            </Label>
            <Input
              placeholder="e.g. Blk 4"
              value={data.blockNumber}
              onChange={(e) => updateField("blockNumber", e.target.value)}
              className="rounded-xl h-11 border-slate-200 dark:border-white/10 bg-white/70 dark:bg-white/5"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Total Parcel Area (sq.m.)
            </Label>
            <Input
              type="number"
              min="0"
              step="any"
              placeholder="e.g. 350"
              value={data.lotAreaSqM}
              onChange={(e) => updateField("lotAreaSqM", e.target.value)}
              className="rounded-xl h-11 border-slate-200 dark:border-white/10 bg-white/70 dark:bg-white/5"
            />
          </div>
        </div>
      </div>

      {/* CARD 3: Dimensions, Heights, Materials & Estimates */}
      <div className="p-6 sm:p-7 rounded-3xl border border-slate-200 dark:border-white/10 bg-white/40 dark:bg-white/[0.02] backdrop-blur-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black">
              3
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black uppercase tracking-tight">
                Dimensional Metrics & Cost Estimation
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Linear perimeter measurement, vertical elevation, and estimated project cost.
              </p>
            </div>
          </div>

          {/* Quick Real-Time Metric Badge */}
          <div className="hidden sm:flex items-center gap-3 bg-primary/10 px-4 py-2 rounded-2xl border border-primary/20">
            <div className="text-right">
              <span className="text-[10px] font-black uppercase tracking-wider text-primary block">
                Total Linear Span
              </span>
              <span className="text-base font-black text-slate-900 dark:text-white">
                {totalLinearMeters.toFixed(2)} meters
              </span>
            </div>
          </div>
        </div>

        {/* 4 Perimeter Sides Grid */}
        <div id="field-frontageLinearMeters" className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
              <Ruler className="w-3.5 h-3.5 text-primary" />
              Perimeter Segment Lengths (in meters) <span className="text-red-500">*</span>
            </Label>
            <span className="text-xs font-black text-primary sm:hidden">
              Total: {totalLinearMeters.toFixed(2)} m
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-400">Front (Road Side)</span>
              <Input
                type="number"
                min="0"
                step="any"
                placeholder="0.00"
                value={data.frontageLinearMeters}
                onChange={(e) => updateField("frontageLinearMeters", e.target.value)}
                className="rounded-xl h-11 border-slate-200 dark:border-white/10 bg-white/70 dark:bg-white/5 text-center font-bold"
              />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-400">Rear (Back)</span>
              <Input
                type="number"
                min="0"
                step="any"
                placeholder="0.00"
                value={data.rearLinearMeters}
                onChange={(e) => updateField("rearLinearMeters", e.target.value)}
                className="rounded-xl h-11 border-slate-200 dark:border-white/10 bg-white/70 dark:bg-white/5 text-center font-bold"
              />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-400">Left Boundary</span>
              <Input
                type="number"
                min="0"
                step="any"
                placeholder="0.00"
                value={data.leftLinearMeters}
                onChange={(e) => updateField("leftLinearMeters", e.target.value)}
                className="rounded-xl h-11 border-slate-200 dark:border-white/10 bg-white/70 dark:bg-white/5 text-center font-bold"
              />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-400">Right Boundary</span>
              <Input
                type="number"
                min="0"
                step="any"
                placeholder="0.00"
                value={data.rightLinearMeters}
                onChange={(e) => updateField("rightLinearMeters", e.target.value)}
                className="rounded-xl h-11 border-slate-200 dark:border-white/10 bg-white/70 dark:bg-white/5 text-center font-bold"
              />
            </div>
          </div>
          {errors.frontageLinearMeters && (
            <p className="text-xs text-red-500 font-medium flex items-center gap-1 mt-1">
              <AlertCircle className="w-3.5 h-3.5" /> {errors.frontageLinearMeters}
            </p>
          )}
        </div>

        {/* Fence Heights Breakdown */}
        <div id="field-solidBaseHeightMeters" className="space-y-2 pt-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
            Fence Height Breakdown (in meters) <span className="text-red-500">*</span>
          </Label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-400">Solid Masonry Base (CHB)</span>
              <Input
                type="number"
                min="0"
                step="any"
                placeholder="e.g. 1.20"
                value={data.solidBaseHeightMeters}
                onChange={(e) => updateField("solidBaseHeightMeters", e.target.value)}
                className="rounded-xl h-11 border-slate-200 dark:border-white/10 bg-white/70 dark:bg-white/5"
              />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-400">Upper Grilles / Wire (Semi-open)</span>
              <Input
                type="number"
                min="0"
                step="any"
                placeholder="e.g. 0.80"
                value={data.grilleHeightMeters}
                onChange={(e) => updateField("grilleHeightMeters", e.target.value)}
                className="rounded-xl h-11 border-slate-200 dark:border-white/10 bg-white/70 dark:bg-white/5"
              />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-400">Total Vertical Height</span>
              <div className="h-11 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center px-4 font-black text-sm text-slate-800 dark:text-slate-100">
                {totalHeight.toFixed(2)} m
              </div>
            </div>
          </div>

          {baseH > 1.5 && (
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2 mt-2">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                <strong>NBCP Warning:</strong> Solid masonry walls exceeding 1.50 meters along public roads may require engineering justification or semi-open grilles to ensure visibility and urban ventilation.
              </span>
            </div>
          )}
          {errors.solidBaseHeightMeters && (
            <p className="text-xs text-red-500 font-medium mt-1">{errors.solidBaseHeightMeters}</p>
          )}
        </div>

        {/* Fencing Construction Materials */}
        <div id="field-fencingMaterials" className="space-y-2 pt-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
            Construction Materials & Structural System <span className="text-red-500">*</span>
          </Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {FENCING_MATERIAL_OPTIONS.map((item) => {
              const checked = data.fencingMaterials.includes(item.id);
              return (
                <div
                  key={item.id}
                  onClick={() => toggleMaterial(item.id)}
                  className={cn(
                    "p-3 rounded-2xl border cursor-pointer transition-all flex items-center gap-3 select-none",
                    checked
                      ? "border-primary bg-primary/10 font-bold text-primary ring-1 ring-primary/30"
                      : "border-slate-200 dark:border-white/10 hover:border-slate-300 bg-white/60 dark:bg-white/[0.01] text-slate-700 dark:text-slate-300"
                  )}
                >
                  <div className={cn(
                    "w-5 h-5 rounded-md flex items-center justify-center border transition-colors",
                    checked ? "bg-primary border-primary text-white" : "border-slate-300 dark:border-white/20"
                  )}>
                    {checked && <Check className="w-3.5 h-3.5" />}
                  </div>
                  <span className="text-xs leading-snug">{item.label}</span>
                </div>
              );
            })}
          </div>
          {errors.fencingMaterials && (
            <p className="text-xs text-red-500 font-medium mt-1">{errors.fencingMaterials}</p>
          )}
        </div>

        {/* Estimated Project Costs */}
        <div id="field-materialsCost" className="space-y-2 pt-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
            Estimated Project Cost (PHP) <span className="text-red-500">*</span>
          </Label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-400">Materials Cost</span>
              <Input
                type="number"
                min="0"
                step="any"
                placeholder="₱ 0.00"
                value={data.materialsCost}
                onChange={(e) => updateField("materialsCost", e.target.value)}
                className="rounded-xl h-11 border-slate-200 dark:border-white/10 bg-white/70 dark:bg-white/5 font-semibold"
              />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-400">Labor & Equipment Cost</span>
              <Input
                type="number"
                min="0"
                step="any"
                placeholder="₱ 0.00"
                value={data.laborCost}
                onChange={(e) => updateField("laborCost", e.target.value)}
                className="rounded-xl h-11 border-slate-200 dark:border-white/10 bg-white/70 dark:bg-white/5 font-semibold"
              />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-400">Total Project Valuation</span>
              <div className="h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center px-4 font-black text-sm text-primary">
                ₱ {totalCost.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>
          {errors.materialsCost && (
            <p className="text-xs text-red-500 font-medium mt-1">{errors.materialsCost}</p>
          )}
        </div>
      </div>

      {/* CARD 4: Site Conditions, Road Right-of-Way & Easements */}
      <div className="p-6 sm:p-7 rounded-3xl border border-slate-200 dark:border-white/10 bg-white/40 dark:bg-white/[0.02] backdrop-blur-sm space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-200/80 dark:border-white/10 pb-4">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black">
            4
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black uppercase tracking-tight">
              Road Right-of-Way & Statutory Setbacks
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Clearance cross-checks for corner intersections, national roads, and drainage easements.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Adjoining Road Classification */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Adjoining Frontage Road Classification
            </Label>
            <Select
              value={data.adjoiningRoadType}
              onValueChange={(val) => updateField("adjoiningRoadType", val)}
            >
              <SelectTrigger className="rounded-xl h-11 border-slate-200 dark:border-white/10 bg-white/70 dark:bg-white/5">
                <SelectValue placeholder="Select Road Type" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="BARANGAY_ROAD">Barangay Road / Alley</SelectItem>
                <SelectItem value="MUNICIPAL_ROAD">Municipal Street</SelectItem>
                <SelectItem value="PROVINCIAL_ROAD">Provincial Road</SelectItem>
                <SelectItem value="NATIONAL_HIGHWAY">National Highway (DPWH Jurisdiction)</SelectItem>
                <SelectItem value="PRIVATE_SUBDIVISION">Private / Subdivision Road</SelectItem>
              </SelectContent>
            </Select>

            {data.adjoiningRoadType === "NATIONAL_HIGHWAY" && (
              <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-700 dark:text-blue-400 flex items-start gap-2 mt-2">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  <strong>DPWH Clearance Required:</strong> Since the parcel fronts a National Highway, a formal DPWH Road Right-of-Way clearance will be requested in the next Document Upload step.
                </span>
              </div>
            )}
          </div>

          {/* Interactive Setback Toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {/* Corner Lot */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-white/60 dark:bg-white/[0.01] flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Corner Lot Property?
                </Label>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Requires chaflan / corner cutoff for street sightlines.
                </p>
              </div>
              <Switch
                checked={data.isCornerLot}
                onCheckedChange={(val) => updateField("isCornerLot", val)}
              />
            </div>

            {/* Waterway / Creek */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-white/60 dark:bg-white/[0.01] flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Adjacent to Creek / River?
                </Label>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Subject to mandatory public waterway easement setback.
                </p>
              </div>
              <Switch
                checked={data.isAdjacentWaterway}
                onCheckedChange={(val) => updateField("isAdjacentWaterway", val)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* CARD 5: Supervising Licensed Professional */}
      <div className="p-6 sm:p-7 rounded-3xl border border-slate-200 dark:border-white/10 bg-white/40 dark:bg-white/[0.02] backdrop-blur-sm space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-200/80 dark:border-white/10 pb-4">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black">
            5
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black uppercase tracking-tight">
              Supervising Licensed Professional (Box 2)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Credentials of the registered Civil Engineer or Architect in charge of fencing plans.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Discipline */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Professional Discipline <span className="text-red-500">*</span>
            </Label>
            <Select
              value={data.professionalType}
              onValueChange={(val: "CIVIL_ENGINEER" | "ARCHITECT") => updateField("professionalType", val)}
            >
              <SelectTrigger className="rounded-xl h-11 border-slate-200 dark:border-white/10 bg-white/70 dark:bg-white/5">
                <SelectValue placeholder="Discipline" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="CIVIL_ENGINEER">Civil Engineer</SelectItem>
                <SelectItem value="ARCHITECT">Architect</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Professional Full Name */}
          <div id="field-professionalName" className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Full Legal Name of Engineer / Architect <span className="text-red-500">*</span>
            </Label>
            <Input
              placeholder="e.g. Engr. Juan S. Dela Cruz, CE"
              value={data.professionalName}
              onChange={(e) => updateField("professionalName", e.target.value)}
              className="rounded-xl h-11 border-slate-200 dark:border-white/10 bg-white/70 dark:bg-white/5 font-semibold"
            />
            {errors.professionalName && (
              <p className="text-xs text-red-500 font-medium mt-1">{errors.professionalName}</p>
            )}
          </div>

          {/* PRC License No */}
          <div id="field-prcLicenseNumber" className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              PRC Registration No. <span className="text-red-500">*</span>
            </Label>
            <Input
              placeholder="e.g. 0012345"
              value={data.prcLicenseNumber}
              onChange={(e) => updateField("prcLicenseNumber", e.target.value)}
              className="rounded-xl h-11 border-slate-200 dark:border-white/10 bg-white/70 dark:bg-white/5"
            />
            {errors.prcLicenseNumber && (
              <p className="text-xs text-red-500 font-medium mt-1">{errors.prcLicenseNumber}</p>
            )}
          </div>

          {/* PRC Validity Date */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              PRC Expiration Date
            </Label>
            <Input
              type="date"
              value={data.prcExpiryDate}
              onChange={(e) => updateField("prcExpiryDate", e.target.value)}
              className="rounded-xl h-11 border-slate-200 dark:border-white/10 bg-white/70 dark:bg-white/5"
            />
          </div>

          {/* PTR No */}
          <div id="field-ptrNumber" className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              PTR Number <span className="text-red-500">*</span>
            </Label>
            <Input
              placeholder="e.g. PTR-2026-987654"
              value={data.ptrNumber}
              onChange={(e) => updateField("ptrNumber", e.target.value)}
              className="rounded-xl h-11 border-slate-200 dark:border-white/10 bg-white/70 dark:bg-white/5"
            />
            {errors.ptrNumber && (
              <p className="text-xs text-red-500 font-medium mt-1">{errors.ptrNumber}</p>
            )}
          </div>

          {/* PTR Issue Date & Place */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              PTR Date & Place Issued
            </Label>
            <Input
              placeholder="e.g. Jan 10, 2026 / Mapandan"
              value={data.ptrIssueDatePlace}
              onChange={(e) => updateField("ptrIssueDatePlace", e.target.value)}
              className="rounded-xl h-11 border-slate-200 dark:border-white/10 bg-white/70 dark:bg-white/5"
            />
          </div>

          {/* TIN No */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Tax Identification No. (TIN)
            </Label>
            <Input
              placeholder="e.g. 123-456-789-000"
              value={data.tinNumber}
              onChange={(e) => updateField("tinNumber", e.target.value)}
              className="rounded-xl h-11 border-slate-200 dark:border-white/10 bg-white/70 dark:bg-white/5"
            />
          </div>
        </div>
      </div>

      {/* Action Footer Navigation */}
      <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200 dark:border-white/10">
        <Button
          variant="ghost"
          onClick={onBack}
          className="rounded-xl text-xs font-bold uppercase tracking-wider gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Guidelines
        </Button>
        <Button
          onClick={handleProceed}
          className="w-full sm:w-auto px-8 rounded-xl font-black text-xs uppercase tracking-wider shadow-lg shadow-primary/20 gap-2 h-11"
        >
          Proceed to Document Upload
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
