import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import { format } from "date-fns";

export interface Form10APaymentData {
    date: string;
    taxPayer: string;
    receiptNo: string;
    periodCovered: string;
    // Basic Tax
    basicCurrent: number;
    basicDiscount: number;
    basicPenalty: number;
    basicImmPreceding: number;
    basicImmPenalty: number;
    basicPriorYear: number;
    basicPriorPenalty: number;
    basicTotal: number;
    // Barangay
    propertyClass: string;
    brgyShare: number;
    brgyName: string;
    // SEF
    sefCurrent: number;
    sefDiscount: number;
    sefPenalty: number;
    sefImmPreceding: number;
    sefImmPenalty: number;
    sefPriorYear: number;
    sefPriorPenalty: number;
    sefTotal: number;
    // Grand Total
    totalCollected: number;
}

/**
 * Extracts and maps transaction data into the official Prov. Form No. 10(A) column schema.
 */
export function mapPaymentToForm10A(p: any): Form10APaymentData {
    let snap: any = {};
    if (p.transaction?.residentSnapshot) {
        try {
            snap = typeof p.transaction.residentSnapshot === "string"
                ? JSON.parse(p.transaction.residentSnapshot)
                : p.transaction.residentSnapshot;
        } catch {
            snap = {};
        }
    }

    const additional = typeof p.transaction?.additionalData === "string"
        ? (() => { try { return JSON.parse(p.transaction.additionalData); } catch { return {}; } })()
        : (p.transaction?.additionalData || {});

    const resident = p.transaction?.user || {};
    const comp = (additional.rptComputation as any) || {};

    const effectiveDateStr = comp.paymentDate || additional.paymentDate || p.createdAt;
    const rawDate = effectiveDateStr ? new Date(effectiveDateStr) : new Date();
    const dateFormatted = !isNaN(rawDate.getTime()) ? format(rawDate, "MM/dd/yyyy") : "—";

    const taxPayer = (
        additional.ownerName ||
        additional.taxPayer ||
        snap.fullName ||
        snap.applicantName ||
        additional.applicantName ||
        snap.name ||
        snap.violatorName ||
        additional.violatorName ||
        (snap.firstName || snap.lastName ? `${snap.firstName || ""} ${snap.lastName || ""}`.trim() : "") ||
        p.transaction?.businessName ||
        resident.name ||
        "CITIZEN / PAYEE"
    ).trim().toUpperCase();

    const receiptNo = p.orNumber || additional.orSeriesNumber || comp.orSeriesNumber || p.reference || "—";
    
    let periodCovered = "—";
    const yearVal = comp.taxYear || additional.taxYear || additional.yearCovered;
    const periodVal = comp.periodCovered || additional.periodCovered;
    if (yearVal && periodVal) {
        if (periodVal === "Current Year" || periodVal === "Full Year (Annual)") {
            periodCovered = `${yearVal}`;
        } else {
            periodCovered = `${yearVal} (${periodVal.replace("Quarter", "Qtr")})`;
        }
    } else if (yearVal) {
        periodCovered = String(yearVal);
    } else if (periodVal) {
        periodCovered = String(periodVal);
    } else {
        periodCovered = String(rawDate.getFullYear());
    }

    const isRpt = Boolean(
        p.transaction?.type?.category?.toUpperCase() === "RPT" ||
        p.transaction?.type?.category?.toUpperCase() === "REAL PROPERTY TAX" ||
        p.transaction?.type?.name?.toUpperCase()?.includes("REAL PROPERTY") ||
        additional.tdn ||
        additional.pin
    );

    const totalCollected = Number(p.amount || comp.totalAmountDue || additional.totalAmountDue || 0);

    let basicTotal = 0;
    let sefTotal = 0;
    let basicCurrent = 0;
    let basicDiscount = 0;
    let basicPenalty = 0;
    let basicImmPreceding = 0;
    let basicImmPenalty = 0;
    let basicPriorYear = 0;
    let basicPriorPenalty = 0;

    let sefCurrent = 0;
    let sefDiscount = 0;
    let sefPenalty = 0;
    let sefImmPreceding = 0;
    let sefImmPenalty = 0;
    let sefPriorYear = 0;
    let sefPriorPenalty = 0;

    let propertyClass = "Res";
    let brgyShare = 0;

    const brgyName = snap.barangay || additional.barangay || resident.barangay || "Mapandan";

    if (isRpt) {
        const rawType = String(additional.propertyType || additional.classification || "Residential").toLowerCase();
        if (rawType.includes("agri")) propertyClass = "Agri";
        else if (rawType.includes("com")) propertyClass = "Com";
        else if (rawType.includes("ind")) propertyClass = "Ind";

        const hasCustomBreakdown = (
            comp.basicTax !== undefined ||
            comp.basicTotal !== undefined ||
            comp.totalAmountDue !== undefined ||
            additional.basicTax !== undefined ||
            additional.basicCurrent !== undefined ||
            additional.priorYear !== undefined ||
            additional.immediatePrecedingYear !== undefined
        );

        if (hasCustomBreakdown) {
            basicCurrent = Number(comp.basicTax ?? additional.basicCurrent ?? additional.basicTax ?? (totalCollected / 2));
            sefCurrent = Number(comp.sefTax ?? additional.sefCurrent ?? additional.sefTax ?? (totalCollected / 2));

            const discTotal = Number(comp.discountAmount ?? additional.discount ?? 0);
            basicDiscount = Number(comp.basicDiscount ?? additional.basicDiscount ?? (discTotal > 0 ? discTotal / 2 : 0));
            sefDiscount = Number(comp.sefDiscount ?? additional.sefDiscount ?? (discTotal > 0 ? discTotal / 2 : 0));

            const penTotal = Number(comp.penaltyAmount ?? additional.penalties ?? additional.penalty ?? 0);
            basicPenalty = Number(comp.basicPenalty ?? additional.basicPenalty ?? (penTotal > 0 ? penTotal / 2 : 0));
            sefPenalty = Number(comp.sefPenalty ?? additional.sefPenalty ?? (penTotal > 0 ? penTotal / 2 : 0));

            basicImmPreceding = Number(comp.basicImmPreceding ?? additional.basicImmPreceding ?? (Number(additional.immediatePrecedingYear || 0) / 2));
            sefImmPreceding = Number(comp.sefImmPreceding ?? additional.sefImmPreceding ?? (Number(additional.immediatePrecedingYear || 0) / 2));

            basicImmPenalty = Number(comp.basicImmPenalty ?? additional.basicImmPenalty ?? (Number(additional.immediatePrecedingPenalty || 0) / 2));
            sefImmPenalty = Number(comp.sefImmPenalty ?? additional.sefImmPenalty ?? (Number(additional.immediatePrecedingPenalty || 0) / 2));

            basicPriorYear = Number(comp.basicPriorYear ?? additional.basicPriorYear ?? (Number(additional.priorYear || 0) / 2));
            sefPriorYear = Number(comp.sefPriorYear ?? additional.sefPriorYear ?? (Number(additional.priorYear || 0) / 2));

            basicPriorPenalty = Number(comp.basicPriorPenalty ?? additional.basicPriorPenalty ?? (Number(additional.priorYearPenalty || 0) / 2));
            sefPriorPenalty = Number(comp.sefPriorPenalty ?? additional.sefPriorPenalty ?? (Number(additional.priorYearPenalty || 0) / 2));

            basicTotal = comp.basicTotal !== undefined
                ? Number(comp.basicTotal)
                : (basicCurrent - basicDiscount + basicPenalty + basicImmPreceding + basicImmPenalty + basicPriorYear + basicPriorPenalty);

            sefTotal = comp.sefTotal !== undefined
                ? Number(comp.sefTotal)
                : (sefCurrent - sefDiscount + sefPenalty + sefImmPreceding + sefImmPenalty + sefPriorYear + sefPriorPenalty);
        } else {
            const half = totalCollected / 2;
            const isDiscounted = Boolean(additional.isDiscounted || additional.hasDiscount);

            if (isDiscounted) {
                const grossHalf = half / 0.90;
                basicCurrent = grossHalf;
                sefCurrent = grossHalf;
                basicDiscount = grossHalf * 0.10;
                sefDiscount = grossHalf * 0.10;
            } else {
                basicCurrent = half;
                sefCurrent = half;
                basicDiscount = 0;
                sefDiscount = 0;
            }

            basicTotal = half;
            sefTotal = half;
        }

        brgyShare = comp.allocBarangay !== undefined
            ? Number(comp.allocBarangay)
            : Number((basicTotal * 0.25).toFixed(2));
    } else {
        // Non-RPT collections (e.g. Cedula, Building Permit, Occupancy Permit, Civil Registry, etc.)
        // Place the full collected amount in Basic Current & Basic Total so the total adds up cleanly
        const svcName = p.transaction?.type?.name || p.transaction?.type?.category || "General";
        propertyClass = svcName.length > 12 ? svcName.substring(0, 12) : svcName;
        basicCurrent = totalCollected;
        basicTotal = totalCollected;
        sefTotal = 0;
        brgyShare = 0;
    }

    return {
        date: dateFormatted,
        taxPayer,
        receiptNo,
        periodCovered,
        basicCurrent,
        basicDiscount,
        basicPenalty,
        basicImmPreceding,
        basicImmPenalty,
        basicPriorYear,
        basicPriorPenalty,
        basicTotal,
        propertyClass,
        brgyShare,
        brgyName,
        sefCurrent,
        sefDiscount,
        sefPenalty,
        sefImmPreceding,
        sefImmPenalty,
        sefPriorYear,
        sefPriorPenalty,
        sefTotal,
        totalCollected
    };
}

/**
 * Format number to 2 decimals, or empty string if 0 (matches official blank cell appearance in Form 10A).
 */
const fmtOrBlank = (num: number): string => {
    if (!num || Math.abs(num) < 0.001) return "";
    return num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const fmtAlways = (num: number): string => {
    return (num || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export function getAbstractTitle(category?: string): string {
    if (!category || category.trim() === "" || category.toUpperCase() === "ALL" || category.toUpperCase() === "ALL CATEGORIES") {
        return "ABSTRACT OF REAL PROPERTY TAX RECEIPTS";
    }
    const cat = category.trim().toUpperCase();
    if (cat === "RPT" || cat === "REAL PROPERTY TAX" || cat === "REALPROPERTYTAX") {
        return "ABSTRACT OF REAL PROPERTY TAX RECEIPTS";
    }
    return `ABSTRACT OF ${cat}`;
}

/**
 * Generate official Prov. Form No. 10(A) PDF (Abstract of Real Property Tax Receipts or Selected Category).
 */
export async function exportForm10APdf(
    payments: any[],
    options: {
        fromDate?: string;
        toDate?: string;
        category?: string;
    }
) {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "legal" });
    const PAGE_W = doc.internal.pageSize.getWidth();   // 355.6mm (Official Legal / Long Paper)
    const PAGE_H = doc.internal.pageSize.getHeight();  // 215.9mm
    const MARGIN = 8;

    const dataRows = payments.map(mapPaymentToForm10A);

    // Period label
    let periodLabel = `During the Period of ${format(new Date(), "MMMM yyyy")}`;
    if (options.fromDate && options.toDate) {
        const fromDateObj = new Date(options.fromDate);
        const toDateObj = new Date(options.toDate);
        if (
            fromDateObj.getMonth() === toDateObj.getMonth() &&
            fromDateObj.getFullYear() === toDateObj.getFullYear()
        ) {
            periodLabel = `During the Period of ${format(fromDateObj, "MMMM yyyy")}`;
        } else {
            periodLabel = `During the Period of ${format(fromDateObj, "MMMM d, yyyy")} to ${format(toDateObj, "MMMM d, yyyy")}`;
        }
    } else if (options.fromDate) {
        periodLabel = `During the Period of ${format(new Date(options.fromDate), "MMMM yyyy")}`;
    }

    // Top Left Metadata (Kept strictly on top lines Y=8..12 so Word PDF converter won't create a side-by-side multi-column header)
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(60, 60, 60);
    doc.text("Prov. Form No. 10(A)", MARGIN, 8);
    doc.setFontSize(6);
    doc.text("Revised January 1994", MARGIN, 11.5);

    // Centered Title Block (Starts cleanly at Y=17, below top left metadata)
    const abstractTitle = getAbstractTitle(options.category);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.text(abstractTitle, PAGE_W / 2, 17, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("Collected in the Municipality of MAPANDAN, Province of PANGASINAN", PAGE_W / 2, 21.5, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(periodLabel, PAGE_W / 2, 26, { align: "center" });

    const currentY = 30;

    // Table Column mapping
    const tableBody = dataRows.map((r) => [
        r.date,
        r.taxPayer,
        r.receiptNo,
        r.periodCovered,
        fmtOrBlank(r.basicCurrent),
        fmtOrBlank(r.basicDiscount),
        fmtOrBlank(r.basicPenalty),
        fmtOrBlank(r.basicImmPreceding),
        fmtOrBlank(r.basicImmPenalty),
        fmtOrBlank(r.basicPriorYear),
        fmtOrBlank(r.basicPriorPenalty),
        fmtAlways(r.basicTotal),
        r.propertyClass,
        fmtAlways(r.brgyShare),
        r.brgyName,
        fmtOrBlank(r.sefCurrent),
        fmtOrBlank(r.sefDiscount),
        fmtOrBlank(r.sefPenalty),
        fmtOrBlank(r.sefImmPreceding),
        fmtOrBlank(r.sefImmPenalty),
        fmtOrBlank(r.sefPriorYear),
        fmtOrBlank(r.sefPriorPenalty),
        fmtAlways(r.sefTotal),
        fmtAlways(r.totalCollected),
    ]);

    // Compute Totals
    const totBasicCurrent = dataRows.reduce((s, r) => s + r.basicCurrent, 0);
    const totBasicDiscount = dataRows.reduce((s, r) => s + r.basicDiscount, 0);
    const totBasicPenalty = dataRows.reduce((s, r) => s + r.basicPenalty, 0);
    const totBasicImm = dataRows.reduce((s, r) => s + r.basicImmPreceding, 0);
    const totBasicImmPen = dataRows.reduce((s, r) => s + r.basicImmPenalty, 0);
    const totBasicPrior = dataRows.reduce((s, r) => s + r.basicPriorYear, 0);
    const totBasicPriorPen = dataRows.reduce((s, r) => s + r.basicPriorPenalty, 0);
    const totBasicTotal = dataRows.reduce((s, r) => s + r.basicTotal, 0);
    const totBrgyShare = dataRows.reduce((s, r) => s + r.brgyShare, 0);
    const totSefCurrent = dataRows.reduce((s, r) => s + r.sefCurrent, 0);
    const totSefDiscount = dataRows.reduce((s, r) => s + r.sefDiscount, 0);
    const totSefPenalty = dataRows.reduce((s, r) => s + r.sefPenalty, 0);
    const totSefImm = dataRows.reduce((s, r) => s + r.sefImmPreceding, 0);
    const totSefImmPen = dataRows.reduce((s, r) => s + r.sefImmPenalty, 0);
    const totSefPrior = dataRows.reduce((s, r) => s + r.sefPriorYear, 0);
    const totSefPriorPen = dataRows.reduce((s, r) => s + r.sefPriorPenalty, 0);
    const totSefTotal = dataRows.reduce((s, r) => s + r.sefTotal, 0);
    const totGrand = dataRows.reduce((s, r) => s + r.totalCollected, 0);

    const tableFoot = [[
        { content: "TOTAL", colSpan: 4, styles: { halign: "center", fontStyle: "bold" } },
        fmtAlways(totBasicCurrent),
        fmtAlways(totBasicDiscount),
        fmtAlways(totBasicPenalty),
        fmtAlways(totBasicImm),
        fmtAlways(totBasicImmPen),
        fmtAlways(totBasicPrior),
        fmtAlways(totBasicPriorPen),
        fmtAlways(totBasicTotal),
        "",
        fmtAlways(totBrgyShare),
        "",
        fmtAlways(totSefCurrent),
        fmtAlways(totSefDiscount),
        fmtAlways(totSefPenalty),
        fmtAlways(totSefImm),
        fmtAlways(totSefImmPen),
        fmtAlways(totSefPrior),
        fmtAlways(totSefPriorPen),
        fmtAlways(totSefTotal),
        fmtAlways(totGrand),
    ]];

    autoTable(doc, {
        startY: currentY,
        tableWidth: 339,
        margin: { left: MARGIN, right: MARGIN, top: MARGIN, bottom: 12 },
        head: [
            [
                { content: "DATE", rowSpan: 2, styles: { valign: "middle", halign: "center" } },
                { content: "Name of Tax Payer", rowSpan: 2, styles: { valign: "middle", halign: "center" } },
                { content: "RECEIPT NO.\nP.F. NO. 25(A)", rowSpan: 2, styles: { valign: "middle", halign: "center" } },
                { content: "PERIOD\nCOVERED", rowSpan: 2, styles: { valign: "middle", halign: "center" } },
                { content: "B A S I C", colSpan: 8, styles: { halign: "center" } },
                { content: "B A R A N G A Y", colSpan: 3, styles: { halign: "center" } },
                { content: "SPECIAL EDUCATIONAL FUND", colSpan: 8, styles: { halign: "center" } },
                { content: "TOTAL TAX\nCollected", rowSpan: 2, styles: { valign: "middle", halign: "center" } },
            ],
            [
                { content: "CURRENT\nYEAR", styles: { halign: "center" } },
                { content: "10%\nDISC.", styles: { halign: "center" } },
                { content: "PENALTY", styles: { halign: "center" } },
                { content: "IMM. PREC.\nYEAR", styles: { halign: "center" } },
                { content: "PENALTY", styles: { halign: "center" } },
                { content: "PRIOR\nYEAR", styles: { halign: "center" } },
                { content: "PENALTY", styles: { halign: "center" } },
                { content: "TOTAL", styles: { halign: "center" } },
                { content: "PROPERTY\nCLASS.", styles: { halign: "center" } },
                { content: "BRGY.\nSHARE", styles: { halign: "center" } },
                { content: "NAME/NUMBER", styles: { halign: "center" } },
                { content: "CURRENT\nYEAR", styles: { halign: "center" } },
                { content: "10%\nDISC.", styles: { halign: "center" } },
                { content: "PENALTY", styles: { halign: "center" } },
                { content: "IMM. PREC.\nYEAR", styles: { halign: "center" } },
                { content: "PENALTY", styles: { halign: "center" } },
                { content: "PRIOR\nYEAR", styles: { halign: "center" } },
                { content: "PENALTY", styles: { halign: "center" } },
                { content: "TOTAL", styles: { halign: "center" } },
            ]
        ],
        body: tableBody as any,
        foot: tableFoot as any,
        theme: "grid",
        styles: {
            fontSize: 5.5,
            cellPadding: 0.7,
            font: "helvetica",
            lineColor: [40, 40, 40],
            lineWidth: 0.12,
            textColor: [0, 0, 0],
            overflow: "ellipsize",
            fillColor: [255, 255, 255],
        },
        headStyles: {
            fillColor: [255, 255, 255],
            textColor: [0, 0, 0],
            fontStyle: "bold",
            fontSize: 4.5,
            lineColor: [40, 40, 40],
            lineWidth: 0.15,
        },
        footStyles: {
            fillColor: [255, 255, 255],
            textColor: [0, 0, 0],
            fontStyle: "bold",
            fontSize: 5.2,
            lineColor: [40, 40, 40],
            lineWidth: 0.15,
        },
        columnStyles: {
            0: { cellWidth: 14, halign: "center" },   // Date
            1: { cellWidth: 36, halign: "left" },     // Tax Payer
            2: { cellWidth: 18, halign: "center" },   // Receipt No
            3: { cellWidth: 11, halign: "center" },   // Period
            4: { cellWidth: 13, halign: "right" },    // Basic Current
            5: { cellWidth: 11, halign: "right" },    // Basic Disc
            6: { cellWidth: 10.5, halign: "right" },  // Basic Pen
            7: { cellWidth: 13, halign: "right" },    // Basic Imm
            8: { cellWidth: 10.5, halign: "right" },  // Basic Imm Pen
            9: { cellWidth: 11, halign: "right" },    // Basic Prior
            10: { cellWidth: 10.5, halign: "right" }, // Basic Prior Pen
            11: { cellWidth: 14, halign: "right", fontStyle: "bold" }, // Basic Total
            12: { cellWidth: 12, halign: "center" },  // Property Class
            13: { cellWidth: 12, halign: "right" },   // Brgy Share
            14: { cellWidth: 18, halign: "center" },  // Brgy Name
            15: { cellWidth: 13, halign: "right" },   // SEF Current
            16: { cellWidth: 11, halign: "right" },   // SEF Disc
            17: { cellWidth: 10.5, halign: "right" }, // SEF Pen
            18: { cellWidth: 13, halign: "right" },   // SEF Imm
            19: { cellWidth: 10.5, halign: "right" }, // SEF Imm Pen
            20: { cellWidth: 11, halign: "right" },   // SEF Prior
            21: { cellWidth: 10.5, halign: "right" }, // SEF Prior Pen
            22: { cellWidth: 14, halign: "right", fontStyle: "bold" }, // SEF Total
            23: { cellWidth: 20, halign: "right", fontStyle: "bold" }, // Total Collected
        }
    });

    // Pagination & Date printed footer
    const pageCount = (doc.internal as any).getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(6);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(80, 80, 80);
        doc.text(format(new Date(), "EEEE, dd MMMM yyyy"), MARGIN, PAGE_H - 5);
        doc.text(`Page ${i}`, PAGE_W - MARGIN, PAGE_H - 5, { align: "right" });
    }

    const catPart = options.category && options.category.toUpperCase() !== "ALL"
        ? `_${options.category.trim().replace(/\s+/g, "_").toUpperCase()}`
        : "";
    const fileSuffix = options.fromDate && options.toDate ? `${options.fromDate}_to_${options.toDate}` : format(new Date(), "yyyy-MM-dd");
    doc.save(`Prov_Form_10A_Abstract${catPart}_${fileSuffix}.pdf`);
}

/**
 * Generate official Prov. Form No. 10(A) Excel (Abstract of Real Property Tax Receipts or Selected Category).
 */
export async function exportForm10AExcel(
    payments: any[],
    options: {
        fromDate?: string;
        toDate?: string;
        category?: string;
    }
) {
    const dataRows = payments.map(mapPaymentToForm10A);

    let periodLabel = `During the Period of ${format(new Date(), "MMMM yyyy")}`;
    if (options.fromDate && options.toDate) {
        const fromDateObj = new Date(options.fromDate);
        const toDateObj = new Date(options.toDate);
        if (
            fromDateObj.getMonth() === toDateObj.getMonth() &&
            fromDateObj.getFullYear() === toDateObj.getFullYear()
        ) {
            periodLabel = `During the Period of ${format(fromDateObj, "MMMM yyyy")}`;
        } else {
            periodLabel = `During the Period of ${format(fromDateObj, "MMMM d, yyyy")} to ${format(toDateObj, "MMMM d, yyyy")}`;
        }
    } else if (options.fromDate) {
        periodLabel = `During the Period of ${format(new Date(options.fromDate), "MMMM yyyy")}`;
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Treasury Department - Municipality of Mapandan";
    workbook.created = new Date();

    const sheetName = options.category && options.category.toUpperCase() !== "ALL"
        ? `${options.category.trim()} Abstract`.slice(0, 31)
        : "Form 10(A) Abstract";

    const sheet = workbook.addWorksheet(sheetName, {
        pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    });

    const borderThin: Partial<ExcelJS.Border> = { style: "thin", color: { argb: "FF000000" } };
    const fullBorder: Partial<ExcelJS.Borders> = {
        top: borderThin,
        left: borderThin,
        bottom: borderThin,
        right: borderThin
    };

    // Header metadata
    sheet.getCell("A2").value = "Prov. Form No. 10(A)";
    sheet.getCell("A2").font = { name: "Arial", size: 9, bold: true };
    sheet.getCell("A3").value = "Revised January 1994";
    sheet.getCell("A3").font = { name: "Arial", size: 8, italic: true };

    const abstractTitle = getAbstractTitle(options.category);
    sheet.mergeCells("A4:X4");
    sheet.getCell("A4").value = abstractTitle;
    sheet.getCell("A4").font = { name: "Arial", size: 12, bold: true };
    sheet.getCell("A4").alignment = { horizontal: "center", vertical: "middle" };

    sheet.mergeCells("A5:X5");
    sheet.getCell("A5").value = "Collected in the Municipality of MAPANDAN, Province of PANGASINAN";
    sheet.getCell("A5").font = { name: "Arial", size: 10 };
    sheet.getCell("A5").alignment = { horizontal: "center", vertical: "middle" };

    sheet.mergeCells("A6:X6");
    sheet.getCell("A6").value = periodLabel;
    sheet.getCell("A6").font = { name: "Arial", size: 10, bold: true };
    sheet.getCell("A6").alignment = { horizontal: "center", vertical: "middle" };

    // Row 8: Super-headers
    sheet.mergeCells("A8:A9");
    sheet.getCell("A8").value = "DATE";

    sheet.mergeCells("B8:B9");
    sheet.getCell("B8").value = "Name of Tax Payer";

    sheet.mergeCells("C8:C9");
    sheet.getCell("C8").value = "RECEIPT NO.\nP.F. NO. 25(A)";

    sheet.mergeCells("D8:D9");
    sheet.getCell("D8").value = "PERIOD\nCOVERED";

    sheet.mergeCells("E8:L8");
    sheet.getCell("E8").value = "B A S I C";

    sheet.mergeCells("M8:O8");
    sheet.getCell("M8").value = "B A R A N G A Y";

    sheet.mergeCells("P8:W8");
    sheet.getCell("P8").value = "SPECIAL EDUCATIONAL FUND";

    sheet.mergeCells("X8:X9");
    sheet.getCell("X8").value = "TOTAL TAX\nCollected";

    // Row 9: Sub-headers
    const subHeaders = [
        "CURRENT YEAR", "10% DISCOUNT", "PENALTIES", "IMMEDIATE PRECEDING YEAR", "PENALTIES", "PRIOR YEAR", "PENALTIES", "TOTAL",
        "PROPERTY CLASSIFICATION", "BRGY. SHARE", "NAME/NUMBER",
        "CURRENT YEAR", "10% DISCOUNT", "PENALTIES", "IMMEDIATE PRECEDING YEAR", "PENALTIES", "PRIOR YEAR", "PENALTIES", "TOTAL"
    ];

    const subCols = ["E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W"];
    subHeaders.forEach((sh, idx) => {
        sheet.getCell(`${subCols[idx]}9`).value = sh;
    });

    // Style Header Rows (8 & 9)
    [8, 9].forEach((rowNum) => {
        const row = sheet.getRow(rowNum);
        row.height = 24;
        row.eachCell({ includeEmpty: true }, (cell) => {
            cell.font = { name: "Arial", size: 8, bold: true };
            cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
            cell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FFF0F2F5" }
            };
            cell.border = fullBorder;
        });
    });

    // Data Rows start at Row 10
    const startRow = 10;
    dataRows.forEach((r, idx) => {
        const currentRow = startRow + idx;
        const row = sheet.getRow(currentRow);
        row.height = 18;

        row.values = [
            r.date,
            r.taxPayer,
            r.receiptNo,
            r.periodCovered,
            r.basicCurrent || null,
            r.basicDiscount || null,
            r.basicPenalty || null,
            r.basicImmPreceding || null,
            r.basicImmPenalty || null,
            r.basicPriorYear || null,
            r.basicPriorPenalty || null,
            r.basicTotal,
            r.propertyClass,
            r.brgyShare,
            r.brgyName,
            r.sefCurrent || null,
            r.sefDiscount || null,
            r.sefPenalty || null,
            r.sefImmPreceding || null,
            r.sefImmPenalty || null,
            r.sefPriorYear || null,
            r.sefPriorPenalty || null,
            r.sefTotal,
            r.totalCollected
        ];

        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            cell.border = fullBorder;
            cell.font = { name: "Arial", size: 8 };

            // Numeric columns: 5..12, 14, 16..24
            const isNumeric = (colNumber >= 5 && colNumber <= 12) || colNumber === 14 || (colNumber >= 16 && colNumber <= 24);
            if (isNumeric) {
                cell.numFmt = '#,##0.00;(#,##0.00);""';
                cell.alignment = { horizontal: "right", vertical: "middle" };
            } else {
                cell.alignment = { horizontal: colNumber === 2 ? "left" : "center", vertical: "middle" };
            }

            // Bold total columns (12 = Basic Total, 23 = SEF Total, 24 = Total Tax)
            if (colNumber === 12 || colNumber === 23 || colNumber === 24) {
                cell.font = { name: "Arial", size: 8, bold: true };
            }
        });
    });

    const endRow = startRow + dataRows.length - 1;
    const totalsRowIndex = endRow + 1;
    const totalsRow = sheet.getRow(totalsRowIndex);
    totalsRow.height = 20;

    sheet.mergeCells(`A${totalsRowIndex}:D${totalsRowIndex}`);
    totalsRow.getCell(1).value = "TOTAL";

    // Set Formulas for Totals
    const numericCols = [
        { col: 5, letter: "E" },
        { col: 6, letter: "F" },
        { col: 7, letter: "G" },
        { col: 8, letter: "H" },
        { col: 9, letter: "I" },
        { col: 10, letter: "J" },
        { col: 11, letter: "K" },
        { col: 12, letter: "L" },
        { col: 14, letter: "N" },
        { col: 16, letter: "P" },
        { col: 17, letter: "Q" },
        { col: 18, letter: "R" },
        { col: 19, letter: "S" },
        { col: 20, letter: "T" },
        { col: 21, letter: "U" },
        { col: 22, letter: "V" },
        { col: 23, letter: "W" },
        { col: 24, letter: "X" }
    ];

    numericCols.forEach(({ col, letter }) => {
        totalsRow.getCell(col).value = {
            formula: `SUM(${letter}${startRow}:${letter}${endRow})`
        };
    });

    totalsRow.eachCell({ includeEmpty: true }, (cell) => {
        cell.font = { name: "Arial", size: 8, bold: true };
        cell.border = {
            top: borderThin,
            left: borderThin,
            bottom: { style: "double", color: { argb: "FF000000" } },
            right: borderThin
        };
        cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF5F5F5" }
        };
        if (Number(cell.col) >= 5) {
            cell.numFmt = '#,##0.00;(#,##0.00);""';
            cell.alignment = { horizontal: "right", vertical: "middle" };
        } else {
            cell.alignment = { horizontal: "center", vertical: "middle" };
        }
    });

    // Column widths
    const colWidths = [
        12, // A: Date
        26, // B: Name
        16, // C: Receipt
        12, // D: Period
        13, // E: Basic Current
        11, // F: Basic Disc
        11, // G: Basic Pen
        13, // H: Basic Imm
        11, // I: Basic Imm Pen
        11, // J: Basic Prior
        11, // K: Basic Prior Pen
        14, // L: Basic Total
        10, // M: Property Class
        13, // N: Brgy Share
        16, // O: Brgy Name
        13, // P: SEF Current
        11, // Q: SEF Disc
        11, // R: SEF Pen
        13, // S: SEF Imm
        11, // T: SEF Imm Pen
        11, // U: SEF Prior
        11, // V: SEF Prior Pen
        14, // W: SEF Total
        16  // X: Total Tax Collected
    ];

    colWidths.forEach((w, idx) => {
        sheet.getColumn(idx + 1).width = w;
    });

    // Write file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const catPart = options.category && options.category.toUpperCase() !== "ALL"
        ? `_${options.category.trim().replace(/\s+/g, "_").toUpperCase()}`
        : "";
    const fileSuffix = options.fromDate && options.toDate ? `${options.fromDate}_to_${options.toDate}` : format(new Date(), "yyyy-MM-dd");
    link.download = `Prov_Form_10A_Abstract${catPart}_${fileSuffix}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
}
