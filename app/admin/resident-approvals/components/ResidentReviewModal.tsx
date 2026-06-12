"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import Image from "next/image";
import {
    CheckCircle, XCircle, X, User, MapPin, Phone,
    Briefcase, Shield, Heart, Users, FileText, AlertTriangle,
    Clock, BadgeCheck, RotateCw, RefreshCw, ZoomIn, ZoomOut
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { approveResident, rejectResident } from "@/app/admin/actions/registration-approval";
import type { Resident } from "../providers/ResidentProvider";

interface ResidentReviewModalProps {
    resident: Resident | null;
    isOpen: boolean;
    onClose: () => void;
    onStatusChange: (id: string, newStatus: "APPROVED" | "REJECTED", remarks?: string) => void;
    themeColor?: string;
}

const Section = ({ icon: Icon, title, children }: { icon: React.ElementType, title: string, children: React.ReactNode }) => (
    <div className="space-y-3">
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
            <Icon className="w-4 h-4 text-slate-400" />
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">{title}</h4>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2">
            {children}
        </div>
    </div>
);

const Field = ({ label, value }: { label: string, value: string | null | undefined | boolean | number }) => {
    const displayValue = value === null || value === undefined || value === "" ? (
        <span className="text-slate-400 italic text-xs">N/A</span>
    ) : typeof value === "boolean" ? (
        <span className={`text-xs font-bold ${value ? "text-emerald-600" : "text-slate-400"}`}>{value ? "Yes" : "No"}</span>
    ) : (
        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{String(value)}</span>
    );

    return (
        <div className="flex flex-col gap-0.5">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{label}</span>
            {displayValue}
        </div>
    );
};

export function ResidentReviewModal({ resident, isOpen, onClose, onStatusChange, themeColor = "#2563eb" }: ResidentReviewModalProps) {
    const [isRejecting, setIsRejecting] = useState(false);
    const [remarks, setRemarks] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    // Zoom, Rotation, and Drag Lightbox state
    const [zoomedImage, setZoomedImage] = useState<{ src: string; label: string } | null>(null);
    const [rotation, setRotation] = useState(0);
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    const openLightbox = (src: string, label: string) => {
        setZoomedImage({ src, label });
        setRotation(0);
        setScale(1);
        setPosition({ x: 0, y: 0 });
        setIsDragging(false);
    };

    const handleReset = () => {
        setRotation(0);
        setScale(1);
        setPosition({ x: 0, y: 0 });
        setIsDragging(false);
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (scale === 1) return; // Only allow drag when zoomed in
        e.preventDefault();
        setIsDragging(true);
        setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return;
        e.preventDefault();
        setPosition({
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y
        });
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    // Listen for Escape key to close the lightbox preview
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setZoomedImage(null);
            }
        };

        if (zoomedImage) {
            window.addEventListener("keydown", handleKeyDown);
            // Disable background scrolling when zooming in
            document.body.style.overflow = "hidden";
        }

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            document.body.style.overflow = "unset";
        };
    }, [zoomedImage]);

    if (!isOpen || !resident) return null;

    const handleApprove = async () => {
        setIsLoading(true);
        try {
            const result = await approveResident(resident.id);
            if (result.success) {
                toast.success(`${resident.firstName} ${resident.lastName} has been approved.`);
                onStatusChange(resident.id, "APPROVED");
                onClose();
            } else {
                toast.error(result.error || "Failed to approve.");
            }
        } catch {
            toast.error("An unexpected error occurred.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleReject = async () => {
        if (!remarks.trim() || remarks.trim().length < 10) {
            toast.error("Please provide a rejection reason of at least 10 characters.");
            return;
        }
        setIsLoading(true);
        try {
            const result = await rejectResident(resident.id, remarks);
            if (result.success) {
                toast.success(`Rejection notice sent to ${resident.email || "the resident"}.`);
                onStatusChange(resident.id, "REJECTED", remarks);
                onClose();
                setRemarks("");
                setIsRejecting(false);
            } else {
                toast.error(result.error || "Failed to reject.");
            }
        } catch {
            toast.error("An unexpected error occurred.");
        } finally {
            setIsLoading(false);
        }
    };

    const statusConfig = {
        PENDING: { label: "Pending Review", color: "text-amber-600", bg: "bg-amber-50 border-amber-200", icon: Clock },
        APPROVED: { label: "Approved", color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200", icon: CheckCircle },
        REJECTED: { label: "Rejected", color: "text-red-600", bg: "bg-red-50 border-red-200", icon: XCircle },
        DRAFT: { label: "Draft", color: "text-slate-500", bg: "bg-slate-50 border-slate-200", icon: FileText },
    };

    const status = statusConfig[resident.registrationStatus] || statusConfig.PENDING;
    const StatusIcon = status.icon;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            <div className="relative bg-white dark:bg-[#151b2b] rounded-3xl shadow-2xl border border-slate-200 dark:border-[#2a3040] w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-start justify-between p-6 border-b border-slate-100 dark:border-[#2a3040] flex-shrink-0">
                    <div className="flex items-center gap-4">
                        {/* Interactive Profile Picture */}
                        <button 
                            type="button"
                            className={`group relative w-16 h-16 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 flex-shrink-0 transition-all duration-300 hover:scale-105 hover:shadow-md ${(resident.livenessUrl || resident.imageUrl) ? "cursor-zoom-in" : "cursor-default"}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                const url = resident.livenessUrl || resident.imageUrl;
                                if (url) {
                                    openLightbox(url, "Profile Photo");
                                }
                            }}
                            disabled={!(resident.livenessUrl || resident.imageUrl)}
                            title={(resident.livenessUrl || resident.imageUrl) ? "Click to view full photo" : ""}
                        >
                            {(resident.livenessUrl || resident.imageUrl) ? (
                                <Image 
                                    src={(resident.livenessUrl || resident.imageUrl) || ""} 
                                    alt="Profile" 
                                    fill 
                                    className="object-cover transition-transform duration-300 group-hover:scale-110" 
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center font-black text-xl text-slate-400 uppercase">
                                    {(resident.firstName && resident.firstName[0]) || ""}{(resident.lastName && resident.lastName[0]) || ""}
                                </div>
                            )}
                        </button>
                        <div>
                            <h2 className="text-xl font-black uppercase tracking-tighter italic text-slate-900 dark:text-white leading-none">
                                {resident.lastName}, {resident.firstName} {resident.middleName ? `${resident.middleName[0]}.` : ""} {resident.suffix}
                            </h2>
                            <p className="text-xs text-slate-500 mt-1 font-medium">{resident.email || "No email on file"}</p>
                            
                            {/* Badges Container */}
                            <div className="flex flex-wrap items-center gap-2 mt-2">
                                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold ${status.bg} ${status.color}`}>
                                    <StatusIcon className="w-3.5 h-3.5" />
                                    {status.label}
                                </div>

                                {resident.isHead && (
                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold bg-violet-50 dark:bg-violet-950/30 border-violet-200 dark:border-violet-850 text-violet-700 dark:text-violet-300 shadow-sm transition-all duration-300 hover:scale-105">
                                        <Users className="w-3.5 h-3.5 text-violet-500" />
                                        Family Head
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                {/* Body - Scrollable */}
                <div className="overflow-y-auto custom-scrollbar flex-1 p-6 space-y-6">
                    <Section icon={User} title="Personal Information">
                        <Field label="Gender" value={resident.gender} />
                        <Field label="Civil Status" value={resident.civilStatus} />
                        <Field label="Date of Birth" value={resident.dateOfBirth ? new Date(resident.dateOfBirth).toLocaleDateString() : null} />
                        <Field label="Age" value={resident.age} />
                        <Field label="Place of Birth" value={resident.placeOfBirth} />
                        <Field label="Citizenship" value={resident.citizenship} />
                        <Field label="Religion" value={resident.religion} />
                        <Field label="Blood Type" value={resident.bloodType} />
                        <Field label="Height" value={resident.height} />
                        <Field label="Weight" value={resident.weight} />
                    </Section>

                    <Section icon={Users} title="Family Status">
                        <Field label="Is Family Head?" value={resident.isHead} />
                        {!resident.isHead ? (
                            <>
                                <Field label="Relationship to Head" value={resident.relationshipToHead || "Member"} />
                                <Field label="Family Head Name" value={resident.headName} />
                            </>
                        ) : (
                            <Field label="Family Members Count" value={resident.household?.members?.length || 0} />
                        )}

                        {((resident.household?.members && resident.household.members.length > 0) || (resident.familyMembers && resident.familyMembers.length > 0)) && (
                            <div className="col-span-2 mt-4 bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 space-y-3 shadow-sm">
                                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Registered Family / Household Members</p>
                                <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[220px] overflow-y-auto custom-scrollbar pr-1">
                                    {resident.household?.members && resident.household.members.length > 0 ? (
                                        resident.household.members.map((member, idx) => (
                                            <div key={member.id || idx} className="py-2.5 flex items-center justify-between gap-4 first:pt-0 last:pb-0">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-xs text-slate-500 uppercase border border-slate-200 dark:border-slate-700">
                                                        {(member.firstName && member.firstName[0]) || ""}{(member.lastName && member.lastName[0]) || ""}
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                                            {member.firstName} {member.lastName} {member.id === resident.id && <span className="text-[9px] font-bold text-primary dark:text-blue-400 uppercase tracking-wider ml-1">(Current)</span>}
                                                        </p>
                                                        <p className="text-[10px] font-semibold text-slate-400">
                                                            {member.isHead ? "Family Head" : (member.relationshipToHead || "Member")}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs font-bold text-slate-600 dark:text-slate-400">{member.gender}</p>
                                                    <p className="text-[9px] font-bold text-slate-400">{member.age ? `${member.age} yrs old` : "Age N/A"}</p>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        resident.familyMembers?.map((member, idx) => (
                                            <div key={member.id || idx} className="py-2.5 flex items-center justify-between gap-4 first:pt-0 last:pb-0">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-xs text-slate-500 uppercase border border-slate-200 dark:border-slate-700">
                                                        {member.fullName[0] || "F"}
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{member.fullName}</p>
                                                        <p className="text-[10px] font-semibold text-slate-400">{member.relationship}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs font-bold text-slate-600 dark:text-slate-400">{member.age ? `${member.age} yrs old` : "Age N/A"}</p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </Section>

                    <Section icon={MapPin} title="Address">
                        <Field label="House No." value={resident.houseNumber} />
                        <Field label="Street" value={resident.street} />
                        <Field label="Sitio" value={resident.sitio} />
                        <Field label="Purok" value={resident.purok} />
                        <Field label="Barangay" value={resident.barangay} />
                        <Field label="Municipality" value={resident.municipality} />
                        <Field label="Province" value={resident.province} />
                    </Section>

                    <Section icon={Phone} title="Contact Information">
                        <Field label="Contact Number" value={resident.contactNumber} />
                        <Field label="Email Address" value={resident.email} />
                    </Section>

                    <Section icon={Briefcase} title="Socio-Economic">
                        <Field label="Occupation" value={resident.occupation} />
                        <Field label="Employer" value={resident.employer} />
                        <Field label="Employment Status" value={resident.employmentStatus} />
                        <Field label="Monthly Income" value={resident.monthlyIncome} />
                        <Field label="Educational Attainment" value={resident.educationalAttainment} />
                        <Field label="TIN" value={resident.tin} />
                        <Field label="SSS" value={resident.sss} />
                        <Field label="GSIS" value={resident.gsis} />
                        <Field label="Philhealth" value={resident.philhealthNumber} />
                    </Section>

                    <Section icon={Heart} title="Sectors">
                        <Field label="Senior Citizen" value={resident.isSenior} />
                        <Field label="PWD" value={resident.isPWD} />
                        <Field label="Solo Parent" value={resident.isSoloParent} />
                        <Field label="Indigenous" value={resident.isIndigenous} />
                        <Field label="4Ps Beneficiary" value={resident.is4Ps} />
                        <Field label="Other Sector" value={resident.otherSector} />
                    </Section>

                    <Section icon={Users} title="Family Background">
                        <Field label="Mother's First Name" value={(resident as { motherFirstName?: string | null }).motherFirstName} />
                        <Field label="Mother's Last Name" value={(resident as { motherLastName?: string | null }).motherLastName} />
                        <Field label="Father's First Name" value={(resident as { fatherFirstName?: string | null }).fatherFirstName} />
                        <Field label="Father's Last Name" value={(resident as { fatherLastName?: string | null }).fatherLastName} />
                    </Section>

                    <Section icon={Shield} title="Identity Verification">
                        <Field label="ID Type" value={resident.idType} />
                        <Field label="Registration Type" value={resident.registrationType} />
                        <Field label="Privacy Consent" value={(resident as { dataPrivacyConsent?: boolean }).dataPrivacyConsent} />
                    </Section>

                    {resident.idFrontUrl && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                                <BadgeCheck className="w-4 h-4 text-slate-400" />
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">ID Documents</h4>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                {resident.idFrontUrl && (
                                    <div>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">ID Front (Click to view)</p>
                                        <button 
                                            type="button"
                                            className="group relative w-full h-32 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 cursor-zoom-in transition-all duration-300 hover:scale-[1.02] hover:shadow-md"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (resident.idFrontUrl) {
                                                    openLightbox(resident.idFrontUrl, "ID Front Document");
                                                }
                                            }}
                                            title="Click to view high-res ID front"
                                        >
                                            <Image src={resident.idFrontUrl} alt="ID Front" fill className="object-cover transition-transform duration-300 group-hover:scale-105" />
                                        </button>
                                    </div>
                                )}
                                {resident.idBackUrl && (
                                    <div>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">ID Back (Click to view)</p>
                                        <button 
                                            type="button"
                                            className="group relative w-full h-32 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 cursor-zoom-in transition-all duration-300 hover:scale-[1.02] hover:shadow-md"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (resident.idBackUrl) {
                                                    openLightbox(resident.idBackUrl, "ID Back Document");
                                                }
                                            }}
                                            title="Click to view high-res ID back"
                                        >
                                            <Image src={resident.idBackUrl} alt="ID Back" fill className="object-cover transition-transform duration-300 group-hover:scale-105" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Rejection Form */}
                    {isRejecting && (
                        <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-2xl p-4 space-y-3">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-red-500" />
                                <h4 className="text-sm font-black uppercase tracking-wider text-red-600">Rejection Reason</h4>
                            </div>
                            <p className="text-xs text-red-500 font-medium">
                                This message will be emailed to the resident at <strong>{resident.email || "their registered email"}</strong>.
                            </p>
                            <textarea
                                id="rejection-remarks"
                                value={remarks}
                                onChange={(e) => setRemarks(e.target.value)}
                                placeholder="Provide a clear reason for rejection (minimum 10 characters)..."
                                rows={4}
                                className="w-full text-sm p-3 rounded-xl border border-red-200 dark:border-red-800 bg-white dark:bg-[#0f1117] text-slate-800 dark:text-slate-200 resize-none focus:outline-none focus:ring-2 focus:ring-red-400 placeholder:text-slate-400"
                            />
                            <div className="flex justify-end gap-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => { setIsRejecting(false); setRemarks(""); }}
                                    className="rounded-xl"
                                    disabled={isLoading}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={handleReject}
                                    disabled={isLoading || remarks.trim().length < 10}
                                    className="rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold"
                                >
                                    {isLoading ? "Sending..." : "Confirm Rejection"}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer with Action Buttons */}
                {resident.registrationStatus === "PENDING" && !isRejecting && (
                    <div className="p-6 border-t border-slate-100 dark:border-[#2a3040] flex items-center justify-between gap-3 flex-shrink-0 bg-slate-50/50 dark:bg-[#1a1f2e]/50">
                        <p className="text-xs text-slate-500 font-medium">
                            Review all information carefully before approving.
                        </p>
                        <div className="flex items-center gap-3">
                            <Button
                                variant="outline"
                                onClick={() => setIsRejecting(true)}
                                className="rounded-xl border-red-200 dark:border-red-800 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 font-bold gap-2"
                                disabled={isLoading}
                            >
                                <XCircle className="w-4 h-4" />
                                Reject
                            </Button>
                            <Button
                                onClick={handleApprove}
                                disabled={isLoading}
                                className="rounded-xl text-white font-bold gap-2 shadow-lg"
                                style={{ backgroundColor: themeColor }}
                            >
                                <CheckCircle className="w-4 h-4" />
                                {isLoading ? "Processing..." : "Approve"}
                            </Button>
                        </div>
                    </div>
                )}

                {resident.registrationStatus === "REJECTED" && (resident as { rejectionRemarks?: string | null }).rejectionRemarks && (
                    <div className="p-6 border-t border-slate-100 dark:border-[#2a3040] flex-shrink-0 bg-red-50/50 dark:bg-red-900/5">
                        <p className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-1">Rejection Reason on File</p>
                        <p className="text-sm text-red-700 dark:text-red-400 font-medium">{(resident as { rejectionRemarks?: string | null }).rejectionRemarks}</p>
                    </div>
                )}
            </div>

            {/* Lightbox Preview Modal */}
            {zoomedImage && (
                <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-in fade-in duration-200">
                    {/* Click background to close */}
                    <div className="absolute inset-0 cursor-zoom-out" onClick={() => setZoomedImage(null)} />
                    
                    {/* Top glassmorphic header bar */}
                    <div className="absolute top-0 inset-x-0 h-16 flex items-center justify-between px-6 bg-black/40 border-b border-white/10 backdrop-blur-sm z-10">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Resident Verification</span>
                            <span className="text-sm font-black text-white italic uppercase tracking-tight">{zoomedImage.label}</span>
                        </div>
                        
                        <div className="flex items-center gap-2.5 z-20">
                            {/* Zoom Out Button */}
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setScale((prev) => Math.max(prev - 0.25, 1));
                                }}
                                disabled={scale === 1}
                                className="flex items-center justify-center p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/10 disabled:opacity-40 transition-all duration-300 hover:scale-105 active:scale-95 shadow-md"
                                title="Zoom Out"
                            >
                                <ZoomOut className="w-4 h-4" />
                            </button>

                            {/* Zoom In Button */}
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setScale((prev) => Math.min(prev + 0.25, 6));
                                }}
                                disabled={scale === 6}
                                className="flex items-center justify-center p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/10 disabled:opacity-40 transition-all duration-300 hover:scale-105 active:scale-95 shadow-md"
                                title="Zoom In"
                            >
                                <ZoomIn className="w-4 h-4" />
                            </button>

                            {/* Rotate 90deg button */}
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setRotation((prev) => (prev + 90) % 360);
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-white text-xs font-bold transition-all duration-300 hover:scale-105 active:scale-95 shadow-md"
                                title="Rotate Image 90 degrees"
                            >
                                <RotateCw className="w-3.5 h-3.5 text-blue-400" />
                                Rotate 90°
                            </button>

                            {/* Reset Button */}
                            {(rotation !== 0 || scale !== 1 || position.x !== 0 || position.y !== 0) && (
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleReset();
                                    }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-white text-xs font-bold transition-all duration-300 hover:scale-105 active:scale-95 shadow-md animate-in slide-in-from-right duration-200"
                                    title="Reset Zoom & Rotation"
                                >
                                    <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                                    Reset
                                </button>
                            )}

                            {/* Close Lightbox */}
                            <button 
                                onClick={() => setZoomedImage(null)} 
                                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-all duration-300 hover:scale-105 active:scale-95 shadow-md"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* High-res Image Content with Zoom wheel & Drag panning */}
                    <div 
                        className="relative w-full max-w-4xl h-[70vh] flex items-center justify-center p-4 z-0 overflow-hidden select-none pointer-events-auto"
                        onWheel={(e) => {
                            const delta = e.deltaY < 0 ? 0.25 : -0.25;
                            setScale((prev) => Math.min(Math.max(prev + delta, 1), 6));
                        }}
                    >
                        <div 
                            className={`relative flex items-center justify-center transition-transform duration-200 ease-out select-none`}
                            style={{ 
                                transform: `translate(${position.x}px, ${position.y}px)`, 
                                cursor: scale > 1 ? (isDragging ? "grabbing" : "grab") : "zoom-in"
                            }}
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onMouseLeave={handleMouseUp}
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img 
                                src={zoomedImage.src} 
                                alt={zoomedImage.label} 
                                className={`max-w-full max-h-[70vh] object-contain rounded-2xl shadow-2xl border border-white/10 pointer-events-none select-none ${isDragging ? "transition-none" : "transition-transform duration-200 ease-out"}`}
                                style={{ 
                                    transform: `rotate(${rotation}deg) scale(${scale})`,
                                    transformOrigin: "center"
                                }}
                            />
                        </div>
                    </div>

                    {/* Bottom overlay shortcut hint */}
                    <div className="absolute bottom-6 text-center z-10 pointer-events-none">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                            Scroll to Zoom • Drag to Pan {scale > 1 && "• Double-click to Reset"} • Press <kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/10 text-white text-[9px]">ESC</kbd> to Close
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}

