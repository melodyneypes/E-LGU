"use client";
import { configuredBarangays } from "@/lib/utils/lgu";

import React, { useState, useEffect, useCallback } from "react";
import { ChevronDown, ChevronUp, UserCheck, ShieldAlert, KeyRound, Loader2, Eye, EyeOff, Lock, ShieldCheck } from "lucide-react";
import { differenceInYears } from "date-fns";
import { toast } from "sonner";
import { verifyStaffPasswordToUnlockAction } from "../profile-actions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const LGU_BARANGAYS = configuredBarangays;
interface ResidentIdentityProfileProps {
    resident: any;
    safeFormatDate: (dateStr: any) => string;
    themeColor: string;
    titleColorText?: string;
    titleWhiteText?: string;
    subtitleText?: string;
    relationship?: string;
    relationshipLabel?: string;
    transactionId?: string;
    canEdit?: boolean;
    onProfileUpdated?: () => void;
    // Shared authorization state for joint Gross Income & Profile unlock
    isAuthorized?: boolean;
    setIsAuthorized?: (val: boolean) => void;
    authorizedStaffName?: string | null;
    setAuthorizedStaffName?: (val: string | null) => void;
    declaredGross?: number | null;
    onOpenUnlockModal?: () => void;
    // Draft profile changes notifier
    onFormValuesChange?: (values: Record<string, string>) => void;
}

export default function ResidentIdentityProfile({
    resident,
    safeFormatDate,
    themeColor,
    titleColorText,
    titleWhiteText,
    subtitleText,
    relationship,
    relationshipLabel,
    transactionId,
    canEdit = true,
    onProfileUpdated: _onProfileUpdated,
    isAuthorized,
    setIsAuthorized,
    authorizedStaffName,
    setAuthorizedStaffName,
    declaredGross: _declaredGross,
    onOpenUnlockModal,
    onFormValuesChange
}: ResidentIdentityProfileProps) {
    const [isOpen, setIsOpen] = useState(true);

    // Internal fallback authorization state if not passed from parent
    const [internalAuthorized, setInternalAuthorized] = useState(false);
    const [internalStaffName, setInternalStaffName] = useState<string | null>(null);

    const authorized = isAuthorized !== undefined ? isAuthorized : internalAuthorized;
    const setAuthorized = (val: boolean) => {
        if (setIsAuthorized) setIsAuthorized(val);
        else setInternalAuthorized(val);
    };

    const staffName = authorizedStaffName !== undefined ? authorizedStaffName : internalStaffName;
    const setStaffName = (val: string | null) => {
        if (setAuthorizedStaffName) setAuthorizedStaffName(val);
        else setInternalStaffName(val);
    };

    // Form editing values
    const [formValues, setFormValues] = useState<Record<string, string>>({});
    
    // Unlock modal state (before editing)
    const [unlockModalOpen, setUnlockModalOpen] = useState(false);
    const [unlockPassword, setUnlockPassword] = useState("");
    const [unlockReason, setUnlockReason] = useState("");
    const [showUnlockPassword, setShowUnlockPassword] = useState(false);
    const [isVerifyingUnlock, setIsVerifyingUnlock] = useState(false);

    const formatDobForInput = (dob: any) => {
        if (!dob) return "";
        try {
            const d = new Date(dob);
            if (isNaN(d.getTime())) return "";
            return d.toISOString().split("T")[0];
        } catch {
            return "";
        }
    };

    const hasInitializedRef = React.useRef(false);
    const lastTxIdRef = React.useRef<string | null>(null);

    const resetFormValues = useCallback(() => {
        setFormValues({
            firstName: resident?.firstName || "",
            middleName: resident?.middleName || "",
            lastName: resident?.lastName || "",
            suffix: resident?.suffix || "",
            dateOfBirth: formatDobForInput(resident?.dateOfBirth),
            gender: resident?.gender || resident?.sex || "Male",
            civilStatus: resident?.civilStatus || "Single",
            citizenship: resident?.citizenship || "Filipino",
            placeOfBirth: resident?.placeOfBirth || "",
            height: resident?.height || "",
            weight: resident?.weight || "",
            contactNumber: resident?.contactNumber || resident?.phoneNumber || "",
            occupation: resident?.occupation || "",
            houseNumber: resident?.houseNumber || "",
            street: resident?.street || "",
            barangay: resident?.barangay || "",
            municipality: resident?.municipality || "E-LGU",
            province: resident?.province || "{{PROVINCE_NAME}}",
        });
    }, [resident]);

    // Initial mount or transaction switch only - NEVER reset while authorized and typing!
    useEffect(() => {
        const isNewTx = transactionId && transactionId !== lastTxIdRef.current;
        if (!hasInitializedRef.current || isNewTx) {
            resetFormValues();
            hasInitializedRef.current = true;
            if (transactionId) lastTxIdRef.current = transactionId;
        }
    }, [transactionId, resetFormValues]);

    const handleInputChange = (field: string, val: string) => {
        const next = { ...formValues, [field]: val };
        setFormValues(next);
        if (onFormValuesChange) {
            onFormValuesChange(next);
        }
    };

    const calculateAge = (dob: string) => {
        if (!dob) return "--";
        try {
            const birth = new Date(dob);
            if (isNaN(birth.getTime())) return "--";
            return differenceInYears(new Date(), birth);
        } catch {
            return "--";
        }
    };

    const age = calculateAge(formValues.dateOfBirth || resident?.dateOfBirth);

    const completeAddress = (() => {
        if (!resident) return "—";
        const parts = [
            resident.houseNumber ? `${resident.houseNumber}` : null,
            resident.street ? `${resident.street}` : null,
            resident.sitio ? `Sitio ${resident.sitio}` : null,
            resident.purok ? `Purok ${resident.purok}` : null,
            resident.barangay ? `Barangay ${resident.barangay}` : null,
            resident.municipality || "E-LGU",
            resident.province || "{{PROVINCE_NAME}}"
        ].filter(Boolean);
        return parts.join(", ") || "—";
    })();

    // Click "Edit Profile" -> Prompt password modal first
    const handleStartEditingClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (authorized) {
            // Already authorized, just expand
            if (!isOpen) setIsOpen(true);
            return;
        }

        if (onOpenUnlockModal) {
            onOpenUnlockModal();
            return;
        }

        setUnlockPassword("");
        setUnlockReason("");
        setUnlockModalOpen(true);
    };

    // Authenticate password to unlock edit mode
    const handleConfirmUnlock = async () => {
        if (!unlockPassword.trim()) {
            toast.error("Please enter your account password to authorize editing.");
            return;
        }

        setIsVerifyingUnlock(true);
        try {
            const res = await verifyStaffPasswordToUnlockAction({
                transactionId,
                password: unlockPassword.trim(),
                reason: unlockReason.trim() || undefined
            });

            if (res.success && res.data) {
                setAuthorized(true);
                setStaffName(res.data.authorizedBy);
                setUnlockModalOpen(false);
                setUnlockPassword("");
                if (!isOpen) setIsOpen(true);
                toast.success(`Access granted. Authorized by ${res.data.authorizedBy}. Profile & declared gross unlocked for editing.`);
            } else {
                toast.error(res.error || "Authorization failed. Incorrect password.");
            }
        } catch (error: any) {
            toast.error(error?.message || "An unexpected error occurred.");
        } finally {
            setIsVerifyingUnlock(false);
        }
    };

    return (
        <div className="bg-white dark:bg-[#111827] border border-slate-100 dark:border-slate-800 rounded-[2.5rem] p-8 shadow-2xl space-y-6 transition-all duration-500 overflow-hidden">
            {/* Header section with toggle button */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div 
                        className="w-10 h-10 rounded-2xl flex items-center justify-center border transition-colors shrink-0"
                        style={{ 
                            backgroundColor: `${themeColor}10`, 
                            borderColor: `${themeColor}20`,
                            color: themeColor 
                        }}
                    >
                        <UserCheck className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-1 leading-none">
                            <span 
                                className="text-xl font-black italic tracking-tighter uppercase"
                                style={{ color: themeColor }}
                            >
                                {titleColorText || "Resident"}
                            </span>
                            <span className="text-xl font-black italic tracking-tighter text-slate-800 dark:text-white uppercase">
                                {titleWhiteText || "Identity Profile"}
                            </span>
                        </div>
                        <p className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500 mt-1 leading-none">
                            {subtitleText || "Verified Citizen Data Dossier"}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Authorized Badge */}
                    {authorized && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-xl text-[9px] font-black uppercase tracking-wider">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            {staffName ? `Unlocked by ${staffName}` : "Unlocked for Editing"}
                        </span>
                    )}

                    {canEdit && transactionId && !authorized && (
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleStartEditingClick}
                            className="h-9 px-3.5 rounded-xl border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider gap-1.5 hover:border-primary/50 hover:text-primary transition-all shadow-sm"
                        >
                            <Lock className="w-3.5 h-3.5 text-amber-500" />
                            Edit Profile
                        </Button>
                    )}

                    <button
                        type="button"
                        onClick={() => setIsOpen(!isOpen)}
                        className="w-10 h-10 rounded-full hover:bg-slate-50 dark:hover:bg-white/5 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-white transition-all focus:outline-none shrink-0"
                    >
                        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            {isOpen && (
                <div className="grid grid-cols-12 gap-5 pt-4 border-t border-slate-100 dark:border-slate-800 animate-in fade-in duration-500">
                    {/* First Name */}
                    <div className="col-span-12 sm:col-span-3 space-y-1.5">
                        <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest block leading-none">First Name</span>
                        {authorized ? (
                            <Input
                                value={formValues.firstName}
                                onChange={(e) => handleInputChange("firstName", e.target.value)}
                                className="h-12 rounded-2xl bg-white dark:bg-black/30 border-emerald-500/40 focus:border-emerald-500 font-bold uppercase text-sm"
                                placeholder="First Name"
                            />
                        ) : (
                            <div className="bg-slate-50 dark:bg-[#1f2937]/50 border border-slate-100 dark:border-slate-800 rounded-2xl h-12 px-4 flex items-center font-bold text-slate-800 dark:text-white text-sm uppercase leading-none">
                                {resident.firstName || "—"}
                            </div>
                        )}
                    </div>

                    {/* Middle Name */}
                    <div className="col-span-12 sm:col-span-3 space-y-1.5">
                        <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest block leading-none">Middle Name</span>
                        {authorized ? (
                            <Input
                                value={formValues.middleName}
                                onChange={(e) => handleInputChange("middleName", e.target.value)}
                                className="h-12 rounded-2xl bg-white dark:bg-black/30 border-emerald-500/40 focus:border-emerald-500 font-bold uppercase text-sm"
                                placeholder="Middle Name"
                            />
                        ) : (
                            <div className="bg-slate-50 dark:bg-[#1f2937]/50 border border-slate-100 dark:border-slate-800 rounded-2xl h-12 px-4 flex items-center font-bold text-slate-800 dark:text-white text-sm uppercase leading-none">
                                {resident.middleName || "—"}
                            </div>
                        )}
                    </div>

                    {/* Last Name */}
                    <div className="col-span-12 sm:col-span-3 space-y-1.5">
                        <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest block leading-none">Last Name</span>
                        {authorized ? (
                            <Input
                                value={formValues.lastName}
                                onChange={(e) => handleInputChange("lastName", e.target.value)}
                                className="h-12 rounded-2xl bg-white dark:bg-black/30 border-emerald-500/40 focus:border-emerald-500 font-bold uppercase text-sm"
                                placeholder="Last Name"
                            />
                        ) : (
                            <div className="bg-slate-50 dark:bg-[#1f2937]/50 border border-slate-100 dark:border-slate-800 rounded-2xl h-12 px-4 flex items-center font-bold text-slate-800 dark:text-white text-sm uppercase leading-none">
                                {resident.lastName || "—"}
                            </div>
                        )}
                    </div>

                    {/* Suffix */}
                    <div className="col-span-12 sm:col-span-3 space-y-1.5">
                        <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest block leading-none">Suffix</span>
                        {authorized ? (
                            <Input
                                value={formValues.suffix}
                                onChange={(e) => handleInputChange("suffix", e.target.value)}
                                className="h-12 rounded-2xl bg-white dark:bg-black/30 border-emerald-500/40 focus:border-emerald-500 font-bold uppercase text-sm"
                                placeholder="Jr, Sr, III (Optional)"
                            />
                        ) : (
                            <div className="bg-slate-50 dark:bg-[#1f2937]/50 border border-slate-100 dark:border-slate-800 rounded-2xl h-12 px-4 flex items-center font-bold text-slate-800 dark:text-white text-sm uppercase leading-none">
                                {resident.suffix || "--"}
                            </div>
                        )}
                    </div>

                    {/* Birth Date */}
                    <div className="col-span-12 sm:col-span-3 space-y-1.5">
                        <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest block leading-none">Birth Date</span>
                        {authorized ? (
                            <Input
                                type="date"
                                value={formValues.dateOfBirth}
                                onChange={(e) => handleInputChange("dateOfBirth", e.target.value)}
                                className="h-12 rounded-2xl bg-white dark:bg-black/30 border-emerald-500/40 focus:border-emerald-500 font-bold uppercase text-sm"
                            />
                        ) : (
                            <div className="bg-slate-50 dark:bg-[#1f2937]/50 border border-slate-100 dark:border-slate-800 rounded-2xl h-12 px-4 flex items-center font-bold text-slate-800 dark:text-white text-sm uppercase leading-none">
                                {safeFormatDate(resident.dateOfBirth)}
                            </div>
                        )}
                    </div>

                    {/* Age */}
                    <div className="col-span-12 sm:col-span-3 space-y-1.5">
                        <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest block leading-none">Age</span>
                        <div className="bg-slate-50 dark:bg-[#1f2937]/50 border border-slate-100 dark:border-slate-800 rounded-2xl h-12 px-4 flex items-center font-bold text-slate-800 dark:text-white text-sm uppercase leading-none">
                            {age}
                        </div>
                    </div>

                    {/* Gender / Sex */}
                    <div className="col-span-12 sm:col-span-3 space-y-1.5">
                        <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest block leading-none">Gender</span>
                        {authorized ? (
                            <select
                                value={formValues.gender}
                                onChange={(e) => handleInputChange("gender", e.target.value)}
                                className="w-full h-12 rounded-2xl bg-white dark:bg-[#111827] border border-emerald-500/40 px-4 font-bold uppercase text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                            >
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                            </select>
                        ) : (
                            <div className="bg-slate-50 dark:bg-[#1f2937]/50 border border-slate-100 dark:border-slate-800 rounded-2xl h-12 px-4 flex items-center font-bold text-slate-800 dark:text-white text-sm uppercase leading-none">
                                {resident.gender || resident.sex || "—"}
                            </div>
                        )}
                    </div>

                    {/* Civil Status */}
                    <div className="col-span-12 sm:col-span-3 space-y-1.5">
                        <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest block leading-none">Civil Status</span>
                        {authorized ? (
                            <select
                                value={formValues.civilStatus}
                                onChange={(e) => handleInputChange("civilStatus", e.target.value)}
                                className="w-full h-12 rounded-2xl bg-white dark:bg-[#111827] border border-emerald-500/40 px-4 font-bold uppercase text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                            >
                                <option value="Single">Single</option>
                                <option value="Married">Married</option>
                                <option value="Widowed">Widowed</option>
                                <option value="Separated">Separated</option>
                                <option value="Divorced">Divorced</option>
                            </select>
                        ) : (
                            <div className="bg-slate-50 dark:bg-[#1f2937]/50 border border-slate-100 dark:border-slate-800 rounded-2xl h-12 px-4 flex items-center font-bold text-slate-800 dark:text-white text-sm uppercase leading-none">
                                {resident.civilStatus || "—"}
                            </div>
                        )}
                    </div>

                    {/* Place of Birth */}
                    <div className="col-span-12 sm:col-span-6 space-y-1.5">
                        <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest block leading-none">Place of Birth</span>
                        {authorized ? (
                            <Input
                                value={formValues.placeOfBirth}
                                onChange={(e) => handleInputChange("placeOfBirth", e.target.value)}
                                className="h-12 rounded-2xl bg-white dark:bg-black/30 border-emerald-500/40 focus:border-emerald-500 font-bold uppercase text-sm"
                                placeholder="City / Municipality, Province"
                            />
                        ) : (
                            <div 
                                className="bg-slate-50 dark:bg-[#1f2937]/50 border border-slate-100 dark:border-slate-800 rounded-2xl h-12 px-4 flex items-center font-bold text-slate-800 dark:text-white text-sm uppercase leading-none truncate cursor-help"
                                title={resident.placeOfBirth || "—"}
                            >
                                {resident.placeOfBirth || "—"}
                            </div>
                        )}
                    </div>

                    {/* Citizenship */}
                    <div className="col-span-12 sm:col-span-2 space-y-1.5">
                        <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest block leading-none">Citizenship</span>
                        {authorized ? (
                            <Input
                                value={formValues.citizenship}
                                onChange={(e) => handleInputChange("citizenship", e.target.value)}
                                className="h-12 rounded-2xl bg-white dark:bg-black/30 border-emerald-500/40 focus:border-emerald-500 font-bold uppercase text-sm"
                                placeholder="Citizenship"
                            />
                        ) : (
                            <div className="bg-slate-50 dark:bg-[#1f2937]/50 border border-slate-100 dark:border-slate-800 rounded-2xl h-12 px-4 flex items-center font-bold text-slate-800 dark:text-white text-sm uppercase leading-none">
                                {resident.citizenship || "Filipino"}
                            </div>
                        )}
                    </div>

                    {/* Height */}
                    <div className="col-span-12 sm:col-span-2 space-y-1.5">
                        <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest block leading-none">Height</span>
                        {authorized ? (
                            <Input
                                value={formValues.height}
                                onChange={(e) => handleInputChange("height", e.target.value)}
                                className="h-12 rounded-2xl bg-white dark:bg-black/30 border-emerald-500/40 focus:border-emerald-500 font-bold uppercase text-sm"
                                placeholder="e.g. 165 cm / 5'5&quot;"
                            />
                        ) : (
                            <div className="bg-slate-50 dark:bg-[#1f2937]/50 border border-slate-100 dark:border-slate-800 rounded-2xl h-12 px-4 flex items-center font-bold text-slate-800 dark:text-white text-sm uppercase leading-none">
                                {resident.height || "—"}
                            </div>
                        )}
                    </div>

                    {/* Weight */}
                    <div className="col-span-12 sm:col-span-2 space-y-1.5">
                        <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest block leading-none">Weight</span>
                        {authorized ? (
                            <Input
                                value={formValues.weight}
                                onChange={(e) => handleInputChange("weight", e.target.value)}
                                className="h-12 rounded-2xl bg-white dark:bg-black/30 border-emerald-500/40 focus:border-emerald-500 font-bold uppercase text-sm"
                                placeholder="e.g. 60 kg / 132 lbs"
                            />
                        ) : (
                            <div className="bg-slate-50 dark:bg-[#1f2937]/50 border border-slate-100 dark:border-slate-800 rounded-2xl h-12 px-4 flex items-center font-bold text-slate-800 dark:text-white text-sm uppercase leading-none">
                                {resident.weight || "—"}
                            </div>
                        )}
                    </div>

                    {/* Contact Number */}
                    <div className="col-span-12 sm:col-span-4 space-y-1.5">
                        <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest block leading-none">Contact Number</span>
                        {authorized ? (
                            <Input
                                value={formValues.contactNumber}
                                onChange={(e) => handleInputChange("contactNumber", e.target.value)}
                                className="h-12 rounded-2xl bg-white dark:bg-black/30 border-emerald-500/40 focus:border-emerald-500 font-bold uppercase text-sm"
                                placeholder="09XXXXXXXXX"
                            />
                        ) : (
                            <div className="bg-slate-50 dark:bg-[#1f2937]/50 border border-slate-100 dark:border-slate-800 rounded-2xl h-12 px-4 flex items-center font-bold text-slate-800 dark:text-white text-sm uppercase leading-none">
                                {resident.contactNumber || resident.phoneNumber || "—"}
                            </div>
                        )}
                    </div>

                    {/* Occupation */}
                    <div className="col-span-12 sm:col-span-8 space-y-1.5">
                        <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest block leading-none">Occupation / Profession</span>
                        {authorized ? (
                            <Input
                                value={formValues.occupation}
                                onChange={(e) => handleInputChange("occupation", e.target.value)}
                                className="h-12 rounded-2xl bg-white dark:bg-black/30 border-emerald-500/40 focus:border-emerald-500 font-bold uppercase text-sm"
                                placeholder="Occupation or Profession"
                            />
                        ) : (
                            <div className="bg-slate-50 dark:bg-[#1f2937]/50 border border-slate-100 dark:border-slate-800 rounded-2xl h-12 px-4 flex items-center font-bold text-slate-800 dark:text-white text-sm uppercase leading-none">
                                {resident.occupation || "—"}
                            </div>
                        )}
                    </div>

                    {/* Address Fields when Editing */}
                    {authorized ? (
                        <>
                            <div className="col-span-12 sm:col-span-3 space-y-1.5">
                                <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest block leading-none">House / Lot No.</span>
                                <Input
                                    value={formValues.houseNumber}
                                    onChange={(e) => handleInputChange("houseNumber", e.target.value)}
                                    className="h-12 rounded-2xl bg-white dark:bg-black/30 border-emerald-500/40 focus:border-emerald-500 font-bold uppercase text-sm"
                                    placeholder="House No."
                                />
                            </div>
                            <div className="col-span-12 sm:col-span-5 space-y-1.5">
                                <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest block leading-none">Street Name</span>
                                <Input
                                    value={formValues.street}
                                    onChange={(e) => handleInputChange("street", e.target.value)}
                                    className="h-12 rounded-2xl bg-white dark:bg-black/30 border-emerald-500/40 focus:border-emerald-500 font-bold uppercase text-sm"
                                    placeholder="Street Name"
                                />
                            </div>
                            <div className="col-span-12 sm:col-span-4 space-y-1.5">
                                <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest block leading-none">Barangay</span>
                                <select
                                    value={formValues.barangay}
                                    onChange={(e) => handleInputChange("barangay", e.target.value)}
                                    className="w-full h-12 rounded-2xl bg-white dark:bg-[#111827] border border-emerald-500/40 px-4 font-bold uppercase text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                                >
                                    <option value="">Select Barangay...</option>
                                    {LGU_BARANGAYS.map((brgy) => (
                                        <option key={brgy} value={brgy}>
                                            {brgy}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </>
                    ) : (
                        /* Complete Address Display */
                        <div className="col-span-12 sm:col-span-12 space-y-1.5">
                            <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest block leading-none">Barangay & Complete Address</span>
                            <div 
                                className="bg-slate-50 dark:bg-[#1f2937]/50 border border-slate-100 dark:border-slate-800 rounded-2xl h-12 px-4 flex items-center font-bold text-slate-800 dark:text-white text-sm uppercase leading-none truncate cursor-help"
                                title={completeAddress}
                            >
                                {completeAddress}
                            </div>
                        </div>
                    )}

                    {/* Relationship to Subject / Deceased */}
                    {relationship && relationship.trim().toUpperCase() !== "SELF" && (
                        <div className="col-span-12 sm:col-span-12 space-y-1.5 animate-in fade-in duration-300">
                            <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest block leading-none">{relationshipLabel || "Relationship to Subject / Deceased"}</span>
                            <div className="bg-slate-50 dark:bg-[#1f2937]/50 border border-slate-100 dark:border-slate-800 rounded-2xl h-12 px-4 flex items-center font-bold text-slate-800 dark:text-white text-sm uppercase leading-none">
                                {relationship || "—"}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* SECURITY AUTHENTICATION BEFORE EDITING MODAL */}
            <Dialog open={unlockModalOpen} onOpenChange={setUnlockModalOpen}>
                <DialogContent className="sm:max-w-md rounded-[2.5rem] bg-white dark:bg-[#111827] border border-slate-100 dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-6">
                    <DialogHeader className="space-y-2">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mx-auto mb-1">
                            <ShieldAlert className="w-6 h-6" />
                        </div>
                        <DialogTitle className="text-xl font-black italic tracking-tight text-center uppercase text-slate-900 dark:text-white">
                            Staff Authorization Required
                        </DialogTitle>
                        <DialogDescription className="text-xs text-center text-slate-500 font-medium">
                            Please authenticate your account password to unlock editing for citizen profile and assessment fields.
                        </DialogDescription>
                    </DialogHeader>

                    {/* Staff Password Verification */}
                    <div className="space-y-1.5">
                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 block">
                            Staff Account Password <span className="text-destructive">*</span>
                        </label>
                        <div className="relative">
                            <Input
                                type={showUnlockPassword ? "text" : "password"}
                                placeholder="Enter your current password"
                                value={unlockPassword}
                                onChange={(e) => setUnlockPassword(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        handleConfirmUnlock();
                                    }
                                }}
                                className="h-11 rounded-xl text-xs bg-slate-50 dark:bg-black/30 border-slate-200 dark:border-slate-800 pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowUnlockPassword(!showUnlockPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                            >
                                {showUnlockPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    {/* Modification Reason */}
                    <div className="space-y-1.5">
                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 block">
                            Reason / Remarks (Optional)
                        </label>
                        <Input
                            placeholder="e.g. Corrected typo & adjusted gross per valid documents"
                            value={unlockReason}
                            onChange={(e) => setUnlockReason(e.target.value)}
                            className="h-11 rounded-xl text-xs bg-slate-50 dark:bg-black/30 border-slate-200 dark:border-slate-800"
                        />
                    </div>

                    {/* Modal Action Buttons */}
                    <div className="flex items-center gap-3 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setUnlockModalOpen(false)}
                            disabled={isVerifyingUnlock}
                            className="flex-1 h-12 rounded-xl text-[10px] font-black uppercase tracking-widest border-slate-200 dark:border-slate-800"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={handleConfirmUnlock}
                            disabled={isVerifyingUnlock || !unlockPassword.trim()}
                            className="flex-1 h-12 rounded-xl text-[10px] font-black uppercase tracking-widest bg-primary text-white gap-2 shadow-lg shadow-primary/25"
                        >
                            {isVerifyingUnlock ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Verifying...
                                </>
                            ) : (
                                <>
                                    <KeyRound className="w-4 h-4" />
                                    Verify & Unlock
                                </>
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
