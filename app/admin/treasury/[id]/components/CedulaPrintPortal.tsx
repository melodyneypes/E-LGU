"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { CedulaLayoutSettings, DEFAULT_CEDULA_LAYOUT } from "@/lib/cedula-template-config";
import { numberToWords } from "@/lib/utils/number-to-words";

interface CedulaPrintPortalProps {
    transaction: any;
    layoutConfig?: CedulaLayoutSettings | null;
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
    onClose
}: CedulaPrintPortalProps) {
    const [mounted, setMounted] = useState(false);
    const layout = layoutConfig || DEFAULT_CEDULA_LAYOUT;

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted || !transaction) return null;

    const resident = transaction.residentSnapshot || {};
    const additional = transaction.additionalData || {};
    const cedulaRecord = transaction.cedula || {};

    const now = new Date();
    const curYear = String(now.getFullYear()).slice(-2);
    const dateFormatted = now.toLocaleDateString("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "numeric"
    });

    const ctcNumber = cedulaRecord.ctcNumber || transaction.ctcNumber || additional.ctcNumber || "";

    // Parse resident details
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

    // Tax Calculations
    const basicTaxNum = cedulaRecord.basicTax ?? (transaction.status === "PAID" ? 5.0 : 5.0);
    const additionalTaxNum = cedulaRecord.additionalTax ?? (transaction.totalAmount > basicTaxNum ? transaction.totalAmount - basicTaxNum : 0);
    const penaltyNum = cedulaRecord.penalty ?? 0;
    const totalAmountNum = transaction.totalAmount || (basicTaxNum + additionalTaxNum + penaltyNum) || 0;

    const profession = (additional.profession || additional.occupation || additional.businessName || resident.occupation || "N/A").toUpperCase();
    const incomeBasis = Number(additional.income || additional.basicSalary || additional.annualIncome || 0);

    // Map dynamic field values
    const fieldValues: Record<string, string> = {
        year: curYear,
        placeOfIssue: "MAPANDAN, PANGASINAN",
        dateIssued: dateFormatted,
        ctcNumber: ctcNumber,
        tin: resident.tin || additional.tin || "N/A",
        taxpayerName: fullName,
        address: fullAddress,
        sexMale: isMale ? "X" : "",
        sexFemale: isFemale ? "X" : "",
        citizenship: (resident.citizenship || "FILIPINO").toUpperCase(),
        icrNo: additional.icrNo || "N/A",
        placeOfBirth: (resident.placeOfBirth || additional.placeOfBirth || "MAPANDAN, PANGASINAN").toUpperCase(),
        height: resident.height ? `${resident.height} cm` : (additional.height || "--"),
        civilStatusSingle: isSingle ? "X" : "",
        civilStatusMarried: isMarried ? "X" : "",
        civilStatusWidowed: isWidowed ? "X" : "",
        civilStatusDivorced: isDivorced ? "X" : "",
        dateOfBirth: resident.dateOfBirth ? new Date(resident.dateOfBirth).toISOString().split("T")[0] : (additional.dateOfBirth || "--"),
        weight: resident.weight ? `${resident.weight} kg` : (additional.weight || "--"),
        profession: profession,
        taxableIncomeBasis: incomeBasis > 0 ? incomeBasis.toLocaleString(undefined, { minimumFractionDigits: 2 }) : "0.00",
        basicTax: basicTaxNum.toFixed(2),
        additionalTax1Basis: additional.applicantType === "JURIDICAL" ? incomeBasis.toLocaleString(undefined, { minimumFractionDigits: 2 }) : "0.00",
        additionalTax1Amount: additional.applicantType === "JURIDICAL" ? additionalTaxNum.toFixed(2) : "0.00",
        additionalTax2Basis: additional.applicantType !== "JURIDICAL" ? incomeBasis.toLocaleString(undefined, { minimumFractionDigits: 2 }) : "0.00",
        additionalTax2Amount: additional.applicantType !== "JURIDICAL" ? additionalTaxNum.toFixed(2) : "0.00",
        additionalTax3Basis: "0.00",
        additionalTax3Amount: "0.00",
        totalCommunityTax: (basicTaxNum + additionalTaxNum).toFixed(2),
        penalty: penaltyNum.toFixed(2),
        totalAmountPaid: totalAmountNum.toFixed(2),
        totalAmountInWords: numberToWords(totalAmountNum),
        municipalTreasurer: "MUNICIPAL TREASURER"
    };

    const bgImageStyle = layout.showBgInPrint
        ? `background-image: url('${layout.bgImageUrl || "/images/cedula-template.png"}'); background-size: 100% 100%; background-repeat: no-repeat;`
        : "background: white;";

    return createPortal(
        <>
            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    @page { 
                        size: ${layout.widthMm}mm ${layout.heightMm}mm; 
                        margin: 0; 
                    }
                    body { 
                        margin: 0 !important; 
                        padding: 0 !important; 
                        background: white !important;
                    }
                    body > * { 
                        display: none !important; 
                    }
                    #cedula-print-portal {
                        display: block !important;
                        position: fixed !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: ${layout.widthMm}mm !important;
                        height: ${layout.heightMm}mm !important;
                        visibility: visible !important;
                        overflow: hidden !important;
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
                    overflow: "hidden",
                    zIndex: -1,
                    pointerEvents: "none"
                }}
            >
                <div style={{ position: "relative", width: "100%", height: "100%" }}>
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
                                    fontFamily: "'Courier New', Courier, monospace, sans-serif",
                                    lineHeight: 1.1,
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
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
