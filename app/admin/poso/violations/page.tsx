import { getTrafficViolations } from "@/app/admin/poso/actions";
import ViolationsPage from "@/app/admin/poso/violations/ViolationsPage";

export const dynamic = "force-dynamic";

export default async function Page() {
    const res = await getTrafficViolations({ page: 1, limit: 10 });
    const violations = res.success && res.violations ? res.violations : [];
    const totalCount = res.totalCount || 0;
    const activeCount = res.activeCount || 0;
    const inactiveCount = res.inactiveCount || 0;

    return (
        <ViolationsPage
            initialViolations={violations}
            initialTotalCount={totalCount}
            initialActiveCount={activeCount}
            initialInactiveCount={inactiveCount}
        />
    );
}
