/**
 * Cedula (Community Tax Certificate) Calculation Logic
 * Based on the LGU Online Services Portal Documentation
 */

export type CedulaType = "INDIVIDUAL" | "JURIDICAL";

export interface CedulaCalculationParams {
    type: CedulaType;
    income: number;
    propertyValue: number;
    isPastDeadline?: boolean; // Default check: On or after March 1
    fulfillmentType?: "PICK_UP" | "DELIVERY" | "E_COPY" | null;
    deliveryFee?: number;
    baseFee?: number;
    settings?: Record<string, string>;
}

export interface CedulaResult {
    basicTax: number;
    additionalTax: number;
    penalty: number;
    deliveryFee: number;
    totalAmount: number;
}

/**
 * Checks if the current date is on or after March 1st of the current year.
 */
export function isPastCedulaDeadline(): boolean {
    const now = new Date();
    const march1st = new Date(now.getFullYear(), 2, 1); // Month is 0-indexed (2 = March)
    return now >= march1st;
}

/**
 * Calculates the penalty rate based on the current month.
 */
export function getCedulaPenaltyRate(settings?: Record<string, string>): number {
    const now = new Date();
    const month = now.getMonth(); // 0-indexed: 0=Jan, 1=Feb, 2=Mar...

    // Penalty starts in March (Index 2)
    if (month < 2) return 0;
    
    // Default penalty rate is 2% monthly
    const monthlyRate = settings?.cedula_penalty_rate_monthly ? parseFloat(settings.cedula_penalty_rate_monthly) : 0.02;
    return (month - 1) * monthlyRate;
}

/**
 * Returns a human-readable penalty label (e.g., "4%")
 */
export function getCedulaPenaltyRateLabel(settings?: Record<string, string>): string {
    const rate = getCedulaPenaltyRate(settings);
    return `${Math.round(rate * 100)}%`;
}

/**
 * Computes the Community Tax Certificate (Cedula) amount.
 */
export function calculateCedula(params: CedulaCalculationParams): CedulaResult {
    const { 
        type, 
        income, 
        propertyValue, 
        fulfillmentType = "PICK_UP",
        deliveryFee = 0,
        settings = {}
    } = params;

    // Load basic tax defaults or settings
    const defaultBasicIndividual = settings.cedula_basic_tax_individual ? parseFloat(settings.cedula_basic_tax_individual) : 5.00;
    const defaultBasicJuridical = settings.cedula_basic_tax_juridical ? parseFloat(settings.cedula_basic_tax_juridical) : 500.00;
    const basicTax = type === "INDIVIDUAL" ? defaultBasicIndividual : defaultBasicJuridical;

    // Load additional tax rate defaults or settings (in Peso, representing rate per basis)
    const addRateIndiv = settings.cedula_additional_tax_rate_individual ? parseFloat(settings.cedula_additional_tax_rate_individual) : 1.00;
    const addRateJur = settings.cedula_additional_tax_rate_juridical ? parseFloat(settings.cedula_additional_tax_rate_juridical) : 2.00;

    let additionalTax = 0;
    const totalBasis = income + propertyValue;

    if (type === "INDIVIDUAL") {
        // Individual: ₱X.XX for every ₱1,000 of income/property
        additionalTax = Math.floor(totalBasis / 1000) * addRateIndiv;
    } else {
        // Juridical: ₱Y.YY for every ₱5,000 of income/property
        additionalTax = Math.floor(totalBasis / 5000) * addRateJur;
    }

    // --- PENALTY (Monthly interest starting March 1st) ---
    // Penalty is calculated based on the Community Tax (Basic + Additional)
    let penalty = 0;
    const penaltyRate = getCedulaPenaltyRate(settings);
    if (penaltyRate > 0) {
        penalty = (basicTax + additionalTax) * penaltyRate;
    }

    // --- ABSOLUTE TOTAL CAPPING (Staff Requirement) ---
    // The Total Due (Basic + Additional + Penalty) must not exceed the capping settings
    const capIndiv = settings.cedula_cap_individual ? parseFloat(settings.cedula_cap_individual) : 5000.00;
    const capJur = settings.cedula_cap_juridical ? parseFloat(settings.cedula_cap_juridical) : 10000.00;
    const totalCap = type === "INDIVIDUAL" ? capIndiv : capJur;
    const currentSubtotal = basicTax + additionalTax + penalty;

    if (currentSubtotal > totalCap) {
        // Correct Mathematical Scaling:
        // Let T = Community Tax (Basic + Additional)
        // Penalty P = T * penaltyRate
        // Total = T + P = T * (1 + penaltyRate)
        // We want Total = totalCap => T = totalCap / (1 + penaltyRate)
        const targetCommunityTax = totalCap / (1 + penaltyRate);
        
        // Update components based on target principal
        additionalTax = targetCommunityTax - basicTax;
        
        // Ensure additionalTax doesn't go below 0
        if (additionalTax < 0) additionalTax = 0;

        // Recalculate penalty on the capped principal
        penalty = (basicTax + additionalTax) * penaltyRate;
    }

    // Delivery Fee (External to caps)
    const finalDeliveryFee = fulfillmentType === "DELIVERY" ? deliveryFee : 0;

    return {
        basicTax,
        additionalTax,
        penalty,
        deliveryFee: finalDeliveryFee,
        totalAmount: basicTax + additionalTax + penalty + finalDeliveryFee
    };
}
