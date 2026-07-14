export const PSA_APPOINTMENT_CODES = [
    "LCR_BIRTH_CERTIFIED_TRUE_COPY_APPOINTMENT",
    "LCR_DEATH_CERTIFIED_TRUE_COPY_APPOINTMENT",
    "LCR_MARRIAGE_CERTIFIED_TRUE_COPY_APPOINTMENT"
];

export function isPsaAppointmentEndorsement(typeCode: string): boolean {
    return PSA_APPOINTMENT_CODES.includes(typeCode);
}
