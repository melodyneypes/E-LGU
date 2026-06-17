import prisma from "@/lib/db/prisma";
import { getMultipleSystemSettings } from "@/lib/settings";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { AboutClientView } from "./AboutClientView";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AboutPage(props: { searchParams: Promise<{ barangay?: string }> }) {
    const searchParams = await props.searchParams;
    const barangay = searchParams.barangay;

    const settings = await getMultipleSystemSettings([
        "site_logo",
        "brand_word_1",
        "brand_word_2",
        "theme_color",
        "maintenance_mode"
    ]);

    const isMaintenance = settings.get("maintenance_mode") === "true";

    const themeColor = settings.get("theme_color") || "#2563eb";

    let aboutData: any = null;
    let pastMayors: any[] = [];
    let isBarangayView = false;

    if (barangay) {
        // Fetch Barangay specific info
        const barangayInfo = await (prisma as any).barangayInfo.findUnique({
            where: { name: barangay }
        });

        if (barangayInfo) {
            isBarangayView = true;
            // Adapter: Map BarangayInfo fields to what AboutClientView expects
            aboutData = {
                ...barangayInfo,
                mayorMessage: barangayInfo.captainMessage || "",
                mayorImageUrl: barangayInfo.captainImageUrl || null,
                // Ensure other AboutPage fields are handled
                coreValues: barangayInfo.coreValues || "",
                history: barangayInfo.history || "",
                mission: barangayInfo.mission || "",
                vision: barangayInfo.vision || "",
                geographyOrDemographics: barangayInfo.geographyOrDemographics || "",
                coverImages: barangayInfo.coverImages || []
            };

            // Fetch past leaders for the barangay
            pastMayors = await (prisma as any).pastMayor.findMany({
                where: { barangay: barangay },
                orderBy: { order: 'asc' }
            });
        }
    }

    // Fallback if not on a barangay page or if barangay info not found
    if (!aboutData) {
        aboutData = await (prisma as any).aboutPage.findFirst();
        pastMayors = await (prisma as any).pastMayor.findMany({
            where: { barangay: null },
            orderBy: { order: 'asc' }
        });
    }

    if (!aboutData) {
        return (
            <div className={cn(
                "min-h-screen bg-slate-50 flex flex-col",
                isMaintenance && "pt-10 sm:pt-12 md:pt-14"
            )}>
                <Navbar 
                    logoUrl={settings.get("site_logo") || ""} 
                    brandWord1={settings.get("brand_word_1") || "LGU"} 
                    brandWord2={settings.get("brand_word_2") || ""} 
                    themeColor={themeColor} 
                    isMaintenanceActive={isMaintenance}
                />
                {isMaintenance && (
                    <div className="bg-amber-500 text-slate-950 font-bold text-center px-4 h-10 sm:h-12 md:h-14 z-[110] fixed top-0 left-0 right-0 shadow-lg flex items-center justify-center gap-2 text-xs uppercase tracking-wider">
                        <span className="animate-pulse inline-block w-2.5 h-2.5 rounded-full bg-red-600 mr-1" />
                        <strong>Maintenance Mode Active:</strong> Some online transactional features and forms are temporarily disabled.
                    </div>
                )}
                <main className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500">
                    <h1 className="text-3xl font-bold mb-4">About Page Not Setup</h1>
                    <p>The Administrator has not provided any content for the about page yet.</p>
                </main>
                <Footer 
                    logoUrl={settings.get("site_logo") || ""} 
                    brandWord1={settings.get("brand_word_1") || "LGU"} 
                    brandWord2={settings.get("brand_word_2") || ""} 
                    themeColor={themeColor} 
                />
            </div>
        );
    }

    return (
        <div 
            className={cn(
                "min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col selection:bg-primary/30 font-sans",
                isMaintenance && "pt-10 sm:pt-12 md:pt-14"
            )} 
            style={{ "--primary-theme": themeColor } as React.CSSProperties}
        >
            <Navbar 
                logoUrl={settings.get("site_logo") || ""} 
                brandWord1={settings.get("brand_word_1") || "LGU"} 
                brandWord2={settings.get("brand_word_2") || ""} 
                themeColor={themeColor} 
                isMaintenanceActive={isMaintenance}
            />
            
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
                brandWord1={isBarangayView ? "Barangay" : (settings.get("brand_word_1") || "LGU")} 
                brandWord2={isBarangayView ? (barangay || "") : (settings.get("brand_word_2") || "")} 
                isBarangayView={isBarangayView}
            />

            <Footer 
                logoUrl={settings.get("site_logo") || ""} 
                brandWord1={settings.get("brand_word_1") || "LGU"} 
                brandWord2={settings.get("brand_word_2") || ""} 
                themeColor={themeColor} 
            />
        </div>
    );
}
