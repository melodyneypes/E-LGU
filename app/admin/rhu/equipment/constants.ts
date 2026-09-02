export const MAPANDAN_FACILITIES = [
    "Main Rural Health Unit (RHU)",
    "BHS Amanoaoac",
    "BHS Apaya",
    "BHS Aserda",
    "BHS Baloling",
    "BHS Coral",
    "BHS Golden",
    "BHS Jimenez",
    "BHS Lambayan",
    "BHS Licsi",
    "BHS Luan",
    "BHS Nilombot",
    "BHS Pias",
    "BHS Poblacion",
    "BHS Primicias",
    "BHS Santa Maria",
    "BHS Torres"
];

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
