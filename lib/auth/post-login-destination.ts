export interface PostLoginUser {
    role?: string | null;
    department?: string | null;
    accessiblePages?: readonly string[] | null;
}

export function getPostLoginDestination(
    user: PostLoginUser,
    callbackUrl?: string | null
): string {
    const role = user.role || "";
    const department = user.department?.toUpperCase() || "";

    if (role === "USER") {
        return callbackUrl?.startsWith("/") && !callbackUrl.startsWith("//")
            ? callbackUrl
            : "/";
    }
    if (role === "MAYOR") {
        return "/mayor/dashboard";
    }
    if (role === "TREASURY_STAFF" || (role === "ADMIN" && department === "TREASURY")) {
        return "/admin/treasury?category=CEDULA";
    }
    if (role === "ADMIN_AIDE" || (role === "ADMIN" && department === "BPLO")) {
        return "/admin/bplo";
    }
    if (role === "BFP" || department === "BFP") {
        return "/admin/bfp";
    }
    if (role === "ENGINEER") return "/admin/engineer";
    if (role === "MPDC_ZONING") return "/admin/zoning";
    if (department === "REGISTRAR" || department === "CIVIL_REGISTRY") {
        return "/admin/registrar";
    }
    if (
        role === "RHU_CENTER_ADMIN" ||
        role === "RHU_DOCTOR" ||
        role === "RHU_STAFF" ||
        department === "RHU" ||
        department === "HEALTH" ||
        department === "RURAL_HEALTH_UNIT" ||
        department.includes("RHU CENTER") ||
        department.includes("MEDICAL ADMIN")
    ) {
        return "/admin/rhu/centers";
    }
    if (user.accessiblePages?.length) return user.accessiblePages[0];
    return "/admin/dashboard";
}
