import * as React from "react";
import nextDynamic from "next/dynamic";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { HashScrollHandler } from "@/components/shared/HashScrollHandler";
import { ClientOnly } from "@/components/shared/ClientOnly";
import { cn } from "@/lib/utils";
import { HeroSkeleton } from "@/components/sections/landing/skeletons/HeroSkeleton";
import { GovernmentSkeleton } from "@/components/sections/landing/skeletons/GovernmentSkeleton";
import { DiningLodgingSkeleton } from "@/components/sections/landing/skeletons/DiningLodgingSkeleton";
import { PlacesToVisitSkeleton } from "@/components/sections/landing/skeletons/PlacesToVisitSkeleton";

import { EventsCalendarSkeleton } from "@/components/sections/landing/skeletons/EventsCalendarSkeleton";
import { AnnouncementsNewsSkeleton } from "@/components/sections/landing/skeletons/AnnouncementsNewsSkeleton";
import { JobBoardSkeleton } from "@/components/sections/landing/skeletons/JobBoardSkeleton";
import { LGUProjectsSkeleton } from "@/components/sections/landing/skeletons/LGUProjectsSkeleton";
import { ServicesSkeleton } from "@/components/sections/landing/skeletons/ServicesSkeleton";
import { EmergencyReportSkeleton } from "@/components/sections/landing/skeletons/EmergencyReportSkeleton";
import { ParishCornerSkeleton } from "@/components/sections/landing/skeletons/ParishCornerSkeleton";

const Hero = nextDynamic(() => import("@/components/sections/landing/Hero").then(m => m.Hero), { loading: () => <HeroSkeleton /> });
const DiningLodging = nextDynamic(() => import("@/components/sections/landing/DiningLodging").then(m => m.DiningLodging), { loading: () => <DiningLodgingSkeleton /> });
const PlacesToVisit = nextDynamic(() => import("@/components/sections/landing/PlacesToVisit").then(m => m.PlacesToVisit), { loading: () => <PlacesToVisitSkeleton /> });
const EventsCalendarSection = nextDynamic(() => import("@/components/sections/landing/EventsCalendarSection").then(m => m.EventsCalendarSection), { loading: () => <EventsCalendarSkeleton /> });
const AnnouncementsNews = nextDynamic(() => import("@/components/sections/landing/AnnouncementsNews").then(m => m.AnnouncementsNews), { loading: () => <AnnouncementsNewsSkeleton /> });
const JobBoard = nextDynamic(() => import("@/components/sections/landing/JobBoard").then(m => m.JobBoard), { loading: () => <JobBoardSkeleton /> });
const LGUProjects = nextDynamic(() => import("@/components/sections/landing/LGUProjects").then(m => m.LGUProjects), { loading: () => <LGUProjectsSkeleton /> });
const Government = nextDynamic(() => import("@/components/sections/landing/Government").then(m => m.Government), { loading: () => <GovernmentSkeleton /> });
const Services = nextDynamic(() => import("@/components/sections/landing/Services").then(m => m.Services), { loading: () => <ServicesSkeleton /> });
const EmergencyReport = nextDynamic(() => import("@/components/sections/landing/EmergencyReport").then(m => m.EmergencyReport), { loading: () => <EmergencyReportSkeleton /> });
const ParishCorner = nextDynamic(() => import("../components/sections/landing/ParishCorner"), { loading: () => <ParishCornerSkeleton /> });
const AppDownloadSection = nextDynamic(() => import("@/components/sections/landing/AppDownloadSection").then(m => m.AppDownloadSection));
const OrdinancesSection = nextDynamic(() => import("@/components/sections/landing/OrdinancesSection").then(m => m.OrdinancesSection));
import prisma from "@/lib/db/prisma";
import { getMultipleSystemSettings } from "@/lib/settings";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { cookies } from "next/headers";
import { getAmbulanceSettings } from "@/app/user/services/rural-health-unit/actions";

// import { ensureBusinessPermitTransactionTypes, ensureCivilRegistryTransactionTypes, ensureBuildingPermitTransactionTypes } from "@/app/admin/transactions/actions";


export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Home({
    searchParams,
}: {
    searchParams: Promise<{ barangay?: string | string[] }>;
}) {
    const { barangay } = await searchParams;
    const selectedBarangay = typeof barangay === "string" ? barangay : "All";
    const isFiltered = selectedBarangay !== "All";

    // Ensure all service types are seeded in the database
    // await ensureBusinessPermitTransactionTypes();
    // await ensureCivilRegistryTransactionTypes();
    // await ensureBuildingPermitTransactionTypes();

    // Validate barangay: if a specific barangay is requested, check if it exists in the database
    if (isFiltered) {
        const exists = await prisma.barangayInfo.findUnique({
            where: { name: selectedBarangay },
            select: { id: true }
        });
        if (!exists) {
            redirect("/");
        }
    }

    const session = await getServerSession(authOptions);
    const role = (session?.user as { role?: string })?.role;

    const cookieStore = await cookies();
    const activePortal = cookieStore.get("active_portal")?.value;
    const bypassMaintenanceCookieValue = cookieStore.get("bypass_maintenance")?.value;

    // Completely block any Admin/Content Admin from the landing page unless they chose Citizen view
    if (session && role && role !== "USER" && activePortal !== "citizen") {
        const department = (session.user as any)?.department;
        if (department && (department.toUpperCase() === "REGISTRAR" || department.toUpperCase() === "CIVIL_REGISTRY")) {
            redirect("/admin/registrar");
        } else {
            redirect("/admin/dashboard");
        }
    }




    const settings = await getMultipleSystemSettings([
        "maintenance_mode",
        "maintenance_mode_updated_at",
        "site_logo",
        "brand_word_1",
        "brand_word_2",
        "theme_color",
        "section_dining_lodging",
        "section_places_to_visit",
        "section_events",
        "section_announcements",
        "section_lgu_projects",
        "section_jobs",
        "section_government",
        "section_services",
        "section_emergency",
        "section_church",
        "section_map",
        "section_app_download",
        "app_google_play_url",
        "app_app_store_url",
        "app_apk_download_url",
        "social_facebook",
        "social_twitter",
        "social_instagram",
        "contact_address",
        "contact_email",
        "contact_phone"
    ]);

    // Check Maintenance Mode
    const maintenance = settings.get("maintenance_mode") === "true";
    const maintenanceUpdatedAt = settings.get("maintenance_mode_updated_at") || "0";
    const bypassMaintenance = bypassMaintenanceCookieValue === maintenanceUpdatedAt;

    if (maintenance && !bypassMaintenance) {
      redirect("/maintenance");
    }

    const logoUrl = settings.get("site_logo") || "";
    const brandWord1 = settings.get("brand_word_1") || "E";
    const brandWord2 = settings.get("brand_word_2") || "";
    const themeColor = settings.get("theme_color") || "#2563eb";
    const facebookUrl = settings.get("social_facebook") || "#";
    const twitterUrl = settings.get("social_twitter") || "#";
    const instagramUrl = settings.get("social_instagram") || "#";
    const contactAddress = settings.get("contact_address") || "Municipal Hall, Poblacion";
    const contactEmail = settings.get("contact_email") || "info@portal.gov.ph";
    const contactPhone = settings.get("contact_phone") || "(075) 000-0000";

    // Section visibility settings (default to true if not set)
    const showDiningLodging = settings.get("section_dining_lodging") !== "false";
    const showPlacesToVisit = settings.get("section_places_to_visit") !== "false";
    const showEvents = settings.get("section_events") !== "false";
    const showAnnouncements = settings.get("section_announcements") !== "false";
    const showLGUProjects = settings.get("section_lgu_projects") !== "false";
    const showJobs = settings.get("section_jobs") !== "false";
    const showGovernment = settings.get("section_government") !== "false";
    const showServices = settings.get("section_services") !== "false";
    const showEmergency = settings.get("section_emergency") !== "false";
    const showChurch = settings.get("section_church") !== "false";
    const showMap = settings.get("section_map") !== "false";
    const showAppDownload = settings.get("section_app_download") !== "false";

    const googlePlayUrl = settings.get("app_google_play_url") || "";
    const appStoreUrl = settings.get("app_app_store_url") || "";
    const apkDownloadUrl = settings.get("app_apk_download_url") || "";

    const announcementSelect = {
        id: true,
        title: true,
        content: true,
        priority: true,
        category: true,
        isPinned: true,
        isActive: true,
        barangay: true,
        imageUrl: true,
        expiryDate: true,
        eventDate: true,
        eventSchedule: true,
        createdAt: true,
        updatedAt: true,
    };

    const [
        slides,
        tourismSpots,
        dining,
        lodging,
        rawAnnouncements,
        rawHealthAnnouncements,
        events,
        news,
        projects,
        jobs,
        officials,
        hotlines,
        ambulanceRes,
        churchInfo,
        churchSchedules,
        latestCollection,
        barangayList,
        transactionTypes,
        legislativeDocs
    ] = await Promise.all([
        prisma.heroSlide.findMany({
            where: {
                isActive: true,
                ...(isFiltered ? { barangay: selectedBarangay } : { OR: [{ barangay: null }, { barangay: "" }] })
            } as any,
            orderBy: { order: 'asc' }
        }),
        prisma.tourismSpot.findMany({
            where: {
                isPublished: true,
                ...(isFiltered ? { barangay: selectedBarangay } : {})
            } as any,
            take: 5
        }),
        prisma.dining.findMany({
            where: {
                isPublished: true,
                ...(isFiltered ? { barangay: selectedBarangay } : {})
            } as any,
            include: {
                reviews: {
                    select: {
                        rating: true
                    }
                }
            },
            take: 4
        }),
        prisma.accommodation.findMany({
            where: {
                isPublished: true,
                ...(isFiltered ? { barangay: selectedBarangay } : {})
            } as any,
            include: {
                reviews: {
                    select: {
                        rating: true
                    }
                }
            },
            take: 4
        }),
        (prisma as any).announcement.findMany({
            where: {
                isActive: true,
                category: { not: "Health" },
                ...(isFiltered ? { barangay: selectedBarangay } : {})
            } as any,
            select: announcementSelect,
            orderBy: [
                { isPinned: 'desc' },
                { createdAt: 'desc' }
            ],
            take: 10
        }),
        (prisma as any).announcement.findMany({
            where: {
                isActive: true,
                category: "Health",
                ...(isFiltered ? { barangay: selectedBarangay } : {})
            } as any,
            select: announcementSelect,
            orderBy: [
                { isPinned: 'desc' },
                { createdAt: 'desc' }
            ],
            take: 10
        }),
        prisma.event.findMany({
            where: {
                isPublished: true,
                ...(isFiltered ? { barangay: selectedBarangay } : {})
            } as any,
            orderBy: { startDate: 'asc' }
        }),
        prisma.news.findMany({
            where: {
                isPublished: true,
                ...(isFiltered ? { barangay: selectedBarangay } : {})
            } as any,
            orderBy: { publishDate: 'desc' },
            take: 4
        }),
        prisma.project.findMany({
            where: {
                isPublished: true,
                ...(isFiltered ? { barangay: selectedBarangay } : {})
            } as any,
            orderBy: { createdAt: 'desc' },
            take: 3
        }),
        (prisma as any).job.findMany({
            where: {
                isActive: true,
                ...(isFiltered ? { barangay: selectedBarangay } : {})
            },
            orderBy: [
                { deadline: 'asc' },
                { createdAt: 'desc' }
            ],
            take: 3
        }),
        prisma.official.findMany({
            where: {
                isActive: true,
                ...(isFiltered ? { barangay: selectedBarangay, category: { in: ['Barangay Council', 'SK Council', 'Barangay', 'SK'] } } : {})
            } as any,
            orderBy: [
                { order: "asc" },
                { createdAt: "asc" }
            ]
        }),
        prisma.hotline.findMany({
            where: { isActive: true },
            orderBy: { order: "asc" }
        }),
        getAmbulanceSettings(),
        (prisma as any).churchInfo.findFirst({
            where: {
                ...(isFiltered ? { barangay: selectedBarangay } : { OR: [{ barangay: null }, { barangay: "" }] })
            } as any,
            include: { schedules: true }
        }),
        (prisma as any).churchSchedule.findMany({
            where: {
                churchInfo: {
                    ...(isFiltered ? { barangay: selectedBarangay } : { OR: [{ barangay: null }, { barangay: "" }] })
                }
            } as any,
            orderBy: [{ day: "asc" }, { time: "asc" }]
        }),
        (prisma as any).churchCollection.findMany({
            where: {
                churchInfo: {
                    ...(isFiltered ? { barangay: selectedBarangay } : { OR: [{ barangay: null }, { barangay: "" }] })
                }
            } as any,
            orderBy: { date: "desc" },
            take: 4
        }),
        (prisma as any).barangayInfo.findMany({
            select: { name: true },
            orderBy: { name: 'asc' }
        }),
        prisma.transactionType.findMany({
            where: {
                isActive: true,
                level: isFiltered ? 2 : 1
            },
            orderBy: { name: "asc" }
        }),
        (prisma as any).legislativeDocument.findMany({
            where: {
                ...(isFiltered ? { barangay: selectedBarangay } : {})
            } as any,
            orderBy: { dateApproved: 'desc' }
        })
    ]);

    const allAnnouncementsRaw = [...rawAnnouncements, ...rawHealthAnnouncements];
    const allIds = allAnnouncementsRaw.map((a: any) => a.id).filter(Boolean);
    let detailMap = new Map<string, any>();
    if (allIds.length > 0) {
        try {
            const rawDetails: any[] = await (prisma as any).$queryRawUnsafe(
                `SELECT id, department, "approvalStatus" FROM "Announcement" WHERE id = ANY($1::text[])`,
                allIds
            );
            detailMap = new Map(rawDetails.map((r: any) => [r.id, r]));
        } catch {
            // fallback
        }
    }

    const enrichAnnouncement = (a: any) => {
        const det = detailMap.get(a.id);
        return {
            ...a,
            department: det?.department || a.department || (a.category === "Business" ? "BPLO" : "GENERAL"),
            approvalStatus: det?.approvalStatus || a.approvalStatus || (a.category === "Business" ? "PENDING_APPROVAL" : "APPROVED"),
        };
    };

    const enrichedAnnouncements = rawAnnouncements.map(enrichAnnouncement);
    const enrichedHealthAnnouncements = rawHealthAnnouncements.map(enrichAnnouncement);

    const isPubliclyApproved = (a: any) => {
        if (a.approvalStatus === "PENDING_APPROVAL" || a.approvalStatus === "REJECTED") return false;
        if ((a.department === "BPLO" || a.category === "Business") && a.approvalStatus !== "APPROVED") return false;
        return true;
    };

    const announcements = enrichedAnnouncements.filter(isPubliclyApproved).slice(0, 3);
    const healthAnnouncements = enrichedHealthAnnouncements.filter(isPubliclyApproved).slice(0, 5);
    const initialFleet = ambulanceRes && ambulanceRes.fleet ? ambulanceRes.fleet : [];
    const initialDispatchHotlines = ambulanceRes && ambulanceRes.hotlines ? ambulanceRes.hotlines : [];
    const barangays = (barangayList || []).map((b: any) => b.name);

    const services: any[] = [];

    // 1. Cedula Card
    const activeCedula = transactionTypes.find(t => t.code === "CEDULA_IND" || t.category?.toLowerCase() === "cedula");
    if (activeCedula) {
        services.push({
            id: activeCedula.id,
            code: "CEDULA_IND",
            name: activeCedula.name,
            description: activeCedula.description || "Tax certificate for individuals including employees, self-employed...",
            fee: activeCedula.baseFee
        });
    }

    // 2. Business Permit Card
    const activeBiz = transactionTypes.find(t => t.code === "BUSINESS_PERMIT_NEW" || t.category?.toLowerCase() === "business permit");
    if (activeBiz) {
        services.push({
            id: activeBiz.id,
            code: "BUSINESS_PERMIT",
            name: "Business Permit",
            description: activeBiz.description || "Apply for a new business permit or renew an existing one online.",
            fee: activeBiz.baseFee
        });
    }

    // 3. Building Permit Card
    const activeBuild = transactionTypes.find(t => t.code === "BUILDING_PERMIT" || t.category?.toLowerCase() === "building permit");
    if (activeBuild) {
        services.push({
            id: activeBuild.id,
            code: "BUILDING_PERMIT",
            name: activeBuild.name,
            description: activeBuild.description || "Apply for a new building permit online. Manage your construction requirements.",
            fee: activeBuild.baseFee
        });
    }

    // 4. Civil Registry Card
    const activeLcr = transactionTypes.find(t => t.code.startsWith("LCR_") || t.category?.toLowerCase() === "civil registry");
    if (activeLcr) {
        services.push({
            id: activeLcr.id,
            code: "CIVIL_REGISTRY",
            name: "Civil Registry",
            description: "Request certified copies of Birth, Marriage, or Death Certificates.",
            fee: activeLcr.baseFee
        });
    }

    // 5. Occupancy Permit Card
    const activeOcc = transactionTypes.find(t => t.code === "OCCUPANCY_PERMIT" || t.category?.toLowerCase() === "occupancy permit" || t.category?.toLowerCase() === "occupancy");
    if (activeOcc) {
        services.push({
            id: activeOcc.id,
            code: "OCCUPANCY",
            name: "Occupancy Permit",
            description: "Apply for a new occupancy permit online. Manage your building occupancy requirements.",
            fee: activeOcc.baseFee
        });
    }

    // Sort services alphabetically to match original layout
    services.sort((a, b) => a.name.localeCompare(b.name));

    // Merge and shuffle discovery items
    const discoveryItems = [

        ...dining.map((d: any) => ({
            ...d,
            itemType: "kainan" as const,
            cuisineType: d.cuisineType || undefined
        })),

        ...lodging.map((l: any) => ({
            ...l,
            itemType: "tuluyan" as const,
            type: l.type || undefined
        }))
        // eslint-disable-next-line react-hooks/purity
    ].sort(() => Math.random() - 0.5);

    return (
        <main
            className={cn(
                "min-h-screen bg-white dark:bg-slate-950 font-sans selection:bg-primary/30",
                maintenance && "pt-10 sm:pt-12 md:pt-14"
            )}
            style={{ "--primary-theme": themeColor } as React.CSSProperties}
        >
            <HashScrollHandler />
            <Navbar
                logoUrl={logoUrl}
                brandWord1={brandWord1}
                brandWord2={brandWord2}
                themeColor={themeColor}
                barangays={barangays}
                isMaintenanceActive={maintenance}
            />

            {maintenance && (
                <div className="bg-amber-500 text-slate-950 font-bold text-center px-4 h-10 sm:h-12 md:h-14 z-[110] fixed top-0 left-0 right-0 shadow-lg flex items-center justify-center gap-2 text-xs uppercase tracking-wider">
                    <span className="animate-pulse inline-block w-2.5 h-2.5 rounded-full bg-red-600 mr-1" />
                    <strong>Maintenance Mode Active:</strong> Some online transactional features and forms are temporarily disabled.
                </div>
            )}

            <ClientOnly delay={1000} fallback={<HeroSkeleton />}>
                <Hero slides={slides} themeColor={themeColor} isMaintenanceActive={maintenance} />
            </ClientOnly>

            {showAppDownload && (
                <ClientOnly delay={1000}>
                    <AppDownloadSection
                        themeColor={themeColor}
                        googlePlayUrl={googlePlayUrl}
                        appStoreUrl={appStoreUrl}
                        apkDownloadUrl={apkDownloadUrl}
                        isLoggedIn={!!session}
                    />
                </ClientOnly>
            )}

            <div className="space-y-4 pb-6 md:pb-0">
                {showDiningLodging && (
                    <ClientOnly delay={1000} fallback={<DiningLodgingSkeleton />}>
                        <DiningLodging items={discoveryItems} />
                    </ClientOnly>
                )}
                {showPlacesToVisit && (
                    <ClientOnly delay={1000} fallback={<PlacesToVisitSkeleton />}>
                        <PlacesToVisit spots={tourismSpots} />
                    </ClientOnly>
                )}

                {/* Major Updates: Events with Calendar */}
                {showEvents && (
                    <ClientOnly delay={1000} fallback={<EventsCalendarSkeleton />}>
                        <EventsCalendarSection events={events} />
                    </ClientOnly>
                )}

                {/* Announcements & News Section */}
                {showAnnouncements && (
                    <ClientOnly delay={1000} fallback={<AnnouncementsNewsSkeleton />}>
                        <AnnouncementsNews 
                            announcements={announcements} 
                            healthAnnouncements={healthAnnouncements} 
                            news={news} 
                            themeColor={themeColor} 
                        />
                    </ClientOnly>
                )}

                <ClientOnly delay={1000}>
                    <OrdinancesSection documents={legislativeDocs as any[]} themeColor={themeColor} />
                </ClientOnly>

                {/* Infrastructure Projects Section */}
                {showLGUProjects && (
                    <ClientOnly delay={1000} fallback={<LGUProjectsSkeleton />}>
                        <LGUProjects projects={projects} />
                    </ClientOnly>
                )}

                {showJobs && (
                    <ClientOnly delay={1000} fallback={<JobBoardSkeleton />}>
                        <JobBoard jobs={jobs} isMaintenanceActive={maintenance} />
                    </ClientOnly>
                )}
                {showGovernment && (
                    <ClientOnly delay={1000} fallback={<GovernmentSkeleton />}>
                        <Government officials={officials} barangay={selectedBarangay} />
                    </ClientOnly>
                )}
                {showServices && (
                    <ClientOnly delay={1000} fallback={<ServicesSkeleton />}>
                        <Services services={services} themeColor={themeColor} isMaintenanceActive={maintenance} />
                    </ClientOnly>
                )}
            </div>

            {showChurch && (
                <ClientOnly delay={1000} fallback={<ParishCornerSkeleton />}>
                    <ParishCorner
                        info={churchInfo}
                        schedules={churchSchedules}
                        collections={latestCollection}
                    />
                </ClientOnly>
            )}
            {showEmergency && (
                <ClientOnly delay={1000} fallback={<EmergencyReportSkeleton />}>
                    <EmergencyReport 
                        initialHotlines={hotlines} 
                        initialFleet={initialFleet}
                        initialDispatchHotlines={initialDispatchHotlines}
                        showMap={showMap} 
                        isMaintenanceActive={maintenance} 
                    />
                </ClientOnly>
            )}
            <Footer
                logoUrl={logoUrl}
                brandWord1={brandWord1}
                brandWord2={brandWord2}
                themeColor={themeColor}
                facebookUrl={facebookUrl}
                twitterUrl={twitterUrl}
                instagramUrl={instagramUrl}
                contactAddress={contactAddress}
                contactEmail={contactEmail}
                contactPhone={contactPhone}
            />
        </main>
    );
}


