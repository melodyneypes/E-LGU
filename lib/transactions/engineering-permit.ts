export const BUILDING_PERMIT_CODE = "BUILDING_PERMIT";
export const OCCUPANCY_PERMIT_CODE = "OCCUPANCY_PERMIT";

export function isEngineeringPermitCode(code?: string | null): boolean {
  if (!code) return false;

  return (
    code.startsWith("BUILDING_PERMIT") ||
    code.startsWith("OCCUPANCY_PERMIT")
  );
}

export function getEngineeringPermitLabel(code?: string | null): string | null {
  if (code?.startsWith(OCCUPANCY_PERMIT_CODE)) {
    return "Occupancy Permit";
  }

  if (code?.startsWith(BUILDING_PERMIT_CODE)) {
    return "Building Permit";
  }

  return null;
}

export function getEngineeringPermitCitizenRoute(
  code?: string | null
): string | null {
  if (code?.startsWith(OCCUPANCY_PERMIT_CODE)) {
    return "/user/services/occupancy";
  }

  if (code?.startsWith(BUILDING_PERMIT_CODE)) {
    return "/user/services/building-permit";
  }

  return null;
}

export const ENGINEERING_PERMIT_CODES = [
  BUILDING_PERMIT_CODE,
  OCCUPANCY_PERMIT_CODE,
] as const;
