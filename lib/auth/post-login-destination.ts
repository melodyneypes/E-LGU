export interface PostLoginUser {
    role?: string | null;
    department?: string | null;
    accessiblePages?: readonly string[] | null;
}

export function getPostLoginDestination(user: PostLoginUser): string {
    const role = user.role || "";
    const department = user.department?.toUpperCase() || "";

    if (role === "USER") return "/";
    if (role === "TREASURY_STAFF" || (role === "ADMIN" && department === "TREASURY")) {
        return "/admin/treasury?category=CEDULA";
    }
    if (role === "ADMIN_AIDE" || (role === "ADMIN" && department === "BPLO")) {
        return "/admin/bplo";
    }
    if (role === "ENGINEER") return "/admin/engineer";
    if (role === "MPDC_ZONING") return "/admin/zoning";
    if (department === "REGISTRAR" || department === "CIVIL_REGISTRY") {
        return "/admin/registrar";
    }
    if (user.accessiblePages?.length) return user.accessiblePages[0];
    return "/admin/dashboard";
}
