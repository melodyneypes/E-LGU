import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import { format } from "date-fns";

export interface BlgfClassificationRow {
    code: string;
    label: string;
    isSubRow?: boolean;
    // Basic Real Property Tax
    basicCurrentNet: number;
    basicDiscount: number;
    basicPreviousYears: number;
    basicPenaltyCurrent: number;
    basicPenaltyPrevious: number;
    basicTotal: number;
    // Special Education Fund
    sefCurrentNet: number;
    sefDiscount: number;
    sefPreviousYears: number;
    sefPenaltyCurrent: number;
    sefPenaltyPrevious: number;
    sefTotal: number;
    // Non Cash & Grand Total
    nonCash: number;
    grandTotal: number;
}

/**
 * Classifies an RPT payment record into one of the official BLGF property classifications.
 */
function classifyProperty(p: any): string {
    const additional = typeof p.transaction?.additionalData === "string"
        ? (() => { try { return JSON.parse(p.transaction.additionalData); } catch { return {}; } })()
        : (p.transaction?.additionalData || {});

    const raw = String(
        additional.classification ||
        additional.propertyClassification ||
        additional.propertyType ||
        p.transaction?.type?.name ||
        ""
    ).toLowerCase();

    if (raw.includes("agri")) return "agricultural";
    if (raw.includes("com")) return "commercial";
    if (raw.includes("ind")) return "industrial";
    if (raw.includes("min")) return "mineral";
    if (raw.includes("edu")) return "educational";
    if (raw.includes("hosp")) return "hospital";
    if (raw.includes("rec")) return "recreational";
    if (raw.includes("sci")) return "scientific";
    if (raw.includes("cult")) return "cultural";
    return "residential";
}

/**
 * Builds the 10 standard BLGF property classification rows with aggregated Basic & SEF values.
 */
export function buildBlgfReportData(payments: any[]) {
    const rowsMap: Record<string, BlgfClassificationRow> = {
        residential: {
            code: "residential",
            label: "1. Residential",
            basicCurrentNet: 0, basicDiscount: 0, basicPreviousYears: 0, basicPenaltyCurrent: 0, basicPenaltyPrevious: 0, basicTotal: 0,
            sefCurrentNet: 0, sefDiscount: 0, sefPreviousYears: 0, sefPenaltyCurrent: 0, sefPenaltyPrevious: 0, sefTotal: 0,
            nonCash: 0, grandTotal: 0
        },
        agricultural: {
            code: "agricultural",
            label: "2. Agricultural",
            basicCurrentNet: 0, basicDiscount: 0, basicPreviousYears: 0, basicPenaltyCurrent: 0, basicPenaltyPrevious: 0, basicTotal: 0,
            sefCurrentNet: 0, sefDiscount: 0, sefPreviousYears: 0, sefPenaltyCurrent: 0, sefPenaltyPrevious: 0, sefTotal: 0,
            nonCash: 0, grandTotal: 0
        },
        commercial: {
            code: "commercial",
            label: "3. Commercial",
            basicCurrentNet: 0, basicDiscount: 0, basicPreviousYears: 0, basicPenaltyCurrent: 0, basicPenaltyPrevious: 0, basicTotal: 0,
            sefCurrentNet: 0, sefDiscount: 0, sefPreviousYears: 0, sefPenaltyCurrent: 0, sefPenaltyPrevious: 0, sefTotal: 0,
            nonCash: 0, grandTotal: 0
        },
        industrial: {
            code: "industrial",
            label: "4. Industrial",
            basicCurrentNet: 0, basicDiscount: 0, basicPreviousYears: 0, basicPenaltyCurrent: 0, basicPenaltyPrevious: 0, basicTotal: 0,
            sefCurrentNet: 0, sefDiscount: 0, sefPreviousYears: 0, sefPenaltyCurrent: 0, sefPenaltyPrevious: 0, sefTotal: 0,
            nonCash: 0, grandTotal: 0
        },
        mineral: {
            code: "mineral",
            label: "5. Mineral",
            basicCurrentNet: 0, basicDiscount: 0, basicPreviousYears: 0, basicPenaltyCurrent: 0, basicPenaltyPrevious: 0, basicTotal: 0,
            sefCurrentNet: 0, sefDiscount: 0, sefPreviousYears: 0, sefPenaltyCurrent: 0, sefPenaltyPrevious: 0, sefTotal: 0,
            nonCash: 0, grandTotal: 0
        },
        educational: {
            code: "educational",
            label: "   A) Educational",
            isSubRow: true,
            basicCurrentNet: 0, basicDiscount: 0, basicPreviousYears: 0, basicPenaltyCurrent: 0, basicPenaltyPrevious: 0, basicTotal: 0,
            sefCurrentNet: 0, sefDiscount: 0, sefPreviousYears: 0, sefPenaltyCurrent: 0, sefPenaltyPrevious: 0, sefTotal: 0,
            nonCash: 0, grandTotal: 0
        },
        hospital: {
            code: "hospital",
            label: "   B) Hospital",
            isSubRow: true,
            basicCurrentNet: 0, basicDiscount: 0, basicPreviousYears: 0, basicPenaltyCurrent: 0, basicPenaltyPrevious: 0, basicTotal: 0,
            sefCurrentNet: 0, sefDiscount: 0, sefPreviousYears: 0, sefPenaltyCurrent: 0, sefPenaltyPrevious: 0, sefTotal: 0,
            nonCash: 0, grandTotal: 0
        },
        recreational: {
            code: "recreational",
            label: "   C) Recreational",
            isSubRow: true,
            basicCurrentNet: 0, basicDiscount: 0, basicPreviousYears: 0, basicPenaltyCurrent: 0, basicPenaltyPrevious: 0, basicTotal: 0,
            sefCurrentNet: 0, sefDiscount: 0, sefPreviousYears: 0, sefPenaltyCurrent: 0, sefPenaltyPrevious: 0, sefTotal: 0,
            nonCash: 0, grandTotal: 0
        },
        scientific: {
            code: "scientific",
            label: "   D) Scientific",
            isSubRow: true,
            basicCurrentNet: 0, basicDiscount: 0, basicPreviousYears: 0, basicPenaltyCurrent: 0, basicPenaltyPrevious: 0, basicTotal: 0,
            sefCurrentNet: 0, sefDiscount: 0, sefPreviousYears: 0, sefPenaltyCurrent: 0, sefPenaltyPrevious: 0, sefTotal: 0,
            nonCash: 0, grandTotal: 0
        },
        cultural: {
            code: "cultural",
            label: "   E) Cultural",
            isSubRow: true,
            basicCurrentNet: 0, basicDiscount: 0, basicPreviousYears: 0, basicPenaltyCurrent: 0, basicPenaltyPrevious: 0, basicTotal: 0,
            sefCurrentNet: 0, sefDiscount: 0, sefPreviousYears: 0, sefPenaltyCurrent: 0, sefPenaltyPrevious: 0, sefTotal: 0,
            nonCash: 0, grandTotal: 0
        }
    };

    payments.forEach((p) => {
        const cat = classifyProperty(p);
        const row = rowsMap[cat] || rowsMap["residential"];

        const additional = typeof p.transaction?.additionalData === "string"
            ? (() => { try { return JSON.parse(p.transaction.additionalData); } catch { return {}; } })()
            : (p.transaction?.additionalData || {});

        const totalCollected = Number(p.amount || 0);
        if (totalCollected <= 0) return;

        const hasCustomBreakdown = (
            additional.basicTax !== undefined ||
            additional.basicCurrent !== undefined ||
            additional.priorYear !== undefined ||
            additional.immediatePrecedingYear !== undefined
        );

        let bCurrentNet = 0;
        let bDiscount = 0;
        let bPrevYears = 0;
        let bPenaltyCurr = 0;
        let bPenaltyPrev = 0;
        let bTotal = 0;

        let sCurrentNet = 0;
        let sDiscount = 0;
        let sPrevYears = 0;
        let sPenaltyCurr = 0;
        let sPenaltyPrev = 0;
        let sTotal = 0;

        if (hasCustomBreakdown) {
            bCurrentNet = Number(additional.basicCurrent ?? additional.basicTax ?? (totalCollected / 2));
            sCurrentNet = Number(additional.sefCurrent ?? additional.sefTax ?? (totalCollected / 2));

            const discTotal = Number(additional.discount || 0);
            bDiscount = Number(additional.basicDiscount ?? (discTotal > 0 ? discTotal / 2 : 0));
            sDiscount = Number(additional.sefDiscount ?? (discTotal > 0 ? discTotal / 2 : 0));

            const penTotal = Number(additional.penalties || additional.penalty || 0);
            bPenaltyCurr = Number(additional.basicPenalty ?? (penTotal > 0 ? penTotal / 2 : 0));
            sPenaltyCurr = Number(additional.sefPenalty ?? (penTotal > 0 ? penTotal / 2 : 0));

            bPrevYears = Number(additional.basicPriorYear ?? (Number(additional.priorYear || 0) / 2));
            sPrevYears = Number(additional.sefPriorYear ?? (Number(additional.priorYear || 0) / 2));

            bPenaltyPrev = Number(additional.basicPriorPenalty ?? (Number(additional.priorYearPenalty || 0) / 2));
            sPenaltyPrev = Number(additional.sefPriorPenalty ?? (Number(additional.priorYearPenalty || 0) / 2));

            bTotal = bCurrentNet - bDiscount + bPenaltyCurr + bPrevYears + bPenaltyPrev;
            sTotal = sCurrentNet - sDiscount + sPenaltyCurr + sPrevYears + sPenaltyPrev;
        } else {
            const half = totalCollected / 2;
            const isDiscounted = Boolean(additional.isDiscounted || additional.hasDiscount);

            if (isDiscounted) {
                const grossHalf = half / 0.90;
                bCurrentNet = half;
                sCurrentNet = half;
                bDiscount = grossHalf * 0.10;
                sDiscount = grossHalf * 0.10;
            } else {
                bCurrentNet = half;
                sCurrentNet = half;
                bDiscount = 0;
                sDiscount = 0;
            }

            bTotal = half;
            sTotal = half;
        }

        row.basicCurrentNet += bCurrentNet;
        row.basicDiscount += bDiscount;
        row.basicPreviousYears += bPrevYears;
        row.basicPenaltyCurrent += bPenaltyCurr;
        row.basicPenaltyPrevious += bPenaltyPrev;
        row.basicTotal += bTotal;

        row.sefCurrentNet += sCurrentNet;
        row.sefDiscount += sDiscount;
        row.sefPreviousYears += sPrevYears;
        row.sefPenaltyCurrent += sPenaltyCurr;
        row.sefPenaltyPrevious += sPenaltyPrev;
        row.sefTotal += sTotal;

        row.grandTotal += (bTotal + sTotal);
    });

    const orderedKeys = [
        "residential",
        "agricultural",
        "commercial",
        "industrial",
        "mineral",
        "educational",
        "hospital",
        "recreational",
        "scientific",
        "cultural"
    ];

    const rows = orderedKeys.map(k => rowsMap[k]);

    // Compute Totals
    const totalRow: BlgfClassificationRow = {
        code: "total",
        label: "Total",
        basicCurrentNet: rows.reduce((s, r) => s + r.basicCurrentNet, 0),
        basicDiscount: rows.reduce((s, r) => s + r.basicDiscount, 0),
        basicPreviousYears: rows.reduce((s, r) => s + r.basicPreviousYears, 0),
        basicPenaltyCurrent: rows.reduce((s, r) => s + r.basicPenaltyCurrent, 0),
        basicPenaltyPrevious: rows.reduce((s, r) => s + r.basicPenaltyPrevious, 0),
        basicTotal: rows.reduce((s, r) => s + r.basicTotal, 0),

        sefCurrentNet: rows.reduce((s, r) => s + r.sefCurrentNet, 0),
        sefDiscount: rows.reduce((s, r) => s + r.sefDiscount, 0),
        sefPreviousYears: rows.reduce((s, r) => s + r.sefPreviousYears, 0),
        sefPenaltyCurrent: rows.reduce((s, r) => s + r.sefPenaltyCurrent, 0),
        sefPenaltyPrevious: rows.reduce((s, r) => s + r.sefPenaltyPrevious, 0),
        sefTotal: rows.reduce((s, r) => s + r.sefTotal, 0),

        nonCash: 0,
        grandTotal: rows.reduce((s, r) => s + r.grandTotal, 0)
    };

    // Disposition of Proceeds Calculations (RA 7160 Sections 271 & 272)
    // Basic (General Fund): 35% Province, 40% Municipality, 25% Barangay
    const basicTotal = totalRow.basicTotal;
    const basicProv = Number((basicTotal * 0.35).toFixed(2));
    const basicMun = Number((basicTotal * 0.40).toFixed(2));
    const basicBrgy = Number((basicTotal - basicProv - basicMun).toFixed(2)); // clean balancing

    // SEF (Special Education Fund): 50% Province, 50% Municipality
    const sefTotal = totalRow.sefTotal;
    const sefProv = Number((sefTotal * 0.50).toFixed(2));
    const sefMun = Number((sefTotal - sefProv).toFixed(2));

    const totalProv = Number((basicProv + sefProv).toFixed(2));
    const totalMun = Number((basicMun + sefMun).toFixed(2));
    const totalBrgy = basicBrgy;
    const grandProceedsTotal = Number((totalProv + totalMun + totalBrgy).toFixed(2));

    const disposition = {
        basic: {
            provincial: basicProv,
            municipal: basicMun,
            barangay: basicBrgy,
            total: basicTotal
        },
        sef: {
            provincial: sefProv,
            municipal: sefMun,
            barangay: 0,
            total: sefTotal
        },
        combined: {
            provincial: totalProv,
            municipal: totalMun,
            barangay: totalBrgy,
            total: grandProceedsTotal
        }
    };

    return { rows, totalRow, disposition };
}

const fmt = (num: number) => {
    return (num || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

/**
 * Generate official BLGF Form No. 2 - a (Revised 2002) PDF.
 */
export async function exportRptMonthlyReportPdf(
    payments: any[],
    options: {
        fromDate?: string;
        toDate?: string;
        treasurerName?: string;
        treasurerTitle?: string;
    }
) {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "legal" });
    const PAGE_W = doc.internal.pageSize.getWidth();   // 355.6mm Legal Landscape
    const MARGIN = 8;

    const { rows, totalRow, disposition } = buildBlgfReportData(payments);

    // Period formatting
    let periodStr = format(new Date(), "MMMM, yyyy");
    if (options.fromDate && options.toDate) {
        const fromD = new Date(options.fromDate);
        const toD = new Date(options.toDate);
        if (fromD.getMonth() === toD.getMonth() && fromD.getFullYear() === toD.getFullYear()) {
            periodStr = format(fromD, "MMMM, yyyy");
        } else {
            periodStr = `${format(fromD, "MMM d, yyyy")} to ${format(toD, "MMM d, yyyy")}`;
        }
    } else if (options.fromDate) {
        periodStr = format(new Date(options.fromDate), "MMMM, yyyy");
    }

    // Top-Left Form Code
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(40, 40, 40);
    doc.text("BLGF Form No. 2 - a (Revised 2002)", MARGIN, 9);

    // Centered Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(0, 0, 0);
    doc.text("MUNICIPAL MONTHLY REPORT ON REAL PROPERTY TAX COLLECTIONS", PAGE_W / 2, 14, { align: "center" });

    // Top-Right Metadata Block
    const metaX = PAGE_W - MARGIN - 65;
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.text("Municipality/City of", metaX, 8);
    doc.setFont("helvetica", "bold");
    doc.text("Mapandan", metaX + 32, 8);

    doc.setFont("helvetica", "normal");
    doc.text("Province of", metaX, 11.5);
    doc.setFont("helvetica", "bold");
    doc.text("PANGASINAN", metaX + 32, 11.5);

    doc.setFont("helvetica", "normal");
    doc.text("For the Period of", metaX, 15);
    doc.setFont("helvetica", "bold");
    doc.text(periodStr, metaX + 32, 15);

    doc.setFont("helvetica", "normal");
    doc.text("Rate of Levy", metaX, 18.5);
    doc.text("—", metaX + 32, 18.5);

    doc.setFont("helvetica", "normal");
    doc.text("No. of Brgys.", metaX, 22);
    doc.setFont("helvetica", "bold");
    doc.text("15", metaX + 32, 22);

    // Define 15-column headers matching BLGF Form 2-a
    const head: any[] = [
        [
            { content: "Property Classification", rowSpan: 3, styles: { valign: "middle", halign: "center" } },
            { content: "Basic Real Property Tax", colSpan: 6, styles: { halign: "center" } },
            { content: "Special Education Fund (RA No. 5447)", colSpan: 6, styles: { halign: "center" } },
            { content: "Non\nCash", rowSpan: 3, styles: { valign: "middle", halign: "center" } },
            { content: "Total\nCollections\nBasic & SEF", rowSpan: 3, styles: { valign: "middle", halign: "center" } },
        ],
        [
            { content: "Current Year Collection", colSpan: 2, styles: { halign: "center" } },
            { content: "Previous\nYears", rowSpan: 2, styles: { valign: "middle", halign: "center" } },
            { content: "Penalties", colSpan: 2, styles: { halign: "center" } },
            { content: "TOTAL", rowSpan: 2, styles: { valign: "middle", halign: "center" } },
            { content: "Current Year Collection", colSpan: 2, styles: { halign: "center" } },
            { content: "Previous\nYears", rowSpan: 2, styles: { valign: "middle", halign: "center" } },
            { content: "Penalties", colSpan: 2, styles: { halign: "center" } },
            { content: "TOTAL", rowSpan: 2, styles: { valign: "middle", halign: "center" } },
        ],
        [
            { content: "Net Collections\n(Gross-Disc.)", styles: { halign: "center" } },
            { content: "Discount", styles: { halign: "center" } },
            { content: "Current\nYear", styles: { halign: "center" } },
            { content: "Previous\nYear", styles: { halign: "center" } },
            { content: "Net Collections\n(Gross-Disc.)", styles: { halign: "center" } },
            { content: "Discount", styles: { halign: "center" } },
            { content: "Current\nYear", styles: { halign: "center" } },
            { content: "Previous\nYear", styles: { halign: "center" } },
        ]
    ];

    // Build Table Body
    const body: any[] = [];

    // Rows 1-5: Main classifications
    rows.slice(0, 5).forEach(r => {
        body.push([
            { content: r.label, styles: { fontStyle: "bold" } },
            fmt(r.basicCurrentNet),
            fmt(r.basicDiscount),
            fmt(r.basicPreviousYears),
            fmt(r.basicPenaltyCurrent),
            fmt(r.basicPenaltyPrevious),
            fmt(r.basicTotal),
            fmt(r.sefCurrentNet),
            fmt(r.sefDiscount),
            fmt(r.sefPreviousYears),
            fmt(r.sefPenaltyCurrent),
            fmt(r.sefPenaltyPrevious),
            fmt(r.sefTotal),
            "0.00",
            fmt(r.grandTotal)
        ]);
    });

    // Row 6: Special parent label
    body.push([
        { content: "6. Special", styles: { fontStyle: "bold" } },
        "", "", "", "", "", "", "", "", "", "", "", "", "", ""
    ]);

    // Sub-rows A to E
    rows.slice(5).forEach(r => {
        body.push([
            { content: r.label, styles: { fontStyle: "normal" } },
            fmt(r.basicCurrentNet),
            fmt(r.basicDiscount),
            fmt(r.basicPreviousYears),
            fmt(r.basicPenaltyCurrent),
            fmt(r.basicPenaltyPrevious),
            fmt(r.basicTotal),
            fmt(r.sefCurrentNet),
            fmt(r.sefDiscount),
            fmt(r.sefPreviousYears),
            fmt(r.sefPenaltyCurrent),
            fmt(r.sefPenaltyPrevious),
            fmt(r.sefTotal),
            "0.00",
            fmt(r.grandTotal)
        ]);
    });

    // Total Row
    body.push([
        { content: "Total", styles: { fontStyle: "bold", halign: "center" } },
        { content: fmt(totalRow.basicCurrentNet), styles: { fontStyle: "bold" } },
        { content: fmt(totalRow.basicDiscount), styles: { fontStyle: "bold" } },
        { content: fmt(totalRow.basicPreviousYears), styles: { fontStyle: "bold" } },
        { content: fmt(totalRow.basicPenaltyCurrent), styles: { fontStyle: "bold" } },
        { content: fmt(totalRow.basicPenaltyPrevious), styles: { fontStyle: "bold" } },
        { content: fmt(totalRow.basicTotal), styles: { fontStyle: "bold" } },
        { content: fmt(totalRow.sefCurrentNet), styles: { fontStyle: "bold" } },
        { content: fmt(totalRow.sefDiscount), styles: { fontStyle: "bold" } },
        { content: fmt(totalRow.sefPreviousYears), styles: { fontStyle: "bold" } },
        { content: fmt(totalRow.sefPenaltyCurrent), styles: { fontStyle: "bold" } },
        { content: fmt(totalRow.sefPenaltyPrevious), styles: { fontStyle: "bold" } },
        { content: fmt(totalRow.sefTotal), styles: { fontStyle: "bold" } },
        { content: "0.00", styles: { fontStyle: "bold" } },
        { content: fmt(totalRow.grandTotal), styles: { fontStyle: "bold" } }
    ]);

    // Disposition of Proceeds Section
    body.push([
        { content: "Disposition of Proceeds", styles: { fontStyle: "bold" } },
        { content: "GENERAL FUND", colSpan: 6, styles: { halign: "center", fontStyle: "bold" } },
        { content: "SPECIAL EDUCATIONAL FUND", colSpan: 6, styles: { halign: "center", fontStyle: "bold" } },
        { content: "TOTAL", colSpan: 2, styles: { halign: "center", fontStyle: "bold" } }
    ]);

    body.push([
        { content: "   Provincial Share (35% / 50%)", styles: { fontStyle: "normal" } },
        { content: fmt(disposition.basic.provincial), colSpan: 6, styles: { halign: "center" } },
        { content: fmt(disposition.sef.provincial), colSpan: 6, styles: { halign: "center" } },
        { content: fmt(disposition.combined.provincial), colSpan: 2, styles: { halign: "center", fontStyle: "bold" } }
    ]);

    body.push([
        { content: "   Municipal Share (40% / 50%)", styles: { fontStyle: "normal" } },
        { content: fmt(disposition.basic.municipal), colSpan: 6, styles: { halign: "center" } },
        { content: fmt(disposition.sef.municipal), colSpan: 6, styles: { halign: "center" } },
        { content: fmt(disposition.combined.municipal), colSpan: 2, styles: { halign: "center", fontStyle: "bold" } }
    ]);

    body.push([
        { content: "   Barangay Share (25%)", styles: { fontStyle: "normal" } },
        { content: fmt(disposition.basic.barangay), colSpan: 6, styles: { halign: "center" } },
        { content: "—", colSpan: 6, styles: { halign: "center" } },
        { content: fmt(disposition.combined.barangay), colSpan: 2, styles: { halign: "center", fontStyle: "bold" } }
    ]);

    body.push([
        { content: "TOTAL SHARE", styles: { fontStyle: "bold" } },
        { content: fmt(disposition.basic.total), colSpan: 6, styles: { halign: "center", fontStyle: "bold" } },
        { content: fmt(disposition.sef.total), colSpan: 6, styles: { halign: "center", fontStyle: "bold" } },
        { content: fmt(disposition.combined.total), colSpan: 2, styles: { halign: "center", fontStyle: "bold" } }
    ]);

    autoTable(doc, {
        startY: 25,
        head,
        body,
        theme: "plain",
        styles: {
            fontSize: 6,
            cellPadding: 0.9,
            lineColor: [40, 40, 40],
            lineWidth: 0.15,
            textColor: [0, 0, 0],
            font: "helvetica",
            halign: "right"
        },
        headStyles: {
            fillColor: [248, 250, 252],
            textColor: [0, 0, 0],
            fontStyle: "bold",
            lineWidth: 0.2,
            lineColor: [40, 40, 40],
            valign: "middle"
        },
        columnStyles: {
            0: { halign: "left", cellWidth: 38 },
            1: { cellWidth: 22 },
            2: { cellWidth: 18 },
            3: { cellWidth: 20 },
            4: { cellWidth: 18 },
            5: { cellWidth: 18 },
            6: { cellWidth: 24 },
            7: { cellWidth: 22 },
            8: { cellWidth: 18 },
            9: { cellWidth: 20 },
            10: { cellWidth: 18 },
            11: { cellWidth: 18 },
            12: { cellWidth: 24 },
            13: { cellWidth: 17 },
            14: { cellWidth: 26, fontStyle: "bold" }
        },
        margin: { left: MARGIN, right: MARGIN, bottom: 28 },
    });

    const finalY = (doc as any).lastAutoTable.finalY || 160;

    // Bottom Notes Block (Left)
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.text("Frequency: Monthly / Quarterly", MARGIN, finalY + 4);
    doc.text("Due Dates: Submitted to -", MARGIN, finalY + 7);
    doc.text("1. Provincial Treasurer's Office by the Municipal Treasurer: on or before 10th day of the month immediately following the quarter", MARGIN + 3, finalY + 10);
    doc.text("2. BLGF Regional Office by the city and Provincial Treasurers: on or before 20th day of the month immediately following the quarter", MARGIN + 3, finalY + 13);
    doc.text("3. BLGF Central Office by the Regional Director and City Municipal Treasurer of Metro Manila: On or before end of the month immediately following the quarter", MARGIN + 3, finalY + 16);
    doc.text("No. of Copies: Four (4)", MARGIN, finalY + 20);
    doc.text("1. BLGF Central Office   2. BLGF Regional Office   3. Provincial / City or Metro Manila Municipal Treasurer's Office   4. File", MARGIN + 3, finalY + 23);

    // Bottom Signature Block (Right)
    const sigX = PAGE_W - MARGIN - 60;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text("Certified Correct:", sigX, finalY + 6);

    const treasurerName = options.treasurerName?.trim() || "";
    const treasurerTitle = options.treasurerTitle?.trim() || "Municipal Treasurer";

    if (treasurerName) {
        doc.text(treasurerName.toUpperCase(), sigX + 15, finalY + 18, { align: "center" });
    }
    doc.setLineWidth(0.3);
    doc.line(sigX - 10, finalY + 19, sigX + 40, finalY + 19);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text(treasurerTitle, sigX + 15, finalY + 23, { align: "center" });

    const fileSuffix = options.fromDate && options.toDate ? `${options.fromDate}_to_${options.toDate}` : format(new Date(), "yyyy-MM");
    doc.save(`BLGF_Form_2A_RPT_Monthly_Report_${fileSuffix}.pdf`);
}

/**
 * Generate official BLGF Form No. 2 - a (Revised 2002) Excel spreadsheet.
 */
export async function exportRptMonthlyReportExcel(
    payments: any[],
    options: {
        fromDate?: string;
        toDate?: string;
        treasurerName?: string;
        treasurerTitle?: string;
    }
) {
    const { rows, totalRow, disposition } = buildBlgfReportData(payments);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Treasury Department - Municipality of Mapandan";
    workbook.created = new Date();

    const sheet = workbook.addWorksheet("BLGF Form 2-A", {
        pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 }
    });

    const borderThin: Partial<ExcelJS.Border> = { style: "thin", color: { argb: "FF000000" } };
    const fullBorder: Partial<ExcelJS.Borders> = {
        top: borderThin,
        left: borderThin,
        bottom: borderThin,
        right: borderThin
    };

    // Header metadata
    sheet.getCell("A2").value = "BLGF Form No. 2 - a (Revised 2002)";
    sheet.getCell("A2").font = { name: "Arial", size: 8, italic: true };

    sheet.mergeCells("A4:O4");
    sheet.getCell("A4").value = "MUNICIPAL MONTHLY REPORT ON REAL PROPERTY TAX COLLECTIONS";
    sheet.getCell("A4").font = { name: "Arial", size: 12, bold: true };
    sheet.getCell("A4").alignment = { horizontal: "center", vertical: "middle" };

    // Meta box top right
    let periodStr = format(new Date(), "MMMM, yyyy");
    if (options.fromDate && options.toDate) {
        periodStr = `${options.fromDate} to ${options.toDate}`;
    }

    sheet.getCell("K2").value = "Municipality/City of:";
    sheet.getCell("M2").value = "Mapandan";
    sheet.getCell("M2").font = { bold: true };

    sheet.getCell("K3").value = "Province of:";
    sheet.getCell("M3").value = "PANGASINAN";
    sheet.getCell("M3").font = { bold: true };

    sheet.getCell("K4").value = "For the Period of:";
    sheet.getCell("M4").value = periodStr;
    sheet.getCell("M4").font = { bold: true };

    sheet.getCell("K5").value = "Rate of Levy:";
    sheet.getCell("M5").value = "—";

    sheet.getCell("K6").value = "No. of Brgys.:";
    sheet.getCell("M6").value = "15";
    sheet.getCell("M6").font = { bold: true };

    // Super headers
    sheet.mergeCells("A8:A10");
    sheet.getCell("A8").value = "Property Classification";

    sheet.mergeCells("B8:G8");
    sheet.getCell("B8").value = "Basic Real Property Tax";

    sheet.mergeCells("H8:M8");
    sheet.getCell("H8").value = "Special Education Fund (RA No. 5447)";

    sheet.mergeCells("N8:N10");
    sheet.getCell("N8").value = "Non Cash";

    sheet.mergeCells("O8:O10");
    sheet.getCell("O8").value = "Total Collections Basic & SEF";

    // Sub headers Row 9
    sheet.mergeCells("B9:C9");
    sheet.getCell("B9").value = "Current Year Collection";

    sheet.mergeCells("D9:D10");
    sheet.getCell("D9").value = "Previous Years";

    sheet.mergeCells("E9:F9");
    sheet.getCell("E9").value = "Penalties";

    sheet.mergeCells("G9:G10");
    sheet.getCell("G9").value = "TOTAL";

    sheet.mergeCells("H9:I9");
    sheet.getCell("H9").value = "Current Year Collection";

    sheet.mergeCells("J9:J10");
    sheet.getCell("J9").value = "Previous Years";

    sheet.mergeCells("K9:L9");
    sheet.getCell("K9").value = "Penalties";

    sheet.mergeCells("M9:M10");
    sheet.getCell("M9").value = "TOTAL";

    // Row 10 leaf headers
    sheet.getCell("B10").value = "Net Collections (Gross-Disc.)";
    sheet.getCell("C10").value = "Discount";
    sheet.getCell("E10").value = "Current Year";
    sheet.getCell("F10").value = "Previous Year";

    sheet.getCell("H10").value = "Net Collections (Gross-Disc.)";
    sheet.getCell("I10").value = "Discount";
    sheet.getCell("K10").value = "Current Year";
    sheet.getCell("L10").value = "Previous Year";

    // Style headers
    for (let r = 8; r <= 10; r++) {
        for (let c = 1; c <= 15; c++) {
            const cell = sheet.getRow(r).getCell(c);
            cell.font = { name: "Arial", size: 8, bold: true };
            cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
            cell.border = fullBorder;
        }
    }

    let currentRow = 11;

    const addDataRow = (label: string, r: BlgfClassificationRow, isBold = false) => {
        const row = sheet.getRow(currentRow);
        row.getCell(1).value = label;
        row.getCell(1).alignment = { horizontal: "left", vertical: "middle" };
        row.getCell(2).value = r.basicCurrentNet;
        row.getCell(3).value = r.basicDiscount;
        row.getCell(4).value = r.basicPreviousYears;
        row.getCell(5).value = r.basicPenaltyCurrent;
        row.getCell(6).value = r.basicPenaltyPrevious;
        row.getCell(7).value = r.basicTotal;
        row.getCell(8).value = r.sefCurrentNet;
        row.getCell(9).value = r.sefDiscount;
        row.getCell(10).value = r.sefPreviousYears;
        row.getCell(11).value = r.sefPenaltyCurrent;
        row.getCell(12).value = r.sefPenaltyPrevious;
        row.getCell(13).value = r.sefTotal;
        row.getCell(14).value = 0;
        row.getCell(15).value = r.grandTotal;

        for (let c = 1; c <= 15; c++) {
            const cell = row.getCell(c);
            cell.font = { name: "Arial", size: 8, bold: isBold };
            cell.border = fullBorder;
            if (c > 1) {
                cell.numFmt = "#,##0.00";
                cell.alignment = { horizontal: "right", vertical: "middle" };
            }
        }
        currentRow++;
    };

    // Classifications 1 to 5
    rows.slice(0, 5).forEach(r => addDataRow(r.label, r, false));

    // Special Parent Row
    const specialRow = sheet.getRow(currentRow);
    specialRow.getCell(1).value = "6. Special";
    specialRow.getCell(1).font = { name: "Arial", size: 8, bold: true };
    for (let c = 1; c <= 15; c++) specialRow.getCell(c).border = fullBorder;
    currentRow++;

    // Sub classifications A to E
    rows.slice(5).forEach(r => addDataRow(r.label, r, false));

    // Total Row
    addDataRow("Total", totalRow, true);
    for (let c = 1; c <= 15; c++) {
        sheet.getRow(currentRow - 1).getCell(c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };
    }

    // Disposition of Proceeds
    sheet.mergeCells(`A${currentRow}:A${currentRow}`);
    sheet.getCell(`A${currentRow}`).value = "Disposition of Proceeds";
    sheet.getCell(`A${currentRow}`).font = { name: "Arial", size: 8, bold: true };

    sheet.mergeCells(`B${currentRow}:G${currentRow}`);
    sheet.getCell(`B${currentRow}`).value = "GENERAL FUND";
    sheet.getCell(`B${currentRow}`).alignment = { horizontal: "center" };
    sheet.getCell(`B${currentRow}`).font = { bold: true };

    sheet.mergeCells(`H${currentRow}:M${currentRow}`);
    sheet.getCell(`H${currentRow}`).value = "SPECIAL EDUCATIONAL FUND";
    sheet.getCell(`H${currentRow}`).alignment = { horizontal: "center" };
    sheet.getCell(`H${currentRow}`).font = { bold: true };

    sheet.mergeCells(`N${currentRow}:O${currentRow}`);
    sheet.getCell(`N${currentRow}`).value = "TOTAL";
    sheet.getCell(`N${currentRow}`).alignment = { horizontal: "center" };
    sheet.getCell(`N${currentRow}`).font = { bold: true };

    for (let c = 1; c <= 15; c++) sheet.getRow(currentRow).getCell(c).border = fullBorder;
    currentRow++;

    const addProceedsRow = (label: string, basicVal: number, sefVal: number, totalVal: number, isBold = false) => {
        sheet.getCell(`A${currentRow}`).value = label;
        sheet.mergeCells(`B${currentRow}:G${currentRow}`);
        sheet.getCell(`B${currentRow}`).value = basicVal;
        sheet.getCell(`B${currentRow}`).numFmt = "#,##0.00";
        sheet.getCell(`B${currentRow}`).alignment = { horizontal: "center" };

        sheet.mergeCells(`H${currentRow}:M${currentRow}`);
        sheet.getCell(`H${currentRow}`).value = sefVal;
        sheet.getCell(`H${currentRow}`).numFmt = "#,##0.00";
        sheet.getCell(`H${currentRow}`).alignment = { horizontal: "center" };

        sheet.mergeCells(`N${currentRow}:O${currentRow}`);
        sheet.getCell(`N${currentRow}`).value = totalVal;
        sheet.getCell(`N${currentRow}`).numFmt = "#,##0.00";
        sheet.getCell(`N${currentRow}`).alignment = { horizontal: "center" };

        for (let c = 1; c <= 15; c++) {
            const cell = sheet.getRow(currentRow).getCell(c);
            cell.font = { name: "Arial", size: 8, bold: isBold };
            cell.border = fullBorder;
        }
        currentRow++;
    };

    addProceedsRow("   Provincial Share (35% / 50%)", disposition.basic.provincial, disposition.sef.provincial, disposition.combined.provincial);
    addProceedsRow("   Municipal Share (40% / 50%)", disposition.basic.municipal, disposition.sef.municipal, disposition.combined.municipal);
    addProceedsRow("   Barangay Share (25%)", disposition.basic.barangay, 0, disposition.combined.barangay);
    addProceedsRow("TOTAL SHARE", disposition.basic.total, disposition.sef.total, disposition.combined.total, true);

    // Certified Correct Signature Block (Right)
    const sigStartRow = currentRow + 2;
    sheet.getCell(`K${sigStartRow}`).value = "Certified Correct:";
    sheet.getCell(`K${sigStartRow}`).font = { name: "Arial", size: 8, bold: true };

    const treasurerName = options.treasurerName?.trim() || "";
    const treasurerTitle = options.treasurerTitle?.trim() || "Municipal Treasurer";

    const nameRow = sigStartRow + 2;
    sheet.mergeCells(`K${nameRow}:O${nameRow}`);
    sheet.getCell(`K${nameRow}`).value = treasurerName ? treasurerName.toUpperCase() : "_________________________________________";
    sheet.getCell(`K${nameRow}`).font = { name: "Arial", size: 8, bold: true };
    sheet.getCell(`K${nameRow}`).alignment = { horizontal: "center" };

    const titleRow = sigStartRow + 3;
    sheet.mergeCells(`K${titleRow}:O${titleRow}`);
    sheet.getCell(`K${titleRow}`).value = treasurerTitle;
    sheet.getCell(`K${titleRow}`).font = { name: "Arial", size: 8, italic: true };
    sheet.getCell(`K${titleRow}`).alignment = { horizontal: "center" };

    // Column Widths
    sheet.getColumn(1).width = 28;
    for (let c = 2; c <= 15; c++) {
        sheet.getColumn(c).width = 14;
    }

    // Write file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const fileSuffix = options.fromDate && options.toDate ? `${options.fromDate}_to_${options.toDate}` : format(new Date(), "yyyy-MM");
    link.download = `BLGF_Form_2A_RPT_Monthly_Report_${fileSuffix}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
}
