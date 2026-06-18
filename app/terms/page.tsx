import { getMultipleSystemSettings } from "@/lib/settings";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { cn } from "@/lib/utils";
import { TermsClient } from "./TermsClient";

export const dynamic = "force-dynamic";

export default async function TermsPage() {
    const settings = await getMultipleSystemSettings([
        "site_logo",
        "brand_word_1",
        "brand_word_2",
        "theme_color",
        "maintenance_mode",
        "social_facebook",
        "social_twitter",
        "social_instagram",
        "contact_address",
        "contact_email",
        "contact_phone"
    ]);

    const isMaintenance = settings.get("maintenance_mode") === "true";
    const themeColor = settings.get("theme_color") || "#2563eb";
    const facebookUrl = settings.get("social_facebook") || "#";
    const twitterUrl = settings.get("social_twitter") || "#";
    const instagramUrl = settings.get("social_instagram") || "#";
    const contactAddress = settings.get("contact_address") || "Municipal Hall, Poblacion";
    const contactEmail = settings.get("contact_email") || "info@portal.gov.ph";
    const contactPhone = settings.get("contact_phone") || "(075) 000-0000";

    return (
        <div 
            className={cn(
                "min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col selection:bg-primary/30 font-sans transition-colors duration-300",
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
            
            <main className="flex-1 pt-36 pb-20 px-4 sm:px-6 lg:px-8">
                <TermsClient themeColor={themeColor} />
            </main>

            <Footer 
                logoUrl={settings.get("site_logo") || ""} 
                brandWord1={settings.get("brand_word_1") || "LGU"} 
                brandWord2={settings.get("brand_word_2") || ""} 
                themeColor={themeColor} 
                facebookUrl={facebookUrl}
                twitterUrl={twitterUrl}
                instagramUrl={instagramUrl}
                contactAddress={contactAddress}
                contactEmail={contactEmail}
                contactPhone={contactPhone}
            />
        </div>
    );
}
