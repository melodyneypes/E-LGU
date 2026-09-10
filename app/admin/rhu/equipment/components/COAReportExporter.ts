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
}

export function exportCOAPDF(assets: any[], options: COAExportOptions = {}) {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const isPPE = options.reportType === "RPCPPE";
    const reportTitle = isPPE 
        ? "REPORT ON THE PHYSICAL COUNT OF PROPERTY, PLANT AND EQUIPMENT (RPCPPE)"
        : options.reportType === "IIRUP"
            ? "INVENTORY INSPECTION AND REPORT OF UNSERVICEABLE PROPERTY (IIRUP)"
            : "REPORT ON THE PHYSICAL COUNT OF SEMI-EXPENDABLE PROPERTY (RPCSP)";

    const subtitleClass = isPPE ? "PPE Valued over ₱50,000.00 (PAR)" : options.reportType === "IIRUP" ? "Condemnation & Disposal Queue" : "Semi-Expendable Valued ₱50,000.00 & below (ICS)";
    const facilityLabel = options.facility && options.facility !== "ALL" ? options.facility : "All Rural Health Facilities & BHS";

    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("REPUBLIC OF THE PHILIPPINES", 148, 12, { align: "center" });
    doc.setFontSize(10);
    doc.text("PROVINCE OF PANGASINAN • MUNICIPALITY OF MAPANDAN", 148, 17, { align: "center" });
    doc.text("RURAL HEALTH UNIT (RHU) & BARANGAY HEALTH STATIONS", 148, 22, { align: "center" });

    doc.setFontSize(13);
    doc.setTextColor(20, 30, 60);
    doc.text(reportTitle, 148, 30, { align: "center" });

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    doc.text(`Scope: ${facilityLabel}  |  Classification: ${subtitleClass}  |  As of: ${new Date().toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" })}`, 148, 35, { align: "center" });

    // Table Data
    const head = [[
        "PROPERTY NO.",
        "EQUIPMENT NAME / DESCRIPTION",
        "BRAND / MODEL",
        "SERIAL NO.",
        "FACILITY & ROOM",
        "CUSTODIAN",
        "REF (PAR/ICS)",
        "UNIT VALUE (PHP)",
        "STATUS"
    ]];

    let totalValue = 0;
    const rows = assets.map((a) => {
        totalValue += (a.unitCost || 0);
        return [
            a.assetTagNo || "N/A",
            a.equipmentName || "N/A",
            a.brand || "-",
            a.serialNo || "NONE",
            `${a.currentFacility || "Main RHU"}\n(${a.assignedRoom || "Central Stockroom"})`,
            a.accountablePerson || "Unassigned",
            a.documentReference || "-",
            `PHP ${(a.unitCost || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            (a.currentStatus || "ACTIVE").replace(/_/g, " ")
        ];
    });

    // Add summary row
    rows.push([
        "TOTAL",
        `TOTAL COUNT: ${assets.length} UNITS`,
        "",
        "",
        "",
        "",
        "GRAND TOTAL:",
        `PHP ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        ""
    ]);

    autoTable(doc, {
        head,
        body: rows,
        startY: 40,
        theme: "grid",
        styles: {
            fontSize: 7.5,
            cellPadding: 2,
            overflow: "linebreak",
            valign: "middle"
        },
        headStyles: {
            fillColor: isPPE ? [30, 58, 138] : [15, 118, 110],
            textColor: 255,
            fontStyle: "bold",
            halign: "center"
        },
        columnStyles: {
            0: { cellWidth: 28, fontStyle: "bold" },
            1: { cellWidth: 42 },
            2: { cellWidth: 24 },
            3: { cellWidth: 24 },
            4: { cellWidth: 45 },
            5: { cellWidth: 32 },
            6: { cellWidth: 26 },
            7: { cellWidth: 32, halign: "right" },
            8: { cellWidth: 24, halign: "center" }
        },
        didParseCell: (data) => {
            if (data.row.index === rows.length - 1) {
                data.cell.styles.fontStyle = "bold";
                data.cell.styles.fillColor = [240, 245, 255];
            }
        }
    });

    // Signatories Block
    const finalY = (doc as any).lastAutoTable.finalY + 12;
    const pageHeight = doc.internal.pageSize.height;

    if (finalY + 35 > pageHeight) {
        doc.addPage();
    }

    const signY = (doc as any).lastAutoTable.finalY + 14 > pageHeight - 35 ? 25 : (doc as any).lastAutoTable.finalY + 14;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);

    // Signatory 1: Supply Officer
    doc.text("Certified Correct By:", 25, signY);
    doc.setFont("helvetica", "bold");
    doc.text(options.signatorySupplyOfficer || "____________________________________", 25, signY + 14);
    doc.setFont("helvetica", "normal");
    doc.text("RHU Supply Officer / GSO Custodian", 25, signY + 18);

    // Signatory 2: MHO
    doc.text("Approved & Noted By:", 120, signY);
    doc.setFont("helvetica", "bold");
    doc.text(options.signatoryMHO || "____________________________________", 120, signY + 14);
    doc.setFont("helvetica", "normal");
    doc.text("Municipal Health Officer (MHO)", 120, signY + 18);

    // Signatory 3: COA Auditor
    doc.text("Audited & Inspected By:", 215, signY);
    doc.setFont("helvetica", "bold");
    doc.text(options.signatoryAuditor || "____________________________________", 215, signY + 14);
    doc.setFont("helvetica", "normal");
    doc.text("COA Resident Auditor Representative", 215, signY + 18);

    const fileName = `${options.reportType || "COA_INVENTORY"}_${new Date().toISOString().split("T")[0]}.pdf`;
    doc.save(fileName);
}

export function exportCOAExcel(assets: any[]) {
    const data = assets.map((a, index) => ({
        "Item #": index + 1,
        "Property Number (Asset Tag)": a.assetTagNo,
        "Equipment Name": a.equipmentName,
        "Brand / Manufacturer": a.brand || "-",
        "Serial Number": a.serialNo || "NONE",
        "COA Category": a.category,
        "Acquisition Source": a.acquisitionSource,
        "Unit Cost (PHP)": a.unitCost || 0,
        "Facility Location": a.currentFacility,
        "Assigned Room": a.assignedRoom,
        "Accountable Custodian": a.accountablePerson,
        "Custodian ID": a.accountableEmployeeId || "-",
        "Reference (PAR/ICS)": a.documentReference || "-",
        "Linked PO #": a.poReferenceNo || "-",
        "Linked SO #": a.soReferenceNo || "-",
        "Current Status": a.currentStatus,
        "Acquisition Date": a.acquisitionDate ? new Date(a.acquisitionDate).toISOString().split("T")[0] : "-",
        "Discrepancy / Defect Notes": a.defectDetails || a.discrepancyNotes || "-"
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "RHU Equipment Ledger");

    // Auto column widths
    const max_width = data.reduce((w: any, r: any) => {
        Object.keys(r).forEach(k => {
            const val = String(r[k] || "");
            w[k] = Math.max(w[k] || 10, val.length + 2);
        });
        return w;
    }, {});
    worksheet["!cols"] = Object.keys(max_width).map(k => ({ wch: max_width[k] }));

    const fileName = `RHU_Equipment_Ledger_${new Date().toISOString().split("T")[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
}
