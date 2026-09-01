import { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
    title: "RHU Ambulance Settings | Mapandan Portal",
    description: "Official administrative configuration for emergency dispatch and ambulance fleet status.",
};

export default async function RHUAmbulanceSettingsPage() {
    redirect("/admin/mdrrmo/ambulance");
}
