"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useSession } from "next-auth/react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    UserPlus,
    Search,
    Activity,
    CheckCircle2,
    Printer,
    Sparkles,
    HeartPulse,
    ShieldAlert,
    ChevronDown,
    Loader2
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { searchResidents } from "@/app/admin/actions";
import { registerRHUWalkInConsultation, getRHUHealthCenters } from "../actions";

const MAPANDAN_BARANGAYS = [
    "Amanoaoac", "Apaya", "Aserda", "Baloling", "Coral",
    "Golden", "Guesang", "Imante", "Lalas", "Nilombot",
    "Pias", "Poblacion", "Primicias", "Santa Maria", "Torres"
];

const CHECKUP_OPTIONS = [
    "General Consultation",
    "Prenatal / Maternal",
    "Pediatric",
    "Dental",
    "Pre-Marital",
    "Vaccination / Immunization",
    "Animal Bite / Rabies Care",
    "Senior Citizen Health Check",
    "Medical Clearance / Certificate"
];

interface RHUWalkInModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
    defaultCenterId?: string;
    centerName?: string | null;
}

export function RHUWalkInModal({
    open,
    onOpenChange,
    onSuccess,
    defaultCenterId,
    centerName
}: RHUWalkInModalProps) {
    const [isPending, startTransition] = useTransition();
    const { data: session } = useSession();
    const userRole = (session?.user as any)?.role || "";
    const canInputVitals = userRole === "ASST_SEC" || userRole === "ADMIN" || userRole === "RHU_ADMIN";
    const [tab, setTab] = useState<"SEARCH" | "FORM">("SEARCH");

    // Centers List
    const [centers, setCenters] = useState<any[]>([]);

    // Search state
    const [searchQuery, setSearchQuery] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [selectedResident, setSelectedResident] = useState<any | null>(null);

    // Form fields
    const [residentId, setResidentId] = useState<string>("");
    const [userId, setUserId] = useState<string>("");
    const [firstName, setFirstName] = useState("");
    const [middleName, setMiddleName] = useState("");
    const [lastName, setLastName] = useState("");
    const [suffix, setSuffix] = useState("");
    const [gender, setGender] = useState("MALE");
    const [dateOfBirth, setDateOfBirth] = useState("");
    const [age, setAge] = useState<number | string>("");
    const [civilStatus, setCivilStatus] = useState("Single");
    const [contactNumber, setContactNumber] = useState("");
    const [email, setEmail] = useState("");
    const [houseNumber, setHouseNumber] = useState("");
    const [street, setStreet] = useState("");
    const [barangay, setBarangay] = useState("Poblacion");
    const [philhealthNumber, setPhilhealthNumber] = useState("");

    // Consultation fields
    const [healthCenterId, setHealthCenterId] = useState(defaultCenterId || "");
    const [checkupType, setCheckupType] = useState("General Consultation");
    const [chiefComplaint, setChiefComplaint] = useState("");
    const [isPriorityLane, setIsPriorityLane] = useState(false);
    const [priorityReason, setPriorityReason] = useState("Senior Citizen (60+)");

    // Initial Vitals fields
    const [showVitals, setShowVitals] = useState(false);
    const [systolic, setSystolic] = useState("");
    const [diastolic, setDiastolic] = useState("");
    const [temperature, setTemperature] = useState("");
    const [pulseRate, setPulseRate] = useState("");
    const [height, setHeight] = useState("");
    const [weight, setWeight] = useState("");

    // Success Queue Ticket State
    const [generatedTicket, setGeneratedTicket] = useState<any | null>(null);

    // Load active health centers
    useEffect(() => {
        if (open) {
            getRHUHealthCenters().then((res) => {
                if (res.success && res.data) {
                    setCenters(res.data);
                }
            });
        }
    }, [open]);

    // Update center when default changes
    useEffect(() => {
        if (defaultCenterId) {
            setHealthCenterId(defaultCenterId);
        }
    }, [defaultCenterId]);

    // Live search residents
    useEffect(() => {
        if (!searchQuery || searchQuery.trim().length < 2) {
            setSearchResults([]);
            return;
        }

        const timer = setTimeout(async () => {
            setIsSearching(true);
            try {
                const res = await searchResidents(searchQuery.trim(), 1, 6);
                if (res.success && res.data) {
                    setSearchResults(res.data);
                } else {
                    setSearchResults([]);
                }
            } catch {
                setSearchResults([]);
            } finally {
                setIsSearching(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Auto-compute age from date of birth
    useEffect(() => {
        if (dateOfBirth) {
            const dob = new Date(dateOfBirth);
            if (!isNaN(dob.getTime())) {
                const diff = Date.now() - dob.getTime();
                const ageDt = new Date(diff);
                const calculatedAge = Math.abs(ageDt.getUTCFullYear() - 1970);
                setAge(calculatedAge);
                if (calculatedAge >= 60) {
                    setIsPriorityLane(true);
                    setPriorityReason("Senior Citizen (60+)");
                }
            }
        }
    }, [dateOfBirth]);

    // Live calculate BMI
    const calculatedBmi = React.useMemo(() => {
        const h = parseFloat(height);
        const w = parseFloat(weight);
        if (h > 0 && w > 0) {
            const heightM = h / 100;
            const bmi = (w / (heightM * heightM)).toFixed(1);
            let cat = "Normal";
            const num = parseFloat(bmi);
            if (num < 18.5) cat = "Underweight";
            else if (num <= 24.9) cat = "Normal weight";
            else if (num <= 29.9) cat = "Overweight";
            else cat = "Obese";
            return { value: bmi, category: cat };
        }
        return null;
    }, [height, weight]);

    // Select Resident
    const handleSelectResident = (res: any) => {
        setSelectedResident(res);
        setResidentId(res.id);
        setUserId(res.userId || "");
        setFirstName(res.firstName || "");
        setMiddleName(res.middleName || "");
        setLastName(res.lastName || "");
        setSuffix(res.suffix || "");
        setGender(res.gender || "MALE");
        setCivilStatus(res.civilStatus || "Single");
        setContactNumber(res.contactNumber || "");
        setEmail(res.email || "");
        setHouseNumber(res.houseNumber || "");
        setStreet(res.street || "");
        setBarangay(res.barangay || "Poblacion");
        setPhilhealthNumber(res.philhealthNumber || "");

        if (res.dateOfBirth) {
            const formattedDob = new Date(res.dateOfBirth).toISOString().split("T")[0];
            setDateOfBirth(formattedDob);
        }

        setTab("FORM");
        toast.info(`Selected resident: ${res.firstName} ${res.lastName}`);
    };

    const handleClearSelectedResident = () => {
        setSelectedResident(null);
        setResidentId("");
        setUserId("");
        setFirstName("");
        setMiddleName("");
        setLastName("");
        setSuffix("");
        setGender("MALE");
        setDateOfBirth("");
        setAge("");
        setCivilStatus("Single");
        setContactNumber("");
        setEmail("");
        setHouseNumber("");
        setStreet("");
        setBarangay("Poblacion");
        setPhilhealthNumber("");
    };

    const handleResetAll = () => {
        handleClearSelectedResident();
        setChiefComplaint("");
        setIsPriorityLane(false);
        setPriorityReason("Senior Citizen (60+)");
        setShowVitals(false);
        setSystolic("");
        setDiastolic("");
        setTemperature("");
        setPulseRate("");
        setHeight("");
        setWeight("");
        setGeneratedTicket(null);
        setTab("SEARCH");
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!firstName.trim() || !lastName.trim()) {
            toast.error("Please enter patient's First and Last Name.");
            setTab("FORM");
            return;
        }

        if (!barangay) {
            toast.error("Please select patient's Barangay.");
            setTab("FORM");
            return;
        }

        startTransition(async () => {
            const res = await registerRHUWalkInConsultation({
                residentId: residentId || undefined,
                userId: userId || undefined,
                firstName,
                middleName,
                lastName,
                suffix,
                gender,
                dateOfBirth: dateOfBirth || undefined,
                age: age || undefined,
                civilStatus,
                contactNumber,
                email,
                houseNumber,
                street,
                barangay,
                philhealthNumber,
                healthCenterId: healthCenterId || undefined,
                checkupType,
                chiefComplaint,
                isPriorityLane,
                priorityReason: isPriorityLane ? priorityReason : undefined,
                vitals: (canInputVitals && showVitals) ? {
                    systolic,
                    diastolic,
                    temperature,
                    pulseRate,
                    height,
                    weight,
                } : undefined,
            });

            if (res.success && res.data) {
                toast.success(`Walk-in patient registered! Queue #${res.data.queueNumber}`);
                setGeneratedTicket(res.data);
                if (typeof window !== "undefined") {
                    window.dispatchEvent(new CustomEvent("rhu-vitals-updated"));
                }
                if (onSuccess) onSuccess();
            } else {
                toast.error(res.error || "Failed to register walk-in patient.");
            }
        });
    };

    const handlePrintTicket = () => {
        if (!generatedTicket) return;
        const printWindow = window.open("", "_blank");
        if (!printWindow) {
            toast.error("Popup blocked. Please allow popups to print ticket.");
            return;
        }

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>RHU Queue Ticket - ${generatedTicket.queueNumber}</title>
                <style>
                    body {
                        font-family: monospace, system-ui, -apple-system;
                        width: 300px;
                        margin: 0 auto;
                        padding: 16px;
                        text-align: center;
                        color: #000;
                    }
                    .header { font-size: 14px; font-weight: bold; text-transform: uppercase; margin-bottom: 4px; }
                    .sub { font-size: 10px; margin-bottom: 12px; }
                    .ticket-box { border: 2px dashed #000; padding: 16px 8px; margin: 12px 0; }
                    .queue-num { font-size: 28px; font-weight: 900; letter-spacing: 2px; }
                    .priority { font-size: 11px; font-weight: bold; background: #000; color: #fff; padding: 2px 6px; display: inline-block; margin-top: 4px; border-radius: 4px; }
                    .details { font-size: 11px; text-align: left; margin: 12px 0; border-top: 1px dotted #000; padding-top: 8px; }
                    .details div { display: flex; justify-content: space-between; margin-bottom: 4px; }
                    .footer { font-size: 9px; margin-top: 16px; border-top: 1px solid #000; padding-top: 8px; }
                </style>
            </head>
            <body>
                <div class="header">Municipality of Mapandan</div>
                <div class="sub">Rural Health Unit (RHU) • Triage Ticket</div>
                <div class="ticket-box">
                    <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 1px;">YOUR QUEUE NUMBER</div>
                    <div class="queue-num">${generatedTicket.queueNumber}</div>
                    ${generatedTicket.isPriority ? '<div class="priority">PRIORITY LANE</div>' : ''}
                </div>
                <div class="details">
                    <div><span>Patient:</span> <strong>${generatedTicket.patientName}</strong></div>
                    <div><span>Service:</span> <strong>${generatedTicket.checkupType}</strong></div>
                    <div><span>Facility:</span> <strong>${generatedTicket.centerName}</strong></div>
                    <div><span>Time Slot:</span> <strong>${generatedTicket.appointmentSlot}</strong></div>
                    <div><span>Date:</span> <strong>${new Date().toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}</strong></div>
                </div>
                <div class="footer">
                    Please wait in the clinic lobby.<br />
                    Watch the TV monitor for your queue call.
                </div>
                <script>
                    window.onload = function() { window.print(); window.close(); }
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    return (
        <Dialog open={open} onOpenChange={(val) => {
            if (!val) handleResetAll();
            onOpenChange(val);
        }}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-[#11131a] border-slate-200 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl">
                {generatedTicket ? (
                    /* SUCCESS TICKET VIEW */
                    <div className="text-center space-y-6 py-4 animate-in fade-in zoom-in-95 duration-300">
                        <div className="w-16 h-16 bg-emerald-500/10 border-2 border-emerald-500/30 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                            <CheckCircle2 className="w-9 h-9" />
                        </div>

                        <div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
                                Walk-in Checked In Successfully
                            </span>
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight italic mt-3">
                                Queue Ticket Issued
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                The patient is now queued in the active doctor consultation ledger.
                            </p>
                        </div>

                        {/* Physical Ticket Preview Card */}
                        <div className="max-w-sm mx-auto bg-slate-50 dark:bg-black/40 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-6 text-left space-y-4 shadow-sm">
                            <div className="text-center border-b border-dashed border-slate-300 dark:border-slate-700 pb-4">
                                <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest block">Live RHU Queue Number</span>
                                <span className="text-3xl font-black text-rose-600 dark:text-rose-400 tracking-wider font-mono block mt-1">
                                    {generatedTicket.queueNumber}
                                </span>
                                {generatedTicket.isPriority && (
                                    <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-500/20 text-amber-600 border border-amber-500/30">
                                        ⭐ Priority Lane
                                    </span>
                                )}
                            </div>

                            <div className="space-y-2 text-xs">
                                <div className="flex justify-between">
                                    <span className="text-slate-400 font-semibold">Patient:</span>
                                    <span className="font-bold text-slate-800 dark:text-white">{generatedTicket.patientName}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400 font-semibold">Check-up Type:</span>
                                    <span className="font-bold text-slate-800 dark:text-white">{generatedTicket.checkupType}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400 font-semibold">Health Facility:</span>
                                    <span className="font-bold text-slate-800 dark:text-white truncate max-w-[180px]">{generatedTicket.centerName}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400 font-semibold">Time Slot:</span>
                                    <span className="font-bold text-slate-800 dark:text-white font-mono">{generatedTicket.appointmentSlot}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                            <Button
                                onClick={handlePrintTicket}
                                className="w-full sm:w-auto h-11 px-6 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black text-xs uppercase tracking-wider gap-2 shadow-lg hover:opacity-90"
                            >
                                <Printer className="w-4 h-4" /> Print Queue Slip
                            </Button>
                            <Button
                                onClick={handleResetAll}
                                variant="outline"
                                className="w-full sm:w-auto h-11 px-6 rounded-2xl border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 font-bold text-xs uppercase"
                            >
                                <UserPlus className="w-4 h-4 mr-2 text-rose-500" /> Register Another Patient
                            </Button>
                            <Button
                                onClick={() => onOpenChange(false)}
                                variant="ghost"
                                className="w-full sm:w-auto h-11 px-4 rounded-2xl text-slate-500 font-bold text-xs"
                            >
                                Done & Close
                            </Button>
                        </div>
                    </div>
                ) : (
                    /* REGISTRATION FORM */
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <DialogHeader className="text-left space-y-1">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
                                    <HeartPulse className="w-4 h-4" />
                                </div>
                                <DialogTitle className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight italic">
                                    Register <span className="text-rose-500">Walk-In Patient</span>
                                </DialogTitle>
                            </div>
                            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                                {centerName ? `Facility: ${centerName} • ` : ""}Intake patient details, assign consultation type, record initial triage vitals, and issue a live queue ticket.
                            </DialogDescription>
                        </DialogHeader>

                        {/* Top Mode Tabs */}
                        <Tabs value={tab} onValueChange={(v: any) => setTab(v)} className="w-full">
                            <TabsList className="grid grid-cols-2 h-11 rounded-2xl bg-slate-100 dark:bg-white/5 p-1">
                                <TabsTrigger
                                    value="SEARCH"
                                    className="rounded-xl font-bold text-xs gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-rose-600 dark:data-[state=active]:text-rose-400 shadow-sm"
                                >
                                    <Search className="w-3.5 h-3.5" /> Search Registered Resident
                                </TabsTrigger>
                                <TabsTrigger
                                    value="FORM"
                                    className="rounded-xl font-bold text-xs gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-rose-600 dark:data-[state=active]:text-rose-400 shadow-sm"
                                >
                                    <UserPlus className="w-3.5 h-3.5" /> {selectedResident ? "Edit Patient Info" : "New / Guest Walk-in"}
                                </TabsTrigger>
                            </TabsList>

                            {/* TAB 1: SEARCH RESIDENT */}
                            <TabsContent value="SEARCH" className="space-y-4 pt-3">
                                <div className="relative">
                                    <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                                    <Input
                                        placeholder="Type citizen name, mobile #, or barangay..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-10 h-10 rounded-2xl bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-xs font-bold"
                                        autoFocus
                                    />
                                    {isSearching && (
                                        <Loader2 className="w-4 h-4 absolute right-3.5 top-3 text-rose-500 animate-spin" />
                                    )}
                                </div>

                                {searchResults.length > 0 ? (
                                    <div className="border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-white/5 max-h-60 overflow-y-auto">
                                        {searchResults.map((res) => (
                                            <div
                                                key={res.id}
                                                onClick={() => handleSelectResident(res)}
                                                className="p-3.5 flex items-center justify-between hover:bg-rose-50/50 dark:hover:bg-white/5 cursor-pointer transition-colors group"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-slate-300">
                                                        {res.firstName?.[0]}{res.lastName?.[0]}
                                                    </div>
                                                    <div>
                                                        <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-rose-600 transition-colors">
                                                            {res.firstName} {res.middleName ? `${res.middleName[0]}. ` : ""}{res.lastName} {res.suffix || ""}
                                                        </h4>
                                                        <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                                                            <span>📍 Brgy. {res.barangay || "Mapandan"}</span>
                                                            {res.contactNumber && <span>• 📞 {res.contactNumber}</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    type="button"
                                                    variant="ghost"
                                                    className="h-8 rounded-xl text-rose-600 font-bold text-[10px] uppercase tracking-wider"
                                                >
                                                    Select →
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                ) : searchQuery.trim().length >= 2 && !isSearching ? (
                                    <div className="p-8 text-center bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 space-y-2">
                                        <p className="text-xs font-bold text-slate-600 dark:text-slate-300">No registered resident found matching &ldquo;{searchQuery}&rdquo;</p>
                                        <Button
                                            type="button"
                                            onClick={() => {
                                                handleClearSelectedResident();
                                                setFirstName(searchQuery.split(" ")[0] || "");
                                                setLastName(searchQuery.split(" ").slice(1).join(" ") || "");
                                                setTab("FORM");
                                            }}
                                            size="sm"
                                            className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs"
                                        >
                                            + Encode as New Walk-in Patient
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="p-6 text-center text-slate-400 text-xs">
                                        Search an existing resident to auto-fill details, or switch to the <strong>New Walk-in</strong> tab.
                                    </div>
                                )}
                            </TabsContent>

                            {/* TAB 2: MANUAL ENTRY FORM */}
                            <TabsContent value="FORM" className="space-y-4 pt-3">
                                {selectedResident && (
                                    <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 px-4 py-2.5 rounded-2xl flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                            <span className="font-bold">Linked to Registered Resident: {selectedResident.firstName} {selectedResident.lastName}</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleClearSelectedResident}
                                            className="text-[10px] font-black uppercase tracking-wider hover:underline text-rose-600"
                                        >
                                            Clear Link
                                        </button>
                                    </div>
                                )}

                                {/* Name Fields */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <div className="space-y-1 sm:col-span-1">
                                        <Label className="text-[10px] font-bold uppercase text-slate-400">First Name *</Label>
                                        <Input
                                            value={firstName}
                                            onChange={(e) => setFirstName(e.target.value)}
                                            placeholder="Juan"
                                            className="h-9 text-xs rounded-xl"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1 sm:col-span-1">
                                        <Label className="text-[10px] font-bold uppercase text-slate-400">Middle Name</Label>
                                        <Input
                                            value={middleName}
                                            onChange={(e) => setMiddleName(e.target.value)}
                                            placeholder="Santos"
                                            className="h-9 text-xs rounded-xl"
                                        />
                                    </div>
                                    <div className="space-y-1 sm:col-span-1">
                                        <Label className="text-[10px] font-bold uppercase text-slate-400">Last Name *</Label>
                                        <Input
                                            value={lastName}
                                            onChange={(e) => setLastName(e.target.value)}
                                            placeholder="Dela Cruz"
                                            className="h-9 text-xs rounded-xl"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1 sm:col-span-1">
                                        <Label className="text-[10px] font-bold uppercase text-slate-400">Suffix</Label>
                                        <Input
                                            value={suffix}
                                            onChange={(e) => setSuffix(e.target.value)}
                                            placeholder="Jr. / III"
                                            className="h-9 text-xs rounded-xl"
                                        />
                                    </div>
                                </div>

                                {/* Demographics */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <div className="space-y-1">
                                        <Label className="text-[10px] font-bold uppercase text-slate-400">Gender</Label>
                                        <Select value={gender} onValueChange={setGender}>
                                            <SelectTrigger className="h-9 text-xs rounded-xl">
                                                <SelectValue placeholder="Gender" />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl">
                                                <SelectItem value="MALE">Male</SelectItem>
                                                <SelectItem value="FEMALE">Female</SelectItem>
                                                <SelectItem value="OTHER">Other</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] font-bold uppercase text-slate-400">Date of Birth</Label>
                                        <Input
                                            type="date"
                                            value={dateOfBirth}
                                            onChange={(e) => setDateOfBirth(e.target.value)}
                                            className="h-9 text-xs rounded-xl"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] font-bold uppercase text-slate-400">Age</Label>
                                        <Input
                                            type="number"
                                            value={age}
                                            onChange={(e) => setAge(e.target.value)}
                                            placeholder="e.g. 35"
                                            className="h-9 text-xs rounded-xl"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] font-bold uppercase text-slate-400">Civil Status</Label>
                                        <Select value={civilStatus} onValueChange={setCivilStatus}>
                                            <SelectTrigger className="h-9 text-xs rounded-xl">
                                                <SelectValue placeholder="Status" />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl">
                                                <SelectItem value="Single">Single</SelectItem>
                                                <SelectItem value="Married">Married</SelectItem>
                                                <SelectItem value="Widowed">Widowed</SelectItem>
                                                <SelectItem value="Separated">Separated</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {/* Address & Contact */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div className="space-y-1 sm:col-span-1">
                                        <Label className="text-[10px] font-bold uppercase text-slate-400">Barangay *</Label>
                                        <Select value={barangay} onValueChange={setBarangay}>
                                            <SelectTrigger className="h-9 text-xs rounded-xl">
                                                <SelectValue placeholder="Select Barangay" />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl max-h-48">
                                                {MAPANDAN_BARANGAYS.map((b) => (
                                                    <SelectItem key={b} value={b}>Brgy. {b}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1 sm:col-span-1">
                                        <Label className="text-[10px] font-bold uppercase text-slate-400">Mobile / Contact #</Label>
                                        <Input
                                            value={contactNumber}
                                            onChange={(e) => setContactNumber(e.target.value)}
                                            placeholder="09171234567"
                                            className="h-9 text-xs rounded-xl"
                                        />
                                    </div>
                                    <div className="space-y-1 sm:col-span-1">
                                        <Label className="text-[10px] font-bold uppercase text-slate-400">PhilHealth # (Optional)</Label>
                                        <Input
                                            value={philhealthNumber}
                                            onChange={(e) => setPhilhealthNumber(e.target.value)}
                                            placeholder="12-345678901-2"
                                            className="h-9 text-xs rounded-xl"
                                        />
                                    </div>
                                </div>
                            </TabsContent>
                        </Tabs>

                        {/* SECTION: CONSULTATION DETAILS */}
                        <div className="pt-2 border-t border-slate-200 dark:border-white/10 space-y-4">
                            <div className="flex items-center gap-2">
                                <Activity className="w-4 h-4 text-rose-500" />
                                <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
                                    Consultation Details & Triage
                                </h3>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-bold uppercase text-slate-400">Assigned Health Center</Label>
                                    <Select value={healthCenterId} onValueChange={setHealthCenterId}>
                                        <SelectTrigger className="h-10 text-xs rounded-xl">
                                            <SelectValue placeholder="Select Facility" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl">
                                            {centers.map((c) => (
                                                <SelectItem key={c.id} value={c.id}>
                                                    {c.name} {c.barangay ? `(Brgy. ${c.barangay})` : ""}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1">
                                    <Label className="text-[10px] font-bold uppercase text-slate-400">Check-up / Service Type *</Label>
                                    <Select value={checkupType} onValueChange={setCheckupType}>
                                        <SelectTrigger className="h-10 text-xs rounded-xl font-bold">
                                            <SelectValue placeholder="Select Check-up" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl">
                                            {CHECKUP_OPTIONS.map((opt) => (
                                                <SelectItem key={opt} value={opt} className="text-xs font-semibold">
                                                    {opt}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <Label className="text-[10px] font-bold uppercase text-slate-400">Chief Complaint / Reason for Visit</Label>
                                <Textarea
                                    value={chiefComplaint}
                                    onChange={(e) => setChiefComplaint(e.target.value)}
                                    placeholder="e.g. Fever for 3 days, cough, mild headache, for blood pressure monitoring..."
                                    className="rounded-2xl text-xs resize-none h-18"
                                />
                            </div>

                            {/* Priority Lane Toggle */}
                            <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0" />
                                    <div>
                                        <span className="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 block">
                                            Priority Lane (Express Queue)
                                        </span>
                                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block">
                                            For Senior Citizens, PWDs, Pregnant Women, or Urgent Cases
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 w-full sm:w-auto">
                                    <input
                                        type="checkbox"
                                        id="priorityCheck"
                                        checked={isPriorityLane}
                                        onChange={(e) => setIsPriorityLane(e.target.checked)}
                                        className="h-4 w-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                                    />
                                    {isPriorityLane && (
                                        <Select value={priorityReason} onValueChange={setPriorityReason}>
                                            <SelectTrigger className="h-8 text-[11px] rounded-xl w-44 bg-white dark:bg-slate-800">
                                                <SelectValue placeholder="Priority Reason" />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl">
                                                <SelectItem value="Senior Citizen (60+)">Senior Citizen (60+)</SelectItem>
                                                <SelectItem value="Person with Disability (PWD)">PWD</SelectItem>
                                                <SelectItem value="Pregnant / Postpartum">Pregnant / Postpartum</SelectItem>
                                                <SelectItem value="Urgent Medical Care">Urgent Care</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* SECTION: OPTIONAL INITIAL VITALS */}
                        {canInputVitals ? (
                            <div className="pt-2 border-t border-slate-200 dark:border-white/10 space-y-3">
                                <button
                                    type="button"
                                    onClick={() => setShowVitals(!showVitals)}
                                    className="w-full flex items-center justify-between text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 hover:text-rose-600 transition-colors cursor-pointer"
                                >
                                    <span className="flex items-center gap-2">
                                        <HeartPulse className="w-4 h-4 text-rose-500" />
                                        Initial Triage Vitals (Optional)
                                    </span>
                                    <ChevronDown className={cn("w-4 h-4 transition-transform", showVitals && "rotate-180")} />
                                </button>

                                {showVitals && (
                                    <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 space-y-3 animate-in fade-in-50 duration-200">
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                            <div className="space-y-1">
                                                <Label className="text-[10px] font-bold uppercase text-slate-400">BP Systolic</Label>
                                                <Input
                                                    value={systolic}
                                                    onChange={(e) => setSystolic(e.target.value)}
                                                    placeholder="120"
                                                    className="h-8 text-xs rounded-xl"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-[10px] font-bold uppercase text-slate-400">BP Diastolic</Label>
                                                <Input
                                                    value={diastolic}
                                                    onChange={(e) => setDiastolic(e.target.value)}
                                                    placeholder="80"
                                                    className="h-8 text-xs rounded-xl"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-[10px] font-bold uppercase text-slate-400">Temp (°C)</Label>
                                                <Input
                                                    value={temperature}
                                                    onChange={(e) => setTemperature(e.target.value)}
                                                    placeholder="36.5"
                                                    className="h-8 text-xs rounded-xl"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-[10px] font-bold uppercase text-slate-400">Pulse (bpm)</Label>
                                                <Input
                                                    value={pulseRate}
                                                    onChange={(e) => setPulseRate(e.target.value)}
                                                    placeholder="75"
                                                    className="h-8 text-xs rounded-xl"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 items-end">
                                            <div className="space-y-1">
                                                <Label className="text-[10px] font-bold uppercase text-slate-400">Height (cm)</Label>
                                                <Input
                                                    value={height}
                                                    onChange={(e) => setHeight(e.target.value)}
                                                    placeholder="165"
                                                    className="h-8 text-xs rounded-xl"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-[10px] font-bold uppercase text-slate-400">Weight (kg)</Label>
                                                <Input
                                                    value={weight}
                                                    onChange={(e) => setWeight(e.target.value)}
                                                    placeholder="60"
                                                    className="h-8 text-xs rounded-xl"
                                                />
                                            </div>
                                            {calculatedBmi && (
                                                <div className="p-2 bg-white dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-xl text-center">
                                                    <span className="text-[9px] font-black uppercase text-slate-400 block">Calculated BMI</span>
                                                    <span className="text-xs font-black text-rose-600 dark:text-rose-400">
                                                        {calculatedBmi.value} ({calculatedBmi.category})
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="pt-2 border-t border-slate-200 dark:border-white/10">
                                <div className="p-3.5 bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3">
                                    <HeartPulse className="w-5 h-5 text-rose-500 shrink-0" />
                                    <div className="text-xs">
                                        <p className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                                            Patient Triage & Vitals Restricted
                                        </p>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                            Initial vital signs and physical triage must be recorded by the Assistant Secretary upon check-in.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Modal Footer Actions */}
                        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-white/10">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                                className="rounded-2xl h-11 px-5 font-bold text-xs uppercase"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isPending || !firstName.trim() || !lastName.trim()}
                                className="rounded-2xl h-11 px-7 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-rose-600/20 gap-2 cursor-pointer disabled:opacity-50"
                            >
                                {isPending ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" /> Registering...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-4 h-4" /> Check In & Issue Ticket
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}
