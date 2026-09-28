import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import { format } from "date-fns";

export interface MonthlySummaryItem {
    accountCode: string;
    particulars: string;
    amount: number;
    isHeader?: boolean;
    isSubHeader?: boolean;
    isTotal?: boolean;
    isGrandTotal?: boolean;
}

export interface MonthlySummaryData {
    periodLabel: string;
    items: MonthlySummaryItem[];
    totalLocalTaxes: number;
    totalGeneralIncome: number;
    grandTotal: number;
}

/**
 * Helper to identify Real Property Tax payments
 */
function isPaymentRpt(p: any): boolean {
    const cat = (p.transaction?.type?.category || "").toUpperCase();
    const code = (p.transaction?.type?.code || "").toUpperCase();
    const name = (p.transaction?.type?.name || "").toUpperCase();
    const add = typeof p.transaction?.additionalData === "string"
        ? (() => { try { return JSON.parse(p.transaction.additionalData); } catch { return {}; } })()
        : (p.transaction?.additionalData || {});
    return (
        cat === "RPT" ||
        cat === "REAL PROPERTY TAX" ||
        cat === "REALPROPERTYTAX" ||
        code.startsWith("RPT_") ||
        name.includes("REAL PROPERTY TAX") ||
        name.includes("AMILYAR") ||
        Boolean(add?.tdn || add?.pin || add?.taxDeclarationNo || add?.propertyClassification)
    );
}

/**
 * Builds the official Monthly Summary of Collections dataset from payment records.
 */
export function buildMonthlySummaryData(
    payments: any[],
    options?: { fromDate?: string; toDate?: string }
): MonthlySummaryData {
    // 1. Determine period display label
    let periodLabel = format(new Date(), "MMMM, yyyy");
    if (options?.fromDate && options?.toDate) {
        const fromD = new Date(options.fromDate);
        const toD = new Date(options.toDate);
        if (fromD.getMonth() === toD.getMonth() && fromD.getFullYear() === toD.getFullYear()) {
            periodLabel = format(fromD, "MMMM, yyyy");
        } else {
            periodLabel = `${format(fromD, "MMMM d, yyyy")} - ${format(toD, "MMMM d, yyyy")}`;
        }
    } else if (options?.fromDate) {
        periodLabel = format(new Date(options.fromDate), "MMMM, yyyy");
    }

    // 2. Initialize account accumulators
    let businessTax = 0;          // 582
    let contractorsTax = 0;       // -
    let communityTax = 0;         // 583
    let realPropertyTax = 0;      // 588
    let finesMunLicense = 0;      // 599

    let weightsMeasures = 0;      // Permits and Licenses
    let motorVehicles = 0;        // 601
    let mtop = 0;                 // 604

    let mayorsPermit = 0;         // 605
    let burialPermit = 0;
    let medicalPermit = 0;
    let sanitaryPermit = 0;
    let buildingPermit = 0;
    let electricalPermit = 0;
    let zoningFee = 0;
    let occupationalFee = 0;

    let largeCattle = 0;          // 606
    let birthDeathMarriage = 0;
    let filingCorrection = 0;

    let clearanceCert = 0;        // 613
    let garbageFees = 0;          // 616
    let inspectionFees = 0;       // 617
    let otherServiceIncome = 0;   // 628

    let marketReceipts = 0;       // 636
    let slaughterhouseReceipts = 0; // 637
    let cemeteryReceipts = 0;     // 633
    let dst = 0;                  // 416

    // 3. Process each payment record
    for (const p of payments) {
        const amt = Number(p.amount || 0);
        if (amt <= 0) continue;

        const tx = p.transaction || {};
        const typeCode = String(tx.type?.code || "").toUpperCase();
        const typeName = String(tx.type?.name || "").toUpperCase();
        const typeCat = String(tx.type?.category || "").toUpperCase();

        const add = typeof tx.additionalData === "string"
            ? (() => { try { return JSON.parse(tx.additionalData); } catch { return {}; } })()
            : (tx.additionalData || {});

        const fiscal = typeof tx.fiscalSnapshot === "string"
            ? (() => { try { return JSON.parse(tx.fiscalSnapshot); } catch { return {}; } })()
            : (tx.fiscalSnapshot || {});

        // A. Real Property Tax
        if (isPaymentRpt(p)) {
            realPropertyTax += amt;
            continue;
        }

        // B. Cedula / Community Tax
        if (typeCode.includes("CEDULA") || typeCat.includes("CEDULA") || typeName.includes("COMMUNITY TAX") || typeName.includes("CEDULA")) {
            communityTax += amt;
            continue;
        }

        // C. POSO Traffic Citations
        if (typeCode.includes("POSO") || typeCat.includes("POSO") || typeName.includes("TRAFFIC")) {
            finesMunLicense += amt;
            continue;
        }

        // D. Inspect itemized line items if present (e.g. BPLO assessment, engineering)
        const lineItems: any[] = fiscal?.lineItems || add?.lineItems || add?.feeBreakdown || [];
        if (Array.isArray(lineItems) && lineItems.length > 0) {
            let mappedSum = 0;
            for (const item of lineItems) {
                const label = String(item.label || item.name || item.description || "").toLowerCase();
                const itemAmt = Number(item.amount || item.total || item.fee || 0);
                if (itemAmt <= 0) continue;
                mappedSum += itemAmt;

                if (label.includes("mayor") || (label.includes("permit") && !label.includes("building") && !label.includes("electrical") && !label.includes("occupancy") && !label.includes("sanitary") && !label.includes("medical") && !label.includes("burial") && !label.includes("mtop"))) {
                    mayorsPermit += itemAmt;
                } else if (label.includes("business tax") || label.includes("gross sales")) {
                    businessTax += itemAmt;
                } else if (label.includes("contractor")) {
                    contractorsTax += itemAmt;
                } else if (label.includes("sanitary")) {
                    sanitaryPermit += itemAmt;
                } else if (label.includes("medical") || label.includes("health")) {
                    medicalPermit += itemAmt;
                } else if (label.includes("burial")) {
                    burialPermit += itemAmt;
                } else if (label.includes("electrical")) {
                    electricalPermit += itemAmt;
                } else if (label.includes("building") || label.includes("occupancy")) {
                    buildingPermit += itemAmt;
                } else if (label.includes("zoning") || label.includes("locational")) {
                    zoningFee += itemAmt;
                } else if (label.includes("occupation")) {
                    occupationalFee += itemAmt;
                } else if (label.includes("garbage")) {
                    garbageFees += itemAmt;
                } else if (label.includes("dst") || label.includes("stamp")) {
                    dst += itemAmt;
                } else if (label.includes("inspection") || label.includes("pd 1185") || label.includes("fire")) {
                    inspectionFees += itemAmt;
                } else if (label.includes("clearance") || label.includes("certificate")) {
                    clearanceCert += itemAmt;
                } else if (label.includes("penalty") || label.includes("surcharge") || label.includes("fine")) {
                    finesMunLicense += itemAmt;
                } else if (label.includes("cattle")) {
                    largeCattle += itemAmt;
                } else if (label.includes("mtop") || label.includes("tricycle")) {
                    mtop += itemAmt;
                } else if (label.includes("motor") || label.includes("mvuc")) {
                    motorVehicles += itemAmt;
                } else if (label.includes("weights") || label.includes("measures")) {
                    weightsMeasures += itemAmt;
                } else if (label.includes("market") || label.includes("stall")) {
                    marketReceipts += itemAmt;
                } else if (label.includes("slaughter")) {
                    slaughterhouseReceipts += itemAmt;
                } else if (label.includes("cemetery")) {
                    cemeteryReceipts += itemAmt;
                } else {
                    otherServiceIncome += itemAmt;
                }
            }

            // Remainder balance
            if (mappedSum < amt) {
                const rem = amt - mappedSum;
                if (typeCode.startsWith("BUSINESS")) businessTax += rem;
                else otherServiceIncome += rem;
            }
            continue;
        }

        // E. Fallbacks by Service Type
        if (typeCode.startsWith("BUSINESS_PERMIT") || typeCat.includes("BUSINESS") || typeName.includes("BUSINESS")) {
            if (fiscal?.basicTax || fiscal?.additionalTax) {
                const bTax = Number(fiscal.basicTax || 0);
                const aTax = Number(fiscal.additionalTax || 0);
                mayorsPermit += bTax;
                businessTax += aTax;
                const rem = amt - (bTax + aTax);
                if (rem > 0) garbageFees += rem;
            } else {
                const estMayor = Math.min(amt, 500);
                mayorsPermit += estMayor;
                businessTax += Math.max(0, amt - estMayor);
            }
        } else if (typeCode.startsWith("LCR_") || typeCat.includes("CIVIL") || typeName.includes("CERTIFICATE") || typeName.includes("REGISTRY") || typeName.includes("PSA")) {
            if (typeCode.includes("DEATH") && (typeName.includes("BURIAL") || add.burialFee)) {
                burialPermit += amt;
            } else if (typeCode.includes("CORRECTION") || typeName.includes("CORRECTION") || typeName.includes("RA 9048")) {
                filingCorrection += amt;
            } else {
                if (amt >= 130) {
                    dst += 30;
                    birthDeathMarriage += (amt - 30);
                } else {
                    birthDeathMarriage += amt;
                }
            }
        } else if (typeCode.startsWith("BUILDING") || typeCode.startsWith("OCCUPANCY") || typeCat.includes("ENGINEERING") || typeName.includes("BUILDING")) {
            if (typeName.includes("ELECTRICAL")) {
                electricalPermit += amt;
            } else {
                buildingPermit += amt;
            }
        } else if (typeName.includes("BURIAL")) {
            burialPermit += amt;
        } else if (typeName.includes("MEDICAL") || typeName.includes("HEALTH")) {
            medicalPermit += amt;
        } else if (typeName.includes("ZONING")) {
            zoningFee += amt;
        } else if (typeName.includes("MOTOR") || typeName.includes("VEHICLE")) {
            motorVehicles += amt;
        } else if (typeName.includes("MTOP") || typeName.includes("TRICYCLE")) {
            mtop += amt;
        } else if (typeName.includes("CATTLE")) {
            largeCattle += amt;
        } else if (typeName.includes("MARKET") || typeName.includes("STALL")) {
            marketReceipts += amt;
        } else if (typeName.includes("CLEARANCE")) {
            clearanceCert += amt;
        } else {
            otherServiceIncome += amt;
        }
    }

    const totalLocalTaxes = businessTax + contractorsTax + communityTax + realPropertyTax + finesMunLicense;
    const totalGeneralIncome =
        weightsMeasures + motorVehicles + mtop +
        mayorsPermit + burialPermit + medicalPermit + sanitaryPermit +
        buildingPermit + electricalPermit + zoningFee + occupationalFee +
        largeCattle + birthDeathMarriage + filingCorrection +
        clearanceCert + garbageFees + inspectionFees + otherServiceIncome +
        marketReceipts + slaughterhouseReceipts + cemeteryReceipts + dst;

    const grandTotal = totalLocalTaxes + totalGeneralIncome;

    // Build structured items
    const items: MonthlySummaryItem[] = [
        // TAX REVENUE
        { accountCode: "", particulars: "TAX REVENUE", amount: 0, isHeader: true },
        { accountCode: "", particulars: "Local Taxes", amount: 0, isSubHeader: true },
        { accountCode: "582", particulars: "Business Tax", amount: businessTax },
        { accountCode: "-", particulars: "Contractor's Tax", amount: contractorsTax },
        { accountCode: "583", particulars: "Community Tax", amount: communityTax },
        { accountCode: "588", particulars: "Real Property Tax", amount: realPropertyTax },
        { accountCode: "599", particulars: "Fines Pen. - Mun. License", amount: finesMunLicense },
        { accountCode: "", particulars: "TOTAL LOCAL TAXES", amount: totalLocalTaxes, isTotal: true },

        // GENERAL INCOME ACCOUNTS
        { accountCode: "", particulars: "General Income Accounts", amount: 0, isHeader: true },
        { accountCode: "", particulars: "Permits and Licenses", amount: 0, isSubHeader: true },
        { accountCode: "", particulars: "Weights and Measures", amount: weightsMeasures },
        { accountCode: "601", particulars: "Motor Vehicles Users Charge", amount: motorVehicles },
        { accountCode: "604", particulars: "MTOP", amount: mtop },

        // Permit Fees
        { accountCode: "", particulars: "Permit Fees", amount: 0, isSubHeader: true },
        { accountCode: "605", particulars: "Mayors Permit", amount: mayorsPermit },
        { accountCode: "", particulars: "Burial Permit", amount: burialPermit },
        { accountCode: "", particulars: "Medical Permit", amount: medicalPermit },
        { accountCode: "", particulars: "Sanitary Permit", amount: sanitaryPermit },
        { accountCode: "", particulars: "Building Permit", amount: buildingPermit },
        { accountCode: "", particulars: "Electrical Permit", amount: electricalPermit },
        { accountCode: "", particulars: "Zoning Fee", amount: zoningFee },
        { accountCode: "", particulars: "Occupational Fee", amount: occupationalFee },

        // Registration Fees
        { accountCode: "", particulars: "Registration Fees", amount: 0, isSubHeader: true },
        { accountCode: "606", particulars: "Reg. Large Cattle", amount: largeCattle },
        { accountCode: "", particulars: "Birth Death Marriage", amount: birthDeathMarriage },
        { accountCode: "", particulars: "Filing Correction FEE", amount: filingCorrection },

        // Other Service & Business Income (if any values exist or standard LGU lines)
        { accountCode: "", particulars: "Clearance and Certification Fees", amount: clearanceCert },
        { accountCode: "616", particulars: "Garbage Fees", amount: garbageFees },
        { accountCode: "617", particulars: "Inspection Fees", amount: inspectionFees },
        { accountCode: "628", particulars: "Other Service Income", amount: otherServiceIncome },
        { accountCode: "636", particulars: "Receipts from Markets", amount: marketReceipts },
        { accountCode: "637", particulars: "Receipts from Slaughterhouse", amount: slaughterhouseReceipts },
        { accountCode: "633", particulars: "Receipts from Cemeteries", amount: cemeteryReceipts },
        { accountCode: "416", particulars: "Documentary Stamp Tax (DST)", amount: dst },

        { accountCode: "", particulars: "TOTAL GENERAL INCOME ACCOUNTS", amount: totalGeneralIncome, isTotal: true },

        // GRAND TOTAL
        { accountCode: "", particulars: "TOTAL COLLECTIONS", amount: grandTotal, isGrandTotal: true }
    ];

    return {
        periodLabel,
        items,
        totalLocalTaxes,
        totalGeneralIncome,
        grandTotal
    };
}

/**
 * Generate official Monthly Summary of Collections PDF matching government audit specifications.
 */
export async function exportMonthlySummaryPdf(
    payments: any[],
    options?: {
        fromDate?: string;
        toDate?: string;
        treasurerName?: string;
        treasurerTitle?: string;
    }
) {
    const data = buildMonthlySummaryData(payments, options);
    const treasurerName = options?.treasurerName?.trim() || "TREASURY STAFF";
    const treasurerTitle = options?.treasurerTitle?.trim() || "Acting Municipal Treasurer";

    const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4" // 210 x 297 mm
    });

    const PAGE_W = 210;
    const PAGE_H = 297;
    const MARGIN = 18;

    // Header Titles
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(40, 40, 40);
    doc.text("Municipality of MAPANDAN", PAGE_W / 2, 16, { align: "center" });

    doc.setFontSize(9.5);
    doc.text("Province of Pangasinan", PAGE_W / 2, 21, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text("Monthly Summary of Collections", PAGE_W / 2, 29, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(50, 50, 50);
    doc.text(`For the Month :    ${data.periodLabel}`, PAGE_W / 2, 35, { align: "center" });

    // Build Table Body
    const tableBody: any[] = [];

    data.items.forEach((item) => {
        if (item.isHeader) {
            tableBody.push([
                { content: "", styles: { fontStyle: "bold" } },
                { content: item.particulars, styles: { fontStyle: "bold", textColor: [15, 23, 42] } },
                { content: "", styles: { fontStyle: "bold" } }
            ]);
        } else if (item.isSubHeader) {
            tableBody.push([
                { content: "", styles: { fontStyle: "bold" } },
                { content: `   ${item.particulars}`, styles: { fontStyle: "bold", textColor: [30, 41, 59] } },
                { content: "", styles: { fontStyle: "bold" } }
            ]);
        } else if (item.isTotal) {
            tableBody.push([
                { content: "", styles: { fontStyle: "bold" } },
                { content: `   ${item.particulars}`, styles: { fontStyle: "bold", halign: "left", textColor: [15, 23, 42] } },
                { content: item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), styles: { fontStyle: "bold", halign: "right", textColor: [15, 23, 42] } }
            ]);
        } else if (item.isGrandTotal) {
            tableBody.push([
                { content: "", styles: { fontStyle: "bold", fillColor: [248, 250, 252] } },
                { content: item.particulars, styles: { fontStyle: "bold", textColor: [15, 23, 42], fillColor: [248, 250, 252] } },
                { content: item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), styles: { fontStyle: "bold", halign: "right", textColor: [15, 23, 42], fillColor: [248, 250, 252] } }
            ]);
        } else {
            tableBody.push([
                { content: item.accountCode || "", styles: { halign: "center", textColor: [50, 50, 50] } },
                { content: `      ${item.particulars}`, styles: { halign: "left", textColor: [50, 50, 50] } },
                { content: item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), styles: { halign: "right", textColor: [15, 23, 42] } }
            ]);
        }
    });

    autoTable(doc, {
        startY: 40,
        margin: { left: MARGIN, right: MARGIN, bottom: 20 },
        head: [
            [
                { content: "Account Code", styles: { halign: "center" } },
                { content: "Particulars", styles: { halign: "center" } },
                { content: "Amount", styles: { halign: "center" } }
            ]
        ],
        body: tableBody,
        theme: "grid",
        styles: {
            fontSize: 8,
            cellPadding: 1.5,
            font: "helvetica",
            lineColor: [100, 116, 139],
            lineWidth: 0.15,
            textColor: [15, 23, 42]
        },
        headStyles: {
            fillColor: [241, 245, 249],
            textColor: [15, 23, 42],
            fontStyle: "bold",
            fontSize: 8.5,
            lineColor: [71, 85, 105],
            lineWidth: 0.2
        },
        columnStyles: {
            0: { cellWidth: 32 },
            1: { cellWidth: 104 },
            2: { cellWidth: 38 }
        }
    });

    // Draw Signatory strictly at the very end after the entire table is finished
    const finalY = (doc as any).lastAutoTable?.finalY || 200;
    let signY = finalY + 12;

    // If there is not enough room on the current page for the signatory block, push to next page
    if (signY + 26 > PAGE_H - 16) {
        doc.addPage();
        signY = 25;
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(70, 70, 70);
    doc.text("Certified Correct:", MARGIN + 10, signY);

    if (treasurerName) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42);
        doc.text(treasurerName.toUpperCase(), MARGIN + 10, signY + 12);

        doc.setLineWidth(0.3);
        doc.setDrawColor(100, 116, 139);
        const nameWidth = doc.getTextWidth(treasurerName.toUpperCase());
        doc.line(MARGIN + 10, signY + 13.5, MARGIN + 10 + Math.max(nameWidth, 50), signY + 13.5);
    } else {
        doc.setLineWidth(0.3);
        doc.setDrawColor(100, 116, 139);
        doc.line(MARGIN + 10, signY + 12, MARGIN + 65, signY + 12);
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(70, 70, 70);
    doc.text(treasurerTitle, MARGIN + 10, signY + 18);

    // Pagination footer
    const pageCount = (doc.internal as any).getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(120, 120, 120);
        doc.text(
            `Municipality of Mapandan, Pangasinan  •  Generated on ${format(new Date(), "MMMM dd, yyyy hh:mm a")}`,
            MARGIN,
            PAGE_H - 8
        );
        doc.text(`Page ${i} of ${pageCount}`, PAGE_W - MARGIN, PAGE_H - 8, { align: "right" });
    }

    const fileSuffix = options?.fromDate && options?.toDate
        ? `${options.fromDate}_to_${options.toDate}`
        : format(new Date(), "yyyy-MM");
    doc.save(`Monthly_Summary_of_Collections_${fileSuffix}.pdf`);
}

/**
 * Generate official Monthly Summary of Collections Excel spreadsheet.
 */
export async function exportMonthlySummaryExcel(
    payments: any[],
    options?: {
        fromDate?: string;
        toDate?: string;
        treasurerName?: string;
        treasurerTitle?: string;
    }
) {
    const data = buildMonthlySummaryData(payments, options);
    const treasurerName = options?.treasurerName?.trim() || "TREASURY STAFF";
    const treasurerTitle = options?.treasurerTitle?.trim() || "Acting Municipal Treasurer";

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Treasury Department - Municipality of Mapandan";
    workbook.created = new Date();

    const sheet = workbook.addWorksheet("Monthly Summary", {
        pageSetup: { orientation: "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0 }
    });

    const borderThin: Partial<ExcelJS.Border> = { style: "thin", color: { argb: "FF000000" } };
    const borderDouble: Partial<ExcelJS.Border> = { style: "double", color: { argb: "FF000000" } };
    const fullBorder: Partial<ExcelJS.Borders> = {
        top: borderThin,
        left: borderThin,
        bottom: borderThin,
        right: borderThin
    };

    // Row 1: LGU
    sheet.mergeCells("A1:C1");
    const r1 = sheet.getCell("A1");
    r1.value = "Municipality of MAPANDAN";
    r1.font = { name: "Arial", size: 10, bold: false };
    r1.alignment = { horizontal: "center", vertical: "middle" };

    // Row 2: Province
    sheet.mergeCells("A2:C2");
    const r2 = sheet.getCell("A2");
    r2.value = "Province of Pangasinan";
    r2.font = { name: "Arial", size: 9, bold: false };
    r2.alignment = { horizontal: "center", vertical: "middle" };

    // Row 3: Blank
    sheet.getRow(3).height = 4;

    // Row 4: Title
    sheet.mergeCells("A4:C4");
    const r4 = sheet.getCell("A4");
    r4.value = "Monthly Summary of Collections";
    r4.font = { name: "Arial", size: 14, bold: true };
    r4.alignment = { horizontal: "center", vertical: "middle" };

    // Row 5: Period
    sheet.mergeCells("A5:C5");
    const r5 = sheet.getCell("A5");
    r5.value = `For the Month :  ${data.periodLabel}`;
    r5.font = { name: "Arial", size: 10, bold: false };
    r5.alignment = { horizontal: "center", vertical: "middle" };

    // Row 6: Blank
    sheet.getRow(6).height = 6;

    // Row 7: Header Table
    const headerRow = sheet.getRow(7);
    headerRow.values = ["Account Code", "Particulars", "Amount"];
    headerRow.height = 24;
    headerRow.eachCell((cell) => {
        cell.font = { name: "Arial", size: 10, bold: true };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = fullBorder;
        cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF1F5F9" }
        };
    });

    let currentRowNum = 8;

    data.items.forEach((item) => {
        const row = sheet.getRow(currentRowNum);

        if (item.isHeader) {
            row.values = ["", item.particulars, ""];
            row.getCell(2).font = { name: "Arial", size: 9.5, bold: true };
            row.getCell(2).alignment = { horizontal: "left", vertical: "middle" };
        } else if (item.isSubHeader) {
            row.values = ["", `   ${item.particulars}`, ""];
            row.getCell(2).font = { name: "Arial", size: 9, bold: true };
            row.getCell(2).alignment = { horizontal: "left", vertical: "middle" };
        } else if (item.isTotal) {
            row.values = ["", `   ${item.particulars}`, item.amount];
            row.getCell(2).font = { name: "Arial", size: 9, bold: true };
            row.getCell(3).font = { name: "Arial", size: 9, bold: true };
            row.getCell(3).numFmt = "#,##0.00";
            row.getCell(3).alignment = { horizontal: "right", vertical: "middle" };
            row.getCell(3).border = {
                top: borderThin,
                left: borderThin,
                bottom: borderDouble,
                right: borderThin
            };
        } else if (item.isGrandTotal) {
            row.values = ["", item.particulars, item.amount];
            row.height = 20;
            row.eachCell((cell) => {
                cell.font = { name: "Arial", size: 10, bold: true };
                cell.fill = {
                    type: "pattern",
                    pattern: "solid",
                    fgColor: { argb: "FFF8FAFC" }
                };
            });
            row.getCell(3).numFmt = "#,##0.00";
            row.getCell(3).alignment = { horizontal: "right", vertical: "middle" };
            row.getCell(3).border = {
                top: borderThin,
                left: borderThin,
                bottom: borderDouble,
                right: borderThin
            };
        } else {
            row.values = [item.accountCode || "", `      ${item.particulars}`, item.amount];
            row.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
            row.getCell(2).alignment = { horizontal: "left", vertical: "middle" };
            row.getCell(3).alignment = { horizontal: "right", vertical: "middle" };
            row.getCell(3).numFmt = "#,##0.00";
            row.eachCell({ includeEmpty: true }, (c) => {
                c.font = { name: "Arial", size: 8.5 };
                c.border = fullBorder;
            });
        }

        // Apply borders for header/subheader rows
        if (item.isHeader || item.isSubHeader || item.isTotal || item.isGrandTotal) {
            row.eachCell({ includeEmpty: true }, (c) => {
                c.border = fullBorder;
            });
        }

        currentRowNum++;
    });

    // Signatory
    currentRowNum += 2;
    const signLabelRow = sheet.getRow(currentRowNum);
    signLabelRow.getCell(2).value = "Certified Correct:";
    signLabelRow.getCell(2).font = { name: "Arial", size: 9, italic: true };

    currentRowNum += 2;
    const signNameRow = sheet.getRow(currentRowNum);
    signNameRow.getCell(2).value = treasurerName.toUpperCase();
    signNameRow.getCell(2).font = { name: "Arial", size: 10, bold: true };

    currentRowNum++;
    const signTitleRow = sheet.getRow(currentRowNum);
    signTitleRow.getCell(2).value = treasurerTitle;
    signTitleRow.getCell(2).font = { name: "Arial", size: 9, italic: false };

    // Column Widths
    sheet.getColumn(1).width = 18;  // Account Code
    sheet.getColumn(2).width = 46;  // Particulars
    sheet.getColumn(3).width = 22;  // Amount

    // Write file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const fileSuffix = options?.fromDate && options?.toDate
        ? `${options.fromDate}_to_${options.toDate}`
        : format(new Date(), "yyyy-MM");
    link.download = `Monthly_Summary_of_Collections_${fileSuffix}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
}
