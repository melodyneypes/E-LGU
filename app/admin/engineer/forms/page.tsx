import { getDownloadableForms } from "./actions";
import FormsClient from "./FormsClient";
import { HardHat } from "lucide-react";

export const metadata = {
    title: "Downloadable Forms | Engineer Hub",
};

export const dynamic = "force-dynamic";

export default async function DownloadableFormsPage() {
    const response = await getDownloadableForms();
    const initialForms = response.success ? response.data || [] : [];

    return (
        <div className="flex-1 p-8 overflow-y-auto">
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex items-center gap-3">
                    <div className="w-1.5 h-8 bg-red-600 rounded-full" />
                    <div>
                        <div className="flex items-center gap-2">
                            <HardHat className="w-5 h-5 text-red-600" />
                            <h1 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-wider">
                                Downloadable Forms
                            </h1>
                        </div>
                        <p className="text-sm text-slate-500 font-medium">
                            Manage the forms and documents available for citizens to download in the Requirements Guide.
                        </p>
                    </div>
                </div>

                <FormsClient initialForms={initialForms} />
            </div>
        </div>
    );
}
