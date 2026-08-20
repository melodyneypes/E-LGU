import { getVehicleClassifications } from "@/app/admin/poso/actions";
import VehicleClassesPage from "./VehicleClassesPage";

export const dynamic = "force-dynamic";

export default async function Page() {
    const res = await getVehicleClassifications({ page: 1, limit: 10 });
    const initialClassifications = res.success && res.classifications
        ? JSON.parse(JSON.stringify(res.classifications))
        : [];
    const totalCount = res.totalCount || 0;
    const activeCount = res.activeCount || 0;
    const totalAll = res.totalAll || 0;

    return (
        <VehicleClassesPage
            initialClassifications={initialClassifications}
            initialTotalCount={totalCount}
            initialActiveCount={activeCount}
            initialTotalAll={totalAll}
        />
    );
}
