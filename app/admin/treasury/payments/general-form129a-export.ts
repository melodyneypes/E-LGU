import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import { format } from "date-fns";

export interface Form129APaymentData {
    date: string;
    receiptNo: string;

    // TAX ON BUSINESS
    taxDelivery: number;         // 318 - (1) Tax on Delivery & V (P.O. 83-99)
    businessTax: number;         // 582 - (2) Business Tax
    finesBusinessTax: number;    // 599 - (3) Fines & Penalties - Business Tax
    transferTax: number;         // 418 - (4) OTHER TAXES: Transfer Tax/Prof Tax

    // REGULATORY FEES (Permits & Licenses)
    weightsMeasures: number;     // 601 - (7) Weights & Measures
    mtop: number;                // 604 - (8) Tricycle Ope. Permit Fees (MTOP)
    mayorsPermit: number;        // 601 - (9) Mayor's Permit
    buildingPermit: number;      // 605 - (9) Permit Fees under the building code
    occupationFee: number;       // 605 - (11) Occupation Fee
    zoningFee: number;           // 605 - (15) ZONING FEE
    registrationFees: number;    // 606 - (13) REGISTRATION FEES
    civilRegistryCert: number;   // 606 - (16) Birth, Death, Marriage Cert.
    inspectionFees: number;      // 617 - (14) Inspection Fees (including PD 1185)

    // SERVICE USER CHARGES
    cedulaCon: number;           // 415 - (12) Con (Community Tax / Cedula)
    policeClearance: number;     // 613 - (17) Police Clearance
    clearanceCert: number;       // 613 - (18) Clearance/Cert
    garbageFees: number;         // 616 - (19) Garbage Fees
    otherServiceIncome: number;  // 628 - (19a) Other Service Income

    // RECEIPTS FROM ECONOMIC ENT.
    marketReceipts: number;      // 636 - (20) Receipts from Markets
    slaughterhouseReceipts: number; // 637 - (21) Receipts from Slaughterhouse
    cemeteryReceipts: number;    // 633 - (22) Receipts from Cemeteries
    otherReceiptsPenMkt: number; // 649 - (25) Other Receipts / Pen-Mkt

    // OTHER RECEIPTS
    miscIncome: number;          // 678 - (23) Miscellaneous Income
    otherFinesPenalties: number; // 679 - (24) Other Fines / Penalties
    dst: number;                 // 416 - (26) Documentary Stamp Tax (DST)
    bldgPermitShare: number;     // 416 - (27) 20% Share from Bldg Permit
    brgyClearanceShare: number;  // 416 - (27) 50% BRGY SHARE CLEARANCE
    pcsoLottoShare: number;      // 670 - (28) Share from PCSO / Lotto

    // TOTAL
    total: number;
}

/**
 * Maps any non-RPT general collection payment record into the official Provincial Form No. 129 (A) schema.
 */
export function mapPaymentToForm129A(p: any): Form129APaymentData {
    const additional = typeof p.transaction?.additionalData === "string"
        ? (() => { try { return JSON.parse(p.transaction.additionalData); } catch { return {}; } })()
        : (p.transaction?.additionalData || {});

    const fiscal = typeof p.transaction?.fiscalSnapshot === "string"
        ? (() => { try { return JSON.parse(p.transaction.fiscalSnapshot); } catch { return {}; } })()
        : (p.transaction?.fiscalSnapshot || {});

    const rawDate = p.createdAt ? new Date(p.createdAt) : new Date();
    // Image 2 format: MM dd yy (e.g. 08 03 26) or standard MM/dd/yy
    const dateFormatted = format(rawDate, "MM/dd/yy");

    const receiptNo = String(p.orNumber || additional.orSeriesNumber || p.reference || "—");
    const totalCollected = Number(p.amount || 0);

    const typeCode = String(p.transaction?.type?.code || "").toUpperCase();
    const typeName = String(p.transaction?.type?.name || "").toUpperCase();
    const typeCat = String(p.transaction?.type?.category || "").toUpperCase();

    // Initialize all 28 breakdown columns
    const taxDelivery = 0;
    let businessTax = 0;
    let finesBusinessTax = 0;
    const transferTax = 0;
    let weightsMeasures = 0;
    let mtop = 0;
    let mayorsPermit = 0;
    let buildingPermit = 0;
    let occupationFee = 0;
    let zoningFee = 0;
    let registrationFees = 0;
    let civilRegistryCert = 0;
    let inspectionFees = 0;
    let cedulaCon = 0;
    let policeClearance = 0;
    let clearanceCert = 0;
    let garbageFees = 0;
    let otherServiceIncome = 0;
    let marketReceipts = 0;
    let slaughterhouseReceipts = 0;
    let cemeteryReceipts = 0;
    const otherReceiptsPenMkt = 0;
    const miscIncome = 0;
    let otherFinesPenalties = 0;
    let dst = 0;
    let bldgPermitShare = 0;
    let brgyClearanceShare = 0;
    const pcsoLottoShare = 0;

    // 1. Process itemized line items if present (from fiscalSnapshot or additionalData)
    const lineItems: any[] = fiscal?.lineItems || additional?.lineItems || additional?.feeBreakdown || [];
    let itemsMapped = false;

    if (Array.isArray(lineItems) && lineItems.length > 0) {
        itemsMapped = true;
        for (const item of lineItems) {
            const itemLabel = String(item.label || item.name || item.description || "").toLowerCase();
            const itemAmt = Number(item.amount || item.total || item.fee || 0);
            if (itemAmt <= 0) continue;

            if (itemLabel.includes("mayor") || (itemLabel.includes("permit") && !itemLabel.includes("building") && !itemLabel.includes("occupancy") && !itemLabel.includes("mtop"))) {
                mayorsPermit += itemAmt;
            } else if (itemLabel.includes("business tax") || itemLabel.includes("gross sales")) {
                businessTax += itemAmt;
            } else if (itemLabel.includes("garbage")) {
                garbageFees += itemAmt;
            } else if (itemLabel.includes("sanitary") || itemLabel.includes("inspection") || itemLabel.includes("fire") || itemLabel.includes("pd 1185")) {
                inspectionFees += itemAmt;
            } else if (itemLabel.includes("dst") || itemLabel.includes("documentary stamp")) {
                dst += itemAmt;
            } else if (itemLabel.includes("clearance") || itemLabel.includes("certificate") || itemLabel.includes("health")) {
                clearanceCert += itemAmt;
            } else if (itemLabel.includes("zoning")) {
                zoningFee += itemAmt;
            } else if (itemLabel.includes("building") || itemLabel.includes("occupancy")) {
                buildingPermit += itemAmt;
            } else if (itemLabel.includes("occupation")) {
                occupationFee += itemAmt;
            } else if (itemLabel.includes("cedula") || itemLabel.includes("community tax")) {
                cedulaCon += itemAmt;
            } else if (itemLabel.includes("market") || itemLabel.includes("stall")) {
                marketReceipts += itemAmt;
            } else if (itemLabel.includes("slaughter")) {
                slaughterhouseReceipts += itemAmt;
            } else if (itemLabel.includes("cemetery") || itemLabel.includes("burial")) {
                cemeteryReceipts += itemAmt;
            } else if (itemLabel.includes("tricycle") || itemLabel.includes("mtop")) {
                mtop += itemAmt;
            } else if (itemLabel.includes("penalty") || itemLabel.includes("surcharge") || itemLabel.includes("fine")) {
                if (typeCode.startsWith("BUSINESS_PERMIT")) finesBusinessTax += itemAmt;
                else otherFinesPenalties += itemAmt;
            } else if (itemLabel.includes("delivery")) {
                otherServiceIncome += itemAmt;
            } else {
                otherServiceIncome += itemAmt;
            }
        }
    }

    // 2. If lineItems were not present, inspect structured fields from fiscalSnapshot or transaction type
    if (!itemsMapped) {
        if (typeCode.startsWith("CEDULA") || typeCat.includes("CEDULA") || typeName.includes("COMMUNITY TAX") || typeName.includes("CEDULA")) {
            // Cedula / Community Tax -> Col 16 (Con 415)
            cedulaCon = totalCollected;
        } else if (typeCode.startsWith("BUSINESS_PERMIT") || typeCat.includes("BUSINESS") || typeName.includes("BUSINESS PERMIT")) {
            // Business Permit
            if (fiscal?.basicTax || fiscal?.additionalTax || fiscal?.sanitaryFee || fiscal?.garbageFee) {
                mayorsPermit = Number(fiscal.basicTax || 0);
                businessTax = Number(fiscal.additionalTax || 0);
                inspectionFees = Number(fiscal.sanitaryFee || 0);
                garbageFees = Number(fiscal.garbageFee || 0);
                clearanceCert = Number(fiscal.healthCertificateFee || 0);
                otherServiceIncome = Number(fiscal.deliveryFee || 0);

                const currentSubtotal = mayorsPermit + businessTax + inspectionFees + garbageFees + clearanceCert + otherServiceIncome;
                if (currentSubtotal < totalCollected) {
                    businessTax += (totalCollected - currentSubtotal);
                }
            } else {
                // If single lump sum, standard breakdown: base Mayor's permit, balance to business tax
                const estimatedMayor = Math.min(totalCollected, 500);
                mayorsPermit = estimatedMayor;
                businessTax = Math.max(0, totalCollected - estimatedMayor);
            }
        } else if (typeCode.startsWith("LCR_") || typeCat.includes("CIVIL") || typeName.includes("CERTIFICATE") || typeName.includes("REGISTRY") || typeName.includes("PSA")) {
            // Civil Registry
            if (typeCode.includes("_REG")) {
                // Registration fee -> Col 13
                registrationFees = totalCollected;
            } else {
                // Birth, Death, Marriage Cert + DST
                // Standard LGU civil registry fee: 200 cert + 30 DST = 230, or 100 cert + 30 DST = 130
                if (totalCollected >= 130) {
                    dst = 30;
                    civilRegistryCert = totalCollected - 30;
                } else {
                    civilRegistryCert = totalCollected;
                }
            }
        } else if (typeCode.startsWith("BUILDING") || typeCode.startsWith("OCCUPANCY") || typeCat.includes("ENGINEERING") || typeName.includes("BUILDING") || typeName.includes("OCCUPANCY")) {
            // Building & Occupancy Permits
            const share20 = Number(additional?.bldgPermitShare || 0);
            if (share20 > 0 && share20 < totalCollected) {
                bldgPermitShare = share20;
                buildingPermit = totalCollected - share20;
            } else {
                buildingPermit = totalCollected;
            }
        } else if (typeCode.startsWith("POSO") || typeCat.includes("POSO") || typeName.includes("TRAFFIC") || typeName.includes("CITATION")) {
            // Traffic Citations / Fines -> Col 26
            otherFinesPenalties = totalCollected;
        } else if (typeCat.includes("MARKET") || typeName.includes("MARKET") || typeName.includes("STALL") || typeName.includes("DAILY TICKET")) {
            // Markets -> Col 21
            marketReceipts = totalCollected;
        } else if (typeName.includes("SLAUGHTER")) {
            // Slaughterhouse -> Col 22
            slaughterhouseReceipts = totalCollected;
        } else if (typeName.includes("CEMETERY") || typeName.includes("BURIAL")) {
            // Cemeteries -> Col 23
            cemeteryReceipts = totalCollected;
        } else if (typeName.includes("POLICE")) {
            // Police Clearance -> Col 17
            policeClearance = totalCollected;
        } else if (typeName.includes("BARANGAY CLEARANCE") || typeName.includes("BRGY CLEARANCE")) {
            // Clearance/Cert -> Col 18 + Col 29 (50% Brgy share)
            const brgyShare = totalCollected * 0.5;
            brgyClearanceShare = brgyShare;
            clearanceCert = totalCollected - brgyShare;
        } else if (typeName.includes("TRICYCLE") || typeName.includes("MTOP")) {
            // Tricycle MTOP -> Col 8
            mtop = totalCollected;
        } else if (typeName.includes("WEIGHT") || typeName.includes("MEASURE")) {
            // Weights & Measures -> Col 7
            weightsMeasures = totalCollected;
        } else {
            // Fallback general service fee -> Col 20 (Other Service Income)
            otherServiceIncome = totalCollected;
        }
    }

    // Mathematical consistency check: Ensure sum of columns strictly matches totalCollected
    const currentSum = (
        taxDelivery + businessTax + finesBusinessTax + transferTax +
        weightsMeasures + mtop + mayorsPermit + buildingPermit + occupationFee +
        zoningFee + registrationFees + civilRegistryCert + inspectionFees +
        cedulaCon + policeClearance + clearanceCert + garbageFees + otherServiceIncome +
        marketReceipts + slaughterhouseReceipts + cemeteryReceipts + otherReceiptsPenMkt +
        miscIncome + otherFinesPenalties + dst + bldgPermitShare + brgyClearanceShare + pcsoLottoShare
    );

    const diff = totalCollected - currentSum;
    if (Math.abs(diff) > 0.001) {
        // Adjust the difference into otherServiceIncome
        otherServiceIncome = Math.max(0, otherServiceIncome + diff);
    }

    return {
        date: dateFormatted,
        receiptNo,
        taxDelivery,
        businessTax,
        finesBusinessTax,
        transferTax,
        weightsMeasures,
        mtop,
        mayorsPermit,
        buildingPermit,
        occupationFee,
        zoningFee,
        registrationFees,
        civilRegistryCert,
        inspectionFees,
        cedulaCon,
        policeClearance,
        clearanceCert,
        garbageFees,
        otherServiceIncome,
        marketReceipts,
        slaughterhouseReceipts,
        cemeteryReceipts,
        otherReceiptsPenMkt,
        miscIncome,
        otherFinesPenalties,
        dst,
        bldgPermitShare,
        brgyClearanceShare,
        pcsoLottoShare,
        total: totalCollected
    };
}

/**
 * Format number to 2 decimals, or empty string if 0 (matches official blank cell look in Form 129A).
 */
const fmtOrBlank = (num: number): string => {
    if (!num || Math.abs(num) < 0.001) return "";
    return num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const fmtAlways = (num: number): string => {
    return (num || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export interface Form129AExportOptions {
    fromDate?: string;
    toDate?: string;
    treasurerName?: string;
    treasurerTitle?: string;
}

/**
 * Generate official Provincial Form No. 129 (A) PDF (Abstract of General Collections).
 */
export async function exportForm129APdf(
    payments: any[],
    options: Form129AExportOptions
) {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "legal" });
    const PAGE_W = doc.internal.pageSize.getWidth();   // 355.6mm (Official Legal Landscape)
    const PAGE_H = doc.internal.pageSize.getHeight();  // 215.9mm
    const MARGIN = 6;

    const dataRows = payments.map(mapPaymentToForm129A);

    // Period label
    let fromFormatted = "01 Jan " + format(new Date(), "yyyy");
    let toFormatted = format(new Date(), "dd MMM yyyy");
    let periodDateRange = `${fromFormatted} to ${toFormatted}`;

    if (options.fromDate && options.toDate) {
        fromFormatted = format(new Date(options.fromDate), "dd MMM yyyy");
        toFormatted = format(new Date(options.toDate), "dd MMM yyyy");
        periodDateRange = `${fromFormatted} to ${toFormatted}`;
    } else if (options.fromDate) {
        fromFormatted = format(new Date(options.fromDate), "dd MMM yyyy");
        periodDateRange = `From ${fromFormatted}`;
    }

    // Top Left: Provincial Form No. 129 (A)
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(50, 50, 50);
    doc.text("Provincial Form No. 129 (A)", MARGIN, 8);

    // Top Right: Date Range
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text(periodDateRange, PAGE_W - MARGIN, 8, { align: "right" });

    // Centered Title Block
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(0, 0, 0);
    doc.text("ABSTRACT OF GENERAL COLLECTIONS", PAGE_W / 2, 13, { align: "center" });

    // Subtitle with Municipal Treasurer name (defaults to official or configured signatory)
    const treasurerDisplay = options.treasurerName?.trim() || "Teresita S. Eden";
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.2);
    const subTitle = `Of ${treasurerDisplay}, Municipal Treasurer, Municipality of MAPANDAN, Province of Pangasinan made during the period from ${periodDateRange}`;
    doc.text(subTitle, PAGE_W / 2, 17.5, { align: "center" });

    const currentY = 21;

    // Build Table Body
    const tableBody = dataRows.map((r) => [
        r.date,
        r.receiptNo,
        fmtOrBlank(r.taxDelivery),
        fmtOrBlank(r.businessTax),
        fmtOrBlank(r.finesBusinessTax),
        fmtOrBlank(r.transferTax),
        fmtOrBlank(r.weightsMeasures),
        fmtOrBlank(r.mtop),
        fmtOrBlank(r.mayorsPermit),
        fmtOrBlank(r.buildingPermit),
        fmtOrBlank(r.occupationFee),
        fmtOrBlank(r.zoningFee),
        fmtOrBlank(r.registrationFees),
        fmtOrBlank(r.civilRegistryCert),
        fmtOrBlank(r.inspectionFees),
        fmtOrBlank(r.cedulaCon),
        fmtOrBlank(r.policeClearance),
        fmtOrBlank(r.clearanceCert),
        fmtOrBlank(r.garbageFees),
        fmtOrBlank(r.otherServiceIncome),
        fmtOrBlank(r.marketReceipts),
        fmtOrBlank(r.slaughterhouseReceipts),
        fmtOrBlank(r.cemeteryReceipts),
        fmtOrBlank(r.otherReceiptsPenMkt),
        fmtOrBlank(r.miscIncome),
        fmtOrBlank(r.otherFinesPenalties),
        fmtOrBlank(r.dst),
        fmtOrBlank(r.bldgPermitShare),
        fmtOrBlank(r.brgyClearanceShare),
        fmtOrBlank(r.pcsoLottoShare),
        fmtAlways(r.total)
    ]);

    // Compute Totals
    const totTaxDelivery = dataRows.reduce((s, r) => s + r.taxDelivery, 0);
    const totBusinessTax = dataRows.reduce((s, r) => s + r.businessTax, 0);
    const totFinesBusinessTax = dataRows.reduce((s, r) => s + r.finesBusinessTax, 0);
    const totTransferTax = dataRows.reduce((s, r) => s + r.transferTax, 0);
    const totWeightsMeasures = dataRows.reduce((s, r) => s + r.weightsMeasures, 0);
    const totMtop = dataRows.reduce((s, r) => s + r.mtop, 0);
    const totMayorsPermit = dataRows.reduce((s, r) => s + r.mayorsPermit, 0);
    const totBuildingPermit = dataRows.reduce((s, r) => s + r.buildingPermit, 0);
    const totOccupationFee = dataRows.reduce((s, r) => s + r.occupationFee, 0);
    const totZoningFee = dataRows.reduce((s, r) => s + r.zoningFee, 0);
    const totRegistrationFees = dataRows.reduce((s, r) => s + r.registrationFees, 0);
    const totCivilRegistryCert = dataRows.reduce((s, r) => s + r.civilRegistryCert, 0);
    const totInspectionFees = dataRows.reduce((s, r) => s + r.inspectionFees, 0);
    const totCedulaCon = dataRows.reduce((s, r) => s + r.cedulaCon, 0);
    const totPoliceClearance = dataRows.reduce((s, r) => s + r.policeClearance, 0);
    const totClearanceCert = dataRows.reduce((s, r) => s + r.clearanceCert, 0);
    const totGarbageFees = dataRows.reduce((s, r) => s + r.garbageFees, 0);
    const totOtherServiceIncome = dataRows.reduce((s, r) => s + r.otherServiceIncome, 0);
    const totMarketReceipts = dataRows.reduce((s, r) => s + r.marketReceipts, 0);
    const totSlaughterhouseReceipts = dataRows.reduce((s, r) => s + r.slaughterhouseReceipts, 0);
    const totCemeteryReceipts = dataRows.reduce((s, r) => s + r.cemeteryReceipts, 0);
    const totOtherReceiptsPenMkt = dataRows.reduce((s, r) => s + r.otherReceiptsPenMkt, 0);
    const totMiscIncome = dataRows.reduce((s, r) => s + r.miscIncome, 0);
    const totOtherFinesPenalties = dataRows.reduce((s, r) => s + r.otherFinesPenalties, 0);
    const totDst = dataRows.reduce((s, r) => s + r.dst, 0);
    const totBldgPermitShare = dataRows.reduce((s, r) => s + r.bldgPermitShare, 0);
    const totBrgyClearanceShare = dataRows.reduce((s, r) => s + r.brgyClearanceShare, 0);
    const totPcsoLottoShare = dataRows.reduce((s, r) => s + r.pcsoLottoShare, 0);
    const totGrandTotal = dataRows.reduce((s, r) => s + r.total, 0);

    const tableFoot = [[
        { content: "TOTAL", colSpan: 2, styles: { halign: "center", fontStyle: "bold" } },
        fmtAlways(totTaxDelivery),
        fmtAlways(totBusinessTax),
        fmtAlways(totFinesBusinessTax),
        fmtAlways(totTransferTax),
        fmtAlways(totWeightsMeasures),
        fmtAlways(totMtop),
        fmtAlways(totMayorsPermit),
        fmtAlways(totBuildingPermit),
        fmtAlways(totOccupationFee),
        fmtAlways(totZoningFee),
        fmtAlways(totRegistrationFees),
        fmtAlways(totCivilRegistryCert),
        fmtAlways(totInspectionFees),
        fmtAlways(totCedulaCon),
        fmtAlways(totPoliceClearance),
        fmtAlways(totClearanceCert),
        fmtAlways(totGarbageFees),
        fmtAlways(totOtherServiceIncome),
        fmtAlways(totMarketReceipts),
        fmtAlways(totSlaughterhouseReceipts),
        fmtAlways(totCemeteryReceipts),
        fmtAlways(totOtherReceiptsPenMkt),
        fmtAlways(totMiscIncome),
        fmtAlways(totOtherFinesPenalties),
        fmtAlways(totDst),
        fmtAlways(totBldgPermitShare),
        fmtAlways(totBrgyClearanceShare),
        fmtAlways(totPcsoLottoShare),
        fmtAlways(totGrandTotal)
    ]];

    autoTable(doc, {
        startY: currentY,
        tableWidth: 343.6,
        margin: { left: MARGIN, right: MARGIN, top: MARGIN, bottom: 12 },
        head: [
            // Row 1: Super-Headers (Matching Official Provincial Form No. 129 (A))
            [
                { content: "DATE", rowSpan: 3, styles: { valign: "middle", halign: "center" } },
                { content: "O.R. #", rowSpan: 3, styles: { valign: "middle", halign: "center" } },
                { content: "TAX ON BUSINESS", colSpan: 3, styles: { halign: "center" } },
                { content: "OTHER TAXES", colSpan: 1, styles: { halign: "center" } },
                { content: "REGULATORY FEES (Permits & Licenses)", colSpan: 9, styles: { halign: "center" } },
                { content: "SERVICE USER CHARGES", colSpan: 4, styles: { halign: "center" } },
                { content: "Other Service\nIncome", rowSpan: 2, styles: { valign: "middle", halign: "center" } },
                { content: "RECEIPTS FROM ECONOMIC ENT.", colSpan: 4, styles: { halign: "center" } },
                { content: "OTHER RECEIPTS", colSpan: 2, styles: { halign: "center" } },
                { content: "Documentary\nStamp Tax\n(DST)", rowSpan: 2, styles: { valign: "middle", halign: "center" } },
                { content: "20% Share\nfrom Bldg\nPermit", rowSpan: 2, styles: { valign: "middle", halign: "center" } },
                { content: "50% BRGY\nSHARE\nCLEARANCE", rowSpan: 2, styles: { valign: "middle", halign: "center" } },
                { content: "Share from\nPCSO / Lotto", rowSpan: 2, styles: { valign: "middle", halign: "center" } },
                { content: "TOTAL", rowSpan: 3, styles: { valign: "middle", halign: "center" } }
            ],
            // Row 2: Sub-Headers (Column Accounts - All Complete Official Titles)
            [
                { content: "Tax on Delivery T & V\n(P.O. 82-99)", styles: { halign: "center" } },
                { content: "Business\nTax", styles: { halign: "center" } },
                { content: "Fines &\nPenalties -\nBusiness Tax", styles: { halign: "center" } },
                { content: "Transfer Tax/\nProf Tax", styles: { halign: "center" } },
                { content: "Weights &\nMeasures", styles: { halign: "center" } },
                { content: "Tricycle Ope.\nPermit Fees\n(MTOP)", styles: { halign: "center" } },
                { content: "Mayor's\nPermit", styles: { halign: "center" } },
                { content: "Permit Fees\nunder the\nbuilding code", styles: { halign: "center" } },
                { content: "Occupational\nFees", styles: { halign: "center" } },
                { content: "ZONING\nFEE", styles: { halign: "center" } },
                { content: "REGISTRATION\nFEES", styles: { halign: "center" } },
                { content: "Birth, Death,\nMarriage Cert.", styles: { halign: "center" } },
                { content: "Inspection Fees\n(incldg PD 1185)", styles: { halign: "center" } },
                { content: "Code 153\n(Cedula)", styles: { halign: "center" } },
                { content: "Police\nClearance", styles: { halign: "center" } },
                { content: "Clearance/\nCert. Fees", styles: { halign: "center" } },
                { content: "Garbage\nFees", styles: { halign: "center" } },
                { content: "Receipts from\nMarkets", styles: { halign: "center" } },
                { content: "Receipts from\nSlaughterhouse", styles: { halign: "center" } },
                { content: "Receipts from\nCemeteries", styles: { halign: "center" } },
                { content: "Other Fines/\nPen-Mkt", styles: { halign: "center" } },
                { content: "Miscellaneous\nIncome", styles: { halign: "center" } },
                { content: "Other Fines/\nPen", styles: { halign: "center" } }
            ],
            // Row 3: Account Codes and Official Column Numbers
            [
                { content: "418\n(1)", styles: { halign: "center" } },
                { content: "582\n(2)", styles: { halign: "center" } },
                { content: "599\n(3)", styles: { halign: "center" } },
                { content: "418\n(4)", styles: { halign: "center" } },
                { content: "601\n(7)", styles: { halign: "center" } },
                { content: "604\n(8)", styles: { halign: "center" } },
                { content: "605\n(9)", styles: { halign: "center" } },
                { content: "605\n(9)", styles: { halign: "center" } },
                { content: "605\n(11)", styles: { halign: "center" } },
                { content: "605\n(15)", styles: { halign: "center" } },
                { content: "606\n(13)", styles: { halign: "center" } },
                { content: "606\n(16)", styles: { halign: "center" } },
                { content: "617\n(14)", styles: { halign: "center" } },
                { content: "415\n(12)", styles: { halign: "center" } },
                { content: "613\n(17)", styles: { halign: "center" } },
                { content: "613\n(18)", styles: { halign: "center" } },
                { content: "616\n(19)", styles: { halign: "center" } },
                { content: "628\n(19a)", styles: { halign: "center" } },
                { content: "636\n(20)", styles: { halign: "center" } },
                { content: "637\n(21)", styles: { halign: "center" } },
                { content: "633\n(22)", styles: { halign: "center" } },
                { content: "649\n(25)", styles: { halign: "center" } },
                { content: "678\n(23)", styles: { halign: "center" } },
                { content: "679\n(24)", styles: { halign: "center" } },
                { content: "416\n(26)", styles: { halign: "center" } },
                { content: "416\n(27)", styles: { halign: "center" } },
                { content: "416\n(27)", styles: { halign: "center" } },
                { content: "670\n(28)", styles: { halign: "center" } }
            ]
        ],
        body: tableBody as any,
        foot: tableFoot as any,
        theme: "grid",
        styles: {
            fontSize: 4.8,
            cellPadding: { top: 0.5, bottom: 0.5, left: 0.3, right: 0.3 },
            font: "helvetica",
            lineColor: [40, 40, 40],
            lineWidth: 0.1,
            textColor: [0, 0, 0],
            overflow: "linebreak",
            fillColor: [255, 255, 255],
        },
        headStyles: {
            fillColor: [255, 255, 255],
            textColor: [0, 0, 0],
            fontStyle: "bold",
            fontSize: 3.8,
            cellPadding: { top: 0.6, bottom: 0.6, left: 0.25, right: 0.25 },
            lineColor: [40, 40, 40],
            lineWidth: 0.12,
            overflow: "linebreak",
            valign: "middle"
        },
        footStyles: {
            fillColor: [255, 255, 255],
            textColor: [0, 0, 0],
            fontStyle: "bold",
            fontSize: 4.8,
            lineColor: [40, 40, 40],
            lineWidth: 0.12,
        },
        columnStyles: {
            0: { cellWidth: 12.5, halign: "center" }, // Date
            1: { cellWidth: 14, halign: "center" },   // O.R. #
            2: { cellWidth: 11, halign: "right" },    // Tax Delivery T & V
            3: { cellWidth: 11.5, halign: "right" },  // Business Tax
            4: { cellWidth: 11, halign: "right" },    // Fines Business Tax
            5: { cellWidth: 11, halign: "right" },    // Transfer Tax
            6: { cellWidth: 10.5, halign: "right" },  // Weights & Measures
            7: { cellWidth: 11, halign: "right" },    // MTOP
            8: { cellWidth: 11, halign: "right" },    // Mayor's Permit
            9: { cellWidth: 11, halign: "right" },    // Building Code
            10: { cellWidth: 10.5, halign: "right" }, // Occupational Fees
            11: { cellWidth: 10, halign: "right" },   // Zoning Fee
            12: { cellWidth: 11, halign: "right" },   // Registration Fees
            13: { cellWidth: 11.5, halign: "right" }, // Birth, Death, Marriage Cert
            14: { cellWidth: 11.5, halign: "right" }, // Inspection Fees
            15: { cellWidth: 11, halign: "right" },   // Code 153 (Cedula)
            16: { cellWidth: 10.5, halign: "right" }, // Police Clearance
            17: { cellWidth: 11, halign: "right" },   // Clearance/Cert. Fees
            18: { cellWidth: 10.5, halign: "right" }, // Garbage Fees
            19: { cellWidth: 11, halign: "right" },   // Other Service Income
            20: { cellWidth: 11, halign: "right" },   // Markets
            21: { cellWidth: 11.5, halign: "right" }, // Slaughterhouse
            22: { cellWidth: 11, halign: "right" },   // Cemeteries
            23: { cellWidth: 11, halign: "right" },   // Other Fines Pen-Mkt
            24: { cellWidth: 11.5, halign: "right" }, // Misc Income
            25: { cellWidth: 10.5, halign: "right" }, // Other Fines Pen
            26: { cellWidth: 11.5, halign: "right" }, // DST
            27: { cellWidth: 11, halign: "right" },   // 20% Bldg Permit Share
            28: { cellWidth: 11.5, halign: "right" }, // 50% Brgy Clearance Share
            29: { cellWidth: 10.5, halign: "right" }, // PCSO Lotto Share
        }
    });

    // Pagination & Date printed footer
    const pageCount = (doc.internal as any).getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(6.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(80, 80, 80);
        doc.text(format(new Date(), "EEEE, dd MMMM yyyy"), MARGIN, PAGE_H - 4.5);
        doc.text(`Page ${i} of ${pageCount}`, PAGE_W - MARGIN, PAGE_H - 4.5, { align: "right" });
    }

    const fileSuffix = options.fromDate && options.toDate ? `${options.fromDate}_to_${options.toDate}` : format(new Date(), "yyyy-MM-dd");
    doc.save(`Prov_Form_129A_General_Collections_${fileSuffix}.pdf`);
}

/**
 * Generate official Provincial Form No. 129 (A) Excel (Abstract of General Collections).
 */
export async function exportForm129AExcel(
    payments: any[],
    options: Form129AExportOptions
) {
    const dataRows = payments.map(mapPaymentToForm129A);

    let fromFormatted = "01 Jan " + format(new Date(), "yyyy");
    let toFormatted = format(new Date(), "dd MMM yyyy");
    let periodDateRange = `${fromFormatted} to ${toFormatted}`;

    if (options.fromDate && options.toDate) {
        fromFormatted = format(new Date(options.fromDate), "dd MMM yyyy");
        toFormatted = format(new Date(options.toDate), "dd MMM yyyy");
        periodDateRange = `${fromFormatted} to ${toFormatted}`;
    } else if (options.fromDate) {
        fromFormatted = format(new Date(options.fromDate), "dd MMM yyyy");
        periodDateRange = `From ${fromFormatted}`;
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Treasury Department - Municipality of Mapandan";
    workbook.created = new Date();

    const sheet = workbook.addWorksheet("General Collections", {
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
    sheet.getCell("A2").value = "Provincial Form No. 129 (A)";
    sheet.getCell("A2").font = { name: "Arial", size: 9, bold: true };

    sheet.getCell("AE2").value = periodDateRange;
    sheet.getCell("AE2").font = { name: "Arial", size: 9, bold: true };
    sheet.getCell("AE2").alignment = { horizontal: "right", vertical: "middle" };

    sheet.mergeCells("A3:AE3");
    sheet.getCell("A3").value = "ABSTRACT OF GENERAL COLLECTIONS";
    sheet.getCell("A3").font = { name: "Arial", size: 12, bold: true };
    sheet.getCell("A3").alignment = { horizontal: "center", vertical: "middle" };

    const treasurerDisplay = options.treasurerName?.trim() || "Teresita S. Eden";
    sheet.mergeCells("A4:AE4");
    sheet.getCell("A4").value = `Of ${treasurerDisplay}, Municipal Treasurer, Municipality of MAPANDAN, Province of Pangasinan made during the period from ${periodDateRange}`;
    sheet.getCell("A4").font = { name: "Arial", size: 10 };
    sheet.getCell("A4").alignment = { horizontal: "center", vertical: "middle" };

    // Row 6: Super-headers
    sheet.mergeCells("A6:A8");
    sheet.getCell("A6").value = "DATE";

    sheet.mergeCells("B6:B8");
    sheet.getCell("B6").value = "O.R. #";

    sheet.mergeCells("C6:E6");
    sheet.getCell("C6").value = "TAX ON BUSINESS";

    sheet.mergeCells("F6:F6");
    sheet.getCell("F6").value = "OTHER TAXES";

    sheet.mergeCells("G6:O6");
    sheet.getCell("G6").value = "REGULATORY FEES (Permits & Licenses)";

    sheet.mergeCells("P6:S6");
    sheet.getCell("P6").value = "SERVICE USER CHARGES";

    sheet.mergeCells("T6:T7");
    sheet.getCell("T6").value = "Other Service\nIncome";

    sheet.mergeCells("U6:X6");
    sheet.getCell("U6").value = "RECEIPTS FROM ECONOMIC ENT.";

    sheet.mergeCells("Y6:Z6");
    sheet.getCell("Y6").value = "OTHER RECEIPTS";

    sheet.mergeCells("AA6:AA7");
    sheet.getCell("AA6").value = "Documentary\nStamp Tax (DST)";

    sheet.mergeCells("AB6:AB7");
    sheet.getCell("AB6").value = "20% Share from\nBldg Permit";

    sheet.mergeCells("AC6:AC7");
    sheet.getCell("AC6").value = "50% BRGY SHARE\nCLEARANCE";

    sheet.mergeCells("AD6:AD7");
    sheet.getCell("AD6").value = "Share from\nPCSO / Lotto";

    sheet.mergeCells("AE6:AE8");
    sheet.getCell("AE6").value = "TOTAL";

    // Row 7: Sub-headers (Column Accounts - All Complete Official Titles)
    const subHeadersMap: { [col: string]: string } = {
        C: "Tax on Delivery T & V\n(P.O. 82-99)",
        D: "Business Tax",
        E: "Fines & Penalties -\nBusiness Tax",
        F: "Transfer Tax/\nProf Tax",
        G: "Weights & Measures",
        H: "Tricycle Ope. Permit\nFees (MTOP)",
        I: "Mayor's Permit",
        J: "Permit Fees under\nthe building code",
        K: "Occupational Fees",
        L: "ZONING FEE",
        M: "REGISTRATION FEES",
        N: "Birth, Death,\nMarriage Cert.",
        O: "Inspection Fees\n(incldg PD 1185)",
        P: "Code 153\n(Cedula)",
        Q: "Police Clearance",
        R: "Clearance/\nCert. Fees",
        S: "Garbage Fees",
        U: "Receipts from Markets",
        V: "Receipts from\nSlaughterhouse",
        W: "Receipts from Cemeteries",
        X: "Other Fines/\nPen-Mkt",
        Y: "Miscellaneous Income",
        Z: "Other Fines/ Pen"
    };

    Object.entries(subHeadersMap).forEach(([col, text]) => {
        sheet.getCell(`${col}7`).value = text;
    });

    // Row 8: Account codes and index numbers
    const codeHeaders = [
        "418\n(1)", "582\n(2)", "599\n(3)", "418\n(4)",
        "601\n(7)", "604\n(8)", "605\n(9)", "605\n(9)", "605\n(11)", "605\n(15)",
        "606\n(13)", "606\n(16)", "617\n(14)",
        "415\n(12)", "613\n(17)", "613\n(18)", "616\n(19)", "628\n(19a)",
        "636\n(20)", "637\n(21)", "633\n(22)", "649\n(25)",
        "678\n(23)", "679\n(24)", "416\n(26)", "416\n(27)", "416\n(27)", "670\n(28)"
    ];

    const subCols = [
        "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O",
        "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z", "AA", "AB", "AC", "AD"
    ];

    codeHeaders.forEach((ch, idx) => {
        sheet.getCell(`${subCols[idx]}8`).value = ch;
    });

    // Style Header Rows (6, 7, 8)
    [6, 7, 8].forEach((rowNum) => {
        const row = sheet.getRow(rowNum);
        row.height = rowNum === 7 ? 28 : (rowNum === 8 ? 22 : 20);
        row.eachCell({ includeEmpty: true }, (cell) => {
            cell.font = { name: "Arial", size: 7.5, bold: true };
            cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
            cell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FFF0F2F5" }
            };
            cell.border = fullBorder;
        });
    });

    // Data Rows start at Row 9
    const startRow = 9;
    dataRows.forEach((r, idx) => {
        const currentRow = startRow + idx;
        const row = sheet.getRow(currentRow);
        row.height = 18;

        row.values = [
            r.date,
            r.receiptNo,
            r.taxDelivery || null,
            r.businessTax || null,
            r.finesBusinessTax || null,
            r.transferTax || null,
            r.weightsMeasures || null,
            r.mtop || null,
            r.mayorsPermit || null,
            r.buildingPermit || null,
            r.occupationFee || null,
            r.zoningFee || null,
            r.registrationFees || null,
            r.civilRegistryCert || null,
            r.inspectionFees || null,
            r.cedulaCon || null,
            r.policeClearance || null,
            r.clearanceCert || null,
            r.garbageFees || null,
            r.otherServiceIncome || null,
            r.marketReceipts || null,
            r.slaughterhouseReceipts || null,
            r.cemeteryReceipts || null,
            r.otherReceiptsPenMkt || null,
            r.miscIncome || null,
            r.otherFinesPenalties || null,
            r.dst || null,
            r.bldgPermitShare || null,
            r.brgyClearanceShare || null,
            r.pcsoLottoShare || null,
            r.total
        ];

        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            cell.border = fullBorder;
            cell.font = { name: "Arial", size: 8 };

            if (colNumber >= 3) {
                cell.numFmt = '#,##0.00;(#,##0.00);""';
                cell.alignment = { horizontal: "right", vertical: "middle" };
            } else {
                cell.alignment = { horizontal: "center", vertical: "middle" };
            }

            // Bold total column (col 31 = AE)
            if (colNumber === 31) {
                cell.font = { name: "Arial", size: 8, bold: true };
            }
        });
    });

    const endRow = Math.max(startRow, startRow + dataRows.length - 1);
    const totalsRowIndex = endRow + 1;
    const totalsRow = sheet.getRow(totalsRowIndex);
    totalsRow.height = 20;

    sheet.mergeCells(`A${totalsRowIndex}:B${totalsRowIndex}`);
    totalsRow.getCell(1).value = "TOTAL";

    // Set Formulas for Totals on cols C(3) through AE(31)
    const numericCols = [
        { col: 3, letter: "C" },
        { col: 4, letter: "D" },
        { col: 5, letter: "E" },
        { col: 6, letter: "F" },
        { col: 7, letter: "G" },
        { col: 8, letter: "H" },
        { col: 9, letter: "I" },
        { col: 10, letter: "J" },
        { col: 11, letter: "K" },
        { col: 12, letter: "L" },
        { col: 13, letter: "M" },
        { col: 14, letter: "N" },
        { col: 15, letter: "O" },
        { col: 16, letter: "P" },
        { col: 17, letter: "Q" },
        { col: 18, letter: "R" },
        { col: 19, letter: "S" },
        { col: 20, letter: "T" },
        { col: 21, letter: "U" },
        { col: 22, letter: "V" },
        { col: 23, letter: "W" },
        { col: 24, letter: "X" },
        { col: 25, letter: "Y" },
        { col: 26, letter: "Z" },
        { col: 27, letter: "AA" },
        { col: 28, letter: "AB" },
        { col: 29, letter: "AC" },
        { col: 30, letter: "AD" },
        { col: 31, letter: "AE" }
    ];

    numericCols.forEach(({ col, letter }) => {
        if (dataRows.length > 0) {
            totalsRow.getCell(col).value = {
                formula: `SUM(${letter}${startRow}:${letter}${endRow})`
            };
        } else {
            totalsRow.getCell(col).value = 0;
        }
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
        if (Number(cell.col) >= 3) {
            cell.numFmt = '#,##0.00;(#,##0.00);""';
            cell.alignment = { horizontal: "right", vertical: "middle" };
        } else {
            cell.alignment = { horizontal: "center", vertical: "middle" };
        }
    });

    // Column widths tailored for landscape 31-column sheet
    const colWidths = [
        11, // A: Date
        13, // B: O.R. #
        12, // C: Tax on Delivery
        13, // D: Business Tax
        12, // E: Fines Business Tax
        12, // F: Transfer Tax
        11, // G: Weights & Measures
        11, // H: MTOP
        12, // I: Mayor's Permit
        13, // J: Building Permit
        11, // K: Occupation Fee
        11, // L: Zoning Fee
        12, // M: Registration Fees
        13, // N: Civil Registry Cert
        13, // O: Inspection Fees
        12, // P: Con (Cedula)
        12, // Q: Police Clearance
        12, // R: Clearance/Cert
        12, // S: Garbage Fees
        12, // T: Other Service Income
        13, // U: Markets
        13, // V: Slaughterhouse
        13, // W: Cemeteries
        12, // X: Other Receipts Pen-Mkt
        13, // Y: Misc Income
        12, // Z: Other Fines
        13, // AA: DST
        12, // AB: 20% Bldg Permit Share
        13, // AC: 50% Brgy Clearance Share
        12, // AD: PCSO Lotto Share
        15  // AE: TOTAL
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
    const fileSuffix = options.fromDate && options.toDate ? `${options.fromDate}_to_${options.toDate}` : format(new Date(), "yyyy-MM-dd");
    link.download = `Prov_Form_129A_General_Collections_${fileSuffix}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
}
