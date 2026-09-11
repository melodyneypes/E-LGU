"use client";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface POExportOptions {
    signatoryMHO?: string;
    signatorySupplyOfficer?: string;
    signatoryAccountant?: string;
    modeOfProcurement?: string;
    placeOfDelivery?: string;
    deliveryTerm?: string;
    paymentTerm?: string;
    vendorAddress?: string;
    vendorTIN?: string;
    logoUrl?: string;
}

/**
 * Loads the official Mapandan municipality logo for PDF header embedding.
 */
async function loadLogoImage(logoUrl?: string): Promise<string | null> {
    if (typeof window === "undefined") return null;

    const urlsToTry: string[] = [
        logoUrl,
        "/images/mapandan-logo.png",
        "https://ntanbjizlavyokjdauag.supabase.co/storage/v1/object/public/system-assets/logos/logo-1787803174016.png"
    ].filter(Boolean) as string[];

    for (const url of urlsToTry) {
        if (url.startsWith("data:image/")) return url;

        try {
            const res = await fetch(url);
            if (res.ok) {
                const blob = await res.blob();
                const dataUrl = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });
                if (dataUrl) return dataUrl;
            }
        } catch {}

        try {
            const dataUrl = await new Promise<string | null>((resolve) => {
                const img = new Image();
                img.crossOrigin = "anonymous";
                img.onload = () => {
                    try {
                        const canvas = document.createElement("canvas");
                        canvas.width = img.naturalWidth || img.width;
                        canvas.height = img.naturalHeight || img.height;
                        const ctx = canvas.getContext("2d");
                        if (ctx) {
                            ctx.drawImage(img, 0, 0);
                            resolve(canvas.toDataURL("image/png"));
                            return;
                        }
                    } catch {}
                    resolve(null);
                };
                img.onerror = () => resolve(null);
                img.src = url;
            });
            if (dataUrl) return dataUrl;
        } catch {}
    }
    return null;
}

/**
 * Converts a numeric amount to formal capitalized words in Philippine Pesos.
 * Example: 15129.50 -> "FIFTEEN THOUSAND ONE HUNDRED TWENTY-NINE PESOS & 50/100 ONLY"
 */
export function numberToPesosWords(amount: number): string {
    if (isNaN(amount) || amount === 0) return "ZERO PESOS ONLY";

    const units = ["", "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE", "TEN", "ELEVEN", "TWELVE", "THIRTEEN", "FOURTEEN", "FIFTEEN", "SIXTEEN", "SEVENTEEN", "EIGHTEEN", "NINETEEN"];
    const tens = ["", "", "TWENTY", "THIRTY", "FORTY", "FIFTY", "SIXTY", "SEVENTY", "EIGHTY", "NINETY"];
    const scales = ["", "THOUSAND", "MILLION", "BILLION"];

    function convertGroup(num: number): string {
        let groupStr = "";
        const hundred = Math.floor(num / 100);
        const rem = num % 100;

        if (hundred > 0) {
            groupStr += units[hundred] + " HUNDRED";
            if (rem > 0) groupStr += " ";
        }

        if (rem > 0) {
            if (rem < 20) {
                groupStr += units[rem];
            } else {
                const ten = Math.floor(rem / 10);
                const unit = rem % 10;
                groupStr += tens[ten];
                if (unit > 0) groupStr += "-" + units[unit];
            }
        }

        return groupStr;
    }

    const whole = Math.floor(Math.abs(amount));
    const cents = Math.round((Math.abs(amount) - whole) * 100);

    const parts: string[] = [];
    let tempWhole = whole;
    let scaleIdx = 0;

    if (tempWhole === 0) {
        parts.push("ZERO");
    } else {
        while (tempWhole > 0) {
            const chunk = tempWhole % 1000;
            if (chunk > 0) {
                const chunkStr = convertGroup(chunk);
                const scaleStr = scales[scaleIdx] ? " " + scales[scaleIdx] : "";
                parts.unshift(chunkStr + scaleStr);
            }
            tempWhole = Math.floor(tempWhole / 1000);
            scaleIdx++;
        }
    }

    const pesosPart = parts.join(" ").trim() + (whole === 1 ? " PESO" : " PESOS");
    if (cents > 0) {
        return `${pesosPart} & ${cents.toString().padStart(2, "0")}/100 ONLY`;
    }
    return `${pesosPart} ONLY`;
}

/**
 * Generates and downloads an official Philippine Government / LGU Mapandan
 * Purchase Order (PO) PDF for medical equipment and clinic supplies.
 */
export async function exportPOPDF(po: any, options: POExportOptions = {}) {
    if (!po) return;

    const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
    });

    const pageWidth = doc.internal.pageSize.width; // 210mm
    const margin = 14;
    const contentWidth = pageWidth - (margin * 2); // 182mm

    // =========================================================================
    // 1. OFFICIAL LGU HEADER
    // =========================================================================
    // Official Mapandan Municipal Logo (Left)
    const logoDataUrl = await loadLogoImage(options.logoUrl);
    if (logoDataUrl) {
        try {
            doc.addImage(logoDataUrl, "PNG", margin + 1, 10, 20, 20);
        } catch (e) {
            console.warn("[POReportExporter] Failed to embed official logo:", e);
        }
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(50, 50, 50);
    doc.text("REPUBLIC OF THE PHILIPPINES", pageWidth / 2, 12, { align: "center" });

    doc.setFontSize(8.5);
    doc.text("PROVINCE OF PANGASINAN", pageWidth / 2, 16.5, { align: "center" });

    doc.setFontSize(10);
    doc.setTextColor(20, 25, 40);
    doc.text("MUNICIPALITY OF MAPANDAN", pageWidth / 2, 21.5, { align: "center" });

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    doc.text("MUNICIPAL HEALTH OFFICE / RURAL HEALTH UNIT (RHU)", pageWidth / 2, 26, { align: "center" });
    doc.text("Email: rhu@mapandan.gov.ph • Telefax: (075) 568-2026", pageWidth / 2, 29.5, { align: "center" });

    // Decorative rule
    doc.setDrawColor(20, 55, 120);
    doc.setLineWidth(0.6);
    doc.line(margin, 32, pageWidth - margin, 32);
    doc.setLineWidth(0.2);
    doc.line(margin, 33, pageWidth - margin, 33);

    // =========================================================================
    // 2. DOCUMENT TITLE
    // =========================================================================
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(15, 30, 80);
    doc.text("PURCHASE ORDER", pageWidth / 2, 39, { align: "center" });

    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text("STANDARD LGU PROCUREMENT FORM (EQUIPMENT & SUPPLIES)", pageWidth / 2, 43, { align: "center" });

    // =========================================================================
    // 3. PROCUREMENT & VENDOR METADATA BOX
    // =========================================================================
    const boxY = 46;
    const boxHeight = 27;
    const colSplit = margin + (contentWidth * 0.58);

    doc.setDrawColor(180, 185, 195);
    doc.setLineWidth(0.25);
    doc.rect(margin, boxY, contentWidth, boxHeight);
    doc.line(colSplit, boxY, colSplit, boxY + boxHeight);

    // Left Column: Supplier Details
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(40, 40, 40);

    const poDate = po.createdAt ? new Date(po.createdAt).toLocaleDateString("en-PH", {
        month: "long",
        day: "numeric",
        year: "numeric"
    }) : new Date().toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" });

    doc.text("Supplier / Vendor:", margin + 2.5, boxY + 5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 30, 80);
    doc.text(String(po.vendorName || "N/A").toUpperCase(), margin + 28, boxY + 5);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);
    doc.text("Contact / Phone:", margin + 2.5, boxY + 10);
    doc.text(String(po.vendorContact || options.vendorAddress || "N/A"), margin + 28, boxY + 10);

    doc.text("TIN:", margin + 2.5, boxY + 15);
    doc.text(String(options.vendorTIN || "N/A"), margin + 28, boxY + 15);

    doc.text("Gentlemen: Please furnish this Office the following articles subject to the terms and conditions herein:", margin + 2.5, boxY + 22, { maxWidth: (colSplit - margin) - 4 });

    // Right Column: Order Details
    doc.setFont("helvetica", "bold");
    doc.setTextColor(40, 40, 40);
    doc.text("P.O. No.:", colSplit + 3, boxY + 5);
    doc.setTextColor(180, 20, 20);
    doc.text(String(po.poNumber || "PO-RHU-DRAFT"), colSplit + 28, boxY + 5);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);
    doc.text("Date:", colSplit + 3, boxY + 10);
    doc.text(poDate, colSplit + 28, boxY + 10);

    doc.text("Mode of Proc.:", colSplit + 3, boxY + 15);
    doc.text(options.modeOfProcurement || "-", colSplit + 28, boxY + 15);

    doc.text("PR / RO Ref.:", colSplit + 3, boxY + 20);
    doc.text(po.linkedRoNumber ? String(po.linkedRoNumber) : "-", colSplit + 28, boxY + 20);

    // Delivery and Payment Terms Sub-box
    const termsY = boxY + boxHeight;
    const termsHeight = 11;
    doc.rect(margin, termsY, contentWidth, termsHeight);
    doc.line(colSplit, termsY, colSplit, termsY + termsHeight);

    doc.setFont("helvetica", "normal");
    doc.text("Place of Delivery:", margin + 2.5, termsY + 4.5);
    doc.setFont("helvetica", "bold");
    doc.text(options.placeOfDelivery || "-", margin + 28, termsY + 4.5);

    doc.setFont("helvetica", "normal");
    doc.text("Delivery Term:", margin + 2.5, termsY + 8.5);
    doc.text(options.deliveryTerm || "-", margin + 28, termsY + 8.5);

    doc.text("Payment Term:", colSplit + 3, termsY + 6.5);
    doc.setFont("helvetica", "bold");
    doc.text(options.paymentTerm || "-", colSplit + 28, termsY + 6.5);

    // =========================================================================
    // 4. ITEMIZATION TABLE (autoTable)
    // =========================================================================
    const tableStartY = termsY + termsHeight + 2;

    const items = po.items && Array.isArray(po.items) && po.items.length > 0
        ? po.items
        : [{ equipmentName: "Medical Equipment Item", brand: "-", quantity: 1, unitCost: po.totalAmount || 0, totalCost: po.totalAmount || 0 }];

    let computedTotal = 0;
    const rows = items.map((item: any, idx: number) => {
        const qty = Number(item.quantity) || 1;
        const cost = Number(item.unitCost) || 0;
        const total = qty * cost;
        computedTotal += total;

        const brandDesc = item.brand ? `\nModel / Brand: ${item.brand}` : "";
        const desc = `${item.equipmentName || "Medical Equipment"}${brandDesc}`;

        return [
            idx + 1,
            "unit/s",
            desc,
            qty.toLocaleString(),
            `PHP ${cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            `PHP ${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        ];
    });

    const finalAmount = po.totalAmount && Number(po.totalAmount) > 0 ? Number(po.totalAmount) : computedTotal;

    // Blank filler rows if fewer than 3 items for aesthetic standard format
    if (rows.length < 3) {
        for (let i = rows.length; i < 3; i++) {
            rows.push(["", "", "", "", "", ""]);
        }
    }

    // Summary Total Row
    rows.push([
        "",
        "",
        "*** TOTAL PURCHASE ORDER AMOUNT ***",
        "",
        "TOTAL (PHP):",
        `PHP ${finalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    ]);

    autoTable(doc, {
        head: [[
            "ITEM NO.",
            "UNIT",
            "ITEM DESCRIPTION & TECHNICAL SPECIFICATIONS",
            "QTY",
            "UNIT COST (PHP)",
            "AMOUNT (PHP)"
        ]],
        body: rows,
        startY: tableStartY,
        theme: "grid",
        styles: {
            fontSize: 7.5,
            cellPadding: 2,
            valign: "middle",
            lineColor: [180, 185, 195],
            lineWidth: 0.2
        },
        headStyles: {
            fillColor: [20, 45, 95],
            textColor: 255,
            fontStyle: "bold",
            halign: "center",
            fontSize: 7.5
        },
        columnStyles: {
            0: { cellWidth: 16, halign: "center" },
            1: { cellWidth: 18, halign: "center" },
            2: { cellWidth: 84 },
            3: { cellWidth: 16, halign: "center", fontStyle: "bold" },
            4: { cellWidth: 24, halign: "right" },
            5: { cellWidth: 24, halign: "right", fontStyle: "bold" }
        },
        didParseCell: (data) => {
            if (data.row.index === rows.length - 1) {
                data.cell.styles.fontStyle = "bold";
                data.cell.styles.fillColor = [240, 244, 255];
                if (data.column.index === 2) {
                    data.cell.styles.halign = "right";
                }
            }
        }
    });

    // =========================================================================
    // 5. TOTAL IN WORDS
    // =========================================================================
    const afterTableY = (doc as any).lastAutoTable.finalY + 4;
    const pageHeight = doc.internal.pageSize.height;

    // Check if new page is needed for signatories
    if (afterTableY + 58 > pageHeight) {
        doc.addPage();
    }

    const currentY = afterTableY + 58 > pageHeight ? 20 : afterTableY;

    // Amount in Words
    doc.setDrawColor(180, 185, 195);
    doc.setLineWidth(0.25);
    doc.rect(margin, currentY, contentWidth, 7.5);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(20, 20, 20);
    const wordsText = numberToPesosWords(finalAmount);
    doc.text(`(Amount in Words)   ${wordsText}`, margin + 3, currentY + 5, { maxWidth: contentWidth - 6 });

    // =========================================================================
    // 6. OFFICIAL FOUR-PART SIGNATORY SECTION
    // =========================================================================
    const signY = currentY + 11;
    const signHeight = 44;
    doc.rect(margin, signY, contentWidth, signHeight);
    doc.line(colSplit, signY, colSplit, signY + signHeight);
    doc.line(margin, signY + 22, pageWidth - margin, signY + 22);

    // Quadrant 1: Conforme (Supplier)
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(40, 40, 40);
    doc.text("Conforme:", margin + 3, signY + 4);

    doc.setFont("helvetica", "bold");
    doc.text("________________________________________________", margin + 3, signY + 14);
    doc.setFont("helvetica", "normal");
    doc.text("Signature over Printed Name of Supplier / Authorized Rep.", margin + 3, signY + 17.5);
    doc.text("Date: ________________________", margin + 3, signY + 20.5);

    // Quadrant 2: Very Truly Yours (MHO Head of Procuring Entity)
    doc.text("Very truly yours,", colSplit + 3, signY + 4);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 30, 80);
    doc.text(options.signatoryMHO || "________________________________________________", colSplit + 3, signY + 14);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(40, 40, 40);
    doc.text("Municipal Health Officer / Head of Requisitioning Agency", colSplit + 3, signY + 17.5);
    doc.text("Date: ________________________", colSplit + 3, signY + 20.5);

    // Quadrant 3: Requisitioning Office / Inspection
    doc.text("Requisitioning Office & Central Supply Inspection:", margin + 3, signY + 26);
    doc.setFont("helvetica", "bold");
    doc.text(options.signatorySupplyOfficer || po.createdByName || "________________________________________________", margin + 3, signY + 36);
    doc.setFont("helvetica", "normal");
    doc.text("RHU Supply Officer / General Services Officer", margin + 3, signY + 39.5);
    doc.text("Date: ________________________", margin + 3, signY + 42.5);

    // Quadrant 4: Funds Available (Accounting / Treasury)
    doc.text("Funds Available / Obligation Request:", colSplit + 3, signY + 26);
    doc.text(`ALOBS / OBR No.: __________________________`, colSplit + 3, signY + 31);
    doc.setFont("helvetica", "bold");
    doc.text(options.signatoryAccountant || "________________________________________________", colSplit + 3, signY + 38);
    doc.setFont("helvetica", "normal");
    doc.text("Local Government Unit of Mapandan, Pangasinan", colSplit + 3, signY + 41.5);

    // =========================================================================
    // 7. FOOTER
    // =========================================================================
    doc.setFontSize(6.5);
    doc.setTextColor(120, 120, 120);
    doc.text(`Generated via EMapandan RHU Asset Monitoring Engine • ${po.poNumber} • Page 1 of 1`, pageWidth / 2, pageHeight - 6, { align: "center" });

    // Save PDF
    const cleanNumber = (po.poNumber || "PO").replace(/[^a-zA-Z0-9_-]/g, "_");
    doc.save(`${cleanNumber}_Official_Purchase_Order.pdf`);
}
