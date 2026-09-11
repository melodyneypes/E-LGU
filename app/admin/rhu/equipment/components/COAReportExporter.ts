"use client";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export interface COAExportOptions {
    facility?: string;
    room?: string;
    category?: string;
    reportType?: "RPCPPE" | "RPCSP" | "IIRUP" | "ALL";
    signatorySupplyOfficer?: string;
    signatoryMHO?: string;
    signatoryAuditor?: string;
    logoUrl?: string;
}

/**
 * Loads the official Mapandan municipality logo for PDF header embedding.
 * Prioritizes custom siteLogo from settings, local static asset, or Supabase public storage.
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

        // Try direct fetch first for reliable base64 conversion
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
        } catch {
            // Fetch failed, try Image canvas fallback
        }

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
                    } catch {
                        resolve(null);
                    }
                    resolve(null);
                };
                img.onerror = () => resolve(null);
                img.src = url;
            });
            if (dataUrl) return dataUrl;
        } catch {
            // Next URL candidate
        }
    }
    return null;
}

/**
 * Draws a formal, vector-rendered municipal emblem / government seal in jsPDF.
 */
function drawLGUSeal(doc: jsPDF, centerX: number, centerY: number, radius: number) {
    doc.saveGraphicsState();

    // Outer circle (Dark Navy)
    doc.setDrawColor(20, 45, 90);
    doc.setLineWidth(0.6);
    doc.circle(centerX, centerY, radius, "S");

    // Middle concentric circle (Gold/Amber)
    doc.setDrawColor(190, 140, 20);
    doc.setLineWidth(0.35);
    doc.circle(centerX, centerY, radius - 1.2, "S");

    // Inner circle (Navy)
    doc.setDrawColor(20, 45, 90);
    doc.setLineWidth(0.2);
    doc.circle(centerX, centerY, radius - 2.2, "S");

    // Center Cross / Healthcare Caduceus Emblem
    doc.setFillColor(20, 55, 120);
    doc.rect(centerX - 1.2, centerY - 3.2, 2.4, 6.4, "F");
    doc.rect(centerX - 3.2, centerY - 1.2, 6.4, 2.4, "F");

    // Decorative inner stars / dots
    doc.setFillColor(190, 140, 20);
    doc.circle(centerX - 4.2, centerY, 0.4, "F");
    doc.circle(centerX + 4.2, centerY, 0.4, "F");
    doc.circle(centerX, centerY - 4.2, 0.4, "F");
    doc.circle(centerX, centerY + 4.2, 0.4, "F");

    doc.restoreGraphicsState();
}

/**
 * Exports an official Philippine Government COA Physical Count Inventory Report in PDF format.
 * Follows Commission on Audit (COA) Government Accounting Manual (GAM) for LGUs.
 */
export async function exportCOAPDF(assets: any[], options: COAExportOptions = {}) {
    const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4"
    });

    const pageWidth = doc.internal.pageSize.width;   // 297mm
    const pageHeight = doc.internal.pageSize.height; // 210mm
    const margin = 12;
    const contentWidth = pageWidth - (margin * 2);    // 273mm

    const isPPE = options.reportType === "RPCPPE";
    const isIIRUP = options.reportType === "IIRUP";

    // Official Report Title
    const reportTitle = isPPE
        ? "REPORT ON THE PHYSICAL COUNT OF PROPERTY, PLANT AND EQUIPMENT (RPCPPE)"
        : isIIRUP
            ? "INVENTORY AND INSPECTION REPORT OF UNSERVICEABLE PROPERTY (IIRUP)"
            : "REPORT ON THE PHYSICAL COUNT OF SEMI-EXPENDABLE PROPERTY (RPCSP)";

    // Official Annex Reference Code
    const annexCode = isPPE
        ? "Appendix 73 (GAM for LGUs)"
        : isIIRUP
            ? "Appendix 74 (GAM for LGUs)"
            : "Appendix 71 (GAM for LGUs)";

    // Classification subtitle without encoding issues (avoid raw Unicode Peso sign)
    const subtitleClass = isPPE
        ? "Property, Plant & Equipment Valued Above PHP 50,000.00 (Property Acknowledgment Receipt / PAR)"
        : isIIRUP
            ? "Unserviceable Property for Inspection, Condemnation, and Disposal Authorization (COA Audit)"
            : "Semi-Expendable Property Valued at PHP 50,000.00 & Below (Inventory Custodian Slip / ICS)";

    const facilityLabel = options.facility && options.facility !== "ALL"
        ? options.facility
        : "All Rural Health Facilities & Barangay Health Stations";

    const formattedDate = new Date().toLocaleDateString("en-PH", {
        month: "long",
        day: "numeric",
        year: "numeric"
    });

    // Theme Palette based on report type
    const themeColorRGB: [number, number, number] = isPPE
        ? [20, 45, 90]      // Deep Executive Navy
        : isIIRUP
            ? [120, 25, 35]   // Formal Crimson / Burgundy
            : [15, 80, 80];   // Deep Forest Teal

    // =========================================================================
    // 1. OFFICIAL LGU HEADER
    // =========================================================================
    // Official Mapandan Municipal Logo (Left)
    const logoDataUrl = await loadLogoImage(options.logoUrl);
    if (logoDataUrl) {
        try {
            doc.addImage(logoDataUrl, "PNG", margin + 1.5, 7.5, 19, 19);
        } catch (e) {
            console.warn("[COAReportExporter] Failed to embed official logo, using vector seal fallback:", e);
            drawLGUSeal(doc, margin + 8, 15, 7.5);
        }
    } else {
        drawLGUSeal(doc, margin + 8, 15, 7.5);
    }

    // Annex Code Badge (Top Right)
    doc.setDrawColor(180, 190, 205);
    doc.setFillColor(245, 248, 255);
    doc.roundedRect(pageWidth - margin - 58, 8, 58, 6.5, 1.5, 1.5, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(50, 70, 100);
    doc.text(annexCode, pageWidth - margin - 29, 12.3, { align: "center" });

    // Center Official Heading
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(70, 70, 70);
    doc.text("REPUBLIC OF THE PHILIPPINES", pageWidth / 2, 10, { align: "center" });

    doc.setFontSize(8);
    doc.text("PROVINCE OF PANGASINAN", pageWidth / 2, 14, { align: "center" });

    doc.setFontSize(10.5);
    doc.setTextColor(20, 35, 70);
    doc.text("MUNICIPALITY OF MAPANDAN", pageWidth / 2, 18.5, { align: "center" });

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    doc.text("MUNICIPAL HEALTH OFFICE • RURAL HEALTH UNIT (RHU) & BARANGAY HEALTH STATIONS", pageWidth / 2, 22.5, { align: "center" });
    doc.text("Official Property & Supply Inventory Monitoring System • Email: rhu@mapandan.gov.ph", pageWidth / 2, 26, { align: "center" });

    // Decorative Double Rule
    doc.setDrawColor(themeColorRGB[0], themeColorRGB[1], themeColorRGB[2]);
    doc.setLineWidth(0.6);
    doc.line(margin, 28.5, pageWidth - margin, 28.5);

    doc.setDrawColor(190, 150, 30); // Accent Gold Line
    doc.setLineWidth(0.25);
    doc.line(margin, 29.5, pageWidth - margin, 29.5);

    // =========================================================================
    // 2. DOCUMENT TITLE & SUBTITLE
    // =========================================================================
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(themeColorRGB[0], themeColorRGB[1], themeColorRGB[2]);
    doc.text(reportTitle, pageWidth / 2, 35.5, { align: "center" });

    doc.setFontSize(7.5);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(100, 100, 100);
    doc.text(subtitleClass, pageWidth / 2, 39.5, { align: "center" });

    // =========================================================================
    // 3. OFFICIAL METADATA PANEL (2-Column Boxed Grid)
    // =========================================================================
    const metaBoxY = 42;
    const metaBoxHeight = 12.5;
    const colSplit = margin + (contentWidth / 2);

    doc.setDrawColor(190, 200, 215);
    doc.setFillColor(250, 252, 255);
    doc.setLineWidth(0.25);
    doc.rect(margin, metaBoxY, contentWidth, metaBoxHeight, "FD");
    doc.line(colSplit, metaBoxY, colSplit, metaBoxY + metaBoxHeight);

    // Left Column Meta
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(80, 80, 80);

    doc.text("Entity Name / LGU:", margin + 3, metaBoxY + 4.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(25, 35, 60);
    doc.text("MUNICIPALITY OF MAPANDAN, PANGASINAN", margin + 30, metaBoxY + 4.5);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    doc.text("Fund Cluster:", margin + 3, metaBoxY + 9.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(25, 35, 60);
    doc.text("01 - General Fund (Healthcare Operations)", margin + 30, metaBoxY + 9.5);

    // Right Column Meta
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    doc.text("Inventory Scope:", colSplit + 3, metaBoxY + 4.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(25, 35, 60);
    doc.text(facilityLabel, colSplit + 28, metaBoxY + 4.5, { maxWidth: (contentWidth / 2) - 30 });

    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    doc.text("As of Date:", colSplit + 3, metaBoxY + 9.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(25, 35, 60);
    doc.text(formattedDate, colSplit + 28, metaBoxY + 9.5);

    // =========================================================================
    // 4. PHYSICAL INVENTORY TABLE (autoTable)
    // =========================================================================
    const head = [[
        "PROPERTY NO.",
        "EQUIPMENT NAME & SPECIFICATION",
        "BRAND / MODEL",
        "SERIAL NO.",
        "FACILITY & ROOM LOCATION",
        "ACCOUNTABLE CUSTODIAN",
        "REF (PAR/ICS)",
        "UNIT VALUE (PHP)",
        "STATUS / CONDITION"
    ]];

    // Ensure only official verified assets are included in COA physical count reports
    const officialAssets = (assets || []).filter(a => a.currentStatus !== "PENDING_VERIFICATION");

    let totalValue = 0;
    let totalPhysicalUnits = 0;
    const rows: any[] = [];

    if (!officialAssets || officialAssets.length === 0) {
        // High-polish empty placeholder row across all columns
        rows.push([
            {
                content: `No physical property items recorded under this classification for the selected scope as of ${formattedDate}.`,
                colSpan: 9,
                styles: {
                    halign: "center",
                    fontStyle: "italic",
                    textColor: [120, 130, 145],
                    fillColor: [255, 255, 255],
                    cellPadding: 8
                }
            }
        ]);
    } else {
        officialAssets.forEach((a) => {
            const qty = a.quantity != null ? Number(a.quantity) : 1;
            const cost = Number(a.unitCost) || 0;
            const isDisposed = a.currentStatus === "CONDEMNED_DISPOSED";
            totalPhysicalUnits += qty;
            totalValue += isDisposed ? 0 : (cost * qty);

            const roomText = a.assignedRoom ? ` • ${a.assignedRoom}` : "";
            const locationText = `${a.currentFacility || "Main RHU"}${roomText}`;
            const nameWithQty = qty > 1 ? `${a.equipmentName || "Medical Equipment"} (${qty} pcs)` : (a.equipmentName || "Medical Equipment");

            rows.push([
                a.assetTagNo || "N/A",
                nameWithQty,
                a.brand || "-",
                a.serialNo || "NONE",
                locationText,
                a.accountablePerson || "Unassigned",
                a.documentReference || a.poReferenceNo || "-",
                `PHP ${cost.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                (a.currentStatus || "SERVICEABLE").replace(/_/g, " ")
            ]);
        });
    }

    // Official Summary / Grand Total Row
    rows.push([
        {
            content: "TOTAL",
            styles: { fontStyle: "bold", halign: "center", fillColor: [240, 245, 255], textColor: [15, 30, 70] }
        },
        {
            content: `TOTAL PHYSICAL COUNT: ${totalPhysicalUnits} UNITS`,
            colSpan: 3,
            styles: { fontStyle: "bold", halign: "left", fillColor: [240, 245, 255], textColor: [15, 30, 70] }
        },
        "",
        "",
        {
            content: "GRAND TOTAL:",
            styles: { fontStyle: "bold", halign: "right", fillColor: [240, 245, 255], textColor: [15, 30, 70] }
        },
        {
            content: `PHP ${totalValue.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            styles: { fontStyle: "bold", halign: "right", fillColor: [240, 245, 255], textColor: [15, 30, 70] }
        },
        {
            content: "",
            styles: { fillColor: [240, 245, 255] }
        }
    ]);

    autoTable(doc, {
        head,
        body: rows,
        startY: 56.5,
        theme: "grid",
        styles: {
            fontSize: 7.2,
            cellPadding: 2.2,
            overflow: "linebreak",
            valign: "middle",
            lineColor: [200, 210, 225],
            lineWidth: 0.2
        },
        headStyles: {
            fillColor: themeColorRGB,
            textColor: [255, 255, 255],
            fontStyle: "bold",
            halign: "center",
            minCellHeight: 8
        },
        alternateRowStyles: {
            fillColor: [252, 253, 255]
        },
        columnStyles: {
            0: { cellWidth: 30, fontStyle: "bold", textColor: [20, 35, 75] },
            1: { cellWidth: 46 },
            2: { cellWidth: 25 },
            3: { cellWidth: 24 },
            4: { cellWidth: 42 },
            5: { cellWidth: 34 },
            6: { cellWidth: 23 },
            7: { cellWidth: 27, halign: "right", fontStyle: "bold" },
            8: { cellWidth: 22, halign: "center" }
        }
    });

    // =========================================================================
    // 5. OFFICIAL THREE-PART COA SIGNATORY BLOCK
    // =========================================================================
    const finalTableY = (doc as any).lastAutoTable.finalY + 5;
    const signBoxHeight = 36;
    const bottomReserved = 16; // space for footer

    // If remaining space on the page is insufficient for the signature block, add a new page
    if (finalTableY + signBoxHeight + bottomReserved > pageHeight) {
        doc.addPage();
    }

    const signY = (finalTableY + signBoxHeight + bottomReserved > pageHeight)
        ? 18
        : Math.max(finalTableY, 150);

    const colWidth = contentWidth / 3; // 91mm per signatory column

    // Signatory Enclosure Box
    doc.setDrawColor(185, 195, 210);
    doc.setFillColor(255, 255, 255);
    doc.setLineWidth(0.25);
    doc.rect(margin, signY, contentWidth, signBoxHeight, "FD");

    // Column Vertical Dividers
    doc.line(margin + colWidth, signY, margin + colWidth, signY + signBoxHeight);
    doc.line(margin + (colWidth * 2), signY, margin + (colWidth * 2), signY + signBoxHeight);

    // Column Header Banners (Light Accent Tint)
    doc.setFillColor(245, 248, 255);
    doc.rect(margin, signY, contentWidth, 6, "F");
    doc.line(margin, signY + 6, margin + contentWidth, signY + 6);

    // Section 1: Certified Correct (Property Custodian)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(30, 45, 75);
    doc.text("CERTIFIED CORRECT BY:", margin + 3, signY + 4.2);

    const supplyName = options.signatorySupplyOfficer?.trim() || "";
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(60, 60, 60);
    doc.line(margin + 6, signY + 22, margin + colWidth - 6, signY + 22);

    if (supplyName) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(15, 25, 50);
        doc.text(supplyName.toUpperCase(), margin + (colWidth / 2), signY + 21, { align: "center" });
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.8);
    doc.setTextColor(80, 80, 80);
    doc.text("RHU Supply Officer / Property Custodian", margin + (colWidth / 2), signY + 26, { align: "center" });
    doc.text("Date: ________________________", margin + (colWidth / 2), signY + 31, { align: "center" });

    // Section 2: Approved & Noted (Municipal Health Officer)
    const col2X = margin + colWidth;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(30, 45, 75);
    doc.text("APPROVED & NOTED BY:", col2X + 3, signY + 4.2);

    const mhoName = options.signatoryMHO?.trim() || "";
    doc.line(col2X + 6, signY + 22, col2X + colWidth - 6, signY + 22);

    if (mhoName) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(15, 25, 50);
        doc.text(mhoName.toUpperCase(), col2X + (colWidth / 2), signY + 21, { align: "center" });
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.8);
    doc.setTextColor(80, 80, 80);
    doc.text("Municipal Health Officer (MHO) / Head of Office", col2X + (colWidth / 2), signY + 26, { align: "center" });
    doc.text("Date: ________________________", col2X + (colWidth / 2), signY + 31, { align: "center" });

    // Section 3: Verified & Audited (COA Representative)
    const col3X = margin + (colWidth * 2);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(30, 45, 75);
    doc.text("VERIFIED & AUDITED BY:", col3X + 3, signY + 4.2);

    const auditorName = options.signatoryAuditor?.trim() || "";
    doc.line(col3X + 6, signY + 22, col3X + colWidth - 6, signY + 22);

    if (auditorName) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(15, 25, 50);
        doc.text(auditorName.toUpperCase(), col3X + (colWidth / 2), signY + 21, { align: "center" });
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.8);
    doc.setTextColor(80, 80, 80);
    doc.text("COA Resident Auditor / Audit Team Leader", col3X + (colWidth / 2), signY + 26, { align: "center" });
    doc.text("Date: ________________________", col3X + (colWidth / 2), signY + 31, { align: "center" });

    // =========================================================================
    // 6. MULTI-PAGE RUNNING FOOTER
    // =========================================================================
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);

        // Footer divider rule
        doc.setDrawColor(210, 220, 230);
        doc.setLineWidth(0.2);
        doc.line(margin, pageHeight - 8.5, pageWidth - margin, pageHeight - 8.5);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(6.5);
        doc.setTextColor(130, 140, 155);

        doc.text("Local Government Unit of Mapandan • Rural Health Unit Property Management System", margin, pageHeight - 5);
        doc.text("Official Document • Subject to Commission on Audit (COA) Inspection", pageWidth / 2, pageHeight - 5, { align: "center" });
        doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 5, { align: "right" });
    }

    // Save and download PDF
    const cleanDate = new Date().toISOString().split("T")[0];
    const fileName = `${options.reportType || "COA_REPORT"}_Mapandan_RHU_${cleanDate}.pdf`;
    doc.save(fileName);
}

/**
 * Exports full equipment asset ledger to formatted Microsoft Excel (.xlsx) spreadsheet.
 */
export function exportCOAExcel(assets: any[]) {
    const officialAssets = (assets || []).filter(a => a.currentStatus !== "PENDING_VERIFICATION");
    const data = officialAssets.map((a, index) => ({
        "Item #": index + 1,
        "Property Number (Asset Tag)": a.assetTagNo || "N/A",
        "Equipment Name": a.equipmentName || "N/A",
        "Brand / Manufacturer": a.brand || "-",
        "Serial Number": a.serialNo || "NONE",
        "COA Category": a.category === "PPE" ? "Property, Plant & Equipment (PPE)" : "Semi-Expendable Property",
        "Acquisition Source": a.acquisitionSource || "PURCHASE_ORDER",
        "Unit Cost (PHP)": Number(a.unitCost) || 0,
        "Quantity": Number(a.quantity) || 1,
        "Total Valuation (PHP)": a.currentStatus === "CONDEMNED_DISPOSED" ? 0 : ((Number(a.unitCost) || 0) * (Number(a.quantity) || 1)),
        "Facility Location": a.currentFacility || "Main RHU",
        "Assigned Room": a.assignedRoom || "Central Stockroom",
        "Accountable Custodian": a.accountablePerson || "Unassigned",
        "Custodian Employee ID": a.accountableEmployeeId || "-",
        "Reference Document (PAR/ICS)": a.documentReference || "-",
        "Linked PO #": a.poReferenceNo || "-",
        "Linked SO #": a.soReferenceNo || "-",
        "Current Status": (a.currentStatus || "SERVICEABLE").replace(/_/g, " "),
        "Acquisition Date": a.acquisitionDate ? new Date(a.acquisitionDate).toISOString().split("T")[0] : "-",
        "Defect / Maintenance Notes": a.defectDetails || a.discrepancyNotes || "-"
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "COA Physical Count Ledger");

    // Auto column widths
    const max_width = data.reduce((w: any, r: any) => {
        Object.keys(r).forEach(k => {
            const val = String(r[k] || "");
            w[k] = Math.max(w[k] || 10, val.length + 2);
        });
        return w;
    }, {});
    worksheet["!cols"] = Object.keys(max_width).map(k => ({ wch: Math.min(max_width[k], 40) }));

    const fileName = `COA_Physical_Inventory_Ledger_Mapandan_${new Date().toISOString().split("T")[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
}
