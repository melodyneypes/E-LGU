/**
 * Business Permit Calculation Logic
 * Based on the LGU Online Services Portal Documentation
 * Aligned with the Vertex Technologies Corporation Municipal Scale spec
 */

export type BusinessPermitType = "NEW" | "RENEWAL";

export interface BusinessPermitCalculationParams {
    type: BusinessPermitType;
    capitalization: number;
    grossSales?: number;
    assets?: number;
    workforceCount?: number;
    lineOfBusiness?: string;
    floorArea?: number;
    healthCardCount?: number;
    fulfillmentType?: "PICK_UP" | "DELIVERY" | "E_COPY" | null;
    deliveryFee?: number;
}

export interface BusinessPermitResult {
    baseFee: number; // Mayor's Permit Fee (calculated based on classification scale)
    taxAmount: number; // Graduated or capital-based business tax
    sanitaryInspectionFee: number; // Sanitary fee based on floor area
    garbageFee: number; // Garbage fee based on category and floor area
    healthCertificateFee: number; // Health cards count * 100
    regulatoryFee: number; // Placeholder for legacy or other fees
    deliveryFee: number;
    totalAmount: number;
    classificationSize: "MICRO" | "SMALL" | "MEDIUM" | "LARGE";
}

/**
 * Computes the Business Permit assessed tax, Mayor's Permit Fee, and surcharges.
 */
export function calculateBusinessPermit(params: BusinessPermitCalculationParams): BusinessPermitResult {
    const {
        type,
        capitalization = 0,
        grossSales = 0,
        assets = 0,
        workforceCount = 0,
        lineOfBusiness = "Other Businesses",
        floorArea = 0,
        healthCardCount = 0,
        fulfillmentType = "PICK_UP",
        deliveryFee = 0
    } = params;

    // 1. Determine Business Classification Size (whichever yields the higher classification)
    // Assets Scale:
    // Micro: < 500,000 | Small: 500,000 to 5,000,000 | Medium: 5,000,000 to 20,000,000 | Large: > 20,000,000
    let assetClass: "MICRO" | "SMALL" | "MEDIUM" | "LARGE" = "MICRO";
    if (assets > 20000000) {
        assetClass = "LARGE";
    } else if (assets > 5000000) {
        assetClass = "MEDIUM";
    } else if (assets >= 500000) {
        assetClass = "SMALL";
    }

    // Workforce Scale:
    // Micro: 1-10 | Small: 11-99 | Medium: 100-199 | Large: >= 200
    let workforceClass: "MICRO" | "SMALL" | "MEDIUM" | "LARGE" = "MICRO";
    if (workforceCount >= 200) {
        workforceClass = "LARGE";
    } else if (workforceCount >= 100) {
        workforceClass = "MEDIUM";
    } else if (workforceCount >= 11) {
        workforceClass = "SMALL";
    }

    // Choose the higher classification
    const sizeHierarchy = { MICRO: 1, SMALL: 2, MEDIUM: 3, LARGE: 4 };
    const classificationSize = sizeHierarchy[assetClass] >= sizeHierarchy[workforceClass] ? assetClass : workforceClass;

    // 2. Compute Mayor's Permit Fee (baseFee) based on classification matrix
    let baseFee = 500.00; // Default fallback
    const businessLine = lineOfBusiness.trim();

    if (businessLine === "Manufacturers/Importers/Producers") {
        const fees = { MICRO: 400.00, SMALL: 600.00, MEDIUM: 1100.00, LARGE: 2100.00 };
        baseFee = fees[classificationSize];
    } else if (businessLine === "Banks (Universal)") {
        baseFee = 5100.00; // Only large fee exists, default to it
    } else if (businessLine === "Banks (Commercial/Development)") {
        baseFee = 3100.00;
    } else if (businessLine === "Banks (Rural/Thrift/Savings)") {
        baseFee = 1600.00;
    } else if (businessLine === "Other Financial Institutions") {
        const fees = { MICRO: 1100.00, SMALL: 1600.00, MEDIUM: 3100.00, LARGE: 5100.00 };
        baseFee = fees[classificationSize];
    } else if (businessLine === "Contractors/Service Establishments") {
        const fees = { MICRO: 500.00, SMALL: 900.00, MEDIUM: 1100.00, LARGE: 1600.00 };
        baseFee = fees[classificationSize];
    } else if (businessLine === "Wholesalers/Retailers/Dealers") {
        const fees = { MICRO: 500.00, SMALL: 900.00, MEDIUM: 1100.00, LARGE: 1600.00 };
        baseFee = fees[classificationSize];
    } else {
        // Other Businesses
        const fees = { MICRO: 500.00, SMALL: 700.00, MEDIUM: 900.00, LARGE: 1100.00 };
        baseFee = fees[classificationSize];
    }

    // 3. Compute Graded Business Tax (taxAmount)
    let taxAmount = 0;

    if (type === "NEW") {
        // Newly-Started Businesses: Capitalization * 1% * 0.05 (0.05% of investment)
        taxAmount = capitalization * 0.01 * 0.05;
    } else {
        // RENEWAL: Compute based on gross sales
        if (businessLine === "Manufacturers/Importers/Producers") {
            if (grossSales >= 6500000) {
                taxAmount = grossSales * 0.01 * 0.4125;
            } else if (grossSales >= 5000000) {
                taxAmount = 26812.50;
            } else if (grossSales >= 4000000) {
                taxAmount = 25410.00;
            } else if (grossSales >= 300000) {
                taxAmount = 6050.00;
            } else if (grossSales >= 200000) {
                taxAmount = 4235.00;
            } else if (grossSales >= 15000) {
                taxAmount = 332.20;
            } else if (grossSales >= 10000) {
                taxAmount = 242.00;
            } else {
                taxAmount = 181.50;
            }
        } else if (businessLine === "Wholesalers/Retailers/Dealers") {
            // Wholesalers, Distributors, and Dealers
            if (grossSales >= 2000000) {
                taxAmount = grossSales * 0.01 * 0.55;
                if (taxAmount < 11000.00) taxAmount = 11000.00; // Floor limit cap
            } else if (grossSales >= 1000000) {
                taxAmount = 11000.00;
            } else if (grossSales >= 750000) {
                taxAmount = 9680.00;
            } else if (grossSales >= 500000) {
                taxAmount = 7260.00;
            } else if (grossSales >= 300000) {
                taxAmount = 4840.00;
            } else if (grossSales >= 200000) {
                taxAmount = 3630.00;
            } else if (grossSales >= 150000) {
                taxAmount = 2662.00;
            } else if (grossSales >= 100000) {
                taxAmount = 2057.00;
            } else if (grossSales >= 75000) {
                taxAmount = 1452.00;
            } else if (grossSales >= 50000) {
                taxAmount = 1089.00;
            } else if (grossSales >= 40000) {
                taxAmount = 726.00;
            } else if (grossSales >= 30000) {
                taxAmount = 484.00;
            } else if (grossSales >= 20000) {
                taxAmount = 363.00;
            } else if (grossSales >= 15000) {
                taxAmount = 302.50;
            } else if (grossSales >= 10000) {
                taxAmount = 242.00;
            } else if (grossSales >= 8000) {
                taxAmount = 205.70;
            } else if (grossSales >= 7000) {
                taxAmount = 181.50;
            } else if (grossSales >= 6000) {
                taxAmount = 157.30;
            } else if (grossSales >= 5000) {
                taxAmount = 133.10;
            } else if (grossSales >= 4000) {
                taxAmount = 110.00;
            } else if (grossSales >= 3000) {
                taxAmount = 79.20;
            } else if (grossSales >= 2000) {
                taxAmount = 55.00;
            } else if (grossSales >= 1000) {
                taxAmount = 36.30;
            } else {
                taxAmount = 19.80;
            }
        } else {
            // Retailers & Other generic businesses:
            // Retailers (Sari-Sari / Retail Stores)
            if (grossSales <= 400000) {
                taxAmount = grossSales * 0.022; // 2.2%
            } else {
                taxAmount = grossSales * 0.011; // 1.1%
            }
        }
    }

    // 4. Compute Appended Surcharges
    // Sanitary Inspection Fee based on floor area:
    // Area 25 to < 50: 100 | 50 to < 100: 150 | 100 to < 200: 200 | 200 to < 500: 250 | 500 to < 1000: 300 | 1000+: 350
    let sanitaryInspectionFee = 0;
    if (floorArea >= 1000) {
        sanitaryInspectionFee = 350.00;
    } else if (floorArea >= 500) {
        sanitaryInspectionFee = 300.00;
    } else if (floorArea >= 200) {
        sanitaryInspectionFee = 250.00;
    } else if (floorArea >= 100) {
        sanitaryInspectionFee = 200.00;
    } else if (floorArea >= 50) {
        sanitaryInspectionFee = 150.00;
    } else if (floorArea >= 25) {
        sanitaryInspectionFee = 100.00;
    }

    // Garbage Collection Fee:
    let garbageFee = 0;
    const lowerLine = businessLine.toLowerCase();
    if (lowerLine.includes("manufacturers")) {
        garbageFee = floorArea <= 100 ? 1500.00 : 2500.00;
    } else if (lowerLine.includes("hotels") || lowerLine.includes("apartments")) {
        garbageFee = floorArea <= 100 ? 1000.00 : 1500.00;
    } else if (lowerLine.includes("restaurants") || lowerLine.includes("eateries") || lowerLine.includes("food")) {
        garbageFee = floorArea <= 50 ? 1000.00 : 2000.00;
    } else if (lowerLine.includes("hospitals") || lowerLine.includes("clinics")) {
        garbageFee = floorArea <= 10 ? 1000.00 : 1500.00;
    } else {
        // Retail Stores/Movie Houses/Others
        garbageFee = floorArea <= 10 ? 800.00 : 1200.00;
    }

    // Health Card Fee: healthCardCount * 100.00
    const healthCertificateFee = healthCardCount * 100.00;

    const regulatoryFee = 0.00; // Placeholder

    // Delivery Fee (added external to the tax base)
    const finalDeliveryFee = fulfillmentType === "DELIVERY" ? deliveryFee : 0;

    return {
        baseFee,
        taxAmount,
        sanitaryInspectionFee,
        garbageFee,
        healthCertificateFee,
        regulatoryFee,
        deliveryFee: finalDeliveryFee,
        totalAmount: baseFee + taxAmount + sanitaryInspectionFee + garbageFee + healthCertificateFee + regulatoryFee + finalDeliveryFee,
        classificationSize
    };
}
