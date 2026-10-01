import { redirect } from "next/navigation";

export default function MedicineShortagePage() {
    redirect("/admin/rhu/inventory/shortage-report");
}
