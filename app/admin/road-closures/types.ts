// =========================================================================
// ROAD CLOSURE TYPES & ENUMS
// Decoupled types that mirror schema.prisma to ensure zero IDE/TS compiler lag
// =========================================================================

export const RoadClosureStatus = {
    CLOSED: "CLOSED",
    PARTIALLY_CLOSED: "PARTIALLY_CLOSED",
    DETOUR_ONLY: "DETOUR_ONLY",
    REOPENED: "REOPENED",
} as const;

export type RoadClosureStatus = (typeof RoadClosureStatus)[keyof typeof RoadClosureStatus];

export const RoadClosureSeverity = {
    LOW: "LOW",
    MODERATE: "MODERATE",
    HIGH: "HIGH",
    CRITICAL: "CRITICAL",
} as const;

export type RoadClosureSeverity = (typeof RoadClosureSeverity)[keyof typeof RoadClosureSeverity];

export interface LocationPoint {
    lat: number;
    lng: number;
    label?: string;
}

export interface RoadClosureRecord {
    id: string;
    title: string;
    description: string | null;
    status: RoadClosureStatus;
    severity: RoadClosureSeverity;
    roadName: string | null;
    barangay: string | null;
    startLocation: LocationPoint;
    endLocation: LocationPoint;
    routeCoordinates: [number, number][] | null;
    reason: string | null;
    detourAdvice: string | null;
    startDate: Date | string;
    expectedEndDate: Date | string | null;
    isEmergency: boolean;
    isActive: boolean;
    createdAt: Date | string;
    updatedAt: Date | string;
}
