/**
 * Cedula Template & Layout Configuration Definitions
 * Coordinate system is relative percentage (0 - 100%)
 * Width and height of standard CTC paper in millimeters (mm)
 */

export interface CedulaFieldConfig {
    id: string;
    label: string;
    category: "HEADER" | "TAXPAYER" | "STATUS" | "TAX_ASSESSMENT" | "FOOTER";
    x: number;          // % from left (0 to 100)
    y: number;          // % from top (0 to 100)
    width: number;      // % width
    height?: number;    // % height
    fontSize: number;   // in pt (e.g. 8, 9, 10, 11)
    fontWeight?: "normal" | "bold";
    textAlign?: "left" | "center" | "right";
    visible: boolean;
    sampleValue: string;
}

export interface CedulaLayoutSettings {
    widthMm: number;        // Standard CTC paper width in mm (default: 180)
    heightMm: number;       // Standard CTC paper height in mm (default: 115)
    bgOpacity: number;      // 0 to 100
    showBgInPrint: boolean; // true for plain paper print, false for pre-printed form feed
    bgImageUrl?: string;    // Custom scan or default image url
    fields: Record<string, CedulaFieldConfig>;
}

export const DEFAULT_CEDULA_FIELDS: Record<string, CedulaFieldConfig> = {
    year: {
        id: "year",
        label: "Year (YY)",
        category: "HEADER",
        x: 8.0,
        y: 18.0,
        width: 6.0,
        fontSize: 10,
        fontWeight: "bold",
        textAlign: "left",
        visible: true,
        sampleValue: "26"
    },
    placeOfIssue: {
        id: "placeOfIssue",
        label: "Place of Issue",
        category: "HEADER",
        x: 15.0,
        y: 18.0,
        width: 28.0,
        fontSize: 8.5,
        fontWeight: "bold",
        textAlign: "left",
        visible: true,
        sampleValue: "MAPANDAN, PANGASINAN"
    },
    dateIssued: {
        id: "dateIssued",
        label: "Date Issued",
        category: "HEADER",
        x: 44.5,
        y: 18.0,
        width: 17.0,
        fontSize: 8.5,
        fontWeight: "bold",
        textAlign: "left",
        visible: true,
        sampleValue: "03/21/2026"
    },
    ctcNumber: {
        id: "ctcNumber",
        label: "CTC Booklet Serial #",
        category: "HEADER",
        x: 73.0,
        y: 10.5,
        width: 22.0,
        fontSize: 11,
        fontWeight: "bold",
        textAlign: "right",
        visible: true,
        sampleValue: "23327052"
    },
    tin: {
        id: "tin",
        label: "Taxpayer TIN",
        category: "HEADER",
        x: 68.0,
        y: 22.5,
        width: 28.0,
        fontSize: 8.5,
        fontWeight: "bold",
        textAlign: "left",
        visible: true,
        sampleValue: "123-456-789-000"
    },
    taxpayerName: {
        id: "taxpayerName",
        label: "Taxpayer Name (Surname, First, Middle)",
        category: "TAXPAYER",
        x: 5.5,
        y: 22.5,
        width: 58.0,
        fontSize: 9,
        fontWeight: "bold",
        textAlign: "left",
        visible: true,
        sampleValue: "DELA CRUZ, JUAN SANTOS"
    },
    address: {
        id: "address",
        label: "Address",
        category: "TAXPAYER",
        x: 5.5,
        y: 26.8,
        width: 58.0,
        fontSize: 8,
        fontWeight: "bold",
        textAlign: "left",
        visible: true,
        sampleValue: "BRGY. POBLACION, MAPANDAN, PANGASINAN"
    },
    sexMale: {
        id: "sexMale",
        label: "Sex: Male (Mark X)",
        category: "STATUS",
        x: 71.2,
        y: 26.5,
        width: 4.0,
        fontSize: 9,
        fontWeight: "bold",
        textAlign: "center",
        visible: true,
        sampleValue: "X"
    },
    sexFemale: {
        id: "sexFemale",
        label: "Sex: Female (Mark X)",
        category: "STATUS",
        x: 71.2,
        y: 28.8,
        width: 4.0,
        fontSize: 9,
        fontWeight: "bold",
        textAlign: "center",
        visible: true,
        sampleValue: ""
    },
    citizenship: {
        id: "citizenship",
        label: "Citizenship",
        category: "TAXPAYER",
        x: 5.5,
        y: 32.5,
        width: 17.5,
        fontSize: 8,
        fontWeight: "bold",
        textAlign: "left",
        visible: true,
        sampleValue: "FILIPINO"
    },
    icrNo: {
        id: "icrNo",
        label: "ICR No. (if alien)",
        category: "TAXPAYER",
        x: 23.5,
        y: 32.5,
        width: 19.5,
        fontSize: 8,
        fontWeight: "bold",
        textAlign: "left",
        visible: true,
        sampleValue: "N/A"
    },
    placeOfBirth: {
        id: "placeOfBirth",
        label: "Place of Birth",
        category: "TAXPAYER",
        x: 44.0,
        y: 32.5,
        width: 34.0,
        fontSize: 8,
        fontWeight: "bold",
        textAlign: "left",
        visible: true,
        sampleValue: "DAGUPAN CITY, PANGASINAN"
    },
    height: {
        id: "height",
        label: "Height",
        category: "TAXPAYER",
        x: 79.0,
        y: 32.5,
        width: 17.0,
        fontSize: 8,
        fontWeight: "bold",
        textAlign: "left",
        visible: true,
        sampleValue: "170 cm"
    },
    civilStatusSingle: {
        id: "civilStatusSingle",
        label: "Civil Status: Single (X)",
        category: "STATUS",
        x: 16.5,
        y: 36.5,
        width: 3.5,
        fontSize: 8,
        fontWeight: "bold",
        textAlign: "center",
        visible: true,
        sampleValue: "X"
    },
    civilStatusMarried: {
        id: "civilStatusMarried",
        label: "Civil Status: Married (X)",
        category: "STATUS",
        x: 16.5,
        y: 38.5,
        width: 3.5,
        fontSize: 8,
        fontWeight: "bold",
        textAlign: "center",
        visible: true,
        sampleValue: ""
    },
    civilStatusWidowed: {
        id: "civilStatusWidowed",
        label: "Civil Status: Widowed/Separated (X)",
        category: "STATUS",
        x: 28.5,
        y: 36.5,
        width: 3.5,
        fontSize: 8,
        fontWeight: "bold",
        textAlign: "center",
        visible: true,
        sampleValue: ""
    },
    civilStatusDivorced: {
        id: "civilStatusDivorced",
        label: "Civil Status: Divorced (X)",
        category: "STATUS",
        x: 28.5,
        y: 38.5,
        width: 3.5,
        fontSize: 8,
        fontWeight: "bold",
        textAlign: "center",
        visible: true,
        sampleValue: ""
    },
    dateOfBirth: {
        id: "dateOfBirth",
        label: "Date of Birth",
        category: "TAXPAYER",
        x: 63.5,
        y: 37.0,
        width: 15.0,
        fontSize: 8,
        fontWeight: "bold",
        textAlign: "left",
        visible: true,
        sampleValue: "1995-08-15"
    },
    weight: {
        id: "weight",
        label: "Weight",
        category: "TAXPAYER",
        x: 79.0,
        y: 37.0,
        width: 17.0,
        fontSize: 8,
        fontWeight: "bold",
        textAlign: "left",
        visible: true,
        sampleValue: "65 kg"
    },
    profession: {
        id: "profession",
        label: "Profession / Occupation / Business",
        category: "TAXPAYER",
        x: 5.5,
        y: 42.5,
        width: 58.0,
        fontSize: 8,
        fontWeight: "bold",
        textAlign: "left",
        visible: true,
        sampleValue: "GOVERNMENT EMPLOYEE"
    },
    taxableIncomeBasis: {
        id: "taxableIncomeBasis",
        label: "Taxable Amount Basis (Header)",
        category: "TAX_ASSESSMENT",
        x: 64.0,
        y: 43.0,
        width: 14.5,
        fontSize: 7.5,
        fontWeight: "bold",
        textAlign: "right",
        visible: true,
        sampleValue: "350,000.00"
    },
    basicTax: {
        id: "basicTax",
        label: "A. Basic Community Tax (₱5.00)",
        category: "TAX_ASSESSMENT",
        x: 80.0,
        y: 46.8,
        width: 16.0,
        fontSize: 8.5,
        fontWeight: "bold",
        textAlign: "right",
        visible: true,
        sampleValue: "5.00"
    },
    additionalTax1Basis: {
        id: "additionalTax1Basis",
        label: "B1. Business Gross Receipts Basis",
        category: "TAX_ASSESSMENT",
        x: 64.0,
        y: 57.0,
        width: 14.5,
        fontSize: 8,
        fontWeight: "bold",
        textAlign: "right",
        visible: true,
        sampleValue: "0.00"
    },
    additionalTax1Amount: {
        id: "additionalTax1Amount",
        label: "B1. Business Tax Due",
        category: "TAX_ASSESSMENT",
        x: 80.0,
        y: 57.0,
        width: 16.0,
        fontSize: 8,
        fontWeight: "bold",
        textAlign: "right",
        visible: true,
        sampleValue: "0.00"
    },
    additionalTax2Basis: {
        id: "additionalTax2Basis",
        label: "B2. Salaries / Profession Basis",
        category: "TAX_ASSESSMENT",
        x: 64.0,
        y: 62.5,
        width: 14.5,
        fontSize: 8,
        fontWeight: "bold",
        textAlign: "right",
        visible: true,
        sampleValue: "350,000.00"
    },
    additionalTax2Amount: {
        id: "additionalTax2Amount",
        label: "B2. Salaries / Profession Tax Due",
        category: "TAX_ASSESSMENT",
        x: 80.0,
        y: 62.5,
        width: 16.0,
        fontSize: 8,
        fontWeight: "bold",
        textAlign: "right",
        visible: true,
        sampleValue: "350.00"
    },
    additionalTax3Basis: {
        id: "additionalTax3Basis",
        label: "B3. Real Property Income Basis",
        category: "TAX_ASSESSMENT",
        x: 64.0,
        y: 66.8,
        width: 14.5,
        fontSize: 8,
        fontWeight: "bold",
        textAlign: "right",
        visible: true,
        sampleValue: "0.00"
    },
    additionalTax3Amount: {
        id: "additionalTax3Amount",
        label: "B3. Real Property Tax Due",
        category: "TAX_ASSESSMENT",
        x: 80.0,
        y: 66.8,
        width: 16.0,
        fontSize: 8,
        fontWeight: "bold",
        textAlign: "right",
        visible: true,
        sampleValue: "0.00"
    },
    totalCommunityTax: {
        id: "totalCommunityTax",
        label: "Total Community Tax Due",
        category: "TAX_ASSESSMENT",
        x: 80.0,
        y: 71.5,
        width: 16.0,
        fontSize: 8.5,
        fontWeight: "bold",
        textAlign: "right",
        visible: true,
        sampleValue: "355.00"
    },
    penalty: {
        id: "penalty",
        label: "Interest / Penalty",
        category: "TAX_ASSESSMENT",
        x: 80.0,
        y: 76.5,
        width: 16.0,
        fontSize: 8.5,
        fontWeight: "bold",
        textAlign: "right",
        visible: true,
        sampleValue: "0.00"
    },
    totalAmountPaid: {
        id: "totalAmountPaid",
        label: "TOTAL AMOUNT PAID (Figures)",
        category: "TAX_ASSESSMENT",
        x: 80.0,
        y: 82.5,
        width: 16.0,
        fontSize: 10,
        fontWeight: "bold",
        textAlign: "right",
        visible: true,
        sampleValue: "355.00"
    },
    totalAmountInWords: {
        id: "totalAmountInWords",
        label: "Total Amount in Words",
        category: "FOOTER",
        x: 63.5,
        y: 87.5,
        width: 32.5,
        fontSize: 7.5,
        fontWeight: "bold",
        textAlign: "left",
        visible: true,
        sampleValue: "THREE HUNDRED FIFTY-FIVE PESOS ONLY"
    },
    municipalTreasurer: {
        id: "municipalTreasurer",
        label: "Municipal Treasurer",
        category: "FOOTER",
        x: 35.0,
        y: 90.0,
        width: 25.0,
        fontSize: 8,
        fontWeight: "bold",
        textAlign: "center",
        visible: true,
        sampleValue: "MUNICIPAL TREASURER"
    }
};

export const DEFAULT_CEDULA_LAYOUT: CedulaLayoutSettings = {
    widthMm: 180,
    heightMm: 115,
    bgOpacity: 85,
    showBgInPrint: true,
    bgImageUrl: "/images/cedula-template.png",
    fields: DEFAULT_CEDULA_FIELDS
};
