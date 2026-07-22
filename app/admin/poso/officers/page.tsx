import { getPosoOfficers } from "@/app/admin/poso/actions";
import OfficersPage from "@/app/admin/poso/officers/OfficersPage";

export const dynamic = "force-dynamic";

export default async function Page() {
    const res = await getPosoOfficers({ page: 1, pageSize: 10 });
    const officers = res.success && res.officers ? res.officers : [];
    const totalCount = res.totalCount || 0;

    return <OfficersPage initialOfficers={officers} initialTotalCount={totalCount} />;
}
