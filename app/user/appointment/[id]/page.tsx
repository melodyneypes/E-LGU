"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    Clock,
    CheckCircle2,
    Home,
    FileText,
    Activity,
    DollarSign,
    Search,
    UserCheck,
    X,
    AlertCircle,
    QrCode,
    Printer,
    AlertTriangle,
    ShieldAlert
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
    Breadcrumb,
    BreadcrumbList,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
    getTransactionById,
    getSystemSettingAction,
    cancelTransaction
} from "@/app/admin/transactions/actions";
import { supabase } from "@/lib/supabase";
import PrintQueueTicket from "@/components/shared/PrintQueueTicket";
import CedulaView from "./views/CedulaView";

// Display dates/times in Philippine Standard Time (Asia/Manila)
function formatPHDate(date: string | Date): string {
    return new Intl.DateTimeFormat("en-PH", {
        timeZone: "Asia/Manila",
        month: "long",
        day: "numeric",
        year: "numeric",
    }).format(new Date(date));
}

export default function AppointmentDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [request, setRequest] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isCancelling, setIsCancelling] = useState(false);
    const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
    const [printTriggered, setPrintTriggered] = useState(false);
    const [themeColor, setThemeColor] = useState("#2563eb");
    const [branding, setBranding] = useState({
        logo: "",
        word1: "MUNICIPALITY",
        word2: "PORTAL"
    });

    const fetchAppointment = useCallback(async () => {
        try {
            const res = await getTransactionById(id);
            if (res.success && res.data) {
                setRequest(res.data);
            } else {
                toast.error("Failed to load appointment details.");
                router.push("/user/appointment");
            }
        } catch (err) {
            console.error("Fetch appointment error:", err);
        }
    }, [id, router]);

    const fetchSettings = useCallback(async () => {
        try {
            const [themeRes, logoRes, word1Res, word2Res] = await Promise.all([
                getSystemSettingAction("theme_color", "#2563eb"),
                getSystemSettingAction("logo", ""),
                getSystemSettingAction("brand_word_1", "MUNICIPALITY"),
                getSystemSettingAction("brand_word_2", "PORTAL")
            ]);
            setThemeColor(themeRes.data);
            setBranding({
                logo: logoRes.data || "",
                word1: word1Res.data || "MUNICIPALITY",
                word2: word2Res.data || "PORTAL"
            });
        } catch (err) {
            console.error("Fetch settings error:", err);
        }
    }, []);

    useEffect(() => {
        async function initialize() {
            setLoading(true);
            await Promise.all([fetchAppointment(), fetchSettings()]);
            setLoading(false);
        }
        initialize();
    }, [fetchAppointment, fetchSettings]);

    // Realtime Supabase updates
    useEffect(() => {
        if (!supabase) return;

        const channel = supabase
            .channel(`realtime-appointment-details-${id}`)
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "Transaction",
                    filter: `id=eq.${id}`,
                },
                async (payload: any) => {
                    console.log("Realtime appointment update detected:", payload);
                    if (payload.new) {
                        // Refetch details
                        await fetchAppointment();
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [id, fetchAppointment]);

    const handleCancel = async () => {
        setIsCancelling(true);
        try {
            const res = await cancelTransaction(id);
            if (res.success) {
                toast.success("Appointment successfully cancelled.");
                await fetchAppointment();
                setCancelConfirmOpen(false);
            } else {
                toast.error(res.error || "Failed to cancel appointment.");
            }
        } catch (err) {
            console.error(err);
            toast.error("An error occurred while cancelling your appointment.");
        } finally {
            setIsCancelling(false);
        }
    };

    const residentData = useMemo(() => {
        if (!request) return null;
        return request.residentSnapshot || request.user?.residentProfile || {};
    }, [request]);

    const additionalData = useMemo(() => {
        if (!request) return {};
        return (typeof request.additionalData === "string" 
            ? JSON.parse(request.additionalData || "{}") 
            : request.additionalData) || {};
    }, [request]);

    const statusConfig = useMemo(() => {
        if (!request) return null;
        if (request.isCancelled) {
            return { color: "text-red-500 bg-red-500/10 border-red-500/20", label: "CANCELLED", icon: X };
        }
        const status = request.status;
        switch (status) {
            case "FOR_REVISION": return { color: "text-amber-500 bg-amber-500/10 border-amber-500/20", label: "REVISION REQUIRED", icon: AlertCircle };
            case "FOR_REQUESTING": return { color: "text-white bg-primary border-transparent", label: "AWAITING EVALUATION", icon: Clock };
            case "FOR_INSPECTION": return { color: "text-white bg-blue-600 border-transparent", label: "UNDER INSPECTION", icon: Search };
            case "EVALUATED": return { color: "text-white bg-primary border-transparent", label: "EVALUATED / PENDING PAYMENT", icon: DollarSign };
            case "PAID": return { color: "text-white bg-emerald-500 border-transparent", label: "PAID / AWAITING CLAIM", icon: CheckCircle2 };
            case "FOR_PROCESSING": return { color: "text-white bg-blue-500 border-transparent", label: "IN PROCESSING", icon: Activity };
            case "FOR_CLAIM": return { color: "text-white bg-amber-500 border-transparent", label: "READY FOR CLAIMING", icon: UserCheck };
            case "RELEASED": return { color: "text-white bg-emerald-600 border-transparent", label: "COMPLETED & RELEASED", icon: CheckCircle2 };
            case "UNPAID": return { color: "text-white bg-amber-500 border-transparent", label: "FOR PAYMENT", icon: DollarSign };
            case "REJECTED": return { color: "text-red-500 bg-red-500/10 border-red-500/20", label: "DECLINED", icon: X };
            default: return { color: "text-white bg-primary border-transparent", label: status.replace("_", " "), icon: Clock };
        }
    }, [request]);
    if (loading || !request || !residentData) {
        return (
            <div className="min-h-screen bg-white dark:bg-[#0a0c10] pb-24">
                <div className="max-w-4xl mx-auto px-4 md:px-0 pt-4 md:pt-10 space-y-6 md:space-y-10 animate-pulse">
                    {/* Breadcrumbs Skeleton */}
                    <div className="h-10 w-64 bg-slate-100 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5" />

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 items-start">
                        {/* Left Card Skeleton */}
                        <div className="md:col-span-1 h-[450px] bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-3xl" />
                        
                        {/* Right Content Skeleton */}
                        <div className="md:col-span-2 space-y-6">
                            <div className="h-[180px] bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-3xl" />
                            <div className="h-[250px] bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-3xl" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const isCedula = request.type?.code?.startsWith("CEDULA");
    const isBuildingPermit = request.type?.code?.startsWith("BUILDING_PERMIT");

    return (
        <div className="min-h-screen bg-white dark:bg-[#0a0c10] pb-24" style={{ "--primary-theme": themeColor } as React.CSSProperties}>
            <div className="max-w-4xl mx-auto px-4 md:px-0 pt-4 md:pt-10 space-y-6 md:space-y-10 animate-in fade-in duration-300">
                
                {/* Breadcrumbs */}
                <div className="flex items-center justify-between">
                    <Breadcrumb>
                        <BreadcrumbList className="bg-slate-50 dark:bg-white/5 px-4 md:px-6 py-2 rounded-xl border border-slate-100 dark:border-white/5 w-fit shadow-sm">
                            <BreadcrumbItem>
                                <BreadcrumbLink asChild>
                                    <Link href="/" className="flex items-center gap-1.5 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-primary transition-colors">
                                        <Home className="w-3.5 h-3.5" />
                                        Home
                                    </Link>
                                </BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator />
                            <BreadcrumbItem>
                                <BreadcrumbLink asChild>
                                    <Link href="/user/appointment" className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-primary transition-colors">Appointments</Link>
                                </BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator />
                            <BreadcrumbItem>
                                <BreadcrumbPage className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-primary italic">Ticket Details</BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 items-start">
                    
                    {/* LEFT COLUMN: Premium Kiosk Ticket Card */}
                    <div className="md:col-span-1 space-y-6">
                        <Card className="relative overflow-hidden bg-gradient-to-br from-slate-900 to-slate-950 dark:from-[#0d1017] dark:to-[#05070a] border border-slate-800 rounded-3xl p-6 shadow-2xl text-white">
                            
                            {/* Watermark Logo */}
                            <div className="absolute right-[-20%] bottom-[-10%] opacity-[0.03] select-none pointer-events-none transform rotate-12">
                                <QrCode className="w-64 h-64" />
                            </div>

                            {/* Ticket Header */}
                            <div className="text-center space-y-2 pb-6 border-b border-dashed border-slate-800">
                                {branding.logo ? (
                                    <div className="relative w-12 h-12 mx-auto filter brightness-0 invert">
                                        <Image src={branding.logo} alt="LGU Logo" fill className="object-contain" />
                                    </div>
                                ) : (
                                    <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center mx-auto">
                                        <QrCode className="w-5 h-5 text-white" />
                                    </div>
                                )}
                                <div className="space-y-0.5">
                                    <p className="text-[8px] font-black tracking-[0.3em] text-slate-400 uppercase leading-none">Mapandan Municipal Hall</p>
                                    <h4 className="text-[10px] font-black tracking-widest text-slate-300 uppercase leading-none">{branding.word1} PORTAL</h4>
                                </div>
                            </div>

                            {/* Queue Ticket Number */}
                            <div className="py-6 text-center space-y-6">
                                <div className="space-y-1">
                                    <p className="text-[8px] font-black tracking-[0.3em] text-slate-400 uppercase leading-none">Your Queue Number</p>
                                    <h2 className="text-xl md:text-2xl font-black font-mono tracking-tight text-white select-all">
                                        {request.queueNumber || "AWAITING"}
                                    </h2>
                                </div>
                            </div>

                            {/* Ticket Details */}
                            <div className="pt-6 border-t border-dashed border-slate-800 space-y-4 text-xs font-semibold">
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Category</span>
                                    <span className="text-right max-w-[140px] truncate">{request.type?.name || "Appointment"}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Date</span>
                                    <span>{request.appointmentDate ? formatPHDate(request.appointmentDate) : "TBD"}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Time</span>
                                    <span className="text-primary font-bold">{request.appointmentSlot || "N/A"}</span>
                                </div>
                            </div>
                        </Card>

                        {/* Ticket Helper / Print Wrapper */}
                        {request.queueNumber && (
                            <PrintQueueTicket
                                queueNumber={request.queueNumber}
                                residentName={`${residentData.firstName} ${residentData.lastName}`}
                                serviceName={request.type?.name || "Service Appointment"}
                                appointmentDate={request.appointmentDate ? new Date(request.appointmentDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : ""}
                                appointmentSlot={request.appointmentSlot || "N/A"}
                                isPriority={request.isPriority || false}
                                branding={branding}
                                themeColor={themeColor}
                                triggerPrint={printTriggered}
                                onPrintCompleted={() => setPrintTriggered(false)}
                            />
                        )}

                        <div className="flex flex-col gap-2">
                            <Button 
                                onClick={() => setPrintTriggered(true)} 
                                className="w-full h-11 text-white font-bold uppercase tracking-widest text-xs rounded-xl shadow-lg"
                                style={{ backgroundColor: themeColor }}
                            >
                                <Printer className="w-4 h-4 mr-2" /> Print Slip Receipt
                            </Button>

                            {(request.status === "FOR_REQUESTING" || request.status === "FOR_INSPECTION") && !request.isCancelled && !additionalData?.checkedIn && (
                                <Button 
                                    onClick={() => setCancelConfirmOpen(true)} 
                                    variant="outline" 
                                    className="w-full h-11 border-red-500/20 text-red-500 hover:bg-red-500/10 rounded-xl font-bold uppercase tracking-widest text-xs"
                                >
                                    <X className="w-4 h-4 mr-2" /> Cancel Booking
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Custom Detailed Information */}
                    <div className="md:col-span-2 space-y-6">
                        
                        {/* Status Alert Banner */}
                        {statusConfig && !isCedula && request.status !== "FOR_INSPECTION" && (
                            <div className={cn("p-5 border rounded-2xl flex items-start gap-4", statusConfig.color)}>
                                <statusConfig.icon className="w-5 h-5 shrink-0 mt-0.5" />
                                <div className="space-y-1">
                                    <h4 className="text-xs font-black uppercase tracking-widest italic leading-none">{statusConfig.label}</h4>
                                    <p className="text-xs leading-relaxed font-medium opacity-85">
                                        {request.isCancelled 
                                            ? `This appointment was cancelled on ${request.updatedAt ? formatPHDate(request.updatedAt) : "N/A"}.`
                                            : request.status === "FOR_REQUESTING"
                                            ? "Your booking is currently queued. Please wait for the municipal assessor/evaluation team to approve."
                                            : request.status === "PAID"
                                            ? "Payment received! Please proceed to the Municipal Office on your scheduled date to claim your document."
                                            : request.status === "RELEASED"
                                            ? "Thank you for transacting with the Municipality of Mapandan! Your requested document has been successfully released. We are glad to have served you."
                                            : request.status === "UNPAID"
                                            ? "Your application has been assessed and is now ready for payment. Please proceed to the Treasury Department at the Municipal Hall to settle your fees."
                                            : null
                                        }
                                    </p>
                                </div>
                            </div>
                        )}



                        {/* Details Card */}
                        <Card className="border border-slate-200 dark:border-white/10 rounded-2xl md:rounded-3xl p-5 md:p-8 space-y-6">
                            {!isCedula && (
                                <>
                                    <div className="flex items-center gap-3">
                                        <FileText className="w-5 h-5 text-primary" />
                                        <h3 className="text-sm font-black uppercase tracking-widest italic text-slate-800 dark:text-white leading-none">Booking Information</h3>
                                    </div>
                                    <Separator />

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs leading-relaxed">
                                        <div className="space-y-1">
                                            <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Applicant Full Name</span>
                                            <p className="font-black text-slate-850 dark:text-white uppercase">
                                                {residentData.firstName} {residentData.middleName ? `${residentData.middleName.charAt(0)}.` : ""} {residentData.lastName}
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Contact Details</span>
                                            <p className="font-black text-slate-850 dark:text-white">{residentData.contactNumber || "N/A"}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Transaction Type</span>
                                            <p className="font-black text-slate-850 dark:text-white uppercase">{request.type?.name || "N/A"}</p>
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* CUSTOM CEDULA VIEW */}
                            {isCedula && (
                                <CedulaView 
                                    request={request} 
                                    additionalData={additionalData} 
                                />
                            )}



                            {/* CUSTOM BUILDING PERMIT VIEW */}
                            {isBuildingPermit && (
                                <div className="mt-8 pt-6 border-t border-slate-100 dark:border-white/5 space-y-4">
                                    <div className="flex items-center gap-2">
                                        <Badge className="bg-primary/10 text-primary border-none text-[8px] font-black uppercase tracking-widest px-2 py-0.5">Building Permit Fields</Badge>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
                                        <div className="space-y-1">
                                            <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Scope of Construction Work</span>
                                            <p className="font-black uppercase text-slate-850 dark:text-white">
                                                {additionalData.scopeOfWork || additionalData.scope || "N/A"}
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Proposed Use / Occupancy</span>
                                            <p className="font-black uppercase text-slate-850 dark:text-white">
                                                {additionalData.useOfCharacter || "N/A"}
                                            </p>
                                        </div>
                                        <div className="space-y-1 col-span-1 sm:col-span-2">
                                            <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Project Site Address</span>
                                            <p className="font-black text-slate-850 dark:text-white">
                                                {additionalData.projectAddress || `${additionalData.barangay || residentData.barangay}, Mapandan, Pangasinan`}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </Card>

                        {/* Reminders Panel */}
                        <Card className="border border-amber-200 dark:border-amber-500/20 bg-amber-50/10 dark:bg-amber-500/5 rounded-2xl p-5 md:p-6 space-y-4">
                            <div className="flex items-center gap-2.5 text-amber-700 dark:text-amber-500">
                                <ShieldAlert className="w-4.5 h-4.5" />
                                <h4 className="font-black text-xs uppercase tracking-widest italic">Booking Reminders & Guides</h4>
                            </div>
                            <Separator className="bg-amber-200/20" />
                            <ul className="list-disc pl-5 space-y-2 text-xs font-semibold text-slate-700 dark:text-slate-300 leading-relaxed">
                                <li><strong>Physical Ticket Copy:</strong> Please note that you cannot get your physical ticket from this website. You must tap your ID card at the Municipal Hall Kiosk, print your physical ticket there, and present it to the front desk.</li>
                                <li><strong>Punctuality:</strong> Arrive at least 10–15 minutes prior to your selected slot ({request.appointmentSlot}).</li>
                                <li><strong>Verification:</strong> Present this queue ticket slip (either printed or on your phone screen) to the kiosk or officer.</li>
                                {request.isPriority && (
                                    <li className="text-primary font-bold">
                                        <strong>Priority Verification:</strong> You are required to present your physical Priority ID (e.g. Senior Citizen, PWD, or pregnancy proof) at the front desk to ensure you proceed to the priority lane.
                                    </li>
                                )}
                            </ul>
                        </Card>
                    </div>
                </div>

                {/* Cancel Confirmation Modal */}
                <Dialog open={cancelConfirmOpen} onOpenChange={setCancelConfirmOpen}>
                    <DialogContent className="rounded-2xl max-w-sm">
                        <DialogHeader className="text-center space-y-2">
                            <DialogTitle className="text-xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white">Cancel Booking?</DialogTitle>
                            <DialogDescription className="text-xs font-semibold text-slate-500">
                                Are you sure you want to cancel this appointment? This action cannot be undone.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter className="flex-col sm:flex-row gap-2 mt-4">
                            <Button variant="outline" onClick={() => setCancelConfirmOpen(false)} className="w-full font-bold uppercase tracking-widest text-xs h-11 rounded-xl">No, Keep</Button>
                            <Button onClick={handleCancel} disabled={isCancelling} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold uppercase tracking-widest text-xs h-11 rounded-xl">
                                {isCancelling ? "Cancelling..." : "Yes, Cancel"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}
