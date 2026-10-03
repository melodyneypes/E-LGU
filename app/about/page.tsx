import { getMultipleSystemSettings } from "@/lib/settings";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { AboutClientView } from "./AboutClientView";
import { cn } from "@/lib/utils";
import lguConfig from "@/config/lgu.config.json";

export const dynamic = "force-dynamic";

export default async function AboutPage() {
    const settings = await getMultipleSystemSettings([
        "maintenance_mode",
    ]);

    const isMaintenance = settings.get("maintenance_mode") === "true";
    const themeColor = lguConfig.theme.primary;
    const aboutData = {
        history: lguConfig.about.history,
        mission: lguConfig.about.mission,
        vision: lguConfig.about.vision,
        coreValues: lguConfig.about.coreValues,
        geographyOrDemographics: lguConfig.about.geographyOrDemographics,
        mayorMessage: lguConfig.about.mayorMessage,
        mayorImageUrl: lguConfig.assets.officialPortrait,
    };
    const pastMayors: any[] = [];

    return (
        <div 
            className={cn(
                "min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col selection:bg-primary/30 font-sans",
                isMaintenance && "pt-10 sm:pt-12 md:pt-14"
            )} 
            style={{ "--primary-theme": themeColor } as React.CSSProperties}
        >
            <Navbar themeColor={themeColor} isMaintenanceActive={isMaintenance} />
            
            {isMaintenance && (
                <div className="bg-amber-500 text-slate-950 font-bold text-center px-4 h-10 sm:h-12 md:h-14 z-[110] fixed top-0 left-0 right-0 shadow-lg flex items-center justify-center gap-2 text-xs uppercase tracking-wider">
                    <span className="animate-pulse inline-block w-2.5 h-2.5 rounded-full bg-red-600 mr-1" />
                    <strong>Maintenance Mode Active:</strong> Some online transactional features and forms are temporarily disabled.
                </div>
            )}
            
            <AboutClientView 
                aboutData={aboutData} 
                pastMayors={pastMayors}
                themeColor={themeColor} 
                brandWord1={lguConfig.identity.brandWord1}
                brandWord2={lguConfig.identity.brandWord2}
            />

            <Footer themeColor={themeColor} />
        </div>
    );
}
