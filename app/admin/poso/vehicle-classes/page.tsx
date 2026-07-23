import { getVehicleClassifications } from "@/app/admin/poso/actions";
import VehicleClassesPage from "./VehicleClassesPage";

export const dynamic = "force-dynamic";

export default async function Page() {
    const res = await getVehicleClassifications(false);
    const initialClassifications = res.success && res.classifications
        ? JSON.parse(JSON.stringify(res.classifications))
        : [];

    return <VehicleClassesPage initialClassifications={initialClassifications} />;
}
