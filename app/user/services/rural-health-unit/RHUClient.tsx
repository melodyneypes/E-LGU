"use client";

import React from "react";
import {
    Home,
    Activity,
    Sparkles,
    User,
    FileText,
    Calendar,
    CheckCircle2,
    Smartphone,
    Info,
    Loader2,
    CheckCircle,
    AlertTriangle,
    Truck,
    PhoneCall,
    AlertCircle,
    MapPin
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn, copyToClipboard } from "@/lib/utils";
import { toast } from "sonner";
import lguConfig from "@/config/lgu.config.json";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface RHUClientProps {
    transactionTypes: any[];
    themeColor: string;
    initialAmbulanceFleet?: any[];
    initialDispatchHotlines?: any[];
}

const STEPS = [
    { id: "STATUS", label: "STATUS", icon: Sparkles },
    { id: "IDENTITY", label: "IDENTITY", icon: User },
    { id: "DETAILS", label: "DETAILS", icon: FileText },
    { id: "SCHEDULE", label: "SCHEDULE", icon: Calendar },
    { id: "SUBMIT", label: "SUBMIT", icon: CheckCircle2 },
];

export function RHUClient({
    transactionTypes,
    themeColor,
    initialAmbulanceFleet = [],
    initialDispatchHotlines = []
}: RHUClientProps) {
    const router = useRouter();
    const [downloadState, setDownloadState] = React.useState<'idle' | 'downloading' | 'completed' | 'error'>('idle');
    const [progress, setProgress] = React.useState(0);
    const [showInstructions, setShowInstructions] = React.useState(false);
    const appDownloadUrl = lguConfig.apps.apkDownloadUrl;
    const isAppDownloadConfigured = Boolean(appDownloadUrl) && !appDownloadUrl.includes("{{");
    const [showAmbulanceModal, setShowAmbulanceModal] = React.useState(false);
    const [copiedHotline, setCopiedHotline] = React.useState<string | null>(null);
    const [loadingServiceId, setLoadingServiceId] = React.useState<string | null>(null);

    const ambulanceFleet = (initialAmbulanceFleet.length > 0 ? initialAmbulanceFleet : [
        {
            unit: "Ambulance Unit 1 (Foton Transporter)",
            station: "{{BARANGAY_NAME}} Main Station",
            status: "ACTIVE",
            statusColor: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
            plateNumber: "SAB-1234"
        },
        {
            unit: "Ambulance Unit 2 (Toyota Hiace)",
            station: "{{BARANGAY_NAME}} Station",
            status: "ACTIVE",
            statusColor: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
            plateNumber: "SAB-5678"
        },
        {
            unit: "Ambulance Unit 3 (Barangay Response)",
            station: "{{BARANGAY_NAME}} Station",
            status: "ACTIVE",
            statusColor: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
            plateNumber: "SAB-9012"
        }
    ]).filter((v: any) => v.status !== "INACTIVE");

    const dispatchHotlines = (initialDispatchHotlines.length > 0 ? initialDispatchHotlines : [
        { name: "RHU Emergency Dispatch", number: lguConfig.contact.hotlines.health, status: "ACTIVE" },
        { name: "MDRRMO Emergency Hotline", number: lguConfig.contact.hotlines.disasterResponse, status: "ACTIVE" },
        { name: "Municipal Health Officer", number: lguConfig.contact.hotlines.healthOfficer, status: "ACTIVE" }
    ]).filter((h: any) => h.status !== "INACTIVE");

    const handleHotlineCall = async (number: string) => {
        await copyToClipboard(number);
        setCopiedHotline(number);
        toast.success(`Connecting to hotline: ${number}`);
        setTimeout(() => setCopiedHotline(null), 2000);
    };

    const handleDownload = async () => {
        if (downloadState === 'downloading') return;
        if (!isAppDownloadConfigured) {
            toast.error("The Android app download is not configured.");
            return;
        }
        
        setDownloadState('downloading');
        setProgress(0);
        
        try {
            const response = await fetch(appDownloadUrl);
            if (!response.ok) throw new Error('Download failed');
            
            const contentLength = response.headers.get('content-length');
            const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;
            
            const reader = response.body?.getReader();
            if (!reader) throw new Error('Could not read response body');
            
            const chunks: Uint8Array[] = [];
            let receivedBytes = 0;
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                if (value) {
                    chunks.push(value);
                    receivedBytes += value.length;
                }
                
                if (totalBytes > 0) {
                    const pct = Math.min(Math.round((receivedBytes / totalBytes) * 100), 100);
                    setProgress(pct);
                }
            }
            
            const blob = new Blob(chunks as unknown as BlobPart[], { type: 'application/vnd.android.package-archive' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'lgu-rhu-app.apk';
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            
            setDownloadState('completed');
            setShowInstructions(true);
        } catch (error) {
            console.error('Error downloading APK:', error);
            setDownloadState('error');
            setTimeout(() => setDownloadState('idle'), 3000);
        }
    };

    const medicalCertType = transactionTypes.find((t) => t.code === "RHU_MEDICAL_CERT");
    const fallbackType = medicalCertType || {
        id: "rhu-default-service",
        code: "RHU_MEDICAL_CERT",
        baseFee: 50,
        name: "Medical Consultation & Health Certificate"
    };

    const ambulanceType = transactionTypes.find((t) => t.code === "RHU_AMBULANCE");
    const fallbackAmbulance = ambulanceType || {
        id: "rhu-ambulance-service",
        code: "RHU_AMBULANCE",
        baseFee: 0,
        name: "Ambulance Scheduling & Dispatch"
    };

    const activeServices = [
        {
            db: fallbackType,
            code: "RHU_MEDICAL_CERT",
            title: "Medical Check-up / Consultation",
            desc: "Book an appointment for a clinical check-up, general consultation, or pre-marital medical screening at the Rural Health Unit (RHU).",
            icon: Activity,
            color: "text-rose-500 bg-rose-500/10",
            borderColor: "border-rose-500/20",
            accentBg: "bg-rose-500/5",
            reqs: ["Valid Government ID", "Previous Medical Records / Mother's Book (if any)"],
            fee: `₱${fallbackType.baseFee?.toFixed(2) || "50.00"}`,
            time: "Scheduled Date & Time"
        },
        {
            db: fallbackAmbulance,
            code: "RHU_AMBULANCE",
            title: "Ambulance Scheduling & Dispatch",
            desc: "View available ambulance units, emergency hotlines, and dispatch request details for immediate medical transport.",
            icon: Truck,
            color: "text-amber-500 bg-amber-500/10",
            borderColor: "border-amber-500/20",
            accentBg: "bg-amber-500/5",
            reqs: ["Patient Info & Medical Status", "Pickup Location & Destination", "Emergency Contact Number"],
            fee: "Free Municipal Service",
            time: "24/7 Dispatch Hotline"
        }
    ];

    return (
        <div className="container max-w-5xl mx-auto px-4 pt-0 pb-32 space-y-12">
            <style dangerouslySetInnerHTML={{
                __html: `
                .theme-icon-bg {
                    background-color: ${themeColor === "var(--primary-theme)" ? "color-mix(in srgb, var(--primary-theme) 10%, transparent)" : `${themeColor}1a`} !important;
                }
                .theme-icon-text {
                    color: ${themeColor} !important;
                }
                .theme-text-hover:hover {
                    color: ${themeColor} !important;
                }
                .theme-bg-hover:hover {
                    background-color: ${themeColor} !important;
                    border-color: ${themeColor} !important;
                }
                `
            }} />

            {/* Breadcrumbs */}
            <div className="space-y-4 md:space-y-10">
                <div className="sticky top-[64px] sm:top-[80px] z-40 md:static -mx-4 md:mx-0 px-4 md:px-0 pt-2 md:pt-0">
                    <Breadcrumb>
                        <BreadcrumbList className="flex-nowrap whitespace-nowrap overflow-x-auto scrollbar-none max-w-full bg-white/80 dark:bg-white/5 backdrop-blur-md px-4 py-1.5 rounded-full border border-slate-200/60 dark:border-white/5 w-full md:w-fit shadow-sm">
                            <BreadcrumbItem>
                                <BreadcrumbLink asChild>
                                    <Link href="/" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-primary transition-colors italic">
                                        <Home className="w-3.5 h-3.5 mb-0.5" />
                                        Home
                                    </Link>
                                </BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator className="text-slate-300 dark:text-white/10" />
                            <BreadcrumbItem>
                                <BreadcrumbLink asChild>
                                    <Link href="/user/services" className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-primary transition-colors italic">
                                        Services
                                    </Link>
                                </BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator className="text-slate-300 dark:text-white/10" />
                            <BreadcrumbItem>
                                <BreadcrumbPage className="text-[10px] font-black uppercase tracking-widest italic" style={{ color: themeColor }}>Rural Health Unit</BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                </div>

                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6 px-1 md:px-0">
                    <div className="space-y-1 md:space-y-2">
                        <h1 className="text-4xl md:text-7xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none select-none">
                            RURAL HEALTH <span className="text-primary underline decoration-[6px] md:decoration-8 decoration-primary/20 underline-offset-[6px] md:underline-offset-[12px]" style={{ textDecorationColor: themeColor === "var(--primary-theme)" ? "color-mix(in srgb, var(--primary-theme) 20%, transparent)" : `${themeColor}33` }}>UNIT</span>
                        </h1>
                        <p className="text-[9px] md:text-[11px] font-bold text-slate-400 uppercase tracking-[0.4em] ml-1 md:ml-2 italic">Municipal Health Office (MHO) Services</p>
                    </div>

                    {/* Download Button and Info */}
                    <div className="flex flex-col items-start md:items-end gap-2 shrink-0">
                        <Button
                            onClick={handleDownload}
                            disabled={downloadState === 'downloading' || !isAppDownloadConfigured}
                            style={{
                                backgroundColor: downloadState === 'downloading' ? 'transparent' : themeColor,
                                borderColor: themeColor,
                            }}
                            className={cn(
                                "h-11 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white shadow-lg active:scale-95 transition-all flex items-center gap-2 border min-w-[200px] justify-center relative overflow-hidden",
                                downloadState === 'downloading' && "text-slate-800 dark:text-white border-dashed bg-slate-100 dark:bg-white/5"
                            )}
                        >
                            {/* Download progress bar overlay for downloading state */}
                            {downloadState === 'downloading' && (
                                <div 
                                    className="absolute inset-y-0 left-0 transition-all duration-300"
                                    style={{ 
                                        width: `${progress}%`,
                                        backgroundColor: themeColor === "var(--primary-theme)" ? "color-mix(in srgb, var(--primary-theme) 15%, transparent)" : `${themeColor}26`
                                    }}
                                />
                            )}

                            <span className="relative z-10 flex items-center gap-2">
                                {downloadState === 'idle' && (
                                    <>
                                        <Smartphone className="w-4 h-4" />
                                        <span>{isAppDownloadConfigured ? "Download App" : "App Download Not Configured"}</span>
                                    </>
                                )}
                                {downloadState === 'downloading' && (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" style={{ color: themeColor }} />
                                        <span>Downloading {progress}%</span>
                                    </>
                                )}
                                {downloadState === 'completed' && (
                                    <>
                                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                                        <span>Downloaded!</span>
                                    </>
                                )}
                                {downloadState === 'error' && (
                                    <>
                                        <AlertTriangle className="w-4 h-4 text-rose-500" />
                                        <span>Failed. Retry?</span>
                                    </>
                                )}
                            </span>
                        </Button>
                        <div className="flex items-center gap-1.5 text-[9px] md:text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider italic">
                            <Info className="w-3.5 h-3.5 shrink-0" style={{ color: themeColor }} />
                            <span>Download to notify announcement</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Progress Stepper */}
            <div className="grid grid-cols-5 gap-1.5 md:gap-4 relative px-1 md:px-2">
                {STEPS.map((step, idx) => {
                    const isActive = step.id === "STATUS";
                    const Icon = step.icon;
                    return (
                        <div
                            key={idx}
                            className={cn(
                                "flex flex-col items-center gap-2 md:gap-3 relative z-10 font-black cursor-pointer group",
                                !isActive && "opacity-50 pointer-events-none"
                            )}
                        >
                            <div
                                className={cn(
                                    "w-11 h-11 md:w-16 md:h-16 rounded-xl md:rounded-2xl flex items-center justify-center transition-all duration-500 border-2",
                                    isActive ? "bg-primary text-white border-primary shadow-[0_0_20px_rgba(var(--primary),0.3)] scale-105 md:scale-110" : "bg-slate-100 dark:bg-white/5 text-slate-400 border-transparent"
                                )}
                                style={isActive ? { backgroundColor: themeColor, borderColor: themeColor } : {}}
                            >
                                <Icon className="w-4 h-4 md:w-7 md:h-7" />
                            </div>
                            <span
                                className={cn(
                                    "text-[7px] md:text-[10px] uppercase tracking-widest text-center italic hidden sm:block",
                                    isActive ? "text-primary opacity-100 font-black" : "opacity-40"
                                )}
                                style={isActive ? { color: themeColor } : {}}
                            >
                                {step.label}
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* Main Content Area */}
            <div className="mt-4 md:mt-8 md:bg-white md:dark:bg-[#11131a] md:rounded-[2.5rem] md:border md:border-slate-200 md:dark:border-white/10 p-0 md:p-12 md:shadow-2xl relative md:overflow-hidden group/container min-h-[300px]">
                <div className="space-y-8 md:space-y-12">
                    <div className="space-y-3 md:space-y-4 text-center">
                        <h2 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter leading-tight select-none">
                            Choose Application <span className="theme-icon-text">Pathway</span>
                        </h2>
                        <p className="text-slate-500 font-medium italic text-xs md:text-sm uppercase tracking-widest max-w-2xl mx-auto select-none">
                            Select a rural health unit service to proceed.
                        </p>
                    </div>

                    {/* Available Services Section Header */}
                    <div className="space-y-6 max-w-6xl mx-auto w-full">
                        <div className="flex items-center gap-4 border-b border-slate-100 dark:border-white/5 pb-4 select-none">
                            <div className="w-1.5 h-8 rounded-full" style={{ backgroundColor: themeColor }} />
                            <div>
                                <h3 className="text-lg md:text-2xl font-black uppercase italic tracking-tighter text-slate-800 dark:text-white leading-none mb-1.5">
                                    Available Services
                                </h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">
                                    Select a rural health unit service to proceed
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Services Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto w-full justify-items-center">
                        {activeServices.map((service) => {
                            const Icon = service.icon;
                            return (
                                <div
                                    key={service.code}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => {
                                        if (service.code === "RHU_AMBULANCE") {
                                            setShowAmbulanceModal(true);
                                        } else {
                                            router.push(`/user/services/rural-health-unit/${service.db.id}`);
                                        }
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            if (service.code === "RHU_AMBULANCE") {
                                                setShowAmbulanceModal(true);
                                            } else {
                                                router.push(`/user/services/rural-health-unit/${service.db.id}`);
                                            }
                                        }
                                    }}
                                    className="w-full max-w-md p-6 md:p-8 rounded-[2.5rem] border-2 border-slate-200 dark:border-white/10 bg-white/40 dark:bg-white/5 backdrop-blur-md flex flex-col justify-between min-h-[340px] hover:border-primary/40 hover:scale-[1.02] hover:shadow-xl transition-all duration-300 group cursor-pointer select-none"
                                >
                                    <div className="space-y-6">
                                        {/* Header */}
                                        <div className="flex justify-between items-start">
                                            <div className="w-12 h-12 rounded-xl flex items-center justify-center theme-icon-bg">
                                                <Icon className="w-6 h-6 theme-icon-text" />
                                            </div>
                                            <div className="text-right">
                                                <span className="text-[10px] font-black uppercase tracking-wider bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400 px-3 py-1 rounded-full italic">
                                                    {service.time}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Info */}
                                        <div className="space-y-2">
                                            <h3 className="text-xl font-black uppercase italic tracking-tighter text-slate-800 dark:text-slate-100 leading-none">
                                                {service.title}
                                            </h3>
                                            <p className="text-[11px] text-slate-400 dark:text-slate-500 font-semibold tracking-tight italic leading-relaxed">
                                                {service.desc}
                                            </p>
                                        </div>

                                        {/* Requirements */}
                                        <div className="space-y-1.5">
                                            <span className="text-[8.5px] font-black uppercase tracking-widest text-slate-400 block italic">Requirements:</span>
                                            <ul className="text-[10px] font-bold text-slate-500 dark:text-slate-400 space-y-1">
                                                {service.reqs.map((req, i) => (
                                                    <li key={i} className="flex items-center gap-1.5">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-white/20 shrink-0" />
                                                        <span>{req}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>

                                    {/* Action */}
                                    <div className="pt-6 border-t border-slate-100 dark:border-white/5 flex items-center justify-end mt-6">
                                        <Button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (service.code === "RHU_AMBULANCE") {
                                                    setShowAmbulanceModal(true);
                                                } else {
                                                    setLoadingServiceId(service.db.id);
                                                    router.push(`/user/services/rural-health-unit/${service.db.id}`);
                                                }
                                            }}
                                            disabled={loadingServiceId === service.db.id}
                                            style={{ backgroundColor: themeColor }}
                                            className="h-10 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white shadow-lg active:scale-95 transition-all border-none flex items-center justify-center gap-1.5 disabled:opacity-75 disabled:pointer-events-none"
                                        >
                                            {loadingServiceId === service.db.id ? (
                                                <>
                                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                    <span>Booking...</span>
                                                </>
                                            ) : (
                                                service.code === "RHU_AMBULANCE" ? "View Availability" : "Book Appointment"
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Installation Instructions Modal */}
            <Dialog open={showInstructions} onOpenChange={setShowInstructions}>
                <DialogContent className="max-w-md w-[90%] mx-auto bg-white dark:bg-[#11131a] border border-slate-200 dark:border-white/10 rounded-[2.5rem] shadow-2xl p-6 md:p-8 outline-none text-slate-900 dark:text-white">
                    <DialogHeader className="space-y-3">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-2" style={{ backgroundColor: themeColor === "var(--primary-theme)" ? "color-mix(in srgb, var(--primary-theme) 10%, transparent)" : `${themeColor}1a` }}>
                            <Smartphone className="w-6 h-6" style={{ color: themeColor }} />
                        </div>
                        <DialogTitle className="text-2xl md:text-3xl font-black italic uppercase tracking-tighter text-center leading-none">
                            How to Install the <span style={{ color: themeColor }}>RHU App</span>
                        </DialogTitle>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic text-center">
                            Follow these simple steps to install the app on your device
                        </p>
                    </DialogHeader>

                    {/* Steps visual flow */}
                    <div className="mt-6 space-y-6">
                        {/* Step 1 */}
                        <div className="flex gap-4 items-start">
                            <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center font-black italic shrink-0 text-sm border border-slate-200 dark:border-white/10" style={{ color: themeColor }}>
                                01
                            </div>
                            <div className="space-y-1">
                                <h4 className="text-xs font-black uppercase italic tracking-wider text-slate-700 dark:text-slate-200">
                                    Locate the Downloaded File
                                </h4>
                                <p className="text-[11px] text-slate-400 dark:text-slate-500 font-semibold leading-relaxed">
                                    Tap the completed download notification or search for <code className="bg-slate-100 dark:bg-white/5 px-1.5 py-0.5 rounded text-primary" style={{ color: themeColor }}>lgu-rhu-app.apk</code> in your browser&apos;s Downloads or File Manager app.
                                </p>
                            </div>
                        </div>

                        {/* Step 2 */}
                        <div className="flex gap-4 items-start">
                            <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center font-black italic shrink-0 text-sm border border-slate-200 dark:border-white/10" style={{ color: themeColor }}>
                                02
                            </div>
                            <div className="space-y-1">
                                <h4 className="text-xs font-black uppercase italic tracking-wider text-slate-700 dark:text-slate-200">
                                    Enable Installation Settings
                                </h4>
                                <p className="text-[11px] text-slate-400 dark:text-slate-500 font-semibold leading-relaxed">
                                    If your device flags the app as blocked, tap <strong>Settings</strong> in the prompt and turn on <strong>&quot;Allow from this source&quot;</strong> (enable install from unknown sources for your browser).
                                </p>
                            </div>
                        </div>

                        {/* Step 3 */}
                        <div className="flex gap-4 items-start">
                            <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center font-black italic shrink-0 text-sm border border-slate-200 dark:border-white/10" style={{ color: themeColor }}>
                                03
                            </div>
                            <div className="space-y-1">
                                <h4 className="text-xs font-black uppercase italic tracking-wider text-slate-700 dark:text-slate-200">
                                    Install and Launch
                                </h4>
                                <p className="text-[11px] text-slate-400 dark:text-slate-500 font-semibold leading-relaxed">
                                    Return to the installer, tap <strong>Install</strong>, and open the app. Grant notification permissions to receive real-time updates and announcements.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 flex justify-center">
                        <Button
                            onClick={() => setShowInstructions(false)}
                            style={{ backgroundColor: themeColor }}
                            className="w-full h-11 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white shadow-lg active:scale-95 transition-all border-none"
                        >
                            Got It, Start Using App
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Ambulance Dispatch Modal */}
            <Dialog open={showAmbulanceModal} onOpenChange={setShowAmbulanceModal}>
                <DialogContent className="max-w-xl w-[95%] mx-auto bg-white dark:bg-[#11131a] border border-slate-200 dark:border-white/10 rounded-[2.5rem] shadow-2xl p-6 md:p-8 outline-none text-slate-900 dark:text-white max-h-[90vh] overflow-y-auto scrollbar-none">
                    <style>{`
                        .hotline-card:hover {
                            border-color: ${themeColor}66 !important;
                            background-color: ${themeColor}0d !important;
                        }
                        .hotline-icon-container:not(.bg-emerald-500) {
                            background-color: ${themeColor}1a !important;
                            color: ${themeColor} !important;
                        }
                        .hotline-card:hover .hotline-icon-container:not(.bg-emerald-500) {
                            background-color: ${themeColor} !important;
                            color: #fff !important;
                        }
                        .hotline-card:hover .hotline-title:not(.text-emerald-500) {
                            color: ${themeColor} !important;
                        }
                        .ambulance-close-btn {
                            background-color: ${themeColor} !important;
                            border: none !important;
                            transition: opacity 0.2s !important;
                        }
                        .ambulance-close-btn:hover {
                            opacity: 0.9 !important;
                        }
                    `}</style>
                    <DialogHeader className="space-y-3">
                        <div 
                            className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-2"
                            style={{ backgroundColor: `${themeColor}1a` }}
                        >
                            <Truck className="w-6 h-6" style={{ color: themeColor }} />
                        </div>
                        <DialogTitle className="text-2xl md:text-3xl font-black italic uppercase tracking-tighter text-center leading-none">
                            Ambulance Fleet & Dispatch
                        </DialogTitle>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic text-center">
                            Emergency Response Logistics & Hotlines Directory
                        </p>
                    </DialogHeader>

                    <div className="mt-6 space-y-6">
                        {/* Status Grid */}
                        <div className="space-y-3">
                            <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 italic">Active Fleet Status</h4>
                            <div className="space-y-2">
                                {ambulanceFleet.map((vehicle, idx) => (
                                    <div key={idx} className="p-4 bg-slate-50 dark:bg-white/[0.02] border border-slate-200/50 dark:border-white/5 rounded-2xl flex items-center justify-between gap-4">
                                        <div className="space-y-0.5">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{vehicle.unit}</span>
                                                <span className="text-[9px] font-mono text-slate-400 bg-slate-100 dark:bg-white/5 px-1.5 py-0.5 rounded">{vehicle.plateNumber}</span>
                                            </div>
                                            <p className="text-[10px] font-medium text-slate-500 flex items-center gap-1">
                                                <MapPin className="w-3 h-3 text-slate-400" /> {vehicle.station}
                                            </p>
                                        </div>
                                        <span className={cn("text-[9px] font-black uppercase tracking-widest border px-2.5 py-1 rounded-full shrink-0", vehicle.status === "INACTIVE" ? "text-slate-500 bg-slate-500/10 border-slate-500/20" : "text-emerald-500 bg-emerald-500/10 border-emerald-500/20")}>
                                            {vehicle.status === "INACTIVE" ? "INACTIVE" : "ACTIVE"}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Hotline Callout */}
                        <div className="space-y-3">
                            <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 italic">Direct Emergency Hotlines</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {dispatchHotlines.map((hotline, idx) => {
                                    const isCopied = copiedHotline === hotline.number;
                                    const cleanNumber = hotline.number.replace(/[^0-9+]/g, "");
                                    const name = (hotline.name || "").toLowerCase();
                                    const Icon = isCopied
                                        ? CheckCircle2
                                        : name.includes("rhu") 
                                            ? PhoneCall 
                                            : name.includes("mdrrmo") 
                                                ? AlertCircle 
                                                : User;
                                    return (
                                        <a
                                            key={idx}
                                            href={`tel:${cleanNumber}`}
                                            onClick={() => handleHotlineCall(hotline.number)}
                                            className="hotline-card p-4 bg-white/40 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl cursor-pointer flex items-center gap-3 transition-all duration-200 group active:scale-[0.98] no-underline"
                                        >
                                            <div className={cn(
                                                "hotline-icon-container w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200",
                                                isCopied 
                                                    ? "bg-emerald-500 text-white dark:bg-emerald-500 dark:text-white shadow-md shadow-emerald-500/20" 
                                                    : ""
                                            )}>
                                                <Icon className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <span className={cn(
                                                    "hotline-title text-[9px] font-black uppercase tracking-wider block truncate transition-colors",
                                                    isCopied ? "text-emerald-500" : "text-slate-400"
                                                )}>
                                                    {hotline.name}
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-black tracking-tight text-slate-800 dark:text-white">{hotline.number}</span>
                                                    {isCopied && (
                                                        <span className="text-[8px] font-bold text-emerald-500 italic animate-pulse">Dialing...</span>
                                                    )}
                                                </div>
                                            </div>
                                        </a>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Instruction Protocol */}
                        <div 
                            className="p-5 rounded-2xl space-y-3 border"
                            style={{ 
                                backgroundColor: `${themeColor}08`, 
                                borderColor: `${themeColor}1a` 
                            }}
                        >
                            <h5 
                                className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1"
                                style={{ color: themeColor }}
                            >
                                <AlertCircle className="w-3.5 h-3.5" /> Dispatch Information Checklist
                            </h5>
                            <ul className="text-[11px] font-medium text-slate-600 dark:text-slate-400 space-y-2 list-none p-0 m-0">
                                <li className="flex items-start gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5" style={{ backgroundColor: themeColor }} />
                                    <span>Provide the patient&apos;s full name, age, and current status (conscious, bleeding, difficulty breathing, etc.).</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5" style={{ backgroundColor: themeColor }} />
                                    <span>State the exact pick-up address or landmark (Barangay, Purok, or notable location) and target destination hospital.</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5" style={{ backgroundColor: themeColor }} />
                                    <span>Provide a standby active phone number of the emergency contact person on-site.</span>
                                </li>
                            </ul>
                        </div>
                    </div>

                    <div className="mt-8 flex justify-center">
                        <Button
                            onClick={() => setShowAmbulanceModal(false)}
                            className="ambulance-close-btn w-full h-11 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white shadow-lg active:scale-95 transition-all"
                        >
                            Understood, Return to Services
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
