export const MUNICIPAL_FACILITIES = [
    "Main Rural Health Unit (RHU)",
    "BHS {{BARANGAY_NAME}}",
    "BHS {{BARANGAY_NAME}}",
    "BHS {{BARANGAY_NAME}}",
    "BHS {{BARANGAY_NAME}}",
    "BHS {{BARANGAY_NAME}}",
    "BHS {{BARANGAY_NAME}}",
    "BHS {{BARANGAY_NAME}}",
    "BHS {{BARANGAY_NAME}}",
    "BHS Licsi",
    "BHS Luan",
    "BHS {{BARANGAY_NAME}}",
    "BHS {{BARANGAY_NAME}}",
    "BHS {{BARANGAY_NAME}}",
    "BHS {{BARANGAY_NAME}}",
    "BHS {{BARANGAY_NAME}}",
    "BHS {{BARANGAY_NAME}}"
];
export const LGU_FACILITIES = MUNICIPAL_FACILITIES;

export const FACILITY_ROOMS: Record<string, string[]> = {
    "Main Rural Health Unit (RHU)": [
        "Central Stockroom",
        "Consultation Room 1",
        "Consultation Room 2",
        "Emergency & Triage Room",
        "Dental Clinic",
        "Maternity & Delivery Ward",
        "Laboratory & Diagnostics",
        "Pharmacy Dispensing Unit",
        "Immunization Area",
        "Administrative / MHO Office"
    ],
    "DEFAULT_BHS": [
        "Treatment & Examination Room",
        "Consultation Area",
        "Maternal & Child Health Room",
        "Medicine & Supply Storage",
        "Nurse & Midwife Station"
    ]
};

export function getRoomsForFacility(facility?: string): string[] {
    if (!facility || typeof facility !== "string") {
        return FACILITY_ROOMS["DEFAULT_BHS"];
    }
    if (facility === "Main Rural Health Unit (RHU)" || facility.toLowerCase().includes("main")) {
        return FACILITY_ROOMS["Main Rural Health Unit (RHU)"];
    }
    return FACILITY_ROOMS["DEFAULT_BHS"];
}
