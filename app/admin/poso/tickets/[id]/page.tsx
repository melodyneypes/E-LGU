"use client";

import Image from "next/image";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import {
    ArrowLeft, MapPin, UserCheck, Shield, Award,
    FileText, Camera, CreditCard, RefreshCw, Car, ShieldAlert, Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { getTicketById, processTicketSettlement } from "@/app/admin/poso/actions";

interface TicketDetailsPageProps {
    params: Promise<{ id: string }>;
}

export default function TicketDetailsPage({ params }: TicketDetailsPageProps) {
    const { id } = use(params);
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [ticket, setTicket] = useState<any>(null);
    const [themeColor, setThemeColor] = useState<string | null>(null);
    const [paying, setPaying] = useState(false);
    const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;
        async function fetchTicket() {
            setLoading(true);
            try {
                const res = await getTicketById(id);
                if (res.success && isMounted) {
                    setTicket(res.ticket);
                    if (res.themeColor) setThemeColor(res.themeColor);
                } else if (!res.success) {
                    toast.error(res.error || "Citation Ticket not found");
                }
            } catch {
                toast.error("Failed to load citation ticket details");
            } finally {
                if (isMounted) setLoading(false);
            }
        }
        fetchTicket();
        return () => { isMounted = false; };
    }, [id]);

    const handleSettlePayment = async () => {
        if (!ticket) return;
        setPaying(true);
        try {
            const res = await processTicketSettlement(ticket.id);
            if (res.success) {
                toast.success("Ticket settlement transaction created and sent to Treasury!");
                setTicket((prev: any) => ({
                    ...prev,
                    isPaid: false,
                    status: "UNPAID",
                    transactionId: res.transaction?.id,
                }));
            } else {
                toast.error(res.error || "Failed to process settlement transaction");
            }
        } catch {
            toast.error("An unexpected error occurred while processing settlement transaction");
        } finally {
            setPaying(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen p-8 bg-slate-50 dark:bg-[#0b0f19] flex flex-col items-center justify-center space-y-4">
                <RefreshCw className="w-10 h-10 animate-spin text-rose-600" />
                <p className="font-bold text-slate-600 dark:text-slate-300 italic uppercase tracking-wider text-sm">
                    Retrieving Citation Ticket #{id.slice(-6)}...
                </p>
            </div>
        );
    }

    if (!ticket) {
        return (
            <div className="min-h-screen p-8 bg-slate-50 dark:bg-[#0b0f19] flex flex-col items-center justify-center space-y-4 text-center">
                <ShieldAlert className="w-16 h-16 text-rose-500 stroke-[1.5]" />
                <h1 className="text-2xl font-black uppercase text-slate-800 dark:text-white italic">Ticket Not Found</h1>
                <p className="text-slate-500 text-sm max-w-md">The apprehension citation ticket record you are looking for does not exist or may have been archived.</p>
                <Button
                    onClick={() => router.push("/admin/poso/tickets")}
                    style={{ backgroundColor: themeColor || undefined }}
                    className="bg-rose-600 hover:opacity-90 text-white font-bold rounded-xl"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to POSO Tickets
                </Button>
            </div>
        );
    }

    const violationsList = ticket.details || ticket.ticketDetails || [];
    const photosList = ticket.ticketPhotos || [];

    return (
        <div className="min-h-screen p-4 md:p-8 bg-slate-50 dark:bg-[#0b0f19] space-y-8 pb-20">
            {/* Top Bar Navigation & Ticket Title */}
            <div className="space-y-4">
                <Button
                    variant="outline"
                    onClick={() => router.push("/admin/poso/tickets")}
                    style={
                        themeColor
                            ? {
                                  color: themeColor,
                                  borderColor: `${themeColor}40`,
                              }
                            : undefined
                    }
                    className="rounded-2xl border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 font-bold text-xs"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" /> Return to Tickets List
                </Button>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center space-x-3">
                        <h1 className="text-2xl md:text-3xl font-black uppercase italic tracking-tight text-slate-900 dark:text-white">
                            Ticket #{ticket.ticketNo}
                        </h1>
                        <Badge
                            className={
                                ticket.isPaid
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 px-3 py-1 font-black"
                                    : ticket.transactionId
                                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 px-3 py-1 font-black"
                                    : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 px-3 py-1 font-black"
                            }
                        >
                            {ticket.isPaid ? "SETTLED / PAID" : ticket.transactionId ? "PENDING TREASURY PAYMENT" : "UNPAID CITATION"}
                        </Badge>
                    </div>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 italic">
                        Apprehended on {new Date(ticket.dateTime).toLocaleString("en-PH", { dateStyle: "full", timeStyle: "short" })}
                    </p>
                </div>
            </div>

            {/* Main Details Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Violator & Apprehension Details (2 Cols) */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Violator Information Card */}
                    <div className="bg-white dark:bg-[#151b2b] rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-[#2a3040] shadow-sm space-y-6">
                        <div className="flex items-center space-x-3 pb-4 border-b border-slate-100 dark:border-[#2a3040]">
                            <div className="p-3 bg-rose-500/10 rounded-2xl text-rose-600">
                                <UserCheck className="w-6 h-6 stroke-[2]" />
                            </div>
                            <div>
                                <h2 className="text-lg font-black uppercase italic tracking-tight text-slate-900 dark:text-white">
                                    Apprehended Citizen Info
                                </h2>
                                <p className="text-xs text-slate-500 font-medium italic">Violator personal & contact snapshot</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Violator Name</span>
                                <p className="text-xl font-black text-slate-900 dark:text-white uppercase italic mt-0.5">
                                    {ticket.violatorName}
                                </p>
                            </div>

                            <div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Driver&apos;s License No.</span>
                                <p className="text-base font-bold text-slate-800 dark:text-slate-200 mt-0.5 font-mono">
                                    {ticket.licenseNo || "N/A (Unlicensed)"}
                                </p>
                            </div>

                            <div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Home Address</span>
                                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mt-0.5">
                                    {ticket.violatorAddress || "N/A"}
                                </p>
                            </div>

                            <div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Birth Date</span>
                                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mt-0.5">
                                    {ticket.birthDate || "N/A"}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Apprehension Location & Vehicle Card */}
                    <div className="bg-white dark:bg-[#151b2b] rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-[#2a3040] shadow-sm space-y-6">
                        <div className="flex items-center space-x-3 pb-4 border-b border-slate-100 dark:border-[#2a3040]">
                            <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-600">
                                <Car className="w-6 h-6 stroke-[2]" />
                            </div>
                            <div>
                                <h2 className="text-lg font-black uppercase italic tracking-tight text-slate-900 dark:text-white">
                                    Vehicle & Location Particulars
                                </h2>
                                <p className="text-xs text-slate-500 font-medium italic">Apprehension site & vehicle specs</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Vehicle Type & Classification</span>
                                <p className="text-base font-black text-slate-900 dark:text-white uppercase italic mt-0.5">
                                    {ticket.plateNo || "No Plate"} ({ticket.typeOfVehicle || "N/A"})
                                </p>
                                {ticket.vehicleClass && (
                                    <span className="inline-block mt-1 px-2.5 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[10px] font-black uppercase">
                                        {ticket.vehicleClass === "CLASS_A" ? "Class A (Motorcycle/Tricycle)" : ticket.vehicleClass === "CLASS_B" ? "Class B (Light 4-Wheel)" : ticket.vehicleClass === "CLASS_C" ? "Class C (Heavy 4-Wheel+)" : ticket.vehicleClass}
                                    </span>
                                )}
                            </div>

                            {ticket.puvBodyName && (
                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">PUV / TODA Association</span>
                                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                                        {ticket.puvBodyName} {ticket.puvBodyNo ? `#${ticket.puvBodyNo}` : ""}
                                    </p>
                                </div>
                            )}

                            <div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Apprehension Location</span>
                                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mt-0.5 flex items-center">
                                    <MapPin className="w-4 h-4 mr-1 text-rose-500" />
                                    {ticket.location || "Mapandan"}, Barangay {ticket.barangay || "N/A"}
                                </p>
                            </div>

                            <div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Apprehending POSO Officer</span>
                                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5 flex items-center">
                                    <Shield className="w-4 h-4 mr-1 text-slate-400" />
                                    {ticket.officerName || "POSO Enforcer"}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Violations & Fines Table Card */}
                    <div className="bg-white dark:bg-[#151b2b] rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-[#2a3040] shadow-sm space-y-6">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-[#2a3040]">
                            <div className="flex items-center space-x-3">
                                <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-600">
                                    <FileText className="w-6 h-6 stroke-[2]" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-black uppercase italic tracking-tight text-slate-900 dark:text-white">
                                        Charged Violations & Fine Breakdown
                                    </h2>
                                    <p className="text-xs text-slate-500 font-medium italic">Municipal Traffic Ordinances violated</p>
                                </div>
                            </div>
                        </div>

                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-100/70 dark:bg-[#1a1f2e] border-y border-slate-200 dark:border-[#2a3040]">
                                    <TableHead className="font-black text-xs uppercase tracking-wider text-slate-900 dark:text-slate-100">Violation Description</TableHead>
                                    <TableHead className="text-center font-black text-xs uppercase tracking-wider text-slate-900 dark:text-slate-100">Offense Tier</TableHead>
                                    <TableHead className="text-right font-black text-xs uppercase tracking-wider text-slate-900 dark:text-slate-100 pr-6">Fine Amount</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {violationsList.length === 0 && !ticket.isImpounded ? (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center py-6 text-xs text-slate-400 font-medium">
                                            No violation breakdown items recorded.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    <>
                                        {violationsList.map((item: any) => (
                                            <TableRow key={item.id} className="border-b border-slate-100 dark:border-[#2a3040]">
                                                <TableCell className="font-bold text-sm text-slate-900 dark:text-white">{item.violationName}</TableCell>
                                                <TableCell className="text-center font-bold text-xs">
                                                    <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 font-black">
                                                        {item.offenseLevel === 1 ? "1st Offense" : item.offenseLevel === 2 ? "2nd Offense" : "3rd Offense"}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right font-black text-sm text-rose-600 dark:text-rose-400 pr-6">
                                                    ₱ {Number(item.amount || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                                                </TableCell>
                                            </TableRow>
                                        ))}

                                        {ticket.isImpounded && (
                                            <TableRow className="border-b border-amber-200/50 bg-amber-50/40 dark:bg-amber-950/20">
                                                <TableCell className="font-bold text-sm text-amber-900 dark:text-amber-200">
                                                    Vehicle Impounding Fee ({ticket.vehicleClass === "CLASS_A" ? "Class A: Motorcycles/Tricycles" : ticket.vehicleClass === "CLASS_B" ? "Class B: Light 4-Wheeled" : ticket.vehicleClass === "CLASS_C" ? "Class C: Heavy 4-Wheeled+" : ticket.vehicleClass || "Standard Impound"})
                                                </TableCell>
                                                <TableCell className="text-center font-bold text-xs">
                                                    <span className="px-3 py-1 rounded-full bg-amber-200/60 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 font-black">
                                                        Impounded
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right font-black text-sm text-amber-600 dark:text-amber-400 pr-6">
                                                    ₱ {Number(ticket.impoundFee || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </>
                                )}
                            </TableBody>
                        </Table>

                        <div className="pt-4 flex justify-between items-center border-t border-slate-200 dark:border-[#2a3040]">
                            <div>
                                <span className="font-black uppercase text-xs text-slate-700 dark:text-slate-300">Total Payable Fine</span>
                                <p className="text-[10px] text-slate-500 font-semibold italic">Payable at LGU Treasury Department</p>
                            </div>
                            <span className="font-black text-2xl text-rose-600 dark:text-rose-400 italic">
                                ₱ {(Number(ticket.totalAmount || 0) + (ticket.isImpounded ? Number(ticket.impoundFee || 0) : 0)).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Right Column: Evidence Photos, Signature, & Quick Summary (1 Col) */}
                <div className="space-y-8">
                    {/* Ticket Evidence Gallery Card */}
                    <div className="bg-white dark:bg-[#151b2b] rounded-3xl p-6 border border-slate-200 dark:border-[#2a3040] shadow-sm space-y-4">
                        <div className="flex items-center space-x-3 pb-3 border-b border-slate-100 dark:border-[#2a3040]">
                            <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-600">
                                <Camera className="w-5 h-5 stroke-[2]" />
                            </div>
                            <div>
                                <h2 className="text-base font-black uppercase italic tracking-tight text-slate-900 dark:text-white">
                                    Photographic Evidence ({photosList.length})
                                </h2>
                                <p className="text-[10px] text-slate-500 font-medium italic">Photos captured by enforcer at scene</p>
                            </div>
                        </div>

                        {photosList.length === 0 ? (
                            <div className="p-8 text-center bg-slate-50 dark:bg-[#0c111d] rounded-2xl border border-dashed border-slate-200 dark:border-white/10 text-slate-400">
                                <Camera className="w-8 h-8 mx-auto mb-2 opacity-50 stroke-[1.5]" />
                                <p className="text-xs font-bold">No Photos Captured</p>
                                <p className="text-[10px] mt-0.5 text-slate-400">No photographic evidence attached to this ticket.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-3">
                                {photosList.map((photo: any) => (
                                    <div
                                        key={photo.id}
                                        onClick={() => setSelectedPhoto(photo.photoUrl)}
                                        className="group relative aspect-video rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 cursor-pointer shadow-sm hover:scale-[1.02] transition-transform"
                                    >
                                        <Image src={photo.photoUrl} alt="Evidence photo" fill sizes="(max-width: 768px) 50vw, 33vw" className="object-cover" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold uppercase tracking-wider">
                                            Preview
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Driver Signature Card */}
                    <div className="bg-white dark:bg-[#151b2b] rounded-3xl p-6 border border-slate-200 dark:border-[#2a3040] shadow-sm space-y-4">
                        <div className="flex items-center space-x-3 pb-3 border-b border-slate-100 dark:border-[#2a3040]">
                            <div className="p-2.5 bg-purple-500/10 rounded-xl text-purple-600">
                                <Award className="w-5 h-5 stroke-[2]" />
                            </div>
                            <div>
                                <h2 className="text-base font-black uppercase italic tracking-tight text-slate-900 dark:text-white">
                                    Driver&apos;s Acknowledgment
                                </h2>
                                <p className="text-[10px] text-slate-500 font-medium italic">Digital signature captured at scene</p>
                            </div>
                        </div>

                        {ticket.driverSignature ? (
                            <div className="p-4 bg-slate-50 dark:bg-[#0c111d] rounded-2xl border border-slate-200 dark:border-[#2a3040] flex flex-col items-center justify-center">
                                <Image src={ticket.driverSignature} alt="Driver Signature" width={200} height={96} className="max-h-24 object-contain filter dark:invert" />
                                <span className="text-[10px] font-bold text-slate-400 uppercase mt-2">Verified Digital Signature</span>
                            </div>
                        ) : (
                            <div className="p-6 text-center bg-slate-50 dark:bg-[#0c111d] rounded-2xl border border-dashed border-slate-200 dark:border-white/10 text-slate-400">
                                <p className="text-xs font-bold italic">Signature Unattended / Refused</p>
                                <p className="text-[10px] mt-0.5 text-slate-400">Driver did not sign or refused digital acknowledgment.</p>
                            </div>
                        )}
                    </div>

                    {/* Settlement Action or Pending Treasury Payment Notice */}
                    {ticket.transactionId && !ticket.isPaid ? (
                        <div className="bg-amber-50 dark:bg-amber-950/30 rounded-3xl p-6 border border-amber-200 dark:border-amber-500/20 shadow-sm space-y-3">
                            <div className="flex items-center space-x-2.5 text-amber-700 dark:text-amber-400">
                                <Clock className="w-5 h-5 stroke-[2.5]" />
                                <span className="font-black text-xs uppercase tracking-wider">Pending Treasury Settlement</span>
                            </div>
                            <p className="text-xs font-semibold text-amber-900/80 dark:text-amber-200/90 leading-relaxed italic">
                                This citation ticket has been processed into an active <strong>UNPAID Treasury Transaction</strong>. The violator must settle the fine at the Municipal Treasury Department.
                            </p>
                            <div className="pt-3 border-t border-amber-200/60 dark:border-amber-500/20 flex items-center justify-between text-[11px] font-bold text-amber-900 dark:text-amber-200">
                                <span className="uppercase tracking-wider text-[10px] text-amber-600 dark:text-amber-400">Transaction Reference</span>
                                <span className="font-mono bg-amber-100 dark:bg-amber-900/40 px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-700/40">{ticket.transactionId}</span>
                            </div>
                        </div>
                    ) : !ticket.isPaid ? (
                        <Button
                            onClick={handleSettlePayment}
                            disabled={paying}
                            style={{ backgroundColor: themeColor || undefined }}
                            className="w-full h-12 bg-emerald-600 hover:opacity-95 text-white font-bold rounded-2xl text-xs shadow-lg flex items-center justify-center space-x-2 transition-all"
                        >
                            {paying ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                            <span>Process Settlement Payment</span>
                        </Button>
                    ) : null}

                    {/* Enforcer Remarks Card */}
                    {ticket.remarks && (
                        <div className="bg-white dark:bg-[#151b2b] rounded-3xl p-6 border border-slate-200 dark:border-[#2a3040] shadow-sm space-y-3">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Enforcer Officer Remarks</span>
                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 italic bg-slate-50 dark:bg-[#0c111d] p-4 rounded-2xl border border-slate-200 dark:border-white/10">
                                &quot;{ticket.remarks}&quot;
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Photo Lightbox Modal */}
            {selectedPhoto && (
                <div
                    onClick={() => setSelectedPhoto(null)}
                    className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer animate-in fade-in duration-200"
                >
                    <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-3xl shadow-2xl w-full aspect-video">
                        <Image src={selectedPhoto} alt="Enlarged Evidence" fill sizes="100vw" className="object-contain rounded-3xl" />
                        <span className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs font-bold px-4 py-2 rounded-full backdrop-blur-md">
                            Click anywhere to close
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}
