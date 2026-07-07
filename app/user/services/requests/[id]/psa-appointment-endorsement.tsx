export const PSA_APPOINTMENT_CODES = [
    "LCR_PSA_APPOINTMENT_ENDORSEMENT",
    "LCR_DEATH_PSA_APPOINTMENT_ENDORSEMENT",
    "LCR_MARRIAGE_PSA_APPOINTMENT_ENDORSEMENT"
];

export function isPsaAppointmentEndorsement(typeCode: string): boolean {
    return PSA_APPOINTMENT_CODES.includes(typeCode);
}
