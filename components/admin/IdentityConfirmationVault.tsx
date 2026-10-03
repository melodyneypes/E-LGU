"use client"

import React, { useState } from "react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
    UserRound,
    Phone,
    Building2,
    MapPin,
    Hash,
    FileText,
    Camera,
    ZoomIn,
    RotateCw,
    ExternalLink,
    ZoomOut,
    CheckCircle2
} from "lucide-react"
import { differenceInYears } from "date-fns"

interface IdentityConfirmationVaultProps {
    resident: any;
    additional?: any;
    isBusinessPermit?: boolean;
    transactionTypeCode?: string;
    themeColor?: string;
    hideDocuments?: boolean;
}

const IdentityConfirmationVault = ({ resident, additional = {}, isBusinessPermit = false, transactionTypeCode = "", themeColor, hideDocuments = false }: IdentityConfirmationVaultProps) => {
    const [activeTab, setActiveTab] = useState<"citizen" | "business" | "documents">("citizen");
    const [selectedDocIndex, setSelectedDocIndex] = useState<number>(0);
    const [scale, setScale] = useState(1);
    const [rotate, setRotate] = useState(0);

    const isRenewal = transactionTypeCode === "BUSINESS_PERMIT_RENEW" ||
        additional?.businessType === "RENEWAL" ||
        additional?.businessType?.toLowerCase()?.includes("renew");

    // Dynamic extraction of attachments
    const docs = isBusinessPermit
        ? [
            { url: additional.ownerIdUrl, label: "Owner's Valid ID" },
            { url: additional.ctcUrl, label: "Cedula (CTC) Copy" },
            { url: additional.dtiSecUrl, label: "DTI / SEC Registry" },
            { url: additional.brgyClearanceUrl, label: "Barangay Clearance" },
            { url: additional.locationPhotoUrl, label: "Location Photo" },
            { url: additional.sanitaryPermitUrl, label: "Sanitary Permit" },
            { url: additional.fireSafetyUrl, label: "Fire Safety Certificate" },
            { url: additional.birCorUrl, label: "BIR Certificate (COR)" },
            { url: additional.previousPermitUrl, label: "Previous Business Permit" },
        ]
        : [
            { url: additional.validIdUrl || additional.ownerIdUrl, label: "Valid ID Evidence" },
            { url: additional.proofOfIncomeUrl, label: "Income Verification" },
            { url: additional.ctcUrl, label: "Cedula (CTC) Copy" }
        ];

    // Extra dynamic detection of any other properties ending in 'Url' or 'URL'
    const extraDocs: { url: string; label: string }[] = [];
    Object.entries(additional).forEach(([key, val]) => {
        if (typeof val === 'string' && (key.toLowerCase().endsWith('url') || key.toLowerCase().endsWith('path')) && val.startsWith('http')) {
            const exists = docs.some(d => d.url === val) || extraDocs.some(d => d.url === val);
            if (!exists) {
                const label = key
                    .replace(/Url$/i, '')
                    .replace(/([A-Z])/g, ' $1')
                    .replace(/^./, str => str.toUpperCase()) + " Document";
                extraDocs.push({ url: val, label });
            }
        }
    });

    const activeDocs = [...docs.filter(doc => doc.url), ...extraDocs];

    const selectDoc = (idx: number) => {
        setSelectedDocIndex(idx);
        setScale(1);
        setRotate(0);
    };

    return (
        <Dialog>
            <DialogTrigger asChild>
                <button className="text-[10px] font-black uppercase tracking-widest italic text-primary hover:text-primary/80 transition-colors cursor-pointer underline underline-offset-4 decoration-primary/30 hover:decoration-primary/60">
                    See More Details
                </button>
            </DialogTrigger>
            <DialogContent
                style={{
                    maxWidth: '1000px',
                    width: '90vw',
                    backgroundColor: '#030712',
                    "--primary-theme": themeColor || "var(--primary-theme)"
                } as React.CSSProperties}
                className="bg-[#030712] border-white/5 text-white p-0 overflow-hidden rounded-[2.5rem] shadow-2xl border"
            >
                <div className="p-12 space-y-8">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 border-b border-white/5 pb-6">
                        <DialogHeader className="space-y-1.5">
                            <DialogTitle className="text-3xl font-black italic uppercase tracking-tighter leading-none text-white">
                                {activeTab === "documents" ? (
                                    <>Compliance <span className="text-primary">Vault</span></>
                                ) : isBusinessPermit && activeTab === "business" ? (
                                    <>Business <span className="text-primary">Record</span></>
                                ) : (
                                    <>Resident <span className="text-primary">Identity</span></>
                                )}
                            </DialogTitle>
                            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.3em] italic opacity-80">
                                {activeTab === "documents" ? "Verified Upload Attachments" : isBusinessPermit && activeTab === "business" ? "BPLO Registration Dossier" : "Citizen Data Record"}
                            </p>
                        </DialogHeader>

                        {/* Interactive Tab Toggles (Glass-morphic pills) */}
                        <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/10 self-start sm:self-center">
                            <button
                                onClick={() => setActiveTab("citizen")}
                                className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider italic transition-all flex items-center gap-2 ${activeTab === "citizen"
                                        ? "bg-primary text-white shadow-lg"
                                        : "text-slate-400 hover:text-white"
                                    }`}
                            >
                                <UserRound className="w-3.5 h-3.5" />
                                Citizen Profile
                            </button>
                            {isBusinessPermit && (
                                <button
                                    onClick={() => setActiveTab("business")}
                                    className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider italic transition-all flex items-center gap-2 ${activeTab === "business"
                                            ? "bg-primary text-white shadow-lg"
                                            : "text-slate-400 hover:text-white"
                                        }`}
                                >
                                    <Building2 className="w-3.5 h-3.5" />
                                    Business Profile
                                </button>
                            )}
                            {!hideDocuments && (
                                <button
                                    onClick={() => setActiveTab("documents")}
                                    className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider italic transition-all flex items-center gap-2 ${activeTab === "documents"
                                            ? "bg-primary text-white shadow-lg"
                                            : "text-slate-400 hover:text-white"
                                        }`}
                                >
                                    <FileText className="w-3.5 h-3.5" />
                                    Documents {activeDocs.length > 0 && `(${activeDocs.length})`}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* CITIZEN PROFILE TAB CONTENT */}
                    {activeTab === "citizen" && (
                        <div className="grid grid-cols-12 gap-x-8 gap-y-8 animate-in fade-in zoom-in-95 duration-200">
                            {/* Row 1: Names */}
                            <div className="col-span-12 md:col-span-3 space-y-3">
                                <label style={{ whiteSpace: 'nowrap' }} className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">First Name</label>
                                <div className="h-13 flex items-center px-6 bg-white/5 border border-white/10 rounded-[1.25rem] font-bold text-[14px] text-slate-100">
                                    {resident?.firstName || "--"}
                                </div>
                            </div>
                            <div className="col-span-12 md:col-span-3 space-y-3">
                                <label style={{ whiteSpace: 'nowrap' }} className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Middle Name</label>
                                <div className="h-13 flex items-center px-6 bg-white/5 border border-white/10 rounded-[1.25rem] font-bold text-[14px] text-slate-100">
                                    {resident?.middleName || "--"}
                                </div>
                            </div>
                            <div className="col-span-12 md:col-span-3 space-y-3">
                                <label style={{ whiteSpace: 'nowrap' }} className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Last Name</label>
                                <div className="h-13 flex items-center px-6 bg-white/5 border border-white/10 rounded-[1.25rem] font-bold text-[14px] text-slate-100">
                                    {resident?.lastName || "--"}
                                </div>
                            </div>
                            <div className="col-span-12 md:col-span-3 space-y-3">
                                <label style={{ whiteSpace: 'nowrap' }} className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Suffix</label>
                                <div className="h-13 flex items-center px-6 bg-white/5 border border-white/10 rounded-[1.25rem] font-bold text-[14px] text-slate-100">
                                    {resident?.suffix || "--"}
                                </div>
                            </div>

                            {/* Row 2: Details */}
                            <div className="col-span-12 md:col-span-3 space-y-3">
                                <label style={{ whiteSpace: 'nowrap' }} className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Birth Date</label>
                                <div className="h-13 flex items-center px-6 bg-white/5 border border-white/10 rounded-[1.25rem] font-bold text-[14px] text-slate-100">
                                    {resident?.dateOfBirth ? new Date(resident.dateOfBirth).toLocaleDateString() : "--"}
                                </div>
                            </div>
                            <div className="col-span-12 md:col-span-2 space-y-3">
                                <label style={{ whiteSpace: 'nowrap' }} className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Age</label>
                                <div className="h-13 flex items-center px-6 bg-white/5 border border-white/10 rounded-[1.25rem] font-bold text-[14px] text-slate-100">
                                    {resident?.age ?? (resident?.dateOfBirth ? differenceInYears(new Date(), new Date(resident.dateOfBirth)) : "--")}
                                </div>
                            </div>
                            <div className="col-span-12 md:col-span-3 space-y-3">
                                <label style={{ whiteSpace: 'nowrap' }} className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Civil Status</label>
                                <div className="h-13 flex items-center px-6 bg-white/5 border border-white/10 rounded-[1.25rem] font-bold text-[14px] uppercase text-slate-100">
                                    {resident?.civilStatus || "--"}
                                </div>
                            </div>
                            <div className="col-span-12 md:col-span-4 space-y-3">
                                <label style={{ whiteSpace: 'nowrap' }} className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Citizenship</label>
                                <div className="h-13 flex items-center px-6 bg-white/5 border border-white/10 rounded-[1.25rem] font-bold text-[14px] uppercase text-primary">
                                    {resident?.citizenship || "Filipino"}
                                </div>
                            </div>

                            {/* Row 3: Contact & Occupation */}
                            <div className="col-span-12 md:col-span-6 space-y-3">
                                <label style={{ whiteSpace: 'nowrap' }} className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Occupation</label>
                                <div className="h-13 flex items-center px-6 bg-white/5 border border-white/10 rounded-[1.25rem] font-bold text-[14px] text-slate-100">
                                    {resident?.occupation || "--"}
                                </div>
                            </div>
                            <div className="col-span-12 md:col-span-6 space-y-3">
                                <label style={{ whiteSpace: 'nowrap' }} className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Contact Number</label>
                                <div className="h-13 flex items-center px-6 bg-white/5 border border-white/10 rounded-[1.25rem] font-bold text-[14px] gap-4 text-slate-100">
                                    <Phone className="w-5 h-5 text-primary flex-shrink-0" />
                                    {resident?.contactNumber || "--"}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* BUSINESS PROFILE TAB CONTENT */}
                    {isBusinessPermit && activeTab === "business" && (
                        <div className="grid grid-cols-12 gap-x-8 gap-y-8 animate-in fade-in zoom-in-95 duration-200">
                            {/* Business Row 1 - Business Identity */}
                            <div className="col-span-12 md:col-span-4 space-y-3">
                                <label style={{ whiteSpace: 'nowrap' }} className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Official Business</label>
                                <div className="h-13 flex items-center px-6 bg-white/5 border border-white/10 rounded-[1.25rem] font-black uppercase tracking-tight text-[14px] text-primary truncate">
                                    {additional?.businessName || "--"}
                                </div>
                            </div>
                            <div className="col-span-12 md:col-span-4 space-y-3">
                                <label style={{ whiteSpace: 'nowrap' }} className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Trade Signage Name</label>
                                <div className="h-13 flex items-center px-6 bg-white/5 border border-white/10 rounded-[1.25rem] font-bold text-[14px] text-slate-100 truncate">
                                    {additional?.tradeName || "Same as Business Name"}
                                </div>
                            </div>
                            <div className="col-span-12 md:col-span-4 space-y-3">
                                <label style={{ whiteSpace: 'nowrap' }} className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Organization Type</label>
                                <div className="h-13 flex items-center px-6 bg-white/5 border border-white/10 rounded-[1.25rem] font-bold text-[14px] text-slate-100 uppercase truncate">
                                    {additional?.orgType ? additional.orgType.replace(/_/g, " ") : "--"}
                                </div>
                            </div>

                            {/* Business Row 2 - Location Address */}
                            <div className="col-span-12 md:col-span-4 space-y-3">
                                <label style={{ whiteSpace: 'nowrap' }} className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Building / House No. / Unit</label>
                                <div className="h-13 flex items-center px-6 bg-white/5 border border-white/10 rounded-[1.25rem] font-bold text-[14px] text-slate-100 truncate">
                                    {additional?.building || "--"}
                                </div>
                            </div>
                            <div className="col-span-12 md:col-span-4 space-y-3">
                                <label style={{ whiteSpace: 'nowrap' }} className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Street Address</label>
                                <div className="h-13 flex items-center px-6 bg-white/5 border border-white/10 rounded-[1.25rem] font-bold text-[14px] text-slate-100 truncate">
                                    {additional?.street || "--"}
                                </div>
                            </div>
                            <div className="col-span-12 md:col-span-4 space-y-3">
                                <label style={{ whiteSpace: 'nowrap' }} className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Business Barangay</label>
                                <div className="h-13 flex items-center px-6 bg-white/5 border border-white/10 rounded-[1.25rem] font-bold text-[14px] gap-4 text-slate-100 uppercase">
                                    <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
                                    <span className="truncate">{additional?.businessBarangay || additional?.barangay || resident?.barangay || "--"}</span>
                                </div>
                            </div>

                            {/* Business Row 3 - Category & Registration */}
                            <div className="col-span-12 md:col-span-6 space-y-3">
                                <label style={{ whiteSpace: 'nowrap' }} className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Line of Business</label>
                                <div className="h-13 flex items-center px-6 bg-white/5 border border-white/10 rounded-[1.25rem] font-bold text-[14px] text-slate-100 truncate">
                                    {additional?.lineOfBusiness || "General"}
                                </div>
                            </div>
                            {!isRenewal ? (
                                <div className="col-span-12 md:col-span-6 space-y-3">
                                    <label style={{ whiteSpace: 'nowrap' }} className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">DTI / SEC Registration</label>
                                    <div className="h-13 flex items-center px-6 bg-white/5 border border-white/10 rounded-[1.25rem] font-bold text-[14px] text-slate-100 truncate">
                                        {additional?.dtiSecNumber || "--"}
                                    </div>
                                </div>
                            ) : (
                                <div className="col-span-12 md:col-span-6 space-y-3 animate-in slide-in-from-right-4 duration-300">
                                    <label style={{ whiteSpace: 'nowrap' }} className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Existing Permit No.</label>
                                    <div className="h-13 flex items-center px-6 bg-white/5 border border-white/10 rounded-[1.25rem] font-bold text-[14px] gap-3 text-primary">
                                        <Hash className="w-3.5 h-3.5 flex-shrink-0" />
                                        <span className="truncate">{additional?.existingPermitNumber || additional?.existingPermitNo || additional?.permitNumber || "--"}</span>
                                    </div>
                                </div>
                            )}

                            {/* Business Row 4 - Operational Metrics */}
                            <div className="col-span-12 md:col-span-4 space-y-3">
                                <label style={{ whiteSpace: 'nowrap' }} className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Employee Count</label>
                                <div className="h-13 flex items-center px-6 bg-white/5 border border-white/10 rounded-[1.25rem] font-bold text-[14px] text-slate-100">
                                    {additional?.employeeCount ?? "0"}
                                </div>
                            </div>
                            <div className="col-span-12 md:col-span-4 space-y-3">
                                <label style={{ whiteSpace: 'nowrap' }} className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Store Area</label>
                                <div className="h-13 flex items-center px-6 bg-white/5 border border-white/10 rounded-[1.25rem] font-bold text-[14px] text-slate-100">
                                    {additional?.businessArea ? `${additional.businessArea} sqm` : "0 sqm"}
                                </div>
                            </div>
                            {!isRenewal ? (
                                <div className="col-span-12 md:col-span-4 space-y-3">
                                    <label style={{ whiteSpace: 'nowrap' }} className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Initial Capitalization</label>
                                    <div className="h-13 flex items-center px-6 bg-white/5 border border-white/10 rounded-[1.25rem] font-bold text-[14px] text-primary">
                                        {additional?.capitalInvestment ? "₱" + Number(additional.capitalInvestment).toLocaleString(undefined, { minimumFractionDigits: 2 }) : "₱0.00"}
                                    </div>
                                </div>
                            ) : (
                                <div className="col-span-12 md:col-span-4 space-y-3">
                                    <label style={{ whiteSpace: 'nowrap' }} className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Declared Gross Sales</label>
                                    <div className="h-13 flex items-center px-6 bg-white/5 border border-white/10 rounded-[1.25rem] font-bold text-[14px] text-primary">
                                        {additional?.grossSales ? "₱" + Number(additional.grossSales).toLocaleString(undefined, { minimumFractionDigits: 2 }) : "₱0.00"}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* COMPLIANCE DOCUMENTS TAB CONTENT */}
                    {!hideDocuments && activeTab === "documents" && (
                        <div className="w-full">
                            {activeDocs.length === 0 ? (
                                <div className="w-full py-16 flex flex-col items-center justify-center text-center space-y-4 bg-white/5 border border-white/10 rounded-[2rem]">
                                    <div className="p-5 rounded-2xl bg-white/5 text-slate-500 border border-white/5">
                                        <Camera className="w-8 h-8" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <h4 className="text-lg font-black uppercase tracking-tight text-slate-400 italic">No Uploaded Documents</h4>
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest italic max-w-xs px-4">
                                            Walang nakitang compliance document attachments sa dossier na ito.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-12 gap-8 w-full animate-in fade-in zoom-in-95 duration-200">
                                    {/* Left Side: Navigation Playlist */}
                                    <div className="col-span-12 md:col-span-5 space-y-3 max-h-[380px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                                        <p className="text-[9px] font-black uppercase text-slate-500 tracking-[0.2em] italic mb-4 ml-1">Document Attachments ({activeDocs.length})</p>
                                        <div className="flex flex-col gap-2">
                                            {activeDocs.map((doc, idx) => {
                                                const isSelected = selectedDocIndex === idx;
                                                return (
                                                    <button
                                                        key={idx}
                                                        onClick={() => selectDoc(idx)}
                                                        className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${isSelected
                                                                ? "bg-primary/10 border-primary/40 text-white shadow-lg"
                                                                : "bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10"
                                                            }`}
                                                    >
                                                        {/* Mini Thumbnail */}
                                                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-900 border border-white/10 relative flex-shrink-0 flex items-center justify-center">
                                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                                            <img
                                                                src={doc.url}
                                                                alt={doc.label}
                                                                className="object-cover w-full h-full"
                                                            />
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className={`text-[11px] font-black uppercase tracking-wider italic truncate ${isSelected ? "text-primary" : ""}`}>
                                                                {doc.label}
                                                            </p>
                                                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.1em] italic mt-0.5">
                                                                Click to inspect record
                                                            </p>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Right Side: High-Fidelity Interactive Viewer */}
                                    <div className="col-span-12 md:col-span-7 flex flex-col bg-white/5 border border-white/10 rounded-[2rem] overflow-hidden p-5 relative h-[380px] justify-between">
                                        {/* Viewport Frame */}
                                        <div className="relative flex-1 w-full flex items-center justify-center overflow-hidden bg-slate-950/80 rounded-2xl border border-white/5 p-4">
                                            <div
                                                className="relative max-w-full max-h-full transition-transform duration-300 ease-out flex items-center justify-center"
                                                style={{ transform: `scale(${scale}) rotate(${rotate}deg)` }}
                                            >
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img
                                                    src={activeDocs[selectedDocIndex]?.url}
                                                    alt={activeDocs[selectedDocIndex]?.label}
                                                    className="object-contain max-h-[240px] max-w-full select-none rounded"
                                                    draggable={false}
                                                />
                                            </div>

                                            {/* Floating Title Tag */}
                                            <div className="absolute top-4 left-4 z-10 bg-black/60 backdrop-blur-md px-3 py-1 rounded-xl border border-white/10 flex items-center gap-2">
                                                <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                                                <span className="text-[9px] font-black uppercase tracking-[0.15em] text-white italic">
                                                    {activeDocs[selectedDocIndex]?.label}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Interactive Control Deck */}
                                        <div className="flex items-center justify-between gap-4 mt-3 pt-3 border-t border-white/5">
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="w-9 h-9 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-all animate-none"
                                                    onClick={() => setScale(s => Math.max(s - 0.2, 0.5))}
                                                    title="Zoom Out"
                                                >
                                                    <ZoomOut className="w-4 h-4" />
                                                </Button>
                                                <div className="w-12 text-center text-[10px] font-black text-slate-400 italic">
                                                    {Math.round(scale * 100)}%
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="w-9 h-9 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-all animate-none"
                                                    onClick={() => setScale(s => Math.min(s + 0.2, 3))}
                                                    title="Zoom In"
                                                >
                                                    <ZoomIn className="w-4 h-4" />
                                                </Button>
                                                <div className="w-px h-4 bg-white/10 mx-1.5" />
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="w-9 h-9 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-all animate-none"
                                                    onClick={() => setRotate(r => (r + 90) % 360)}
                                                    title="Rotate 90°"
                                                >
                                                    <RotateCw className="w-4 h-4" />
                                                </Button>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                {activeDocs[selectedDocIndex]?.url && (
                                                    <a
                                                        href={activeDocs[selectedDocIndex].url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                    >
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-9 px-4 rounded-xl hover:bg-white/10 text-xs font-black uppercase tracking-wider italic transition-all flex items-center gap-2 text-primary"
                                                        >
                                                            <ExternalLink className="w-3.5 h-3.5" />
                                                            Open Original
                                                        </Button>
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="border-t border-white/5 pt-4 flex justify-between items-center">
                        <span className="text-[8px] font-black uppercase text-slate-600 tracking-[0.2em] italic">E-LGU INTEGRATED DOSSIER SYSTEM</span>
                        <p className="text-[9px] font-bold text-slate-600 italic tracking-widest uppercase opacity-40">System Resident Verification Vault</p>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}

export default IdentityConfirmationVault
