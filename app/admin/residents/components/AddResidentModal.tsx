    
import { useState, useEffect } from "react";
import { useResident } from "../providers";
import { useResidentForm } from "../hooks/useResidentForm";
import { 
    User, MapPin, BadgeInfo, Users, ShieldCheck, 
    ChevronRight, ChevronLeft, Save, X, Loader2, Camera, UserCheck, AlertTriangle 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { PersonalInfoSection } from "./form-sections/PersonalInfo";
import { AddressContactSection } from "./form-sections/AddressContact";
import { GovSocioEconomicSection } from "./form-sections/GovSocioEconomic";
import { FamilyBackgroundSection } from "./form-sections/FamilyBackground";
import { IdentityVerificationSection } from "./form-sections/IdentityVerification";
import { AccountSetupSection } from "./form-sections/AccountSetup";
import { SectorsAndConsentSection } from "./form-sections/SectorsAndConsent";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { checkDuplicateResidentName, checkEmailRegistered } from "@/app/admin/actions/registration-approval";

const STEPS = [
    { id: "personal", title: "Personal", icon: User, description: "Basic Info (A)" },
    { id: "address", title: "Address", icon: MapPin, description: "Location & Unit (B,C,D)" },
    { id: "gov", title: "Socio-Gov", icon: BadgeInfo, description: "Occupation & IDs (E,F,I)" },
    { id: "family", title: "Family", icon: Users, description: "Parents & Dependents (G)" },
    { id: "verification", title: "ID Check", icon: Camera, description: "ID Verification (H)" },
    { id: "account", title: "Account", icon: UserCheck, description: "Account Setup" },
    { id: "consent", title: "Consent", icon: ShieldCheck, description: "Final Sign-off (J,K)" }
];

export function AddResidentModal() {
    const { isAddModalOpen, setIsAddModalOpen, editingData, setEditingData, setCurrentFamilyMembers, themeColor, formCategoryName } = useResident();
    const { handleSubmit, loading } = useResidentForm();
    const [currentStep, setCurrentStep] = useState(0);

    useEffect(() => {
        const activeElement = document.getElementById(`step-indicator-residents-${currentStep}`);
        if (activeElement) {
            activeElement.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
    }, [currentStep]);

    useEffect(() => {
        if (isAddModalOpen) {
            setTimeout(() => {
                // Reset to Step 1 whenever modal is opened
                setCurrentStep(0);
                
                if (editingData) {
                    // Combine manual family members and linked household members
                    const manual = editingData.familyMembers || [];
                    const linked = (editingData.isHead && editingData.household?.members)
                        ? editingData.household.members
                            .filter(m => m.id !== editingData.id)
                            .map(m => ({
                                id: m.id,
                                fullName: `${m.firstName} ${m.lastName}`,
                                relationship: m.relationshipToHead || "Member",
                                age: m.age || ""
                            }))
                        : [];
                    
                    setCurrentFamilyMembers([...manual, ...linked]);
                } else {
                    setCurrentFamilyMembers([]);
                }
            }, 0);
        }
    }, [isAddModalOpen, editingData, setCurrentFamilyMembers]);

    const closeModal = () => {
        setIsAddModalOpen(false);
        setEditingData(null);
        setCurrentStep(0);
        setCurrentFamilyMembers([]);
    };

    const [nameWarningModalOpen, setNameWarningModalOpen] = useState(false);
    const [duplicateResidents, setDuplicateResidents] = useState<any[]>([]);
    const [isCheckingAsync, setIsCheckingAsync] = useState(false);

    const handleAsyncStepValidation = async (stepIndex: number): Promise<boolean> => {
        const form = document.getElementById("residentForm") as HTMLFormElement;
        if (!form) return true;
        const formData = new FormData(form);

        if (stepIndex === 0) { // Personal Step
            const firstName = formData.get("firstName") as string;
            const lastName = formData.get("lastName") as string;
            if (!firstName || !lastName) return true;

            setIsCheckingAsync(true);
            try {
                const res = await checkDuplicateResidentName(firstName, lastName);
                if (res.success && res.duplicates && res.duplicates.length > 0) {
                    const actualDuplicates = res.duplicates.filter((dup: any) => dup.id !== editingData?.id);
                    if (actualDuplicates.length > 0) {
                        setDuplicateResidents(actualDuplicates);
                        setNameWarningModalOpen(true);
                        setIsCheckingAsync(false);
                        return false;
                    }
                }
            } catch (err) {
                console.error("Async name validation failed", err);
            } finally {
                setIsCheckingAsync(false);
            }
        }

        if (stepIndex === 5) { // Account Step
            const email = formData.get("email") as string;
            if (!email || email.trim() === "") return true;

            setIsCheckingAsync(true);
            try {
                const res = await checkEmailRegistered(email);
                if (res.success && res.exists) {
                    const isOwnEmail = editingData && editingData.email?.toLowerCase() === email.trim().toLowerCase();
                    if (!isOwnEmail) {
                        toast.error(`Warning: The email ${email} is already registered to a user account.`);
                        setIsCheckingAsync(false);
                        return false;
                    }
                }
            } catch (err) {
                console.error("Async email validation failed", err);
            } finally {
                setIsCheckingAsync(false);
            }
        }

        return true;
    };

    const nextStep = async () => {
        if (currentStep < STEPS.length - 1) {
            if (validateStep(currentStep)) {
                const isAsyncValid = await handleAsyncStepValidation(currentStep);
                if (isAsyncValid) {
                    setCurrentStep(currentStep + 1);
                }
            }
        }
    };

    const validateStep = (stepIndex: number) => {
        const form = document.getElementById("residentForm") as HTMLFormElement;
        if (!form) return true;

        const formData = new FormData(form);
        const invalidFields: { nameOrSelector: string; isSelector: boolean; message: string }[] = [];

        const addError = (nameOrSelector: string, message: string, isSelector = false) => {
            invalidFields.push({ nameOrSelector, isSelector, message });
        };

        const focusAndHighlight = (nameOrSelector: string, isSelector = false, shouldFocus = true) => {
            const input = isSelector 
                ? form.querySelector(nameOrSelector) as HTMLElement | null
                : form.querySelector(`[name="${nameOrSelector}"]`) as HTMLElement | null;
            if (input) {
                let targetToStyle = input;
                
                if (nameOrSelector === "categories") {
                    const container = input.closest('.flex.flex-wrap.gap-2') as HTMLElement | null;
                    if (container) {
                        targetToStyle = container;
                    }
                } else {
                    const isHidden = input.offsetWidth === 0 && input.offsetHeight === 0;
                    if (isHidden) {
                        const parent = input.parentElement;
                        if (parent) {
                            const trigger = parent.querySelector('button[role="combobox"]') || parent.querySelector('button');
                            if (trigger) {
                                targetToStyle = trigger as HTMLElement;
                            }
                        }
                    }
                }

                if (shouldFocus) {
                    targetToStyle.focus();
                    targetToStyle.scrollIntoView({ behavior: "smooth", block: "center" });
                }
                targetToStyle.classList.add("ring-2", "ring-red-500", "border-red-500", "dark:border-red-500", "ring-offset-2");
                targetToStyle.style.borderColor = "rgb(239, 68, 68)";
                const cleanUp = () => {
                    targetToStyle.classList.remove("ring-2", "ring-red-500", "border-red-500", "dark:border-red-500", "ring-offset-2");
                    targetToStyle.style.borderColor = "";
                    input.removeEventListener("input", cleanUp);
                    input.removeEventListener("change", cleanUp);
                    targetToStyle.removeEventListener("click", cleanUp);
                    targetToStyle.removeEventListener("focus", cleanUp);
                };
                input.addEventListener("input", cleanUp);
                input.addEventListener("change", cleanUp);
                targetToStyle.addEventListener("click", cleanUp);
                targetToStyle.addEventListener("focus", cleanUp);
            }
        };

        const isNonResident = formCategoryName?.toUpperCase().replace("-", " ").includes("NON RESIDENT");

        if (stepIndex === 0) { // Personal
            if (!formData.get("lastName")) { 
                addError("lastName", "Last Name is required."); 
            }
            if (!formData.get("firstName")) { 
                addError("firstName", "First Name is required."); 
            }
            if (!isNonResident && !formData.get("placeOfBirth")) { 
                addError("placeOfBirth", "Place of Birth is required."); 
            }
            if (!formData.get("gender")) { 
                addError("gender", "Please select a Gender."); 
            }
            if (formData.get("gender") === "Other" && !formData.get("otherGender")) {
                addError("otherGender", "Please specify your Gender."); 
            }
            if (!formData.get("dateOfBirth")) { 
                addError("dateOfBirth", "Date of Birth is required."); 
            }
            if (!formData.get("civilStatus")) { 
                addError("civilStatus", "Civil Status is required."); 
            }
            if (formData.get("civilStatus") === "Other" && !formData.get("otherCivilStatus")) {
                addError("otherCivilStatus", "Please specify your Civil Status."); 
            }
            if (!formData.get("categories")) {
                addError("categories", "Please select a Resident Category.");
            }
        }

        if (stepIndex === 1) { // Address
            if (!formData.get("barangay")) { 
                addError("barangay", "Barangay is mandatory."); 
            }
            if (formData.get("municipality") === "") { 
                addError("municipality", "Municipality is required."); 
            }
            if (formData.get("province") === "") { 
                addError("province", "Province is required."); 
            }
        }

        if (stepIndex === 2) { // Socio-Gov
            if (!isNonResident && !formData.get("occupation")) { 
                addError("occupation", "Occupation is required."); 
            }
            if (formData.get("educationalAttainment") === "Other" && !formData.get("otherEducationalAttainment")) {
                addError("otherEducationalAttainment", "Please specify your Educational Attainment."); 
            }
            if (formData.get("employmentStatus") === "Other" && !formData.get("otherEmploymentStatus")) {
                addError("otherEmploymentStatus", "Please specify your Employment Status."); 
            }
            const eduAttainment = formData.get("educationalAttainment") as string;
            if (["Vocational/Short Course", "College Level", "College Graduate", "Post Graduate Studies"].includes(eduAttainment) && !formData.get("degreeProgram")) {
                addError("degreeProgram", "Degree or Course is required.");
            }
        }

        if (stepIndex === 4) { // Identity Verification
            const idType = formData.get("idType") as string;
            if (idType === "Other" && !formData.get("otherIdType")) {
                addError("otherIdType", "Please specify your ID Type."); 
            }
        }

        if (stepIndex === 5) { // Account
            const email = formData.get("email") as string;
            if (email && !email.includes("@")) { 
                addError("email", "Please enter a valid email."); 
            }
        }

        // Removed Data Privacy Consent frontend validation block since it is now auto-consented server-side

        if (invalidFields.length > 0) {
            toast.error(invalidFields[0].message);
            invalidFields.forEach((field, index) => {
                focusAndHighlight(field.nameOrSelector, field.isSelector, index === 0);
            });
            return false;
        }

        return true;
    };

    const prevStep = () => {
        if (currentStep > 0) setCurrentStep(currentStep - 1);
    };

    return (
        <Dialog open={isAddModalOpen} onOpenChange={(open) => !open && closeModal()}>
            <DialogContent className="max-w-[95vw] sm:max-w-6xl w-full p-0 overflow-hidden bg-white dark:bg-[#0f1117] border-slate-200 dark:border-[#2a3040] shadow-2xl rounded-3xl">
                <div className="flex flex-col lg:flex-row h-[90vh]">
                    
                    {/* Left Sidebar: Steps Progress */}
                    <div className="lg:w-80 bg-slate-50 dark:bg-[#151b2b] p-8 border-r border-slate-200 dark:border-[#2a3040] hidden lg:block overflow-y-auto custom-scrollbar">
                        <div className="flex items-center space-x-3 mb-12">
                            <div 
                                style={{ backgroundColor: themeColor, boxShadow: `0 10px 15px -3px ${themeColor}33` }}
                                className="p-2.5 rounded-2xl shadow-lg"
                            >
                                <User className="w-6 h-6 text-white" />
                            </div>
                            <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic">E-Mapandan</h2>
                        </div>

                        <div className="space-y-4">
                            {STEPS.map((step, index) => {
                                const Icon = step.icon;
                                const isActive = currentStep === index;
                                const isCompleted = currentStep > index;

                                return (
                                    <div 
                                        key={step.id} 
                                        id={`step-indicator-residents-${index}`}
                                        style={isActive ? { boxShadow: `0 20px 25px -5px ${themeColor}1a, 0 8px 10px -6px ${themeColor}1a` } : undefined}
                                        className={cn(
                                            "flex items-center space-x-4 p-4 rounded-2xl transition-all duration-300",
                                            isActive ? "bg-white dark:bg-[#0f1117] ring-1 ring-slate-200 dark:ring-white/10" : "opacity-50"
                                        )}
                                    >
                                        <div 
                                            style={isActive ? { backgroundColor: themeColor } : undefined}
                                            className={cn(
                                                "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                                                isActive ? "text-white" : isCompleted ? "bg-green-500 text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-400"
                                            )}
                                        >
                                            <Icon className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p 
                                                style={isActive ? { color: themeColor } : undefined}
                                                className={cn("text-[10px] uppercase font-black tracking-widest", !isActive && "text-slate-400")}
                                            >
                                                Step {index + 1}
                                            </p>
                                            <p className="text-sm font-bold text-slate-800 dark:text-white">{step.title}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Main Form Content */}
                    <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-[#0b0e14]">
                        <DialogHeader className="p-8 pb-4 sticky top-0 bg-white/80 dark:bg-[#0b0e14]/80 backdrop-blur-md z-10">
                            <div className="flex items-center justify-between">
                                <div>
                                    <DialogTitle className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic">
                                        {editingData ? "Edit Resident" : "New Registration"}
                                    </DialogTitle>
                                    <DialogDescription className="text-slate-500 font-medium">
                                        {STEPS[currentStep].description}
                                    </DialogDescription>
                                </div>
                                <Button variant="ghost" size="icon" onClick={closeModal} className="rounded-full">
                                    <X className="w-5 h-5" />
                                </Button>
                            </div>
                        </DialogHeader>

                        <div className="flex-1 overflow-y-auto px-8 py-4 custom-scrollbar">
                            <form 
                                id="residentForm" 
                                noValidate
                                onSubmit={(e) => {
                                    if (currentStep !== STEPS.length - 1) {
                                        e.preventDefault();
                                        return;
                                    }
                                    if (!validateStep(currentStep)) {
                                        e.preventDefault();
                                        return;
                                    }
                                    handleSubmit(e);
                                }}
                            >
                                 <div className={cn("animate-in fade-in slide-in-from-bottom-4 duration-500", currentStep !== 0 && "hidden")}>
                                    <PersonalInfoSection data={editingData || undefined} />
                                </div>
                                <div className={cn("animate-in fade-in slide-in-from-bottom-4 duration-500", currentStep !== 1 && "hidden")}>
                                    <AddressContactSection data={editingData || undefined} />
                                </div>
                                <div className={cn("animate-in fade-in slide-in-from-bottom-4 duration-500", currentStep !== 2 && "hidden")}>
                                    <GovSocioEconomicSection data={editingData || undefined} />
                                </div>
                                <div className={cn("animate-in fade-in slide-in-from-bottom-4 duration-500", currentStep !== 3 && "hidden")}>
                                    <FamilyBackgroundSection data={editingData || undefined} />
                                </div>
                                <div className={cn("animate-in fade-in slide-in-from-bottom-4 duration-500", currentStep !== 4 && "hidden")}>
                                    <IdentityVerificationSection data={editingData || undefined} />
                                </div>
                                <div className={cn("animate-in fade-in slide-in-from-bottom-4 duration-500", currentStep !== 5 && "hidden")}>
                                    <AccountSetupSection data={editingData || undefined} />
                                </div>
                                <div className={cn("animate-in fade-in slide-in-from-bottom-4 duration-500", currentStep !== 6 && "hidden")}>
                                    <SectorsAndConsentSection data={editingData || undefined} />
                                </div>
                            </form>
                        </div>

                        <DialogFooter className="p-8 bg-slate-50 dark:bg-[#151b2b] border-t border-slate-200 dark:border-[#2a3040] flex flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                                {currentStep > 0 && (
                                    <Button 
                                        key="prev-btn"
                                        type="button"
                                        variant="outline" 
                                        onClick={prevStep}
                                        className="h-12 px-6 rounded-2xl font-bold border-slate-200 dark:border-[#2a3040]"
                                    >
                                        <ChevronLeft className="w-4 h-4 mr-2" /> Back
                                    </Button>
                                )}
                            </div>
                            
                            <div className="flex items-center gap-3">
                                {currentStep < STEPS.length - 1 ? (
                                    <Button 
                                        key="next-btn"
                                        type="button" 
                                        onClick={nextStep}
                                        disabled={isCheckingAsync}
                                        style={{ backgroundColor: themeColor, boxShadow: `0 10px 15px -3px ${themeColor}33` }}
                                        className="h-12 px-10 hover:opacity-90 text-white font-bold rounded-2xl transition-all duration-200"
                                    >
                                        {isCheckingAsync ? (
                                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verifying...</>
                                        ) : (
                                            <>Next <ChevronRight className="w-4 h-4 ml-2" /></>
                                        )}
                                    </Button>
                                ) : (
                                    <Button 
                                        key="submit-btn"
                                        type="submit" 
                                        form="residentForm"
                                        disabled={loading}
                                        className="h-12 px-10 bg-green-600 hover:bg-green-700 text-white font-bold rounded-2xl shadow-xl shadow-green-500/20"
                                    >
                                        {loading ? (
                                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Finalizing...</>
                                        ) : (
                                            <><Save className="w-4 h-4 mr-2" /> Complete Registration</>
                                        )}
                                    </Button>
                                )}
                            </div>
                        </DialogFooter>
                    </div>
                </div>
            </DialogContent>

            {/* Duplicate Resident Name Warning Dialog */}
            <Dialog open={nameWarningModalOpen} onOpenChange={setNameWarningModalOpen}>
                <DialogContent className="max-w-md w-full bg-white dark:bg-[#151b2b] border-slate-200 dark:border-[#2a3040] shadow-2xl rounded-3xl p-6 z-[200]">
                    <DialogHeader className="space-y-3">
                        <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center text-red-500">
                            <AlertTriangle className="w-6 h-6 animate-pulse" />
                        </div>
                        <DialogTitle className="text-lg font-black uppercase tracking-tight text-red-650 dark:text-red-400">
                            ⚠️ Duplicate Name Alert
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-500">
                            The system detected existing residents matching this name in the database.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="my-4 space-y-3">
                        <p className="text-xs text-slate-650 dark:text-slate-400 font-medium">
                            A resident with this name is already registered:
                        </p>

                        <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 bg-slate-50/50 dark:bg-slate-900/10 max-h-[200px] overflow-y-auto custom-scrollbar">
                            {duplicateResidents.map((dup) => (
                                <div key={dup.id} className="py-2.5 first:pt-0 last:pb-0 flex flex-col gap-1">
                                    <div className="flex justify-between items-center text-xs font-bold text-slate-800 dark:text-slate-200 uppercase">
                                        <span>{dup.lastName}, {dup.firstName}</span>
                                        <span className={`text-[9px] px-2 py-0.5 rounded-full border ${
                                            dup.registrationStatus === 'APPROVED' 
                                            ? 'text-green-600 border-green-200 bg-green-50 dark:bg-green-950/20' 
                                            : 'text-amber-600 border-amber-200 bg-amber-50 dark:bg-amber-950/20'
                                        }`}>{dup.registrationStatus}</span>
                                    </div>
                                    <div className="text-[11px] text-slate-500 font-semibold">
                                        Barangay: <strong className="text-slate-750 dark:text-slate-350">{dup.barangay}</strong>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <p className="text-xs text-slate-650 dark:text-slate-400 font-semibold italic text-center leading-relaxed">
                            Do you want to proceed with this new registration anyway?
                        </p>
                    </div>

                    <DialogFooter className="flex items-center gap-3 pt-2">
                        <Button
                            variant="outline"
                            onClick={() => setNameWarningModalOpen(false)}
                            className="flex-1 rounded-2xl border-slate-200 dark:border-[#2a3040] font-bold py-6 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={() => {
                                setNameWarningModalOpen(false);
                                setCurrentStep(1); // Advance to the next step
                            }}
                            className="flex-1 rounded-2xl bg-red-600 hover:bg-red-750 text-white font-bold py-6 shadow-lg shadow-red-650/20"
                        >
                            Yes, Proceed
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Dialog>
    );
}
