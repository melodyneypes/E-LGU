"use client";

import React, { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Printer, Eye, Sparkles } from "lucide-react";
import { CedulaLayoutSettings, DEFAULT_CEDULA_LAYOUT } from "@/lib/cedula-template-config";
import { numberToWords, formatCedulaWordsTwoLines } from "@/lib/utils/number-to-words";
import { cn } from "@/lib/utils";

interface CedulaPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    transaction: any;
    layoutConfig?: CedulaLayoutSettings | null;
    onPrint: (includeBg: boolean) => void;
}

export default function CedulaPreviewModal({
    isOpen,
    onClose,
    transaction,
    layoutConfig = DEFAULT_CEDULA_LAYOUT,
    onPrint
}: CedulaPreviewModalProps) {
    const [includeBgInPrint, setIncludeBgInPrint] = useState(false);
    const layout = layoutConfig || DEFAULT_CEDULA_LAYOUT;

    if (!isOpen || !transaction) return null;

    const parseSafe = (val: any) => {
        if (!val) return {};
        if (typeof val === "object") return val;
        try {
            return JSON.parse(val);
        } catch {
            return {};
        }
    };

    const snap = parseSafe(transaction.residentSnapshot);
    const userProfile = transaction.user?.residentProfile || {};
    // Merge live user profile as baseline so fields like tin, height, weight aren't lost if snapshot omitted them
    const resident = { ...userProfile, ...snap };
    const additional = parseSafe(transaction.additionalData) || {};
    const cedulaRecord = transaction.cedula || {};

    const now = new Date();
    const curYear = String(now.getFullYear()).slice(-2);
    const dateFormatted = now.toLocaleDateString("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "numeric"
    });

    const lastName = (
        resident.lastName || additional.lastName || (resident.fullName ? resident.fullName.split(",")[0] : "") || ""
    ).trim().toUpperCase();

    const firstName = (
        resident.firstName || additional.firstName || (resident.fullName ? resident.fullName.split(",")[1]?.trim().split(" ")[0] : "") || ""
    ).trim().toUpperCase();

    const middleName = (
        resident.middleName || additional.middleName || (resident.fullName ? resident.fullName.split(",")[1]?.trim().split(" ").slice(1).join(" ") : "") || ""
    ).trim().toUpperCase();

    const rawTin = String(resident.tin || additional.tin || "").replace(/[^0-9]/g, "");
    let formattedTin = "";
    if (rawTin.length > 0) {
        // Group into sets of 3 matching Template Studio sample format (e.g. "123 456 789")
        const chunks = rawTin.match(/.{1,3}/g) || [];
        formattedTin = chunks.join(" ");
    }

    const fullName = (
        resident.lastName && resident.firstName
            ? `${resident.lastName}, ${resident.firstName} ${resident.middleName || ""}`
            : resident.fullName || transaction.user?.name || "WALK-IN CITIZEN"
    ).toUpperCase();

    const fullAddress = (
        resident.street || resident.barangay
            ? `${resident.houseNumber ? resident.houseNumber + " " : ""}${resident.street ? resident.street + ", " : ""}${resident.barangay ? "BRGY. " + resident.barangay + ", " : ""}${resident.municipality || "MAPANDAN"}, ${resident.province || "PANGASINAN"}`
            : additional.address || "MAPANDAN, PANGASINAN"
    ).toUpperCase();

    const gender = (resident.gender || resident.sex || "").toUpperCase();
    const isMale = gender === "MALE" || gender === "M";
    const isFemale = gender === "FEMALE" || gender === "F";

    const civStatus = (resident.civilStatus || additional.civilStatus || "").toUpperCase();
    const isSingle = civStatus.includes("SINGLE");
    const isMarried = civStatus.includes("MARRIED");
    const isWidowed = civStatus.includes("WIDOW");
    const isDivorced = civStatus.includes("DIVORCE") || civStatus.includes("SEPARATE");

    const calcTax = additional.calculatedTax || {};
    const _fiscal = (transaction.fiscalSnapshot as any) || {};

    // Basic Tax
    const basicTaxNum = Number(calcTax.basicTax ?? cedulaRecord.basicTax ?? 5.0);

    // Additional Tax (Gross income / profession tax)
    const additionalTaxNum = Number(calcTax.additionalTax ?? cedulaRecord.additionalTax ?? 0);

    // Interest / Penalty
    const penaltyNum = Number(calcTax.penalty ?? cedulaRecord.penalty ?? 0);

    // Total Amount
    const totalAmountNum = Number(calcTax.totalAmount ?? transaction.totalAmount ?? (basicTaxNum + additionalTaxNum + penaltyNum));

    // Income basis
    const incomeBasis = Number(additional.income || additional.basicSalary || additional.annualIncome || 0);

    // Total Community Tax (Principal = Basic + Additional)
    const totalCommunityTaxNum = basicTaxNum + additionalTaxNum;

    // Profession / Occupation / Business: Read from transaction column first, then additionalData, then resident table
    const profession = (
        transaction.businessName ||
        transaction.profession ||
        transaction.occupation ||
        additional.profession ||
        additional.occupation ||
        additional.businessName ||
        additional.incomeSource ||
        resident.occupation ||
        resident.profession ||
        "N/A"
    ).toUpperCase();

    const ctcNumberDisplay = cedulaRecord.ctcNumber || transaction.ctcNumber || additional.ctcNumber || "NOT ASSIGNED";

    const _isJuridical = additional.applicantType === "JURIDICAL" || transaction.type?.code?.includes("JURIDICAL") || transaction.type?.code === "CEDULA_JUR";

    const formattedIncomeBasis = incomeBasis > 0 
        ? incomeBasis.toLocaleString(undefined, { minimumFractionDigits: 2 }) 
        : "0.00";
    const formattedAdditionalTax = additionalTaxNum > 0 
        ? additionalTaxNum.toFixed(2) 
        : "0.00";

    // Dynamic field values mapping
    const fieldValues: Record<string, string> = {
        year: curYear,
        placeOfIssue: "MAPANDAN, PANGASINAN",
        dateIssued: dateFormatted,
        tin: formattedTin || resident.tin || additional.tin || "",
        lastName: lastName,
        firstName: firstName,
        middleName: middleName,
        taxpayerName: fullName,
        address: fullAddress,
        sexMale: isMale ? "✓" : "",
        sexFemale: isFemale ? "✓" : "",
        civilStatusSingle: isSingle ? "✓" : "",
        civilStatusMarried: isMarried ? "✓" : "",
        civilStatusWidowed: isWidowed ? "✓" : "",
        civilStatusDivorced: isDivorced ? "✓" : "",
        citizenship: (resident.citizenship || "FILIPINO").toUpperCase(),
        icrNo: additional.icrNo || "N/A",
        placeOfBirth: (resident.placeOfBirth || additional.placeOfBirth || "MAPANDAN, PANGASINAN").toUpperCase(),
        height: resident.height ? `${resident.height} cm` : (additional.height || "--"),
        dateOfBirth: resident.dateOfBirth ? new Date(resident.dateOfBirth).toISOString().split("T")[0] : (additional.dateOfBirth || "--"),
        weight: resident.weight ? `${resident.weight} kg` : (additional.weight || "--"),
        profession: profession,
        basicTax: basicTaxNum.toFixed(2),
        // Both Juridical and Individual share B2 (Salaries / Profession Basis) so template coordinates don't need changes
        additionalTax1Basis: "0.00",
        additionalTax1Amount: "0.00",
        additionalTax2Basis: formattedIncomeBasis,
        additionalTax2Amount: formattedAdditionalTax,
        additionalTax3Basis: "0.00",
        additionalTax3Amount: "0.00",
        totalCommunityTax: totalCommunityTaxNum.toFixed(2),
        penalty: penaltyNum.toFixed(2),
        totalAmountPaid: totalAmountNum.toFixed(2),
        totalAmountInWords: formatCedulaWordsTwoLines(numberToWords(totalAmountNum), 5),
        municipalTreasurer: "MUNICIPAL TREASURER"
    };

    const handleExecutePrint = () => {
        onPrint(includeBgInPrint);
    };

    return (
        <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
            <DialogContent className="max-w-[95vw] lg:max-w-7xl w-full max-h-[95vh] overflow-y-auto p-0 rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0f172a] shadow-2xl">
                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-100 dark:border-white/5 flex flex-wrap items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-900/50">
                    <div>
                        <div className="flex items-center gap-2">
                            <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] font-black uppercase tracking-wider">
                                Treasury Printing Engine
                            </Badge>
                            <span className="text-xs text-slate-400 font-mono">
                                CTC: <span className="font-bold text-slate-700 dark:text-slate-300">{ctcNumberDisplay}</span>
                            </span>
                        </div>
                        <DialogTitle className="text-lg font-black uppercase italic tracking-tight text-slate-800 dark:text-white mt-1 flex items-center gap-2">
                            <Printer className="w-5 h-5 text-primary" />
                            Cedula Pre-Print Credential Verification
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-500">
                            Verify resident credentials against the digital certificate preview before feeding the official stub into the printer.
                        </DialogDescription>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Background toggle */}
                        <div className="flex items-center gap-2 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm">
                            <Eye className="w-4 h-4 text-slate-400" />
                            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                                Include Form Background in Print?
                            </span>
                            <button
                                type="button"
                                role="switch"
                                aria-checked={includeBgInPrint}
                                onClick={() => setIncludeBgInPrint(prev => !prev)}
                                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${includeBgInPrint ? "bg-primary" : "bg-slate-300 dark:bg-slate-600"}`}
                            >
                                <span
                                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${includeBgInPrint ? "translate-x-4" : "translate-x-0"}`}
                                />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Main Preview Canvas Area */}
                <div className="p-6">
                    <div className="w-full bg-slate-900/90 rounded-2xl p-4 overflow-x-auto flex justify-center items-center shadow-inner border border-slate-800">
                        {/* 1:1 Scaled Canvas Container matching Template Studio exact geometry */}
                        <div
                            style={{
                                width: `${(layout.widthMm || 152) * 4.4}px`,
                                height: `${(layout.heightMm || 101) * 4.4}px`,
                                maxWidth: "100%",
                                aspectRatio: `${layout.widthMm || 152} / ${layout.heightMm || 101}`,
                                position: "relative",
                                boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
                                borderRadius: "4px",
                                overflow: "hidden",
                                backgroundColor: "white"
                            }}
                        >
                            {/* Background Cedula Guide Image - exactly identical to Template Studio */}
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={layout.bgImageUrl || "/images/cedula-template.png"}
                                alt="Cedula Reference Form"
                                className="absolute inset-0 w-full h-full object-fill pointer-events-none z-0"
                            />

                            {Object.values(layout.fields).map(field => {
                                if (!field.visible) return null;
                                const text = fieldValues[field.id] ?? field.sampleValue ?? "";
                                const isWords = field.id === "totalAmountInWords";

                                return (
                                    <div
                                        key={field.id}
                                        style={{
                                            position: "absolute",
                                            left: `${field.x}%`,
                                            top: `${field.y}%`,
                                            width: `${field.width}%`,
                                            fontSize: `${field.fontSize}pt`,
                                            fontWeight: field.fontWeight === "bold" ? "700" : "400",
                                            textAlign: field.textAlign || "left",
                                            letterSpacing: field.letterSpacing ? `${field.letterSpacing}px` : undefined,
                                            lineHeight: isWords ? 1.15 : 1.1,
                                            whiteSpace: isWords ? "pre-line" : "nowrap",
                                            wordBreak: isWords ? "break-word" : "normal",
                                            color: "#000000"
                                        }}
                                        className={cn(
                                            "px-1 py-0.5 rounded font-mono select-none pointer-events-none z-10",
                                            !isWords && "truncate leading-tight"
                                        )}
                                    >
                                        {text}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <DialogFooter className="px-6 py-4 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-slate-900/50 flex flex-wrap items-center justify-between gap-3 sm:justify-between">
                    <div className="flex items-center gap-2 text-slate-400 text-xs italic">
                        <Sparkles className="w-4 h-4 text-primary" />
                        <span>Printer paper size: <strong className="font-mono text-slate-600 dark:text-slate-300">Cedula Portrait (101x152)</strong></span>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            onClick={onClose}
                            className="rounded-xl h-11 px-5 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-800 dark:hover:text-white"
                        >
                            Close
                        </Button>
                        <Button
                            onClick={handleExecutePrint}
                            className="rounded-xl h-11 px-6 bg-primary hover:bg-primary/90 text-white font-black italic uppercase tracking-wider text-xs shadow-lg shadow-primary/20 flex items-center gap-2"
                        >
                            <Printer className="w-4 h-4" />
                            Print Cedula Now
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
