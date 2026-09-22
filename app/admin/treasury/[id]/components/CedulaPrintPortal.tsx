"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { CedulaLayoutSettings, DEFAULT_CEDULA_LAYOUT } from "@/lib/cedula-template-config";
import { numberToWords } from "@/lib/utils/number-to-words";

interface CedulaPrintPortalProps {
    transaction: any;
    layoutConfig?: CedulaLayoutSettings | null;
    includeBg?: boolean;
    onClose?: () => void;
}

/**
 * CedulaPrintPortal
 * Direct React Portal under <body> ensuring 100% clean, bulletproof CSS print styling,
 * honoring the exact layout coordinates configured in the Cedula Template Studio.
 */
export default function CedulaPrintPortal({
    transaction,
    layoutConfig = DEFAULT_CEDULA_LAYOUT,
    includeBg = false,
    onClose: _onClose
}: CedulaPrintPortalProps) {
    const [mounted, setMounted] = useState(false);
    const layout = layoutConfig || DEFAULT_CEDULA_LAYOUT;

    useEffect(() => {
        setMounted(true);
    }, []);

    const parseSafe = (val: any) => {
        if (!val) return {};
        if (typeof val === "object") return val;
        try {
            return JSON.parse(val);
        } catch {
            return {};
        }
    };

    if (!mounted || !transaction) return null;

    const resident = parseSafe(transaction.residentSnapshot) || transaction.user?.residentProfile || {};
    const additional = parseSafe(transaction.additionalData) || {};
    const cedulaRecord = transaction.cedula || {};

    const now = new Date();
    const curYear = String(now.getFullYear()).slice(-2);
    const dateFormatted = now.toLocaleDateString("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "numeric"
    });

    const _ctcNumber = cedulaRecord.ctcNumber || transaction.ctcNumber || additional.ctcNumber || "";

    // Parse resident details
    const lastName = (
        resident.lastName || additional.lastName || (resident.fullName ? resident.fullName.split(",")[0] : "") || ""
    ).trim().toUpperCase();

    const firstName = (
        resident.firstName || additional.firstName || (resident.fullName ? resident.fullName.split(",")[1]?.trim().split(" ")[0] : "") || ""
    ).trim().toUpperCase();

    const middleName = (
        resident.middleName || additional.middleName || (resident.fullName ? resident.fullName.split(",")[1]?.trim().split(" ").slice(1).join(" ") : "") || ""
    ).trim().toUpperCase();

    // Format TIN digits for individual boxes (e.g. 1 2 3  4 5 6  7 8 9  0 0 0)
    const rawTin = String(resident.tin || additional.tin || "").replace(/[^0-9]/g, "");
    let formattedTin = "";
    if (rawTin.length > 0) {
        // Group into sets of 3 with extra space between groups
        const chunks = rawTin.match(/.{1,3}/g) || [];
        formattedTin = chunks.map(c => c.split("").join(" ")).join("  ");
    } else {
        formattedTin = "";
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

    const isJuridical = additional.applicantType === "JURIDICAL" || transaction.type?.code?.includes("JURIDICAL");

    // Map dynamic field values
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
        additionalTax1Basis: isJuridical && incomeBasis > 0 ? incomeBasis.toLocaleString(undefined, { minimumFractionDigits: 2 }) : "0.00",
        additionalTax1Amount: isJuridical && additionalTaxNum > 0 ? additionalTaxNum.toFixed(2) : "0.00",
        additionalTax2Basis: !isJuridical && incomeBasis > 0 ? incomeBasis.toLocaleString(undefined, { minimumFractionDigits: 2 }) : "0.00",
        additionalTax2Amount: !isJuridical && additionalTaxNum > 0 ? additionalTaxNum.toFixed(2) : "0.00",
        additionalTax3Basis: "0.00",
        additionalTax3Amount: "0.00",
        totalCommunityTax: totalCommunityTaxNum.toFixed(2),
        penalty: penaltyNum.toFixed(2),
        totalAmountPaid: totalAmountNum.toFixed(2),
        totalAmountInWords: numberToWords(totalAmountNum),
        municipalTreasurer: "MUNICIPAL TREASURER"
    };

    const shouldShowBg = includeBg ?? layout.showBgInPrint ?? false;
    const bgImageStyle = shouldShowBg
        ? `background-image: url('${layout.bgImageUrl || "/images/cedula-template.png"}'); background-size: 100% 100%; background-repeat: no-repeat;`
        : "background: white;";

    return createPortal(
        <>
            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    @page { 
                        size: ${Math.max((layout.widthMm || 152) + (layout.leftSpaceMm || 0), 210)}mm ${(layout.heightMm || 101) + (layout.topSpaceMm || 0)}mm; 
                        margin: 0mm !important; 
                    }
                    @page :left {
                        margin: 0mm !important;
                    }
                    @page :right {
                        margin: 0mm !important;
                    }
                    html, body { 
                        margin: 0mm !important; 
                        padding: 0mm !important; 
                        background: white !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    body > * { 
                        display: none !important; 
                    }
                    #cedula-print-portal {
                        display: block !important;
                        position: fixed !important;
                        left: ${layout.leftSpaceMm || 0}mm !important;
                        top: ${layout.topSpaceMm || 0}mm !important;
                        width: ${layout.widthMm}mm !important;
                        height: ${layout.heightMm}mm !important;
                        visibility: visible !important;
                        overflow: visible !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        ${bgImageStyle}
                        z-index: 999999 !important;
                        color: black !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    #cedula-print-portal * {
                        visibility: visible !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                }
            `}} />

            <div
                id="cedula-print-portal"
                style={{
                    position: "fixed",
                    left: "-9999px",
                    top: 0,
                    width: `${layout.widthMm}mm`,
                    height: `${layout.heightMm}mm`,
                    visibility: "hidden",
                    overflow: "visible",
                    zIndex: -1,
                    pointerEvents: "none"
                }}
            >
                <div style={{ position: "relative", width: "100%", height: "100%", overflow: "visible" }}>
                    {Object.values(layout.fields).map(field => {
                        if (!field.visible) return null;
                        const text = fieldValues[field.id] ?? field.sampleValue ?? "";

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
                                    fontFamily: "'Courier New', Courier, monospace, sans-serif",
                                    lineHeight: 1.1,
                                    whiteSpace: "nowrap",
                                    overflow: "visible",
                                    color: "black"
                                }}
                            >
                                {text}
                            </div>
                        );
                    })}
                </div>
            </div>
        </>,
        document.body
    );
}
