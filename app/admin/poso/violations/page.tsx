import { getTrafficViolations } from "@/app/admin/poso/actions";
import ViolationsPage from "@/app/admin/poso/violations/ViolationsPage";

export const dynamic = "force-dynamic";

export default async function Page() {
    const res = await getTrafficViolations();
    const violations = res.success && res.violations ? res.violations : [];

    return <ViolationsPage initialViolations={violations} />;
}
